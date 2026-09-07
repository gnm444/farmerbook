# Research: Linking Featured Farmer editorial profiles to FarmerBook accounts

## Scope

The requested capability is to connect a curated `/featured-farmers/:slug` editorial profile to a real FarmerBook account after that person signs in, with the same model applied to the already-registered Sandeep Dasari.

The link must not retroactively turn an editorial profile into an identity-verification or certification claim. It should be explicit, auditable, reversible, and restricted to administrators.

## Current architecture

```text
Supabase Auth user
       │ 1:1
       ▼
public.profiles (account, handle, role, public profile settings)
       │
       ├── /store/:handle and /farmers/:handle account-facing surfaces
       │
       └── no current relation

Curated static publication in features/featured-farmers/*.ts
       │
       ▼
/featured-farmers/:slug editorial profile
       │
       └── optional engagement subject keyed only by slug
```

### Authenticated account model

- `supabase/migrations/20260729160000_initial_farmerbook.sql:15-40` defines `public.profiles`. Its primary key is the matching `auth.users.id` and it holds the account’s handle, full name, account role, status and onboarding state.
- `features/auth/require-user.ts:25-86` obtains the authenticated Supabase user and reads the matching `profiles` row. `ActiveUser` carries the account id and optional email only for the current user.
- `features/auth/require-admin.ts:5-23` uses authenticated user app metadata (`role === "admin"`) for administration access.
- `features/profiles/queries.ts:130-184` demonstrates how an account profile is resolved from `profiles` and rendered separately from curated Featured Farmer content.

### Featured Farmer editorial model

- `features/featured-farmers/queries.ts:203-322` validates a curated `FeaturedFarmerPublication` snapshot. It contains name, sources, claims, sections, permitted media and coverage, but no authenticated account identifier.
- `features/featured-farmers/queries.ts:315-323` keeps curated publications in a static array. `mVenkataSubbaraoPublication`, `sandeepDasariPublication` and `narayanaReddyPublication` are therefore not database-owned account records.
- `features/featured-farmers/public-profile.tsx:142-458` renders the editorial story and deliberately describes the source material, limitations and corrections. The UI currently has no ownership controls or account link.
- `features/featured-farmers/sandeep-dasari.ts:78-95` expressly says Sandeep’s profile is an editorial profile and not a FarmerBook member account or identity-verification claim. Any new account link must preserve this disclosure.

### Existing Featured Farmer database feature

- `supabase/migrations/20260825130000_featured_farmer_engagement.sql:4-39` creates `featured_farmer_engagement_subjects`, keyed by the editorial slug, plus questions and recommendations.
- The seed only includes Sandeep (`sandeep-dasari-avani-van-farms`) and a public email at lines 16-25. It does not record an authenticated profile id.
- `features/featured-farmers/engagement-actions.ts:282-304` is the closest admin-server-action pattern: validate input, require admin, call a `security definer` RPC, and revalidate the public page.
- `features/featured-farmers/engagement-admin.tsx` is a small client component that renders admin decisions. `app/(product)/admin/featured-farmer-engagement/page.tsx` provides a protected admin route pattern.

## Implications and constraints

1. A Google/Gmail sign-in yields an Auth user and a `profiles` row after onboarding; it does not safely identify a Featured Farmer by email/name on its own. Automatic matching could attach the wrong person with the same name or a changed email.
2. An administrator must approve the link after reviewing the account. The link should store the account id, actor/admin id, decision time, and a short evidence note.
3. The database relation should be keyed by the stable editorial slug and `profiles.id`, not by public email. Email should only be a searchable admin aid and must not be exposed in the public page.
4. A unique constraint on the account id prevents one account being silently linked to multiple featured profiles. A unique slug allows one owner per curated profile.
5. The record needs an unlink/revoke path. Admin action history should retain the prior link and the admin note.
6. The public page may display a factual, limited bridge such as “Account linked by FarmerBook on [date]” only if we want it. It must not say “verified farmer,” “certified,” or imply endorsement. The safer initial UX is an account-owner action available only in the account and a small neutral public “Official FarmerBook account” link when the linked account’s public profile is enabled.
7. Sandeep cannot be linked solely from the public email in the editorial profile. The app must look up the existing `profiles` record through an admin-only query/RPC and only link it after the admin selects the intended account.
8. A newly signing-in Subbarao must complete onboarding and have an active Farmer account before being eligible for selection; otherwise no linked public account page exists.

