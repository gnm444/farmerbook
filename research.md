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
