# Build and pilot the FarmerBook responsive web MVP

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with the ExecPlan requirements and guidelines in the `execution-plan` skill.

## Purpose / Big Picture

After this plan is completed, an invited farmer can register in a phone browser, create a professional farming profile, publish a text or image post, find and follow other farmers, comment or mark a post helpful, send a private text message, and report unsafe content. An administrator can review reports and hide content or suspend an account. The founder can demonstrate the complete journey on a deployed URL and can run a controlled pilot of 100–500 people.

The MVP is a responsive website, not a native mobile application. It deliberately excludes phone OTP, video, payments, algorithmic recommendations, and other expensive infrastructure. The complete product scope and interaction design are recorded in `docs/MVP_PRODUCT_DESIGN.md`; the essentials needed to execute the build are repeated here so this plan remains usable on its own.

## Progress

- [x] (2026-07-29 02:02Z) Confirmed that `/Users/ngonapa/Downloads/farmerbook` is an empty, non-Git directory.
- [x] (2026-07-29 02:02Z) Defined the MVP product scope, journeys, screen model, data model, architecture, security boundary, and release gates.
- [x] (2026-07-29 02:02Z) Selected a single Next.js and Supabase architecture suitable for an AI-assisted prototype.
- [x] (2026-07-29 02:02Z) Verified that a real email-authenticated pilot needs custom transactional email and added it to the release gates.
- [x] (2026-07-29 15:28Z) User approved implementation and selected the Grounded Utility interface direction.
- [x] (2026-07-29 15:28Z) Initialized Git and the Sites-compatible Next.js 16 application foundation without replacing the planning documents.
- [x] (2026-07-29 15:58Z) Implemented the responsive application, deployable demonstration data, Supabase integration boundary, migrations, and automated checks.
- [ ] Product owner chooses the pilot region, crop focus, local language, pilot invitation method, and moderator.
- [ ] Conduct five short problem/technology interviews with representative farmers and update the assumptions in this plan.
- [x] Initialize the application, Git repository, quality tooling, environment template, and continuous integration.
- [x] Implement the shared design system, responsive navigation, public pages, and translation structure.
- [x] Implement authentication, onboarding, profile editing, and profile viewing.
- [x] Implement posts, images, feed, comments, and helpful reactions.
- [x] Implement discovery, follow/unfollow, network lists, and blocking.
- [x] Implement one-to-one text messaging.
- [x] Implement reports, administrator moderation, account suspension, and account deletion.
- [x] Add privacy-preserving product events and pilot aggregate queries.
- [ ] Complete unit, database-authorization, browser, accessibility, and responsive testing.
- [ ] Deploy a staging build, complete five usability tests, resolve release blockers, and open the controlled pilot.

## Surprises & Discoveries

- Observation: The target directory contains no files and is not a Git repository.
  Evidence: `ls -la` showed only `.` and `..`; `git status` returned “not a git repository.”
- Observation: Current Supabase guidance for Next.js uses `@supabase/ssr`, cookie-based server clients, a request proxy that refreshes authentication with `auth.getUser()`, and database Row Level Security.
  Evidence: Context7 retrieved the official Supabase Next.js authentication example and RLS guidance on 2026-07-29.
- Observation: The prototype can avoid a separate application server because Supabase supplies authentication, PostgreSQL, file storage, and protected APIs while Next.js supplies server-rendered pages and server actions.
  Evidence: The required MVP journeys do not require a message queue, external search service, or long-running process.
- Observation: Supabase’s built-in mail sender is a development facility, currently permits only project-team addresses, and is limited to two emails per hour; a real pilot needs custom SMTP or an equivalent supported email hook.
  Evidence: Official Supabase SMTP and authentication rate-limit documentation checked on 2026-07-29.
- Observation: A free hosted database project does not provide the same downloadable backup capability as a paid plan.
  Evidence: Official Supabase production checklist checked on 2026-07-29. The pilot must pay for managed backup capability or prove an independent logical backup and restore.

## Decision Log