## Recommended design

Create a dedicated relationship table rather than adding an optional column to `profiles` or changing the static snapshot:

```text
featured_farmer_account_links
  featured_farmer_slug text primary key
  profile_id uuid unique references public.profiles(id)
  linked_by uuid references auth.users(id)
  linked_at timestamptz
  evidence_note text
  unlinked_by uuid nullable
  unlinked_at timestamptz nullable
  unlink_note text nullable
```

Use `security definer` RPCs for:

- admin account search by email/name/handle, returning only the minimum selection fields;
- link a slug to an active, onboarded Farmer account after validating the selected profile;
- unlink the current relationship while recording an audit event;
- public read of a linked account’s handle/name only when that account is active and `public_profile_enabled`.

The existing static curation continues to own editorial claims and content. The database link augments it at read time, preserving the static source model and avoiding a content migration.

## Sandeep status

The repository proves only that Sandeep has a curated Featured Farmer slug and a configured engagement subject. It does not expose a safe authenticated account id in source control. The required admin search/selection step is therefore necessary to identify the already-registered account in production without guessing from email or name.

## Tests required

- SQL: admin-only search and link/unlink behavior; active/onboarded Farmer role enforcement; unique link constraints; public RPC redaction; audit history.
- TypeScript: schema parsing of linked public-account data; server action validation; public profile renders a neutral account link only when returned by the read model.
- Regression: existing Featured Farmer profiles retain their editorial disclosure and render correctly without a link.

## Rollback

The migration is additive. Unlinking removes public association without deleting the editorial profile or the real account. A deployment rollback can stop consuming the new read model while the relationship data remains intact for later repair.

## Featured Farmer research: Sukhavasi Hari Babu (2026-08-28)

### Requested profile

- YouTube channel: https://www.youtube.com/@naturalfarmingharibabu-liv6281
- Resolved channel ID: `UCpHx_OmwzR6FyypYba-Xz-Q`.
- Channel title: `Natural Farming Hari Babu - Live Village Life`.
- The channel description identifies the creator as Sukhavasi Hari Babu, also using the name Hari Babu Org Farming, and says the channel shares the benefits of high-density natural and organic farming.
- The channel page observed during research displayed approximately 20.6K subscribers. This is a time-sensitive platform metric, not a permanent editorial fact.

### Independent and institutional corroboration

- ICAR–NAARM's 115th FoCARS report identifies Sri Hari Babu Sukhavasi as a progressive natural farmer from Telangana and records his participation in a natural and organic farming interaction at Rajendranagar, Hyderabad, on 23 August 2025. It describes his discussion of soil microbial activity, soil organic carbon, fertility, productivity, high-density planting and cow-based farming systems.
  Source: https://naarm.org.in/wp-content/uploads/2025/08/New-item-August-23-2025-115-FoCARS.pdf
- MANAGE's farmer success-story publication describes Hari Babu's integrated farming system, including a 10-acre farm near Hyderabad, high-density planting, fruit and medicinal plants, six cows, Jeevamrutham made from dung and urine, and more than 300 hens. These are reported claims from the publication and are not a current FarmerBook inspection.
  Source: https://www.manage.gov.in/publications/Success%20Stories%20-%20Farmers%20.pdf
- ICFRE's National Database of SLEM Practitioners lists Mr. Hari Babu in Jubilee Hills, Hyderabad, with integrated farming practice and a similar cow-based Jeevamrutham description. The database entry is corroboration but does not independently prove it is the same person as the channel owner.
  Source: https://nrdp.icfre.gov.in/national-database-slem-practitioners/
