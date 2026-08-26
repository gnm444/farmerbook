# FarmerBook

FarmerBook is a farmer-first social network and direct agriculture marketplace -
think LinkedIn-style professional identity and Facebook-style community,
designed specifically for farmers. Farmers can build a role-aware profile,
share knowledge and opportunities, discover and follow peers, exchange direct
messages, showcase produce, receive private buyer enquiries, and build trust
through reviews tied to seller-confirmed completed enquiries. Customers,
wholesalers, and agriculture businesses participate in the same connected
ecosystem.

The repository includes an explicitly labelled, read-only marketplace demo and
a Supabase-backed application boundary with email authentication, PostgreSQL Row Level
Security, storage policies, seller/customer authorization, purchase reviews,
and administrator moderation actions.

## Managed AI fleet and the $10 inference ceiling

The public site includes a Cloudflare Agent named `WebsiteGreetingAgent`. It is
available on demand 24/7 through a SQLite-backed Durable Object; it does not run
an always-on server while idle. Common questions use reviewed, zero-token
answers. Unmatched questions use Cloudflare-hosted
`@cf/ibm-granite/granite-4.0-h-micro`, the least expensive suitable
instruction/agent model in the current Workers AI catalogue.

One private singleton `AiFleetBudgetAgent` is the application-level circuit
breaker for every Workers AI inference. A call must reserve its conservative
maximum retail-value estimate before the model runs. The singleton atomically
enforces a USD 10 UTC-month fleet ceiling and these code-reviewed allocations:
website greeting USD 5, blog writing/translation USD 2, growth outreach/OCR
USD 3, and USD 0 each for profile drafting, customer support and social
content. The full USD 10 is allocated; no Agent can borrow another
workstream's allocation.

The greeting workstream also keeps its stricter local limits: eight replies per
visitor session, 25,000 answered requests per month and 1,000 model calls per
day. When any local or central limit is reached, it stops model calls and gives
the published email and phone number. The administrator ledger is read-only at
`/admin/agents`; it contains only model/cost/count metadata, never prompts,
screenshots, outputs, users or source/customer content.

The ledger is deliberately conservative and is not the Cloudflare invoice. It
does not subtract the account-wide daily free Neuron allocation, so invoiced
Workers AI spend can be lower. Cloudflare budget alerts are informational and
do not stop usage; Worker requests, Durable Objects, storage and other platform
charges are separate from this USD 10 model-inference ceiling. A dedicated
Workers Free account/project remains an optional additional provider-side
fail-closed boundary.

Cloudflare AI Gateway can later route this Agent to newer Anthropic, Google or
Workers AI models. A new model must not be enabled merely by changing an
environment value: add its reviewed input/output pricing to the server-side
allowlist, recalculate the conservative reservation, run the budget tests, and
keep the $10 fleet ceiling. This avoids silently turning “latest” into an
uncapped bill.

The Agent stores only a random session identifier, counters and timestamps in
its Durable Object. It does not store visitor message text.

## AI company command center

FarmerBook has a default-off operating layer for the six-month goal of 100,000
registered users, 40,000 activated users, and 25,000 monthly active users. One
private `CompanyOperationsAgent` class supplies 15 role-locked named Durable
Object instances: executive strategy, operations coordination, data and
experimentation, governance and risk, independent audit, growth strategy,
Farmer acquisition, buyer acquisition, Farmer onboarding, marketplace
matching, SEO/editorial, product management, engineering planning, QA and
reliability, and support/trust.

These roles do not consume Workers AI budget. A deterministic,
version-controlled `company-policy-v1` reads aggregate counters and creates at
most one reviewable proposal per run. Supabase stores the three objectives,
run-linked KPI snapshots, proposals, optimistic revisions, and immutable
decision events. Snapshots contain no names, contacts, messages, support text,
prompts, or participant-level records.

