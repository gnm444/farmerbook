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

Agriculture ecosystem releases are additive and disabled by default. Enable
only after the corresponding migration and verification gate succeeds in the
target environment:

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
person, not a FarmerBook member profile or verification claim. Readiness
requires two current professional sources on separate domains, at least one
authoritative or independent source, two cited significance claims, three story
sections, a fact check within 24 hours, and at least one manually confirmed
Farmer-owned LinkedIn, Instagram, Facebook or YouTube account. Posts, reels,
interviews and watch URLs remain citations and cannot become social-profile
links. Every displayed claim keeps its selected sources; only original
photographs with recorded republication rights may be shown. A provider-hosted
preview may appear only when it stays on the provider, links to the source and
shows clear attribution; otherwise the public page remains image-free. Stories expose
their fact-check date, citations, editorial disclosure, and correction/removal
path. The legacy `/admin/known-farmers` route redirects to this newsroom.

`ENABLE_FEATURED_FARMER_PROFILES` and the database release control
`featured_farmer_profiles` both default to false. Before enabling either one,
name an editorial/privacy owner, approve the selection criteria and correction
policy, confirm image rights and living-person/privacy review, rehearse RLS and
withdrawal in staging, and approve the first subjects. Review the criteria and
published collection at least annually. Do not publish private contact details,
sensitive personal data, inferred attributes, copied third-party media, or any
claim that the subject joined or endorsed FarmerBook.

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
identity and currently forwards inbound mail to the owner Gmail. It remains
receive-only and cannot be used as `From` until Postmark verifies the domain and
outbound SPF/DKIM/DMARC alignment; the owner Gmail is never used as the
autonomous sender.

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
- [Living implementation plan](PLAN.md)
- [Implementation research](research.md)

Before opening a real pilot, choose the region, crop focus, pilot language,
invitation method, and named moderator; configure production email delivery and
recoverable backups; and complete farmer usability testing.