- Decision: Build a responsive web application only.
  Rationale: The user explicitly wants a web interface and an inexpensive AI-first prototype. A native application would duplicate UI work and introduce store-release overhead before product demand is validated.
  Date/Author: 2026-07-29 / Codex
- Decision: Use Next.js 16 App Router with TypeScript and Tailwind CSS.
  Rationale: It supports mobile and desktop UI, server-rendered public pages, protected server actions, and deployment from one repository. TypeScript reduces common AI-generated integration mistakes.
  Date/Author: 2026-07-29 / Codex
- Decision: Use Supabase Auth, Postgres, and Storage through `@supabase/ssr`.
  Rationale: One managed platform replaces a custom authentication service, API server, database host, and file server. Official current guidance supports cookie-based Next.js server authentication and Row Level Security.
  Date/Author: 2026-07-29 / Codex
- Decision: Use email/password authentication for the first prototype.
  Rationale: It avoids SMS cost and abuse risk. This must be validated with five representative farmers before a real pilot; if email is unsuitable, phone OTP becomes an explicit scope change. Internal development can use authorized test addresses, but real signups require custom transactional-email delivery.
  Date/Author: 2026-07-29 / Codex
- Decision: Model relationships as one-way follows, not connection requests.
  Rationale: A follow model validates discovery and network value with fewer states, screens, notifications, and edge cases.
  Date/Author: 2026-07-29 / Codex
- Decision: Use a chronological global pilot feed with an optional “Following” filter.
  Rationale: A small controlled pilot needs enough visible content. An algorithmic feed would add complexity without useful training or behavioral data.
  Date/Author: 2026-07-29 / Codex
- Decision: Support one optional image per post and plain-text messages.
  Rationale: This demonstrates meaningful agricultural updates and private networking without a video pipeline, message attachments, or content-transcoding cost.
  Date/Author: 2026-07-29 / Codex
- Decision: Require database Row Level Security on every exposed table.
  Rationale: Browser code interacts with Supabase, so authorization must remain effective even when a client or application query is incorrect.
  Date/Author: 2026-07-29 / Codex
- Decision: Treat administrator authority as protected authentication metadata, not an editable profile field.
  Rationale: Otherwise a user could attempt to grant themselves administrator capabilities by modifying their profile.
  Date/Author: 2026-07-29 / Codex
- Decision: Use the selected Grounded Utility visual system.
  Rationale: The product owner selected direction A. Its strong labels, generous spacing, forest-green navigation, and restrained card treatment fit the primary first-time smartphone audience.
  Date/Author: 2026-07-29 / Product owner and Codex
- Decision: Keep a complete demonstration mode when Supabase environment values are absent.
  Rationale: Reviewers need to inspect every primary route before infrastructure credentials exist. Demonstration records are immutable fixtures and are not presented as durable pilot data; configured environments use Supabase and RLS.
  Date/Author: 2026-07-29 / Codex

## Outcomes & Retrospective

The implementation now provides the Grounded Utility responsive application, a complete fictional demonstration across the public, farmer, and administrator journeys, configured-mode Supabase queries and protected server actions, one forward-only migration with RLS and storage policies, seed data, CI, and automated unit/schema checks. Configured environments persist profile setup, image-backed posts, social relationships, direct messages, safety reports, moderation decisions, account controls, and bounded product events. `npm run check` passes with a production Vinext/Cloudflare build. A generated 1200×630 FarmerBook social card is wired into request-host-aware metadata.

The remaining work is operational rather than hidden application scope: connect a real Supabase staging project, run the committed migration and live RLS/browser suite, configure transactional email and recoverable backups, complete five farmer usability sessions, and name the pilot moderator. Email suitability remains the largest product risk.

At the end of each milestone, add a short entry here covering what is demonstrably working, remaining gaps, measured effort, and any scope decision that should affect later milestones.

## Context and Orientation

The repository root is `/Users/ngonapa/Downloads/farmerbook`. It currently contains only `README.md`, this plan, and `docs/MVP_PRODUCT_DESIGN.md`. There is no application or Git history yet.

The planned application uses the Next.js “App Router,” a file-based routing system in which folders below `src/app` define browser routes. A “server action” is an asynchronous function that executes on the Next.js server and is called by a form or browser component; server actions will validate protected writes. Supabase is the hosted backend. It supplies email authentication, a PostgreSQL relational database, and image storage.

