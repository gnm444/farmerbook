# FarmerBook Outreach Agent Architecture

## Decision

Use the existing Cloudflare managed-agent runtime for production execution. Use
Codex agents for development, testing, research reviews, and occasional manual
runs—not as the always-on production service.

The runtime should be **available continuously but execute only when work
exists**. Scheduled discovery runs, database queues, and provider webhooks are
less expensive and more reliable than keeping multiple language-model sessions
running continuously.

Production activation is canary-first and separately release-controlled. The
existing delivery Agent is scheduled only after the public consent path,
provider lifecycle and suppression checks pass.

## Current FarmerBook baseline

FarmerBook implements six purpose-limited Cloudflare agents:

1. `OutreachGrowthAgent` processes consented outreach jobs.
2. `ProfileDraftingAgent` creates private, unclaimed profile previews.
3. `VerificationTriageAgent` records recommendations but cannot grant badges.
4. `CustomerSupportAgent` creates private support-reply proposals.
5. `SocialContentAgent` creates copy-ready owned-channel drafts.
6. `OperationsSupervisorAgent` detects stale or failing runs.

They use SQLite-backed Durable Object state, bounded batch sizes, idempotency,
audit records, automatic pause after three failures, and separate release
flags. The 15 company-planning Agents are documented separately in
[`AI_COMPANY_OPERATING_GUIDE.md`](AI_COMPANY_OPERATING_GUIDE.md); they never
perform email delivery.

## Professional sender decision

`ceo@farmerbook.in` is FarmerBook's canonical professional outreach and reply
identity. Cloudflare Email Routing forwards it to the product owner's Gmail and
a controlled inbound test was recorded as `Forwarded`. It is not a Gmail `Send
mail as` identity and is never sent through Gmail.

The application must not spoof that address or send through the owner Gmail.
Postmark manually approved the FarmerBook account on 2026-08-17 and separately
verified `farmerbook.in` DKIM plus the custom Return-Path. The Worker has the
valid postal address, transactional/Broadcast streams and authenticated
lifecycle/inbound webhooks. Each deployment still fails closed until its own
release control, runtime state and complete configuration pass. A one-time
owner-controlled double-opt-in canary must prove the complete message, receipt,
reply, unsubscribe and suppression lifecycle before that deployment is resumed.

## Recommended low-budget pilot

Do not create a large autonomous fleet. Keep discovery separate from the
existing delivery and supervision roles:

### 1. YouTube Discovery — existing read-only research workspace

Purpose: identify public agriculture channels that may be relevant to
FarmerBook.

Inputs:

- An administrator-approved query matrix covering agriculture topics,
  languages, and Indian regions.
- YouTube Data API `search.list` results with `type=channel`, `regionCode=IN`,
  and a bounded `maxResults`.
- Channel metadata returned through approved YouTube API endpoints.

Outputs:

- A transient, administrator-visible result containing the channel URL, title,
  bounded description, language/region hints, and YouTube attribution.
- A persisted audit record containing only the query hash, actor, API retrieval
  time, provider result count, and quota outcome.
- No persistent channel candidate or contact record in the first release.

Hard limits:

- Never scrape YouTube pages or protected `About` sections.
- Never extract, infer, or store an email address, mobile number, full name, or
  username from YouTube API data. YouTube's current policy guide lists these as
  user data that must not be harvested or stored without consent.
- Never copy video, thumbnail, or profile media into FarmerBook.
- Never message, comment, subscribe, or publish anything.
- Never describe the result set as “all farming channels.” YouTube is dynamic;
  the agent provides bounded coverage of the approved query matrix.
- Treat results as a current discovery view and discard the result items when
  the request ends. If a future compliance-reviewed version persists YouTube
  API data, refresh or delete it within 30 days.

### 2. Consent Intake Gate — deterministic, not an AI agent

Purpose: prevent a discovered identity from becoming a message recipient until
FarmerBook has channel-specific permission.