- A 2018 HMTV report describes a high-density fruit-growing farm associated with Hari Babu. It is supplementary third-party coverage, not the primary basis for identity.
  Source: https://www.hmtvlive.com/hmtv-agri/high-density-farming-in-10-acres-farmer-hari-babu-success-story--24610

### Work documented across the sources

- High-density natural and organic farming, with a food-forest and horticulture orientation.
- Integrated farming that connects fruit and medicinal plants with livestock-based biological inputs.
- Cow-based Jeevamrutham and related natural-farming inputs.
- Soil-health focus: microbial activity, organic carbon, fertility and productivity.
- Biodiversity and horticulture: fruit, forest, medicinal and exotic plant varieties are repeatedly shown or described.
- Farmer education and public knowledge-sharing through the YouTube channel and public interactions.

### YouTube videos selected for the page

The following are the highest-view videos located through current public YouTube search results for this channel and subject. Counts were observed on 2026-08-28 and may change; this is a curated high-view list rather than a guaranteed complete all-time ranking.

1. `Hari babu created a food forest within 7 yrs||hari babu ||natural farming` — https://www.youtube.com/watch?v=rOgz9dLGQLo — 363,382 views observed.
2. `Star fruit||China guava||avocado ||jackfruit ||Hari Babu ||Organic ||natural` — https://www.youtube.com/watch?v=iX2_0hzgTNQ — 155,390 views observed.
3. `Farmers can sustain only by natural farming ||hari babu ||natural farming` — https://www.youtube.com/watch?v=OrDPouEJpv4 — 16,777 views observed.
4. `This Miyawaki food forest is my dream project||hari babu ||natural farming` — https://www.youtube.com/watch?v=Z0lXn6VA97w — 10,266 views observed.
5. `My experiences with Revenue dept||Hari Babu ||Organic ||Natural` — https://www.youtube.com/watch?v=yoSSmvNw32w — 8,979 views observed.

Additional related videos found during research include `one hundred varieties of fruits...` (6,587 views observed), `Food forest model is better than five layer model...` (5,677), `How to create food forest` (3,942), and `Wood chips is one of the natural farming method` (7,944). They are useful discovery evidence but are not all included in the initial five-card page.

### Editorial guardrails

- Use `Hari Babu` or `Sukhavasi Hari Babu`; do not infer a legal organization named Hari Babu Org Farming.
- Use Telangana as the state. Keep the exact farm address and exact district unset in the static profile because public sources are inconsistent or insufficiently explicit.
- Attribute farm-size, animal-count, no-chemical, crop-count, and input claims to MANAGE, ICFRE, ICAR–NAARM, or Hari Babu's public videos; do not present them as FarmerBook inspection findings.
- Do not use medical, guaranteed yield, guaranteed income, certification, marketplace, or identity-verification language.
- Keep the five videos in descending observed view order and show the observation date in the video title/source label so users understand that YouTube counts change.

## Featured Farmer research: Sravana Lakshmi / Sravana Megham (2026-08-30)

### Public identity and channel

- YouTube channel: https://www.youtube.com/@sravanamegham
- Resolved channel ID: `UCFgjgAfhzpmI5FlHqumbjBw`.
- Channel title: `శ్రావణ మేఘం / Sravana Megham`.
- The public channel description identifies the creator as Sravana Lakshmi. She describes her love of nature and Telugu traditions, opposition to tree cutting and chemically grown food, and a goal of sharing practical work through videos that offer knowledge, entertainment or a moment of rest.
- Public channel metrics observed on 2026-08-30 were approximately 246K subscribers, 523 videos and 232M views. These platform counters are time-sensitive and are not used as permanent impact claims.
- Public contact supplied in the channel description: `sravanisworld2709@gmail.com`.

### Sravana Vedham first-party source