An administrator reviews proposals at `/admin/agents`. Approval means “accept
into the operating backlog”; there is deliberately no connector that can send,
publish, deploy, spend, modify users, moderate content, or grant verification.
The shared managed-operations flag, separate `ENABLE_AI_COMPANY` flag, private
`managed_operations_agents` database control, and private `ai_company` control
must all pass before a role can run. All controls and all 15 roles default off.
The first production activation completed on 2026-08-19 with all 15 schedules
enabled and proposal execution still human-gated. See the production runbook
before any configuration change or rollback.

## Organic certification labels

“Organic practices” is a self-described farming method, not proof of
certification. A Farmer remains labelled exactly `Non-certified organic farmer
(paperwork not yet completed to prove certification).` until they upload a PDF,
JPEG or PNG certificate through profile settings and an administrator approves
the private document. Only the reviewed database view can produce the public
`Certified organic` status. Listing certification arrays cannot self-declare or
override it.

Apply `20260818120000_organic_farmer_certification.sql` before enabling this
workflow. The migration creates the private 10 MB evidence bucket, owner-only
upload policy, administrator review RPC, public status-only view, revocation
trigger and marketplace claim guard.

## Copyright, source licence and contact

Copyright © 2026 FarmerBook contributors. The code is copyrighted open-source
software under `AGPL-3.0-only`, a strong copyleft licence. Use, copying,
modification and redistribution are allowed only under those terms, including
the network-source obligation; unlicensed copying is not authorised. The
FarmerBook name and visual identity are reserved separately. See
[`LICENSE.md`](LICENSE.md), [`TRADEMARKS.md`](TRADEMARKS.md), and `/license`.

Contact: `ceo@farmerbook.in` · `+91 91779 01022`.

## Run locally

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. Live marketplace routes fail closed when no
Supabase project is configured. Fictional inventory is isolated at
`/marketplace/demo`, labelled as fictional, and exposes no live transaction
actions. Set `NEXT_PUBLIC_DEMO_MODE=true` only for local development.

To connect a Supabase project, copy `.env.example` to `.env.local`, provide the
public project values and server-only service-role key, then apply every SQL
file in `supabase/migrations` in filename order.

Real credentials must stay in ignored `.env*` files for local development and
in the target platform's secret store for deployment. Codex, ChatGPT, Claude,
or other developer-tool login credentials are never application dependencies.
See [Secrets and GitHub deployment](docs/SECRETS_AND_GITHUB_DEPLOYMENT.md) for
the public/secret boundary and the credentials a future deployment workflow
would need.

Production must set `NEXT_PUBLIC_SITE_URL`, both public Supabase values, and
`NEXT_PUBLIC_DEMO_MODE=false`. The application refuses to start on a
non-local origin with demo mode enabled or without a complete public Supabase
configuration. Cloudflare custom domains are supplied through the
comma-separated `FARMERBOOK_CUSTOM_DOMAINS` environment value; project URLs,
keys, routes, and feature flags are not hard-coded in `vite.config.ts`.

Agriculture ecosystem releases are additive and disabled by default, except the
shipped 23-locale catalog. Enable product capabilities only after the
corresponding migration and verification gate succeeds in the target
environment:

- `ENABLE_CANONICAL_AGRICULTURE_TAXONOMY`
- `ENABLE_RESUMABLE_ONBOARDING`
- `ENABLE_AGRI_BUSINESSES`
- `ENABLE_BUSINESS_OFFERS`
- `ENABLE_EXTENDED_LOCALES`
- `ENABLE_INC_SOURCING`
- `ENABLE_OUTREACH_AGENT`
- `ENABLE_PROFILE_RESEARCH_AGENT`
- `ENABLE_MANAGED_OPERATIONS_AGENTS`
- `ENABLE_FEATURED_FARMER_PROFILES`
- `ENABLE_PRIVATE_FARMER_CONTACTS`
- `ENABLE_SOURCED_FARMER_RESEARCH`

`ENABLE_EXTENDED_LOCALES` defaults on so all 22 Scheduled Languages plus Indian
English are selectable. Set it to `false` only as an emergency rollback;
unreviewed strings disclose their Indian-English fallback.