Accepted consent sources:

- FarmerBook signup or invitation-interest form.
- Google lead form using the existing signed webhook.
- A FarmerBook event, FPO, NGO, partner, or RTIH campaign with approved consent
  wording and source evidence.
- Click-to-WhatsApp or another approved flow in which the user initiates or
  explicitly opts in.

A public email address, public phone number, channel description, or business
website is evidence only. It is not automatically treated as permission to
send a FarmerBook invitation.

### 3. Outreach Growth Agent — existing, delivery only after consent

Purpose: deliver a localized FarmerBook introduction through an approved
provider after the Consent Intake Gate succeeds.

Rules:

- Require active consent for the exact channel and purpose.
- Start with email only; keep WhatsApp disabled until a verified WhatsApp
  Business sender, approved message template, opt-in evidence, signed webhooks,
  and STOP handling are configured.
- Send one introduction and at most one consented onboarding follow-up.
- Include the FarmerBook identity, reason for contact, signup link, privacy
  notice, and clear opt-out.
- Suppress duplicates, withdrawals, complaints, bounces, and `STOP` replies.
- Keep immutable provider receipts and source/consent evidence.
- Reauthorize every claimed row immediately before reading its private contact
  or calling the provider. A withdrawal, suppression or pause that races with a
  claim must win.
- Reserve no more than 25 provider-bound attempts per India calendar day. The
  ceiling is conservative: a failed or unknown provider outcome still consumes
  its reservation.
- Process confirmed natural, organic, regenerative and agroecological interests
  before other confirmed introductions. Never delay email confirmation itself,
  and never infer the priority from a public profile or discovery result.

### 4. Reply and Onboarding Handler — event-driven function

Purpose: respond when a recipient replies; it does not need a continuously
scheduled language-model agent.

Behavior:

- Provider webhook records the reply.
- Deterministic rules process `STOP`, unsubscribe, bounce, and complaint events
  immediately.
- A low-cost classifier labels interested, question, not interested, wrong
  contact, or human-review-needed.
- Interested recipients receive a bounded signup/onboarding response.
- Ambiguous or sensitive replies are assigned to an administrator.

### 5. Operations Supervisor — existing

Purpose: watch health, spend, and policy boundaries.

Behavior:

- Pause a role after three consecutive failures.
- Alert on unexpected volume, provider rejection, consent mismatch, excessive
  model usage, or message complaints.
- Never bypass a paused role, consent gate, or provider rejection.

The existing Profile Drafting and Verification Triage agents remain paused
during the low-budget acquisition pilot. They can be enabled later, separately.

## End-to-end flow

```text
Administrator-approved query
        |
        v
YouTube Discovery view --YouTube Data API--> Transient results
                                                |
                                      open original YouTube page
                                                |
                                        no contact extraction

FarmerBook interest form / approved partner campaign
        |
        v
Consent Intake Gate --active channel consent--> Outreach Growth Agent
                                                      |
                                              approved email provider
                                                      |
                                              Reply & Onboarding Handler
```

Discovery does not connect directly to delivery. Consent is a mandatory state
transition between them.

## Autonomous delivery authority

The scheduled Growth & Outreach Agent needs no routine per-message approval.
Its standing authority is narrower than a campaign approval: process only
FarmerBook-originated double opt-in confirmations, one purpose-matched
introduction, one separately consented follow-up, and one bounded reply to an
allowlisted inbound onboarding question.

`claim_outreach_outbox` performs the first database consent/pause check. The
processor must then call `authorize_outreach_dispatch` immediately before any
private-contact read, invitation preparation or provider call. That RPC
rechecks release, pause, expiry, suppression and purpose-specific authority,
serializes an India-day reservation and records only redacted decision
metadata. It never stores a contact value or message body.

