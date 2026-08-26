# FarmerBook implementation research

## Scope and repository state

FarmerBook is a greenfield responsive social application for a controlled agricultural pilot. At the start of implementation, the repository contains only the product summary in `README.md`, the living execution plan in `PLAN.md`, and the end-to-end product design in `docs/MVP_PRODUCT_DESIGN.md`. There is no legacy application surface or compatibility contract.

The approved MVP is deliberately bounded: authenticated participants create profiles, publish one-image posts, discover and follow people, exchange one-to-one text messages, block or report unsafe activity, and use a small moderation area. The primary experience is an ordinary Android phone browser.

## Existing design anchors

- `README.md:3-14` defines the product and states that code had not been generated.
- `PLAN.md:13-30` defines the observable outcome and milestone checklist.
- `PLAN.md:102-124` fixes the initial route map, database entities, and source layout.
- `PLAN.md:138-238` specifies the milestone-by-milestone implementation behavior and acceptance tests.
- `docs/MVP_PRODUCT_DESIGN.md:72-109` separates required MVP behavior from deferred scope.
- `docs/MVP_PRODUCT_DESIGN.md:111-149` defines navigation and routes.
- `docs/MVP_PRODUCT_DESIGN.md:151-229` defines the six critical user journeys.
- `docs/MVP_PRODUCT_DESIGN.md:235-253` defines the visual tokens and mobile-first constraints.
- `docs/MVP_PRODUCT_DESIGN.md:450-463` defines the release gates.

## Current framework findings

The current official Next.js 16 documentation and official Supabase example use `proxy.ts` for request interception. The proxy creates a response, passes request cookies into `createServerClient`, copies every refreshed cookie back to the response, validates identity, and redirects unauthenticated users away from protected routes. The cookie API is asynchronous in server code:

    const cookieStore = await cookies()

    const supabase = createServerClient(url, publishableKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (items) => items.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)),
      },
    })

Server Actions are the natural write boundary for forms. Each action validates `FormData` with Zod, verifies the acting user on the server, performs the smallest database mutation, and returns a serializable field/message state or redirects after success. Route handlers remain appropriate for authentication callbacks and upload or administration endpoints that need an HTTP method boundary.

The project will retain App Router semantics while using the Sites-compatible Vinext build adapter. The compatibility layer supplies Next.js App Router behavior and produces a Cloudflare Worker-compatible ESM bundle. The application must avoid Node-only runtime assumptions in route code.

## Authentication and authorization findings

`@supabase/ssr` is the current cookie-based browser/server integration. Browser code uses `createBrowserClient`; server code uses `createServerClient`. Authorization code must not trust `getSession()` because it reads unverified cookie state. It must use `getClaims()` for validated JWT claims or `getUser()` when the freshest server-verified account record is required. FarmerBook uses `getUser()` in the central `requireUser()` and proxy checks because suspension and deletion must take effect promptly.

The protected flow is:

    Browser request
      -> src/proxy.ts refreshes/validates the auth user
      -> protected server page calls requireUser()
      -> feature query executes with the user's Supabase client
      -> PostgreSQL RLS independently enforces row access

The service-role key bypasses Row Level Security and therefore stays server-only. Only an already-authorized administrator action may create that client.

## Database and storage findings

Supabase Row Level Security remains the correct defense boundary for direct browser API access. The current official policy pattern scopes each operation independently:

    create policy "owner inserts"
    on public.posts for insert to authenticated
    with check ((select auth.uid()) = author_id);

    create policy "owner updates"
    on public.posts for update to authenticated
    using ((select auth.uid()) = author_id)
    with check ((select auth.uid()) = author_id);

Storage policies can constrain the first folder segment to the authenticated user:

    bucket_id = 'post-images'
    and (select auth.uid()::text) = (storage.foldername(name))[1]

Tables need separate `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies; broad `FOR ALL` policies make ownership review harder. Complex block visibility and conversation membership use small `security definer` helper functions with an empty `search_path` to avoid recursive RLS queries.

The transactional `get_or_create_direct_conversation(other_user_id uuid)` function sorts the two user IDs, stores a canonical pair with a unique constraint, and returns the same conversation for repeated requests. Unique composite keys also make follows, blocks, and helpful reactions idempotent.

## User-interface architecture

The public landing and policy pages are server-rendered. Authenticated product pages share a responsive shell with a desktop rail and mobile bottom navigation. Feature code is grouped by domain under `src/features`, while reusable visual primitives live under `src/components/ui`.

The interface follows the design document's practical, trusted visual language: warm off-white surfaces, forest and leaf greens, harvest amber used sparingly, high-contrast charcoal text, 44-pixel controls, clear focus rings, and little animation. Realistic pilot data is used in demo/preview states so every route communicates the intended finished product before a backend is connected.

## Testing and operational approach

Vitest covers schemas and pure policy helpers. Testing Library covers interactive client components. Playwright covers the core two-user journey once Supabase test credentials exist. SQL authorization tests run against a local Supabase stack or a dedicated development project. The common `npm run check` command runs lint, type checking, unit tests, and the production build.

The project must remain usable without secrets for visual review and automated compilation. Missing Supabase configuration shows an actionable setup state; it must never silently point to a production project or expose a secret. Real authentication, writes, images, and RLS testing become active when the three documented environment values are supplied.

## Risks and decisions carried into implementation

- Email/password remains the approved prototype authentication method, but five farmer interviews must validate it before a live pilot.
- Localized interface copy cannot be completed responsibly until the pilot language is chosen. The implementation provides English plus a Hindi starter dictionary and keeps the language boundary replaceable.
- A complete production pilot cannot be opened from code alone. It still requires Supabase project configuration, transactional email, a moderator, legal review, backup restore proof, and usability evidence.
- The Sites starter's built-in D1 and ChatGPT-auth options are not substituted for Supabase because the approved product requires farmer-controlled public email accounts and database-level RLS. The deployment adapter is reused; the backend decision remains Supabase.

## Research checkpoint

The repository has no conflicting implementation. The architecture, source boundaries, identity model, current framework APIs, database enforcement, visual language, and validation strategy are sufficiently explicit to execute the user-approved `PLAN.md`.

## 2026-07-31 change research: three marketplace segments, social identity, OAuth, and reviews

### Requested outcome and bounded interpretation

The requested change introduces three primary account segments:

- **Farmer** — creates a farm identity, chooses a farming method, publishes produce, receives customer connections, and receives purchase reviews.
- **Customer** — discovers produce, connects with a farmer or wholesaler, continues the conversation in FarmerBook, and reviews a completed purchase.
- **Wholesaler** — creates a supplier identity, publishes produce in bulk, receives customer connections, and receives purchase reviews.

“Social media” is interpreted as two complementary capabilities: the existing FarmerBook feed/follow/message network remains available to all three roles, and profiles gain verified-looking outbound fields for a website, LinkedIn, Instagram, Facebook, and YouTube. This plan does not attempt to publish posts into third-party social networks.

“Buy” is interpreted as an authenticated connection, enquiry, direct conversation, and seller-confirmed completed purchase. Online payment collection, a shopping cart, delivery logistics, refunds, and escrow remain outside this change. This boundary matches the current no-commission, direct-relationship product language in `app/page.tsx:47-56` and `app/page.tsx:128-133`.

### Existing identity and authorization model

`lib/types.ts:1-7` defines six legacy participant types (`farmer`, `agronomist`, `fpo`, `buyer`, `trainer`, and `ngo`). `lib/types.ts:11-30` and `lib/data-mappers.ts:6-28` expose that value as the profile's primary role. Replacing the column in place would mix a community profession taxonomy with the new marketplace authorization taxonomy and would make rollback unnecessarily difficult.

The safe additive model is a new canonical `account_role` with exactly:

    farmer | customer | wholesaler

The existing `participant_type` column remains temporarily as legacy compatibility data. Existing rows can be conservatively backfilled:

    farmer -> farmer
    fpo -> wholesaler
    buyer, agronomist, trainer, ngo -> customer

The last mapping deliberately gives ambiguous legacy accounts the least-privileged marketplace role. They can participate in the community but cannot create listings until their role is corrected through an administrator-approved future workflow.

`features/auth/require-user.ts:6-16` currently omits any role from `ActiveUser`, and its configured query at `features/auth/require-user.ts:43-47` selects only identity, status, and onboarding state. Marketplace actions therefore cannot make a centralized role decision. `accountRole` must be returned by this helper, while PostgreSQL RLS independently repeats the authorization check.

The current authentication trigger in `supabase/migrations/20260729160000_initial_farmerbook.sql:268-290` creates a minimal incomplete profile for every new Supabase identity. This works for email, Google, and LinkedIn accounts because role selection remains in onboarding rather than being trusted from OAuth metadata.

### Existing onboarding and profile gaps

`features/profiles/schemas.ts:12-29` accepts the old six roles and requires at least one crop for every type. `features/profiles/onboarding-form.tsx:89-108` renders those roles in one select, while `features/profiles/onboarding-form.tsx:148-173` requires primary crops regardless of whether the account is a grower or buyer.

The new form needs role-aware validation:

- Farmer: at least one crop and one farming method.
- Customer: crop interests are optional; farming method is not applicable.
- Wholesaler: at least one produce category; farming method is not applicable.

The farming-method vocabulary should be `organic`, `natural`, `conventional`, or `mixed`. Organic and Natural appear as the prominent choices requested by the user; Conventional and Mixed prevent excluding farms that do not fit those labels.

`features/profiles/profile-settings-form.tsx:47-177` edits general profile data but has no role-specific fields or social links. The role should be selected during initial onboarding and shown read-only after completion in this MVP. Social URLs and the farmer's method remain editable. Role immutability after onboarding must be enforced in the database, not only by hiding a select.

The public profile query projection in `features/profiles/queries.ts:13` and the mapper in `lib/data-mappers.ts:54-85` must include `account_role`, `farming_method`, and the social URL columns. Public seller-profile column grants in `supabase/migrations/20260730120000_marketplace_growth.sql:173-176` also need the new non-sensitive fields. Customer contact details remain private.

### Existing OAuth flow and current Supabase requirements

`features/auth/actions.ts:12-64` supports email/password signup and login only. `app/login/page.tsx:17-57` and `app/signup/page.tsx:17-77` have no OAuth controls. The callback already performs the PKCE code exchange in `app/auth/callback/route.ts:5-20`, but it accepts an unvalidated `next` value. A safe callback must accept only a single-origin relative path and reject protocol-relative values such as `//host`.

Current official Supabase documentation confirms:

- Server-side `signInWithOAuth()` returns a provider URL that the framework must redirect to.
- Google uses provider `"google"`.
- LinkedIn's current OIDC provider name is `"linkedin_oidc"`.
- `options.redirectTo` must point to the application callback and be present in the Supabase redirect allow list.
- The callback exchanges `code` with `exchangeCodeForSession(code)`.

The relevant current official sources are:

- Supabase PKCE callback and server OAuth flow: `apps/docs/content/_partials/oauth_pkce_flow.mdx`
- Google setup: `apps/docs/content/guides/auth/social-login/auth-google.mdx`
- LinkedIn OIDC setup: `apps/docs/content/guides/auth/social-login/auth-linkedin.mdx`

OAuth cannot become operational from repository code alone. The Supabase dashboard needs both providers enabled. Google and LinkedIn developer consoles must use the Supabase project callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`), while Supabase Authentication URL Configuration must allow the application callbacks for localhost, the temporary Worker URL if it remains in use, and `https://farmerbook.in/auth/callback`. `NEXT_PUBLIC_SITE_URL` in `.env.example:8-9` must be `https://farmerbook.in` in production.

### Existing marketplace and connection flow

The marketplace schema in `supabase/migrations/20260730120000_marketplace_growth.sql:6-50` has `produce_listings.farmer_id` and unowned contact-form enquiries. The field name is farmer-specific, but renaming it now would make an application rollback incompatible. It can remain the physical compatibility column while TypeScript and UI expose `sellerId` and `seller`.

The current listing policy at `supabase/migrations/20260730120000_marketplace_growth.sql:120-130` checks ownership and account activity but does not verify that the profile is a farmer. Any active account can currently create a listing by calling the database directly. The replacement policy must require `profiles.account_role in ('farmer', 'wholesaler')`.

`features/marketplace/actions.ts:13-60` has the same gap in its server action. `features/marketplace/queries.ts:22-113` and `lib/types.ts:88-114` call every seller a farmer. The marketplace client in `features/marketplace/market-browser.tsx:24-91` filters crop, district, and order size only. It needs seller-role and farming-method filters, and all seller language must be neutral.

`features/marketplace/actions.ts:86-114` currently inserts an enquiry without an authenticated buyer ID. `features/marketplace/inquiry-form.tsx:43-52` promises an eventual response only by phone or email. The database already has the correct direct-message primitive: `get_or_create_direct_conversation()` in `supabase/migrations/20260729160000_initial_farmerbook.sql:292-337`, called by `features/messages/actions.ts:8-34`.

The additive connection model is:

- Add nullable `buyer_id` and `conversation_id` to `market_enquiries`.
- Preserve legacy anonymous enquiries; they remain private seller leads and cannot create reviews.
- For an authenticated Customer, validate the listing and roles, reuse/create the direct conversation, insert the linked enquiry, and return the conversation ID.
- Let the customer see their own linked enquiries; let the seller see enquiries for their listings.
- Treat the existing seller status `won` as a completed off-platform purchase in the UI. Only that state unlocks a review.

This keeps the public lead-generation behavior working while giving registered customers a traceable purchase path.

### Review integrity and privacy

There is no current review model. A new `market_reviews` table needs:

    id, enquiry_id, listing_id, reviewer_id, seller_id,
    rating, body, status, created_at, updated_at

Important invariants:

- `rating` is 1–5 and review text is bounded.
- `enquiry_id` is unique, so one completed connection yields at most one review.
- The reviewer must be the enquiry's authenticated `buyer_id`.
- The review's seller and listing must match that enquiry.
- The enquiry must be `won`.
- The reviewer must have `account_role = 'customer'`.
- The seller must have `account_role in ('farmer', 'wholesaler')`.
- Sellers cannot create, edit, or remove customer reviews.
- Customers can update or delete only their own review.
- Only active reviews contribute to averages.

Anonymous storefronts should display the rating, review text, listing context, and a “Verified purchase” label without exposing buyer contact fields or a public customer profile. Review status supports moderation (`active`, `hidden`, `removed`), and the existing report target vocabulary in `supabase/migrations/20260729160000_initial_farmerbook.sql:122-130` should be extended with `review`.

### Product navigation and user journeys

The current shell in `components/app-shell.tsx:39-54` shows “Grow my business” to every account. The new navigation should be role-aware:

- Farmer/Wholesaler: `Grow my business`
- Customer: `My purchases`

The existing product market page links every account to the seller dashboard at `app/(product)/market/page.tsx:19-23`; that action must also depend on the current role.

The public listing detail in `app/marketplace/[listingId]/page.tsx:123-157` assumes a farmer, has no in-app connection result, and shows no reviews. It should identify a Farmer or Wholesaler, show a farmer's method when applicable, show review summary and verified reviews, and route an authenticated Customer into the linked conversation after the enquiry is created.

The landing page is currently farmer-first (`app/page.tsx:26-56`, `app/page.tsx:138-179`). A concise three-card segment section should explain what Farmers, Customers, and Wholesalers can do without replacing the existing product story.

### Target architecture

    Google / LinkedIn / email
                |
                v
        Supabase Auth + PKCE
                |
                v
       /auth/callback -> onboarding
                |
                v
      profiles.account_role (RLS authority)
        /             |              \
       /              |               \
    Farmer         Customer        Wholesaler
      |               |                |
      +------- seller listings --------+
                      |
             customer connection
                      |
           market_enquiry + conversation
                      |
              seller marks "won"
                      |
              verified market_review
                      |
        profile/store/listing reputation

All writes pass through Zod-validated server actions, but database checks remain the final authority if a client calls Supabase directly.

### Test surface and release dependencies

Current automated validation includes schema tests (`tests/schemas.test.ts:11-110`) and migration-text RLS tests (`tests/rls-migration.test.ts:5-66`). The change needs:

- role-conditional profile schema tests;
- OAuth provider and safe-callback-path unit tests;
- social URL host/protocol validation tests;
- listing authorization and review validation tests;
- migration assertions for RLS on `market_reviews`, seller-only listing creation, private buyer data, and review eligibility;
- component or browser coverage for the three onboarding paths, customer connection, seller completion, and customer review;
- `npm run check` for lint, TypeScript, Vitest, and a production Vinext build;
- a configured Supabase development project for real Google/LinkedIn callback verification and multi-user RLS tests.

Production activation still depends on external configuration: a live Supabase project, Google and LinkedIn OAuth credentials, production redirect allow-list entries, and `NEXT_PUBLIC_SITE_URL=https://farmerbook.in`. The application can continue to demonstrate the flows with local fixture data when those secrets are absent.

### Research checkpoint for this change

The change can be implemented additively without replacing the existing social network or anonymous marketplace. The authoritative role boundary, connection ownership, review eligibility, OAuth callback safety, public-data boundary, demo compatibility, and rollback-safe database approach are sufficiently specified for the implementation plan.

## Optional profile photos and consent-first farmer acquisition (2026-08-03)

### Existing profile-photo architecture

The requested data model already exists and is role-neutral:

- `supabase/migrations/20260729160000_initial_farmerbook.sql:20-38` defines nullable `profiles.avatar_path`; it is not conditioned on `participant_type` or `account_role`, so Farmer, Customer, and Wholesaler accounts can all leave it empty.
- `supabase/migrations/20260729160000_initial_farmerbook.sql:637-679` defines a private `avatars` bucket, a 5 MB limit, JPEG/PNG/WebP MIME types, and owner-folder insert/update/delete policies.
- `features/profiles/uploads.ts:6-41` validates files in the browser, uploads to `<user-id>/avatar-<uuid>.<extension>`, creates a signed URL, and can delete an owned object.
- `features/profiles/actions.ts:53-83` verifies the storage path belongs to the authenticated user before saving it. It currently rejects `undefined`, so a user can replace a photo but cannot clear the optional field.
- `features/profiles/profile-settings-form.tsx:10-45,89-105` exposes replacement after onboarding for every role because the form accepts the shared `FarmerProfile`/`ParticipantProfile` model. Its label says “avatar,” and it has no remove control.
- `features/profiles/onboarding-form.tsx:78-132,141-460` contains the shared three-role onboarding flow but does not expose a profile-photo choice.
- `components/ui.tsx:3-29` already renders initials whenever `imageUrl` is absent, which is the correct optional-photo fallback throughout profiles, posts, messages, listings, and navigation.

Current data flow:

```text
authenticated account (any role)
          |
          v
browser file validation (JPEG/PNG/WebP, <= 5 MB)
          |
          v
private avatars/<user-id>/... object
          |
          v
saveAvatarAction ownership check
          |
          v
nullable profiles.avatar_path -> signed read URL -> Avatar initials fallback
```

The safest additive change is a shared client-side profile-photo field used by both onboarding and settings. It should keep photo writes independent of `saveProfileAction`, so an optional image failure never invalidates the required name/role/location profile fields. Clearing should first set `avatar_path` to null and only then remove the old storage object, preventing a database row from pointing at a deleted object.

### Farmer discovery and consent boundary

YouTube should be a lead-discovery source, not a database to scrape. The official YouTube Data API can search for channel or video resources and retrieve channel metadata, but YouTube's current Developer Policies prohibit scraping YouTube applications and prohibit harvesting or storing identifying information without consent. The API also uses quota controls, so “watch/summarize every video” is both inefficient and policy-risky.

The scalable boundary is:

```text
public source discovery
  YouTube channels / FPOs / KVKs / events / referrals
          |
          v
private lead record (never publicly searchable)
  source URL, crop, district, language, outreach status
          |
          v
permission request via farmer's chosen public contact route
          |
          v
farmer opens one-time claim link, verifies phone/email,
reviews or edits every field, accepts consent notice
          |
          v
FarmerBook profile becomes public
```

Do not copy a creator's profile photo or publish a shadow profile before approval. Store only the minimum lead information needed to make one relevant contact, record the source and consent state, provide deletion/opt-out, and let the farmer supply or explicitly approve the public photo and profile facts. This also aligns the workflow with India's notified Digital Personal Data Protection Rules, 2025, which require specific and informed consent for personal-data processing.

### Acquisition-channel finding

The highest-leverage route is partnership-led, not video-led. Official ICAR directories expose district KVK contacts, SFAC publishes state-wise registered FPO information, and MANAGE describes agri-input dealers and trained Krishi Sakhis as established last-mile information channels. One KVK, FPO, Krishi Sakhi, mandi association, or trusted input dealer can introduce dozens or hundreds of farmers with much higher trust than cold social comments.

Recommended initial target is one district and one or two crops. Recruit 5 local anchors, onboard 50 farmers with assisted claim links, and measure claim rate, profile completion, first listing, buyer enquiry, and 30-day retention before expanding acquisition automation.

### Research checkpoint

No schema migration is required for optional photos. The implementation needs one shared photo-control component, an action change that permits clearing `avatar_path`, onboarding/settings integration, accessible status/error messaging, and focused unit/browser coverage. Publishing discovered farmers or building lead-import automation is intentionally out of scope until a separate consent and operational design is approved.

## Website imagery audit (2026-08-03)

FarmerBook currently has two generated social-sharing cards (`public/og.png` and `public/og-marketplace.png`), but those are metadata assets and do not appear in the visible page content. The landing page (`app/page.tsx`) relies on icons, cards, and a CSS-only crop illustration. The marketplace hero (`app/marketplace/page.tsx`) uses a CSS map/activity treatment, while listing cards and detail surfaces render the `imageVariant` value as CSS shapes instead of a real produce photograph.

The smallest coherent visual upgrade is one authentic agricultural photograph for each public hero plus one photograph for each of the four existing produce variants. A single variant-to-image mapping can keep cards, detail pages, seller management, and profile listing strips visually consistent without adding image URLs to the database. Native responsive images with explicit dimensions, `object-fit: cover`, useful alternative text, lazy loading below the fold, and WebP compression will avoid turning the improvement into a performance or accessibility regression.

The images should be newly generated for FarmerBook, show plausible Maharashtra/Indian farming contexts, avoid text and logos, and not imitate or identify real farmers. Real member profile photos must continue to come from the member's own optional upload or explicit approval; generated people will be presentation imagery only.

### Research checkpoint for visible imagery

No schema or backend work is required. Six original assets, one image mapping, responsive page/component integration, and focused visual/accessibility checks cover the request. Because this visible-image scope was added after the profile-photo plan was approved, it needs its own plan approval before image generation and implementation.

## LinkedIn and Facebook sign-in failure (2026-08-06)

### Production reproduction

The failure occurs before either third-party provider receives the user. A live
`POST https://farmerbook.in/login` for each social button returns the expected
FarmerBook `303` redirect:

```text
LinkedIn -> https://kdmtjavpxxcppmbzlttr.supabase.co/auth/v1/authorize
            ?provider=linkedin_oidc
            &redirect_to=https://farmerbook.in/auth/callback?next=/feed

Facebook -> https://kdmtjavpxxcppmbzlttr.supabase.co/auth/v1/authorize
            ?provider=facebook
            &redirect_to=https://farmerbook.in/auth/callback?next=/feed
```

Calling those generated authorization URLs returns the same Supabase response
for both providers:

```json
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
```

The production Auth settings endpoint, queried with the repository's public
publishable key, confirms the state directly: `google: true`,
`linkedin_oidc: false`, and `facebook: false`. This agrees with the deployment
record in `implementation-log.md`, which states that Google was configured on
2026-08-04 while LinkedIn OIDC and Facebook remained credential-dependent.

### Application-path findings

- `features/auth/oauth-buttons.tsx:20-46` submits the correct provider values,
  `linkedin_oidc` and `facebook`.
- `features/auth/actions.ts:71-98` correctly calls server-side
  `signInWithOAuth()` and sends users to
  `https://farmerbook.in/auth/callback?next=/feed`.
- `app/auth/callback/route.ts:6-21` exchanges a successful PKCE code and uses the
  existing same-origin `safeNextPath()` check.
- `vite.config.ts:22-26` supplies the correct production site origin, Supabase
  project URL, and public publishable key. The Supabase authorization URLs
  generated in production therefore have the intended origin and callback.
- `tests/schemas.test.ts:117-126` checks the provider identifiers and callback
  path safety, but no test covers disabled-provider behavior or OAuth callback
  error parameters.

`signInWithOAuth()` only constructs the Supabase authorization URL; it does not
report a disabled provider as its returned `error`. The browser discovers the
problem after leaving FarmerBook, so the current action-level error branch at
`features/auth/actions.ts:90-95` cannot turn this failure into an in-app notice.
The app should preflight the public Supabase Auth settings before redirecting.
If a supported provider is explicitly disabled, the action should redirect back
to login/signup with a provider-specific message. A settings-network failure
should fail open and let Supabase handle the request, so a transient diagnostic
request does not block a provider that may actually be healthy.

The callback also ignores `error` and `error_description` query parameters.
Once the providers are enabled, denial, cancellation, or a provider-side
configuration error can therefore send an unauthenticated user toward `/feed`
without explaining the failure. The callback should safely map those parameters
to a concise login error without reflecting arbitrary raw text.

### Provider configuration requirements

The current Supabase LinkedIn guide requires a LinkedIn application with the
**Sign In with LinkedIn using OpenID Connect** product, the Supabase callback
registered as an authorized redirect, and the resulting client ID/secret added
to the enabled LinkedIn (OIDC) provider. The application must keep using
`linkedin_oidc`; the legacy `linkedin` provider is obsolete.

The current Supabase Facebook guide requires a Meta application with Facebook
Login's Authentication and Account Creation use case, both `public_profile` and
`email` ready for testing, the Supabase callback under Valid OAuth Redirect
URIs, and the app ID/secret added to the enabled Facebook provider. In Meta
Development mode only app-role users can sign in; public users require the
provider application to be made live with its required policy/domain details.

For both providers the third-party authorized callback is:

```text
https://kdmtjavpxxcppmbzlttr.supabase.co/auth/v1/callback
```

The third-party client secrets must be entered directly in the provider and
Supabase dashboards (or through an authenticated management API call) and must
not be written to repository files, Cloudflare public variables, logs, or test
fixtures.

Official references checked on 2026-08-06:

- `https://supabase.com/docs/guides/auth/social-login/auth-linkedin`
- `https://supabase.com/docs/guides/auth/social-login/auth-facebook`
- `https://supabase.com/docs/guides/auth/redirect-urls`

### Research checkpoint for this fix

The production failure is fully reproduced and isolated. No provider-name,
site-origin, or FarmerBook callback correction will enable the two providers:
LinkedIn and Meta applications must first supply their credentials to the
currently disabled Supabase provider settings. A small application hardening
change should accompany activation so disabled providers and callback failures
return users to FarmerBook with actionable messages rather than raw JSON or a
silent redirect.

## Passkey and biometric authentication (2026-08-06)

### Supabase capability and constraints

Supabase Auth now exposes experimental WebAuthn/passkey APIs in
`@supabase/supabase-js` 2.105.0 and later. FarmerBook already depends on
`@supabase/supabase-js` `^2.111.0` (`package.json:21`), so the feature does not
need a dependency upgrade. The browser client must explicitly enable
`auth.experimental.passkey` when it is created in `lib/supabase/client.ts`.

Passkey ceremonies are browser-only: registration uses
`auth.registerPasskey()` and authentication uses
`auth.signInWithPasskey()`. A passkey can only be registered by an existing,
confirmed, non-anonymous Supabase user. Consequently, passkeys cannot replace
the first-account-creation path. Email/password or Google remains the bootstrap
identity, Account Settings becomes the enrollment surface, and `/login` can
offer passkey sign-in after enrollment.

The hosted project publishes `passkeys_enabled` from `/auth/v1/settings`; it is
currently `false`. FarmerBook should validate that flag server-side and render a
disabled, explanatory option until the project configuration is enabled. This
matches the existing provider preflight in `features/auth/providers.ts` and
avoids sending users into an experimental flow that the Auth server will reject.

### Existing FarmerBook integration points

- `lib/supabase/client.ts:1-13` is the single browser Supabase client factory and
  is the correct place for the experimental opt-in.
- `app/login/page.tsx:9-55` is a Server Component. It can read the public
  passkey flag and pass it to a small Client Component, but the WebAuthn ceremony
  itself must stay client-side and originate from a user gesture.
- `features/auth/oauth-buttons.tsx:1-76` owns third-party options. Passkey is not
  OAuth and should be a separate button with its own status/error region rather
  than being added to `oauthProviderSchema`.
- `features/profiles/account-settings.tsx:1-127` is already a Client Component
  for access management. It can host passkey list, enrollment, rename/removal,
  and browser-visible success/error states without a database migration.
- `features/auth/require-user.ts:35-77` already protects Account Settings and
  guarantees that a real configured user exists before enrollment.

### Relying-party configuration

The production WebAuthn relying-party display name should be `FarmerBook`, the
RP ID should be `farmerbook.in`, and allowed origins should be
`https://farmerbook.in` and `https://www.farmerbook.in`. Changing the RP ID
later invalidates enrolled passkeys, so the temporary `workers.dev` hostname
must not become the production RP ID. Local development should use a separate
local Supabase configuration and localhost origin rather than attempting to
share production credentials across unrelated domains.

### Security and failure behavior

No private key or biometric data reaches FarmerBook or Supabase; the device or
password manager keeps the private key, while Supabase stores the public
credential. The UI must describe passkeys as fingerprint, face, device PIN, or
security key because the actual authenticator is selected by the user's device.
Cancellation, unsupported-browser errors, disabled-project errors, and missing
credentials should be mapped to bounded FarmerBook messages rather than raw SDK
details. Email/password and Google must remain available as recovery paths.

Official reference checked on 2026-08-06:

- `https://supabase.com/docs/guides/auth/passkeys`

### Research checkpoint

No schema migration or new paid provider is required. The coherent minimum is
an experimental browser-client opt-in, public availability gating, a login
Client Component, an enrollment/management section for confirmed users,
production RP configuration, and focused component/browser regression tests.

### Approved avatar companion scope

FarmerBook already stores owned profile photos in the private `avatars` bucket
through `avatar_path`. OAuth identities can expose a candidate image through
Supabase user metadata (`avatar_url` or `picture`), but other users cannot read
that metadata and remote provider URLs can expire. The safe reuse path is to
accept only metadata belonging to an actual Google/LinkedIn/Facebook identity,
validate an HTTPS provider-owned hostname, fetch a bounded image server-side,
and copy it into the existing user-owned avatar path. User-entered social-link
URLs must never be crawled for photos.

If no trusted OAuth image exists or the import fails, the profile UI can render
a local Farmer-specific icon. That icon is a visual fallback, not identity
evidence. The existing upload control remains the route for replacing an OAuth
photo or supplying a real image before a future identity card is issued. This
requires no new profile column or storage policy.

## 2026-08-06 authentication option removal research

The requested removal is limited to authentication methods. Farmer profile
fields for LinkedIn and Instagram remain ordinary optional contact links and do
not create authentication access.

- `app/login/page.tsx:7-30` imports the passkey availability check and renders
  `PasskeyButton`; removing both also lets the page return to a synchronous
  search-parameter-only data flow.
- `features/auth/oauth-buttons.tsx:17-63` contains the disabled LinkedIn and
  Instagram controls. Google and Facebook use the shared server action and must
  remain.