The public farming library is at `/blog`. A dedicated Cloudflare
`BlogWritingAgent` prepares at most one evidence-bounded private draft every
day at 09:00 IST and requires an authenticated administrator to review the
exact revision before publishing it from `/admin/blog`. India-calendar run
keys prevent scheduled retries and manual tests from creating or funding a
second draft that day. Its cheapest allowlisted Workers AI model has a hard
default USD 2/month inference cap inside the shared USD 10 fleet budget.
Reviewed Telugu and Indian English articles are canonical; the other supported
Indian languages receive cached, clearly disclosed AI-assisted translations
with an honest English fallback. See `docs/BLOG_WRITING_AGENT.md`.

The acquisition agent is consent-first. Administrators may analyze a bounded
public website or supply a public social description/screenshot, but FarmerBook
does not scrape YouTube or social profiles and never treats a visible contact
as permission to message. `/join` records an inbound request behind Turnstile;
the outbox releases an introduction only after a verified, purpose-specific
provider consent receipt. Missing provider configuration means no work is
claimed and no message is sent. See the production runbook section “Consent-
first acquisition agent” for the required provider, India sender/DLT-DCA,
privacy, retention, suppression and rollout gates.

The managed profile-research Agent can turn permitted professional evidence
into a private, cited `Not verified` Farmer profile sample and wait for the
invitation holder's approval. It uses the Cloudflare `AI` binding, a SQLite
Durable Object, and a Workflow—no model key is stored in the app. It never
publishes a non-member profile, and its separate Worker/database controls stay
off until the managed-profile staging and consent gates in the runbook pass.

Administrator name discovery uses Brave Search API only when
`BRAVE_SEARCH_STORAGE_RIGHTS_CONFIRMED=true` and the selected plan explicitly
permits retaining the selected snippets. Install `BRAVE_SEARCH_API_KEY` with
`wrangler secret put`; never add it to source, Vite variables, or chat. Search
is limited to five retained matches and database-capped at 25 requests per
administrator/day and 250/month. Results can build only a private `Not
verified` sample; they do not create a contact candidate or permission to send.

Featured Farmers is a separate editorial workflow at
`/admin/featured-farmers` for documenting farmers whose significant work is
supported by public evidence. It opens five bounded Google Search query routes
for human review and stores only destination pages selected by an administrator;
FarmerBook never fetches or stores a Google results page. Optional YouTube
discovery uses the official YouTube Data API through the server-only
`YOUTUBE_DATA_API_KEY`, reserves shared database quota before every call, keeps
at most five text-only candidates for no more than 30 days, and never copies
media, thumbnails, comments, transcripts, statistics, or cookies.

Publication at `/featured-farmers/[slug]` is an editorial article about a
person, not a FarmerBook member profile or verification claim. Two current
professional sources on separate domains and at least one authoritative or
independent source are controlled by the private
`featured_farmer_professional_sources_required` switch; it temporarily defaults
to false and can be restored without a schema change. Readiness always requires
two cited significance claims, three story sections, a fact check within 24
hours, and at least one manually confirmed Farmer-owned LinkedIn, Instagram,
Facebook or YouTube account. Optional professional-source mode does not mean
independent verification: every public claim must still cite selected evidence.
Posts, reels,
interviews and watch URLs remain citations and cannot become social-profile
links. Every displayed claim keeps its selected sources; only original
photographs with recorded republication rights may be shown. A provider-hosted
preview may appear only when it stays on the provider, links to the source and
shows clear attribution; otherwise the public page remains image-free. Stories expose
their fact-check date, citations, editorial disclosure, and correction/removal
path. The legacy `/admin/known-farmers` route redirects to this newsroom.

Sandeep Dasari's curated story also has a standalone Featured Farmer engagement
surface. It displays the owner-authorized Avani Van Farms email, sends public
questions privately through exact-action Turnstile and a server-owned Postmark
recipient, publishes only administrator-approved self-declared Customer
recommendations, and shows an approximate profile-view aggregate. The view
counter stores no visitor row, IP, user agent, fingerprint or auth identity; a
date-only HttpOnly cookie limits counting to once per browser per UTC day. This
surface is independent of marketplace verified-purchase reviews and the gated
Featured Farmer newsroom schema.

