---
title: FarmerBook consent-first growth plan
status: Planning only — no outreach or provider activation authorized
last_reviewed: 2026-08-18
owner: FarmerBook
---

# FarmerBook consent-first growth plan

## Outcome

FarmerBook should grow by making it easy for Farmers, Customers, Wholesalers,
Incs, community partners, and eco-friendly product suppliers to **choose to
join**. It must not grow by collecting public phone numbers, automating
WhatsApp Web, adding people to groups, or sending bulk unsolicited messages.

The previous 24-hour WhatsApp restriction is a stop signal, not a reason to
look for a technical workaround. FarmerBook must not resume the behavior that
preceded it, rotate numbers, simulate human browser activity, or use an
unofficial sender. Meta says people can block and report businesses, requires
businesses to honor opt-outs, restricts business-initiated Platform messages to
approved templates, and may progressively restrict repeat violations.

This document is a rollout plan only. It does not authorize a message, enable
`ENABLE_OUTREACH_AGENT`, configure a provider, upload the existing lead CSVs,
or change production state.

## Non-negotiable rules

1. **No WhatsApp Web automation.** Do not use browser macros, extensions,
   Selenium/Playwright, unofficial libraries, QR-session farms, or simulated
   typing to send WhatsApp messages.
2. **No scraping or bought lists.** Do not scrape phone numbers, emails, group
   members, social profiles, directories, or marketplace listings. Do not buy,
   rent, trade, or upload a third-party contact list.
3. **Public does not mean permitted.** A number on a YouTube page, website,
   business card, directory, certification record, or public profile is not
   consent to marketing.
4. **No cold bulk messaging.** Do not send an introduction through WhatsApp,
   SMS, email, or direct message without active permission for that channel and
   purpose.
5. **No contact imports by referrers.** Give supporters a link or QR code that
   they may share themselves. Never ask them to upload their address book or
   group-member list.
6. **Consent is deterministic.** An AI model may translate an approved draft or
   classify an ambiguous reply for human review. It may not invent, infer,
   grant, broaden, or restore consent.
7. **Withdrawal wins immediately.** `STOP`, unsubscribe, a block/report event,
   a complaint, or an off-platform request permanently suppresses new outreach
   on that channel until the person initiates a clearly recorded new opt-in.
8. **No greenwashing.** “Eco-friendly,” “organic,” “biodegradable,” “recycled,”
   and similar product claims require product-specific evidence and must not be
   inferred from a seller's name or advertising.

## First response to the WhatsApp restriction

Before any WhatsApp pilot:

1. Stop every browser automation, bulk sender, extension, and unofficial API.
2. Do not evade the restriction with another number, account, device, or
   altered timing.
3. Record the time, account, tool, approximate volume, message type, recipient
   source, and restriction screenshot in the private incident log. Do not put
   recipient data in this repository.
4. Use only the appeal/review path shown in the WhatsApp Business app or Meta
   Business support if the restriction appears incorrect.
5. Audit whether each contacted person had explicit, provable permission.
   Immediately suppress everyone without it; do not send an apology through
   the blocked channel.
6. Keep WhatsApp delivery disabled until the release gates in this plan pass.

We cannot determine the exact cause of the restriction from its duration
alone. Meta's policy and user-feedback systems make unexpected or high-volume
business messages an avoidable risk, so the safe correction is to replace
outbound list messaging with user-initiated and recorded opt-in flows.

## Who FarmerBook is trying to reach

| Audience | Useful promise | Safe acquisition path | Qualified activation |
|---|---|---|---|
| Farmers | A profile, farmer network, harvest visibility, and direct enquiries | FPO/NGO/KVK/event QR, farmer referral link, search/content, in-person assisted signup | Completed Farmer profile with chosen privacy settings |
| Customers | Discover Farmers and products with clear trust labels | Search landing pages, product/category links, customer referral, event QR | Account plus first saved Farmer, enquiry, or purchase intent |
| Wholesalers and Incs | Structured sourcing requests and direct Farmer responses | Industry associations, chambers, buyer events, partner newsletter | Verified representative plus a complete sourcing request |
| Eco-friendly product suppliers | Reach agriculture customers with evidence-backed product claims | Supplier association, climate/agri incubator, exhibition QR, supplier application | Reviewed business profile plus at least one compliant listing |
| Community partners | A safe, multilingual way to help their members join | Direct partnership agreement; partner distributes FarmerBook's link | Partner campaign with attributable, consented activations |