“Row Level Security,” abbreviated RLS, is PostgreSQL authorization attached to a table. RLS policies decide which rows the current authenticated user may select, insert, change, or delete. RLS is mandatory because browser-side checks alone are not security.

After initialization, the important locations will be:

- `src/app`: pages, layouts, route handlers, and server actions.
- `src/components`: reusable interface elements.
- `src/features`: feature-specific queries, validation schemas, and components.
- `src/lib/supabase/client.ts`: browser Supabase client.
- `src/lib/supabase/server.ts`: cookie-aware server Supabase client.
- `src/lib/auth/require-user.ts`: server helper that rejects unauthenticated or inactive users.
- `src/lib/auth/require-admin.ts`: server helper that verifies protected administrator metadata.
- `src/proxy.ts`: request-time session refresh and redirects for protected routes.
- `src/i18n`: English and selected pilot-language dictionaries.
- `src/types/database.ts`: generated TypeScript representation of the database.
- `supabase/migrations`: ordered SQL migrations containing tables, indexes, functions, and RLS policies.
- `supabase/seed.sql`: clearly labeled fictional pilot data for local development.
- `tests`: unit and browser-level tests.
- `.github/workflows/ci.yml`: automated lint, type, test, and build checks.

The route and data requirements are:

- Public routes: landing, login, signup, reset password, community rules, privacy, and terms.
- Farmer routes: onboarding, feed, post detail, discover, network, profile, profile/account settings, and messages.
- Administrator routes: report queue and user moderation.
- Main tables: profiles, posts, comments, post reactions, follows, blocks, conversations, canonical direct-conversation pairs, conversation members, messages, reports, moderation actions, and product events.
- Storage buckets: avatars and post images.

## Plan of Work

The work is intentionally sequential because one builder owns the application and every milestone depends on the tested behavior of the prior milestone. Founder research and policy review may run alongside engineering.

| Delivery window | Primary owner | Outcome | Estimated focused effort |
|---|---|---|---:|
| Before build | Founder/product owner | Pilot choices and five interviews | 2–3 days |
| Build days 1–2 | AI-assisted builder | Repository, application shell, tests, CI | 2 days |
| Build days 3–4 | Builder with founder copy review | Responsive design system and language structure | 2 days |
| Build days 5–7 | Builder | Authentication, onboarding, profiles | 3 days |
| Build days 8–10 | Builder | Feed, posts, images, comments, Helpful | 3 days |
| Build days 11–12 | Builder | Discovery, follows, network, blocks | 2 days |
| Build days 13–14 | Builder | One-to-one messaging | 2 days |
| Build days 15–17 | Builder and moderator | Reports, moderation, deletion, analytics | 3 days |
| Build days 18–20 | Builder, founder, moderator, reviewer | Hardening, deployment, usability, release gate | 3 days |

### Milestone 0: Resolve pilot assumptions

Before writing user-facing copy, the product owner selects one pilot region, a narrow crop focus, one local language, a pilot size between 100 and 500, and a moderator. Conduct five 20-minute interviews with representative farmers. Ask what device and browser they use, whether they have and can access email, how they currently find crop advice and professional contacts, what information they will publicly share, and what would make them distrust the service.

Record anonymized findings in `docs/RESEARCH_NOTES.md`. Update the assumptions and open decisions in `docs/MVP_PRODUCT_DESIGN.md` and the Decision Log in this file. If three or more of the five interviewees cannot practically use email, do not silently add SMS. Record a separate phone-authentication decision including provider, per-message cost, abuse controls, and revised acceptance tests.

This milestone is complete when the five decisions have named answers and the founder can state the single pilot promise in one sentence.

### Milestone 1: Establish the application and quality baseline

Initialize a Next.js 16 App Router project in the existing repository root with TypeScript, ESLint, Tailwind CSS, the `src` directory, npm, and the `@/*` import alias. Initialize Git only after confirming with `ls -la` that the command will operate in `/Users/ngonapa/Downloads/farmerbook`.