Missing sender/legal/provider readiness, an invalid authorization response, an
ambiguous Postmark outcome or three consecutive provider failures invokes
`pause_outreach_delivery_automatically`. The database pause survives Agent
restart, releases still-valid claimed work to pending, cancels work whose
authority ended, and records an immutable bounded system reason. Operators
investigate and explicitly resume after correction; this recovery action is an
emergency control, not routine approval.

## Cost controls

Recommended initial configuration:

- Discovery: administrator-initiated only, no more than 10 current results per
  search and no automatic pagination.
- Outreach: every 15 minutes, no more than 10 already-consented jobs per run
  and no more than 25 authorized dispatch reservations per India day.
- Supervisor: once per day and after provider failure events.
- Reply handling: webhook-driven, so it runs only when a reply arrives.
- AI: run deterministic deduplication and keyword scoring first. Invoke a small
  model only for ambiguous relevance or reply classification.
- Persist query/quota outcomes, not YouTube result items or contacts.
- Email first. Keep WhatsApp off until its provider and consent setup are ready.
- Approve the fixed consent statement and templates once per reviewed release;
  monitor the canary and aggregate outcomes without approving each recipient.
- Enforce daily provider and model-spend caps with a fail-closed switch.

This provides 24/7 availability without paying for 24/7 model execution.

## Minimal data additions

Add a private, owner-only Farmer contact database for records acquired through
direct signup, existing membership, approved partner consent, or a manual import
with consent evidence. Encrypt email/phone values and keep duplicate hashes
owner-scoped.

For YouTube discovery, persist only:

- `youtube_discovery_runs`: owner, query hash, locale, region, quota use, counts,
  and result status.

Do not store YouTube channel result items or any contact data in discovery
tables. Existing outreach prospect, consent, suppression, outbox, provider
event, and managed-run tables remain the system of record after a person enters
an approved opt-in flow independently of YouTube discovery.

## Release stages

### Stage A — discovery-only

- Add the transient YouTube API adapter and query/quota audit table.
- Run manually with synthetic and administrator-approved test queries.
- Display current results only; send no messages and persist no result items.
- Measure query usefulness without building a contact list.

### Stage B — consented email pilot

- Complete production migrations, secrets, privacy/retention approval, and the
  approved email provider setup.
- Acquire consent through a FarmerBook/partner campaign.
- Start with 5–10 introductions per day and review delivery, replies, bounces,
  opt-outs, and signup conversion.

### Stage C — WhatsApp pilot

- Configure the WhatsApp Business Platform and approved templates.
- Require both the recipient's mobile number and explicit WhatsApp opt-in.
- Start only with opted-in recipients; keep browser/WhatsApp Web automation out
  of production.

### Stage D — controlled scaling

- Increase batches only after quality, consent, complaint, conversion, and cost
  thresholds pass for at least two review cycles.

## Acceptance criteria

- A discovery run cannot send or queue a message.
- A discovery result cannot become a Farmer contact or consent row.
- A public contact detail cannot create active outreach consent.
- Every sent message has source provenance, active purpose/channel consent, an
  idempotency key, provider receipt, and opt-out path.
- `STOP`, unsubscribe, complaint, and consent withdrawal suppress later sends.
- WhatsApp delivery is impossible without explicit opt-in and an approved
  template/provider.
- Repeated failures pause the affected role without stopping unrelated roles.
- Missing readiness, an unknown delivery outcome or a three-failure provider
  circuit persistently pauses all email delivery before another recipient.
- All production flags default to false and require a separate release action.

## Authoritative platform references

- [YouTube Data API `search.list`](https://developers.google.com/youtube/v3/docs/search/list)
- [YouTube developer-policy compliance guide](https://developers.google.com/youtube/terms/developer-policies-guide)
- [YouTube API Services Developer Policies](https://developers.google.com/youtube/terms/developer-policies)
- [WhatsApp Business Messaging Policy](https://business.whatsapp.com/policy)
- [TRAI consent guidance](https://www.trai.gov.in/manage-your-consent)
- [Codex scheduled tasks](https://learn.chatgpt.com/docs/automations)