- `features/auth/schemas.ts:26-30` still accepts `linkedin_oidc`; this creates a
  hand-crafted server-action path even if the button disappears, so the enum
  must be narrowed to `google` and `facebook`.
- `features/auth/providers.ts:4-94` couples OAuth provider diagnostics with the
  passkey public flag. The passkey schema/helper can be removed while retaining
  Google/Facebook availability checks and bounded errors.
- `lib/supabase/client.ts:10-12`, Account Settings, and three dedicated auth
  modules opt into, expose, and manage experimental WebAuthn. All must be
  removed together so the bundle no longer contains a passkey entry point.
- `tests/e2e/demo-journeys.spec.ts:61-86`, `tests/passkeys.test.tsx`, provider
  tests, schema tests, CSS, and README text encode the retired options and need
  matching cleanup.
- Supabase passkeys were enabled externally. Code removal alone does not turn
  off the hosted capability, so the project setting must also be disabled.

No database migration or profile-data deletion is required. Existing uploaded
or trusted OAuth avatars remain valid, and LinkedIn/Instagram profile URLs are
preserved as non-login contact information.

## 2026-08-07 change research: public Farmer identity profile and homepage

### Requested outcome and interpretation

The requested “Farmer identity card, like a LinkedIn profile” is best treated
as a professional FarmerBook profile homepage with a stable shareable URL—not
as a government identity document. It should let a Farmer present a profile
photo, background/cover photo, name, FarmerBook handle, coarse location, farm
story, crops, farming method, experience, verification state, social links,
listings, and purchase reputation. It must not expose identity documents,
phone numbers, buyer enquiries, exact farm coordinates, or authenticated-only
posts.

The canonical public link should be:

    https://farmerbook.in/profile/<handle>

This is separate from both the signed-in community profile and the commerce
storefront. The separation preserves existing product behavior and gives the
public page a focused identity/homepage purpose.

### Existing surfaces and the missing capability

- `app/(product)/farmers/[handle]/page.tsx:21-48` already renders a rich
  `ProfileView`, but `proxy.ts:5-18` does not classify `/farmers` as public.
  Anonymous visitors are redirected to login, so this is not a shareable
  customer-facing identity link.
- `features/profiles/profile-view.tsx:152-267` already displays the avatar,
  name, verification badge, handle, bio, district/state, experience, crops,
  social links, follower counts, and authenticated follow/message controls.
  Its `profile-cover` is a fixed CSS gradient; there is no stored cover image
  and no profile share control.
- `app/store/[handle]/page.tsx:20-148` is public and shareable, but it is a
  seller storefront centered on listings, enquiries, and supplier trust. It is
  not a general Farmer identity homepage and currently uses a decorative cover.
- `features/profiles/profile-settings-form.tsx:57-223` edits the existing
  professional fields and embeds `ProfilePhotoField`, but provides neither a
  background-photo control nor publish/preview/share controls.
- `features/profiles/profile-photo-field.tsx:22-139` and
  `features/profiles/uploads.ts:8-51` already implement owned JPEG/PNG/WebP
  uploads to the private `avatars` bucket with a 5 MB limit. The same validated
  media flow can support a distinct `cover-*` object without adding a second
  bucket.
- `features/marketplace/business-dashboard.tsx:190-205` establishes the app's
  preferred share behavior: use the native Web Share API, fall back to copying
  the URL, and treat cancellation as a non-error.

### Data and query constraints

`lib/types.ts:31-55`, `lib/data-mappers.ts:8-28`, and
`features/profiles/queries.ts:12-45` carry `avatar_path` and a signed avatar URL
but have no cover path, cover URL, or public-profile state. The authenticated
`loadProfileByHandle()` also calls `requireUser()` and reads follow relations,
so it must not be reused by the anonymous route.

The public page needs an anonymous-safe loader that selects only the existing
public professional fields, requires `account_role = 'farmer'`, requires an
active account, and requires an explicit publish flag. It may load active
listings and public purchase reviews; it must not load follows, private
messages/enquiries, or community posts.

The additive profile fields are:

    cover_path text null
    public_profile_enabled boolean not null default false

An opt-in default avoids unexpectedly publishing every existing community
profile. In demo mode the sample Farmer can be marked published so the route is
reviewable without Supabase.

### Media authorization decision

The existing `avatars` bucket is private. Public profile rows can be read by an
anonymous storefront request, but signed URL creation still depends on Storage
`SELECT` authorization. A public identity page therefore needs a narrowly
scoped anonymous Storage policy for only the currently referenced avatar and
cover objects of active, explicitly published Farmer profiles:

    exists (
      select 1 from public.profiles p
      where p.status = 'active'
        and p.account_role = 'farmer'
        and p.public_profile_enabled
        and (p.avatar_path = name or p.cover_path = name)
    )

Authenticated participants retain their existing media visibility and
owner-folder write policies. Deleted/replaced objects cease matching the
public policy as soon as the profile row changes. This is narrower than making
the entire bucket public and avoids using the service-role client in a public
page.

### Proposed request and rendering flow

    Farmer Settings
      -> upload avatar / cover to owned private path
      -> save referenced paths on own profile
      -> enable “Publish my Farmer profile”
      -> preview or share /profile/<handle>

    Anonymous visitor
      -> public /profile/<handle>
      -> anonymous-safe profile query + selective signed media URLs
      -> public identity hero, farm story, crops, social links,
         active produce and verified-purchase reputation

The cover is optional and should use the existing branded agricultural
gradient when absent. The avatar remains optional and uses the existing Farmer
icon when neither a trusted OAuth image nor an uploaded photo is available.
CSS `object-fit: cover` supplies a responsive crop; settings copy should
recommend a wide image (approximately 1600 x 500) while retaining the bucket's
5 MB and JPEG/PNG/WebP constraints.

### Route, metadata, and sharing decision

`/profile/[handle]` should use `PublicHeader` and `PublicFooter`, be added to
the proxy's public prefixes, and return 404 for a missing, non-Farmer,
inactive, or unpublished profile. Dynamic metadata should include the Farmer's
name, `@handle`, short bio, canonical URL, Open Graph title/description, and
the existing stable FarmerBook social image. Expiring signed media URLs should
not become the long-lived metadata image.

A small Client Component can share the canonical URL through
`navigator.share()` and copy it through `navigator.clipboard` otherwise. The
same control can appear on the public page, on the owner's authenticated
profile, and in Profile Settings after publishing. The handle—not the internal
UUID—is shown as the FarmerBook identity label.

### Verification scope

Focused tests should cover data mapping for cover/public fields, avatar and
cover upload validation, cover replacement/removal cleanup, publish-state
actions, anonymous-loader filters, selective migration policy text, public
route/proxy behavior, Web Share/clipboard fallback, default media fallbacks,
and mobile cover rendering. The full gate remains ESLint, TypeScript, Vitest,
Vinext/Cloudflare production build, then desktop/mobile browser verification
for unpublished, published, share, upload, replace, and remove paths.

### Research checkpoint

The current signed-in profile and public storefront can remain intact. The
coherent minimum is an opt-in public Farmer homepage at `/profile/[handle]`,
two additive profile columns, selective private-bucket media access, a cover
upload field, a public-safe loader/page, share controls, and focused regression
coverage. No third-party paid authentication or AI service is involved.

## 2026-08-09 production data-integrity and deployment audit

### Requested outcome

Deploy the current FarmerBook work to production only after every production
page stops presenting invented counts, analytics, listings, reviews, or numeric
fallbacks as live data. Secret-free demo mode may retain fictional fixtures
because it is explicitly labelled with `DemoBanner`; a configured Supabase
deployment must never fall back to those fixtures.

### Live route audit

An authenticated Chrome audit covered the landing page, public marketplace,
signed-in market, feed, discover, network, messages, seller dashboard,
role-routed purchases, account settings, authenticated profile, public profile,
storefront, login, signup, privacy, terms, community rules, and data-deletion
routes on `https://farmerbook.in`.

The confirmed production mismatches are:

- `/network` renders `Following (0)` from the real relationship set but
  `Followers (128)` from a literal at
  `features/network/network-client.tsx:55-73`.
- `/marketplace` and `/market` render six fictional listings, including
  fictional quantities and review totals, although the live project has no
  public reviews and the real public listing query currently fails.
- `/business` has zero real listings and enquiries but still renders a hard-
  coded 82% storefront score, 18% growth, eight pending enquiries, a fabricated
  seven-day bar series, a 61% crop attribution, and “Two listings” at
  `features/marketplace/business-dashboard.tsx:230-324`.
- The landing preview presents `3 new buyer enquiries`, `32 quintals`,
  `1,284 views`, `46 saves`, and `12 enquiries` as if current at
  `app/page.tsx:62-103`.
- The marketplace hero combines the real array length with a literal four
  sourcing districts and a fictional 300 kg/34-minute enquiry at
  `app/marketplace/page.tsx:43-66`.
- Public storefront and listing detail render `experienceYears ?? 1` and
  `profile.followers`, but the public profile hydrator does not load follow
  counts. Those surfaces therefore manufacture one year when absent and show a
  mapper-default zero rather than an authoritative count at
  `app/store/[handle]/page.tsx:71-80` and
  `app/marketplace/[listingId]/page.tsx:154-163`.
- The moderator empty state says “in this demonstration” in configured
  production and advertises an unbacked 24-hour target at
  `features/moderation/report-queue.tsx:107-131`.

Routes backed by authenticated Supabase queries—feed, discover, messages,
profile posts, profile relationship counts, and role-specific purchases—showed
honest empty/zero states for the current account. `/purchases` correctly
redirected the Farmer account to `/business`. `/profile/nmgonapa` returned 404
because that profile has not enabled its opt-in public homepage.

### Root cause of the fictional marketplace

Configured-mode public loaders intentionally fall back to demo fixtures on
database errors or empty results:

- `features/marketplace/queries.ts:163-184` returns every demo listing when the
  list query errors or returns no rows.
- `features/marketplace/queries.ts:217-280` returns demo listing/storefront data
  when a configured lookup is missing or hydration fails.
- `features/reviews/queries.ts:44-110` returns demo reviews on configured query
  errors and even when a real query returns zero rows.

That behavior was useful before production policy repair but violates the
current requirement. In configured mode, empty must remain empty, missing must
remain missing, and failures must not silently become fictional content.

The live Supabase REST checks provide the database-side explanation:

- anonymous `profiles?select=id` returns one real profile;
- anonymous `market_reviews?select=id` returns an exact count of zero;
- anonymous `produce_listings?select=id,farmer_id,status` returns PostgreSQL
  `42501`, because the listing RLS policy reads `profiles.id/status` without
  sufficient anonymous column privilege;
- `supabase/migrations/20260804090000_anon_marketplace_policy_access.sql:1-4`
  contains the missing idempotent `grant select (status)` repair, but the live
  behavior proves that repair is not effective in the production project.

The production sequence must therefore repair the grant first and verify that
the anonymous listing endpoint returns a real empty array (or real rows), then
deploy fail-closed application loaders so future query failures cannot expose
demo content.

### Production-safe rendering decisions

1. Keep fictional fixtures exclusively behind
   `!isSupabaseConfigured()` and the visible demo banner.
2. In configured mode, list queries return real rows or an honest empty/error
   state; detail queries return the real entity or `notFound()`.
3. Replace literal Network and seller-dashboard figures with lengths and sums
   derived from the supplied Supabase records. Remove historical charts and
   percentage claims until event history exists in the schema.
4. Present landing/marketplace mockups as explicitly illustrative and remove
   precise numeric claims; compute public listing/district totals from real
   rows.
5. Do not show public follower counts unless an anonymous-safe authoritative
   count query is intentionally added. Omit missing experience instead of
   substituting one year.
6. Keep true product constraints (five-star inputs, file-size limits, dates,
   price/order-size filters) because they are controls or factual record
   values, not social-proof metrics.

### Testing and deployment boundary

Focused tests must cover real follower lengths, zero-data seller analytics,
absence of hard-coded production metrics, configured-mode marketplace/review
failure behavior, and public seller fields with missing experience/follow
counts. The complete gate is ESLint, TypeScript, all Vitest tests, Vinext
production build, and desktop/mobile Playwright coverage for every primary
route and honest empty state.

The active Cloudflare deployment is 100% Worker version
`6dedddfd-3756-403e-9d56-a2150e05f169` from 2026-08-06. Wrangler 4.92.0 is
installed and the OAuth account is valid when Node uses `/etc/ssl/cert.pem` as
its extra CA bundle. That version is the explicit rollback target. The release
must deploy the built `dist/server/wrangler.json` configuration with dashboard
variables preserved, then verify both custom domains, the workers.dev route,
the Supabase public settings/listing endpoints, Facebook/Google authorization,
and all audited pages.

### Research checkpoint

The production defect is fully isolated. The minimum coherent release is an
idempotent Supabase privilege repair, removal of configured-mode demo
fallbacks, replacement/removal of invented metrics on every affected page,
focused regression coverage, the complete local quality gate, a Wrangler dry
run, production deployment, and a live desktop/mobile route audit with the
previous Worker version retained for immediate rollback.

## 2026-08-09 explicit demo-marketplace isolation

### User correction

Sample produce must not appear on `/marketplace`, `/market`, listing detail,
storefront, seller dashboard, purchases, or review surfaces. If FarmerBook
keeps fictional produce fixtures for demonstration, they belong on a separate,
unmistakably labelled demo page. This supersedes the earlier idea of showing
produce fixtures on normal marketplace routes in a secret-free environment.

### Current coupling that must be removed

- `features/marketplace/queries.ts:8-14` imports produce and enquiry fixtures
  directly into the module used by every live marketplace route. Its list,
  detail, storefront, and seller-dashboard branches can emit samples instead
  of authoritative state.
- `features/reviews/queries.ts:3-8` imports demo reviews, enquiries, listings,
  and profiles into production query paths. Public review errors and zero-row
  results are replaced by sample reviews.
- `features/marketplace/market-browser.tsx:33-43` hard-codes browser history to
  `/market` or `/marketplace`, while `:254-274` always links cards to live
  listing detail and enables save. Reusing it without a mode boundary would
  let fictional IDs flow toward real detail and action paths.
- No `/demo` route exists. Public navigation currently links only to the live
  marketplace, which should remain the primary path.

The live failure is active, not hypothetical: anonymous PostgREST requests for
`produce_listings` currently return PostgreSQL `42501` because the RLS
predicate reads `profiles` without effective privilege. The configured loader
therefore returns all six fictional listings. A demo listing can then mount
the real enquiry form even though no matching production record exists.

### Isolation design

Create `/marketplace/demo` as a public, read-only showcase. A static child route
is already covered by the public `/marketplace` proxy prefix and wins over the
existing `[listingId]` dynamic route. It may receive `produceListings` from
`lib/market-data.ts`, but must render `DemoBanner` and
plain-language copy stating that every seller, quantity, price, review, and
activity value is fictional. Set `robots: { index: false, follow: false }`.
Demo cards remain searchable and filterable but have no save, enquiry,
storefront, or live-detail links.

Make `MarketBrowser` accept its history path and interaction mode rather than
infer them from `embedded`. Make `ListingCard` render non-linking card content
when no detail prefix is supplied. Live callers retain their current paths and
interactions; the demo caller supplies `/marketplace/demo` and read-only mode.

Normal marketplace and review query modules should no longer import sample
market records. In configured mode they return real data, `[]`, or `null`; in
unconfigured mode they return honest empty marketplace collections while the
explicit demo page is the sole sample-produce surface. Authenticated demo
profiles may remain for local navigation, but their market listings,
enquiries, purchases, and reviews remain empty outside `/marketplace/demo`.

### Verification implications

Tests must assert both halves of the boundary: configured and unconfigured live
loaders never return fixture IDs, while `/marketplace/demo` visibly says its
content is fictional, renders samples, keeps its own filter URL, and exposes
no live listing, save, or enquiry actions. A source/build search should confirm
that imports from `lib/market-data.ts` are limited to the explicit demo surface,
tests, and any intentionally isolated demo helper.

## 2026-08-09 explainable Farmer groups and background matching

### Requested outcome

FarmerBook should recommend peer groups from self-declared Farmer profiles—for
example, Farmers growing the same crop in the same district—and keep those
recommendations current as profiles and groups change. The system must not
invent members or activity, infer sensitive attributes, or automatically join
anyone. AI can be added, but group eligibility and access must work identically
when every AI provider is disabled.

This is a second release stream. The production marketplace data-integrity fix
remains the immediate release blocker and should deploy before the new group
schema/runtime is introduced.

### Existing primitives and gaps

- `supabase/migrations/20260729160000_initial_farmerbook.sql:18-40` stores
  role, district, state, crops, farming method (added later), and preferred
  language on profiles. The crop GIN and active-location indexes are useful
  starting points.
- Profiles support up to eight crops, but settings accepts free-text crop,
  district, and state values. Crop order is not a primary-crop signal.
- `preferred_language` is saved by `features/profiles/actions.ts:24-46`, but is
  missing from `lib/types.ts`, `lib/data-mappers.ts`, and
  `features/profiles/queries.ts`; Profile Settings currently defaults the
  control to English. Matching cannot safely use language until this is fixed.
- `supabase/migrations/20260729160000_initial_farmerbook.sql:42-88` contains
  global posts/comments/reactions, follows, and blocks. There is no group
  entity, group role, recommendation consent, or invitation primitive.
- Conversations are constrained to `kind = 'direct'` at `:90-119`, and the
  messages UI assumes one other profile. Group chat should not be retrofitted
  into this model.
- Global post RLS and the `post-images` bucket are not member-scoped. Private
  group discussions/media need separate tables and storage policies to avoid a
  missed filter exposing group content in the normal feed.
- The generated production Worker configuration has no Durable Object, Queue,
  Workflow, AI, or Cron bindings. `npm ls agents` confirms the Agents SDK is
  not installed.

### Matching boundary

Only active, onboarding-complete, explicitly opted-in Farmer profiles are
eligible for Farmer peer groups. Use self-declared canonical crops, broad
district/state, farming method, and confirmed interface language. Do not use
farm size, verification, followers, reviews, biography, posts, DMs, enquiries,
phone/email, social URLs, photos, or inferred exact location.

Before scoring, add versioned canonical crop aliases and canonical location
keys. Unknown text remains unmatched until the Farmer or an administrator
confirms it; AI must never silently merge crop/location identities.

The initial deterministic score is:

```text
shared anchor crop                         40
same district and state                    25
same state for a state-wide group          12
exact farming method                       15
mixed/any-method compatibility              8
same confirmed preferred language          15
Farmer role                                 5
```

Hard gates include role, consent, active/onboarded state, shared canonical
crop, geography scope, group capacity, no existing/pending/declined
membership, and no blocking conflict. Scores 80–100 are Recommended, 70–79
are Good matches, and lower scores are hidden. The matcher stores structured
reason codes such as `shared_crop:tomato`, `same_district:nashik`, and
`same_language:mr`; the UI renders those reasons instead of showing an opaque
numeric score.

Recommendations are private and limited to three. Farmers explicitly Join,
Request to join, Dismiss, Leave, or Accept; recommendation never means
membership. Repeated and concurrent runs must be idempotent through group
signature, membership, and recommendation uniqueness constraints plus a
profile fingerprint containing the algorithm version and sorted normalized
signals.

### Cold start and group creation

No matching profile set means an honest empty state—never sample members or
posts. Candidate pools stay private. Proposed configuration constants:

- district group: four opted-in Farmers sharing crop, district/state, and
  language;
- state group: five matching Farmers across at least two districts;
- activate a pending group only after three Farmers accept;
- expire an unaccepted pending group after 30 days;
- target capacity 20, then open another cohort only when enough unmatched
  candidates exist.

These thresholds are product rules under an `algorithm_version`; they are not
AI judgments and can be tuned from measured adoption.

### Data and authorization shape

Use an additive migration with distinct domains:

```text
profiles.group_matching_enabled + matching-signal preferences
crop_aliases / location_aliases (versioned, human reviewed)
farmer_groups
farmer_group_memberships
farmer_group_recommendations + dismissals
farmer_group_match_jobs + match_runs
farmer_group_posts / comments / reactions
farmer_group_reports / moderation_actions
private group-media bucket
```

RLS exposes listed group metadata and an aggregate active-member count to
eligible signed-in Farmers. Only active members see roster/content/media.
Recommendation rows and preferences are visible only to their owner. Browser
clients cannot directly write membership role/status; locked RPCs derive the
actor from `auth.uid()` for join/request/accept/decide/leave/remove/ban/role
changes and protect the last owner. Group moderators cannot read DMs,
recommendation preferences, or other groups and cannot suspend platform
accounts. Every moderation, ban, and role change gets an audit row.

Group posts and media stay separate from the global feed and `post-images`
bucket. Group chat is deferred. Account deletion must deactivate memberships,
apply the published group-content retention rule, clear private recommendation
state, and transfer or archive owned groups atomically.

### Continuously operating matcher

Do not hold an LLM process open. Add a separately deployable Cloudflare Worker
so the Vinext web deployment and group runtime can roll back independently:

```text
profile/group change
  -> idempotent Supabase trigger upserts farmer_group_match_jobs
  -> Cloudflare scheduled matcher wakes every 10–15 minutes
  -> claims a bounded batch through a server-only RPC
  -> deterministic matcher upserts groups/recommendations/reason codes
  -> retries and records a bounded run result
  -> nightly full reconciliation repairs missed/outdated work
  -> Worker sleeps with no compute while idle
```

The worker receives only the profile IDs and matching fields required by the
RPC. A Supabase service credential is stored as an encrypted Cloudflare secret,
never in the app's public variables, source, or generated configuration.
Profile jobs are deduplicated by profile ID; failures use bounded exponential
backoff and a terminal failed state that operators can inspect/replay.

For the first production version, a standard scheduled Worker plus the
Supabase job table is sufficient and simpler than adding a permanently active
agent. If real-time progress, human approval workflows, or multi-step AI work
becomes necessary, the same separate worker can add the Cloudflare Agents SDK,
a SQLite-backed Durable Object, and Workflows. Cloudflare documents that
scheduled Agent tasks persist across restarts, Queues provide FIFO background
execution, and Workflows are suited to durable multi-step or approval flows.

### AI boundary and cost

Version one requires no AI subscription. Optional AI may propose crop aliases
for human review, translate or summarize group content with source links, and
turn existing reason codes into natural-language explanations. It must never
decide eligibility, membership, access, removal, leadership, or hidden
per-person weights, and it must never infer missing attributes.

If enabled later, Workers AI can be attached to the separate Worker through an
`AI` binding. Send only normalized group tags/aggregate content, validate
structured output, cache by input hash, cap calls per run/day, and require
human approval for taxonomy or moderation changes. Current Cloudflare pricing
documents a free daily Workers AI allocation and usage-based billing above it;
the deterministic matcher therefore remains the zero-model-cost fallback.

### Research checkpoint

The safe minimum is an opt-in, Farmer-only group hub; canonical self-declared
signals; explainable deterministic recommendations; private membership and
discussion tables; server-authorized membership RPCs; and a separate scheduled
matcher with bounded jobs/retries. AI and real-time chat are explicitly not
prerequisites for the useful first release.

## 2026-08-09 agriculture ecosystem, company offers, taxonomy, and India-wide localization

### Requested outcome and research boundary

FarmerBook must grow from a three-role produce marketplace into an agriculture
ecosystem where Farmers, Customers, Wholesalers, and agricultural businesses
can onboard accurately, discover one another, publish useful produce or
business offers, and make contact safely. Farmer activity selection must cover
crop cultivation, livestock, poultry, fisheries, aquaculture, seafood, and
allied activities through a curated hierarchy while allowing bounded custom
entries. The application interface must work in the 22 languages listed in the
Eighth Schedule of the Constitution of India, with English as a fallback.

Three read-only subagents independently audited the data/RLS domain, the
onboarding/localization domain, and the marketplace/release domain. No product
code was changed during research. The primary agent also ran the current local
quality gate. `npm run check` passed ESLint, TypeScript, all 66 Vitest tests in
13 files, and the Vinext production build. This proves the current dirty tree is
internally buildable; it does not prove database policies, production data
integrity, localization, accessibility, or live deployment readiness.

### Repository-state constraint

The worktree is on `main` at `b892d7b` and contains 49 modified tracked paths
plus dozens of untracked paths. The entire marketplace/review route and feature
tree, together with the migrations that introduce the marketplace, three-role
model, reviews, anonymous policy repair, and public Farmer profiles, is
untracked. Representative paths include `features/marketplace/`,
`features/reviews/`, `app/marketplace/`, `app/(product)/business/`, and
`supabase/migrations/20260730120000_marketplace_growth.sql` through
`20260807110000_public_farmer_profiles.sql`.

Tracked application code already selects columns created only by those
untracked migrations. For example, `features/profiles/queries.ts:13-14` expects
role, farming-method, social, cover, and publication columns that are absent
from the tracked initial migration. `tests/rls-migration.test.ts:5-13` also
opens those untracked migration paths. A clean checkout therefore cannot
reproduce the current passing build or database schema. New work must layer on
the current files, never reset or rewrite them, and must use migrations newer
than `20260807110000`.

The highest-conflict files are `features/profiles/onboarding-form.tsx`,
`features/profiles/actions.ts`, `features/profiles/schemas.ts`,
`features/profiles/profile-settings-form.tsx`, `lib/types.ts`,
`lib/data-mappers.ts`, `components/app-shell.tsx`, `app/globals.css`, and the
schema/E2E tests. During implementation, one owner must integrate each of these
files; parallel agents should primarily own new, disjoint modules.

### Current identity and onboarding flow

The current persisted flow is:

```text
auth.users insert
      |
      v
handle_new_auth_user() creates an incomplete profiles row
      |
      v
requireUser() redirects incomplete profiles to /onboarding
      |
      v
client-only three-step React form
      |
      v
one profiles update sets onboarding_complete=true
      |
      v
account_role becomes immutable
```

The original profile table is one-to-one with `auth.users` and stores a legacy
`participant_type`, free-text district/state, an eight-item `crops text[]`, a
three-value language preference, and one completion flag
(`supabase/migrations/20260729160000_initial_farmerbook.sql:18-40`). The later
role migration adds a separate `account_role` restricted to Farmer, Customer,
or Wholesaler and prevents it from changing after completion
(`supabase/migrations/20260731120000_roles_connections_reviews.sql:5-43,91-124`).

The onboarding UI exposes exactly those three roles
(`features/profiles/onboarding-form.tsx:20-44`). Every field for all three
steps lives in local React state, `step` always initializes to one, and only the
final submission persists profile fields (`:79-132`). Refreshing or switching
devices loses the draft, except for a separately persisted photo. Intermediate
Continue buttons do not submit the form, so native required/pattern validation
does not block advancement (`:176-268`). Errors appear as one unassociated
paragraph on the final step (`:471`).

The final `saveProfileAction` updates one profile and immediately marks it
complete (`features/profiles/actions.ts:12-55`). It emits `profile_completed`
after every successful later settings save, not only on the initial transition
to complete. Database errors can be returned verbatim and cannot be reliably
localized. Login also discards the safe destination produced by the proxy and
always redirects to `/feed` (`features/auth/actions.ts:53-73`).

Adding a business role only to TypeScript would be unsafe. The shell treats
every non-Customer as a seller (`components/app-shell.tsx:40-69`), while server
authorization permits only Farmer and Wholesaler
(`features/auth/require-user.ts:20-22`). Role, capability, navigation, actions,
RLS, public visibility, reviews, and moderation must change as one contract.

### Current category model

There is no normalized agriculture taxonomy. `profiles.crops` is a free-text
array capped at eight values (`20260729160000_initial_farmerbook.sql:24-27`).
Onboarding hard-codes Tomato, Onion, Grapes, Pomegranate, Okra, and Millets
(`features/profiles/onboarding-form.tsx:270-300`). Profile Settings replaces
those chips with comma-separated free text
(`features/profiles/profile-settings-form.tsx:165-179`), Discover owns another
independent short crop list, and marketplace categories are whatever literal
strings listing authors entered.

This design cannot relate “Poultry,” “poultry farming,” or a local-script label;
it has no hierarchy, stable identifier, translation key, alias, custom-label
provenance, or moderation state. Farming method is correctly a separate
attribute—Organic, Natural, Conventional, or Mixed—and must not be overloaded
with activity types such as poultry or aquaculture
(`features/profiles/schemas.ts:18-23,85-117`).

The required curated activity tree has these durable top-level families:

```text
Crop cultivation
  cereals/grains, millets, pulses, oilseeds, fibre, sugar/starch, fodder
  vegetables, fruits/nuts, roots/tubers, spices, plantation crops
  floriculture, medicinal/aromatic plants, seed/nursery production
Protected and specialized cultivation
  greenhouse/polyhouse, hydroponics, aquaponics, vertical/urban, mushrooms
Livestock
  dairy cattle, buffalo, goat, sheep, pig, camel/other livestock
Poultry
  broiler, layer/eggs, backyard/native, duck, turkey, quail, hatchery/chicks
Fisheries, aquaculture, and seafood
  freshwater, brackish-water, marine aquaculture
  inland and marine capture fisheries
  shrimp/prawn, crab/lobster, molluscs/shellfish, seaweed
  ornamental fish and fish seed/hatchery
Allied activities
  apiculture, sericulture, lac, agroforestry, compost/vermicompost
  on-farm processing/value addition and integrated/mixed farming
```

Capture fisheries must remain distinct from farmed aquaculture. Seafood is a
commercial/result category, while shrimp, shellfish, marine capture, and marine
aquaculture provide the useful operational distinctions.

Custom labels must not become global filters immediately. A safe design keeps
the original Unicode label and language, normalizes spacing/Unicode for
duplicate suggestions, rejects controls/URLs/phone/promotional text, limits the
count, and records pending/approved/rejected/merged moderation state. The owner
can select “Other” during onboarding without polluting the canonical catalog.

### Current marketplace and company gap

The strongest existing reusable business flow is:

```text
active produce listing
  -> public discovery
  -> anonymous enquiry OR signed-in Customer connection
  -> canonical direct conversation for signed-in Customer
  -> seller lead pipeline
  -> seller marks enquiry won
  -> Customer may publish one enquiry-linked review
  -> report/moderation
```

`produce_listings` is deliberately harvest-specific: crop, variety, quantity,
produce unit, harvest window, grade, delivery, and certifications are required
(`supabase/migrations/20260730120000_marketplace_growth.sql:6-33`). Its Zod
schema mirrors those fields (`features/marketplace/schemas.ts:3-22`). It cannot
truthfully model a tractor, tool, pump, rental, veterinary service, finance,
insurance, training, logistics, or aquaculture input. Unknown crops also receive
a tomato stock image (`features/marketplace/queries.ts:72-78`). A separate
organization and offer domain is required; existing produce rows and URLs must
remain compatible.

No company/organization, membership, service area, sector, shared inbox,
verification request, general offer, offer validity, or company public page
exists. Moderation covers profile, post, comment, message, and review but not
organization, offer, listing, or certification claim
(`features/moderation/schemas.ts:3-21`).

Signed-in Customer enquiries use a good locked-RPC pattern. The
`connect_to_listing` function verifies the listing and both profiles, creates a
canonical direct conversation, inserts the enquiry, and returns both IDs
(`20260731120000_roles_connections_reviews.sql:316-402`). It should be adapted
to capability checks so a Farmer or Wholesaler can also source equipment and
produce without changing primary identity. Organization enquiries need their
own shared event thread rather than being attached to one employee's private
direct-message conversation.