Install `@supabase/supabase-js`, `@supabase/ssr`, Zod, and a small icon package. Install Vitest, Testing Library, jsdom, and Playwright as development dependencies. Do not add a general component framework, ORM, separate API framework, state-management library, or analytics SDK unless a later measured problem requires it.

Add npm scripts named `typecheck`, `test`, `test:watch`, `test:e2e`, and `check`. `check` runs lint, type checking, unit tests, and a production build. Add `.env.example` containing variable names and safe comments but no values. Add `.gitignore` entries for local environment files and Playwright output.

Create `src/lib/env.ts` to validate required environment variables at startup. Create browser and server Supabase clients and `src/proxy.ts`. The proxy must refresh the session with `auth.getUser()`, preserve returned cookies, allow public routes, and redirect unauthenticated access to protected routes to `/login`.

Add a CI workflow that installs from the lockfile and runs `npm run check`. Use only authorized team email addresses with the built-in development mail sender. Document that it cannot be used for real pilot accounts. At the end of this milestone, the default landing page renders locally, `npm run check` succeeds, and a missing required environment variable produces one actionable startup message without exposing a secret.

### Milestone 2: Build the responsive shell and content language

Create the public landing page and authenticated application shell. Implement desktop side navigation and mobile bottom navigation with the same five destinations: Feed, Discover, Network, Messages, and My Profile. Create reusable button, link, input, textarea, select, avatar, card, badge, dialog, dropdown, skeleton, empty-state, error-state, and toast components. Components must have visible focus indicators, labeled controls, and 44-pixel minimum touch targets.

Create `src/i18n/en.ts` and one dictionary for the selected pilot language. All navigation, form labels, errors, empty states, community-safety text, and primary actions use dictionary keys. User-authored content remains in the language entered and is never automatically translated.

Implement public community rules, privacy, and terms pages with clearly marked founder/legal placeholders. A qualified reviewer must replace the placeholders before the pilot. At the end of this milestone, a user can navigate the shell at 360, 768, and 1280 CSS pixels without horizontal scrolling, use all navigation by keyboard, and switch interface language.

### Milestone 3: Implement authentication, onboarding, and profiles

Create the initial database migration. Add `profiles` keyed to `auth.users`, with unique handles, controlled participant types, coarse location, crop identifiers, optional experience and farm size, preferred language, avatar path, verification status, and account status. Add an authentication-user trigger that creates a minimal profile safely. Enable RLS immediately.

Implement registration, verification instructions, login, logout, password reset, and authentication callback handling. Build onboarding with required full name, handle, participant type, district, state, at least one crop, and preferred language. Validate in both Zod and database constraints. Redirect incomplete active users to onboarding.

Build own-profile editing and other-profile viewing. Store avatars in an `avatars` bucket under the authenticated user’s ID. Normal profile updates must not modify verification or account status. Farm size remains private unless a later explicit field changes that behavior.

At the end of this milestone, two test users can register, complete different profiles, view one another, and edit only themselves. An unauthenticated visitor cannot open `/feed`; a suspended user cannot enter protected pages.

### Milestone 4: Implement feed participation

Add migrations for `posts`, `comments`, and `post_reactions`, with RLS, length constraints, statuses, indexes, and ownership policies. Add the `post-images` storage bucket and policies that require files to be placed under the author’s folder. Accept one JPEG, PNG, or WebP image no larger than 5 MB before browser compression.

Implement a composer for a required body of at most 2,000 characters, category of discussion/question/opportunity, and optional image. Implement a chronological feed with cursor pagination of 20 active posts. Show identity, coarse location, crop context, category, content, image, helpful count, and comment count. Implement post details, comments of at most 500 characters, one helpful reaction per user, and owner edit/remove actions.

Use server actions for writes and show pending, success, validation, and recoverable failure states. User content must be rendered as text, never injected HTML. At the end of this milestone, the browser-level test creates a post, finds it at the top of the feed, reacts, comments from a second account, and proves that the second account cannot edit it.

### Milestone 5: Implement discovery and the network