Do not optimize for raw signups. Optimize for people who understand FarmerBook,
choose to join, and complete a useful first action.

## The opt-in funnel

```text
Search/content/event/partner/referral
             |
             v
Role + language landing page
             |
             v
Signup now  OR  request a chosen update channel
             |
             v
Clear notice + unchecked purpose/channel choices
             |
             v
Channel verification / provider receipt
             |
             v
One relevant onboarding path
             |
             v
Useful activation, preference centre, or STOP
```

Each campaign link should carry only a non-personal campaign code such as
`fpo-kurnool-2026-01`. The visitor supplies their own details. A valid consent
receipt must record:

- person/contact record ID and a keyed contact hash;
- exact channel (`email`, `whatsapp`, or `sms`);
- exact purpose (`onboarding`, `marketplace_updates`, or another reviewed
  value), with promotional updates separate from service messages;
- business name shown as `FarmerBook`;
- wording/policy version and the language shown;
- source/campaign, affirmative action, verification/provider receipt, and
  timestamp;
- expiry, withdrawal time, and suppression state;
- no preselected checkbox and no consent bundled into accepting unrelated
  terms.

Recommended website wording, after privacy/legal review:

> [ ] I agree that FarmerBook may send onboarding help to this WhatsApp number.
> I can reply STOP at any time. [Privacy notice]

Use a separate unchecked choice for offers or marketplace announcements. The
page must also offer “Create my account without marketing messages.” Publish
the notice and consent controls in the visitor's selected language. Human
review is required before a translated legal notice becomes an approved
version.

## Phased low-cost rollout

### Phase 0 — safety reset (now)

- Keep WhatsApp, SMS, and production outreach flags off.
- Complete the restriction audit above and preserve suppression records.
- Remove any operational dependence on the untracked lead CSV files. They are
  research artifacts, not permission to contact anyone.
- Create one preference centre where a person can withdraw by channel and
  purpose without signing in.
- Test `STOP`, unsubscribe, complaint, bounce, wrong-person, duplicate, expired
  consent, and provider-webhook replay paths with synthetic contacts.

**Exit gate:** every outbound job demonstrably requires an active consent row;
every withdrawal cancels queued jobs before provider delivery.

### Phase 1 — website and shareable inbound (weeks 1–2)

This phase can run without outbound messaging.

- Publish clear role pages for Farmers, Customers, Wholesalers/Incs, partners,
  and eco-friendly suppliers, localized into supported Indian languages.
- Add one short interest form and a printable QR code per role/campaign.
- Create useful search content: seasonal crop pages, Farmer profile examples,
  sourcing-request examples, certification-label explanations, and an
  eco-friendly product evidence guide.
- Add referral links inside FarmerBook. The member shares the link themselves;
  FarmerBook never reads their contacts or messages on their behalf.
- Add “Message FarmerBook” click-to-WhatsApp only as a **user-initiated support
  entry point** after the business profile is accurate. Do not use the click to
  infer promotional consent.
- Offer phone/email support through the published FarmerBook contacts for
  people who need assisted signup.

**Target:** 25 consented visits, 10 completed profiles, zero unsolicited sends,
zero complaints.

### Phase 2 — community distribution (weeks 3–6)

- Invite 3–5 FPOs, NGOs, KVK/extension contacts, SHGs, organic/regenerative
  farming communities, farmer markets, and agriculture colleges to review a
  one-page FarmerBook explanation.
- The organization decides whether to share FarmerBook's link/QR in its own
  meeting, noticeboard, newsletter, or group. It must not give FarmerBook its
  member list.
- Hold a short, scheduled demo or assisted-signup desk. Ask each participant to
  scan the QR and enter their own details.
- Give each partner a distinct campaign code and a simple outcome report with
  aggregate counts only. Do not disclose participant identity back to the
  partner without a separate lawful purpose and notice.
- Recruit language ambassadors from activated members to review terminology
  and explain the product in community sessions. Do not let ambassadors export
  contacts or send from FarmerBook's account.

