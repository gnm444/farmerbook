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