Add migrations for follows and blocks. Use composite primary keys to prevent duplicate relationships and database constraints to prohibit self-follow and self-block. Add RLS policies that allow only the acting user to create or delete their relationship.

Build Discover with case-insensitive name/handle search and filters for crop, participant type, district, and state. Put active filter state in URL query parameters. Begin with indexed PostgreSQL queries; do not add an external search product. Show recently joined active people when no filter is applied.

Build Follow/Unfollow and Network follower/following lists. Make blocks effective in profile, feed, search, follow, and message queries. At the end of this milestone, following is idempotent, filters can be refreshed without changing results, self-follow fails, and blocked users no longer see or contact each other.

### Milestone 6: Implement direct messaging

Add conversations, canonical direct-conversation pairs, conversation members, and messages. A transactional database function accepts the other user ID, sorts the two IDs into a canonical pair, returns the existing conversation or creates exactly one conversation and two membership rows. RLS permits only members to select a conversation or messages. Message insertion also checks active accounts and blocks.

Build the conversation list, message history, start-conversation action from a profile, and text composer. Limit messages to 2,000 characters and paginate older messages. Use explicit refresh after sending and optional periodic refresh while the conversation page is visible. Real-time delivery is not a release requirement.

At the end of this milestone, two users can exchange messages, a third user cannot read their conversation even by changing a URL, repeated “Message” actions return the same conversation, and blocking prevents further sends.

### Milestone 7: Implement safety, administration, deletion, and pilot analytics

Add reports, moderation actions, and product events. Reports support profile, post, comment, and message targets with enumerated reasons and optional details. Users may create reports and view only their own acknowledgement. Administrator server actions must call `requireAdmin()` and use the service-role client only after authorization.

Build the pending-report queue, target context, dismiss, hide, restore, suspend, and unsuspend actions. Record every decision in `moderation_actions`. A hidden content item disappears from normal queries. A suspended user is rejected by protected actions and pages.

Implement account deletion as a two-step confirmation. Immediately mark the profile deleted, hide content, sign the user out, and invoke a server-only operation to remove or schedule removal of the authentication identity according to the reviewed retention policy.

Record only the event names listed in the product design and small non-sensitive metadata. Add protected SQL views or administrator queries for registration, activation, participation, and retention counts. Do not send message or post bodies to analytics.

At the end of this milestone, the moderation browser test reports and hides a post, proves normal users cannot access admin routes, suspends the author, and verifies the author loses protected access. The deletion test removes an account from discovery and prevents later login.

### Milestone 8: Harden, deploy, and run the pilot gate

Add rate limiting to authentication-sensitive and write-heavy actions using a host-supported store or a small database-backed function. Add image failure handling, database indexes confirmed by query plans, error monitoring with content redaction, database backups, cost alerts, and a documented incident contact.

Run responsive checks at 360, 390, 768, 1280, and 1440 CSS pixels. Test keyboard navigation and 200% zoom. Run Lighthouse against landing, login, onboarding, feed, discover, profile, and messages; accessibility must be at least 90 on each tested page. Fix critical and serious automated accessibility findings and manually test labels, focus order, dialogs, and error announcements.

Create a staging Supabase project and staging web deployment. Apply migrations through the Supabase CLI; do not edit production tables manually. Seed staging only with clearly fictional accounts. Configure the production environment separately after staging acceptance.

Before inviting real users, configure a custom SMTP-compatible transactional-email service, authenticate the sending domain, keep email confirmation enabled, add CAPTCHA or an equivalent bot challenge to signup, and test signup/password reset with addresses that are not project-team members. Review and set authentication rate limits based on the planned invitation batches.

Choose one backup path before the pilot: use a hosted plan with a documented downloadable/restore capability, or run encrypted logical database backups outside the project and complete a test restore into a disposable project. Merely observing that the database host has internal durability is not a recovery test.

Have five representative farmers complete signup, profile setup, discovery/follow, posting/commenting, and messaging on their own phones. Record completion, confusion, and requested help in `docs/USABILITY_RESULTS.md`. Fix every blocker and high-severity safety or privacy issue. Lower-severity requests go to a post-pilot backlog rather than silently expanding scope.