- Website: https://sravanavedham.com/
- The website presents Sravana Vedham Natural Products as a farm-direct brand from Martur village, Guntur, and describes traditional Eddu Ganuga, a bullock-powered wooden press, as the method used for its oils.
- The founder section identifies Sravani as “Farmer & Founder” and says she wanted to live close to nature, grow food for her family, avoid factory-machine-pressed oils, and make traditional food available to other families.
- Founder photograph supplied for the FarmerBook profile: Sravani seated beside a bullock-powered Eddu Ganuga wooden press. It is stored as the permitted profile asset at `/images/featured-farmers/sravana-lakshmi-founder.png`, with the Sravana Vedham website retained as the source reference.
- Public location/contact text on the website: Chilakaluripeta, Guntur District, Andhra Pradesh; phone `+91 7293199999`. The website email is malformed, so it is not used. FarmerBook uses the public YouTube-description email supplied above for the editorial contact field.

### Products listed on Sravana Vedham

The following catalogue is reproduced as a reported, non-transactional product list from the public website observed on 2026-08-30. Prices, pack sizes, stock, delivery, certification and registration status are not independently confirmed by FarmerBook.

1. Palli Oil / Eddhu Ganuga Nune — bull-churned cold-pressed groundnut oil; ₹305; 500ml, 1 Litre, 2 Litres, 5 Litres, 10 Litres, 15 Litres.
2. Verri Nuvvula Nune / Eddhu Ganuga Nune — bull-churned cold-pressed niger seed oil; ₹1,640; 500ml, 1 Litre, 2 Litres, 5 Litres, 10 Litres, 15 Litres.
3. Kuridi Kobbari Eddhu Ganuga Nune — bull-churned cold-pressed coconut oil; ₹630; 500ml, 1 Litre, 2 Litres, 5 Litres, 10 Litres, 15 Litres.
4. Nuvvu Pappu Nune / Eddhu Ganuga Nune — bull-churned cold-pressed white sesame oil; ₹505; 500ml, 1 Litre, 2 Litres, 5 Litres, 10 Litres, 15 Litres.
5. Amudham Nune / Eddhu Ganuga Nune — bull-churned cold-pressed castor oil; ₹405; 500ml, 1 Litre, 2 Litres, 5 Litres, 10 Litres, 15 Litres.
6. Nalla Nuvvula Nune / Eddhu Ganuga Nune — bull-churned cold-pressed black sesame oil; ₹405; 500ml, 1 Litre, 2 Litres, 5 Litres, 10 Litres, 15 Litres.
7. Badham Nune / Eddhu Ganuga Nune — bull-churned cold-pressed almond oil; ₹500; 100ml, 250ml, 500ml, 1 Litre.
8. Kusuma Nune / Eddhu Ganuga Nune — bull-churned cold-pressed safflower oil; ₹505; 500ml, 1 Litre, 2 Litres, 5 Litres, 10 Litres, 15 Litres.
9. Aava Nune / Eddhu Ganuga Nune — bull-churned cold-pressed mustard oil; ₹505; 500ml, 1 Litre, 2 Litres, 5 Litres, 10 Litres, 15 Litres.
10. Avisa Nune / Eddhu Ganuga Nune — bull-churned cold-pressed flaxseed oil; ₹750; 500ml, 1 Litre, 2 Litres, 5 Litres, 10 Litres, 15 Litres.
11. Sprouted Ragi Flour — ₹200; 1kg.
12. Sprouted Jonna Flour — ₹220; 1kg.
13. Sprouted Sajja Flour — ₹200; 1kg.
14. Sprouted Wheat Flour — ₹200; 1kg.
15. Avisa Laddu / అవిసె లడ్డు — ₹650; 1kg.
16. Organic Jaggery — ₹100; 500g, 1kg.

### YouTube coverage used for the profile

The page links the owned channel and a curated selection of recent public videos showing themes such as vegetable seeds, garden produce, cows, jasmine garlands, traditional cooking and quiet farm routines. These links support the profile’s description of public knowledge-sharing; they do not establish certification, current inventory or guaranteed farming outcomes.

### Editorial guardrails

- Use Sravana Lakshmi / Sravani as the public name; do not infer a legal company or unverified personal details.
- Use Guntur district and Andhra Pradesh based on the Sravana Vedham website. Do not present a more precise farm address as a FarmerBook finding.
- Label the 16 items as reported products sourced from Sravana Vedham. Do not add order buttons, marketplace listings, certification, current stock or delivery promises.
- Keep website prices and pack sizes visibly attributed to the source and subject to change.
- Preserve the source-hosted founder photograph with explicit attribution and link it back to Sravana Vedham.