Anonymous produce enquiries are not production-safe. A UI honeypot is
bypassable through direct Supabase REST, the database grants anonymous insert,
and there is no durable rate limit, bot verification, retention workflow, or
guest deletion path (`features/marketplace/inquiry-form.tsx:130-143` and role
migration `:248-258`). New company-offer enquiries should initially require an
active signed-in participant; the existing guest produce path needs explicit
anti-abuse and privacy work before release.

### Current localization gap

`lib/i18n/en.ts` and `lib/i18n/hi.ts` contain only the brand, five navigation
labels, and seven actions. Nothing imports them. Marathi is selectable while no
Marathi catalog exists. The database and Zod accept only `en`, `hi`, and `mr`
(`20260729160000_initial_farmerbook.sql:30-31` and
`features/profiles/schemas.ts:80`).

The saved preference is not selected by `features/profiles/queries.ts:13-14`,
not represented in `lib/data-mappers.ts:8-30`, and not present in the domain
profile type. Onboarding initializes English unconditionally
(`features/profiles/onboarding-form.tsx:94`) and Settings defaults English
(`features/profiles/profile-settings-form.tsx:182-192`), so an existing choice
can be silently overwritten. `app/layout.tsx:51-60` fixes the document to
`lang="en"` and has no direction. Dates, relative labels, counts, prices, units,
metadata, validation, navigation, policies, forms, moderation, and error states
are English literals. `lib/data-mappers.ts:56-68,108-111` hard-codes `en-IN`.

The defensible scope for “all Indian languages” is English plus the 22
Scheduled languages. The explicit interface locale registry is:

```text
en-IN
as-IN, bn-IN, brx-IN, doi-IN, gu-IN, hi-IN
kn-IN, ks-Arab-IN, kok-Deva-IN, mai-IN, ml-IN
mni-Mtei-IN, mr-IN, ne-IN, or-IN, pa-Guru-IN
sa-IN, sat-Olck-IN, sd-Arab-IN, ta-IN, te-IN, ur-IN
```

Script tags are explicit where direction or the expected interface script is
otherwise ambiguous. `ks-Arab-IN`, `sd-Arab-IN`, and `ur-IN` are right-to-left.
The local Node 22 runtime reports date, number, and relative-time Intl support
for the tested registry; the Cloudflare runtime must still be verified in a
deployed smoke test.

Interface translation does not imply automatic translation of user content.
Posts, biographies, messages, listings, offers, and custom labels remain in the
author's language, carry a language tag where useful, render with `dir="auto"`,
and may receive a separately labeled translation later. Raw Supabase/provider
errors must become bounded internal error codes plus translated public
messages.

### Production-readiness defects that shape the plan

The existing production data-integrity addendum remains the first release
blocker. Configured list queries return fictional demo listings on error or a
legitimate empty result (`features/marketplace/queries.ts:163-184`); listing and
storefront misses also fall back to fictional records (`:217-280`); review
errors and zero rows can return fictional verified reviews
(`features/reviews/queries.ts:44-110`). Demo records must remain only on the
separate, labeled, read-only demo page already designed in the plan.

Other material gaps found by the three audits are:

- sellers can self-select strings such as “Verified farm” and
  “Residue-tested”; certification text is not verified evidence;
- table-level listing INSERT grants allow more columns than the UI intends;
- marketplace filters operate over only the latest 100 rows in the browser;
- harvest dates are display text, preventing reliable localization/expiry;
- saves, views, trend charts, and several dashboard numbers are decorative or
  hard-coded rather than durable data;
- current RLS tests search migration text but never execute policies against
  real anonymous/role/organization clients;
- `supabase/seed.sql` can violate the completed-Farmer farming-method
  constraint;
- `vite.config.ts:18-27` couples local configuration to production domains and
  the live Supabase project;
- there are no application loading/error boundaries, sitemap, robots,
  manifest, CSP/security headers, structured production health check, or
  privacy-safe error correlation;
- policy/legal pages still describe a pilot, the footer address uses an
  `.example` domain, and account deletion does less than the UI claims;
- dialogs lack complete focus trapping/Escape/restoration, errors often lack
  `aria-invalid`/`aria-describedby`, and some touch targets are below 44px;
- physical left/right CSS and fixed typography will break or degrade RTL and
  several Indic scripts.

“Production-ready” therefore means code and schema can pass an empty-database
migration rehearsal, real RLS tests, localized and accessible end-to-end tests,
an explicit configuration/secrets check, and a staged release audit. It cannot
mean that untranslated machine output or unverified business claims are
silently labeled production quality.

### Chosen compatibility architecture

Keep `profiles`, legacy `participant_type`, `account_role`, `crops`,
`produce_listings`, `market_enquiries`, and current URLs during the transition.
Add `agri_business` as a fourth primary account role for shell/identity
behavior, but express authorization through named capability functions instead
of scattered role comparisons:

```text
can_publish_produce(profile) -> Farmer or Wholesaler
can_source(profile)          -> any active, completed participant
can_manage_organization(org) -> active owner/admin/editor membership
can_publish_offer(org)       -> active published organization + authorized member
can_review(enquiry)          -> the linked buyer after the recorded completion state
```

This lets Farmers and Wholesalers buy/source without changing their primary
identity, while a company representative uses an `agri_business` account and
an organization membership. It avoids turning `account_role` into a long enum
of tractor/tool/input/service variants.

The new normalized domains are:

```text
supported_locales
agriculture_categories
profile_category_affinities
custom_category_requests + profile_custom_category_affinities
onboarding_progress

organizations
organization_memberships
organization_category_affinities
organization_service_areas

business_offers
business_offer_categories
business_offer_service_areas
business_offer_enquiries
business_offer_enquiry_events + assignments

certification_claims / organization_verification_requests (private evidence)
```

Categories use stable slugs and parent IDs. The database stores canonical
identity, while typed locale catalogs store interface labels; original custom
labels never overwrite canonical nodes. One onboarding-finalization RPC
revalidates all draft steps and atomically writes the profile, category
affinities, organization/initial owner membership when selected, clears the
draft, and flips `onboarding_complete`.

Keep `produce_listings` for current harvest lots. Add a general offer model for
product, service, rental, promotion, finance, insurance, advisory, training,
and support offers with real dates, INR-aware price models, service geography,
content language, moderation state, and expiry. Public marketplace discovery
unifies produce, companies, and offers at the UI/search layer while preserving
the existing produce route.

### Release and parallel-work implications

Release A remains the existing production data-integrity repair: isolate demo
fixtures, fix anonymous marketplace access, remove invented metrics/claims,
complete the public-profile tests, and establish an honest baseline. Release B
adds locale/taxonomy/onboarding contracts. Release C adds organizations,
company onboarding, offers, shared enquiries, and the remaining production
hardening. The previously planned Farmer-groups release moves after these
because it should consume canonical categories and confirmed locales instead
of creating a second normalization system.

During implementation:

- the domain/data agent owns new forward migrations, RLS helpers, catalogs,
  and database-focused tests;
- the localization agent owns new locale/message/formatting infrastructure and
  catalog checks;
- the marketplace agent owns new organization/offer feature modules and public
  routes after the data contract lands;
- the primary agent owns integration into dirty onboarding, profile, shell,
  CSS, existing marketplace, and shared test files.

Agents must not edit the same central dirty files concurrently. Domain and
localization primitives can proceed in parallel, followed by onboarding and
organization/offer integration.

### Research checkpoint

Research is sufficient to plan without guessing. The minimum coherent program
is: first close production data-integrity defects; then add a forward-only
canonical agriculture taxonomy and owner-only resumable onboarding; then wire
23 complete locale catalogs with request/profile persistence, Intl formatting,
RTL and accessibility; then add organizations, memberships, company categories,
general offers, signed-in shared enquiries, moderation, and indexed discovery;
finally run real database authorization, multi-role, localization, accessibility,
build, browser, and staging-release gates. Existing tables remain readable and
rollback is an application/feature-flag rollback rather than destructive schema
removal.

## 2026-08-09 international Farmer professional profile and card

Three parallel read-only audits covered the current profile experience, the
data/RLS and trust boundary, and standards/production verification. The current
public Farmer page already provides a useful base: a cover, avatar, real name,
handle, broad location, joined label, experience when supplied, farm story,
crops, farming method, social links, real active listings, and completed-enquiry
reviews. It is opt-in and its query is limited to active, onboarded Farmer
profiles with `public_profile_enabled=true`. The authenticated
`/farmers/[handle]` page remains the community surface for follow, message,
block, report, posts, and connections; the public `/profile/[handle]` page is
the correct canonical sharing surface. Those route purposes should remain
separate while sharing one identity-header design.

The current card is not an identity artifact. It is a free-height green aside
in `features/profiles/public-farmer-profile.tsx`, measured at approximately
`377 x 349` on desktop and `365 x 495` on mobile. It has no stable geometry,
QR, print stylesheet, download behavior, independent status, or revocation
semantics. It labels the mutable username as “FarmerBook ID” and turns the
coarse profile moderation flag into “Verified participant.” Those phrases can
be mistaken for government identity, farm ownership, organic certification,
or produce/supplier verification, none of which the application establishes.

The safe product language is **FarmerBook Professional Card**. It is a portable
summary of a Farmer's explicitly published professional profile, not a legal
identity credential. The front may contain only real current values: name,
semantic portrait or neutral fallback, `@handle` labelled “Profile handle,”
Farmer account category, district/state, up to three crop/category values,
farming method and exact experience only when present, and a narrowly scoped
“FarmerBook profile reviewed” status only when the existing review state truly
supports it. The back contains a locally generated QR and visible HTTPS URL,
plus: “Professional network card — not a government-issued identity document,
farm certification, supplier endorsement, or product guarantee.” Phone,
email, coordinates, exact address, farm size, enquiry/message data, auth UUIDs,
signed media URLs, access tokens, evidence, and moderator details are excluded.

The official ISO catalog gives the ID-1 physical dimensions as 85.60 mm by
53.98 mm (ratio approximately 1.5858). The digital design may truthfully say it
uses **ID-1 proportions**. It must not claim ISO certification or conformity,
because the physical standard covers characteristics beyond screen aspect
ratio. On screen the contract is `aspect-ratio: 85.6 / 53.98`; the dedicated
print view uses `85.60mm x 53.98mm`, `break-inside: avoid`, and exact color
adjustment. PDF/print is preferable to promising an exact-size raster. A
300-DPI reference would be approximately 1011 by 638 pixels, but printer
scaling still affects the physical result.

### Trust and stable-reference decision

The first release is a live professional profile card, not an admin-issued
credential. It therefore does not invent an ID number, issued date, expiry,
membership count, or verification score, and it does not need an immutable
snapshot of self-declared claims. Profile edits update the live card. A later
credential program, if FarmerBook establishes documented review evidence and
trained reviewers, requires a separately approved request/review/revision
model; it must not be simulated now.

The QR still requires a stable, revocable destination. Handles are currently
editable, so encoding `/profile/[handle]` directly would break printed cards.
Add an opaque random `public_reference` used only in
`/farmer-card/[publicReference]`. It is a technical lookup key, not displayed
or described as an identity number. A Farmer explicitly creates/publishes the
card from Settings after seeing the precise field disclosure and choosing the
optional fields. The active route resolves current public profile data. Turning
off public-profile/card publication makes it return a no-PII “card unavailable”
state; suspension, deletion, failed onboarding, or loss of Farmer role revokes
it. Demo fixtures never receive a reference, timestamp, or scannable QR.

The smallest honest persistence model is a tightly scoped
`farmer_profile_cards` table with `profile_id`, random unique
`public_reference`, `status` (`active`, `withdrawn`, `revoked`), bounded
allowlisted `display_fields`, `consent_version`, consent/status timestamps, and
standard timestamps. There is one card per profile. The browser receives no
direct insert/update/delete grant. Authenticated owner RPCs create/update or
withdraw the card after checking an active, onboarded, published Farmer profile;
profile suspension/deletion/role changes revoke it. Anonymous access is through
one exact-reference, narrow security-definer lookup returning only the
allowlisted current public fields. The function fixes `search_path`, denies
listing/enumeration, and returns no PII for inactive states. The public route is
dynamic/no-store and `noindex,nofollow,noarchive`; cards are never enumerated in
the sitemap. Rate limiting at the application/edge boundary is required before
production.

The avatar remains a meaningful identity image on the card, so it needs a
semantic `<img alt="Photo of ...">` variant rather than the current decorative
CSS background. The cover stays decorative with empty alternative text. The
existing OAuth-photo behavior currently imports a trusted-provider image merely
when Settings renders; publishing such a photo must instead require an explicit
“Use my sign-in photo” action explaining that it can become public. Provider
host and Content-Type checks do not prove identity and do not sanitize image
content. Before a downloadable card uses an uploaded portrait, the server must
magic-byte decode it, enforce dimensions, re-encode it, strip metadata, and use
a random object name. QR codes contain only the configured canonical FarmerBook
HTTPS card URL, never Host-derived origins or signed media URLs.

### Profile and card experience

The profile should read like a restrained international professional network,
not a social-media novelty:

1. A shorter decorative cover and a prominent 112–128px semantic portrait.
2. One clear `h1`, `@handle`, Farmer account category, broad location, farming
   method, crops/categories, and real joined label.
3. Primary actions for available produce, sharing, and sign-in-to-message;
   authenticated community actions stay on `/farmers/[handle]`.
4. A trust strip containing only real optional facts: exact experience, active
   lot count, and completed-enquiry review count/rating. Missing facts are
   omitted, not replaced by dashes or estimates.
5. Farm story and social links, real current lots, completed-enquiry reviews,
   then the professional-card preview.
6. Settings provides a plain completed/not-completed profile checklist rather
   than a fabricated percentage, explicit public-field disclosure, a card
   preview, optional-field controls, publish/withdraw, share/copy, and
   print/save-PDF.

Use two static faces or explicit accessible Front/QR tabs; do not use a
hover-only 3D flip. The QR is generated locally as a high-contrast SVG with a
four-module quiet zone, no logo obstruction, and a visible/selectable/copyable
URL beside it. The URL is also a normal link and has an accessible name, so the
QR is never the sole path. Share and print states use polite status messages;
failures are visible alerts rather than swallowed clipboard exceptions.

At small widths the card remains `width: 100%` with no horizontal scrolling.
At 200% and 400% zoom, secondary content may flow below the visual card rather
than being clipped or shrunk below a readable size. User-authored names, bios,
locations, and crops use `dir="auto"`. Test long Unicode/RTL names, maximum
handles, eight crops, absent media/experience/social/reviews, keyboard-only use,
forced colors, reduced motion, and exact print behavior. WCAG 2.2 AA requires
4.5:1 normal-text contrast and usable reflow/focus. The current white-on-
terracotta primary control was measured at about 4.09:1 and must be corrected.
An internal 44px control target remains the design goal even though WCAG 2.2's
minimum target-size criterion can be satisfied at 24px with defined spacing
exceptions.

### Production discrepancies and release boundary

Live production is behind the current source: `/profile/meera_kulkarni`,
`/sitemap.xml`, and `/api/health` currently redirect to login even though the
source proxy marks `/profile` public. The public-profile migration and anonymous
storage/profile policies must be applied and tested in staging before any QR is
printed. Profile query database failures are presently collapsed into `null`,
which creates a false 404; unavailable and not-found states must be distinct.
Signed image URLs can outlive unpublishing until their TTL expires, so the card
route must use short-lived media delivery and never embed those URLs in its QR.

The privacy notice currently says profiles are signed-in-only/not indexed while
`robots.ts` permits `/profile/`. Publication settings also do not enumerate the
exact exposed fields. The release must reconcile policy, robots, sitemap, and
consent: either public profiles are deliberately indexable with informed opt-in
and dynamic sitemap support, or they are `noindex`; the professional card route
itself stays noindex. Storefront/listing verification language must use the same
narrow reviewed-profile semantics. Demo routes retain visibly fictional sample
profiles and never expose live card controls.

### Test and operational evidence required

Unit/component coverage must prove field allowlisting, absence of private
fields/fake numbers, publication gating, revoked/withdrawn privacy, canonical
origin allowlisting, semantic portrait fallback, truthful trust copy, long and
multiscript content, share/download failures, safe filenames, and object-URL
cleanup. Database tests must execute the card RLS/RPC matrix for anonymous,
owner, other participant, suspended Farmer, moderator/admin, and service role;
direct role/status writes and public enumeration must fail.

The final rendered QR—not merely its source string—must decode exactly to the
expected HTTPS URL from screen, exported/printed output, grayscale, and a
downscaled rendition. Geometry tests allow at most 0.5% aspect-ratio error and
verify the PDF/print MediaBox dimensions. Playwright covers 320, 393, and 1280px,
200%/400% zoom, keyboard, current production locales plus an RTL locale, print
media, no overflow, and unavailable/revoked routes. Automated accessibility
testing is supplemented by manual screen-reader, forced-colors, and print review.

Release is blocked until the current Worker and migrations are staged, public
profile/card/robots/sitemap/health routes behave anonymously as designed, real
RLS/storage tests pass, the live QR decodes and opens without authentication,
and the Worker version plus rollback target are recorded. The existing
production data-integrity release remains earlier in the release order; the
profile/card work must never reintroduce demo records or invented activity.

## Consent-first autonomous outreach agent research — 2026-08-09

### Refined objective

The founder wants a system that runs without operator intervention after a
source is submitted. The acceptable autonomous boundary is: acquire and record
verifiable consent, qualify the consenting prospect, introduce FarmerBook,
assist onboarding, follow up within the granted purpose/channel, stop on
withdrawal, and retain an audit trail. A public email, phone number, profile,
description, or screenshot is evidence of a possible business contact, but is
not itself consent to automated FarmerBook marketing.

The official YouTube developer-policy guide prohibits using YouTube APIs to
harvest, infer, derive, or store identifying/contact data without consent and
explicitly lists names, usernames, emails, and phone numbers. FarmerBook must
not scrape YouTube or other social platforms, fetch screenshots, mine captions,
or crawl profiles. It may process a description or screenshot that the
FarmerBook operator directly supplies, extract only text visibly labelled for
business enquiries, retain the exact evidence, and use it only to start a
compliant consent-acquisition flow. It must not infer obscured or missing data.

TRAI's current sender guidance requires Principal Entity registration, a
registered header, registered content templates, and consumer consent acquired
through a registered consent-template process before commercial communication.
TRAI's consent page describes digitally recorded consent through the consent
acquisition process operated with telecom providers. Therefore an SMS, voice,
or WhatsApp-like consent request cannot be sent from an ordinary ten-digit
number or an unregistered integration. The code can provide a disabled
`ConsentAcquisitionProvider` contract, but production activation requires the
FarmerBook legal entity, PE/DLT registration, approved templates, and a named
provider.

Inbound opt-in is the immediately implementable acquisition path. A FarmerBook
landing form can collect explicit, granular consent; Google Ads lead forms can
also deliver voluntarily submitted first-party leads to a CRM webhook and
require a visible privacy-policy URL. These leads may enter an autonomous
welcome/onboarding sequence because the person deliberately submitted their
details for that stated purpose. Google notes that lead forms can deliver data
by webhook and optionally verify phone numbers with OTP. Social lead-form
connectors remain separate until official credentials, webhook verification,
and platform-specific consent terms are reviewed.

Primary sources reviewed on 2026-08-09:

- https://developers.google.com/youtube/terms/developer-policies-guide
- https://www.trai.gov.in/advice-to-senders
- https://trai.gov.in/manage-your-consent
- https://support.google.com/google-ads/answer/16726130
- https://support.google.com/google-ads/answer/16729613
- https://developers.cloudflare.com/agents/concepts/human-in-the-loop/
- https://developers.cloudflare.com/workers-ai/configuration/bindings/
- https://developers.cloudflare.com/workers-ai/features/json-mode/
- https://developers.cloudflare.com/workers-ai/platform/data-usage/

### Existing FarmerBook integration points

FarmerBook is a Vinext/Next.js application in one Cloudflare Worker. The Worker
delegates to Vinext and applies security headers (`worker/index.ts:31-49`). Vite
defines bindings programmatically and already enables `nodejs_compat`
(`vite.config.ts:18-47`). There is no Agents SDK dependency (`package.json:12-40`).
Durable application records are in Supabase, using request-bound authenticated
clients (`lib/supabase/server.ts:5-27`), protected administrator checks
(`features/auth/require-admin.ts:5-22`), narrow server actions, database RPCs,
RLS, and append-only audit patterns (`features/moderation/actions.ts:49-105`).

The feature must use both a default-off application flag like those in
`lib/feature-flags.ts:1-18` and a private database release control like
`ecosystem_release_controls` in the 2026-08-09 organizations migration. This
prevents direct PostgREST calls from bypassing a hidden route. The present
privacy page and production runbook still mark legal basis, retention, deletion,
custom SMTP, operational ownership, and real contact details as release gates;
the agent cannot be called production-ready until those fields are resolved.

### Selected architecture

Release 1 should keep Supabase as the only durable state and use Workers AI for
bounded classification, personalization, and onboarding assistance. A Durable
Object/Agents SDK Workflow is unnecessary until there is an approved outbound
provider or a long-running consent wait. The agent behavior is represented as a
database state machine and an idempotent worker:

```text
source supplied
  -> classify source; never fetch social/YouTube
  -> OCR/paste extraction for operator-supplied evidence OR safe website fetch
  -> identify explicitly published business-enquiry candidate
  -> choose consent path
       inbound FarmerBook form / verified Google lead webhook: already opted in
       registered DCA provider: send approved consent template and wait
       no compliant provider: blocked, never contact
  -> verify signed consent receipt + purpose + channel + policy version
  -> AI qualifies role/categories/language and creates grounded introduction
  -> transactional outbox delivers through approved provider
  -> autonomous onboarding reminders within frequency/expiry limits
  -> joined / declined / expired / withdrawn
  -> withdrawal atomically suppresses future contact
```

Cloudflare Workflows become useful only when the real consent/delivery provider
is selected: one workflow can wait for a signed consent webhook, retry bounded
provider calls, and survive Worker eviction. Until then, Supabase outbox rows
and a protected processing endpoint allow deterministic local implementation
without pretending a configured sender exists. Workers AI JSON mode is not
guaranteed, so all model responses require strict Zod validation; deterministic
fallback copy must remain available. Cloudflare states that Workers AI customer
content is not used to train models without explicit consent, but the privacy
notice must still disclose that processing.

### Persistence, consent receipt, and state machine

A forward migration should add private tables for `outreach_prospects`,
`outreach_contact_candidates`, `outreach_consents`, `outreach_outbox`,
`outreach_events`, `outreach_suppressions`, and `outreach_agent_runs`. Public,
anon, and ordinary authenticated table privileges are revoked. Narrow
security-definer RPCs check `public.is_admin()` or a verified webhook identity,
the private release control, expected revisions, idempotency keys, and allowed
state transitions.

The consent receipt records prospect/contact hash, channel, exact purpose,
consent statement/template/version, capture method, source campaign/provider,
provider receipt, granted/withdrawn/expiry times, IP/user-agent only when the
approved privacy policy requires them, and an immutable audit timestamp. It
does not accept a boolean from the browser as sufficient proof: the public form
submits a server-issued nonce, policy version, checkbox statement, and verified
email/OTP or trusted signed lead-provider receipt. Consent is channel- and
purpose-specific and expires according to the approved policy.

States are `discovered`, `consent_blocked`, `consent_requested`, `consented`,
`qualified`, `introduction_queued`, `introduced`, `onboarding`, `joined`,
`declined`, `expired`, `withdrawn`, and `suppressed`. No introduction enters the
outbox without an active matching consent receipt. Withdrawal cancels queued
messages, adds a private normalized-hash suppression, and prevents re-import.
Outbox rows use stable idempotency keys, attempt limits, `not_before`, expiry,
and provider receipt; they never contain a fake sent state.

### Source and OCR safety

The intake accepts one URL plus optional pasted description or screenshot.
Social/YouTube URLs are classified but never fetched. Screenshots are uploaded
directly by the administrator, magic-byte validated, bounded to supported image
types/dimensions, stripped of metadata by re-encoding, processed transiently,
and deleted after OCR. The UI shows the extracted text and exact screenshot
evidence. Only contact text visibly labelled for business enquiries may become
a candidate. OCR uncertainty, personal-looking contacts, partially obscured
data, or absent purpose becomes `consent_blocked`.

Ordinary business websites may be fetched only through an SSRF-hardened adapter:
HTTPS in production, no credentials/fragments/nonstandard ports/IP literals/
localhost/private/link-local/metadata hosts, manual validation of redirects,
same-origin page limit, short timeout, response byte cap, HTML/text only, and
visible-text extraction. The agent cannot guess a name, email, phone, address,
role, location, language, consent, or sensitive trait.

### Autonomous acquisition and onboarding

The public `/join` acquisition form must clearly name FarmerBook, the benefits,
the precise channel/purpose/frequency, privacy notice, withdrawal method, and
whether AI personalizes messages. It collects the minimum information: role,
name/business name, state/district, preferred language, email or phone, and
explicit separate checkboxes for FarmerBook introduction and onboarding follow-
ups. It uses Turnstile, a server nonce, rate limits, duplicate/suppression checks,
and double opt-in/OTP before activating consent.

A signed Google lead-form webhook can create the same consent-pending record,
but its submitted fields and privacy/purpose version must match FarmerBook's
approved campaign. Webhook authentication, replay protection, and provider
receipts are mandatory. Leads with ambiguous consent receive no promotion until
they complete FarmerBook's own confirmation page.

After consent, Workers AI maps the lead only to the canonical four account roles
and agriculture categories, writes a short introduction in the requested
language, and uses fixed reviewed legal/opt-out text. It must not promise
customers, prices, verification, subsidies, earnings, government affiliation,
or endorsement. Follow-ups stop on reply, join, withdrawal, expiry, provider
complaint, or configured frequency cap. Replies that cannot be safely handled
receive a neutral support path rather than fabricated advice.

### Delivery and external blockers

The application can implement a `ConsentAcquisitionProvider` and
`OutreachDeliveryProvider` interface plus a non-sending local adapter. Real
autonomy requires at least one approved external provider and credentials:

- email: verified FarmerBook domain, custom transactional provider, double opt-
  in template, unsubscribe processing, bounce/complaint webhooks;
- SMS/voice: PE/DLT registration, header, consent/content templates, registered
  provider, DND/preferences and receipt handling;
- WhatsApp/social: approved business account, official API, opt-in, templates,
  webhook signature verification, and platform review.

The code must fail closed if a provider or receipt verifier is absent. Building
an interface does not authorize using a personal mailbox, ten-digit number,
unofficial WhatsApp library, headless browser, or social-session cookie.

### Verification and release boundary

Tests must prove social links are never fetched, screenshot OCR cannot invent or
complete contacts, private/metadata URLs are denied, webhook signatures and
nonces prevent replay, contact values are private, consent is granular and
immutable, no outbox row exists without active consent, withdrawal cancels all
pending contact, suppressions survive re-import, and all state transitions are
idempotent. AI prompt injection and malformed JSON must fall back safely.
Executable SQL tests cover anon, normal user, admin, webhook role, service role,
release-disabled, duplicate, expired, withdrawn, and deletion cases. Browser
tests cover mobile/desktop, keyboard, RTL/long text, consent copy, OCR review,
successful opt-in, withdrawal, AI/provider failure, and no overflow.

Implementation approval does not authorize ads, provider spend, production
deployment, or real contact. Release requires an approved privacy notice and
retention schedule, a named data/privacy owner, registered sender/provider
evidence, exact templates, staging RLS/webhook/replay tests, usage limits, and a
consenting test recipient. The app and database flags stay off until a separate
release approval.

## Localization remediation audit — 2026-08-11

### Scope and observed failure

The product owner asked to repair every localization failure found by three
parallel read-only audits plus an independent browser reproduction. The audit
covered the exact 23-locale registry, catalog loading, cookie/profile
persistence, public and authenticated route rendering, date/number formatting,
RTL behavior, and automated test strength.

Browser evidence showed that locale state itself works. Switching the public
selector from `en-IN` to `hi-IN` and `mr-IN` changed the selected option and
`<html lang>`, and the choice survived a full reload and direct navigation.
However, `/`, `/profile/meera_kulkarni`, `/marketplace/demo`, `/feed`,
`/login`, `/signup`, and `/settings/profile` remained almost entirely English.
Only the selector's `Language`/`भाषा` and `Beta`/`बीटा` labels changed on the
shared-shell routes. `/onboarding` translated its title and introductory copy
but continued with English role descriptions, controls, and taxonomy labels.

The current data flow is:

```text
LanguageSelector
  -> saveLocalePreferenceAction(locale)
     -> fb_locale cookie (anonymous and authenticated)
     -> profiles.preferred_locale (authenticated, best effort)
  -> router.refresh()
  -> app/layout.tsx resolves cookie / Accept-Language
  -> loadMessages(locale)
  -> LocaleProvider
     -> only six client modules call useTranslations()
     -> the other ninety-one UI modules render hard-coded English
```

The persistence implementation is in
`features/profiles/locale-actions.ts:30-101`; request resolution and document
metadata are in `app/layout.tsx:69-87`. OAuth callback restoration already
loads `profiles.preferred_locale` only when the locale cookie is absent
(`app/auth/callback/route.ts:68-101`), but password login does not restore it
and normal product rendering never reconciles a missing cookie with the saved
profile preference.

### Coverage inventory

There are 97 `.tsx` modules below `app`, `components`, and `features`, but only
these six UI modules use the translation hook:

```text
components/language-selector.tsx
features/onboarding/category-picker.tsx
features/onboarding/onboarding-flow.tsx
features/onboarding/onboarding-shell.tsx
features/outreach/consent-join-experience.tsx
features/outreach/consent-join-form.tsx
```

Shared chrome is hard-coded in `components/public-header.tsx:12-33`,
`components/public-footer.tsx:14-43`, `components/app-shell.tsx:44-153`, and
`components/settings-nav.tsx:5-32`. The public professional profile contains
fixed English helpers, actions, headings, empty states, identity copy, and
`en-IN` formatting throughout
`features/profiles/public-farmer-profile.tsx:27-473`. The same problem spans
the public home (`app/page.tsx:21-364`), marketplace
(`features/marketplace/market-browser.tsx:131-319` and listing/detail/store
routes), authentication pages, legal pages, every signed-in route, settings,
organizations/offers, moderation, and outreach administration.

Server components cannot call the current client-only `useTranslations` hook.
The remediation therefore needs a request-scoped server translation helper
that uses the same typed catalogs as `LocaleProvider`, not a DOM text-rewriter
or client-only flash after hydration. A suitable contract is:

```ts
export async function getServerI18n() {
  const locale = await getCurrentRequestLocale();
  const messages = await loadMessages(locale);
  return { locale, t: createTranslator(messages) };
}
```

Client modules continue to use `useTranslations(namespace)`. Both surfaces
must accept the same stable semantic keys and named interpolation values.

### Catalog completeness

`lib/i18n/messages/en-IN.ts` defines the typed source shape. Each of the 22
non-English files imports that source and spreads English into incomplete
namespaces. A catalog comparison found 142 of 219 values (64.8%) byte-identical
to English in every non-English catalog:

- `outreach`: 43 of 43 English;
- `onboarding`: 89 of 104 English;
- `profile`: 6 of 14 English;
- `legal`: 4 of 8 English.

Key-parity tests in `tests/i18n-messages.test.ts:24-35` accept these fallbacks
because they only assert equal non-empty key sets. The remediation must remove
source-catalog spreads from non-English files and add an automated assertion
that non-English release catalogs do not silently reuse English for required
interface keys. Machine-assisted translations remain visibly Beta and must not
be marked `native_reviewed`; reviewer, review date, and catalog hash stay empty
until real review evidence exists.

The catalog must expand into route-oriented namespaces rather than one
unmaintainable flat collection. Required groups include `navigation`, `home`,
`auth`, `publicProfile`, `marketplace`, `feed`, `network`, `messages`,
`settings`, `business`, `organizations`, `offers`, `reviews`, `moderation`,
`legal`, `errors`, and the existing onboarding/outreach groups. User-authored
text, names, handles, addresses, post bodies, listing descriptions, and external
content remain in their original language and use `dir="auto"`; they are not
machine-presented as original translations.

### Domain labels and formatting

`lib/data-mappers.ts:39-77` composes English role names, `Just now`, `min ago`,
and dates before the UI knows the locale. It also creates `Joined …` at
`lib/data-mappers.ts:120-123`. The profile and marketplace use fixed `en-IN`
`Intl` formatting (`features/profiles/public-farmer-profile.tsx:34-48` and
`app/marketplace/[listingId]/page.tsx:83-101`). These values must remain
structured until render time, then use the existing locale-aware helpers in
`lib/i18n/format.ts`. Stable codes such as account role, farming method,
category slug, listing unit, status, and moderation reason must map through
translation keys instead of being stored or compared by translated display
text.

### RTL and long-copy risks

`app/layout.tsx` correctly sets `dir` for Kashmiri, Sindhi, and Urdu, but
`app/globals.css` contains physical `left`, `right`, `margin-left`,
`padding-left`, `border-left`, `border-right`, and fixed left/right alignment.
Examples include the desktop rail at lines 2571-2579, search controls at
2918-2923 and 4186-4191, conversations at 3111-3134, and the public profile
offset at 3580. These must become logical properties (`inset-inline-*`,
`padding-inline-*`, `border-inline-*`, `margin-inline-*`, `text-align: start`)
except where physical positioning is deliberately visual. All translated
controls must wrap at 200% zoom and long scripts; user-authored blocks require
`dir="auto"`.

### Test weaknesses and required gates

Seventeen localization-related test files (69 tests) and `tsc --noEmit` passed
before remediation. That proves parser/catalog shape and isolated actions, not
user-visible localization. `tests/language-selector.test.tsx:25-46` checks only
option counts. No test selects Hindi, resolves the server action, verifies
`router.refresh`, reloads, or asserts translated route content. The public
profile test explicitly expects English. There is no all-locale route smoke or
browser RTL journey.

Required new gates are:

1. catalog key/interpolation parity plus no accidental English fallback;
2. static or component coverage preventing new hard-coded platform copy;
3. selector action, optimistic state, failure rollback, cookie persistence,
   profile restoration, and reload tests;
4. server and client render tests for every namespace;
5. all 23 locales smoke-render shared header, auth, onboarding, app shell,
   public profile, marketplace, and legal pages;
6. functional browser runs in English, Hindi, Marathi, one long-script locale,
   and one RTL locale, at desktop/mobile and 200% zoom;
7. no horizontal overflow, correct `lang`/`dir`, original-language user content,
   and logical layout assertions.

### New acquisition requirement boundary

The product owner additionally requested finding potential Farmers, Customers,
and others through social media or YouTube, locating phone/email, sending an
invite, and preparing a sample profile from public information. The repository
already enforces a consent-first acquisition boundary: social/YouTube URLs are
hard no-fetch inputs, visible contacts are provenance evidence rather than
permission, provider delivery is disabled, and no real contact is authorized.

The safe extension is an approved-source discovery pipeline that creates a
private, clearly `Unclaimed preview`, records every source URL and extracted
fact, never copies third-party media or infers private contacts, and releases a
claim invitation only through an approved consent/provider path. Claim requires
contact verification; the recipient can inspect sources, edit, decline, delete,
and enter durable suppression. No preview becomes a public member profile or
inherits a trust badge before claim. This is recorded as proposed FB-REQ-014;
implementation and real sending remain outside the localization remediation
and require product-owner clarification plus the existing external release
gates.

## Inc direct-sourcing audit — 2026-08-11

The product owner selected `Incs` as the customer-facing name for food
processors and other industries that depend on farmers. The friendly label
must not overwrite or imply a legal form: an Inc profile can represent a
company, partnership, cooperative, FPO, institution, government body, or other
supported organization, while the exact registration type remains private or
displayed only when verified and intentionally disclosed.

The existing agriculture foundation already covers much of the supply-side
model. `agri_business` is a supported account role; organizations have
owner/admin/editor/enquiry-agent memberships, public/private fields, sector and
service-area relations, draft/published states, moderation, verification
requests, and RLS. The catalog already includes `processor_exporter`, `Food
processing and value addition`, `Processors and exporters`, and retail,
hospitality and institutional buyers. Offers and signed-in enquiries provide a
safe conversation primitive.

The missing part is buyer-side procurement. Existing offers advertise what an
organization supplies; they do not express what an Inc wants to buy from
farmers. The new bounded object should therefore be a sourcing request, not an
overloaded product offer. Its structured fields are organization, agriculture
category, plain-language product/variety, quality/grade and certification
requirements, quantity and unit, one-time or recurring cadence, expected
price/quote model, delivery or collection location, open/close/need-by dates,
payment terms, content locale, publication state, moderation state, and
auditable timestamps. Farmer responses should reuse private enquiry/
conversation patterns without publishing either party's email or phone.

Farmer-dependent industries should extend the sector catalog with at least
grain milling and flour, edible oils, dairy processing, meat/poultry/egg
processing, seafood processing, fruit/vegetable processing, beverages,
spices/condiments, animal feed, textiles/fibres, natural rubber, tobacco where
legally permitted, bioenergy/ethanol/biomass, natural ingredients/cosmetics,
pharma/herbal inputs, paper/agri-residue packaging, retail/hospitality,
institutional procurement, and exporters. Stable slugs remain untranslated;
display names use the locale catalog.

Verification must issue separate claims rather than a generic tick:

- contact channel controlled;
- representative authorized for the organization;
- organization registration matched through a deterministic registry/provider;
- GST registration matched where applicable;
- official domain controlled;
- facility or establishment matched;
- relevant licence matched (for example FSSAI for covered food businesses);
- payment-name/bank ownership matched if enabled later;
- sourcing request reviewed for permitted goods, truthful commercial terms,
  and category/licence compatibility.

An AI agent may extract, normalize, compare, and route evidence, but may not
approve a badge or sourcing request. Raw documents stay private with bounded
retention; public pages show the claim name, verifier class, decision date and
expiry rather than document numbers. A verified organization claim does not
promise product quality, solvency, payment, order volume, or FarmerBook
endorsement. Low confidence and mismatches fail closed.

## Farmer produce taxonomy expansion audit — 2026-08-12

### Product-owner clarification and scope

The product owner clarified FB-REQ-003: Farmers must see a much broader set of
categories, explicitly including vegetables, fruits, milk, meat and other farm
produce, and must be able to enter a missing food category or produce name.
“All possible” cannot truthfully mean an immutable enumeration of every crop
variety, animal breed, fish species, regional spelling and processed SKU. The
correct boundary is a broad, stable crop/species/product catalog for practical
discovery plus a safe custom path for the long tail. Cultivar, breed, grade and
local variety remain attributes or free text; they must not create thousands of
near-duplicate top-level categories.

This change concerns identity, discovery and selection. Merely selecting
`meat`, `raw milk`, another regulated food or an industrial crop must not
automatically authorize its sale. Marketplace eligibility, food-business
licensing, animal-health rules and Inc sourcing verification remain separate
capability checks.

### Authoritative coverage sources

The catalog should be a FarmerBook usability layer aligned with, but not a
verbatim copy of, official statistical and regulatory taxonomies:

- [FAO agriculture classification methods](https://www.fao.org/statistics/methods-and-standards/agriculture/en)
  distinguish the crop being grown from the commodity it produces and describe
  a 776-item commodity list. That is authoritative evidence that crop and
  product concepts should remain distinct, but 776 statistical items would be
  unusable as one onboarding checklist.
- The [National Horticulture Board nursery system](https://nnp.nhb.gov.in/)
  reports 80 fruit crops, 26 vegetable crops, 17 flower crops and 15 spice
  crops, while the [NHB area/production data](https://nhb.gov.in/statistics/area-production-statistics.html)
  includes concrete Indian crops such as aonla, ber, citrus types, custard
  apple, guava, jackfruit, litchi, papaya, pineapple, sapota, gourds, brinjal,
  cabbage, cauliflower, root/tuber crops and mushrooms. The current six-choice
  production form is therefore materially incomplete.
- [Agricultural Statistics at a Glance 2024–25](https://desagri.gov.in/wp-content/uploads/2024/11/Agricultural-Statisitcs-at-a-Glance-2024-25_%E0%A4%95%E0%A5%83%E0%A4%B7%E0%A4%BF-%E0%A4%B8%E0%A4%BE%E0%A4%82%E0%A4%96%E0%A5%8D%E0%A4%AF%E0%A4%BF%E0%A4%95%E0%A5%80-%E0%A4%8F%E0%A4%95-%E0%A4%9D%E0%A4%B2%E0%A4%95-2024%E2%80%9325.pdf)
  and the Directorate of Economics and Statistics identify the principal
  cereals, pulses, nine oilseeds, fibre and commercial crops used in Indian
  production statistics.
- [ICAR Horticultural Science](https://www.icar.gov.in/en/horticultural-science/horticultural-division)
  explicitly covers fruit, vegetables, plantation crops, tubers, flowers,
  medicinal/aromatic plants, spices and mushrooms. These are durable subgroup
  boundaries for the picker.
- The Department of Animal Husbandry and Dairying's
  [Animal Husbandry Statistics](https://www.dahd.gov.in/schemes/programmes/animal-husbandry-statistics)
  defines milk, meat, eggs and wool as the four major livestock products. They
  must be first-class produce choices rather than inferred from `dairy cattle`
  or `layer farming`.
- The Department of Fisheries'
  [hatchery and seed guidance](https://www.dof.gov.in/static/uploads/2025/09/117559da68d3a380ac278dc9ae1c0fd0.pdf)
  distinguishes Indian major carps, other carps, catfish and cultured species;
  its annual reporting also covers inland/marine capture, freshwater,
  brackish-water and marine aquaculture, shrimp, molluscs and seaweed.
- [FSSAI's Food Category System](https://fssai.gov.in/upload/uploadfiles/files/Chapter3.pdf)
  supplies the user-recognizable food group boundary: dairy, fats/oils,
  fruit/vegetables (including mushrooms, roots/tubers, pulses, seaweed, nuts and
  seeds), cereals, meat/poultry, fish/shellfish, eggs, honey and spices.
- [APEDA product categories](https://apeda.gov.in/product-categories) and its
  [animal-products overview](https://apeda.gov.in/AnimalProducts) confirm the
  commercial relevance of fresh produce, cereals, dairy, poultry, buffalo
  meat, sheep/goat meat, eggs, honey, floriculture, medicinal plants, cashew,
  groundnut, guar and sugar products to Indian growers and buyers.

The resulting FarmerBook catalog should cover common primary and farm-gate
products, not bakery, confectionery or arbitrary prepared-food SKUs. Common
minimal farm processing such as jaggery, honey, dried spices, fibre, wool,
compost and nursery material can remain because Farmers may directly produce
them. Prohibited wildlife products, narcotic/controlled crops without a clear
lawful FarmerBook use, private/sensitive traits and unsafe sales claims stay
out of the curated list.

### Current application and data flow

`lib/agriculture/categories.ts:1-151` is the application catalog. It currently
contains 91 nodes, 85 selectable entries and only 38 commodity entries. Its six
roots are crop cultivation, horticulture, livestock, poultry,
fisheries/aquaculture and allied activities. The broad roots are sound, but the
commodity layer is sparse: six fruit entries, five vegetable entries, no
first-class milk/meat/egg/wool outputs and only three specific seafood groups.
The `translationKey` property is generated but never consumed.

`features/onboarding/category-picker.tsx:1-214` already provides the correct
core interaction for the canonical flow: searchable curated slugs, at most 20
choices, up to three custom labels, Unicode normalization, duplicate detection,
Indian-script support and removal. `lib/agriculture/normalization.ts:1-70`
rejects control/bidi characters, URLs, email, phone numbers, social handles and
advertising copy. The gaps are that search inspects only English `name`, all 85
items are flattened under six roots, labels are not localized, and the custom
control is named “activity” even when the user means a product.

The default production path does not use that picker. With canonical and
resumable flags false, `app/onboarding/page.tsx:17-39` renders
`features/profiles/onboarding-form.tsx`. Its third step offers only Tomato,
Onion, Grapes, Pomegranate, Okra and Millets. It writes display strings to the
legacy `profiles.crops` array, which is limited to eight values by
`features/profiles/schemas.ts:84-125` and the legacy completion RPC. This is the
specific user-visible defect.

The canonical database model is substantially stronger. Migration
`20260809120000_agriculture_ecosystem_foundation.sql:101-421` creates stable
category slugs, profile affinities, private custom-category requests,
moderation status and profile/custom affinity links. It limits a participant to
three pending custom requests and applies RLS. Migration
`20260809130000_agriculture_organizations_and_offers.sql:2725-2800` finalizes
curated and custom selections transactionally. One semantic defect remains:
custom onboarding labels are inserted with domain `farming_activity` even when
the label is a product/commodity.

Other relevant surfaces are inconsistent:

- `features/profiles/profile-settings-form.tsx:184-197` exposes one comma-
  separated crops input. It accepts a custom value but provides no catalog,
  aliases, grouping or duplicate guidance.
- `features/marketplace/business-dashboard.tsx:458-464` already lets a Farmer
  type any crop and variety. Custom listing produce therefore exists, but the
  user receives no comprehensive suggestions and the listing stores no stable
  category slug.
- `features/marketplace/schemas.ts:7-8` permits bounded crop and variety text.
  This should remain backward compatible; taxonomy suggestions must not erase
  legitimate regional produce.
- Canonical onboarding, Inc sourcing, the managed profile agent and outreach
  agent consume category slugs. Adding slugs requires an additive database
  migration and coverage tests; applied migrations must not be rewritten.

The current paths are:

```text
Default production onboarding
  six hard-coded labels -> crops text[<=8] -> profile/search/listing display

Canonical local onboarding (flags off in production)
  curated slugs + custom labels -> draft JSON -> finalize_onboarding()
      -> profile_category_affinities
      -> custom_category_requests -> moderation/merge

Required compatible result
  localized grouped catalog + aliases + safe custom produce
      -> legacy: bounded display labels in crops[]
      -> canonical: stable slugs / commodity custom requests
      -> settings and listings: suggestions without blocking the long tail
```

### Recommended catalog boundary

The practical target is at least 200 selectable entries, with explicit
coverage and searchable aliases across these subgroups:

1. cereals, millets and pseudocereals;
2. pulses and beans;
3. oilseeds and oil-bearing crops;
4. sugar, fibre, commercial, industrial, fodder and forage crops;
5. tropical, subtropical, temperate, arid and vine fruits plus nuts;
6. fruiting, leafy, cole, bulb, root/tuber, gourd, pod and specialty
   vegetables;
7. mushrooms and fungi;
8. spices, condiments, herbs, medicinal and aromatic plants;
9. plantation and beverage crops, flowers and nursery/seed material;
10. livestock species and outputs, explicitly cow/buffalo/goat/other milk,
    dairy produce, sheep/goat/buffalo/pig/rabbit meat, wool and manure;
11. poultry species and outputs, explicitly chicken/duck/quail/other eggs and
    poultry meat;
12. inland/marine capture, aquaculture systems, carps, catfish, tilapia,
    cold-water fish, shrimp/prawn, crab/lobster, molluscs and seaweed; and
13. honey/beeswax, silk, lac, compost/vermicompost, agroforestry produce and
    common farm-gate value addition.

Individual varieties such as Basmati cultivars, Alphonso mango, Gir cattle or
a precise fish strain belong in aliases/variety/breed fields, not as globally
stable top-level categories. A curated `Other …` option does not replace the
custom input; the custom label remains visible to its owner and enters the
existing review/merge workflow in canonical mode.

### Architecture and compatibility constraints

The application catalog should add search aliases and selection contexts while
preserving every existing slug. A commodity can be shown in profile,
marketplace suggestion and sourcing contexts; an activity such as hydroponics
belongs on profiles but is not itself saleable produce. The display label must
come from a typed `agricultureCategories` message namespace for English, Hindi
and Marathi, while aliases search both canonical and localized names. Existing
20 disabled Beta locales may inherit English until their broader translation
program is complete; they must remain disabled.

The legacy production-compatible path must cap curated plus custom values at
eight and continue sending the existing `crops` payload. It can map selected
slugs to canonical labels and keep unknown existing labels as custom values,
so no profile data disappears. The canonical path may retain its 20 curated +
3 custom bounds. An additive SQL migration must insert only new slugs and
correct translation keys/custom commodity semantics without dropping or
renaming existing records.

The picker requires nested/collapsible subgroups, selected chips, visible
counts, keyboard-operable search and a no-result route directly to “Add your
own produce.” Rendering 200+ unchecked controls at once is not a usable “all
categories” solution. Search must match aliases such as brinjal/eggplant,
ladyfinger/okra, arhar/tur/pigeon pea and regional English spellings, while
duplicate normalization prevents the alias from being re-added as custom.

### Required verification

Tests must prove catalog uniqueness/connectivity, old-slug preservation,
commodity/activity contexts, representative coverage for every official group,
localized and alias search, keyboard selection, combined limits, safe custom
Indian-script input, contact/advertising rejection, legacy payload mapping,
unknown-label preservation, settings editing, free custom listing produce,
additive migration coverage and canonical custom-domain correctness. Full
TypeScript, ESLint, Vitest, production build and available Supabase SQL/RLS
rehearsals remain required. Production migration, flag changes and deployment
need separate approval.

## Known Farmer Intake, Google-assisted research and YouTube discovery — 2026-08-12

### Product requirement and non-negotiable interpretation

The product owner wants a dedicated `Known Farmer Intake` for Farmers personally
known to FarmerBook. The private draft should draw on Google research, YouTube
search and other public professional material, and every resulting Farmer
profile should have associated social-media links.

The implementable interpretation is:

1. FarmerBook performs a social-discovery pass for every known-Farmer intake.
2. A social URL becomes a proposed profile link only when the evidence says it
   is the Farmer's own account. A news channel's video about a Farmer remains a
   citation, not that Farmer's YouTube profile.
3. A known-Farmer draft can remain saved as `research_incomplete` when no
   owned social account is found, but it cannot become ready for public-profile
   publication until the Farmer approves at least one social link or supplies a
   replacement during onboarding. This must not invent an account or prevent
   the person from creating a private FarmerBook account.
4. Personal familiarity is a private relationship/identity-disambiguation
   signal. It is not permission to contact, publication consent, a social OAuth
   proof, an identity badge or a Farmer-role badge.

### Existing architecture that should be reused

The repository already has the correct private-draft backbone:

- `features/profile-agent/actions.ts:69-151` generates a sample through the
  named Durable Object, fingerprints it, stores it through a service-role RPC
  and starts the 14-day approval Workflow.
- `features/profile-agent/actions.ts:157-225` builds a sample from an existing
  outreach prospect, while `:250-438` implements the now-disabled Brave-only
  name search. The latter is too provider-specific but demonstrates the
  required reserve -> search -> qualify -> prospect -> sample -> completion
  transaction boundary and failure recording.
- `features/profile-agent/profile-builder.ts:47-76` currently converts any
  social-host source URL into a `socialLinks` value. It does not distinguish an
  owned account from a third-party page mentioning the Farmer. Known Farmer
  Intake must add that distinction before reusing this function.
- `features/profile-agent/profile-builder.ts:157-188` already instructs the
  model to treat evidence as untrusted data, omit sensitive attributes and
  require direct citations; `:244-293` rejects invented citation URLs and falls
  back deterministically on invalid output.
- `features/profile-agent/schemas.ts:31-77` bounds one sample to 1-12 HTTPS
  evidence items and `:81-136` bounds fields, claims and the fixed social-link
  set. Provider provenance is currently hard-coded to `brave_search`, and the
  evidence shape has no subject-association field.
- `supabase/migrations/20260811130000_managed_farmer_profile_agents.sql:21-100`
  stores private samples and citations with 30-day retention. The same
  migration keeps samples unique by outreach prospect and restricts search
  ledgers/provenance to Brave. A forward-only additive migration is required;
  the applied migration must not be rewritten.
- `supabase/migrations/20260811130000_managed_farmer_profile_agents.sql:700-835`
  exposes a sample only through an unexpired signed invitation and redacts it
  on rejection. `:837-970` copies approved fields into private onboarding only
  after invitation/account linkage and preserves values already supplied by
  the Farmer.
- `features/profile-agent/sample-preview.tsx:42-165` displays the private,
  `Not verified` preview, citations, limitations and whole-draft approve/reject
  decision. Social links are already visible in the review experience.
- `features/profiles/schemas.ts:40-74` validates optional HTTPS website,
  LinkedIn, Instagram, Facebook and YouTube links against official hosts;
  `features/profiles/actions.ts:30-121` writes them in onboarding/settings;
  `features/profiles/public-farmer-profile.tsx:506-523` renders approved links
  on the public profile. Missing social links currently render an empty row.
- `features/outreach/source-policy.ts:3-43` deliberately prevents direct fetches
  of YouTube and protected social pages. `features/outreach/actions.ts:38-153`
  instead accepts operator-supplied visible descriptions/screenshots while the
  bounded website fetcher handles ordinary public sites. This no-scrape
  boundary remains applicable.
- `app/(product)/admin/outreach/page.tsx:13-36` and
  `features/outreach/outreach-console.tsx:102-173` expose the current Brave-only
  control. A separate `/admin/known-farmers` route will keep relationship-led
  intake distinct from consent/delivery operations while linking back to the
  existing prospect ledger.

### Google Search interface findings

Official Google documentation now makes three superficially plausible options
unsuitable for automated retained profile discovery:

1. [Custom Search JSON API](https://developers.google.com/custom-search/v1/overview)
   is closed to new customers. Existing customers have only until 2027-01-01,
   so FarmerBook cannot responsibly add it as a new long-lived dependency.
2. [Programmable Search Engine whole-web configuration](https://support.google.com/programmable-search/answer/12397162)
   stopped accepting new whole-web engines on 2026-01-20; existing whole-web
   engines also end on 2027-01-01. New engines are limited to up to 50 selected
   domains, which does not satisfy open public-profile discovery.
3. [Gemini API Grounding with Google Search terms](https://ai.google.dev/gemini-api/terms)
   require grounded results and search suggestions to be displayed together to
   the requesting end user and explicitly prohibit programmatically collecting
   links or using links to build an index/database or identify pages to crawl.
   It therefore cannot feed FarmerBook's persisted cited-profile pipeline.

The compliant Google-assisted workflow is operator-driven: FarmerBook builds a
bounded exact-name/agriculture/location query, opens a normal Google Search in a
new tab (and offers copy-query), and the administrator selects destination URLs
after visually checking the identity match. FarmerBook stores/fetches only the
chosen destination page under its own permitted-source policy; it does not
scrape, proxy, copy or retain Google's result page/snippet, and it does not call
Gemini grounding to collect links. Provenance should say
`manual_google_review` plus a query hash, not imply a Google API result licence.

### YouTube Data API findings

YouTube discovery can use the documented API rather than scraping:

- [`search.list`](https://developers.google.com/youtube/v3/docs/search/list)
  supports a bounded keyword query, `type=channel,video`, `regionCode=IN`,
  `relevanceLanguage`, `safeSearch=strict` and up to 50 results. FarmerBook
  should request at most 10 and retain/display no more than five candidates.
- Google's current [quota calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
  gives new projects a separate default bucket of 100 `search.list` calls/day,
  one unit per call, while `channels.list` costs one ordinary unit. FarmerBook
  needs database-owned per-administrator and project-wide headroom before any
  provider call.
- [`channels.list`](https://developers.google.com/youtube/v3/docs/channels/list)
  can resolve an exact channel ID or handle and returns the canonical ID,
  title, description and custom URL. Search results should be presented as
  candidates; no result should be auto-associated solely because its title
  resembles the Farmer's name.
- [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies)
  prohibit scraping and storing audiovisual content, require YouTube-specific
  attribution when displaying API results, and require limited non-authorized
  API data to be deleted or refreshed within 30 days. The existing 30-day
  private-sample lifetime fits this constraint. The intake must store no video,
  audio or copied thumbnails, and any YouTube candidate UI must show explicit
  YouTube attribution.

A channel result may be classified as `owned_social_profile` only through an
administrator selection that is subsequently approved or replaced by the
Farmer. A video or third-party channel mentioning the Farmer is
`third_party_coverage` and can support profile facts but never populates the
Farmer's YouTube link. No follower/subscriber/view statistic is needed or
stored.

### Required data-flow separation

```text
Admin supplies known identity hints and confirms relationship basis
        |
        +--> Open/copy bounded Google query
        |       -> admin chooses destination URL(s)
        |       -> safe ordinary-site fetch OR operator description/screenshot
        |
        +--> Official YouTube API search
                -> <=5 attributed channel/video candidates
                -> admin labels owned account vs third-party coverage
        |
        v
Private known-Farmer research session (admin/service only, 30-day expiry)
        -> deduplicated cited evidence, association and provider provenance
        -> at least one professional source
        -> social-discovery completed
        -> at least one proposed owned social URL before ready-to-invite
        |
        v
Existing outreach prospect + managed private `Not verified` sample
        -> signed consent-bound review invitation
        -> Farmer approves/rejects and can replace links in onboarding
        -> authenticated claim, still private until onboarding/public opt-in
```

Google/manual discovery and YouTube discovery must remain independent provider
steps. A YouTube outage or exhausted quota must not discard already curated
website evidence. Duplicate URLs must collapse by normalized destination URL
and source hash. Conflicting same-name evidence must remain unselected and the
sample builder must never resolve ambiguity by guessing.

### Proposed private persistence boundary

Use a new additive migration rather than overloading the Brave-only ledger:

- `known_farmer_intakes`: administrator, subject name, location/farming hints,
  locale, bounded relationship basis (no public relationship note), state,
  prospect/sample links, idempotency key, 30-day expiry and timestamps.
- `known_farmer_source_candidates`: intake, canonical destination URL, source
  type, title/excerpt/hash, discovery method (`manual_google_review`,
  `youtube_data_api`, `operator_supplied`), subject association
  (`owned_social_profile`, `third_party_coverage`,
  `professional_reference`), selected/rejected state, provider item ID/query
  hash, collection/refresh/expiry timestamps and a uniqueness constraint.
- service-only candidate writes plus narrowly authenticated administrator RPCs;
  `anon` and ordinary `authenticated` users receive no table access. Existing
  sample/invitation RPCs remain the only farmer-facing review boundary.

The final build action converts selected candidates into the existing 1-12
evidence format, creates exactly one outreach prospect with no contacts, saves
one managed sample and links the intake to both in one idempotent flow. Provider
and association fields must also be added to stored sample-source provenance.

### Social-link completion and compatibility

Do not globally change `profileSchema` to require a social URL: that would make
legacy Farmers with no social account unable to edit unrelated profile fields.
Instead:

- every public Farmer profile always renders a social section;
- missing links render an honest `No farmer-approved social links yet` state;
- Known Farmer Intake may be saved without a match but cannot move to
  `ready_for_invitation` without one proposed owned social URL;
- onboarding must ask the invited Farmer to confirm, remove or replace the
  proposed link before public-profile enablement;
- an approved URL is a linked account, not `Social presence verified` or
  `Identity verified`; only provider OAuth or another approved deterministic
  method can create those claims.

The currently supported public link set (LinkedIn, Instagram, Facebook and
YouTube, with website separate) is enough for this tranche. Broader X/Threads/
TikTok profile columns and external-post embeds remain part of FB-REQ-012 and
should not be pulled into this intake implementation.

### Required verification

Tests need to cover bounded Google query/link construction without any Google
fetch; YouTube configuration, query limits, attribution, response-size/timeout,
401/403/429/malformed/no-match handling and no retry; exact-name/agriculture
filtering; 30-day retention; owned-account vs coverage mapping; social-link
readiness; multi-source deduplication; same-name ambiguity; idempotent quota
reservation and build; service-only/RLS protection; sample citation integrity;
signed preview/claim preservation; missing-social public UI; no contact/outbox
creation; no provider call when feature/database controls are off; and full
TypeScript, ESLint, Vitest, build plus executable PostgreSQL/pgTAP evidence.

Provider account creation, API-key installation, real-person searches,
production migrations, release-control changes, invitations, messages and
deployment remain separate production mutations requiring explicit approval.

## Featured Farmer editorial profiles — scope correction research (2026-08-12)

### Corrected product intent

The product owner's correction changes the entity and the publication purpose,
not merely the label. FarmerBook should select farmers whose work is publicly
documented as significant, research them through Web Search, YouTube and other
permitted public sources, and publish beautiful, citation-backed editorial
stories. A personal relationship with FarmerBook is not an eligibility
requirement. The output is not an automatically created FarmerBook member
account, not an outreach prospect, and not proof of identity, farmer status,
endorsement or consent.

The previous FB-REQ-017 implementation is therefore the wrong downstream model:

- `features/profile-agent/known-farmer-schemas.ts:8-55` makes one of four
  personal-relationship bases and `relationshipConfirmed: true` mandatory.
- `features/profile-agent/known-farmer-console.tsx:26-37` presents relationship
  labels, while `:354-368` calls relationship attestation the first stage and
  prevents intake without it.
- `supabase/migrations/20260812140000_known_farmer_intake.sql:346-410`
  enforces that relationship again in the database, so changing UI copy alone
  would leave the product behavior wrong.
- `features/profile-agent/known-farmer-actions.ts:500-631` turns selected
  research into an `outreach_prospect`, a managed member-style profile sample
  and an approval Workflow. That creates an acquisition/claim pipeline rather
  than an editorial publishing workflow.
- `features/profile-agent/schemas.ts:144-199` and
  `features/profile-agent/profile-builder.ts:103-179` can express only a short
  member profile (headline, 500-character bio, crops/method/experience and
  links). They cannot express the reason the person is featured, milestones,
  sourced impact, long-form story sections, media rights or corrections.
- `features/profiles/public-farmer-profile.tsx:92-249` assumes the subject is a
  FarmerBook participant and offers connection, buyer-enquiry and marketplace
  actions. Reusing `/profile/[handle]` for an unclaimed editorial subject would
  falsely imply membership and platform activity.

Useful parts should be retained: bounded manual Google queries, the official
YouTube search adapter, destination-source review, explicit owned-account
classification, strict URL policy, private candidate storage, citations,
retention, RLS, quota reservation, and fail-closed provider behavior.

### Search and provider boundary

Current official provider material confirms the earlier technical conclusion:

- [Google Custom Search JSON API](https://developers.google.com/custom-search/v1/overview)
  is unavailable to new customers; existing customers must migrate by
  2027-01-01. It is not a viable new FarmerBook dependency.
- The official [YouTube `search.list` reference](https://developers.google.com/youtube/v3/docs/search/list)
  supports bounded channel/video discovery. The current implementation already
  limits result count, text, timeout and retained fields, and it should remain a
  candidate finder rather than an automatic fact source.
- [Tavily Search](https://docs.tavily.com/documentation/api-reference/endpoint/search)
  exposes bounded results, domain filters, India boosting and optional cleaned
  content, but its [service terms](https://www.tavily.com/terms) make API use,
  customer-application distribution and third-party processing subject to the
  applicable order and terms. It remains a separately approved provider option,
  not a dependency silently added by this correction.

The first implementation can therefore satisfy “use Web Search” without a new
provider account: FarmerBook generates several research queries, opens Google
for operator review, accepts only selected destination URLs, and uses the
official YouTube adapter for YouTube candidates. Search result snippets are
discovery hints, never stored as facts. The selected destination page is opened
and reviewed before its public statements can support a claim. A future
provider adapter can automate candidate discovery behind the same source and
retention contract after explicit provider approval.

Recommended query families for each subject are:

1. identity and farming: exact name + farmer/agriculture + district/state;
2. significance: exact name + innovation/award/impact/community/technique;
3. institutions: exact name + FPO/cooperative/ICAR/KVK/government/award body;
4. social presence: exact name + YouTube/Instagram/Facebook/LinkedIn;
5. contradictory or current information: exact name + latest/year and the
   principal achievement claim.

The query family and hash should be recorded, but the Google result page and
snippet should not be retained. The administrator records the destination URL,
publisher, visible title, publication date when available, accessed date and a
short evidence excerpt. Ordinary permitted sites may use the bounded existing
fetcher; protected social sites remain no-fetch and require operator-reviewed
visible text.

### Editorial significance standard

“Significant work” needs an auditable editorial threshold rather than an AI
popularity score. A profile becomes review-ready only when all of these hold:

- the subject is consistently identified as a farmer by the selected evidence;
- at least two non-social professional sources on different publisher domains
  support the work, including at least one government/institutional/award record
  or independent editorial source;
- at least two displayable significance claims are each connected to a source;
- one or more signals cover documented innovation, measurable farm/community
  impact, recognized achievement, knowledge sharing, ecological stewardship,
  farmer leadership, or a practice adopted beyond the subject's own farm;
- at least one supported Farmer-owned social account is manually confirmed;
- every number, award, date and named organization has a direct citation;
- conflicting claims are resolved, qualified or omitted; and
- no follower count, search ranking, single promotional page or FarmerBook
  relationship is sufficient by itself.

This is a checklist, not a public score or badge. “Featured by FarmerBook” means
an editorial selection only. It must not appear as `Verified`, `Identity
verified`, `Farmer-role verified`, a government recognition or a commercial
endorsement.

### Separate editorial content model

Create a clean editorial domain instead of extending the member profile:

```text
featured_farmer_research
  -> source_candidates (private discovery and review)
  -> story draft + structured claims (private)
  -> explicit editorial review/publish action
  -> immutable public snapshot at /featured-farmers/[slug]
  -> correction, withdrawal, or optional link to a later claimed member profile
```

The minimum structured profile is:

- identity: full name, public district/state, authored locale and canonical slug;
- editorial framing: headline, short deck and “Why FarmerBook is featuring
  this farmer” statement;
- story: origin/context, the work or practice, documented impact and what other
  farmers can learn, stored as bounded ordered sections rather than one opaque
  generated HTML blob;
- impact facts: bounded label/value/context triples, each backed by one or more
  citations;
- milestones: optional dated title/body/source entries;
- agriculture focus: canonical FarmerBook categories and optional bounded tags;
- social links: at least one manually confirmed owned YouTube, Instagram,
  Facebook or LinkedIn account; third-party videos/posts remain coverage;
- media: optional Farmer image only with an explicit rights basis, credit and
  source/permission record; otherwise use FarmerBook's designed crop/initial
  fallback rather than copying or hotlinking a Web Search image;
- publication: draft/review-ready/published/withdrawn state, creator, reviewer,
  first-published date, last fact-check date and revision;
- disclosure and remedies: “FarmerBook editorial profile,” “not a member
  profile unless marked claimed,” source list, support-email correction/removal
  link and optional claimed member-profile link.

Claims should be first-class rows with type, statement, display order and
source joins. A generated story may only reference approved claim IDs; it may
not cite a URL the editor did not select. Publishing should snapshot the exact
approved story, claims, sources, social links and media metadata so later search
results cannot silently alter a live page.

### Public information architecture and visual direction

Do not serve these pages from `/profile/[handle]`. Use:

- `/featured-farmers` — an index of published editorial stories;
- `/featured-farmers/[slug]` — one indexable editorial profile;
- `/admin/featured-farmers` — private research, drafting and review;
- `/admin/known-farmers` — redirect to the new workspace with no new personal-
  relationship intake, while existing disabled private records remain intact.

The public page should use the existing Deccan editorial system instead of the
member dashboard layout:

```text
editorial disclosure + last fact checked
large story hero (rights-cleared photo or designed crop fallback)
name + story headline + location + owned social buttons
"Why featured" statement
sourced impact facts
long-form story sections
practice/focus chips + milestone timeline
selected interviews/coverage
numbered sources
correction / removal / claim pathway
```

The current cream/forest/terracotta/turmeric tokens and public profile card CSS
in `app/globals.css:4190-4368` are reusable, but member-only modules—followers,
listings, reviews, identity card, connection and buyer-enquiry CTAs—must not be
shown. The page should remain attractive with no licensed subject photograph by
using the existing crop imagery, typography, shaped color fields and initials.

Google's current `ProfilePage` structured-data guidance describes people who
are affiliated with the site and share first-hand perspectives. An unclaimed
editorial subject is not necessarily affiliated, so the editorial page should
not use member `ProfilePage` semantics. Schema.org's
[Article](https://schema.org/Article) model supports `about`, `citation`,
`datePublished`, `dateModified`, `correction` and `publishingPrinciples`; use an
`Article` about a `Person`, with confirmed official accounts in `sameAs`, until
the farmer claims a real FarmerBook member profile.

### Privacy, accuracy and correction boundary

The final Indian [Digital Personal Data Protection Rules, 2025](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa)
and the [DPDP Act, 2023](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf)
make the data-governance boundary current and release-sensitive. This research
does not make a legal determination about publishing any named person. Before
production, FarmerBook needs named privacy/editorial ownership and counsel or
policy review for the intended public-interest/editorial basis, notice,
correction/removal handling and retention.

Irrespective of legal basis, the product should exclude phone/email, exact home
or farm address, IDs, land records, family details, caste, religion, health,
politics, wealth estimates and inferred private traits. Display district/state
only when directly supported. Keep source excerpts private and bounded; public
pages show short claim citations and outbound originals, not copied articles.
Profiles should be fact-checked at publication and at least annually, with
faster review when a source disappears or a correction is requested.

### Migration and compatibility constraints

The old known-Farmer migration has been committed and rehearsed locally but is
not deployed. Preserve it as disabled historical/private data and add a new
forward migration for editorial tables and RPCs. This avoids rewriting migration
history or incorrectly turning old relationship/intake records into public
stories. The new feature gets its own default-off Worker flag and database
release control; it does not require the outreach-agent gate and it creates no
prospect, consent, invitation, message, verification claim, member profile,
listing or public record before the explicit editorial publish RPC.

### Required verification

The replacement needs schema/action tests for source quality, significance
readiness, claim-to-source integrity, owned social URL rules, media rights,
idempotency, revision conflicts, publication snapshots, withdrawal and RLS. UI
tests must prove the public page is clearly editorial, omits member/commerce
signals, renders every citation/social link, has a correction path, supports a
no-photo fallback and is responsive and accessible. Metadata tests should prove
`Article` semantics and prevent unclaimed `ProfilePage`/verification markup.
Full TypeScript, ESLint, Vitest, production build, clean Supabase rebuild,
pgTAP/RLS, desktop/mobile Playwright and visual screenshot review are release
gates. Real-person research, subject selection, publication, provider accounts,
secrets, production migrations/flags and deployment remain separate actions.
## Private Farmer Contact Database and YouTube Discovery research — 2026-08-13

### Requested outcome

The product owner wants a private database of Farmer email addresses and phone
numbers, a YouTube Discovery Agent that finds farming-related channels, email
delivery now, and WhatsApp later. The database must remain private to the
product owner.

This cannot safely be implemented as “find YouTube channels, extract their
email/phone, and send invitations.” YouTube's current official developer-policy
guide explicitly lists full names or usernames and contact information,
including email and phone numbers, among data that an API client must not
harvest, derive, or store without the user's consent:

- https://developers.google.com/youtube/terms/developer-policies-guide
- https://developers.google.com/youtube/terms/developer-policies

The same policies require stored YouTube API data to be refreshed or deleted
after 30 calendar days, and require deletion within 30 days when authorization
cannot be verified. A public channel description therefore does not create a
permitted contact-harvesting pipeline or outreach consent. This is consistent
with FarmerBook's existing FB-REQ-007 through FB-REQ-010 consent boundary.

The compliant decomposition is:

1. a private, owner-scoped contact database populated only from direct signup,
   a partner campaign with recorded consent, an existing FarmerBook account,
   or an administrator import that includes verifiable channel/purpose consent;
2. a separate, read-only YouTube discovery view that uses the official API to
   show current agriculture-channel search results without extracting or
   persisting email/phone data and without adding a result to the contact
   database; and
3. the existing outreach provider path, which may send email only when the
   selected contact has active email consent for the FarmerBook invitation
   purpose. WhatsApp remains technically and operationally disabled.

### Existing implementation that should be reused

- `features/profile-agent/youtube-search.ts` already calls the official
  `search.list` endpoint with a server-side key, India region, relevance
  language, strict safe search, bounded response size, eight-second timeout,
  and fail-closed provider errors. It currently searches for a known named
  farmer and can be refactored around a shared bounded YouTube client.
- `features/outreach/contact-extractor.ts` can recognize email and Indian mobile
  patterns in operator-supplied evidence, but it must not be run over YouTube
  API responses for this feature.
- `features/outreach/processor.ts` and the outreach SQL outbox enforce consent
  at delivery time. The new database must promote only consented contacts into
  that path; it must not add a bypass or a second sender.
- `features/managed-agents/runtime.ts` supplies bounded schedules, durable state,
  duplicate-run protection, and automatic failure pause. It remains suitable
  for consented delivery and supervision. A scheduled discovery agent is not
  useful for the first release if its results cannot be harvested or retained
  as prospects, so the YouTube view should start on demand.
- `features/auth/require-admin.ts` identifies the authenticated administrator.
  `lib/supabase/admin.ts` supplies server-only service-role access. Together
  they can support an owner-filtered UI without granting browser access to
  private contact values.
- `supabase/migrations/20260809140000_outreach_agent.sql` already demonstrates
  service-only contact storage, value hashing, consent state, suppression,
  immutable evidence, and research purging. The new schema should reuse its
  consent/outbox system instead of weakening it.

### Official YouTube API boundary and cost

The official `search.list` method supports `q`, `type=channel`, `regionCode`,
`relevanceLanguage`, `safeSearch`, `maxResults`, and bounded page tokens:

- https://developers.google.com/youtube/v3/docs/search/list

The official `channels.list` method accepts a comma-separated batch of channel
IDs and can return the `snippet` resource; it costs one quota unit:

- https://developers.google.com/youtube/v3/docs/channels/list
- https://developers.google.com/youtube/v3/docs/channels

As of the June 2026 YouTube quota change, `search.list` has its own granular
daily call bucket and each call costs one unit. The default is currently 100
`search.list` calls per day, while ordinary read endpoints such as
`channels.list` use the general quota. FarmerBook should still impose a much
smaller internal budget: manual search, at most 10–25 channels per request, no
automatic pagination, and daily/monthly per-owner counters. A larger quota or
automated search schedule is unnecessary for the low-budget pilot.

### Proposed private contact model

The durable contact database should contain only consented or explicitly
attested records, not YouTube search results:

```text
farmer_contact_lists
  id, owner_id, name, purpose, created_at

farmer_contacts
  id, list_id, owner_id
  display_name
  encrypted_email, email_hash
  encrypted_phone, phone_hash
  acquisition_source
  source_reference
  consent_channel, consent_purpose, consent_state
  consent_text_version, consent_recorded_at, consent_expires_at
  review_state, suppression_state, last_contacted_at
  created_at, updated_at

farmer_contact_events
  contact_id, owner_id, event_type, bounded_metadata, created_at
```

Email and phone values should be encrypted in the application before database
storage using a dedicated Cloudflare secret, with keyed hashes for duplicate
detection. The web browser never receives a service-role key. Every query first
uses `requireAdmin()`, filters by `owner_id = administrator.id`, decrypts only
the rows needed for the page, and prevents other administrators from viewing or
exporting the product owner's list. PostgreSQL grants remain revoked from
`public`, `anon`, and `authenticated`; service-role functions and owner-checking
RPCs are the only access paths. Events are immutable and do not repeat the
contact value.

Accepted acquisition sources are `farmerbook_interest_form`,
`existing_farmerbook_member`, `partner_consent_campaign`, and
`manual_consent_import`. A manual import requires the administrator to record
how, when, through which channel, for which purpose, and under which consent
text the person opted in. `youtube_api` is deliberately not an acquisition
source for contact values.

### YouTube Discovery view

The first release should use an administrator-initiated server action rather
than a 24/7 crawler. It may store only the query hash, actor, quota reservation,
request time, provider outcome, and result count for audit/cost control. Search
items are returned for the current review screen and discarded when the request
ends. The page shows YouTube attribution and opens the original channel.

The service does not:

- extract or store a channel email, phone number, username, description, or
  subscriber/view metric in the Farmer contact database;
- scrape the channel `About` page or use browser automation;
- create an outreach prospect, consent, invitation, outbox item, profile,
  verification claim, comment, subscription, or message;
- combine YouTube API data with another source to infer identity or contact;
  or
- claim complete coverage of farming channels.

If FarmerBook later wants persistent YouTube candidate records or a scheduled
discovery agent, the product owner must first obtain a YouTube API compliance
review for the exact use case. Even after approval, non-authorized API data must
be refreshed or deleted within 30 days and remains isolated from contact
consent.

### Email and WhatsApp boundary

“Email supported now” means the database and UI can hand an active,
purpose-matched email-consent record to FarmerBook's existing approved provider
path. It does not mean that a public or YouTube-derived address may be sent an
unsolicited invitation. Production delivery still requires the verified sender,
provider credentials, signed webhook, unsubscribe/complaint processing, privacy
owner, retention decision, staged test evidence, and separate release approval
already recorded for FB-REQ-007 and FB-REQ-009.

WhatsApp remains absent from the schema's deliverable channels and from every
agent binding. A future tranche must use the official WhatsApp Business
Platform, require explicit WhatsApp opt-in, approved templates for
business-initiated messages, signed webhooks, STOP/withdrawal suppression, and
separate production approval. No WhatsApp Web automation belongs in the plan.

### Low-budget operating model

- YouTube discovery is on demand, not continuously scheduled.
- The existing Outreach Growth Agent remains event/schedule driven and wakes
  only for already-consented jobs.
- The existing Operations Supervisor runs once daily only after the production
  agent release is approved.
- Start with a private FarmerBook interest form and partner/FPO campaign so
  farmers submit their own email/phone and consent.
- No model call is required for contact extraction, deduplication, consent
  validation, or sending. AI may later assist with bounded draft translation,
  but deterministic controls decide eligibility.

### Verification and release gates

Implementation must prove owner isolation, encryption/decryption boundaries,
duplicate handling, consent evidence, expiry, withdrawal, suppression,
immutable events, no YouTube-to-contact promotion, no send without active
consent, provider failure closure, YouTube quota reservation, and transient
result handling. Final local gates are ESLint, TypeScript, focused Vitest,
production build, clean Supabase rebuild, pgTAP/RLS tests, desktop/mobile
Playwright, and `git diff --check`.

No provider key, encryption key, production migration, release flag, agent
schedule, external search, real contact import, email, WhatsApp message, or
deployment is authorized by this research checkpoint.

## Bounded farming-channel research workspace — 2026-08-14

### Requested outcome and research method

The product owner supplied `https://www.youtube.com/@RythuBadi` as a seed and
asked for multiple agents to repeatedly discover farming channels, parse farmer
details from video descriptions, store those details in the Farmer database,
and expose them in an administrator-only UI. Three read-only research agents
audited the live seed, the database/security boundary, and the admin UI in
parallel. The live-source agent then performed a second privacy/compliance pass
over its first findings. No application code, database row, secret, deployment,
message, or production state changed during this checkpoint.

The bounded live sample covered 20 recent long-form uploads plus one older
video and two description-linked videos. It found seven descriptions that
explicitly presented an individual as a farmer, three organization/equipment
subjects, and two separately mentioned experts or farmers. Phone and email
strings were redacted in memory and were not retained in this document. The
sample found only the seed channel's own YouTube/social links, not a reliable
external-channel graph. This means description links are not a sufficient or
safe discovery graph and must never create an unbounded recursive crawl.

### Provider and privacy boundary

The current YouTube developer-policy guide says API clients must not harvest,
track, infer, derive, or store identifying information without consent, and it
explicitly lists full names/usernames and contact information. The policy also
requires non-authorized stored API data to be refreshed or deleted within 30
days when authorization cannot be verified:

- https://developers.google.com/youtube/terms/developer-policies-guide
- https://developers.google.com/youtube/terms/developer-policies
- https://developers.google.com/youtube/v3/docs/channels/list
- https://developers.google.com/youtube/v3/docs/playlistItems/list
- https://developers.google.com/youtube/v3/docs/videos/list

An administrator-only page does not change this provider restriction. Calling
a description claim `unverified` also does not make a stored identifying row
permissible. The product therefore needs two deliberately separate layers:

```text
approved seed channel
  -> official API, bounded pages and quota reservation
  -> transient attributed videos/descriptions (contact-redacted)
  -> anonymous agriculture tags and aggregate counts
  -> administrator selects independent evidence or records subject consent
  -> reviewed durable sourced-farmer research record

YouTube description
  -X-> named durable farmer row
  -X-> contact database / consent / outreach / member profile
```

The persistence classification is:

| Data | Allowed treatment |
|---|---|
| Current YouTube title, thumbnail, date, URL and redacted description | Attributed transient display; refresh or delete within the applicable 30-day window |
| Full name, handle, transliteration or channel-owner identity | Persist only from documented subject consent or an independently approved non-YouTube source |
| A named person tied to village, district, crop, acreage, practice or livestock | Persist only from consent or independently approved evidence |
| Individual income, yield or financial claims | Do not persist without consent and separate sensitive-data review |
| Phone, email, WhatsApp, home address or inferred private identifier | Exclude entirely; never store as a candidate |
| Crop/practice/actor counts detached from identity | Aggregate retention; suppress small location cells |
| Video provenance, scrubbed title, parser version and run status | Bounded refreshable provenance with retention enforcement |

The second source pass found independent non-YouTube support for the seed
channel's creator, one horticulture official, and two agricultural businesses.
Those are creator/expert/organization entities, not farmer records. It found no
reliable independent evidence for the sampled farmer identities. Consequently,
the first real run may populate transient source review and anonymous topic
aggregates, but it must create zero named durable farmer rows until independent
evidence or subject consent is added.

### Existing private Farmer database

The current domain is a consented contact store, not a research directory:

- `features/farmer-database/access.ts:6-25` requires the application flag, a
  configured non-demo deployment, `admin`, and exact equality with the founder
  owner UUID.
- `features/farmer-database/actions.ts:90-149` inserts only a validated contact
  with consent evidence; `types.ts:3-8` deliberately excludes YouTube as an
  acquisition source.
- `supabase/migrations/20260813120000_private_farmer_contacts.sql:52-143`
  requires encrypted email or phone and consent-specific state.
- The same migration's `:163-187` discovery table stores only query hashes and
  aggregate run metadata; `:756-800` revokes browser access and grants only the
  service role.
- `features/farmer-database/actions.ts:317-348` returns YouTube results with
  `retention: "request_only"` and never inserts a result item.
- `tests/private-farmer-contacts-migration.test.ts:34-47`,
  `tests/farmer-database-actions.test.ts:82-115`, and
  `supabase/tests/private_farmer_contacts_test.sql:79-99` protect that boundary.
- `docs/REQUIREMENTS.md:37`, `README.md:124-132`, and
  `docs/PRODUCTION_RUNBOOK.md:1123-1157` say the same thing operationally.

Inserting sourced people into `farmer_contacts` would therefore create false
consent semantics and violate current tests and release promises. The correct
model is a separate founder-only sourced-research domain which cannot link to
contacts, outreach, consent, outbox, member profiles, or public publications.

A related control gap should not be copied: several existing contact actions
perform service-role direct table writes after checking the application flag,
while only SQL RPC paths check the database release control. Every new sourced
research read and write should go through a database-control-aware RPC or an
equivalent server guard, in addition to founder authorization and owner scope.

### Existing source/provenance patterns

The Featured Farmer domain provides the strongest reusable evidence model:

- `supabase/migrations/20260812150000_featured_farmer_profiles.sql:20-150`
  records subject research, source URL/title/excerpt/hash, provider provenance,
  association, review decision, collection date, refresh date and retention.
- `features/featured-farmers/queries.ts:30-167` validates private research,
  sources, drafts, claims, social links and media separately.
- `features/featured-farmers/editorial-workspace.tsx:78-180` shows reviewable
  source cards and preserves third-party-versus-owned association.
- `features/profile-agent/sample-preview.tsx:43-190` provides a useful private,
  cited, unverified detail layout.

Those tables cannot be reused directly because Featured Farmers assumes a
known named subject, multi-source significance review, and possible public
editorial publication. The new domain is an administrator-only discovery and
evidence workspace with no publication state.

### Official bounded collection loop

Production must not parse YouTube HTML. The supported provider loop is:

1. Normalize a supplied handle/channel URL and call
   `channels.list(part=snippet,contentDetails&forHandle=...)` to resolve the
   stable channel ID and uploads playlist.
2. Page `playlistItems.list` in batches of at most 50, with a maximum number of
   pages per run and a durable last-seen video/checkpoint.
3. Batch at most 50 IDs into `videos.list(part=snippet,status)` for current
   canonical metadata.
4. Redact contacts before any UI/model boundary, discard raw payloads and raw
   descriptions, and derive only anonymous agriculture topics/actor counts.
5. Display videos transiently for administrator review. A named research row
   becomes eligible only after an independent HTTPS destination or documented
   subject consent is reviewed.
6. Stop on a known ID/date, quota limit, page limit, repeated cursor, explicit
   pause, or three consecutive failures. Retry only transient failures with a
   small capped backoff; never recursively follow arbitrary description links.
7. Refresh or delete provider metadata by 30 days and cascade removal of
   unsupported, unreviewed evidence.

The current environment contains no `YOUTUBE_DATA_API_KEY`; a real official-API
run is therefore blocked even after local implementation. Public-page research
was sufficient to validate the problem shape, but is not a production adapter.

### Recommended data model

Add a default-off `sourced_farmer_research` release control and a matching
`ENABLE_SOURCED_FARMER_RESEARCH` application flag. Use forward-only tables:

- `farmer_source_channels`: founder owner, provider channel ID and canonical
  URL, reviewed state, timestamps, refresh/expiry and unique owner/provider ID.
- `farmer_source_videos`: owner/channel composite key, provider video ID,
  canonical URL, redacted bounded metadata, published/refresh/expiry dates and
  content fingerprint; never raw response, transcript, comments, contacts,
  media copies or statistics.
- `farmer_source_discovery_runs`: owner, seed fingerprint, bounded cursor,
  counts, quota, state/failure and timestamps; no raw result arrays.
- `sourced_farmer_profiles`: durable founder-only record created only after
  consent or independently approved evidence, with display facts, evidence
  basis, review state, confidence, expiry and revision; no contact or member
  fields.
- `sourced_farmer_facts`: field-level fact type/value, independent source,
  redacted excerpt, extraction/reviewer metadata, decision and fingerprint.
- `farmer_source_events`: immutable IDs/hashes/counts-only audit history.

All tables should denormalize `owner_id`, use composite foreign keys to prevent
cross-owner linkage, enable RLS, revoke `public`/`anon`/`authenticated` table
access, and expose only bounded service functions after founder authorization.
Name alone must never be a hard dedupe key; cross-source matches remain review
suggestions based on name, locality and agriculture context.

### Administrator UI

Use separate routes rather than implying these rows are consented contacts:

- `/admin/sourced-farmers` — seed/run controls, exact summary counts,
  URL-backed filters, refresh/expiry status, transient source review and durable
  independently-evidenced profiles.
- `/admin/sourced-farmers/[profileId]` — field-level provenance, review,
  correction, merge suggestion, archive/removal and immutable event history.

Each page independently checks the founder-owner boundary, is force-dynamic,
uses `noindex, nofollow, nocache`, and returns `notFound()` for disabled,
unconfigured or wrong-owner access. The visible notice should say: `Private
research · not a FarmerBook member · not verified · no contact or outreach
consent.` There must be no email, phone, invite, message, verified badge,
marketplace, connection, publication or outbox action.

The closest UI patterns are `app/(product)/admin/farmer-database/page.tsx:10-31`,
`features/featured-farmers/editorial-workspace.tsx`, the URL filter treatment in
`features/network/discover-client.tsx:90`, and the existing private-table/audit
styles at `app/globals.css:8915-8960`. A new route-local `loading.tsx` and
`error.tsx` should keep provider/database failures from leaking details.

### Verification required

Tests must cover official endpoints only; bounded pages/IDs/body size/timeouts;
quota-before-fetch; checkpoint/idempotent replay; multilingual contact
redaction; host/channel/featured-person separation; anonymous extraction;
independent-evidence eligibility; duplicate suggestions without automatic
merge; release-control and owner scope on every operation; RLS/no browser
grants; immutable events; actual expiry deletion; zero writes to contacts,
profiles, outreach, consent, outbox or publications; private page metadata;
accessible desktop/mobile layouts; and no real-person/provider calls in test
fixtures.

Research checkpoint conclusion: the requested durable named-YouTube-farmer
database is not an implementable policy-safe target. A bounded transient
YouTube research loop plus a separate durable, independently evidenced or
consented founder-only workspace achieves the underlying discovery goal while
preserving FarmerBook's contact, consent and provider boundaries.

## 2026-08-17 research: production consent intake and consented collaboration email

### Requested outcome and authority boundary

The product owner approved moving the outreach pilot toward production and
asked that natural/organic farming people be served before general farmers,
including international farmer groups. The authorized production outcome is a
public, abuse-protected opt-in path plus verified email delivery for people who
ask FarmerBook to contact them. It is not authorization to import the 134
discovery rows, reveal or persist public email/phone values, send cold email,
use WhatsApp Web, or start a 500-recipient campaign. The discovery CSVs remain
research-only and contain no contact values.

Natural/organic preference must therefore be based on a person's own form
selection, not inferred from a public profile. Email confirmation should be
processed promptly for every requester; queue priority applies only to the
post-confirmation collaboration/introduction work:

- priority 10: natural, organic, regenerative or agroecological;
- priority 20: sustainable, low-input or smallholder-focused;
- priority 30: other/general agriculture.

The current implementation already limits ongoing automation to one optional
follow-up, scheduled three days after a delivered introduction
(`supabase/migrations/20260809140000_outreach_agent.sql:1049-1126`). That bounded
cadence is the appropriate meaning of maintained communication for this
release. Further replies are inbound and human- or allowlist-assisted; there is
no perpetual sequence.

### Live environment audit

Read-only production checks on 2026-08-17 established:

- the active Cloudflare deployment is the sourced-Farmer activation release;
- the Worker secret store contains the existing founder owner ID, Supabase
  service-role credential and YouTube key, but none of the Turnstile,
  outreach-signing or Postmark credentials;
- the linked Supabase project is healthy, but its recorded/applied schema is
  the original five-migration baseline plus the three isolated sourced-Farmer
  production migrations;
- production has `ecosystem_release_controls` with only the sourced-Farmer
  control. It has no `supported_locales`, `agriculture_categories`,
  `outreach_*` tables or outreach functions;
- the live `/admin/outreach` page consequently reports no research, consent or
  delivery rows, and delivery is unavailable;
- Gmail contains no response from the nine earlier pilot recipients.

`supabase db push --dry-run` is not a safe production mechanism in this state:
the CLI would attempt every locally pending migration, including unrelated
agriculture, Inc, managed-agent, private-contact and support/social domains.
Supabase documents that `db push` applies all migrations absent from remote
history and that `migration repair` is the supported history-reconciliation
tool: <https://supabase.com/docs/reference/cli/v0/supabase-migration>.

The prior sourced-Farmer release provides the repository precedent. It took a
protected backup, recorded the structurally matched baseline, applied an
isolated idempotent compatibility bridge and only the requested domain, then
added forward grant hardening (`implementation-log.md:122-123`). Outreach needs
the same production-shaped rehearsal and isolated forward migration.

### Existing application flow

The current India-only flow is:

```text
/join + HMAC nonce + Turnstile
        |
        v
submitAcquisitionConsentAction
        |
        v
service-only submit_outreach_consent_lead RPC
        |
        +--> private candidate + pending confirmation outbox
                                      |
                                      v
                            Postmark confirmation email
                                      |
                                      v
                         signed 48-hour confirmation page
                                      |
                                      v
                  purpose-specific consent + introduction outbox
                                      |
                                      v
                 one introduction + optional one follow-up
                                      |
                    STOP/reply/bounce/complaint webhook
                                      |
                                      v
                         cancel, suppress, or human reply
```

`app/join/page.tsx:16-29` fails closed unless the feature, Supabase, HMAC secret
and public Turnstile key exist. `features/outreach/actions.ts:207-312` verifies
the signed nonce and Turnstile, writes through a service-only RPC, and returns
only a prospect reference. `features/outreach/processor.ts:51-226` claims at
most 25 rows, stops after three consecutive provider failures, and refuses to
run with an unconfigured provider. `features/outreach/postmark-provider.ts:119-203`
uses one-recipient API calls, correlation metadata, no open/click tracking,
one-click unsubscribe and ambiguous-delivery no-retry behavior. Provider
replies, complaints, bounces and subscription changes are authenticated and
bound to a receipt or outbox before database mutation.

### Gaps found before production

1. **Production migration incompatibility.** The original outreach migration
   assumes the much broader agriculture foundation. It references
   `supported_locales.locale_code` and `agriculture_categories`
   (`20260809140000_outreach_agent.sql:43,405-419,666-667`). Production has
   neither. The original foundation actually calls its canonical locale column
   `locale_tag`; a later compatibility migration adds `locale_code`
   (`20260809135000_supported_locale_compatibility.sql:1-9`). The outreach
   discovery RPC also queries `agriculture_categories.active`, while the table
   exposes `status`, so that code path requires forward repair even in a full
   local schema. Applying the original outreach migration would also replace
   the release-control constraint with a key list that omits the live
   `sourced_farmer_research` row and would fail or regress that release.

2. **India-only intake.** The public form requires an Indian state, district
   and optional `+91` phone (`features/outreach/consent-join-form.tsx:187-235`;
   `features/outreach/schemas.ts:82-129`). The SQL RPC independently enforces
   the same India-only contract (`20260809140000_outreach_agent.sql:653-680`).
   International associations and farmer groups need a separate collaboration
   interest path with country/region, organization type, website and farming
   approach. Email remains the only channel.

3. **Membership and collaboration are conflated.** Every introduction is
   prepared as a one-time `/signup` invitation
   (`features/outreach/processor.ts:119-166` and
   `20260810100000_outreach_invitation_linkage.sql:50-188`). A farmer group or
   educator may want a partnership conversation without creating an account.
   The prospect needs an explicit `engagement_type` so membership requests can
   receive a signed signup invitation while collaboration requests receive an
   honest reply-oriented collaboration introduction with no account token.

4. **Turnstile response binding is incomplete.** The form renders action
   `farmerbook_join`, but `verifyTurnstileToken` checks a returned hostname only
   when one happens to be present and does not verify the returned action
   (`features/outreach/turnstile.ts:3-40`). Production must require exact action
   and hostname values. Cloudflare says server-side validation is mandatory,
   tokens expire after five minutes and are single-use, and widgets should be
   hostname-restricted:
   <https://developers.cloudflare.com/turnstile/get-started/> and
   <https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/>.

5. **Provider configuration is not part of public readiness.** `/join` may
   render as configured even if the provider cannot send the promised
   confirmation. `app/join/page.tsx:21-25` should require the concrete provider
   too, and the success copy must say accepted only after the outbox row is
   committed. Missing provider configuration must keep both intake pages
   unavailable.

6. **Message-stream semantics are too coarse.** The Postmark adapter accepts
   one stream for confirmation, introduction and follow-up
   (`features/outreach/postmark-provider.ts:94-175`). Postmark classifies an
   immediate response to a submitted form and email verification as
   transactional, while list-like announcements and optional campaigns belong
   on a Broadcast stream:
   <https://postmarkapp.com/support/article/transactional-vs-broadcast> and
   <https://postmarkapp.com/support/article/how-to-create-and-send-through-message-streams>.
   The adapter should require a transactional stream for the requested
   confirmation/introduction and a separate Broadcast stream only before an
   optional follow-up/campaign is enabled.

7. **Sender identification is incomplete.** Current email text includes an
   unsubscribe URL but no validated physical sender address
   (`features/outreach/postmark-provider.ts:129-175`). Because international
   collaboration mail may be commercial, production should conservatively
   require a valid FarmerBook business postal address in the footer and obtain
   privacy/legal review. The U.S. CAN-SPAM text expressly includes a valid
   physical postal address for commercial messages:
   <https://search.ftc.gov/sites/default/files/documents/cases/2007/11/canspam.pdf>.

8. **Provider account work is external.** Postmark requires a verified Sender
   Signature or domain before mail can be sent
   (<https://postmarkapp.com/support/article/adding-sender-signatures>). Its
   webhooks do not supply HMAC signatures; Postmark recommends HTTPS plus HTTP
   Basic authentication and payload/idempotency validation
   (<https://postmarkapp.com/developer/webhooks/webhooks-overview>). The code
   already implements Basic authentication and payload binding, but a real
   Postmark server, verified `farmerbook.in` sending domain, server-scoped
   token, inbound address, streams and webhook configuration do not exist in
   the current environment. Account creation, billing/terms acceptance and the
   business postal address require the product owner.

### Production-compatible design

Use a new forward-only outreach production-compatibility migration; never edit
or replay the historical migrations against live production. The migration
must be tested in two shapes: after the full local history and after an exact
clone of the five-migration production baseline plus sourced-Farmer bridge. In
both shapes it must converge on the same outreach tables, functions, grants,
RLS, release-control key set and default-paused runtime. It must not create the
unrelated agriculture/Inc/managed-agent/support domains.

The public interfaces should be separate but share server primitives:

- `/join`: India-oriented individual/member request, current localized fields,
  explicit membership introduction, optional single onboarding follow-up;
- `/partner-interest`: international or Indian farmer group, cooperative,
  association, natural/organic network, creator/educator, NGO or agriculture
  business; country and region; organization/site; self-declared farming
  approach; explicit one-time collaboration introduction plus optional single
  follow-up.

The confirmation token must bind the prospect, contact candidate, exact
requested purposes and engagement type. A confirmed collaboration interest
must not issue a signup token. Both paths use the same suppression, withdrawal,
bounce, complaint, retention and immutable audit boundaries. Phone may be
accepted only as optional private context after a separate data review; it is
never a messaging channel in this release. WhatsApp remains disabled pending a
separate Meta Business account, template/opt-in and webhook release.

### Release and rollback boundary

The deployment can safely deliver code and schema while all live controls
remain off. Production activation requires, in order: protected database
backup; production-shaped migration rehearsal; isolated migration apply and
catalog/RLS smoke; Turnstile widget restricted to `farmerbook.in` and
`www.farmerbook.in`; Postmark sender/domain and stream verification; encrypted
Worker secrets; provider webhook canaries; staged Worker version; one
owner-designated opt-in canary; exact consent/STOP/bounce evidence; then a
gradual Worker rollout. Runtime delivery stays paused until the canary row is
explicitly approved.

Rollback does not drop consent or suppression evidence. Pause delivery, disable
the database control, disable the Worker flag or return traffic to the current
known-good version, stop schedules, revoke the Postmark token and confirm no
pending row is claimable. This is safer and more auditable than reversing live
tables.

### Research checkpoint conclusion

The existing consent-first provider core is suitable, but the live database
cannot receive the historical migration chain and the current form/provider
contract is not ready for international collaboration. Implementation should
first create the dual-shape compatibility migration, separate membership from
collaboration, add self-declared natural/organic priority, harden Turnstile and
sender identity, and split Postmark stream semantics. Real sending remains
blocked on a product-owner-managed Postmark account/domain and a valid business
postal address.

## 2026-08-16 research: supervised customer support and social-content agents

### Requested outcome and bounded pilot

The requested outcome is a 24-by-7 agent pilot for customer questions and
social outreach using the current Mac for development and Cloudflare for the
always-on runtime. The safe first release is intentionally supervised:

- authenticated FarmerBook participants can create in-app support cases;
- a scheduled `customer_support` Agent creates a private reply proposal;
- an administrator must edit and approve every reply before it becomes visible
  to the participant;
- an administrator can create an owned-channel campaign brief;
- a scheduled `social_content` Agent creates a platform-specific draft;
- approval makes a social draft copy-ready only. It does not post, message a
  person, or claim publication without a future provider receipt.

Email ingestion, WhatsApp, social-network APIs, autonomous sending, browser
posting, auto-approved answers and public chat streaming are outside this
pilot. Cloudflare Email Routing to Gmail does not populate an application
support queue. No Google Gemini, OpenAI API, ChatGPT, Codex, Anthropic or other
subscription secret is needed by this design; inference uses the existing
Workers AI binding.

### Existing managed-runtime extension points

The Worker keeps Agent Durable Objects private. `worker/index.ts:1-13` exports
the classes, while `worker/index.ts:40-66` sends HTTP traffic only through
Vinext and never exposes `routeAgentRequest`. `vite.config.ts:55-121` supplies
the AI binding, Durable Object bindings, additive SQLite migrations and the
existing approval Workflow. `agents@0.20.1` is installed.

The common scheduled runtime at `features/managed-agents/runtime.ts:38-223`
already provides the required behavior: validated state, one recurring
schedule, bounded batches, internal bearer authentication, retry of recoverable
failures, health state and automatic pause after three unsuccessful cycles.
The server action and processor route add administrator authorization, a
constant-time secret check and database run leases
(`features/managed-agents/actions.ts:54-165`,
`app/api/managed-agents/run/route.ts:22-50`). The current role list is hard-coded
in contracts, classes, routing, bindings, SQL checks and exact-list tests, so
both new roles require a forward Supabase migration and a new Durable Object
migration tag. Previously deployed migration files and tags must not be edited.

Workers AI generation already follows the desired pattern:
`features/outreach/agent.ts:52-127` and
`features/profile-agent/profile-builder.ts:103-332` use bounded untrusted
inputs, JSON-schema outputs, Zod validation and deterministic fallbacks. The
new builders should reuse that model and never accept customer text or a
campaign brief as instructions.

### Canonical data and approval boundary

Direct participant messaging is not a support system: its tables assume two
member identities and lack assignment, risk, retention and approval state
(`features/messages/actions.ts:39-66`,
`features/messages/queries.ts:49-139`). Outreach replies are also unsuitable:
they deliberately retain classification rather than raw reply text and handle
only a small onboarding allowlist.

The new domain therefore needs three primary records:

- `support_cases`: one authenticated requester, category, locale, bounded
  subject/question, lifecycle state, timestamps and a 90-day expiry;
- `social_campaign_briefs`: an administrator-authored owned-channel brief with
  platform, audience, objective, source facts, call to action and locale;
- `agent_action_proposals`: a reusable private proposal for either
  `support_reply` or `social_post`, including draft content, risk level,
  escalation reasons, model/prompt metadata, run ID, review state, revision and
  reviewer.

An immutable proposal-event table records only decisions and bounded metadata;
it must not copy support text into audit JSON. All tables enable RLS. Browser
table access is revoked. Narrow security-definer functions create/list a
participant's own support cases, create briefs, record service-only drafts and
make administrator-only revision-checked decisions. Service code can draft but
cannot call the administrator decision function.

The database, not Agent Workflow state, is authoritative. This avoids the
existing cross-system caveat where a database decision may succeed before a
Workflow update (`features/profile-agent/actions.ts:431-455`). A future sender
or connector must claim only a database-approved proposal and independently
recheck the release control.

```text
Participant / administrator
        | support question / campaign brief
        v
Supabase private source record
        | scheduled, leased, bounded claim
        v
Cloudflare customer_support / social_content Agent
        | Workers AI strict JSON or deterministic fallback
        v
Supabase agent_action_proposals (pending review)
        | administrator edit + approve/reject/escalate
        +-----------------------+
        |                       |
        v                       v
approved support reply     copy-ready social draft
(visible in-app)           (no posting connector)
```

### Support safety policy

Every response remains human-approved during the pilot. Deterministic
classification must escalate complaints, refunds/pricing disputes, account or
personal-data actions, legal/financial questions, crop treatment or chemical
dosage, veterinary/medical issues, threats/emergencies and ambiguous requests.
The model receives a small approved FarmerBook fact set only: the product is a
professional agriculture network and direct marketplace; it does not provide
checkout, escrow or guaranteed refunds; verification is human-controlled; and
blocking/reporting exist. Unknown product behavior must become a clarifying
question or escalation, not a hallucinated answer.

### Social-content safety policy

Social drafts are for FarmerBook-owned channels, not unsolicited direct
messages. The builder must avoid fabricated farmer stories, yield or income
claims, unverified certifications, guaranteed prices, medical/agronomic claims
and false publication status. A draft remains `pending_review`; administrator
approval changes it to `copy_ready`. A later connector may add a separate
published transition only with an authenticated provider post ID/URL.

### UI and test anchors

The participant route follows the standard protected server-page plus client
form pattern and can be linked from settings. The administrator workspace
follows `/admin/reports` and the moderation queue for review cards, with a link
from `/admin/agents`; `/admin/agents` remains fleet health rather than becoming
an inbox. `app/robots.ts:18-31` already excludes administrator routes.

Verification must cover strict AI output and fallback behavior, escalation
keywords, prompt-injection isolation, schemas, feature gating, additive Worker
bindings, forward-only SQL constraints, RLS and grants, immutable events,
revision/idempotency checks, non-self-approval by the service role, honest
copy-ready language, accessible controls, repository type/lint/unit/build
gates, and executable local Supabase authorization tests when Docker is
available.

### Research checkpoint

Three parallel read-only audits of the Agent runtime, UI/tests and security
boundaries agree on the forward-only design above. The implementation can reuse
the current private scheduled fleet and Workers AI binding without a new AI
subscription. The release must remain default off and must not apply a hosted
migration, set production flags, activate schedules, send a response or publish
a social post during local implementation.

The security audit also found that `proxy.ts:38-75` currently applies Supabase
session authentication before the scheduled Agent's bearer-protected processor
route. `features/managed-agents/runtime.ts:126-169` supplies no browser cookie,
so a schedule may be redirected to login before the route can validate its
internal secret. The repair must add only `/api/managed-agents/run` to a named
exact session-bypass set; the route remains non-public in semantics and retains
its feature gates, 32-character secret minimum, constant-time comparison and
input bounds. The same proxy change should replace broad `startsWith(prefix)`
matching with exact-or-descendant matching so names such as
`/api/outreach-admin` cannot inherit a neighboring public prefix.

## 2026-08-18 research addendum: centralized AI spend ledger and fleet circuit breaker

### Requested outcome and release boundary

The product owner asked to proceed after reviewing the nine deployed Agent
classes and their token-spend design. The bounded interpretation is to add the
missing shared inference ledger and a real application-level USD 50 monthly
circuit breaker across every Workers AI call. This work does not enable any
paused Agent, database release control, provider, schedule, outbound message,
social publication, verification grant or production deployment. Those remain
separate release decisions.

The current production Worker version `661dfe1a-3158-49b2-8659-efe336272e53`
exports nine Agent classes and one approval Workflow. Its bindings show the AI
catalog plus all nine Durable Object namespaces. Only the website greeter and
blog paths are active; `ENABLE_OUTREACH_AGENT`,
`ENABLE_PROFILE_RESEARCH_AGENT`, `ENABLE_MANAGED_OPERATIONS_AGENTS` and
`ENABLE_SUPPORT_SOCIAL_PILOT` are false. `ENABLE_SOURCED_FARMER_RESEARCH` is
true, but that workspace uses the official YouTube API and deterministic
processing rather than Workers AI.

### Complete inference-path inventory

Repository-wide search finds seven direct `AI.run`/`ai.run` call sites and no
OpenAI, Anthropic, Google model or developer-tool credential in the runtime:

| Path | Model | Maximum output / pricing behavior | Current gate |
|---|---|---|---|
| `features/website-greeter/agent.ts:264` | `@cf/ibm-granite/granite-4.0-h-micro` | 160 output tokens; local USD 8/month conservative reserve | public, on demand |
| `features/blog/agent.ts:444` | Granite 4.0 H Micro | 3,500 output tokens for a draft; shared local USD 4/month reserve | weekly/manual admin draft |
| `features/blog/agent.ts:596` | `@cf/ai4bharat/indictrans2-en-indic-1B` | output estimated at 1.5 times bounded input; same blog reserve | uncached published translation |
| `features/outreach/agent.ts:90` | `@cf/meta/llama-3.1-8b-instruct-fast` | 900 output tokens | outreach/profile research flags |
| `features/outreach/ocr.ts:56` | `@cf/meta/llama-3.2-11b-vision-instruct` | 1,000 output tokens; bounded 2 MB sanitized image | administrator evidence routes |
| `features/profile-agent/profile-builder.ts:278` | Llama 3.1 8B Fast | 1,800 output tokens | profile-research and managed-operation gates |
| `features/customer-operations/ai.ts:178,254` | Llama 3.1 8B Fast | 1,000 output tokens per support/social proposal | support/social and managed-operation gates |

The outreach qualification builder is called by direct outreach research,
name-based profile research and known-Farmer intake. Screenshot OCR is also
called by outreach, known-Farmer and Featured Farmer evidence actions. Profile
generation is called both directly and through `ProfileDraftingAgent`.
Customer-support and social-content generation run in bounded scheduled loops.
Guarding only the nine Agent class methods would therefore miss administrator
server-action inference; the guard must wrap the shared Workers AI binding at
all seven raw call sites.

### Existing budget behavior and gaps

`WebsiteGreetingAgent` estimates input as characters divided by three, adds a
small overhead, reserves the full 160-token output allowance, and records the
reservation before awaiting inference (`features/website-greeter/agent.ts:60-68,
258-270`). It also limits a visitor to eight replies, the fleet to 25,000
answered requests per month and model use to 1,000 calls per day. Reviewed FAQ
answers never call a model.

`BlogWritingAgent` similarly reserves before a draft or translation and stops
at its local USD 4 ceiling (`features/blog/agent.ts:184-202,407-430`). It caches
translations by article, locale and fingerprint. These two local ledgers are
useful defense in depth, but neither sees calls made by the other five model
paths.

The documented allocation is USD 8 for greetings, USD 4 for blog work, USD 5
for consent-first growth and USD 33 unallocated. The growth document describes
a USD 5 stop, but no runtime ledger currently enforces it. Profile generation,
support drafting, social drafting and screenshot OCR have no price allowlist or
spend counter. The existing Operations Supervisor observes run health and
outbox attention, not model tokens or account spend.

The repository also describes a USD 50 Cloudflare account budget as an outer
guard. Current Cloudflare documentation states that account budget alerts are
informational, calculated after usage, and do not cap or interrupt service.
They cannot serve as the fleet circuit breaker. The authoritative invoice also
applies the account-wide 10,000 Neurons/day free allocation, whereas an
application ledger should conservatively track retail model value before free
credits so another Worker cannot consume the allowance invisibly.

### Current official price inputs

Cloudflare's 2026-08-18 model and pricing documentation gives these token
prices. The design should deliberately round upward where the existing source
already does so:

| Model | USD/M input tokens | USD/M output tokens | Conservative code rate |
|---|---:|---:|---:|
| Granite 4.0 H Micro | 0.017 | 0.110 | 0.017 / 0.112 |
| IndicTrans2 English-to-Indic | 0.340 | 0.340 | 0.342 / 0.342 |
| Llama 3.1 8B Instruct Fast | 0.045 | 0.384 | same |
| Llama 3.2 11B Vision Instruct | 0.049 | 0.676 | 0.049 / 0.680 |

An unknown model must be rejected rather than charged at a guessed rate.
Changing a model or price therefore remains a reviewed code change with tests,
not an unrestricted environment-variable edit.

### Persistence and concurrency choice

Supabase could atomically reserve spend, but it would add a network round trip
and service-role dependency to every public greeting. It would also duplicate
Cloudflare's private Agent state boundary. Per-Agent SQLite ledgers cannot
serialize concurrent spend across namespaces.

A singleton Cloudflare Agent Durable Object is the appropriate authority. The
existing runtime already calls named Agent stubs with `getAgentByName`, and the
Agents SDK exposes private SQLite storage through parameterized `this.sql`.
All requests to one Durable Object instance are serialized. A named
`AiFleetBudgetAgent` instance therefore provides one strongly consistent
reservation point without publishing a browser Agent route or storing prompts.

```text
Website / blog / profile / outreach / support / social code
                         |
                         | bounded metadata only
                         v
              AiFleetBudgetAgent singleton
              reserve atomically or deny
                         |
                  reservation accepted
                         v
                  Cloudflare AI.run
                         |
             settle token metadata if present
```

The Durable Object should store one reservation row per attempted inference:
random call ID, calendar month, workstream, bounded operation name, exact
allowlisted model, estimated input tokens, maximum output tokens, conservative
reserved microdollars, optional provider-reported input/output tokens, optional
settled estimate, outcome code and timestamps. It must never store prompt text,
visitor text, screenshots, article text, support questions, campaign facts,
profile evidence, contact data or model output. Old monthly rows can be removed
after a bounded operational retention period.

### Reservation and failure semantics

The wrapper must inspect the complete serialized model input for a conservative
token estimate and reserve maximum output before inference. Text-generation
paths already declare `max_tokens`. Translation has no explicit output cap, so
the existing 1.5-times-input bound should be used. The sanitized screenshot's
bounded data URL may be counted conservatively as serialized input; over-count
is safer than under-count and the actual provider token metadata can be stored
separately when supplied.

The singleton checks both the workstream allocation and the USD 50 fleet cap in
the same serialized method. The existing allocations remain:

- website greeting: USD 8;
- blog writing/translation: USD 4;
- consent-first growth, including qualification and OCR: USD 5;
- profile drafting, customer support and social content: USD 0 until a later
  explicit allocation draws from the USD 33 reserve;
- fleet ceiling: USD 50.

A zero workstream allocation does not break deterministic operation: profile,
outreach, support and social builders already return reviewed deterministic
fallbacks when AI is unavailable or invalid. OCR, which cannot safely invent
visible text, fails closed. No paused role should be enabled as part of this
change.

If reservation is denied or the budget namespace is missing, no `AI.run` call
may occur. If inference fails, the reservation remains charged conservatively.
If settlement fails after a model call, the original reservation remains in
the singleton and continues to count. Provider-reported usage can enrich the
ledger but must never reduce the amount used for circuit-breaker decisions;
this prevents crashes, missing usage fields or concurrent calls from freeing
spend that may already have occurred. Monthly rollover is based on UTC, matching
Cloudflare's daily reset boundary.

### Administrator visibility and security boundary

`/admin/agents` already requires `requireAdmin()` and is the natural fleet
health surface. It should read the singleton through a server-only Agent stub
and display the current UTC month, USD 50 ceiling, conservative reserved spend,
remaining amount, call/failure counts and workstream allocations. The panel
must distinguish conservative reserved value from Cloudflare invoice charges
and link operators to the Cloudflare Billable Usage/Workers AI dashboards for
the authoritative bill.

The Worker should export and bind `AiFleetBudgetAgent` through a new additive
Durable Object migration tag. The Agent is not routed with
`routeAgentRequest`; browser clients cannot invoke reserve, settle or status.
No Supabase migration, browser grant, new secret, OpenAI key or external
provider is required.

### Verification and rollback implications

Tests need to prove exact workstream/model allowlists, upward-rounded pricing,
unknown-model rejection, per-workstream denial, fleet denial, UTC rollover,
idempotent settlement, privacy-safe stored fields, unavailable-budget failure,
and that all seven former raw inference sites use the wrapper. Existing greeter,
blog, outreach, profile and customer-operation fallback tests must continue to
pass. Configuration tests must verify the new class export, binding and
forward-only migration tag.

The code change is locally reversible. A deployed Durable Object migration is
forward-only, so production rollback returns traffic to the previous Worker
version while retaining the unused private namespace; it must not delete
ledger state. Production deployment, traffic change and allocation of the USD
33 reserve require separate approval.

### Research checkpoint

All direct Workers AI call sites, their entry points, current feature gates,
models, output bounds, local counters, fallback behavior, live bindings and
official pricing have been traced. A singleton private Agent Durable Object
plus one shared inference wrapper covers both named Agents and administrator
server actions, preserves prompt privacy, serializes reservations before model
use and can expose honest administrator telemetry. No implementation has been
performed at this checkpoint.
## 2026-08-19 research addendum: AI company control plane for 100,000 users

### Scope and approved operating model

The product owner approved an AI-native operating-company design and directed
implementation. The first fleet contains 15 logical company roles: Executive
Strategy, Operations Coordinator, Data & Experimentation, Governance & Risk,
Independent Auditor, Growth Strategy, Farmer Acquisition, Buyer Acquisition,
Farmer Onboarding, Marketplace Matching, SEO & Editorial, Product Management,
Engineering Planning, QA & Reliability, and Support & Trust. These roles report
through an administrator-visible command center. They do not replace the six
existing delivery workers for consented outreach, profile drafting,
verification triage, customer-support drafting, social drafting, and fleet
supervision.

The six-month goal is not treated as 100,000 unqualified rows. The approved
objective set is 100,000 registered users, 40,000 onboarding-complete users,
and 25,000 monthly active users within 180 days. A monthly active user is a
distinct non-null `product_events.user_id` observed in the trailing 30 days.
This is a current product-event proxy rather than session telemetry, and the
Data & Experimentation role must disclose that limitation in its proposal.

### Existing runtime and why it should be extended

`features/managed-agents/contracts.ts:3-60` is the canonical type and input
boundary for scheduled roles. It limits schedules to 300 through 604,800
seconds, batches to 1 through 25 items, instance names to a safe lowercase
format, and summaries to scalar JSON values. The current six definitions at
`features/managed-agents/contracts.ts:90-151` also publish an explicit role
boundary for the administrator UI.

`features/managed-agents/runtime.ts:38-224` supplies the correct lifecycle:
clear old schedules before reconfiguration, create one recurring schedule,
call only the private processor route, use a random idempotency key, retry a
bounded number of times, and cancel schedules after three consecutive
unsuccessful runs. The new company fleet should use these same mechanics. It
must not expose `routeAgentRequest` or a public Agent endpoint.

The six existing roles use one Durable Object class per role. Fifteen more
classes and bindings would create avoidable configuration and migration
surface. Cloudflare Durable Objects already isolate named instances of one
class, so one `CompanyOperationsAgent` class can host 15 independent instance
names such as `farmerbook-company-executive-strategy`. Its state locks to the
first configured role; subsequent attempts to change that instance's role must
fail. This preserves independent schedules and failure streaks while adding
only one forward-only SQLite class migration.

`features/managed-agents/actions.ts:52-75` currently maps each role to its
private binding, and lines 77-174 combine administrator authorization, Worker
flags, database release controls, processor-secret checks, database command
evidence, Durable Object scheduling, and rollback-on-schedule-failure. Company
roles should reuse this command path and select the shared company namespace.
They require both `ENABLE_MANAGED_OPERATIONS_AGENTS` and a new
`ENABLE_AI_COMPANY` flag.

`app/api/managed-agents/run/route.ts` is the only scheduled processor ingress.
It checks the main fleet flag, demo/configured state, a constant-time bearer,
bounded schema, and role-specific feature prerequisites before calling
`processManagedAgentRun`. Extending this exact route is safer than introducing
a second scheduler secret or another ingress.

`features/managed-agents/processor.ts:555-647` demonstrates the authoritative
run protocol: a service-role RPC obtains an idempotent lease, the role-specific
processor does bounded work, and another service-role RPC records only counts
and a bounded summary. Company processors should add a deterministic dispatch
branch which reads one aggregate snapshot, creates at most one proposal per
role/run, and reports no personal or source content in the run summary.

### Existing database control plane

`supabase/migrations/20260812130000_managed_operations_agents.sql` creates the
private agent, run, event, and verification-recommendation tables. It enforces
service-only execution, administrator-only commands and dashboards, unique
idempotency keys, 15-minute overlapping-run leases, immutable events, and
automatic pause after three unsuccessful outcomes. The support/social forward
migration expands this to six roles and redefines the hard-coded command
allowlists at
`supabase/migrations/20260816120000_support_social_pilot.sql:750-905`.
Therefore the AI-company migration must be forward-only and must update all of
the following consistently:

- the release-control key constraint and new default-off `ai_company` row;
- the `managed_operations_agents.role` check constraint;
- 15 inserted role/configuration rows;
- `request_managed_operations_agent_run` and
  `configure_managed_operations_agent` allowlists and role-specific gate;
- no weakening of the existing service/admin grants or RLS policies.

The new tables should be private and additive:

- `company_objectives` stores the three approved 180-day targets;
- `company_kpi_snapshots` stores aggregate-only, versioned metric packets tied
  to an immutable managed run;
- `company_agent_proposals` stores one bounded recommendation, priority, risk,
  evidence counters, state, revision, and administrator decision;
- `company_agent_proposal_events` stores redacted immutable decision evidence.

Browser roles must have no direct table grants. Service-role functions collect
metrics and create snapshots/proposals. Authenticated administrators may only
read through bounded dashboard functions and review a proposal through a
revision-aware, idempotent function. Company agents cannot execute approved
proposals in this release; approval means accepted into the human-controlled
operating backlog.

### Aggregate metrics that are already supportable

The application already records durable product events in
`supabase/migrations/20260729160000_initial_farmerbook.sql:152-191` and exposes a
service-only pilot aggregate view at lines 693-704. The richer company snapshot
can be computed entirely inside one service-role SQL function without exposing
row data:

- active and onboarding-complete profiles, with counts by `account_role`;
- distinct product-event users in the trailing 30 days;
- active posts and messages;
- active produce listings and active listings with zero enquiries;
- total and won marketplace enquiries;
- open support cases and pending moderation reports;
- pending company/action proposals;
- managed-agent failed/partial runs in the trailing 24 hours.

The marketplace tables and safe aggregate columns are defined at
`supabase/migrations/20260730120000_marketplace_growth.sql:6-59`. The snapshot
must not retain buyer names, email addresses, phone numbers, support text,
profile names, handles, post bodies, messages, source excerpts, or model
prompts/outputs.

### Role policy instead of new model spend

The central `AiFleetBudgetAgent` allocates the complete USD 10 monthly ceiling:
USD 5 website greeting, USD 2 blog, USD 3 growth/OCR, and zero to profile,
support, and social workstreams. There is no unallocated inference reserve.
Giving 15 new roles model access would either violate the approved cap or
silently starve an existing workstream.

The first company fleet should therefore use `company-policy-v1`: a pure,
versioned TypeScript decision builder which converts the aggregate metric
packet and approved objectives into role-specific proposals. Examples include
the onboarding gap, listings without enquiries, pending trust work, unhealthy
agent runs, and the pace required to reach the deadline. This is meaningful
autonomous analysis, remains testable, has zero inference cost, and cannot
hallucinate private facts. A future model-assisted proposal writer would need a
new explicit workstream allocation and separate approval.

### Administrator experience

`app/(product)/admin/agents/page.tsx` already combines the central inference
budget and managed-role health. It is the correct command center. The page
should add objective progress, the latest aggregate snapshot, and proposal
review before the low-level schedule cards. `ManagedAgentDefinition` should
gain a division label so the existing six operational workers and the 15
company roles render in readable groups.

The UI must show a conspicuous safely-off state until the application flag,
database release control, binding, processor secret, and migration are all
present. It must not imply that approved proposals were sent, published,
deployed, paid for, or executed.

### Test and release boundaries

Focused tests must prove the exact 15 company roles, role immutability in the
shared Durable Object class, deterministic proposal outputs, deadline/zero
denominator behavior, aggregate-only evidence, feature gates, private bearer,
one-proposal-per-run behavior, UI safely-off state, revision-aware review, RLS,
service-only creation, administrator-only inspection, and unchanged safety for
the six prior roles. The full ESLint, TypeScript, Vitest, production build,
Supabase reset/pgTAP where available, strict Wrangler dry run, and diff check
remain completion gates.

Implementation is local and default-off. The approval to implement does not
authorize a Supabase production migration, Worker deployment, release-control
change, scheduled Agent activation, external message, social post, paid spend,
or production data mutation.

### Production validation outcome (2026-08-19)

After explicit activation and testing approval, the production-shaped replay
and protected backup passed and only the isolated bridge/control-plane
migrations were applied. The active Worker is
`1b42b9b8-373f-4322-a522-84b683abdfa2`; both application and database controls
and all 15 schedules are enabled. One bounded manual run per role produced 15
succeeded runs, 15 aggregate snapshots and 15 pending proposals with zero model
calls and zero external actions. Browser evidence and exact deterministic test
transcripts are stored under `artifacts/`. The temporary validation sessions
were revoked without affecting older user sessions. This proves scheduling,
role isolation, production metrics capture, proposal generation and the review
boundary; it does not prove acquisition performance or authorize proposal
execution.

## 2026-08-19 research addendum: consented email outreach activation and agent operations

### Requested outcome and safe interpretation

The product owner asked to configure `ceo@farmerbook.in` for a social-media
outreach agent that can maintain contact with prospective Farmers, customers
and YouTube collaboration partners, and also asked how to use the 15 company
agents. FarmerBook already has the necessary separation of duties:

- the 15 company roles read aggregate counters and create reviewable operating
  proposals only;
- `Social Content Drafting` creates owned-channel drafts from administrator
  briefs but cannot post or contact anybody;
- `Growth & Outreach` is the delivery worker for email confirmations,
  purpose-matched introductions, inbound replies and one optional follow-up.

No new all-powerful or cold-email agent is needed. “Constant” operation can
safely mean a recurring 15-minute queue processor that promptly handles new
opt-ins, replies and eligible follow-ups. It cannot mean repeated unsolicited
mail, public-address harvesting, automated YouTube comments or an unbounded
sequence.

### Current code and database controls

The current outreach domain is already production-shaped and private. Public
intake at `/join` and `/partner-interest` uses an HMAC nonce, route-bound
Turnstile, exact introduction consent and optional follow-up consent. The
service-only intake RPC creates a pending email-confirmation job. A signed
48-hour link records the consent receipt and queues one introduction. A second
message is possible only when follow-up consent was separately selected. STOP,
unsubscribe, withdrawal, complaint and hard bounce cancel queued work and add
the contact hash to the suppression ledger.

`features/outreach/postmark-provider.ts` sends as
`FarmerBook CEO <ceo@farmerbook.in>`, routes replies through the private inbound
stream, separates transactional and Broadcast streams, disables open/click
tracking, supplies `List-Unsubscribe` and one-click unsubscribe headers, and
adds the privacy link, STOP instruction and physical postal footer. The
processor claims at most 25 rows, currently defaults to ten, limits attempts,
treats ambiguous provider results conservatively and opens its circuit after
three consecutive failures. `OutreachGrowthAgent` already schedules that
processor with a default 900-second interval and ten-item batch.

The hosted outreach schema is present but intentionally empty. A read-only live
check found zero prospects, zero outbox rows and zero active consents. The
application release flag and `outreach_agent` database control are false, and
`outreach_runtime_controls.delivery_paused` is true with the reason “Awaiting
reviewed provider activation.” This is why no message can currently leave the
system even though provider secrets are installed.

### Provider and sender readiness

The active Worker has the Postmark provider kind, `ceo@farmerbook.in`, the
transactional/Broadcast stream names, postal footer and encrypted Postmark,
inbound, webhook, action-token, invitation, consent and processor credentials.
Secret values were not read or printed.

The last repository note said Postmark review was pending. A read-only check of
the signed-in owner mailbox on 2026-08-19 found the subsequent official
approval notice: Postmark manually approved the FarmerBook account on
2026-08-17 and said it can start sending. Separate Postmark notices confirm
that `farmerbook.in` DKIM and the custom
`pm-bounces.farmerbook.in` Return-Path were verified. Public DNS also exposes a
monitoring DMARC record and a Postmark-aligned return path. This removes the
provider-review blocker, but the exact end-to-end consent, receipt,
unsubscribe/STOP and webhook lifecycle still needs one owner-controlled canary
before public activation.

Cloudflare Email Service is not a substitute for this path: its official
documentation says the service is for transactional email and does not yet
support marketing campaigns. The repository's Postmark Broadcast stream is
the correct provider surface for the separately consented follow-up. A
read-only `wrangler email sending list` attempt returned an authorization error
because the current Cloudflare token lacks Email Sending permission; no new
permission is required for the Postmark design.

### Deliverability and platform-policy boundary

Official Postmark broadcast guidance requires direct permission, rejects
purchased, scraped, inherited and public-source lists, recommends double
opt-in/CAPTCHA, one-click unsubscribe, separate streams and gradual warming:

- https://postmarkapp.com/guides/best-practices-for-broadcast-sending
- https://postmarkapp.com/support/article/how-to-create-and-send-through-message-streams
- https://postmarkapp.com/support/article/managing-your-own-unsubscribe-process

Google's sender guidance likewise requires authentication, easy unsubscribe,
gradual volume growth and spam rates below 0.1%, with 0.3% never to be reached:
https://support.google.com/mail/answer/81126?hl=en. YouTube prohibits
high-volume repetitive or automated spam:
https://support.google.com/youtube/answer/2801973?hl=en. Therefore the
untracked `outreach/*.csv` research files remain non-delivery inputs and no
email/phone value may be imported from a creator description or public contact
page. Creator acquisition should distribute the public
`/partner-interest` URL through FarmerBook-owned posts, approved partner
surfaces or permission-bearing lead forms; the creator supplies and confirms
their own email.

The DPDP Act/Rules implementation timeline does not remove the product's need
for clear consent evidence and easy withdrawal. The existing consent-first
design should be retained, and actual cold-outreach expansion would require
qualified legal review plus separate provider approval even if a public-data
exception might be argued.

### Public-funnel defect discovered in production

`app/partner-interest/page.tsx` is implemented as a public collaboration form,
but `proxy.ts` does not include `/partner-interest` in `publicPrefixes`.
Consequently a live anonymous request receives HTTP 307 to
`/login?next=%2Fpartner-interest`. `/join` returns HTTP 200 but renders the
safely-unavailable state because the outreach flag is false. `robots.ts` and
`sitemap.ts` also expose only `/join`. The proxy allowlist, route tests,
sitemap and robots output must be repaired before the collaboration funnel is
activated.

### How the 15 company roles are actually operated

All 15 company schedules are already enabled in production. A controlled test
run for each role succeeded and produced one pending aggregate-only proposal;
the exact conversations and screenshots are under `artifacts/`. The operating
surface is `/admin/agents`:

1. inspect objective progress, the latest aggregate snapshot and pending
   proposals;
2. review each proposal's role, risk, priority, summary and evidence counters;
3. record a meaningful reason and choose `Approve for backlog`, `Reject` or
   `Escalate`;
4. use `Run now` only for a fresh aggregate proposal, `Pause` for maintenance or
   anomalous output, and `Resume` with the reviewed interval/batch;
5. remember that approval is a backlog decision only—none of the 15 roles can
   send mail, publish, deploy, spend, moderate or change an account.

The roles form a decision loop rather than 15 chat windows: Executive Strategy
sets focus; Growth/Farmer/Buyer roles propose acquisition priorities;
Onboarding, Marketplace, SEO, Product and Engineering propose bounded work;
Data, QA, Governance, Support and the Independent Auditor challenge evidence
and risk; Operations Coordinator surfaces blocked work. Delivery is handed to
the relevant purpose-limited worker only after a person implements or
authorizes that backlog item.

### Research checkpoint

The sender/provider configuration, current hosted gates, email lifecycle,
production public routes, managed schedules, policy constraints and all 15
company roles have been traced. Postmark is now approved and sender-domain
alignment has been verified, but no canary has been sent and the collaboration
form is accidentally authentication-gated. The next safe tranche is a small
route/guide patch followed by an owner-only canary and only then gradual
consented delivery. No code, database control, Worker version, schedule,
prospect, consent, email or social message was changed during this research
checkpoint.

### Facebook AP/Telangana outreach addendum

The product owner subsequently directed Codex to use the signed-in Facebook
session to invite Farmers in Andhra Pradesh and Telangana, together with
traders and agricultural tool businesses. Read-only Chrome inspection found no
active managed Facebook Page; only deactivated historical Pages are listed.
The account is a member of several agriculture groups, but the two strongest
Telugu candidates are not permitted promotion surfaces:

- `ప్రకృతి వ్యవసాయం` (about 332,400 members) explicitly prohibits personal,
  group and Page promotions and spam;
- `రైతు నేస్తం (For The Welfare Of Farmers)` (about 301,650 members) prohibits
  self-promotion, spam and irrelevant links.

FarmerBook will not violate those rules. The bounded initial Facebook action is
one bilingual Telugu/English post on the signed-in account's own timeline after
the public intake routes are live. Farmers, customers and wholesalers are sent
to `/join`. Tool manufacturers, dealers and agriculture service businesses are
sent to `/partner-interest` for an early collaboration request because
`ENABLE_AGRI_BUSINESSES=false` and business-offer publication is not currently
live. The copy may accurately say that Farmers can create professional
profiles and harvest listings, customers/wholesalers can browse produce and
send private enquiries, and FarmerBook charges no platform commission on
direct enquiries. It must not guarantee sales, claim tool/business listings
are live, scrape members, add friends, message individuals or cross-post into
groups whose rules prohibit promotion.

## 2026-08-20 research addendum: controlled live execution for the AI company

### Requested outcome and research method

The product owner wants the agent fleet to move beyond recommendations and take
bounded live action, and explicitly requested a multi-subagent assessment. Three
independent read-only audits examined the current architecture, execution
boundaries, safety controls and six-month operating model. No email, post,
deployment, database mutation or other external action was performed during
this research phase.

### Current execution boundary

The existing separation is deliberate and should be preserved:

- `features/company-agents/processor.ts:26-91` records one aggregate KPI
  snapshot, applies deterministic `company-policy-v1`, records one proposal and
  reports zero model calls and zero external actions.
- `features/company-agents/actions.ts:14-50` lets an authenticated administrator
  review a proposal, but approval only records a backlog decision.
- `features/managed-agents/contracts.ts:12-28` defines the 15 company roles;
  `:125-190` defines the six purpose-limited operational workers.
- `features/managed-agents/processor.ts:95-120` is the only general managed-agent
  branch that currently performs an external provider action: consent-bound
  Postmark email through the Growth & Outreach worker.
- Profile Drafting creates private samples and an approval Workflow;
  Verification Triage records recommendations; Customer Support and Social
  Content create proposals. None publishes a profile, changes a trust claim,
  sends a support message or posts to a social network automatically.
- `features/company-agents/agent.ts:83-100,229-260` and
  `supabase/migrations/20260819110000_ai_company_production_bridge.sql:297-353`
  bound each role and auto-pause it after three unsuccessful runs.

The production evidence under `artifacts/` proves 15 isolated successful runs,
15 proposals, zero model calls and zero external actions. It proves the control
plane, not autonomous execution.

### Controls that can be reused

The system already has several strong foundations:

- stable role identities, bounded schedules and batches;
- feature flags plus independent database release controls;
- idempotent commands, runs, proposals and reviews;
- optimistic revision checks and immutable PostgreSQL events;
- a fleet model-inference budget;
- an outreach pause switch, purpose/channel-specific consent, suppression,
  limited attempts, one-click unsubscribe, STOP, and conservative handling of
  ambiguous provider outcomes.

Cloudflare's current Agents documentation supports the required next layer:
Agents can coordinate retained subagents, while Workflows can wait durably for
approval. The current guidance recommends idempotent Workflow steps, explicit
approval context, timeouts, audit trails and approval for side-effecting tools.
Agent queues are persistent FIFO queues but are sequential, have no built-in
dead-letter queue or circuit breaker, and remove an item after retries are
exhausted. Therefore externally visible actions need their own PostgreSQL
ledger and reconciliation states rather than relying on an Agent queue alone.

Official references checked on 2026-08-20:

- https://developers.cloudflare.com/agents/runtime/execution/sub-agents/
- https://developers.cloudflare.com/agents/runtime/execution/agent-tools/
- https://developers.cloudflare.com/agents/concepts/agentic-patterns/human-in-the-loop/
- https://developers.cloudflare.com/agents/runtime/execution/run-workflows/
- https://developers.cloudflare.com/agents/runtime/execution/queue-tasks/
- https://developers.cloudflare.com/agents/runtime/execution/retries/

### Missing controls for broader live action

The current proposal state is not an execution authorization. It has no exact
target, connector, payload hash, expiry, action/spend budget, canary cohort,
revocation status, compensation instruction or execution receipt. Other gaps
are:

1. The managed fleet shares one processor bearer and a service-role-backed
   dispatcher; live executors need capability-scoped credentials and narrow
   database RPCs.
2. `maxItemsPerRun` is a batch bound, not an atomic daily or monthly action
   budget.
3. Risk is descriptive; the database does not derive approval requirements from
   connector and operation or require two distinct approvers for high-risk work.
4. Canary cohorts and staged volume are procedural rather than database-enforced.
5. A pause or consent withdrawal can race with a previously claimed outreach
   row; dispatch needs a final short-lived authorization check immediately
   before the provider call.
6. There is no generic `dispatched -> verified | unknown | failed ->
   compensated` lifecycle or provider reconciliation for uncertain outcomes.
7. The Independent Auditor is role-separated but shares the same runtime,
   secret and evidence source as the agents it audits.
8. The current aggregate snapshot lacks safe AP/Telangana, language, role and
   acquisition-channel cohorts needed to learn which growth work is effective.
   Cohort metrics should enforce a minimum population before display and never
   expose contacts or raw messages.
9. There is no official social publishing connector. A personal Facebook
   profile, group-member automation, comments or DMs must not become one; a
   future connector should use a FarmerBook-owned Page and official API.

### Target architecture

```text
safe aggregate signals
        -> planner subagent(s)
        -> company proposal
        -> deterministic policy + risk classification
        -> signed, expiring action authorization
        -> capability-scoped executor
        -> provider/internal receipt
        -> independent verifier
        -> outcome metric or automatic pause
```

Multiple subagents are useful for parallel research, drafting and challenge.
They should not multiply credentials or authority. All 15 company roles remain
planners. Governance and the Independent Auditor remain outside execution and
cannot approve their own work. Executors are separate by capability and can do
only operations named by a short-lived authorization.

### Recommended authority tiers

- Tier 0: autonomous aggregate observation and health checks.
- Tier 1: autonomous proposals, drafts, private previews, code/test plans.
- Tier 2: autonomous internal and reversible work under standing policy, such
  as internal status changes, tests and draft preparation.
- Tier 3: bounded live work inside an approved campaign, such as consented
  email, authenticated in-app guidance and approved owned-channel publication.
- Tier 4: per-action human approval, normally two-person for public release,
  production deployment, spend, moderation, verification or material pricing.
- Tier 5: never autonomous: unsolicited bulk outreach, scraping or personal
  social-profile automation, money transfer, contracts, final KYC/dispute
  decisions, secret rotation, destructive deletion or consent bypass.

### Research checkpoint

The existing planner fleet, purpose-limited workers, approval semantics,
scheduling, audit, budget and outreach controls have been traced. The safe next
step is a default-off action authorization ledger plus a small set of scoped
executors in shadow mode. Broad production autonomy is not yet safe, and this
research does not authorize implementation or any live action.
# 2026-08-20 research: daily FarmerBook editorial agent

## Existing implementation

FarmerBook already has a purpose-built `BlogWritingAgent` in
`features/blog/agent.ts`, addressed through the stable
`farmerbook-blog-writing` Durable Object instance in
`features/blog/runtime.ts`. The Worker binding and forward Durable Object class
migration are already present in `vite.config.ts` and `worker/index.ts`.

The Agent owns two SQLite tables: `blog_agent_drafts` and
`blog_agent_translations`. A draft is written as `awaiting_review`; only
`reviewDraft()` can change it to `published` or `rejected`, and
`listPublished()` returns only published rows. `/admin/blog` calls the Agent
through authenticated server actions, while `/blog` combines reviewed static
publications with the Agent's published rows. This is the correct boundary to
retain for a daily writing programme.

The current schedule is `30 3 * * 2`, or Tuesday at 09:00 IST. Draft
idempotency is based on an ISO-week Monday key, so changing only the cron to
daily would still create at most one draft per week. The topic packet contains
four briefs, which is too narrow for a useful daily programme. A schedule
change would also create a second independent cron unless the legacy weekly
schedule is found and cancelled, because Cloudflare deduplicates recurring
schedules by the combination of cron, callback and payload.

The Agent uses the cheapest allowlisted Workers AI writing model and the shared
`AiFleetBudgetAgent`. Its Blog allocation is fixed at USD 2 per UTC month inside
the existing USD 10 fleet ceiling. Both draft generation and translations
reserve a conservative maximum before inference. Daily drafting can remain
inside this existing cap, but the implementation must also impose a hard one-
draft-per-India-calendar-day limit so a configuration or retry fault cannot
convert the monthly budget into a burst.

## Publication and content findings

The founder editorial can use the existing static reviewed-publication path.
This makes the exact reviewed text deployable, places it in `/blog`, sitemap and
Article metadata, and does not depend on mutating the production Agent's SQLite
database. The supplied screenshot must remain unused because it has a search
overlay and no recorded republication right. The article's statement about
accurate organic claims is supported by the official PGS-India Operational
Manual, which describes participation, transparency, trust, verification and
direct producer-consumer communication.

Daily writing and daily publishing must remain different authorities. The
Agent may prepare one private evidence-bounded draft per day. An authenticated
administrator must still review every title, claim, source and image-rights
record before publication. Future automatic publication is an owned-site live
action and cannot start until the Live Agent control plane has dedicated
restricted database roles, an isolated publisher, approval-to-Workflow wiring,
an independent post-publication verifier and a separately approved canary.

## Current Cloudflare guidance checked on 2026-08-20

Cloudflare documents that Agent schedules are persisted in SQLite and survive
Agent restarts. Cron tasks are idempotent only for an identical cron,
callback and payload; a new daily cron does not replace the existing weekly
one. Cloudflare recommends scheduling for recurring time-based work and
Workflows for multi-step or human-approval work. Its human-in-the-loop guidance
recommends explicit approval context, durable audit records, timeouts and
graceful rejection. Sources:

- `https://developers.cloudflare.com/agents/runtime/execution/schedule-tasks/`
- `https://developers.cloudflare.com/agents/concepts/workflows/`
- `https://developers.cloudflare.com/agents/concepts/agentic-patterns/human-in-the-loop/`

## Required design changes

1. Replace the weekly schedule with one idempotent daily cron at 03:30 UTC
   (09:00 IST), cancelling the legacy weekly schedule by exact ID after the new
   schedule is recorded.
2. Introduce an Asia/Kolkata daily run key and a hard one-draft-per-day rule;
   retries return the prior draft rather than spending twice.
3. Expand to a code-reviewed topic and source registry with freshness dates,
   allowed claim scope, risk class and minimum source count. No unrestricted
   web browsing or user/contact data enters the model prompt.
4. Keep every scheduled result private and awaiting review. Preserve the USD 2
   monthly Blog allocation and the global fleet budget; budget exhaustion skips
   the day and records a bounded failure code.
5. Extend `/admin/blog` with the daily schedule, today's run, source freshness,
   review SLA, rejection reason and pause/resume control. A pause must cancel the
   daily schedule and never alter existing reviewed publications.
6. Record privacy-safe quality metrics: prepared, approved, rejected, heavily
   edited, source failure, budget failure, time-to-review and publication
   verification. Do not retain unpublished personal stories, contact details or
   unlicensed images.
7. Run at least 30 consecutive days in review-required mode before considering
   a separate automatic owned-site publishing canary.

# 2026-08-20 research: standing-policy blog publication and owned social reach

## Product direction and boundary

The product owner has now asked to remove manual approval from the recurring
content loop: “I don't want to approve manually keep posting and keep reaching
more people on social media.” This is approval of the desired operating model,
not permission for unsolicited messaging, personal-profile automation,
scraping, group-member harvesting, paid advertising or bypassing provider
rules. The safe interpretation is one standing release policy for FarmerBook's
own website and business-owned social channels, with deterministic checks,
quotas, receipts, verification and automatic pause replacing per-post review.

## Live implementation findings

The production `BlogWritingAgent` is a usable base but still has a hard human
publication boundary. `createDraft()` writes `awaiting_review`,
`reviewDraft()` is the only transition to `published`, and `listPublished()`
selects every row whose status is `published` (`features/blog/agent.ts:605`,
`:842`, `:923`). The row already records source-manifest version, source review
time, risk class, revision, content hash events and publication-verification
state. A failed verification pauses the daily schedule (`features/blog/agent.ts:892`).
This means autonomous publication should extend this dedicated Agent rather
than enable the broader Live Action Phase 1 scaffold.

The current social system cannot publish. Its model prompt explicitly produces
copy “for human approval,” always records `needsHuman: true`, and reports
`postsPublished: 0` and `directMessagesSent: 0`
(`features/customer-operations/ai.ts:274`,
`features/managed-agents/processor.ts:498-524`). Production contains the
`SOCIAL_CONTENT_AGENT` binding and a false `ENABLE_SUPPORT_SOCIAL_PILOT` flag,
but no Facebook/Meta, Instagram, LinkedIn or X publishing credential. The
existing `YOUTUBE_DATA_API_KEY` is used only for read-only public discovery.

The local Live Action Phase 1 scaffold is intentionally unusable for this
release. `LIVE_ACTION_EXTERNAL_EXECUTORS_READY` is a literal false, the default
executor registry is empty (`features/action-control/executors.ts:79`, `:165`),
and owned-site publishing is still classified as a high-risk two-approval
action (`features/action-control/policy.ts:67`). It also retains the previously
recorded production blockers: restricted database roles, isolated connectors,
an independent verifier, authorization ingress, reconciliation and observed
shadow evidence. Enabling it would weaken rather than complete the requested
boundary.

## Platform research

Official platform publishing should target organization assets, never a signed-
in person's timeline:

- LinkedIn's Posts API supports organic organization posts. Publishing as an
  organization requires `w_organization_social` and an appropriate Page role.
  Requests also use LinkedIn version and protocol headers.
  `https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2025-09`
- Meta's Instagram publishing guidance supports professional accounts. With
  Facebook Login, the Instagram professional account must be linked to a Page
  and the application needs publishing permissions such as
  `instagram_content_publish`. Meta's official Page and Instagram publishing
  references are `https://developers.facebook.com/docs/pages-api/posts/` and
  `https://developers.facebook.com/docs/instagram-platform/content-publishing/`.
- The YouTube Data API exposes videos, playlists, channels and related
  resources but no Community-post publishing resource. An API key is not an
  OAuth publishing credential. `https://developers.google.com/youtube/v3/docs`

The only defensible first connectors are therefore a FarmerBook Facebook Page
and/or LinkedIn Organization Page. Instagram can follow after a professional
account is linked and every post has rights-cleared media. YouTube publication
requires a separate video workflow and OAuth grant; the current discovery key
cannot be repurposed. X remains unconfigured. A prior one-off Facebook post on
the founder's personal Friends-only timeline must not become an automated
connector.

## Recommended standing-policy system

### Owned-site publication

Only low-risk briefs are auto-eligible. Certification status, food-safety,
chemical, medical, veterinary, yield, income, price, guarantee and personal-
story claims stay outside the automatic lane. A candidate must pass the strict
`BlogPublication` schema, a fresh reviewed-source manifest, an exact allowed-
claim policy, prohibited-claim scanning, URL allowlisting, source-count rules,
PII/media exclusion and an exact content hash. Stale, ambiguous or medium-risk
work is skipped; it is not queued for daily human approval.

Publication remains capped at one article per India calendar day and 31 per
month within the existing USD 2 Blog and USD 10 fleet inference budgets. The
Agent records `publication_mode=autonomous`, policy version, payload hash and
an idempotency key. A separately scheduled route check verifies the slug and
content fingerprint after the publishing RPC completes. Until that check
passes, the publication is provisional. Mismatch makes it non-public,
preserves the evidence and pauses the schedule.

Existing awaiting-review drafts are not retroactively published. In
particular, the current “Under Conversion” draft has a certification-adjacent
risk class and stays private.

### Owned-channel social publication

Social text should be derived deterministically from an already verified
FarmerBook article: reviewed title, bounded excerpt, canonical URL, fixed
campaign tags and UTM parameters. This avoids a second unconstrained model
generation. Each configured business channel gets at most one post per article
and one post per day, with a channel-specific outbox idempotency key, provider
receipt, follow-up read verification and zero blind retries after an ambiguous
outcome. Unknown, authorization, policy, rate-limit or receipt mismatch pauses
only that channel.

The social publisher does not send direct messages, invite friends, join or
post into groups, comment, like, follow, scrape followers, profile users or buy
ads. Reach is measured through aggregate UTM visits, registrations and
activated profiles, not platform-person data. Connector credentials belong in
an isolated publisher service, not in the Blog Agent or central coordinator.

## Research checkpoint

The production Blog Agent can be evolved into a guarded autonomous publisher,
but the current social system is draft-only and no official social publishing
credential is configured. Implementation therefore has two releases: first the
owned-site standing-policy canary; then individually enabled business-page
connectors after the product owner confirms those assets exist and completes
their one-time official authorization. No production state or external post
was changed during this research checkpoint.

## 2026-08-22 research addendum: autonomous consented-delivery completion

### Requested outcome and retained boundary

The product owner has now selected content and outreach as the first workflows
that should operate without routine human approval. The existing standing-policy
Blog path already supplies bounded daily drafting, deterministic low-risk
eligibility, a separate rendered-hash verifier, quarantine, budget ceilings and
automatic schedule pause. The existing Growth & Outreach Agent already handles
double-opt-in confirmations, introductions, replies and one separately
consented follow-up on a recurring schedule. This tranche therefore does not
create a new broad agent or remove the existing consent, suppression, legal
sender, role, audit, retention or emergency-pause controls.

### Dispatch race and stop-condition gap

`claim_outreach_outbox(integer)` checks the database release control, runtime
pause, expiry, purpose-specific consent, reply authorization and suppression
before changing a row from `pending` to `processing`. The TypeScript processor
then reads the private contact, may prepare an invitation and calls the provider.
There is no second authorization check immediately before that provider call.
A STOP, unsubscribe, complaint, hard bounce, privacy operation or emergency
pause that lands after claim can therefore race with the claimed delivery.

The provider correctly treats a Postmark timeout or ambiguous 5xx result as
`POSTMARK_DELIVERY_UNKNOWN` and does not retry that row. However, the database
delivery control remains active, so another scheduled cycle could continue with
different recipients. The in-memory three-failure circuit similarly skips the
rest of the claimed batch without persistently pausing the database gate.

### Production-safe completion

Add a service-role-only `authorize_outreach_dispatch(uuid)` RPC called after a
row is claimed and immediately before any private-contact read, invitation
preparation or provider call. It will serialize authorization reservations,
recheck the release/pause/expiry/suppression and purpose-specific consent or
reply authority, and reserve one slot in a fixed India-calendar daily delivery
ceiling. Every decision is written to an immutable redacted ledger containing
only outbox/prospect identifiers, purpose, channel, attempt, decision code and
timestamp—never contact values or message bodies.

The database will defer a row to the next India day when the hard daily ceiling
is exhausted, cancel a row whose authority has ended, and return a stable
actionable code to the processor. A separate service-only automatic-pause RPC
will pause delivery and release other claimed rows after missing runtime/provider
readiness, an unknown provider result, or a three-failure circuit break. Its
immutable system event records the bounded reason code without requiring a
fictional human actor. Human pause/resume remains available as an emergency and
recovery control, not a per-message approval.

### Configuration readiness

The provider's `configured` flag already verifies the FarmerBook sender domain,
Postmark token, inbound address, transactional stream, physical postal footer,
HTTPS origin, action-token secret and authenticated webhook credentials. The
autonomous delivery entry points also need to fail before claim when the
service-role key, processor bearer, consent and invitation signing secrets,
Turnstile settings and Broadcast stream are absent. A pure readiness evaluator
will expose one bounded remediation code and will be used by both the dedicated
processor route and the scheduled Growth & Outreach Agent.

### Research checkpoint

The minimal safe change is a forward-only outreach authorization/reservation
and system-stop migration plus a shared TypeScript readiness/dispatch wrapper.
It extends the existing consent-first architecture and leaves discovery CSVs,
public contact data, cold email, WhatsApp, personal social profiles, groups,
DMs, paid ads, production accounts and real delivery outside this repository-
only implementation.

# 2026-08-24 research: customer Farm Visits intake and organic-farm video

## Requested outcome and trust boundary

The requested public surface is a new `/farm-visits` section that shows the
downloaded “Visiting organic farm” status video, lets a signed-in Customer
register interest using a private address, tells the Customer that no visit is
confirmed until FarmerBook checks a suitable farm and obtains the Farmer's
agreement, and notifies two owner inboxes so the visit can be planned. The
address, phone and email are private operational data. They must never enter a
public profile, page markup, analytics event, model prompt, social post or URL.

The supplied video is a 90.059-second H.264/AAC portrait MP4, 478×850 and
16,833,391 bytes at
`/Users/ngonapa/Downloads/Nagamani-House-organic-farm-visit.mp4`. Visual review
shows identifiable adults on an organic-farm visit. A WhatsApp Status is not,
by itself, a public-republication licence. Production publication therefore
requires the product owner's explicit confirmation that the video owner and
identifiable participants authorized public use on FarmerBook. The video can be
copied into a local release candidate only after that confirmation; it must not
be put on the live site before it.

## Existing authentication and role model

`features/auth/require-user.ts:25-78` already resolves the authenticated
Supabase user, requires an active completed profile and returns the account
role, profile name and authentication email. `features/auth/capabilities.ts:26-50`
defines `customer` as an existing first-class role with the `buy` capability.
The Farm Visits action should reuse this identity and accept only the exact
`customer` role, rather than trusting a submitted name, email or role field.
Visitors and non-Customer members can still see the explanatory page and video,
but the request area should show sign-in/join guidance instead of the form.

The current marketplace enquiry is the nearest UI/action pattern:
`features/marketplace/inquiry-form.tsx:22-45` converts bounded form data into a
server action and renders an in-place success state; `features/marketplace/actions.ts:115-188`
validates input, requires an active account and delegates the write to a narrow
database RPC. Farm Visits should follow this pattern, but it must not reuse the
market enquiry table because visit addresses and operational status have a
different purpose, access policy and retention boundary.

## Private persistence and database policy

Supabase is the production system of record. Existing migrations use Row Level
Security and purpose-limited `security definer` RPCs. For example,
`supabase/migrations/20260731120000_roles_connections_reviews.sql:316-330`
starts the authenticated marketplace connection RPC with an empty search path,
and its policies bind reads to the current user or administrator
(`:279-289`). The new table should be private by default, have RLS enabled, and
have no anonymous or browser table grants. A single authenticated RPC should:

1. bind `requester_id` to `auth.uid()`;
2. verify an active, completed `customer` profile;
3. copy the profile name and server-authenticated email, not client assertions;
4. validate bounded India address/phone/party/preference fields again in SQL;
5. allow only one open request per Customer and make replays idempotent; and
6. return only the request identifier and notification state.

The private row needs a small auditable lifecycle (`new`, `reviewing`,
`checking_farmer`, `offered`, `scheduled`, `closed`, `cancelled`) and a separate
notification outcome (`pending`, `sent`, `failed`, `unknown`). Address fields
remain private; the initial implementation does not expose an admin table or
send them to a Farmer. Account deletion can rely on a foreign-key cascade, and
the consent text must say the two FarmerBook operators receive the details by
email for this planning purpose.

## Transactional notification path

Production already has the encrypted `POSTMARK_SERVER_TOKEN` plus plain
`POSTMARK_FROM_EMAIL` and `POSTMARK_TRANSACTIONAL_MESSAGE_STREAM` bindings.
The existing provider proves the supported Workers-compatible fetch contract
at `features/outreach/postmark-provider.ts:171-210`: POST JSON to Postmark with
the server token, bounded timeout, explicit Message Stream, no open tracking
and no link tracking. Its outreach-specific wrapper also adds unsubscribe and
postal-marketing text, so Farm Visits should use a separate transactional
notification adapter rather than misclassifying an owner operational alert as
marketing outreach.

The adapter should have a code-reviewed recipient allowlist, never take a
recipient from the browser, use the request/idempotency key as the Message-ID,
and record the sanitized provider receipt or bounded failure code back through
a service-only RPC. A timeout is ambiguous and must be recorded as `unknown`
without a blind retry. The Customer-facing success message should be based on
the durable database insert: “We received your interest. We will check a
suitable farm and the Farmer's availability, then contact you. This is not a
confirmed visit.” If notification fails, the request must remain available for
operator recovery instead of being lost.

There is a material recipient ambiguity. The product owner wrote
`ceo@farmbook.in`, while every repository contact, authenticated sender and
production domain uses `ceo@farmerbook.in` (`lib/contact.ts:1` and
`.env.example:77`). Sending private Customer addresses to the different
`farmbook.in` domain could disclose them to an unintended mailbox. The release
plan therefore proposes `gnm444@gmail.com` and `ceo@farmerbook.in`; the product
owner must explicitly confirm this correction before implementation and any
real notification.

## Public route, localization and media delivery

`components/public-header.tsx:7-41` and
`components/public-footer.tsx:14-49` are the stable public navigation surfaces;
`app/sitemap.ts:8-43` enumerates public discoverable pages. The new link should
be controlled by `ENABLE_FARM_VISITS`, default false in `.env.example`, and
enabled only in the approved release. `proxy.ts:5-29` uses an explicit public
prefix list, so `/farm-visits` must be added there. Video extensions should also
be excluded from session middleware or served under the same public prefix so
unauthenticated playback never redirects to login.

The 23-language catalog derives its exact shape from `en-IN`; Telugu currently
overrides a small set of keys and otherwise reuses English
(`lib/i18n/messages/te-IN.ts:1-24`). The Farm Visits namespace can provide
reviewed Indian English and Telugu copy, with the other 21 catalogs explicitly
inheriting Indian English and displaying a fallback disclosure. That avoids
claiming unreviewed translations while keeping the form usable in AP and
Telangana.

The MP4 is below Cloudflare's current generated static-asset ceiling in this
application build, but it is still large enough to deserve `preload="metadata"`,
native controls, a poster frame, a descriptive caption and a transcript/summary.
The UI must state that one visit is contextual learning, not certification or a
guarantee that every crop, plot or batch is organic.

## Production topology and release isolation

The current Worker version at 100% traffic is
`36b29fcd-4fe9-4fad-a5ac-ee926f92703e` (2026-08-23), which is the application
rollback target. Its bindings already contain the Postmark transactional
configuration and Supabase service credential names. The linked production
migration ledger has intentional historical gaps, but its latest remote
migration is `20260822120000`. A new Farm Visits migration must therefore be
forward-only and later than that version. Do not use `--include-all`: it would
try to release many intentionally absent older ecosystem migrations. Preflight
must show that the normal push contains only the new Farm Visits migration.

The shared worktree is heavily dirty with earlier owner-approved work. The
Farm Visits tranche must touch only its new feature files, one new migration
and pgTAP suite, the public route/navigation/proxy/sitemap/flag/catalog/CSS
integration points, focused tests, and structured documentation. Deployment
must be from an inspected production build that preserves all current bindings
and secrets. The migration goes first; the Worker flag remains false until the
new database objects and notification configuration pass smoke checks.

## Test and verification implications

Required local evidence is: schema edge cases; Customer-only server action;
idempotent duplicate handling; one-open-request limit; Postmark request shape
and `sent`/`failed`/`unknown` receipts; redaction/no-client-recipient tests;
React success/gate/copy tests; static video signature, dimensions and duration;
public route/proxy/sitemap tests; migration structure tests; clean local
migration apply; pgTAP proving RLS/RPC/admin/service boundaries; repository
ESLint, TypeScript, Vitest and production build; and strict Wrangler dry run.

Production evidence must include a protected pre-migration backup, a migration
dry run showing only the new migration, exact binding-name preservation, the
new flag enabled, 200 responses for the page and MP4, unauthenticated sign-in
gate, an authenticated Customer test request using owner-controlled synthetic
contact/address data, receipt verification in both owner inboxes, database
status confirmation, and cleanup/cancellation of that synthetic request.

## Research checkpoint

The feature fits the current architecture without adding an AI Agent or a new
provider. Implementation is blocked only on two owner decisions that cannot be
safely inferred: confirm the intended second mailbox is
`ceo@farmerbook.in` (not `ceo@farmbook.in`) and confirm public-republication
permission for the identifiable organic-farm video. No application code,
database, email, video publication or production state was changed during this
research phase.

## Sandeep Dasari / Avani Van editorial profile, evidence policy and requested store — 2026-08-25

### Confirmed identity and source boundary

The product owner corrected the subject's full name to **Sandeep Dasari**, gave
the location as Bommalaramaram, Telangana, and directly confirmed that
`https://www.youtube.com/@AvanivanFarms` is Sandeep's farm-owned channel. The
official YouTube oEmbed response for `PaJk_KSsD5I` identifies the video as “A
Tour of Avani Van Farms - Part 1,” published by Avanivan, and resolves its
author URL to that channel. The official oEmbed response for `nzB61ZhIc1Q`
identifies the supplied Telugu interview title and publisher as Mi Andhra
Adapaduchu, resolving to `https://www.youtube.com/@Mi_AndhraAdapaduchu`.

The operator-supplied timestamp summary supports only attributed statements:
Sandeep's former software work; his personal reason for changing direction;
Gir and Ongole cattle; his stated animal-care practices and dairy-cost
estimate; minimal tillage and retained surface biomass; a six-year aspiration
for fewer external inputs; and the reservoir, filtration, Black Soldier Fly
and composting practices shown or discussed. The cancer narrative cannot be
turned into a causal health claim. The ₹140–₹150 figure is a dated interview
estimate, not a current market price or health-quality guarantee. “Organic” is
self-described: without approved certification evidence the exact public label
must remain `Non-certified organic farmer (paperwork not yet completed to prove
certification).`

Searches using the corrected name, farm name and location found no reliable
non-social source that could safely be associated with this Sandeep Dasari.
Results referred to unrelated namesakes and must not be used. The supplied
videos and owned channel are the complete current evidence set. A private
content and claim draft exists at
`artifacts/featured-farmers/sandeep-reddy-avani-van-draft.md`; implementation
can rename it without rewriting its content history.

### Existing editorial publication architecture

FarmerBook already distinguishes editorial stories from member profiles. The
public route renders `FeaturedFarmerPublication` snapshots as Article-about-
Person pages, not `ProfilePage` records (`app/featured-farmers/[slug]/page.tsx`;
`tests/featured-farmer-metadata.test.ts:13-28`). The presentation includes
claim citations, owned social links, third-party coverage, limitations,
correction/removal, editorial disclosure and either rights-cleared media or a
provider-hosted YouTube preview (`features/featured-farmers/public-profile.tsx`;
`tests/featured-farmer-public-profile.test.tsx:115-193`). This is the correct
surface for Sandeep; a member profile would imply that he registered or
authorized an account.

The L. Narayana Reddy pilot is a typed, version-controlled publication snapshot
(`features/featured-farmers/narayana-reddy.ts:1-end`). It remains visible while
the database newsroom is disabled. `loadFeaturedFarmerPublications` injects
that snapshot before database rows and `loadFeaturedFarmerPublication` resolves
its slug directly (`features/featured-farmers/queries.ts:422-455`). The sitemap
derives story URLs from the same loader (`app/sitemap.ts:21-57`). A second
curated snapshot therefore reaches the collection, detail route, metadata and
sitemap without enabling the dormant database newsroom.

### Current evidence gate and temporary relaxation

The application readiness function counts selected `website` sources from two
publisher hosts, requires an official/institutional/independent source, then
separately requires two fully cited claims, one valid farmer-owned social
account, three story sections and approved media if media exists
(`features/featured-farmers/source-policy.ts:55-111`). The client newsroom
repeats this assessment and disables publication unless it passes
(`features/featured-farmers/editorial-workspace.tsx:434-494`). The database is
authoritative: `refresh_featured_farmer_readiness` repeats the professional-
domain and authoritative-source checks before the publish RPC creates an
immutable snapshot
(`supabase/migrations/20260812150000_featured_farmer_profiles.sql:381-499,
1364-1517`).

The owner's request is to make only the non-social professional-source checks
optional for now. Identity-safe controls should remain: every claim needs
selected evidence, at least two reviewed claims remain necessary, the owned
channel must be confirmed, the story still needs three sections, media rights
remain enforced, fact checking must be current, and the public page must say it
is editorial, non-member, non-certified and not verified.

A single private database control is preferable to an environment-only flag:
`featured_farmer_professional_sources_required`, default false. The server can
read it while loading the private workspace, pass the value to the client
assessment, and the database readiness function can read the same value
atomically. This prevents application/database drift. A later operator can
restore the stronger gate by changing one private control to true; no schema
rollback or data rewrite is needed. It must be introduced in a forward-only
migration because the original migration is historical.

### Store authorization and product-data boundary

The requested products are Desi cow milk, buffalo milk, Desi chicken, Desi
eggs, paneer, ghee, cold-pressed oils (types unspecified), jaggery and mulberry.
The taxonomy already has compatible selectable entries for cow milk, buffalo
milk, paneer, ghee, backyard/native poultry, chicken eggs, chicken meat,
jaggery, mulberry and oilseeds (`lib/agriculture/categories.ts:72-82,
135,250-272,282-295,355`). The catalog can display the owner's wording, while
avoiding certification or availability guarantees.

A real FarmerBook store cannot be attached to an editorial publication.
`produce_listings.farmer_id` is a foreign key to a real profile
(`supabase/migrations/20260730120000_marketplace_growth.sql:6-33`). RLS requires
the inserted `farmer_id` to equal the authenticated user and requires an
active, onboarding-complete Farmer or Wholesaler
(`supabase/migrations/20260731120000_roles_connections_reviews.sql:147-185`).
The server action also always writes `farmer_id: user.id`
(`features/marketplace/actions.ts:18-79`). Public storefronts resolve a real
profile handle and its live listings (`features/marketplace/queries.ts:225-259`).
Creating a store without Sandeep's account would bypass ownership and route
buyer enquiries to an identity he does not control.

The listing schema also requires current title, specific product/variety,
description, quantity and unit, minimum order, price and price unit,
availability window, grade and delivery options
(`features/marketplace/schemas.ts:3-22`). None of those transactional facts have
been supplied. The safe interim UI is a non-orderable **Reported farm products**
section inside the editorial story. It must say that availability, price,
quantity, delivery, food-business registration and certification have not been
verified and direct buyers to the farm-owned channel rather than collecting a
FarmerBook enquiry.

This caution is also proportionate to current official food-business guidance.
FSSAI states that food business operators require registration/licensing and
its current FoSCoS eligibility material specifically covers dairy processing,
milk products, vegetable-oil processing and direct sellers. FSSAI's dairy
guidance includes liquid milk, ghee and paneer and points to hygiene controls.
Sources reviewed on 2026-08-25:

- `https://fssai.gov.in/business/registration`
- `https://foscos.fssai.gov.in/search-eligibility/CL`
- `https://www.fssai.gov.in/upload/uploadfiles/files/Guidance_Document_Milk_14_03_2019.pdf`
- `https://fssai.gov.in/inspection/hygiene-requirements`

FarmerBook need not determine the exact licence class in this feature, but a
live store should require Sandeep to supply the applicable registration or
licence status for review, especially for processed dairy, oil and meat.

### Planned publication and product-catalog shape

The curated snapshot should use slug `sandeep-dasari-avani-van-farms`, location
Bommalaramaram/Telangana, and cited story categories covering dairy cattle,
cattle rearing and composting. It should cite the Mi Andhra interview for the
timestamped claims, cite the Avanivan video for first-party farm context, link
the confirmed owned channel, and use only a source-hosted YouTube preview with
visible credit. No thumbnail will be copied into FarmerBook.

An optional typed `reportedProducts` snapshot field can render the nine
operator-supplied product groups with a uniform `reported` status and no price,
stock, order or enquiry action. The public UI must call this a reported catalog,
not a store. It can later be replaced or linked to `/store/[handle]` only after
Sandeep owns an active FarmerBook Farmer account, completes onboarding, reviews
the profile, provides current listing details and satisfies applicable product
and food-safety evidence.

### Verification and release implications

Focused coverage must prove both evidence-policy modes: optional mode passes
with cited YouTube evidence and a confirmed owned channel, while required mode
retains the two-domain and authoritative-source blockers. Migration tests must
prove the new control defaults false and guards only those two checks. Public
tests must parse and render the Sandeep snapshot, links, limitations, reported
products and source-hosted preview while proving there is no store/order/enquiry
UI. Loader tests must prove both curated stories appear once and resolve by
slug. Existing marketplace tests must remain unchanged, demonstrating that the
editorial exception did not weaken seller ownership.

The shared worktree contains extensive owner changes unrelated to this profile.
Implementation must stay within new Sandeep files, Featured Farmer policy,
schema, loader and UI integration, one forward migration, focused tests and
documentation. No production deployment should occur from an unreviewed dirty
tree. First produce a local rendered preview and obtain pre-publication content
approval; only then deploy an inspected artifact that preserves all bindings
and unrelated work.

## Sandeep profile contact, private questions, customer recommendations and profile views — 2026-08-25

### Requested outcome and consent boundary

The product owner supplied `avanivanfarms@gmail.com` after being asked to
confirm that it may be displayed publicly and used as the fixed recipient for
Sandeep Dasari / Avani Van Farms questions. The profile may therefore show a
direct `mailto:` contact. The recipient must still be selected by trusted
server code from the publication slug; a browser must never choose an arbitrary
recipient or use the displayed address as an action parameter.

The two requested writing surfaces have different audiences and must remain
separate:

- **Ask Avani Van Farms** is a private question/comment form. It sends the
  visitor's name, reply email, message and FarmerBook request ID to the supplied
  farm email. Nothing from this form is posted on the profile.
- **Customer recommendations** are public, LinkedIn-style testimonials. They
  require a signed-in, active, onboarding-complete Customer account, explicit
  public-display consent and administrator moderation. They are not star
  ratings and must not claim a verified FarmerBook purchase.

No implementation, database migration, email, recommendation, visit increment,
feature-flag change or deployment was performed during this research phase.

### Existing page and publication shape

The public detail route resolves an immutable curated publication and renders a
single `FeaturedFarmerStory`
(`app/featured-farmers/[slug]/page.tsx:62-83,178-193`). The snapshot validator
already supports optional editorial fields and source-hosted media, while the
curated list makes Sandeep available independently of the absent production
newsroom schema (`features/featured-farmers/queries.ts:202-319,493-520`). The
new contact email can therefore be an optional snapshot field for display, but
mutable engagement data must come from a separate standalone domain.

`FeaturedFarmerStory` currently renders editorial content, source thumbnails,
social accounts, limitations and the FarmerBook correction address
(`features/featured-farmers/public-profile.tsx:300-532`). It has no mutable
forms or counters. The engagement UI should be a focused client component
rendered after the story body and receive only the publication slug, display
name, public email, initial aggregate count, approved recommendations and
whether the current account may recommend. Private recipient routing and
reviewer email must stay server-side.

The route currently memoizes only the publication loader with React `cache`
(`app/featured-farmers/[slug]/page.tsx:11-20`). A changing counter must not be
embedded in that curated snapshot or treated as editorial metadata. Load the
current aggregate separately and let a client visit marker atomically update it
after render.

### Why marketplace reviews cannot be reused

The existing review domain is transaction reputation. `market_reviews` requires
one unique `market_enquiries` row, a listing, reviewer and seller UUID, a 1–5
rating, and different reviewer/seller identities
(`supabase/migrations/20260731120000_roles_connections_reviews.sql:404-424`).
`can_review_enquiry` proves the enquiry is `won`, the reviewer is the exact
Customer buyer, and the seller owns the listing
(`supabase/migrations/20260731120000_roles_connections_reviews.sql:430-465`).
Its anonymous policy exposes only active reviews for a real marketplace seller,
and Customer inserts must pass that completed-purchase predicate
(`supabase/migrations/20260731120000_roles_connections_reviews.sql:469-509`).

Sandeep's editorial subject has no FarmerBook auth user, seller profile,
listing, enquiry or completed transaction. Reusing `market_reviews`, inventing
an enquiry or presenting a “verified purchase” badge would contradict the live
profile's non-member disclosure. The safe model is a separate recommendation
table with the exact visible label:

> Customer recommendation · relationship self-declared · reviewed for
> publication · not a verified FarmerBook transaction.

One active or pending recommendation per Customer and Featured Farmer is
sufficient. A Customer may edit or withdraw their own text; an edit returns it
to `pending`. Public reads return approved display fields only. The submitter's
email and UUID are never exposed, and account deletion cascades the
recommendation.

### Authentication and moderation primitives

`requireUser` already derives the authenticated email and profile server-side,
redirects unsigned visitors, rejects inactive accounts, and by default requires
completed onboarding (`features/auth/require-user.ts:24-77`). The new
recommendation action should additionally require `accountRole === "customer"`.
It must never trust a client-supplied reviewer name, email, role or moderation
state.

`requireAdmin` checks `app_metadata.role === "admin"` before private server
operations (`features/auth/require-admin.ts:5-24`). The existing Featured Farmer
newsroom route cannot host the queue because production does not contain that
newsroom's base schema and its loader can return unavailable
(`features/featured-farmers/queries.ts:321-349`). A small independent
`/admin/featured-farmer-engagement` queue should use `requireAdmin`, a service
client and purpose-specific approve/reject/restore RPCs. An append-only
recommendation moderation-event table should record administrator, prior/new
state, reason and timestamp without weakening the marketplace report/action
constraints.

The baseline production schema provides `profiles`, `set_updated_at()` and
`is_admin()` (`supabase/migrations/20260729160000_initial_farmerbook.sql:7-39,
193-240`), and the remotely applied three-role migration provides
`profiles.account_role` (`supabase/migrations/20260731120000_roles_connections_reviews.sql:5-29`).
A standalone migration can depend on these primitives without depending on the
unapplied Featured Farmer newsroom migration.

### Private question delivery and abuse controls

The Farm Visits notification path is the correct provider precedent, not the
autonomous outreach campaign path. It validates Postmark acceptance, requires
the verified `ceo@farmerbook.in` sender, disables open/link tracking, uses a
deterministic message ID, returns `unknown` for an ambiguous provider outcome
and never retries that ambiguity
(`features/farm-visits/notification.ts:64-128`). Its action first creates a
durable idempotent row and then records `sent`, `failed` or `unknown`
(`features/farm-visits/actions.ts:52-122`).

Unlike Farm Visits, a profile question should remain usable without a
FarmerBook account. It therefore needs all of the following before any write or
provider call:

- a strict Zod schema with bounded, trimmed, control-character-safe name,
  reply email, kind (`question` or `comment`), 20–1,500 character message,
  explicit consent, UUID idempotency key and invisible honeypot;
- the existing Cloudflare Turnstile verifier with exact request hostname and a
  dedicated exact action; the verifier already fails closed on missing secret,
  provider error, hostname mismatch or action mismatch
  (`features/outreach/turnstile.ts:9-40`);
- a code-owned registry mapping only
  `sandeep-dasari-avani-van-farms` to `avanivanfarms@gmail.com`;
- service-only creation with at most three submissions per normalized-email
  HMAC per profile in 24 hours and a profile-wide ceiling of 100 per day;
- a new server-only HMAC secret so the database stores neither visitor email,
  name nor message; and
- one Postmark transactional email with the visitor email as `ReplyTo`, no
  tracking and no automatic retry after an unknown outcome.

The database needs only a private delivery ledger: subject slug, keyed sender
hash, idempotency UUID, message kind, provider state/receipt/failure and
timestamps. The visitor's raw name, email and message exist only in memory for
the one provider request and in Sandeep's recipient mailbox. They must not be
written to analytics, logs, metadata, an administrator queue or the public
page. This follows the product rule that analytics metadata must not contain
message bodies or email addresses (`docs/MVP_PRODUCT_DESIGN.md:381-385`).

The existing Turnstile public site/secret bindings and Postmark transactional
bindings are present in the application configuration
(`.env.example:67-91`). A dedicated configuration check should fail closed
unless the new engagement flag, Supabase, service role, HMAC secret,
Turnstile and Postmark transactional values are all available.

### Standalone engagement schema and data flow

A forward-only migration should create a production-independent engagement
domain:

```text
featured_farmer_engagement_subjects
  slug PK, display_name, public_email, views_enabled,
  questions_enabled, recommendations_enabled, profile_view_count
       │
       ├── featured_farmer_question_deliveries (private metadata only)
       └── featured_farmer_recommendations ── profiles(reviewer_id)
                                              │
                                              └── moderation events
```

The subject seed contains Sandeep's slug, display name and public email. All
tables use forced RLS and revoke browser table access. Purpose-specific
security-definer RPCs expose only:

- public subject display fields and aggregate `profile_view_count`;
- approved recommendation display rows for active profiles;
- a service-only atomic visit increment;
- a service-only idempotent/rate-limited question-delivery reservation and
  receipt update;
- authenticated Customer submit/edit/withdraw operations; and
- administrator-only moderation and private queue reads.

Every function must set `search_path=''`, schema-qualify objects, revoke
`public`/`anon`/`authenticated` by default, and grant only the minimum explicit
role. Raw tables never receive anonymous or authenticated grants.

Question flow:

```text
browser form → Zod + honeypot → exact-host/action Turnstile
             → server HMAC + fixed slug registry
             → service-only idempotent reservation
             → one Postmark transactional send to fixed farm email
             → service-only sent/failed/unknown receipt
```

Recommendation flow:

```text
signed-in Customer → server-derived identity → Customer-only RPC → pending
                   → admin queue + audited decision → approved public RPC
                   → public recommendation card (no email/UUID/verified badge)
```

### Counting visits without pretending to identify people

The existing `product_events` system is not appropriate. Its type union covers
named authenticated product events only and its writer accepts a user ID
(`features/analytics/events.ts:6-31`). It does not provide an atomic public
per-profile count, and adding emails, IPs or messages to its metadata is
explicitly prohibited.

An exact count of distinct people is impossible without identity or invasive
fingerprinting. The UI should say **Profile views**, with help text explaining
that it is approximate. A client marker calls the same-origin server action
after the real page renders. The server action validates the known slug,
rejects obvious bot user agents, checks/sets a first-party HttpOnly SameSite
cookie containing only the last counted UTC date for this profile, and calls a
service-only atomic increment when the browser has not been counted that day.
No IP address, user agent, random visitor ID, fingerprint or per-visitor row is
stored. Repeat refreshes from the same browser on the same UTC day do not
increase the count; different browsers/devices and cleared cookies may do so.
The aggregate remains useful while being honestly labelled and privacy-minimal.

### Production migration and release boundary

The linked migration ledger intentionally omits many local migrations,
including the Featured Farmer newsroom base. The latest remotely applied
migration is `20260824120000`; the optional newsroom migration
`20260825120000` is local-only. The new migration must therefore be a standalone
`20260825130000_featured_farmer_engagement.sql` that uses only confirmed
baseline/three-role objects. An unrestricted `supabase db push` or
`--include-all` would attempt unrelated historical work and is prohibited.
Rehearse the migration on a clean database and a production-shaped baseline,
then apply only the reviewed SQL in one transaction after a protected backup
and verify its migration-ledger entry.

The application surface should sit behind
`ENABLE_FEATURED_FARMER_ENGAGEMENT=false` by default. Production order is:
backup, exact isolated migration, database grant/RLS smoke tests, inspected
build, strict pinned Wrangler dry run, binding-name comparison, Worker deploy
with the flag enabled, then apex/`www` functional checks. The current healthy
rollback Worker is `bd06a4c2-2692-4a32-b60c-4ad2ff28aceb` from deployment
`28f0e572-8060-485b-9ccc-aaf07092b385`. The Wrangler skill requires the
project-pinned `npx wrangler@4.120.0` and preservation of every existing
Durable Object, AI, Images, service, workflow, variable and secret binding.

A live smoke test must not send a synthetic message to Sandeep or publish a
testimonial under another person's identity. Verify provider request shape
with a mocked adapter and validate the production UI/configuration without a
send. The first genuine visitor submission will be the first real farm-email
delivery unless the product owner separately authorizes a test message. A
synthetic recommendation may use an owner-controlled Customer only if it is
immediately removed and clearly never presented as a real customer statement.

### Verification implications and checkpoint

Focused tests must cover schema boundaries, recipient allowlisting, HMAC
redaction, honeypot, Turnstile hostname/action, rate limits, idempotency,
Postmark request/receipt/unknown behavior, Customer-only recommendations,
self-edit/withdraw, admin-only moderation, public approved-only projection,
account-deletion cascade, atomic counting, daily cookie de-duplication, bot
rejection, disabled configuration, public email rendering and exact trust copy.
Migration tests and pgTAP must prove forced RLS, zero table grants and exact RPC
role boundaries. Responsive browser tests must cover desktop/mobile form,
recommendations, empty state, sign-in prompt, profile count, keyboard/focus,
success/error states and no layout regression around the existing video cards.

Repository completion requires focused and full Vitest, ESLint, TypeScript,
production build, `git diff --check`, clean migration rehearsal when Docker is
available, pgTAP, strict Wrangler dry run and a changed-path/binding audit.
Implementation is now blocked only on the structured-development approval
checkpoint; the product owner must explicitly approve the plan before code,
database or deployment work begins.
## Raitu Nestham founder-only research snapshot — 2026-08-25

### Request and researched source set

The product owner requested that the natural/organic Farmer details collected
from `https://www.youtube.com/@Raitunestham` be available only to the website
administrator. The completed local research export contains 41 profiles and 37
publicly advertised professional phone numbers:

- `outputs/raitunestham-natural-organic-farmers-2026-08-25.md`
- `outputs/raitunestham-natural-organic-farmers-2026-08-25.csv`

The export is currently protected from accidental source control by the
repository's `/outputs/` ignore at `.gitignore:53`. It labels every number
`public/unverified`, preserves the exact source-video URL, and distinguishes
channel/farmer claims from independently verified facts. It is not currently
available through the application.

### Existing access boundary

The nearest existing surface is the founder-only sourced-Farmer workspace at
`app/(product)/admin/sourced-farmers/page.tsx:16-51`. It is already dynamic,
uncached and noindex. The page calls
`requireSourcedFarmerResearchOwner()` before loading or rendering the dashboard
and returns `notFound()` for every failed access state.

`features/sourced-farmers/access.ts:6-25` layers four gates:

```ts
if (!isFeatureEnabled("ENABLE_SOURCED_FARMER_RESEARCH")) {
  return { ok: false as const, code: "FEATURE_DISABLED" as const };
}
const administrator = await requireAdmin();
// Reject demo/unconfigured installations and every administrator except the
// configured FARMER_CONTACT_OWNER_ID.
```

`features/auth/require-admin.ts:5-22` validates the current Supabase user on the
server and redirects a missing/non-admin user. The sourced access helper then
checks the exact configured owner UUID at `features/sourced-farmers/access.ts:18-19`.
This is stronger than a generic admin-only check: only the configured founder
administrator can enter.

The browser denial contract is already tested at
`tests/e2e/sourced-farmers.spec.ts:3-44`. In the demo/anonymous environment the
route returns 404, private copy is absent, and the response carries noindex
metadata. Unit coverage at `tests/sourced-farmer-access.test.ts:16-59` proves
disabled-before-auth behavior, exact-owner admission and other-admin denial.

### Existing data boundary and policy conflict

The current system intentionally does not retain this requested dataset:

- `README.md:301-310` says titles/descriptions are contact-redacted and never
  stored; durable named profiles need subject consent or independent non-YouTube
  evidence.
- `docs/REQUIREMENTS.md:37-38` separates consented encrypted contacts
  (`FB-REQ-018`) from anonymous/transient YouTube discovery (`FB-REQ-019`).
- `docs/PRODUCTION_RUNBOOK.md:1399-1431` expressly forbids stored YouTube names,
  locations, contacts, transcripts and financial claims in the existing
  sourced-research database.
- `features/farmer-database/types.ts:3-8` accepts only direct interest, existing
  member, partner-consent campaign and consent-evidenced manual import as
  contact acquisition sources. A YouTube-public number is not a valid consent
  source and must not be inserted there.

The new request therefore needs a deliberately separate read-only research
snapshot. Treating the numbers as consented Farmer contacts would break the
current schema, UI copy, release evidence and outreach authorization rules.

### Evaluated implementation options

1. **Import into the private Farmer contact database — rejected.** That database
   represents consented relationships and encrypts contact values. Public
   YouTube metadata does not satisfy its acquisition/consent model.
2. **Add a new database domain — deferred.** A separately encrypted,
   owner-scoped lead-research table would be viable for editable retention,
   refresh and deletion, but it requires a migration, import path, retention
   job, RLS/RPC suite and production data mutation. None is necessary for a
   fixed 41-row read-only snapshot.
3. **Store the reviewed snapshot in a server-only application module —
   recommended.** It requires no migration and cannot contaminate contacts,
   consent, members, outreach or public publication. The module is imported
   dynamically only after the existing founder-owner check. A server component
   filters and renders the records; no `"use client"` module imports the data.

The recommended flow is:

```text
GET /admin/sourced-farmers/raitunestham
        |
        v
requireSourcedFarmerResearchOwner()
        | failed                         | exact founder owner
        v                                v
      404                     dynamic import of server-only snapshot
                                             |
                                             v
                               server-side query/category filtering
                                             |
                                             v
                              private HTML with source links and
                              public/unverified phone labels
```

The server module still creates an intentional durable copy of public
professional data inside the private application bundle. That is the narrow
product-policy change requiring explicit plan approval. It must not be imported
by a client component, exposed through an unauthenticated route, returned from a
public API, or described as consent.

### Proposed UI and data contract

Add `features/sourced-farmers/raitunestham-research.server.ts` with a readonly
typed dataset. Every row contains only:

```ts
type RaituNesthamResearchRecord = {
  id: string;
  videoDate: string;
  farmerOrGroup: string;
  location: string;
  state: string | null;
  scale: string | null;
  farmingFocus: string;
  methodsOrCrops: string;
  channelReportedClaim: string | null;
  publicUnverifiedPhone: string | null;
  youtubeSource: `https://www.youtube.com/watch?v=${string}`;
  priority: "recent" | "method" | "allied";
};
```

The new dynamic/noindex page should render a server-side search form, summary
counts, exact evidence warning and a responsive table/card surface. A telephone
link is acceptable as a browser affordance, but its adjacent label must say
`Public/unverified · not outreach consent`. The page provides no send, invite,
import, publish, verification or membership action.

Add a navigation link from the existing sourced research header; do not add the
route to public navigation or the sitemap. Reuse `.private-contact-table`,
`.table-scroll`, `.tag-row` and sourced-research card styles from
`app/globals.css:10743-10968`, adding only snapshot-specific responsive rules.

### Verification and release implications

Focused tests must prove:

- all 41 records have unique stable IDs and exact YouTube watch URLs;
- phone values are null or ten digits and remain labeled public/unverified;
- no record represents consent, a member, a verification result or a public
  profile;
- the pure renderer supports name/location/crop search and priority filtering;
- links use `target="_blank" rel="noreferrer"`, telephone links do not create a
  send action, and claims retain the channel-reported disclaimer;
- the anonymous/demo route returns 404, leaks no names/phones and emits noindex;
- source checks prevent a client component or public route from importing the
  server snapshot.

Run focused Vitest, ESLint, TypeScript, the production build, `git diff --check`,
and desktop/mobile Playwright. Deployment is a separate implementation step
after plan approval; live verification must prove anonymous denial and an
authenticated founder render without calling or messaging any farmer.