The controlled pilot opens only when every release gate in `docs/MVP_PRODUCT_DESIGN.md` is satisfied.

## Concrete Steps

Run all commands from `/Users/ngonapa/Downloads/farmerbook`.

Before initializing, preserve the planning files and confirm the directory:

    pwd
    ls -la

Expected path:

    /Users/ngonapa/Downloads/farmerbook

Initialize Git and the application. `create-next-app` may ask before using a non-empty directory; it must preserve `README.md`, `PLAN.md`, and `docs/`.

    git init
    npx create-next-app@latest . --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm

If the initializer refuses a directory containing planning files, create the application once in a temporary sibling directory, then use `apply_patch` or explicit non-destructive moves to bring only generated application files into this repository. Do not overwrite the planning files and do not run recursive deletion.

Install runtime and test dependencies:

    npm install @supabase/supabase-js @supabase/ssr zod lucide-react
    npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom @playwright/test supabase
    npx playwright install chromium

Initialize Supabase configuration:

    npx supabase init

For local database work, Docker must be running:

    npx supabase start
    npx supabase status

If Docker is unavailable, create a dedicated hosted development project and link it; never point development commands at the production project.

Generate database types after each migration change:

    npx supabase gen types typescript --local > /tmp/farmerbook-database-types.ts

Review the generated file, then update `src/types/database.ts` through `apply_patch` or a deliberate formatting/copy step. The temporary file prevents a failed generation from truncating the committed type file.

Add the following scripts to `package.json`:

    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check": "npm run lint && npm run typecheck && npm test && npm run build"

Run the local application:

    npm run dev

Expected observation: the terminal prints a local URL, normally `http://localhost:3000`, and opening it shows the FarmerBook landing page without a browser console error.

Run the quality gate after each milestone:

    npm run check

Expected observation: ESLint, TypeScript, Vitest, and the production Next.js build all exit successfully.

Run browser journeys against the local application and local database:

    npm run test:e2e

Expected observation: Playwright reports all critical-journey tests passed and stores traces/screenshots only for failures.

Apply migrations to staging only after local tests pass:

    npx supabase link --project-ref STAGING_PROJECT_REF
    npx supabase db push

`STAGING_PROJECT_REF` is a placeholder copied from the staging project settings. Do not commit it if the team treats it as sensitive. Before production, link to the production project deliberately, confirm the target from `npx supabase status`, and apply the same committed migrations.

## Validation and Acceptance

The MVP is accepted only through observable behavior.

### Automated quality

`npm run check` succeeds from a clean install. `npm run test:e2e` succeeds against a freshly migrated database. CI performs the same non-browser quality gate for every change.

### Authentication and identity

An invited visitor can register, verify email, log in, complete required onboarding, and log out. Protected URLs redirect signed-out users. One user cannot edit another user’s profile. Verification and account status cannot be altered through a normal profile request.

### Social participation

An activated user can create one text/image post, see it first in the chronological feed, edit or remove it, comment, and toggle Helpful once. Invalid images, empty posts, overlong content, and duplicate submission produce safe behavior and understandable feedback.

### Discovery and network

A user can search and filter people, open a profile, follow/unfollow, and see following/follower lists. Refreshing a filtered URL keeps the filter. Self-follow and duplicate follow are impossible. Blocking removes cross-user content and contact paths.

### Private messaging

Two users can open one shared conversation and exchange text. A third authenticated user receives no conversation data when requesting its identifier directly. Reopening the same pair does not create a duplicate conversation. A block prevents new messages.

### Safety and privacy

A user can report content and receives an acknowledgement. A normal user receives a not-found or unauthorized response for admin routes. An administrator can dismiss or hide the report target and suspend an account, and each action has an audit record. Account deletion signs the user out and removes the account from discovery.

### Usability and accessibility

Five representative farmers complete the five primary journeys on their phones. There is no horizontal scroll at the required widths. Keyboard navigation, visible focus, labels, error announcements, 200% zoom, and Lighthouse accessibility targets pass.

### Pilot operations