## Google-managed website-greeter canary audit (2026-09-05)

### Existing request and control flow

The public browser posts a bounded request to `worker/index.ts:72-105`, which
forwards it to the singleton `WebsiteGreetingAgent`. The Durable Object answers
fixed FAQ intents before inference (`features/website-greeter/agent.ts:446-454`),
loads consented and redacted history only when the visitor opts in
(`features/website-greeter/agent.ts:464-480`), reserves the local monthly cost
before yielding (`features/website-greeter/agent.ts:490-514`), and selects either
the Google or Cloudflare provider. Google failures attempt the existing budgeted
Cloudflare path (`features/website-greeter/provider.server.ts:198-207`). The
central code-reviewed ceilings remain USD 20 for the application, USD 10 for the
active fleet, and USD 5 for website greeting
(`features/ai-budget/contracts.ts:40-53`). Google budget alerts remain advisory
and cannot account for all Agent Runtime idle/session charges.

### P0 defects found

1. The Google REST body uses `classMethod` in
   `features/website-greeter/google-provider.server.ts:250-291`, while Google's
   current Agent Platform REST examples require `class_method`. Existing mocked
   tests assert the incorrect wire shape, so the live API would reject it.
2. `surface` is accepted from the browser in
   `features/website-greeter/contracts.ts:7-14` and trusted for provider routing
   at `features/website-greeter/provider.server.ts:237-255`. Provider eligibility
   must instead be selected by the server from distinct API paths.
3. Streaming response parsing overwrites prior content at
   `features/website-greeter/google-provider.server.ts:193-227`; partial ADK
   chunks can therefore return only the final fragment. Final non-partial
   content should win when present, otherwise partial chunks must be joined.
4. The Google service is a skeleton rather than a deployable artifact:
   `services/google-website-greeter/agents-cli-manifest.yaml:1-5` explicitly
   selects no target, dependencies are not locked, and there is no create/update
   script that emits and validates the resulting reasoning-engine resource.
5. The configured `systemPrompt` is not included in the ADK invocation at
   `features/website-greeter/google-contract.ts:88-109`, so the deployed agent
   misses the application's complete approved facts and contact data.
6. The `GOOGLE_IDENTITY_BROKER` is only an interface and service-binding
   reference (`features/website-greeter/google-provider.server.ts:29-40` and
   `vite.config.ts:24-37`). A Cloudflare service binding authenticates one Worker
   to another but does not mint an external OIDC assertion for Google WIF. A
   real production broker therefore still needs an explicitly provisioned
   assertion source, STS exchange, IAM Credentials impersonation and strict
   audience/account/scope allowlists. No service-account key is acceptable.

### Current Google contract and deployment facts

- Google Agent Platform documents `client.agent_engines.create` for an ADK
  `AdkApp`, with pinned requirements, extra local packages, Agent Identity,
  `min_instances=0`, and the returned `reasoningEngines/{id}` resource.
- The ADK REST wire format is `:query`/`:streamQuery?alt=sse` with snake-case
  `class_method` values including `async_create_session`,
  `async_stream_query`, and `async_delete_session`.
- Workload Identity Federation replaces service-account keys only when the
  external workload has a verifiable ambient OIDC, SAML, X.509, AWS, or Azure
  credential. Service-account impersonation then produces a short-lived access
  token. A fictional ambient identity is not a deployable security boundary.
- Agent Runtime is available in `asia-south1`, but the current Gemini 3.5 Flash
  PayGo documentation lists `global`, `us`, and `eu` for standard PayGo. The
  canary must use a reviewed compatible runtime/model location and must not
  silently fall into provisioned throughput. `gemini-3.5-flash` is the current
  GA balanced Flash model and no Pro escalation is needed for this purpose-
  limited, tool-free public greeter.