`ENABLE_FEATURED_FARMER_PROFILES` and the database release control
`featured_farmer_profiles` both default to false. Before enabling either one,
name an editorial/privacy owner, approve the selection criteria and correction
policy, confirm image rights and living-person/privacy review, rehearse RLS and
withdrawal in staging, and approve the first subjects. Review the criteria and
published collection at least annually. Do not publish private contact details,
sensitive personal data, inferred attributes, copied third-party media, or any
claim that the subject joined or endorsed FarmerBook.

Editorial snapshots may also include a `Reported farm products` catalog. It is
operator-supplied context only: it contains no price, stock, delivery, order or
enquiry action and is never a substitute for seller-owned marketplace listings.
A real store requires an active, onboarding-complete account controlled by the
seller, current commercial fields, applicable food-business evidence and the
seller's approval.

Consented messages receive one-time signed invitations that link the resulting
authenticated account to its prospect record without placing contact data in
the URL. Verified provider replies stop follow-ups; STOP, declines, complaints
and hard bounces suppress further delivery. Delivery has a separate
database-owned runtime pause that defaults to paused even when the feature flag
is enabled. The admin console has no force-send or consent-bypass control.

The first concrete email adapter targets Postmark with a verified FarmerBook
domain, separate transactional and optional Broadcast Message Streams, signed
double opt-in, per-message inbound reply routing, bounce/complaint suppression
and one-click unsubscribe. `ceo@farmerbook.in` is the selected professional
identity and forwards inbound mail to the owner Gmail. Postmark manually
approved the FarmerBook account on 2026-08-17 and verified the domain DKIM and
custom Return-Path; the application may use this address as `From` only through
the reviewed Postmark adapter after the owner canary and release gates pass.
The owner Gmail is never used as the autonomous sender.

Once the one-time release and canary are complete, `Growth & Outreach` processes
the consented queue every 15 minutes without per-message approval. A service-
only final dispatch RPC rechecks pause, expiry, suppression and exact-purpose
authority immediately before any contact read or provider call. It reserves at
most 25 attempts per India calendar day and stores only redacted immutable
decision evidence. Missing credentials/legal configuration, an invalid final
check, an ambiguous provider outcome or a three-failure circuit break
persistently pauses delivery and exposes an actionable reason in the admin
console. Resume remains an explicit recovery operation; it cannot override
consent or suppression.

The 15 aggregate-only company Agents are operated through
`/admin/agents`; their browser guide is at `/admin/agents/guide` and the
repository guide is [`docs/AI_COMPANY_OPERATING_GUIDE.md`](docs/AI_COMPANY_OPERATING_GUIDE.md).
Company proposal approval creates backlog work only. Consented email delivery
belongs to the separate `Growth & Outreach` specialized Agent.

The private Farmer database at `/admin/farmer-database` is a founder-owner-only
contact store for direct interest, existing-member, approved partner, and
consent-evidenced manual records. Contact values are application-encrypted and
never exposed through browser database grants. Its on-demand YouTube Discovery
view uses the official Data API but keeps only query hashes and aggregate run
metadata; channel results are transient and cannot become contacts or messages.
Only confirmed, purpose-matched email consent can enter the existing paused
outreach outbox. WhatsApp is not implemented. Both the application flag and
database control default to off; see the production runbook before enabling.

The separate `/admin/sourced-farmers` workspace accepts an approved YouTube
channel handle or URL and runs one resumable, quota-reserved batch through the
official YouTube Data API. Descriptions and titles are contact-redacted before
the founder can inspect them and are never stored. PostgreSQL retains only
anonymous agriculture tags, actor counts, canonical source IDs/URLs,
checkpoints, fingerprints, and refresh/expiry timestamps for no more than 30
days. A durable named research profile can be created only from documented
subject consent or cited, independently reviewed non-YouTube evidence. It does
not create contacts, members, consent, outreach, verification, or public
profiles. Both `ENABLE_SOURCED_FARMER_RESEARCH` and the database control
`sourced_farmer_research` default to false.