**Target:** two active partner campaigns, 30 qualified activations, at least
50% profile completion, and no channel with a complaint.

### Phase 3 — consented email pilot (weeks 5–8)

- Use only addresses supplied through a FarmerBook or approved partner opt-in.
- Verify `farmerbook.in`, SPF, DKIM, DMARC, Return-Path, and provider lifecycle
  webhooks before using `ceo@farmerbook.in` as the sender.
- Send one useful introduction. Send one onboarding follow-up no sooner than
  seven days later only when the recorded consent includes that follow-up.
- Provide a one-click unsubscribe and process it before any later message.
- Human-review the first 100 deliveries and every localized template version.

**Pilot cap:** 5 messages/day for the first 20, then at most 10/day through the
first 100, subject to the stop rules below.

### Phase 4 — official WhatsApp Business Platform pilot (later, optional)

Do this only if inbound/partner channels are working and WhatsApp is still a
clear user need.

Required release gates:

- Meta Business/WhatsApp Business account and phone number are approved and
  show accurate FarmerBook support information.
- Use only Meta's hosted WhatsApp Business Platform (Cloud API) or an approved
  Solution Provider—not WhatsApp Web or an unofficial API.
- Store advance opt-in that clearly names FarmerBook and the message purpose.
- Register/approve each business-initiated Message Template and use it only for
  its reviewed purpose. Outside the 24-hour customer-service window, only an
  approved template may be sent.
- Provide prompt human escalation to `ceo@farmerbook.in` or
  `+91 91779 01022`; an AI response must never be the only support path.
- Implement signed status/inbound webhooks, idempotency, provider receipts,
  template status, quality rating, and immediate STOP suppression.
- Complete Indian legal/provider review. For SMS/telecom commercial messaging,
  TRAI's TCCCPR framework requires sender/telemarketer, header, and content
  template registration plus consent/preference controls through the DLT
  system. Do not treat WhatsApp approval as permission for SMS.

Start with people who explicitly requested WhatsApp onboarding. Do not upload a
phone book or re-contact anyone from the blocked attempt.

**Pilot cap:** 5 opted-in recipients/day and one business-initiated onboarding
message per recipient. One optional follow-up after seven days requires
separate recorded follow-up consent. Marketing announcements are disabled in
the pilot.

### Phase 5 — controlled expansion

Increase a channel by no more than 2x after two consecutive weekly reviews meet
all activation, consent, complaint, quality, delivery, and spend thresholds.
If a source produces visits but few useful activations, improve the page or
stop the source; do not compensate by sending more messages.

## Eco-friendly supplier onboarding

Create a dedicated inbound application for businesses offering products that
may reduce agricultural or packaging impacts—for example water-saving
irrigation, repairable tools, renewable-energy equipment, composting products,
reusable or responsibly sourced packaging, soil-testing tools, and products
made with verified recycled content.

The application should collect:

- legal/business identity and an authorized representative;
- product category, service area, pricing unit, warranty/returns, and support;
- the exact environmental claim and its scope;
- product test report, certification, bill of materials, manufacturer evidence,
  recycled/biobased content evidence, end-of-life instructions, or other
  claim-specific proof;
- any regulated-product licence that applies; and
- consent to publish only the approved business and product fields.

Display claim states independently from business verification:

- `Environmental claim verified — [claim and evidence type]`
- `Environmental evidence under review`
- `Seller-described environmental benefit — not independently verified`

Never display a blanket “eco-friendly certified” badge. Reject vague,
unbounded claims such as “100% green” when the submitted evidence supports
only one material, component, or lifecycle stage. Regulated, hazardous,
medical, pesticide, seed, fertilizer, and other controlled goods require a
separate product-policy/legal gate before listing or promotion. WhatsApp
Catalogs and commerce experiences must also comply with Meta's Commerce Policy.

Low-cost supplier sources:

- climate/agriculture incubators and university entrepreneurship cells;
- FPO-recommended local service providers, with the supplier applying directly;
- trade-fair/exhibition QR cards and webinar registration;
- repair, water-efficiency, renewable-energy, circular-packaging, and
  sustainable-agriculture associations; and
- existing verified suppliers' shareable referral links.

Partners share the application; FarmerBook does not scrape exhibitor lists or
email all members of an association.