- The personal Google console is signed in to project
  `core-song-507701-f6` (`Farmerbook AI`) and shows no Agent Runtime deployment.
  The local gcloud installation is authenticated only as the corporate account
  `ngonapa@splunkcloud.com` against `lab1-env-716`; it cannot inspect or mutate
  the Farmerbook project without a separate user login. Per the task boundary,
  no sensitive verification or credential handoff is attempted.

### Automation-roadmap inventory

The repository already contains independently governed workstreams for Featured
Farmer editorial profiles, Blog drafting/publication, consent-first outreach,
owned social publishing, and the centralized AI budget. Historical production
records in `implementation-log.md` show daily/standing-policy caps, human review
and verification, provider idempotency, and paused/default-off connector gates.
These must remain separate from the public greeter canary. A future daily
Featured Farmer workflow should produce a source packet and draft, stop for
review when citations, consent, media rights, or native-language checks are
missing, and publish only after the existing exact-scope approval and
independent rendered verification. Outreach must remain consented and must not
be inferred from public contact data. Visitor growth may draft owned-channel
copy and analyze aggregate metrics, but may not advertise, DM, scrape, or spend.

## Google Memory Bank consent and deletion addendum (2026-09-05)

### Live canary state and approved boundary

- The exact existing private runtime is
  `projects/659765383594/locations/us-central1/reasoningEngines/2785816668377448448`.
  Its live `v1beta1` resource has `contextSpec.memoryBankConfig.generationConfig={}`,
  no etag, and no stored memories. Because it was created after 2026-06-29,
  that empty configuration inherits `gemini-3.5-flash`, `text-embedding-005`,
  no memory TTL, and a 365-day revision TTL.
- Project-scoped Model Garden GETs returned successfully for the approved
  `gemini-2.5-flash-lite` generation model and
  `text-multilingual-embedding-002` similarity model in `us-central1`.
  The exact pair is the least-cost multilingual-compatible pair found during
  preflight. The product owner accepted the model's 2026-10-20 retirement date.
- The approved update is config-only. It must patch only
  `contextSpec.memoryBankConfig` on the exact resource. Runtime source,
  deployment revision, scaling, environment, identity, traffic, billing, IAM,
  and optional telemetry remain unchanged.

### Memory REST flow

Google's `v1beta1` Reasoning Engine child-resource API exposes:

```text
POST   /v1beta1/{reasoningEngine}/memories:retrieve
POST   /v1beta1/{reasoningEngine}/memories:generate
DELETE /v1beta1/{reasoningEngine}/memories/{memory}
```

`RetrieveMemories` requires an exact scope map. `GenerateMemories` accepts
bounded direct conversation events and the same exact scope. A generated
memory can otherwise contain personal data even when model extraction is
instructed to avoid it, so application consent, redaction, TTL, and deletion
must be primary controls rather than relying on model filtering.

The approved instance configuration is:

```json
{
  "generationConfig": {
    "model": "projects/core-song-507701-f6/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite"
  },
  "similaritySearchConfig": {
    "embeddingModel": "projects/core-song-507701-f6/locations/us-central1/publishers/google/models/text-multilingual-embedding-002"
  },
  "ttlConfig": { "defaultTtl": "86400s" },
  "disableMemoryRevisions": true
}
```

### Existing application hooks and privacy implications

- `components/website-greeting-agent.tsx:245-252` already sends the same-origin
  `DELETE` request when a visitor disables context. The Worker validates a
  strict UUID body and calls `WebsiteGreetingAgent.clearConversation`.
- `features/website-greeter/agent.ts:158-177` already persists a server-only
  `provider_session_id` in the Durable Object conversation row. It is currently
  unused and can hold a randomly generated provider memory scope without a
  database migration or browser exposure.
- The browser's anonymous session UUID must never be sent to Memory Bank as a
  scope. The Durable Object should generate an independent random opaque scope,
  persist only the mapping, and pass that scope to the server-only Google
  transport when consent is active.
- `features/website-greeter/conversation.ts` already defines a versioned consent
  contract, 24-hour retention, eight-turn maximum, 2,400-character total, and
  redaction of email addresses, phone numbers, and URLs. Only this redacted,
  bounded material may be used to generate memories.