The founder can name the moderator and incident contact, view aggregate pilot measures without viewing private messages, complete signup and password reset through custom transactional email, restore from a backup or documented recovery path, and identify current hosting spend. Legal/privacy placeholders have been reviewed or the pilot remains closed.

## Idempotence and Recovery

All schema changes use committed forward-only Supabase migrations. Never repair staging or production by manually editing tables without immediately capturing the equivalent migration. A failed migration must be diagnosed locally and corrected with a new safe migration if it has already reached a shared environment.

Seed scripts use deterministic fictional identifiers or upserts so running them again does not create uncontrolled duplicates. Storage paths include the owner ID and a generated file ID. Replacing an avatar may remove the prior avatar only after the new upload succeeds.

Server actions are safe against double-clicks: unique keys prevent duplicate follows, reactions, and direct conversations; forms disable repeated submission; create operations use idempotency where a database constraint alone is insufficient.

Before any destructive account or content operation, verify the resolved user/content ID and use soft deletion first. Production authentication deletion is server-only and follows the reviewed retention process. Database backups must be enabled before the pilot.

If a deployment fails, keep the last healthy deployment active. Roll back application code to the last known-good deployment; do not roll back a database migration unless its reversal has been tested and data loss has been ruled out. Prefer a corrective forward migration.

## Artifacts and Notes

The design artifact is `docs/MVP_PRODUCT_DESIGN.md`. Research evidence will live in `docs/RESEARCH_NOTES.md`, usability evidence in `docs/USABILITY_RESULTS.md`, and operational instructions in a future `docs/PILOT_RUNBOOK.md`.

The minimal successful end-to-end transcript should eventually read:

    User A registers → completes a rice-farmer profile → creates a question.
    User B registers → discovers User A by crop → follows → marks the question helpful → comments.
    User A opens User B’s profile → starts the single direct conversation → sends a message.
    User B reports unsafe test content.
    Admin reviews the report → hides the test content → audit record exists.
    All automated checks pass and both farmer accounts remain isolated from private data they do not own.

## Interfaces and Dependencies

Use package versions recorded by the generated `package-lock.json`; do not depend on an unrecorded global package version.

In `src/lib/supabase/client.ts`, export a browser-client creator using the public Supabase URL and publishable key. In `src/lib/supabase/server.ts`, export an asynchronous server-client creator using the Next.js cookie store. In `src/proxy.ts`, export the request proxy and route matcher; it refreshes the authenticated user and preserves all Supabase response cookies.

In `src/lib/auth/require-user.ts`, define:

    export async function requireUser(): Promise<{
      user: User
      profile: ActiveProfile
    }>

It throws or redirects when there is no authenticated user, the profile is incomplete where completion is required, or the account is not active.

In `src/lib/auth/require-admin.ts`, define:

    export async function requireAdmin(): Promise<User>

It checks protected authentication metadata. It does not trust a request body, URL parameter, cookie written by application JavaScript, or editable profile column.

Each feature under `src/features` exports a Zod input schema, server-only query/write functions, and UI components. At minimum create `profiles`, `posts`, `network`, `messages`, `moderation`, and `analytics` feature directories. Browser components never import the service-role client.

Database functions must include a transactional `get_or_create_direct_conversation(other_user_id uuid)` operation whose unique canonical user pair guarantees exactly one direct conversation for two accounts.

The public environment names are:

    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

The server-only environment name is:

    SUPABASE_SERVICE_ROLE_KEY

Deployment and monitoring may add provider-specific server-only variables. Every variable must be documented in `.env.example` without a value.

Revision note, 2026-07-29: Created the initial self-contained execution plan because the repository was empty and the user requested an end-to-end MVP design and action plan. The scope favors a low-cash-cost, AI-assisted web prototype and records the decisions that prevent it from turning into a full social-network build.

Revision note, 2026-07-29: Added custom transactional email, signup-abuse controls, and a demonstrably restorable backup as pilot release gates after checking the current hosted-backend constraints. Added a 20-day owner/effort map so the action sequence can be managed directly.

Revision note, 2026-07-29: Entered implementation after explicit user approval, recorded the selected Grounded Utility direction, and added the credential-free demonstration boundary used during application and deployment review.