## Internal frequency caps

| Communication | Maximum |
|---|---|
| Service response after a user message | Necessary replies within the active support thread; offer human escalation |
| Onboarding introduction | Once per channel/purpose/consent |
| Onboarding follow-up | Once, at least 7 days later, only if explicitly requested |
| Email newsletter/marketplace updates | At most twice/month after separate promotional opt-in |
| WhatsApp marketing | Disabled in the pilot; later at most twice/month after a separate approved review |
| Referral reminder to an existing member | At most once/month; no contact upload request |
| Re-engagement after inactivity | One message only if active consent still covers it; otherwise none |

Quiet hours for business-initiated non-urgent messages: 08:00–19:00 in the
recipient's known local time. If the time zone is not known, use India time only
for India-targeted campaigns. Never send on a schedule the person did not
reasonably expect.

## Stop and suppression rules

Process these rules deterministically before AI or delivery:

- `STOP`, `UNSUBSCRIBE`, “do not contact,” “not interested,” and reviewed
  equivalents in every supported language immediately suppress that channel.
- A WhatsApp block/report, provider complaint, hard email bounce, wrong-person
  response, withdrawn/expired consent, or manual privacy request cancels all
  queued messages for the affected contact/purpose.
- Do not automatically retry a policy rejection, template pause, consent
  mismatch, invalid recipient, complaint, hard bounce, or suppression result.
- Deduplicate by keyed contact hash before queuing. A duplicate form submission
  must not create another introduction.
- Keep suppressions when deleting ordinary campaign data; a privacy owner must
  review the minimum retained keyed value and legal retention basis.
- A later opt-in must be a new affirmative action with a new receipt. An agent
  cannot clear a suppression.

Pause the entire affected channel when any of these pilot thresholds is met:

- one spam/abuse complaint or WhatsApp report in the first 100 sends;
- Meta quality rating becomes low, a template is paused/rejected, or account
  messaging is restricted;
- rolling seven-day block/report rate is at least 1%;
- rolling seven-day unsubscribe/STOP rate is at least 2%;
- hard-bounce/invalid-recipient rate exceeds 5%;
- any send lacks consent evidence, or provider volume exceeds the configured
  cap; or
- three consecutive provider or webhook-processing failures.

Resume only after a human records the cause, affected data, correction, new
test evidence, and explicit release approval. Never weaken a stop rule to hit a
growth target.

## Metrics that matter

Review by source, role, language, and channel without exposing individual
contacts:

- unique landing visits and explicit opt-in rate;
- account completion and qualified activation rate;
- Farmer profile completeness and first marketplace/community action;
- supplier application-to-reviewed-listing rate;
- partner campaigns with at least five qualified activations;
- cost per qualified activation, not cost per imported contact;
- delivery, reply, human-handoff, bounce, block/report, STOP, unsubscribe, and
  complaint rates;
- WhatsApp template status and quality rating;
- consent-withdrawal processing latency; and
- AI/provider spend against its cap.

North-star pilot metric: **weekly qualified activations with zero consent
violations**. Raw messages sent and raw leads collected are guardrail metrics,
not success metrics.

## Budget

### Managed-agent budget — part of the existing USD 10/month cap

This growth workstream receives a hard **USD 3/month maximum**, not an extra
budget:

| Use | Monthly hard limit |
|---|---:|
| Consent/suppression/deduplication | $0 model spend; deterministic code |
| Ambiguous reply classification | $1; smallest approved model, only after rules |
| Administrator-requested localization/content draft | $1; never automatic bulk generation |
| Spend/policy supervision | $1 |
| **Growth-agent maximum** | **$3** |

At $2 forecast spend, stop optional classification and drafting and route to a
human. At $3 conservative reserved spend, all growth model calls stop. Consent
intake, STOP, suppression, provider webhooks, and the preference centre must
continue without AI. The private singleton `AiFleetBudgetAgent` atomically
reserves every allowlisted model call before inference and denies it when the
growth allocation or shared USD 10 UTC-month cap would be exceeded. Its retail-
value ledger does not subtract Cloudflare's account-wide daily free Neuron
allocation and is therefore intentionally more conservative than the invoice.

### External channel spend — separate owner approval

Transport, printing, events, and advertising are not AI-agent spend. They need
a separate cap and approval:

- Phase 0–1: ₹0 paid media; use the website, owned content, and digital QR
  assets.
- Phase 2 pilot suggestion: at most ₹1,000/month for small print materials or
  an assisted-signup table, with receipts.
- Phase 3–4: provider delivery costs capped separately before activation.
- Paid click-to-message/search ads: ₹0 until organic and partner landing-page
  activation is measured; then a separately approved small experiment, never
  funded by increasing the USD 10 agent cap.

## Google and public-platform boundaries

- A Google Business Profile is appropriate only if FarmerBook meets Google's
  eligibility rule for in-person customer contact at a real location or as an
  eligible service-area business. Google lists online-only businesses and lead
  generation companies as ineligible. Do not create a misleading location or
  stuff the business name with search terms.
- If eligible, use one accurate owner-controlled profile, FarmerBook's real
  phone/site, and policy-compliant posts. Do not solicit fake/incentivized
  reviews.
- YouTube discovery remains read-only through the official Data API and never
  extracts contact details or messages channels. FarmerBook's own videos may
  include an on-screen QR/link for viewers to opt in.
- Use native tools to publish to FarmerBook-owned social pages. Do not automate
  unsolicited direct messages, scrape followers, or add users to groups.

## Release checklist

- [ ] Previous WhatsApp restriction documented and every unofficial sender removed.
- [ ] Privacy/legal owner approves consent text, retention, and staged DPDP readiness.
- [ ] Channel and purpose choices are separate, unchecked, versioned, and localized.
- [ ] Preference centre and multilingual STOP rules pass synthetic tests.
- [ ] Consent gate, deduplication, suppression, idempotency, and signed webhooks pass staging.
- [ ] Sender/business identity and provider are approved; no spoofing.
- [ ] WhatsApp Platform templates and human escalation are approved, if WhatsApp is enabled.
- [ ] TRAI/DLT/provider obligations are approved before SMS or applicable commercial telecom sends.
- [ ] Daily, recipient, campaign, model, provider, and monthly spend caps fail closed.
- [ ] First 100 deliveries receive daily human review.
- [ ] Production flags remain off until the production runbook's separate approval occurs.

## Authoritative references

- [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/) —
  quality, opt-out, approved-template, 24-hour window, automation escalation,
  data, enforcement, and commerce requirements.
- [WhatsApp: Best Practices for Marketing Messages (2026)](https://whatsappbusiness.com/wp-content/uploads/2026/04/Best-Practices-for-Marketing-Messages-on-WhatsApp-.pdf)
  — advance opt-in, separate promotional consent, transparent opt-in methods,
  frequency, and quality monitoring.
- [Meta: Ways to Manage Your Businesses Chats on WhatsApp](https://about.fb.com/news/2025/04/ways-to-manage-your-businesses-chats-on-whatsapp/)
  — user opt-in/control, blocks/reports, template review, message limits, and
  progressive enforcement.
- [TRAI TCCCPR overview](https://trai.gov.in/tcccpr) and the
  [2025 TCCCPR amendment](https://www.trai.gov.in/sites/default/files/2025-02/Regulation_12022025.pdf)
  — preferences, sender/header/template registration, DLT consent acquisition,
  complaint handling, and action against unregistered commercial senders.
- [Digital Personal Data Protection Act, 2023 and notified instruments](https://www.indiacode.nic.in/handle/123456789/22037)
  and [DPDP Rules, 2025](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025)
  — staged Indian personal-data obligations; the privacy owner must track the
  official commencement schedule rather than assume every provision started on
  enactment.
- [Google guidelines for representing a business](https://support.google.com/business/answer/3038177?hl=en)
  and [Business Profile eligibility overview](https://support.google.com/business/answer/13762416?hl=en-en)
  — accurate identity/location, eligibility, contact, content, and suspension
  boundaries.
- [YouTube Data API `search.list`](https://developers.google.com/youtube/v3/docs/search/list)
  and [YouTube API developer policies](https://developers.google.com/youtube/terms/developer-policies)
  — approved API discovery boundaries already adopted by FarmerBook.

This plan is an engineering and operating control, not legal advice. The named
privacy/legal owner must review current Indian law, provider terms, and each
campaign before production activation.