- `features/website-greeter/google-provider.server.ts` already owns broker-token
  acquisition and request-scoped Agent Engine session deletion. Memory retrieval
  belongs before the one-turn query; background memory generation belongs only
  after a safe reply and confirmed session deletion; consent withdrawal must
  retrieve the exact opaque scope and delete every returned memory before the
  local scope mapping is removed.
- The default launcher and the `/chat` canary routing/fallback logic in
  `features/website-greeter/provider.server.ts` must remain unchanged. A missing
  scope or false consent performs no Memory Bank request.

### Verification requirements

- Unit tests must prove no memory calls without consent, different opaque scope
  values cannot retrieve each other's memories, generation receives only
  bounded/redacted events, and deletion enumerates and deletes only the exact
  scope.
- Local tests must preserve the existing Google session cleanup and Cloudflare
  fallback behavior.
- The live test must use one synthetic, non-personal fact, retrieve it only by a
  one-time opaque scope, delete it, and list/retrieve again to prove that no
  disposable memory or session remains.

## Memory Bank operator-utility corrective audit (2026-09-06)

The first live configuration attempt exposed defects in the local operator
utility before any accepted mutation occurred. The authoritative resource name
returned by Google is the numeric canonical name
`projects/659765383594/locations/us-central1/reasoningEngines/2785816668377448448`;
the project-ID form is only a verified input alias. The utility incorrectly
addressed Reasoning Engine and operation endpoints under `v1`, even though the
approved contract and child Memory APIs are `v1beta1`.

The pre/post invariant hash also removed the entire `contextSpec`. That could
hide changes to context siblings unrelated to Memory Bank. A safe comparison
may remove only `contextSpec.memoryBankConfig` plus known server metadata such
as `etag` and `updateTime`; every other `contextSpec` member remains protected.
Optional telemetry and content-capture controls must be asserted absent or
explicitly false before and after the update, but must not be added to the
narrow PATCH body.

The rejected live PATCH returned `INVALID_ARGUMENT` because
`gemini-2.5-flash-lite` was not accepted and the API requested
`gemini-3.5-flash`. The approved no-substitution rule was followed: no fallback
model was selected, `updateTime` and the protected resource fingerprint stayed
unchanged, and zero memories and sessions remained. The model rejection is an
external approval gate, not a reason to broaden this corrective code task.

HTTP-level contract tests are required for the exact GET, PATCH, operation poll,
and read-back requests. A separate live-smoke program must default to dry-run,
use a unique non-personal scope, wait for generation and deletion operations,
poll bounded retrieval, and run fail-closed cleanup in `finally` until the exact
scope is empty. If it creates a disposable Agent Engine session, it must delete
the session, wait for any deletion operation, and confirm absence. This audit
authorizes local code, tests, and documentation only; it does not authorize a
Google Cloud request or mutation.

## Authenticated locale switching audit (2026-09-07)

- The root `LocaleProvider` treated the server-supplied locale and messages as
  immutable props. `LanguageSelector` changed only its own optimistic `<select>`
  value, saved the cookie/profile preference, and waited for `router.refresh()`;
  mounted client components therefore kept rendering the previous catalog.
- The selector exposes all 23 entries in `SUPPORTED_LOCALES` when extended
  locales are enabled, so switching behavior and authenticated-interface copy
  must cover that same registry rather than a hand-maintained subset.
- `AppShell` reads `navigation`, but most extended catalogs intentionally point
  that namespace at English. The Network and Discover routes additionally own
  hard-coded English headings, filters, status text, and follow actions.
- Safe persistence already exists in `saveLocalePreferenceAction`: it validates
  against the locale registry, writes a one-year cookie, and attempts profile
  synchronization. The client must update immediately, retain `router.refresh()`
  for server components, and roll back if cookie persistence fails.
- Names, handles, bios, crop names, districts, and states are profile-supplied
  data and should remain verbatim. Shell labels, headings, tabs, role labels,
  actions, errors, and accessibility labels are application copy and must come
  from the selected locale.
