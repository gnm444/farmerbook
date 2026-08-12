# FarmerBook

FarmerBook is a responsive professional network and direct agriculture
marketplace for Farmers, Customers, Wholesalers and agricultural businesses.
Participants can build a role-aware profile, share updates, discover and follow
peers, exchange direct messages, connect around produce and record reviews from
seller-confirmed completed enquiries.

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

Known Farmer Intake is a separate administrator workflow at
`/admin/known-farmers` for Farmers personally known to FarmerBook. It opens a
bounded normal Google Search for human review and stores only destination pages
the administrator selects; FarmerBook never fetches or stores a Google results
page. Optional YouTube discovery uses the official YouTube Data API through the
server-only `YOUTUBE_DATA_API_KEY`, reserves database quota before every call,
retains at most five text-only candidates for no more than 30 days, and never
copies media, thumbnails, comments, transcripts, statistics, or cookies.

Every retained source must be selected or rejected and classified as the
Farmer's own social profile, third-party coverage, or a professional reference.
Posts, reels, interviews and watch URLs remain citations and cannot become
profile social links. A private `Not verified` sample cannot be built without a
reviewed Farmer-owned LinkedIn, Instagram, Facebook or YouTube account URL, and
a Farmer profile cannot be made public without at least one supported social
link. Missing links are shown honestly; none are invented. The local feature
and database controls remain off until the runbook's provider, privacy,
retention, RLS and staging gates pass.

Consented messages receive one-time signed invitations that link the resulting
authenticated account to its prospect record without placing contact data in
the URL. Verified provider replies stop follow-ups; STOP, declines, complaints
and hard bounces suppress further delivery. Delivery has a separate
database-owned runtime pause that defaults to paused even when the feature flag
is enabled. The admin console has no force-send or consent-bypass control.

The first concrete email adapter targets Postmark with a verified FarmerBook
domain, Broadcast Message Stream, signed double opt-in, per-message inbound
reply routing, bounce/complaint suppression and one-click unsubscribe. A Gmail
address may be an owner mailbox but is never used as the autonomous sender.

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
- [Living implementation plan](PLAN.md)
- [Implementation research](research.md)

Before opening a real pilot, choose the region, crop focus, pilot language,
invitation method, and named moderator; configure production email delivery and
recoverable backups; and complete farmer usability testing.