One dated, product-owner-approved exception is available at
`/admin/sourced-farmers/raitunestham`: a fixed, manually reviewed server-side
snapshot of 41 Raitu Nestham profiles and 37 publicly advertised professional
phone numbers. It uses the same exact founder-owner gate, is read-only and
noindex, is absent from client bundles and public navigation, and labels every
number `Public/unverified · not outreach consent`. The snapshot does not change
the official YouTube discovery flow above: future API responses remain
transient and contact-redacted, and no snapshot entry becomes a contact,
member, consent record, outreach target, verification result, or publication.

## Supervised support and social-content pilot

FarmerBook includes a default-off customer-operations pilot. Authenticated
participants can submit an in-app support case. When separately enabled on a
deployed Worker, two private Cloudflare Agents use Workers AI schedules to
prepare customer-support replies and FarmerBook-owned social content, while
Supabase stores the review queue and immutable decision evidence.

Agents cannot approve their own work. Every support reply remains private until
an administrator approves it, and every social proposal becomes only
`Copy ready` for manual posting. The pilot has no email/WhatsApp ingestion,
direct-message automation, social-network connector, automatic send or public
post operation. Enablement requires `ENABLE_SUPPORT_SOCIAL_PILOT`, the separate
`support_social_pilot` database control, the existing managed-agent fleet and a
reviewed staging rehearsal; see the production runbook.

## Google and Facebook sign-in

FarmerBook uses Supabase's server-side OAuth/PKCE flow. To activate the buttons:

1. Create Web OAuth applications in Google Auth Platform and Meta for
   Developers.
2. In each provider, use the Supabase callback shown in the Supabase provider
   settings. It has the form
   `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Enable Google and Facebook in Supabase Authentication → Providers and enter
   each provider's client ID and secret there. Provider secrets never belong in
   this repository or browser environment variables.
4. In Supabase Authentication → URL Configuration, set the production Site URL
   to `https://farmerbook.in` and allow
   `https://farmerbook.in/auth/callback`. Add
   `http://localhost:3000/auth/callback` during local development and
   `https://farmerbook.farmersbook.workers.dev/auth/callback` while the
   Cloudflare development site is active.
5. Set `NEXT_PUBLIC_SITE_URL` to the currently deployed application origin in
   the Worker environment.

Google uses Supabase provider `google`, and Facebook uses `facebook`. LinkedIn,
Instagram, and passkey authentication are intentionally not exposed or accepted
by FarmerBook.

When a Google or configured social OAuth identity supplies a profile photo,
FarmerBook validates the provider-owned HTTPS host and copies the bounded image
into the user's existing private avatar folder. It never crawls user-entered
social links for images. A Farmer without a real photo receives the local
default Farmer icon; that icon must not be treated as identity-card evidence.

FarmerBook checks the public Supabase Auth provider flags before leaving the
site. A provider that is not enabled returns the user to login with a friendly
message, while cancellations and provider callback failures are mapped to
bounded in-app errors rather than exposing raw provider responses.

## Quality checks

```bash
npm run check
npm run test:e2e
```

The main quality gate runs ESLint, TypeScript, unit and schema checks, and a
production build. Playwright covers the desktop and mobile demonstration
journeys.

## Product documents

- [MVP product design](docs/MVP_PRODUCT_DESIGN.md)
- [Secrets and GitHub deployment](docs/SECRETS_AND_GITHUB_DEPLOYMENT.md)
- [Consent-first growth plan](docs/CONSENT_FIRST_GROWTH_PLAN.md)
- [Eco-friendly product onboarding](docs/ECO_FRIENDLY_PRODUCTS.md)
- [Living implementation plan](PLAN.md)
- [Implementation research](research.md)

Before opening a real pilot, choose the region, crop focus, pilot language,
invitation method, and named moderator; configure production email delivery and
recoverable backups; and complete farmer usability testing.
