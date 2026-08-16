# Build and pilot the FarmerBook responsive web MVP

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with the ExecPlan requirements and guidelines in the `execution-plan` skill.

## Purpose / Big Picture

After this plan is completed, an invited farmer can register in a phone browser, create a professional farming profile, publish a text or image post, find and follow other farmers, comment or mark a post helpful, send a private text message, publish current produce, share a public farm storefront, receive private buyer enquiries, and track each lead toward a customer relationship. A buyer can browse current harvest lots and contact a farmer without first creating an account. An administrator can review reports and hide content or suspend an account. The founder can demonstrate the complete journey on a deployed URL and can run a controlled pilot of 100–500 people.

The MVP is a responsive website, not a native mobile application. It deliberately excludes phone OTP, video, payments, algorithmic recommendations, and other expensive infrastructure. The complete product scope and interaction design are recorded in `docs/MVP_PRODUCT_DESIGN.md`; the essentials needed to execute the build are repeated here so this plan remains usable on its own.

The implemented, default-off Featured Farmer addendum extends that product with
a public editorial collection. An administrator can research farmers
whose significant work is documented on the Web, build claim-level cited
stories, and publish them at `/featured-farmers`. Readers will see the reason
each farmer was selected, sourced impact, confirmed owned social accounts,
fact-check and correction information, without being told that the subject is a
FarmerBook member or verified participant.

## Progress

- [x] (2026-07-29 02:02Z) Confirmed that `/Users/ngonapa/Downloads/farmerbook` is an empty, non-Git directory.
- [x] (2026-07-29 02:02Z) Defined the MVP product scope, journeys, screen model, data model, architecture, security boundary, and release gates.
- [x] (2026-07-29 02:02Z) Selected a single Next.js and Supabase architecture suitable for an AI-assisted prototype.
- [x] (2026-07-29 02:02Z) Verified that a real email-authenticated pilot needs custom transactional email and added it to the release gates.
- [x] (2026-07-29 15:28Z) User approved implementation and selected the Grounded Utility interface direction.
- [x] (2026-07-29 15:28Z) Initialized Git and the Sites-compatible Next.js 16 application foundation without replacing the planning documents.
- [x] (2026-07-29 15:58Z) Implemented the responsive application, deployable demonstration data, Supabase integration boundary, migrations, and automated checks.
- [x] (2026-07-30 12:13Z) Expanded FarmerBook from a community MVP into a farmer growth network with a public produce marketplace, shareable storefronts, private buyer enquiries, seller listing controls, customer pipeline stages, and reach metrics.
- [x] (2026-07-30 12:13Z) Added a forward-only marketplace migration with public listing visibility, owner-only buyer contact access, validation coverage, and a new 1200×630 customer-growth social card.
- [x] (2026-07-30 12:13Z) Verified the expanded application with TypeScript, ESLint, 29 automated tests, and a complete Vinext production build.
- [x] (2026-07-31) Added Farmer, Customer, and Wholesaler account segments with immutable role selection, Farmer-only organic/natural farming methods, and public profile social links.
- [x] (2026-07-31) Added Google and LinkedIn OAuth entry points, safe callback redirects, customer-to-seller purchase connections, completed-purchase review eligibility, seller ratings, and review moderation.
- [x] (2026-07-31) Verified the three-role marketplace with ESLint, TypeScript, 38 unit/RLS/schema tests, a production build, and 12 Playwright journeys across desktop and mobile.
- [x] (2026-08-06) Hardened LinkedIn/Facebook OAuth failures, deployed the fix, configured the new Facebook app in Supabase, and verified the live Meta consent redirect in Chrome. The provider is temporarily disabled pending user-authorized secret rotation.
- [x] (2026-08-09) Assigned three read-only subagents to audit domain/RLS, onboarding/localization, and marketplace/release readiness for the agriculture-ecosystem expansion.
- [x] (2026-08-09) Consolidated the company/onboarding/taxonomy/23-locale research with file-and-line evidence in `research.md`; the current `npm run check` baseline passes 66 tests and the Vinext production build.
- [x] (2026-08-09) User explicitly approved the agriculture-ecosystem implementation addendum and authorized implementation.
- [x] (2026-08-11 05:24 IST) Created `docs/REQUIREMENTS.md` as the stable-ID requirements register, backfilled the product owner's supplied requirements, and recorded FB-REQ-012 for bidirectional social-profile/content integration with its open embed-versus-copy decision.
- [x] (2026-08-11 05:30 IST) Product owner approved original-URL social embeds; recorded FB-REQ-013 for managed identity-verification agents and the full identity, role, organization, social-presence, contact, community, location, transaction, and risk evidence model.
- [x] (2026-08-11 05:35 IST) Product owner selected Cloudflare Agents SDK with managed Workers AI, Durable Objects, and Workflows for FB-REQ-013; no AI API key will be requested or pasted.
- [x] (2026-08-11 09:40 IST) Product owner approved the exact Not verified, Contact verified, Farmer-role verified, Organization verified, and optional Identity verified capability model.
- [x] (2026-08-11 09:40 IST) Implemented the local managed Farmer-profile Agent, SQLite Durable Object, 14-day approval Workflow, private cited preview, consent-bound invitation/claim flow, verification claims, capability gates, and approved-profile onboarding prefill; production controls remain false.
- [x] (2026-08-11 09:42 IST) Completed the localization remediation for the core English, Hindi, and Marathi journeys: request/profile/cookie persistence, immediate legacy-onboarding switching, public Farmer profile, marketplace/detail/storefront/enquiry/reviews, Incs/offers/sourcing, legal/auth/error/settings media, locale formatting, and logical RTL CSS. The exact 23-locale registry remains, with the 20 extended locales disabled pending full native translation and review.
- [x] (2026-08-11 09:42 IST) Implemented `Incs` direct sourcing locally for food processors and other farmer-dependent industries, including 45 sectors, structured requirements/responses, claim-specific registration/representative/facility/licence verification, private contacts, moderation, RLS/RPC controls, feature/database release gates, and localized public/workspace UI.
- [x] (2026-08-11 09:42 IST) Verified the combined tree with TypeScript, ESLint, 86 Vitest files/405 tests, and a complete Vinext production build. No production migration, feature enablement, real outreach, or deployment was performed.
- [x] (2026-08-11 11:07 IST) Product owner approved Brave Search API for FB-REQ-014 name-only Farmer discovery. Implemented the fail-closed adapter, administrator quota reservation, provider/storage provenance, private `Not verified` sample/Workflow path, and secure configuration contract; no contact is derived and no consent or delivery work is created.
- [x] (2026-08-11 11:13 IST) Verified the Brave integration with repository-wide ESLint, TypeScript, 88 Vitest files/416 tests, and a complete Vinext/Cloudflare build. Docker remained unavailable; eligible plan/secret setup, clean database/RLS rehearsal, staging, production flags, deployment, real searches, and contact remain open.
- [x] (2026-08-11 20:04 IST) Product owner rejected Brave before account creation and requested a Google-like alternative. Verified from current official documentation that Google Custom Search is closed to new customers and ends on 2027-01-01; recorded Tavily as the proposed free-tier replacement. Existing Brave code remains disabled pending explicit replacement approval.
- [x] (2026-08-12) Researched the product owner's correction from personally-known intake to sourced Featured Farmer editorial stories; updated `research.md`, `docs/REQUIREMENTS.md`, this plan, the implementation log and structured-development state without changing application or production code.
- [x] (2026-08-12) Product owner explicitly approved the Featured Farmer editorial profiles correction addendum and authorized implementation.
- [x] (2026-08-12) Implemented and locally verified the approved Featured Farmer editorial plan; stopped before any provider account, real-person research, publication, production mutation or deployment.
- [ ] Continue product-owner intake one focused question at a time and update `docs/REQUIREMENTS.md`, this plan, `implementation-log.md`, and `.structured-dev-state` at every stopping point.
- [ ] Finish the LinkedIn developer app and Supabase provider after Chrome file-upload permission is enabled for the required app logo.
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
- Observation: The existing social network already covered most LinkedIn-like primitives; customer reach was blocked by the absence of public commercial identity, current availability, and a lead workflow rather than by missing follows or messaging.
  Evidence: The application already shipped profiles, posts, discovery, follows, network lists, and direct messages. The 2026-07-30 expansion could therefore remain additive around `produce_listings` and `market_enquiries`.
- Observation: A buyer-facing route must stay useful without authentication, while buyer contact details must never become public.
  Evidence: The new migration grants anonymous users only curated supplier columns and active listing reads/inserts, while `market_enquiries` select and update policies resolve ownership through the listing farmer.
- Observation: The current marketplace/application tranche is not reproducible from tracked files because its routes, feature modules, and four required migrations are untracked while tracked files already depend on their columns.
  Evidence: `git status --short` on 2026-08-09 showed 49 modified paths and dozens of untracked marketplace/profile paths; `features/profiles/queries.ts:13-14` selects columns introduced by untracked migrations.
- Observation: The visible English/Hindi/Marathi language choice is not an active localization system.
  Evidence: `lib/i18n/en.ts` and `hi.ts` are unused, the root document is fixed to English, profile queries do not load the saved preference, and nearly all user-facing strings remain hard-coded English.
- Observation: The produce-listing schema cannot represent agricultural companies or non-produce offers without false fields and imagery.
  Evidence: `produce_listings` requires crop, variety, harvest, grade, produce unit, and delivery fields; unknown listing crops receive tomato imagery.
- Observation: The locally implemented Known Farmer path cannot be repaired by changing labels because personal relationship is enforced in its Zod schema and PostgreSQL RPC, and its build action creates an outreach prospect plus member-style sample.
  Evidence: `features/profile-agent/known-farmer-schemas.ts`, `supabase/migrations/20260812140000_known_farmer_intake.sql`, and `features/profile-agent/known-farmer-actions.ts` each encode that model. The corrected requirement needs a separate editorial domain.
- Observation: Google does not offer a suitable new retained whole-Web Search API for this product, but safe Web research remains possible through operator-opened Google queries and selected destination pages; official YouTube API candidate discovery can be reused.
  Evidence: Current Google Custom Search documentation says new customers are ineligible and existing customers must migrate by 2027-01-01; the existing helpers already avoid fetching Google and bound official YouTube results.

## Decision Log

- Decision: Use Brave Search API for administrator-initiated name-only Farmer discovery.
  Rationale: The product owner approved Brave. The integration uses the documented independent Web Search endpoint with a Cloudflare secret, retains only bounded exact-name agriculture matches, and fails closed until the subscribed plan explicitly grants result-storage rights. Search evidence never grants contact consent.
  Date/Author: 2026-08-11 / Product owner and Codex
- Decision: Reject Brave before external account creation and evaluate Tavily as the replacement; do not start a new Google Custom Search integration.
  Rationale: The product owner rejected Brave. Google's direct Custom Search JSON API is closed to new customers and scheduled to stop on 2027-01-01; Vertex AI Search does not provide the same simple full-Web result contract. Tavily offers a no-card free pilot tier and bounded search results, but still requires explicit approval and output-retention/legal review before implementation or production use.
  Date/Author: 2026-08-11 / Product owner and Codex

- Decision: Replace the public objective of Known Farmer Intake with a separate Featured Farmer editorial domain; do not convert researched people into unclaimed member profiles.
  Rationale: The product owner clarified that selection is based on significant documented work, not a personal relationship. Editorial articles can publish sourced impact, owned social links, media rights, corrections and fact-check dates without implying FarmerBook membership, verification, consent or endorsement.
  Date/Author: 2026-08-12 / Product owner and Codex
- Decision: Require two non-social professional publisher domains, one authoritative or independent source, two sourced significance claims, and one confirmed Farmer-owned social account before editorial review readiness.
  Rationale: A deterministic source threshold makes “significant work” auditable and prevents search rank, follower count, one promotional source or AI judgment from becoming the selection criterion.
  Date/Author: 2026-08-12 / Codex, awaiting plan approval
- Decision: Publish unclaimed Featured Farmer pages as `Article` content about a person, not as FarmerBook `ProfilePage` member content.
  Rationale: The article is authored by FarmerBook from third-party public evidence. Separate URLs, disclosure and metadata prevent connection, activity, marketplace and verification semantics from being attributed to a person who has not joined FarmerBook.
  Date/Author: 2026-08-12 / Codex, awaiting plan approval

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
- Decision: Add a public marketplace and shareable storefront instead of turning the community feed into a sales feed.
  Rationale: Farmers need a stable buyer-facing destination with quantity, price, grade, harvest window, and delivery details. Keeping commercial inventory separate preserves the usefulness of professional updates and learning conversations.
  Date/Author: 2026-07-30 / Codex
- Decision: Treat an enquiry as a private lead rather than an order or payment.
  Rationale: Direct sourcing requires negotiation about quality, packing, logistics, and recurring volume. A lead pipeline proves customer reach without adding payment custody, transaction disputes, commission, or logistics guarantees.
  Date/Author: 2026-07-30 / Codex
- Decision: Keep Supabase as the durable data layer for the expansion.
  Rationale: FarmerBook already has protected Supabase authentication, Postgres access, and Row Level Security. A second database would split ownership rules and increase operational work without providing a user benefit.
  Date/Author: 2026-07-30 / Codex
- Decision: Store a participant's marketplace role once and enforce role-specific selling permissions in PostgreSQL policies.
  Rationale: Farmers and wholesalers may publish produce, while customers buy and review. Keeping the role immutable prevents a client-side role switch from bypassing marketplace boundaries.
  Date/Author: 2026-07-31 / Codex
- Decision: Permit a verified review only after an authenticated customer has a completed enquiry for that seller.
  Rationale: Ratings should reflect a traceable purchase relationship rather than arbitrary public feedback, while still avoiding payment custody in this MVP.
  Date/Author: 2026-07-31 / Codex
- Decision: Interpret “all Indian languages” as the 22 Eighth Schedule languages plus English fallback, represented by explicit BCP-47 locale tags.
  Rationale: India has hundreds of mother tongues; the Scheduled-language set is finite, testable, and nationally meaningful while the registry remains extensible.
  Date/Author: 2026-08-09 / Codex
- Decision: Keep produce listings and add separate organizations and general business offers.
  Rationale: Tractors, tools, rentals, logistics, finance, veterinary care, training, and input offers do not have crop varieties or harvest windows. An additive offer domain preserves existing produce/review URLs and data.
  Date/Author: 2026-08-09 / Codex
- Decision: Add `agri_business` as a primary account identity but authorize actions through named capability functions and organization membership.
  Rationale: A Farmer or Wholesaler must still be able to buy/source, while company roles need organization-scoped authorization. Scattered equality checks would keep navigation, actions, and RLS inconsistent.
  Date/Author: 2026-08-09 / Codex
- Decision: Store canonical agriculture categories by stable slug and keep custom user categories outside the global taxonomy until moderated.
  Rationale: Stable identifiers survive translation and synonym changes; unreviewed free text must not fragment global filters or become trusted platform taxonomy.
  Date/Author: 2026-08-09 / Codex
- Decision: Keep authored content in its original language and label any future translation separately.
  Rationale: Interface localization is not permission to rewrite a Farmer's post, listing, message, biography, or business claim.
  Date/Author: 2026-08-09 / Codex

- Decision: Maintain a separate stable-ID requirements register while retaining this file as the self-contained execution plan.
  Rationale: The product owner needs a concise place to see every requirement, status, acceptance criterion, and unresolved question without confusing locally implemented code with live production behavior. `docs/REQUIREMENTS.md` provides that traceability; this plan continues to contain the complete implementation and recovery instructions.
  Date/Author: 2026-08-11 / Product owner and Codex

- Decision: Treat third-party social posts as attributed links or provider-approved embeds and do not copy the media into FarmerBook.
  Rationale: Linking preserves the original creator, source, deletion state, and platform controls and avoids silently duplicating copyrighted media or requiring Farmers to give FarmerBook their social credentials. Copying or cross-posting requires separate provider/API authorization and explicit user intent.
  Date/Author: 2026-08-11 / Product owner and Codex

- Decision: Model verification as multiple explicit evidence-backed labels rather than one generic verified badge.
  Rationale: Contact ownership, government identity, agricultural role, organization authority, established social presence, location, and transaction reputation prove different things. A follower count can be manipulated and must never become identity proof by itself. Profiles without accepted evidence remain visibly `Not verified` instead of receiving an inferred badge.
  Date/Author: 2026-08-11 / Product owner and Codex

- Decision: Use Cloudflare Agents SDK with Workers AI, Durable Objects, and Workflows as the first managed-agent runtime.
  Rationale: FarmerBook is already deployed on Cloudflare. Workers AI can be attached through the managed `AI` binding without placing a model API key in source, while Durable Objects and Workflows provide state, retries, expiration, and audit-friendly multi-step verification. External KYC/social providers still require separately stored credentials and approval.
  Date/Author: 2026-08-11 / Product owner and Codex

- Decision: Gate higher-risk actions by specific verification claim, not by one generic badge.
  Rationale: Unverified people can safely participate with a visible label and bounded posting, while contact ownership is required for direct communication, agricultural-role evidence is required to sell produce, and organization evidence is required to publish company offers. Optional identity verification adds trust without excluding ordinary participants.
  Date/Author: 2026-08-11 / Product owner and Codex

## Outcomes & Retrospective

The implementation now provides the Grounded Utility responsive application, a complete fictional demonstration across the public, farmer, buyer, and administrator journeys, configured-mode Supabase queries and protected server actions, forward-only migrations with RLS and storage policies, seed data, CI, and automated unit/schema checks. Configured environments persist profile setup, image-backed posts, social relationships, direct messages, safety reports, moderation decisions, account controls, produce listings, private buyer enquiries, lead stages, and bounded product events.

The 2026-07-30 milestone makes customer reach observable. A buyer can open `/marketplace`, filter live produce by crop, district, and order size, inspect an active listing, submit a private requirement, and open the farmer’s public `/store/[handle]` storefront. A farmer can open `/business`, publish or pause produce, share the storefront, see reach metrics, open buyer details, call or email the lead, and record its stage. Professional profile pages now show active produce alongside community posts. TypeScript, ESLint, all 29 automated tests, and the Vinext/Cloudflare production build pass. A refreshed 1200×630 FarmerBook social card matches the customer-growth positioning.

The remaining work is operational rather than hidden application scope: connect a real Supabase staging project, run the committed migration and live RLS/browser suite, configure transactional email and recoverable backups, complete five farmer usability sessions, and name the pilot moderator. Email suitability remains the largest product risk.

The 2026-08-09 agriculture-ecosystem milestone is currently research and planning only. Three subagents produced independent read-only audits, the local baseline passes, and the detailed implementation/rollback program is recorded below. No company, taxonomy, resumable-onboarding, or 23-locale product code should be described as complete until the addendum is explicitly approved and its behavioral gates pass.

The 2026-08-12 Featured Farmer correction is implemented locally behind
default-off application and database controls. The private newsroom supports
human-reviewed Web/YouTube sources, claim-level citations, confirmed owned
social accounts, structured editorial drafts, media-rights review, fact checks,
immutable revisions and withdrawal. The public collection and articles use the
Deccan editorial design, honest empty/fallback states, localized shells,
Article-about-Person metadata and published-only sitemap entries. A clean local
database rebuild and all database, unit, browser, lint, type and build gates
pass. No provider account or key, real-person research, real publication,
production migration/control, deployment or other production state was changed.
The previous Known Farmer implementation remains default-disabled and its admin
route redirects to the replacement newsroom.

At the end of each milestone, add a short entry here covering what is demonstrably working, remaining gaps, measured effort, and any scope decision that should affect later milestones.

## Context and Orientation

The repository root is `/Users/ngonapa/Downloads/farmerbook`. It is an existing
Next.js 16 TypeScript application with a Git history, root-level `app`,
`components`, `features` and `lib` folders, Vitest tests under `tests`, Playwright
tests under `e2e`, and ordered PostgreSQL migrations and pgTAP tests under
`supabase`. Next.js “App Router” is the file-based routing system in which
folders below `app` define browser routes. A “server action” is an asynchronous
server function called by a form or browser component; server actions validate
and authorize writes. Supabase is the hosted backend and supplies authentication,
PostgreSQL and image storage.

“Row Level Security,” abbreviated RLS, is PostgreSQL authorization attached to a table. RLS policies decide which rows the current authenticated user may select, insert, change, or delete. RLS is mandatory because browser-side checks alone are not security.

The important locations are:

- `app`: pages, layouts and route handlers.
- `components`: reusable interface elements.
- `features`: feature-specific server actions, queries, schemas and components.
- `lib/supabase/client.ts`: browser Supabase client.
- `lib/supabase/server.ts`: cookie-aware server Supabase client.
- `features/auth/require-user.ts`: server helper that rejects unauthenticated users.
- `features/auth/require-admin.ts`: server helper that verifies protected administrator metadata.
- `proxy.ts`: request-time session refresh and redirects for protected routes.
- `lib/i18n`: locale registry, translators and English/Hindi/Marathi catalogs.
- `lib/types.ts`: shared application data types.
- `supabase/migrations`: ordered SQL migrations containing tables, indexes, functions, and RLS policies.
- `supabase/seed.sql`: clearly labeled fictional pilot data for local development.
- `tests`: unit, schema and component tests; `e2e` contains browser journeys.
- `.github/workflows/ci.yml`: automated lint, type, test, and build checks.

The route and data requirements are:

- Public routes: landing, marketplace, listing detail, farm storefront, login, signup, reset password, community rules, privacy, and terms.
- Farmer routes: onboarding, feed, post detail, discover, network, profile, profile/account settings, messages, authenticated produce market, and business dashboard.
- Administrator routes: report queue and user moderation.
- Main tables: profiles, posts, comments, post reactions, follows, blocks, conversations, canonical direct-conversation pairs, conversation members, messages, reports, moderation actions, product events, produce listings, and market enquiries.
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

### Marketplace and customer growth

A signed-out buyer can open `/marketplace`, filter active produce, inspect a listing, open its farmer storefront, and submit a name, contact method, location, quantity, need-by date, and private message. A buyer cannot read another buyer’s enquiry. The listing owner can open `/business`, see that enquiry, contact the buyer, and update the lead from new through contacted, qualified, won, or closed. The owner can publish, pause, sell out, or draft a listing and share `/store/[handle]` as a stable public URL. A normal participant cannot change another farmer’s listing or read its buyer contact details.

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
    Buyer opens the public marketplace → filters a harvest lot → sends a private enquiry.
    Farmer opens the business dashboard → contacts the buyer → marks the lead qualified.
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

Each feature under `features` exports a Zod input schema, server-only query/write functions, and UI components. The implemented directories include `profiles`, `posts`, `network`, `messages`, `moderation`, `analytics`, and `marketplace`. Browser components never import the service-role client. Marketplace code uses `features/marketplace/queries.ts` for public and owner data, `features/marketplace/actions.ts` for validated writes, and `features/marketplace/schemas.ts` for listing, enquiry, and status validation.

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

Revision note, 2026-07-30: Expanded the finished network into a farmer customer-growth product after the user requested LinkedIn-style reach. Added the buyer-facing marketplace, shareable storefronts, private lead pipeline, listing controls, growth analytics, security model, validation evidence, and revised product outcomes so this plan remains sufficient for a new contributor.

# Change plan: three roles, social profiles, Google/LinkedIn auth, buying connections, and reviews

Status: **Awaiting explicit user approval. No application or database implementation from this section may begin until the user approves this plan.**

## Outcome

After this change:

1. A new user can continue with email/password, Google, or LinkedIn.
2. Onboarding requires one of three marketplace roles: Farmer, Customer, or Wholesaler.
3. A Farmer chooses Organic, Natural, Conventional, or Mixed farming and can publish produce.
4. A Wholesaler can publish produce as a bulk supplier.
5. A Customer can connect to either seller type, create or reuse a private conversation, track the enquiry, and review a completed purchase.
6. Public marketplace, listing, storefront, and profile views show the seller type, farming method when relevant, social links, and verified-purchase reputation.
7. Role and review rules are enforced by PostgreSQL RLS as well as server actions.

## Scope decisions

- “Social media” means FarmerBook's existing feed/follows/messages plus editable external profile links for website, LinkedIn, Instagram, Facebook, and YouTube.
- “Buy” means a direct enquiry and FarmerBook message thread, followed by the seller marking the off-platform purchase completed. It does not include online payment, a cart, shipping, refunds, or commission.
- Reviews require a signed-in Customer and a seller-confirmed completed (`won`) enquiry. Anonymous leads cannot review.
- The three-role marketplace model is separate from the old profession taxonomy. A new `account_role` is authoritative; the old `participant_type` column stays temporarily for rollback compatibility.
- Role is chosen during onboarding and is read-only afterward in this MVP. A future administrator workflow can handle role corrections.
- Farmer method choices are Organic, Natural, Conventional, and Mixed. Organic and Natural receive the strongest visual emphasis.
- Public customer contact details and profile identity are not exposed with reviews. Public review cards say “Verified purchase.”

## Implementation sequence

### 1. Add shared role, farming, social, connection, and review types

Update `lib/types.ts`.

Add:

```ts
export type AccountRole = "farmer" | "customer" | "wholesaler";
export type FarmingMethod =
  | "organic"
  | "natural"
  | "conventional"
  | "mixed";

export type SocialLinks = {
  website?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
};

export type ReviewSummary = {
  average: number;
  count: number;
};
```

Extend the profile model with `accountRole`, optional `farmingMethod`, `socialLinks`, and `reviewSummary`. Introduce the neutral name `ParticipantProfile` and retain a temporary `FarmerProfile` alias for social-feed files that do not need a noisy rename in this change.

Change marketplace-facing fields from `farmerId`/`farmer` to `sellerId`/`seller` in TypeScript. Keep the physical database column `farmer_id` as a documented compatibility field and map it at the query boundary.

Extend `MarketEnquiry` with optional `buyerId`, `conversationId`, and `review`. Add:

```ts
export interface MarketReview {
  id: string;
  enquiryId: string;
  listingId: string;
  sellerId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  createdLabel: string;
  listingTitle?: string;
}
```

Update `lib/data-mappers.ts`, `features/profiles/queries.ts`, `lib/demo-data.ts`, and `lib/market-data.ts` so configured and demo environments expose the same shape. Add at least one Farmer, Customer, and Wholesaler fixture, both Organic and Natural methods, linked customer enquiries, and verified-purchase review fixtures.

### 2. Add the forward-only Supabase migration

Create `supabase/migrations/20260731120000_roles_connections_reviews.sql`.

#### Profile additions

Add:

```sql
alter table public.profiles
  add column account_role text,
  add column farming_method text,
  add column website_url text,
  add column linkedin_url text,
  add column instagram_url text,
  add column facebook_url text,
  add column youtube_url text;
```

Backfill existing accounts conservatively:

```sql
update public.profiles
set account_role = case participant_type
  when 'farmer' then 'farmer'
  when 'fpo' then 'wholesaler'
  else 'customer'
end;

update public.profiles
set farming_method = 'mixed'
where account_role = 'farmer' and farming_method is null;
```

Then make `account_role` non-null and add checks for the three roles, allowed farming methods, role/method consistency, HTTPS social URLs, and maximum lengths. Do not drop or rewrite `participant_type` in this migration.

Add a `security definer` helper used by the profile update policy so a user may choose `account_role` only while the old row has `onboarding_complete = false`. Replace the broad profile update policy with an equivalent owner policy that also calls this helper. Continue to prevent users from editing verification or status.

Update authenticated column grants for the new editable profile fields. Add only seller-safe fields to the anonymous profile projection. Anonymous users may continue seeing active Farmer and Wholesaler profiles, never Customer profiles:

```sql
account_role in ('farmer', 'wholesaler')
```

#### Seller authorization

Drop and recreate marketplace listing insert/update policies. Ownership remains `produce_listings.farmer_id = auth.uid()` for compatibility, but the policy also requires:

```sql
exists (
  select 1
  from public.profiles
  where profiles.id = auth.uid()
    and profiles.status = 'active'
    and profiles.account_role in ('farmer', 'wholesaler')
)
```

Keep public reads restricted to active listings from active seller profiles.

#### Linked customer enquiries

Add:

```sql
alter table public.market_enquiries
  add column buyer_id uuid references public.profiles(id) on delete set null,
  add column conversation_id uuid
    references public.conversations(id) on delete set null;
```

Add indexes for the customer's purchase list and conversation lookup. Preserve existing anonymous rows and the anonymous lead policy. Add a distinct authenticated policy for linked enquiries that requires:

- `buyer_id = auth.uid()`;
- current profile role is Customer;
- listing is active;
- listing seller role is Farmer or Wholesaler;
- buyer is not the seller;
- the conversation includes both buyer and seller.

Expand enquiry select policy so the linked Customer can read their own rows while the seller continues to read rows for their own listings. Buyer contact details remain unavailable to everyone else.

Add a transactional `connect_to_listing(...)` RPC. It validates the authenticated Customer and active listing, calls the existing `get_or_create_direct_conversation(seller_id)`, inserts the linked enquiry, and returns `{ enquiry_id, conversation_id }`. Revoke public execution and grant it only to `authenticated`.

The RPC inputs remain bounded business/contact fields. It obtains `buyer_id` and seller ID from authenticated/database state rather than trusting the browser.

#### Verified reviews

Create `public.market_reviews` with the columns and invariants documented in `research.md`. Enable RLS immediately. Add separate policies for:

- anonymous/authenticated select of active reviews;
- Customer insert only when the referenced enquiry belongs to them, matches the listing/seller, and has status `won`;
- reviewer-only update of rating/body;
- reviewer-only delete;
- administrator visibility for moderation.

Use `unique (enquiry_id)` and `check (rating between 1 and 5)`. Column grants must prevent reviewer/seller/listing IDs and status from being edited by normal users.

Extend `reports.target_type` with `review` and update `apply_moderation_action()` so a moderator can hide or restore a review. Add `market_reviews` to all revoke/grant and RLS audit sections.

#### Database rollback compatibility

This migration is additive:

- do not rename or drop `produce_listings.farmer_id`;
- do not drop `profiles.participant_type`;
- allow legacy anonymous enquiries to remain valid;
- do not delete existing profiles, listings, enquiries, or conversations.

If the application must roll back, the old build can ignore the new columns/table. Database rollback itself remains a corrective forward migration.

### 3. Make onboarding role-aware

Update `features/profiles/schemas.ts`.

Create reusable schemas for `accountRole`, `farmingMethod`, and social links. Use `superRefine()` for conditional requirements:

```ts
if (data.accountRole === "farmer") {
  if (!data.farmingMethod) addIssue("Choose a farming method.");
  if (!data.crops.length) addIssue("Choose at least one crop.");
}

if (data.accountRole === "wholesaler" && !data.crops.length) {
  addIssue("Choose at least one produce category.");
}
```

Social-network fields must be optional HTTPS URLs with expected hosts:

- `linkedin.com`
- `instagram.com`
- `facebook.com` or `fb.com`
- `youtube.com` or `youtu.be`

Website permits any valid HTTPS host. Normalize empty fields to `undefined`.

Update `features/profiles/onboarding-form.tsx` into three steps:

1. Choose Farmer, Customer, or Wholesaler using accessible role cards.
2. Enter identity and location.
3. Enter role-specific crop/category/interests, Farmer farming method, biography, experience, language, and optional social links.

Use role-aware labels:

- Farmer: “Crops you grow”
- Customer: “Produce you are interested in”
- Wholesaler: “Produce categories you supply”

Update `features/profiles/actions.ts` to write `account_role`, `farming_method`, and social URL columns from validated data. Ensure non-Farmer saves clear `farming_method`.

Update `features/profiles/profile-settings-form.tsx` to show the locked account segment, editable farming method for Farmers, and editable social links for every role.

### 4. Add Google and LinkedIn OAuth

Update `features/auth/schemas.ts` with:

```ts
export const oauthProviderSchema = z.enum(["google", "linkedin_oidc"]);
```

Update `features/auth/actions.ts` with one server action:

```ts
export async function oauthSignInAction(formData: FormData) {
  const provider = oauthProviderSchema.parse(formData.get("provider"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/feed`,
    },
  });
  if (error || !data.url) authRedirect(...);
  redirect(data.url);
}
```

In demo mode, route to onboarding without pretending that a real external provider was contacted.

Create `features/auth/oauth-buttons.tsx` with accessible “Continue with Google” and “Continue with LinkedIn” forms. Use local icons or text marks; do not fetch remote scripts or provider SDKs.

Render the shared buttons and a visual “or continue with email” separator in:

- `app/login/page.tsx`
- `app/signup/page.tsx`

Keep the existing email/password path. Show concise terms/privacy language next to OAuth continuation so the social path does not bypass the signup notice.

Update `app/auth/callback/route.ts` with a testable safe-next helper:

```ts
export function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/feed";
}
```

After session exchange, redirect to the safe path. Existing `requireUser()` behavior then sends new incomplete OAuth profiles to onboarding.

Document manual provider activation in `README.md`:

- enable Google and LinkedIn OIDC in Supabase;
- configure each provider's Supabase callback URL;
- add localhost, Worker, and `https://farmerbook.in/auth/callback` to the Supabase redirect allow list as applicable;
- set production `NEXT_PUBLIC_SITE_URL=https://farmerbook.in`;
- never add provider client secrets to `.env.example` or client code.

### 5. Enforce role-aware application access

Update `features/auth/require-user.ts` so `ActiveUser.profile` includes `accountRole`. Add small helpers:

```ts
export function isSellerRole(role: AccountRole) {
  return role === "farmer" || role === "wholesaler";
}
```

Use server-side role checks in `features/marketplace/actions.ts`:

- create/update listing: Farmer or Wholesaler only;
- create linked connection: Customer only;
- update lead status: the listing seller only;
- create/update/delete review: the linked Customer only.

These checks improve error messages but do not replace RLS.

Guard `app/(product)/business/page.tsx` and seller queries. Redirect Customers to `/purchases` with a clear notice. Guard the new purchase route so seller accounts do not see customer-only data.

Update `components/app-shell.tsx` to render:

- Farmer/Wholesaler: “Grow my business” → `/business`
- Customer: “My purchases” → `/purchases`

Update `app/(product)/market/page.tsx` so its header action is “Manage my storefront” for sellers and “View my purchases” for Customers.

### 6. Generalize marketplace UI from farmer to seller

Update:

- `features/marketplace/queries.ts`
- `features/marketplace/actions.ts`
- `features/marketplace/schemas.ts`
- `features/marketplace/listing-card.tsx`
- `features/marketplace/market-browser.tsx`
- `features/marketplace/business-dashboard.tsx`
- `features/marketplace/inquiry-form.tsx`
- `app/marketplace/page.tsx`
- `app/marketplace/[listingId]/page.tsx`
- `app/store/[handle]/page.tsx`

At the database mapper only:

```ts
sellerId: row.farmer_id,
seller: profile,
```

Replace customer-visible “farmer” assumptions with “seller” or the actual `roleLabel`. Preserve Farmer-specific language only when `accountRole === "farmer"`.

Add marketplace filters:

- Seller type: All, Farmers, Wholesalers
- Farming method: All, Organic, Natural, Conventional, Mixed

The farming filter applies to Farmer listings; selecting a method naturally excludes Wholesalers.

Show seller role, farming-method badge, average rating, and review count on listing cards and detail pages. Social links appear in the seller card and storefront with `target="_blank"` and `rel="noopener noreferrer"`.

Update the inquiry form behavior:

- anonymous visitor: preserve the current private lead form and invite them to sign in for messaging, tracking, and reviews;
- authenticated Customer: call `connect_to_listing`, show success, and offer “Open conversation” using the returned conversation ID;
- authenticated Farmer/Wholesaler: show that buying connections require a Customer account.

Do not expose another buyer's enquiry, conversation ID, phone, or email in any public query.

### 7. Add Customer purchases and review UI

Create:

- `features/reviews/schemas.ts`
- `features/reviews/actions.ts`
- `features/reviews/queries.ts`
- `features/reviews/review-form.tsx`
- `features/reviews/review-list.tsx`
- `app/(product)/purchases/page.tsx`

The purchase page lists the current Customer's linked enquiries with listing, seller, quantity, status, and conversation link. When status is `won`:

- show “Purchase completed”;
- show an existing review with Edit/Delete actions; or
- show “Review this purchase.”

Review validation:

```ts
export const reviewSchema = z.object({
  enquiryId: z.uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(1000),
});
```

The action derives listing/seller/reviewer IDs from the enquiry and current user. It never accepts those authority fields from the client.

Display active reviews and aggregate ratings in:

- `features/profiles/profile-view.tsx`
- `app/store/[handle]/page.tsx`
- `app/marketplace/[listingId]/page.tsx`

Add a report control for reviews using the existing moderation flow. Extend moderator rendering so a review target has useful context without exposing buyer contact information.

### 8. Explain the three segments on public surfaces

Update `app/page.tsx` with a compact section of three cards:

- Farmers — select farming method, show harvests, build reputation.
- Customers — compare trusted supply, message sellers, review purchases.
- Wholesalers — publish bulk availability and build repeat customer relationships.

Make hero/signup copy inclusive rather than “Create your farmer profile.” Retain agriculture-specific tone and the existing design system.

Update `components/public-header.tsx`, `components/public-footer.tsx`, marketplace trust copy, metadata, and empty states only where wording currently excludes Customers or Wholesalers.

Update `app/globals.css` for role cards, OAuth controls, method/review badges, star input, purchase rows, and social-link groups. Preserve existing responsive breakpoints, focus rings, 44-pixel interactive targets, and reduced-motion behavior.

## Test strategy

### Unit and component tests

Update `tests/schemas.test.ts`:

- Farmer with farming method and crops passes.
- Farmer without a method fails.
- Wholesaler with produce categories passes.
- Customer with no crops passes.
- invalid role fails.
- non-HTTPS or wrong-host social URLs fail.
- rating outside 1–5 and short/overlong review text fail.
- valid Google and LinkedIn provider values pass.

Add tests for `safeNextPath()` covering `/feed`, `/onboarding?x=1`, absolute URLs, protocol-relative URLs, and empty input.

Update `tests/data-mappers.test.ts` and `tests/profile-card.test.tsx` for role labels, farming method, social links, and review summary.

Add focused Testing Library coverage for conditional onboarding fields, role-aware navigation, and review form submission states.

### Authorization tests

Update `tests/rls-migration.test.ts` so it:

- includes `market_reviews` in the RLS table list;
- finds the three-role check;
- verifies seller-only listing creation;
- verifies linked buyer and seller read scopes;
- verifies review insertion references a completed owned enquiry;
- verifies anonymous profile policy excludes Customers;
- verifies review moderation and restricted grants;
- still verifies buyer contact details are not granted to anonymous users.

When a local or development Supabase database is available, run a multi-account matrix:

| Actor | Create listing | Connect | Read enquiry | Mark completed | Review |
|---|---:|---:|---:|---:|---:|
| Farmer listing owner | Yes | No | Own listings | Yes | No |
| Wholesaler listing owner | Yes | No | Own listings | Yes | No |
| Linked Customer | No | Yes | Own connection | No | After `won` |
| Other Customer | No | Yes to active listing | No | No | No |
| Anonymous visitor | No | Legacy lead only | No | No | No |

Attempt direct Supabase writes as each account, not only server-action calls.

### Browser journeys

Update `tests/e2e/demo-journeys.spec.ts` or split marketplace journeys:

1. Visitor sees all three segment cards and marketplace seller filters.
2. Farmer onboarding shows farming method; Customer onboarding does not.
3. Customer opens a listing, connects, and opens the conversation.
4. Farmer/Wholesaler sees the linked enquiry and marks it completed.
5. Customer creates one review; duplicate creation is rejected.
6. Review appears on listing and storefront without buyer contact data.
7. Google and LinkedIn buttons produce the correct provider action in demo mode.

Real OAuth callback success must be manually verified against configured Google and LinkedIn development applications because automated CI will not contain those third-party credentials.

### Completion gate

Run:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

Then run `npm run test:e2e` where browser dependencies are available. Inspect login, signup, all three onboarding paths, marketplace filters, listing connection, seller dashboard, purchase list, review rendering, and mobile navigation at narrow and desktop widths.

## Rollout and external configuration

1. Apply the migration to a development Supabase project.
2. Run the multi-user RLS matrix.
3. Configure Google and LinkedIn development OAuth applications.
4. Add development callback URLs and verify both providers.
5. Deploy the application code to the existing Worker.
6. Apply the same migration to production immediately before enabling the new application build.
7. Configure production `NEXT_PUBLIC_SITE_URL` and Supabase redirect allow list for `https://farmerbook.in`.
8. Verify email, Google, and LinkedIn login; each onboarding role; seller listing; Customer connection; completed purchase; and review.

The custom domain remains an external prerequisite for the final production URL. OAuth should not list `farmerbook.in` as ready until its registrar hold/KYC and DNS delegation are resolved.

## Rollback

- Keep the last healthy Worker deployment available.
- If UI/auth behavior fails, redeploy the prior application version; the additive profile/review columns are ignored.
- If a new policy blocks legitimate traffic, deploy a reviewed corrective migration. Do not manually weaken production RLS.
- Do not drop `market_reviews` or new profile data during rollback.
- Disable Google or LinkedIn in the Supabase dashboard if a provider is misconfigured; email/password remains available.
- Because `farmer_id`, `participant_type`, anonymous enquiries, and existing statuses remain intact, the previous marketplace build remains schema-compatible.

## Open product questions resolved by this plan

- No integrated payment in this iteration.
- Only Customers write reviews.
- A seller-confirmed `won` enquiry is the purchase proof.
- One review per completed enquiry.
- Wholesalers sell to Customers but do not buy through a Wholesaler account.
- External social profiles are links, not cross-posting integrations.
- Existing agronomist/trainer/NGO profiles keep community access but receive the least-privileged Customer marketplace role during backfill.

These are implementation assumptions, not irreversible product rules. If the user wants payments, wholesalers to buy, or a different legacy-role mapping, the plan must be revised before implementation.

## TODO checklist

- [x] User explicitly approves this change plan.
- [x] Add shared types and demo fixtures.
- [x] Add and review the forward-only migration.
- [x] Implement role-aware onboarding and profile settings.
- [x] Implement Google and LinkedIn OAuth entry points and callback hardening.
- [x] Enforce role-aware server routes/actions.
- [x] Generalize marketplace seller language and filters.
- [x] Implement linked Customer connections and purchase dashboard.
- [x] Implement review actions, queries, UI, aggregation, and moderation.
- [x] Add three-segment public messaging.
- [x] Complete unit, authorization, component, browser, and build verification.
- [ ] Configure and manually test OAuth providers in development.
- [ ] Roll out to production only after domain and Supabase prerequisites are ready.

## Addendum: Optional profile photos for every account role

### Approach

Reuse the existing nullable `avatar_path`, private Supabase Storage bucket, owner-folder policies, signed URLs, and initials fallback. Add a single role-neutral photo control to onboarding and settings. Do not add a new table or make photos required.

### Changes required

#### 1. Shared profile-photo control

**File:** `features/profiles/profile-photo-field.tsx` (new)

Create a client component receiving the profile's initials, optional signed URL, and optional storage path. It will:

- render the existing `Avatar` component;
- label the input “Profile photo (optional)”;
- accept JPEG, PNG, and WebP files;
- reuse `uploadAvatar`, `removeAvatar`, and `saveAvatarAction`;
- replace an old object only after the new path is saved;
- offer “Remove photo” only when a photo exists;
- expose accessible progress, success, and error text;
- preserve initials when no image is selected.

Key interface:

```tsx
<ProfilePhotoField
  initials={profile.initials}
  initialImageUrl={profile.avatarUrl}
  initialPath={profile.avatarPath}
/>
```

#### 2. Permit clearing the optional photo

**File:** `features/profiles/actions.ts:53-83`

Keep the owner-prefix and maximum-length validation for non-empty paths. Treat `undefined` as an explicit clear operation and write `avatar_path: null`. Return the previous path so the client can delete the old object after the database update succeeds.

```ts
if (path && (!path.startsWith(`${user.id}/`) || path.length > 500)) {
  return { ok: false as const, message: "The avatar path is invalid." };
}

await supabase.from("profiles").update({
  avatar_path: path ?? null,
  updated_at: new Date().toISOString(),
});
```

#### 3. Expose the control during onboarding

**File:** `features/profiles/onboarding-form.tsx:78-260`

Add the shared photo field to the identity step, after name/handle and before location. It remains visible and optional for Farmer, Customer, and Wholesaler choices. Photo upload status must not disable or invalidate unrelated profile fields.

#### 4. Reuse the control in settings

**File:** `features/profiles/profile-settings-form.tsx:1-105`

Replace the duplicated upload state and handler with `ProfilePhotoField`. Retain the existing profile-form toast/error behavior for profile text fields; the photo component owns only its upload/remove feedback.

#### 5. Styling

**File:** `app/globals.css`

Add only the layout styles required for the shared photo field, reusing existing `.person-row`, `.button`, `.form-helper`, `.form-error`, and `.avatar` primitives where possible.

### Testing strategy

- Add focused component tests showing the optional label and initials fallback for Farmer, Customer, and Wholesaler profile fixtures.
- Add action-level or mocked component coverage for rejected file types, oversize files, replacement cleanup, and removal.
- Extend `tests/e2e/demo-journeys.spec.ts` so each onboarding role can reach a visible “Profile photo (optional)” control without selecting a file.
- Run `npm run typecheck`, focused tests, `npm run check`, and the onboarding Playwright journey.

### Rollback

Remove the shared component and restore the existing settings upload block. No database rollback is required because `avatar_path` is already nullable and the storage policy is unchanged.

### TODO checklist

- [x] User explicitly approves this addendum.
- [x] Add the shared profile-photo component.
- [x] Allow the authenticated owner to clear `avatar_path` safely.
- [x] Add the optional control to all three onboarding roles.
- [x] Replace duplicated settings upload UI with the shared control.
- [x] Add focused test coverage.
- [x] Run typecheck, checks, and browser verification.

## Addendum: Visible website imagery

### Approach

Replace the prominent CSS-only agricultural artwork with original, natural-looking FarmerBook imagery while preserving the existing content, actions, and responsive layouts. Generate six presentation images with no embedded text, logos, watermarks, or identifiable real people, then optimize them as WebP assets in the repository.

### Planned assets

- `public/images/home/farmer-network-hero.webp`: wide Maharashtra farm scene with a farmer reviewing a harvest near stacked produce crates; natural daylight and room for the existing interface overlay.
- `public/images/marketplace/produce-market-hero.webp`: farmers and buyers inspecting fresh produce at a clean local collection/market point; collaborative rather than staged.
- `public/images/marketplace/tomato-crates.webp`: ripe tomatoes in field crates.
- `public/images/marketplace/grape-vines.webp`: Nashik-style grape rows and harvest baskets.
- `public/images/marketplace/onion-sacks.webp`: red onions and ventilated market sacks.
- `public/images/marketplace/okra-basket.webp`: fresh okra in a woven harvest basket.

All six prompts will specify photorealistic editorial photography, authentic Indian agricultural context, warm but restrained color, no text/logo/watermark, and no recognizable public figure. Each generated asset will be inspected before integration.

### Code changes

#### 1. Landing and marketplace heroes

**Files:** `app/page.tsx`, `app/marketplace/page.tsx`, `app/globals.css`

Use the two hero images inside the existing visual panels, retain readable overlays and calls to action, and provide descriptive alternative text. Keep focal points and cropping usable on mobile and desktop.

#### 2. Consistent listing photographs

**Files:** `lib/listing-images.ts` (new), `features/marketplace/listing-card.tsx`, marketplace detail/management/profile listing surfaces, `app/globals.css`

Map each existing `imageVariant` to one local source and alt description. Render the mapped photograph anywhere that currently uses `.market-art`, so the same listing does not appear with different imagery across cards and detail views. Preserve the current variant fallback for unknown fixture data.

#### 3. Performance and accessibility

Commit optimized WebP assets, specify intrinsic dimensions/aspect ratios to prevent layout shift, eagerly load only the landing hero, and lazy-load below-the-fold listing images. Do not place text inside the image files.

### Testing strategy

- Add focused tests for all four variant mappings and meaningful alt text.
- Extend public-page browser checks to assert visible hero and listing images on desktop and mobile.
- Inspect the homepage, marketplace, one listing detail, and one profile/store surface for crop quality and text contrast.
- Run `npm run check` and the relevant Playwright journeys.

### Rollback

Restore the existing CSS illustration elements and remove the mapping/assets. No schema, storage, or user-content rollback is required.

### TODO checklist

- [x] User explicitly approves this imagery addendum.
- [x] Generate and inspect the six original assets.
- [x] Optimize and store the selected assets under `public/images`.
- [x] Integrate the landing and marketplace hero photographs.
- [x] Replace listing CSS art with the shared variant mapping.
- [x] Add focused tests and visual/accessibility checks.
- [x] Run checks, browser verification, and document the generated prompts.

## Addendum: Repair LinkedIn and Facebook sign-in

### Approach

Resolve the proven production configuration fault and harden the app around it.
Keep the existing Supabase server-side OAuth/PKCE architecture and provider
identifiers. Configure one least-privilege OIDC/OAuth application per provider,
enable both in Supabase without persisting secrets in the repository, and make
FarmerBook handle disabled-provider and callback-error states in its own UI.

### Changes required

#### 1. Add a public provider-availability check

**Files:** `features/auth/providers.ts` (new), `features/auth/actions.ts:71-98`

Add a small server-only helper that reads `${supabaseUrl}/auth/v1/settings` with
the public publishable key and validates only the `external` boolean map needed
for `google`, `linkedin_oidc`, and `facebook`.

Before `signInWithOAuth()`, check the selected provider. When Supabase explicitly
reports it disabled, return to the originating login/signup page with a concise
provider-specific availability message. If the settings request fails or has an
unexpected response, continue with the existing OAuth request so the diagnostic
check cannot become a new authentication outage.

Do not use the service-role key, cache client secrets, or expose the provider
settings helper as an application API route.

#### 2. Handle OAuth callback failures explicitly

**Files:** `features/auth/redirects.ts`, `app/auth/callback/route.ts:6-21`

Add a bounded mapping for callback `error` values such as access denial and
provider failure. Redirect those callbacks to `/login?error=...` before looking
for a code. Do not reflect an arbitrary `error_description` directly into HTML;
use it only to select a known safe message or fall back to a generic retry
message. Preserve `safeNextPath()` and the successful PKCE exchange.

#### 3. Configure LinkedIn OIDC

**External systems:** LinkedIn Developer Dashboard, Supabase Authentication

- Create or select the FarmerBook LinkedIn application and associated LinkedIn
  Page.
- Request/enable **Sign In with LinkedIn using OpenID Connect** and confirm the
  OIDC scopes supplied by the product.
- Register exactly
  `https://kdmtjavpxxcppmbzlttr.supabase.co/auth/v1/callback`.
- Enter the client ID and secret directly into Supabase's LinkedIn (OIDC)
  provider and enable it.
- Verify the public Auth settings flag becomes `linkedin_oidc: true`, then run a
  complete production login with an authorized test account.

#### 4. Configure Facebook Login

**External systems:** Meta for Developers, Supabase Authentication

- Create or select the FarmerBook Meta application and configure the
  Authentication and Account Creation use case.
- Ensure `public_profile` and `email` are ready for testing.
- Register exactly
  `https://kdmtjavpxxcppmbzlttr.supabase.co/auth/v1/callback` under Valid OAuth
  Redirect URIs.
- Complete the required app domain, privacy-policy, contact, and data-use fields.
- Enter the app ID and secret directly into Supabase's Facebook provider and
  enable it.
- Verify the public Auth settings flag becomes `facebook: true`, test with an
  app-role account, and make the Meta app live before treating general-public
  login as released.

#### 5. Verification and operational record

**Files:** `tests/auth-providers.test.ts` (new),
`tests/schemas.test.ts`, `tests/e2e/demo-journeys.spec.ts`, `README.md`,
`implementation-log.md`, `.structured-dev-state`

- Unit-test enabled, disabled, malformed, and unreachable Auth-settings
  responses and the fail-open behavior.
- Unit-test safe callback error mapping and retain the existing safe-next tests.
- Keep the current demo-mode button journey working without external calls.
- Run focused tests, lint, TypeScript, all unit tests, and the production build.
- Verify Google still reaches its account chooser.
- Verify LinkedIn and Facebook each reach their provider, return through
  `/auth/callback`, establish a Supabase session, and send a new user into
  onboarding or an existing user to `/feed`.
- Record only provider activation and verification outcomes; never record client
  secrets, temporary OAuth codes, PKCE verifiers, or session cookies.

### Rollback

The code change is isolated to auth diagnostics/callback handling and can be
reverted without schema changes. If either provider is unsafe or unstable,
disable that provider in Supabase; email/password and Google remain available.
Do not delete provider applications or rotate credentials as an automatic
rollback because those actions are external and potentially destructive.

### Open dependency

Completing provider activation requires authenticated LinkedIn, Meta, and
Supabase dashboard access plus authority to create/select the FarmerBook
provider applications. LinkedIn additionally requires an associated LinkedIn
Page. If any of those are absent, application hardening can still be shipped,
but the corresponding social login cannot honestly be marked functional.

### TODO checklist

- [x] User explicitly approves this OAuth repair addendum.
- [x] Add and test provider-availability preflight behavior.
- [x] Add and test safe callback error handling.
- [x] Run the local quality gate.
- [ ] Configure and activate LinkedIn OIDC in the external dashboards.
- [ ] Configure and activate Facebook Login in the external dashboards.
- [ ] Complete live end-to-end verification for both providers and Google
      regression coverage.
- [ ] Record the verified deployment/configuration outcome without secrets.

## Addendum: Passkeys and device biometrics

### Approach

Add passkeys as a secondary, passwordless FarmerBook authentication method on
top of the existing Supabase session architecture. Preserve email/password and
Google as account creation and recovery options. Keep every WebAuthn ceremony
inside a Client Component, gate the UI on Supabase's public
`passkeys_enabled` setting, and use Account Settings for enrollment because
Supabase requires an existing confirmed user.

### Changes required

#### 1. Enable passkeys in the browser client

**File:** `lib/supabase/client.ts`

Pass the experimental client option through the existing browser factory:

```ts
return createBrowserClient(config.url, config.publishableKey, {
  auth: { experimental: { passkey: true } },
});
```

Do not enable the option in server/admin clients; WebAuthn ceremonies need a
browser and a direct user gesture.

#### 2. Gate the feature with public Auth settings

**File:** `features/auth/providers.ts`

Extend the validated settings shape with root-level `passkeys_enabled` and add
a helper returning `enabled`, `disabled`, or `unknown`. Treat a missing or
unreachable value as unavailable in the rendered passkey UI while leaving the
existing OAuth fail-open behavior unchanged.

#### 3. Add passkey sign-in to `/login`

**Files:** `features/auth/passkey-button.tsx` (new), `app/login/page.tsx`,
`app/globals.css`

Render `Sign in with a passkey` above the email form with helper text explaining
fingerprint, face, device PIN, or security key. On an enabled project, call
`auth.signInWithPasskey()` from the click handler, then route a successful
session to `/feed`. Disable the button with an availability note when Supabase
has not enabled passkeys. Map cancellation and SDK failures to concise in-page
messages without exposing raw error bodies.

#### 4. Add passkey enrollment and management

**Files:** `features/auth/passkey-settings.tsx` (new),
`features/profiles/account-settings.tsx`

For a signed-in confirmed user, list registered passkeys, provide `Add a
passkey`, and allow removal after an explicit confirmation. Refresh the list
after each successful ceremony. In demo mode or while the project flag is off,
show explanatory disabled state without constructing a Supabase browser client.

#### 5. Configure production WebAuthn

**External system:** Supabase Authentication -> Passkeys

- Enable passkeys.
- Set display name to `FarmerBook`.
- Set RP ID to `farmerbook.in`.
- Allow `https://farmerbook.in` and `https://www.farmerbook.in`.
- Do not use the temporary Worker hostname as the production RP ID.
- Enroll a test passkey only after the deployed UI is available on the final
  HTTPS origin.

#### 6. Test and document

**Files:** focused auth component tests, `tests/auth-providers.test.ts`,
`tests/e2e/demo-journeys.spec.ts`, `README.md`, `implementation-log.md`,
`.structured-dev-state`

- Unit-test enabled, disabled, malformed, and unreachable passkey settings.
- Component-test disabled state, successful sign-in routing, bounded failures,
  enrollment/list refresh, and confirmed removal.
- Extend desktop/mobile browser coverage to verify the login option and Account
  Settings fallback without invoking a platform biometric dialog in CI.
- Run ESLint, TypeScript, focused tests, the full unit suite, and production
  build; then verify the enabled production surface in Chrome.

### Rollback

Disable passkeys in Supabase and remove the two Client Components plus the
browser-client experimental option. Existing email/password, Google, and OAuth
sessions remain unaffected; no schema rollback is required. Do not change the
RP ID after real enrollment as a casual rollback because that strands existing
credentials.

### TODO checklist

- [x] Research the installed SDK, current auth boundary, and hosted-project flag.
- [x] User reviews and approves this passkey addendum (`Plan approved`,
      2026-08-06).
- [x] Enable the experimental browser-client option.
- [x] Add and test public availability gating.
- [x] Add and test login with a passkey.
- [x] Add and test passkey enrollment/management.
- [x] Configure production RP settings in Supabase.
- [x] Run the complete local quality gate and Chrome verification.
- [x] Record the deployment/configuration outcome without credentials.

### Approved companion requirements

- [x] Disable the LinkedIn login control so it cannot submit OAuth while the
      external LinkedIn application remains incomplete.
- [x] Import a trusted Google/social-OAuth profile photograph into FarmerBook's
      existing private avatar storage when one is available; allow replacement
      with a direct upload.
- [x] Show a Farmer-specific default icon when no real photograph is available,
      without blocking onboarding.
- [x] Treat only an imported or explicitly uploaded photograph—not the generic
      Farmer icon—as the source image for a future identity-card feature.
      Identity-card generation/issuance is not part of this implementation.

## Addendum: Remove LinkedIn, Instagram, and passkey login

### Approach

Retire the three requested authentication controls completely while preserving
Google, Facebook, email/password, profile photos, and optional LinkedIn and
Instagram contact links. Remove both visible entry points and server-callable
provider support; remove the experimental passkey client option and account
management UI; disable passkeys in the hosted Supabase project.

### Implementation

1. Narrow the OAuth UI and provider schema to Google and Facebook:

```tsx
<OAuthProviderForm provider="google" />
<OAuthProviderForm provider="facebook" />
```

2. Restore the standard Supabase browser client and delete the three dedicated
   passkey modules. Remove passkey status fetching from login and Account
   Settings.
3. Remove retired CSS and test expectations. Add negative browser assertions so
   LinkedIn, Instagram, and passkey controls cannot silently return.
4. Update operational documentation without removing social profile-link or
   OAuth-avatar behavior.
5. Run ESLint, TypeScript, unit tests, production build, and desktop/mobile auth
   browser tests.
6. Disable passkeys in Supabase, deploy the built Worker, and verify the live
   login page contains only Google, Facebook, and email/password authentication.

### Rollback

Reapply the preceding passkey addendum and re-enable the hosted Supabase
passkey configuration. LinkedIn or Instagram login would still require a newly
approved provider implementation and is not restored by the passkey rollback.

### TODO checklist

- [x] User explicitly directs and approves removal on 2026-08-06.
- [x] Remove LinkedIn and Instagram login UI and server acceptance.
- [x] Remove passkey sign-in, enrollment, SDK opt-in, and hosted configuration.
- [x] Update tests, styles, and documentation.
- [x] Run the complete local quality gate and focused browser tests.
- [x] Deploy and verify the production login page.

## Addendum: Shareable Farmer identity profile and homepage

### Outcome

Give each Farmer an optional public professional homepage at
`/profile/[handle]`. The page acts as a FarmerBook identity card and farm story:
it has a profile picture, wide background picture, identity and verification
details, crops and methods, public social links, active produce, reviews, and a
native share/copy-link action. It is a professional FarmerBook profile, not an
official government identity document.

The page is private until the Farmer explicitly publishes it. It never exposes
phone numbers, enquiry details, exact farm coordinates, identity documents,
private messages, or signed-in community posts.

### User experience

1. A Farmer opens Profile Settings and sees a new **Profile homepage** section.
2. They keep or replace the existing profile photo, add an optional wide cover
   photo, complete their story/crops/social links, and enable **Publish my
   Farmer profile**.
3. They can preview the result and share
   `https://farmerbook.in/profile/<handle>` through WhatsApp/the device share
   sheet, or copy the link on unsupported browsers.
4. A signed-out visitor sees a responsive page with:
   - cover image or FarmerBook agricultural fallback;
   - real avatar or the existing default Farmer icon;
   - name, `@handle` FarmerBook ID, Farmer role, verification state, district
     and state, experience, and joined date;
   - farm introduction, crops, and farming method;
   - safe outbound website/social links;
   - active produce and verified-purchase review summary when available;
   - a clear FarmerBook join/browse call to action.
5. An unpublished, suspended, deleted, missing, or non-Farmer profile returns
   the normal not-found page to anonymous visitors.

### Architecture

    Profile Settings (authenticated owner)
       | upload avatar + cover / toggle publish
       v
    profiles.avatar_path + cover_path + public_profile_enabled
       | selective anonymous row/media read
       v
    /profile/[handle] (public identity homepage)
       | share URL
       v
    WhatsApp / browser share sheet / copied link

Keep `/farmers/[handle]` as the authenticated social-network view and
`/store/[handle]` as the commerce storefront. Link them where relevant instead
of changing their existing authorization contracts.

### Implementation

#### 1. Add opt-in profile and cover fields

**Files:** new forward migration under `supabase/migrations/`,
`lib/types.ts`, `lib/data-mappers.ts`, `lib/demo-data.ts`,
`features/profiles/queries.ts`

Add nullable `cover_path` and default-false `public_profile_enabled` fields.
Grant authenticated users update access through the existing own-profile RLS
policy and grant anonymous read access only to columns required by the public
profile query. Extend the shared profile type and mapper:

```ts
type FarmerProfile = ParticipantProfile & {
  coverPath?: string;
  coverUrl?: string;
  publicProfileEnabled: boolean;
};
```

Hydrate the avatar and cover in one bounded pass, issuing one-hour signed URLs
from the private `avatars` bucket. Mark the demo Farmer profile published so
the public route can be exercised in secret-free development.

#### 2. Authorize only referenced public Farmer media

**File:** the same forward Supabase migration

Keep the `avatars` bucket private. Add anonymous `SELECT` authorization only
when an object is the current `avatar_path` or `cover_path` of an active,
published Farmer. Do not expose abandoned uploads, other users' media, post
images, customer media, or whole storage folders.

The migration is additive and must not edit previously deployed migrations.
Its policy test should assert the active/Farmer/published/reference conditions
so a future simplification cannot accidentally make the bucket public.

#### 3. Add background-picture upload and ownership actions

**Files:** `features/profiles/uploads.ts`,
`features/profiles/actions.ts`,
`features/profiles/profile-cover-field.tsx` (new),
`features/profiles/profile-settings-form.tsx`

Refactor the local upload helper just enough to support `avatar-*` and
`cover-*` paths while preserving the existing avatar API. Cover uploads accept
JPEG, PNG, or WebP up to 5 MB and use a recommended 1600 x 500 presentation.
Add an explicit `saveProfileCoverAction()` analogous to the current avatar
action: validate the signed-in owner's path prefix, update only `cover_path`,
return the prior path, remove a failed new object, and clean up the replaced or
removed old object only after the row update succeeds.

The cover field must provide add, change, remove, loading, success, and bounded
error states. Missing covers render the existing agricultural gradient; no
social-network image is imported as a cover.

#### 4. Add publish, preview, and share controls

**Files:** `features/profiles/actions.ts`,
`features/profiles/profile-home-settings.tsx` (new),
`features/profiles/share-profile-button.tsx` (new),
`features/profiles/profile-settings-form.tsx`,
`features/profiles/profile-view.tsx`

Add an owner-only server action that accepts a boolean and updates
`public_profile_enabled`. The settings component shows the resulting canonical
path, publish/unpublish toggle, preview link, and share action. The share
component follows the existing storefront behavior:

```ts
const url = `${window.location.origin}/profile/${handle}`;
if (navigator.share) {
  await navigator.share({ title, text, url });
} else {
  await navigator.clipboard.writeText(url);
}
```

Handle a cancelled share sheet silently and show “Profile link copied” after a
clipboard fallback. Add **Share public profile** to the owner's authenticated
profile only when it is published.

#### 5. Build the anonymous-safe public homepage

**Files:** `features/profiles/queries.ts`,
`features/profiles/public-farmer-profile.tsx` (new),
`app/profile/[handle]/page.tsx` (new), `proxy.ts`, `app/globals.css`

Add `loadPublicFarmerProfile(handle)` without `requireUser()`. The Supabase
query requires all of:

```ts
.eq("handle", handle)
.eq("account_role", "farmer")
.eq("status", "active")
.eq("public_profile_enabled", true)
```

Render the route outside the authenticated product layout with `PublicHeader`
and `PublicFooter`. Use server-rendered identity and farm content, the small
share Client Component, CSS `object-fit: cover`, readable image alt text,
keyboard-visible controls, and responsive layouts for narrow Android screens.
Load only public active listings and verified-purchase review aggregates; do
not query follows, posts, messages, or enquiry contact details.

Add `/profile` to the proxy public prefixes. Return `notFound()` for any row
that does not satisfy the public contract.

#### 6. Add stable metadata

**File:** `app/profile/[handle]/page.tsx`

Generate the title, description, canonical URL, Open Graph fields, and Twitter
card from the safe public profile result. Use the existing stable 1200 x 630
FarmerBook image for social previews; do not embed one-hour signed media URLs
as long-lived Open Graph image addresses.

#### 7. Test and verify

**Files:** `tests/data-mappers.test.ts`,
`tests/profile-uploads.test.ts`,
`tests/profile-cover-field.test.tsx` (new),
`tests/public-profile.test.tsx` (new),
`tests/share-profile-button.test.tsx` (new),
`tests/rls-migration.test.ts`, `tests/e2e/demo-journeys.spec.ts`

Add focused coverage for:

- mapping cover/public state and demo fallback behavior;
- rejecting unsupported or over-limit cover images;
- successful cover add/replace/remove and failed-save cleanup;
- owner-only publish/unpublish action results;
- anonymous loader filters and unpublished/non-Farmer not-found behavior;
- selective Storage policy conditions;
- native Web Share, clipboard fallback, cancellation, and accessible status;
- default Farmer icon and default cover when pictures are missing;
- published public profile content at desktop and mobile widths, with no
  horizontal overflow or broken images.

Run `npm run lint`, `npm run typecheck`, focused Vitest tests, the full Vitest
suite, and `npm run build`. Then use Chrome at desktop and mobile sizes to test
upload, replace, remove, publish, unpublish, preview, anonymous visit, and share
fallback against the deployed Supabase/Cloudflare environment. Deploy only
after the full local gate passes.

### Security and privacy acceptance criteria

- Public profile publication is explicit and reversible; the database default
  is private.
- Only active Farmer profiles are served at `/profile/[handle]`.
- The public loader never returns contact submissions, auth email/phone,
  messages, follows, documents, exact coordinates, or private posts.
- Anonymous Storage access matches only the currently referenced avatar/cover
  of a published Farmer.
- Upload paths are restricted to the signed-in user's folder and image types
  remain bounded by the existing private bucket configuration.
- Social URLs retain the existing validation and open with
  `rel="noopener noreferrer"`.
- The UI calls the handle a “FarmerBook ID”; it does not imply government or
  legal identity verification.

### Rollback

First unpublish all profile routes by removing `/profile` from the public proxy
list or disabling the route. Remove the public media policy and UI entry points
while retaining `cover_path` and `public_profile_enabled` as harmless additive
columns; this avoids a destructive schema rollback and preserves uploaded
covers for reactivation. Existing authenticated profiles, avatars, storefronts,
listings, reviews, and authentication continue to work.

### TODO checklist

- [x] Research the current authenticated profile, public storefront, media
      storage, RLS, sharing pattern, metadata, and tests.
- [x] User reviews and approves this addendum (`Plan approved`, 2026-08-07).
- [x] Add the forward schema/storage migration and mapper fields.
- [x] Add cover upload, replace, remove, and cleanup behavior.
- [x] Add explicit publish/unpublish, preview, and share controls.
- [x] Add the public-safe loader and `/profile/[handle]` homepage.
- [x] Add metadata, responsive styling, accessibility, and safe fallbacks.
- [ ] Add focused tests and pass the complete local quality gate.
- [ ] Apply the migration, deploy to Cloudflare, and verify the live public
      profile flow in Chrome at desktop and mobile sizes.

## Addendum: Production data integrity and full-site deployment

### Outcome

Deploy the current FarmerBook worktree to production without presenting demo
records, invented social-proof counts, or fabricated analytics as live data.
Normal marketplace routes use only authoritative database records and honest
empty/missing states. Fictional produce is available only on a separate,
visibly labelled, read-only `/marketplace/demo` page.

### Release constraints

- Do not seed or manufacture followers, listings, reviews, enquiries, views,
  saves, purchases, experience, growth percentages, or time-series values.
- Preserve the user's existing uncommitted work and restrict new edits to the
  audited data-integrity files and their tests/documentation.
- Keep factual input constraints and user-entered record values; “no fake
  numbers” applies to product/activity claims, not form limits or dates.
- Do not expose private contact data or broaden anonymous profile access.
- Do not let demo listing IDs reach live listing-detail, save, enquiry,
  storefront, purchase, review, or seller-dashboard actions.
- Deploy only after the database check, complete local gate, dry run, and
  explicit review of the generated Worker configuration.
- Retain Worker version `6dedddfd-3756-403e-9d56-a2150e05f169` as the immediate
  rollback target.

### 1. Create the isolated demo marketplace

**Files:** `app/marketplace/demo/page.tsx` (new),
`features/marketplace/market-browser.tsx`,
`features/marketplace/listing-card.tsx`, `components/public-footer.tsx`

Add a public, read-only `/marketplace/demo` route that receives the sample
listings and always renders the existing `DemoBanner` plus explicit copy: every
seller, produce lot, quantity, price, review, and activity value is fictional.
Keep `/marketplace` as the primary public navigation target; expose the demo
only through a clearly named footer or honest-empty-state link. Add noindex and
nofollow metadata. The static route uses the existing public `/marketplace`
proxy prefix and wins over `[listingId]`.

Parameterize the reusable browser instead of hard-coding live paths:

```tsx
<MarketBrowser
  listings={demoListings}
  browserPath="/marketplace/demo"
  listingHrefPrefix={null}
  readOnly
/>
```

In read-only mode, cards have no save control, enquiry path, storefront link,
or live detail link. Filters and sorting remain usable, and query-string
updates stay under `/marketplace/demo`.

### 2. Enforce the demo/production query boundary

**Files:** `features/marketplace/queries.ts`,
`features/reviews/queries.ts`

Remove market fixture imports from modules used by normal live routes. Both
configured and unconfigured live marketplace paths return authoritative
records or honest empty/missing states; only `/marketplace/demo` loads sample
produce. In configured mode:

```ts
if (!isSupabaseConfigured()) return [];

// configured mode
if (error) {
  console.error("Public marketplace query failed:", error.message);
  return [];
}
return hydrateListings(data as ListingRow[]);
```

List queries return real rows or an empty collection. Detail queries return a
real record or `null`, allowing the existing route to call `notFound()`.
Storefront lookup failures return `{ profile: null, listings: [] }`; a real
profile with no listings remains a real empty storefront. Review queries return
real rows or `[]`, never demo reviews. Unconfigured seller and customer market
dashboards retain the demo profile shell but use empty listings, enquiries,
purchases, and reviews.

### 3. Repair anonymous production marketplace access

**File:**
`supabase/migrations/20260804090000_anon_marketplace_policy_access.sql`

Use the existing narrow, idempotent column grant required by the anonymous
listing RLS predicate. Before deployment, execute/verify:

```sql
grant select (status) on public.profiles to anon;
```

Then query `produce_listings` with the public publishable key. Acceptance is an
HTTP 200 containing real active rows or `[]`; PostgreSQL `42501` is a release
blocker. Do not grant full-profile `SELECT` and do not use the service-role key
in the browser or Worker.

### 4. Replace invented relationship and seller metrics

**Files:** `features/network/network-client.tsx`,
`features/marketplace/business-dashboard.tsx`

Network uses the supplied real relationship array:

```tsx
Followers ({followers.length})
```

The seller dashboard derives active listings, listing views, enquiry totals,
new enquiries, completed purchases, and saves from `initialListings` and
`initialEnquiries`. Remove the literal 82% strength score, 18% change, eight-
response claim, seven-day bar values, 61% crop attribution, and “Two listings”
copy. Until historical events exist, show current totals and a clear statement
that trend history will appear after real activity is recorded.

### 5. Remove unsupported public and marketing claims

**Files:** `app/page.tsx`, `app/marketplace/page.tsx`,
`app/store/[handle]/page.tsx`,
`app/marketplace/[listingId]/page.tsx`,
`features/moderation/report-queue.tsx`

- Mark visual landing/marketplace cards as illustrative and remove precise
  quantities, ages, views, saves, enquiries, and other activity claims.
- Compute live harvest-lot and sourcing-district totals from real listing rows.
- Omit experience when it is absent instead of using `?? 1`.
- Remove public follower totals from storefront/listing views because the
  anonymous loader does not fetch an authoritative count. Use real listing,
  enquiry, or verified-review totals where a numeric summary is useful.
- Make the production moderator empty state environment-neutral and remove the
  unbacked 24-hour claim.

### 6. Add regression coverage

**Files:** `tests/network-client.test.tsx` (new or existing focused component
test), `tests/business-dashboard.test.tsx` (new),
`tests/production-data-integrity.test.tsx` (new),
`tests/e2e/demo-journeys.spec.ts`

Cover:

- `/marketplace/demo` always has a visible fictional-data notice, retains its
  own URL while filtering, and exposes no live detail/save/enquiry actions;
- configured and unconfigured normal marketplace/review loaders never return
  sample fixture IDs;
- follower labels use `followers.length`, including zero;
- a zero-data business dashboard does not render 82%, 18%, 8, 61%, or a fake
  chart and only reports record-derived zero totals;
- configured marketplace/review errors and empty results never return demo
  entities;
- landing and marketplace production copy contains no precise illustrative
  activity numbers;
- missing public experience/follow data is omitted, not defaulted;
- the primary public/authenticated route set renders honest empty states on
  desktop and mobile without broken links, overflow, or demo banners in the
  configured build.

### 7. Run the release gate

Run, in order:

1. focused Vitest tests after each change;
2. `npm run typecheck` after the data-loader and dashboard changes;
3. `npm run check` for ESLint, TypeScript, all Vitest tests, and Vinext build;
4. all Playwright journeys on desktop and mobile;
5. search the built output and rendered primary routes for the removed literal
   metrics and configured-mode demo fixture names;
6. `wrangler deploy --dry-run` against `dist/server/wrangler.json` with the
   existing environment variables preserved.

Any failing route, query, or quality check blocks production deployment.

### 8. Deploy and verify production

Use Wrangler 4.92.0 with the generated Vinext configuration:

```sh
NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem \
  ./node_modules/.bin/wrangler deploy \
  --config dist/server/wrangler.json \
  --keep-vars \
  --strict \
  --message "Remove fictional production metrics and data fallbacks"
```

After deployment:

1. confirm the new Worker version receives 100% traffic on `farmerbook`;
2. verify `farmerbook.in`, `www.farmerbook.in`, and the workers.dev hostname;
3. verify public Supabase provider and marketplace endpoints return real state;
4. repeat the live route audit for landing, marketplace, market, feed,
   discover, network, messages, business/purchases, settings, authenticated
   profile, public profile, storefront, login/signup, and policy/deletion pages;
5. check desktop and mobile layouts and confirm normal production routes never
   show the demo banner, removed literals, or fictional marketplace records;
   separately verify `/marketplace/demo` is labelled fictional and read-only;
6. verify Google and Facebook authorization endpoints still redirect to their
   providers.

### Rollback

If a critical production route, authentication flow, or data query regresses,
immediately run a Wrangler rollback to Worker version
`6dedddfd-3756-403e-9d56-a2150e05f169`. The anonymous `status` column grant is
additive and narrowly scoped, so it may remain during a Worker rollback. If the
grant itself causes an unexpected policy issue, revoke only that column grant
after restoring the Worker and confirm marketplace behavior.

### TODO checklist

- [x] Deeply audit production routes, query fallbacks, database access, and the
      active Cloudflare deployment; document findings in `research.md`.
- [x] Incorporate the user's separate-demo-page constraint into the research
      and release plan.
- [ ] User reviews and explicitly approves this revised production-release
      addendum.
- [ ] Create the isolated, clearly labelled, read-only demo marketplace.
- [ ] Remove configured-mode marketplace and review demo fallbacks.
- [ ] Replace/remove every audited invented metric and unsupported numeric
      fallback.
- [ ] Add focused data-integrity and page regression tests.
- [ ] Pass typecheck, the complete local quality gate, and desktop/mobile
      Playwright journeys.
- [ ] Apply and verify the anonymous marketplace privilege repair.
- [ ] Run a Wrangler dry run and inspect the generated production config.
- [ ] Deploy the Worker and confirm 100% traffic on the new version.
- [ ] Re-audit all primary live pages, public data endpoints, and OAuth
      redirects; record the final version and evidence.

## Addendum: Explainable Farmer groups and background matcher

### Outcome and release order

Add opt-in Farmer peer groups with private, explainable recommendations based
on self-declared canonical crops, broad location, farming method, and confirmed
language. A background matcher keeps suggestions current, but never joins a
Farmer automatically. AI is optional enrichment and cannot affect membership
or access decisions.

This is Release B. First complete and deploy the production data-integrity
addendum above as Release A; do not hold the marketplace repair behind this
larger feature.

### Non-negotiable constraints

- Matching consent defaults off and is distinct from public-profile consent.
- Only active, onboarding-complete Farmer accounts enter Farmer peer matching.
- Do not use farm size, verification, followers, reviews, biography, global
  posts, DMs, enquiries, contact data, social links, photos, or inferred traits.
- Store and display deterministic reason codes; never show an unexplained AI
  score.
- Recommendations can create only private suggestions. Join/request/accept is
  an explicit authenticated user action.
- An empty or small candidate pool stays empty; never add fictional members,
  groups, posts, activity, or counts.
- Group content and media stay isolated from global posts and `post-images`.
- The privileged matching runtime is deployed separately from the public app.
- The feature works completely with every AI binding/provider disabled.

### 1. Repair and canonicalize matching signals

**Files:** `lib/types.ts`, `lib/data-mappers.ts`,
`features/profiles/queries.ts`, `features/profiles/profile-settings-form.tsx`,
`features/profiles/schemas.ts`, first forward groups migration

Add `preferredLanguage` to the domain type, profile row, shared selection, and
mapper so Profile Settings preserves the saved English/Hindi/Marathi choice.
Do not silently default an existing profile back to English.

Add human-reviewed, versioned `crop_aliases` and location normalization. Store
canonical crop/location keys alongside display labels. Normalize case,
whitespace, and Unicode deterministically; unknown aliases require user/admin
confirmation and are excluded from automatic matches. Do not treat crop array
order as priority.

### 2. Add group membership, content, and moderation domains

**Files:** two new forward migrations under `supabase/migrations/`,
`lib/types.ts`, private group-media bucket policies

Create:

```text
farmer_groups
farmer_group_memberships
farmer_group_recommendation_preferences + consent_events
farmer_group_recommendations + dismissals
farmer_group_match_runs + match_items
farmer_group_posts + comments + reactions
farmer_group_reports + moderation_actions
```

`farmer_groups` stores a unique normalized signature, slug/name/description,
anchor crop, district/state scope, method/language scope, cohort, capacity,
visibility, join policy, status, and algorithm version. Membership has a unique
`(group_id, user_id)` lifecycle row with owner/moderator/member role and
requested/invited/active/declined/left/removed/banned state. Recommendation
rows store score, non-sensitive reason codes, profile fingerprint, algorithm
version, snapshots, status, and expiry; they never grant access.

Keep group posts/comments/reactions separate from global post tables. Add a
private `group-post-images` bucket with `<group>/<user>/<file>` paths and
member-scoped read plus owner-folder write/delete policies. Extend reporting
with group/group-post targets and immutable scoped audit rows.

RLS rules:

- eligible signed-in Farmers see active discoverable group metadata and only
  aggregate member counts;
- active members see their group roster, content, and media, excluding blocked
  authors as required;
- users see only their own preferences, consent history, recommendations, and
  dismissal state;
- group moderators see only scoped requests/members/reports, never DMs,
  candidate pools, recommendation recipients, or other groups;
- matching run/item tables have RLS enabled and no anon/authenticated grants;
- browser roles cannot directly write membership role/status or immutable
  audit rows.

### 3. Add locked membership and consent RPCs

**Files:** the same migrations, `features/groups/schemas.ts`,
`features/groups/actions.ts`

Use `SECURITY DEFINER` functions with fixed empty search paths, schema-qualified
references, explicit revoked default execution, row locks, and bounded request
IDs. Grant only the intended functions to authenticated users.

Authenticated RPCs cover consent opt-in/update/withdrawal, join-or-request,
accept invitation, decide request, dismiss/accept recommendation, leave,
remove/ban, transfer ownership, create/remove/moderate group posts, and group
reporting. Every RPC derives the actor from `auth.uid()`, rechecks active Farmer
state, prevents self-promotion/last-owner removal, and writes audit or consent
events atomically. Opt-out expires pending recommendations but never removes an
existing group membership.

Account deactivation/deletion atomically expires recommendation work,
deactivates memberships, applies the published group-content retention rule,
and transfers to an active owner or archives the group.

### 4. Implement deterministic recommendation logic

**Files:** matching migration/RPCs,
`features/groups/recommendation-reasons.ts`, tests

Eligibility is checked before scoring: consent on, active/onboarded Farmer,
canonical crop/location, active group with capacity, shared anchor crop,
allowed scope, no joined/pending/banned/declined state, and no block conflict.

Version-one scoring:

```text
shared anchor crop = 40
same district/state = 25; same state scope = 12
same farming method = 15; mixed/any compatible = 8
same confirmed language = 15
Farmer role = 5
```

Show 80–100 as Recommended and 70–79 as Good match; hide lower scores. Sort by
score, district before state, lower active-member count, created time, then UUID
and return at most three. Store structured reasons and render user-facing text
from a fixed map such as “You grow tomatoes” and “Same district: Nashik.”

Initial cold-start thresholds are configuration under an algorithm version:
four compatible district Farmers or five state Farmers across two districts;
groups activate only after three accept, expire pending after 30 days, and cap
at 20 before another cohort may form. Upserts, unique signatures/fingerprints,
row locks, and stable tie-breaks make repeated/concurrent runs identical.

### 5. Add the Farmer group experience

**Files:** new `features/groups/*`, `app/(product)/groups/page.tsx`,
`app/(product)/groups/[slug]/page.tsx`,
`app/(product)/groups/[slug]/manage/page.tsx`,
`components/app-shell.tsx`, `app/globals.css`, settings/legal/deletion pages

Create a Farmer-only Groups hub with Your groups, Recommended, and Browse.
First use explains selected signals and asks for explicit consent. Cards show
one or two reason strings, not a raw score. Join policies render Join, Request
to join, or Accept invitation, with accessible pending/success/error states;
Dismiss and Leave are explicit.

Before joining, explain who can see membership and posts. Nonmembers see only
metadata/aggregate counts. Members get a private discussion feed; moderators
get bounded member-request/content tools; platform-admin escalation remains
separate. Defer group chat and push/email claims until those primitives exist.
Keep the existing five-item mobile navigation intact; expose Groups through a
Farmer-only secondary path or a deliberate Connections/Groups hub.

Update privacy, community rules, data deletion, and analytics event constraints
without recording reason/profile values in analytics metadata.

### 6. Deploy a separate scheduled matching Worker

**Files:** new `workers/group-matcher/src/index.ts`,
`workers/group-matcher/wrangler.jsonc`, `workers/group-matcher/tsconfig.json`,
Worker tests and root scripts

Deploy a separate non-HTTP Worker. Do not add privileged matching handlers or
the service credential to the public Vinext Worker. Store only
`SUPABASE_URL`/algorithm settings as non-secret variables and configure the
Supabase service credential as an encrypted Worker Secret or Secrets Store
binding. The worker logs run/item IDs and bounded error codes, never credentials
or raw profile signals.

The pilot uses one UTC Cron and bounded set-based RPCs:

```ts
export default {
  async scheduled(controller, env) {
    const runKey = scheduledRunKey(controller.scheduledTime, env.ALGORITHM_VERSION);
    await startOrResumeMatchRun(env, runKey);
    await processBoundedMatchItems(env, runKey);
  },
};
```

Database triggers upsert affected profile/group IDs into durable match items.
The scheduled worker claims them with `FOR UPDATE SKIP LOCKED`, leases bounded
batches, processes atomically, retries transient faults with backoff, recovers
expired leases, and reconciles all eligible profiles nightly. It sleeps while
idle; nothing needs to run or bill continuously.

Add Cloudflare Queue + dead-letter queue only when population/latency exceeds a
single bounded Worker/RPC window. Queue messages carry opaque item/run/version
IDs and the database remains the idempotency/source-of-truth layer because
delivery can repeat or arrive out of order. Add Workflows/Agents SDK only for
future long-running AI stages, real-time progress, or human approval waits—not
for deterministic matching.

### 7. Add optional, budgeted AI enrichment

**Files:** later Worker AI adapter, administrator review UI

No AI subscription is required for Release B. Behind a disabled-by-default
feature flag, a Workers AI binding may propose crop aliases/translations,
generate localized group descriptions from approved tags, or summarize group
posts with source links. Send no identities/contact/private profile text;
validate structured output, cache by hash, cap calls per run/day, and require
human approval for taxonomy or moderation changes.

AI never changes eligibility, score, membership/access, leadership, bans, or
the stored deterministic explanation. Disabling AI must leave recommendations
bit-for-bit equivalent.

### 8. Verify and stage the release

Add pure score/normalization/reason tests; real local Supabase RLS and RPC tests
for anon/non-Farmer/nonmember/pending/member/moderator/owner/blocked/suspended/
platform-admin cases; Worker cron/idempotency/retry/lease/secret/log tests; and
multi-user desktop/mobile Playwright coverage for consent, recommendations,
dismiss/accept, open/approval join, private posts, moderation, and deletion.

Required failure tests include duplicate schedules, response timeout after DB
commit, consent revoked after enqueue, profile/group changed concurrently,
algorithm-version overlap, last-owner deletion, direct role escalation,
cross-group/private-media reads, and proof that matcher code has no membership
activation path.

Run focused tests continuously, then typecheck, full `npm run check`, local
Supabase integration tests, Worker dry-run/tests, and multi-user browser tests.
Deploy migrations, UI, and matcher separately with independent rollback. Start
with AI disabled and an empty honest group state until real opted-in Farmers
meet thresholds.

### Rollback

Disable the matching Cron and group navigation first. Keep additive tables and
consent/audit history in place, expire recommendations, and deny new joins/
posts through a feature flag or forward policy migration. Existing memberships
remain inaccessible until restored; do not destructively delete audit,
consent, or user-authored content. Roll back the public Worker and matcher
Worker independently.

### TODO checklist

- [x] Deeply audit existing profile, network, post, message, moderation,
      deletion, and Worker capabilities; document `research.md`.
- [x] Define the deterministic matching boundary, consent, privacy, background
      runtime, AI boundary, and current cost approach.
- [ ] User reviews and explicitly approves this Farmer-groups addendum.
- [ ] Complete and deploy the production data-integrity release first.
- [ ] Add canonical profile signals and language preservation.
- [ ] Add group/recommendation/content schema, RLS, private media, and RPCs.
- [ ] Implement deterministic matching and explainable reasons.
- [ ] Build the Farmer group hub, detail, management, and discussion surfaces.
- [ ] Build/test/deploy the separate scheduled matching Worker with AI off.
- [ ] Pass SQL, unit, Worker, typecheck/build, and multi-user browser gates.
- [ ] Run an opt-in pilot, inspect match quality/cost/errors, then decide whether
      optional AI enrichment is justified.

## Addendum: Production agriculture ecosystem, company onboarding, and 23-locale interface

### Purpose and observable outcome

After this addendum is complete, a new participant can choose a language before
entering personal details, explicitly join as a Farmer, Customer, Wholesaler,
or agricultural-business representative, leave onboarding, and resume on the
same or another device. Farmers can select a searchable curated hierarchy that
includes poultry, fisheries, aquaculture, seafood, livestock, protected
cultivation, and allied activities, or submit a bounded custom activity. A
tractor company, tool company, input supplier, logistics provider, financial
provider, adviser, or other relevant organization can create a public company
page, publish a dated product/service/rental/promotion offer, and manage private
enquiries. Farmers, Customers, and Wholesalers can browse those companies and
offers without losing the existing produce marketplace.

Every application route uses a real localization system covering English plus
the 22 Eighth Schedule languages. Locale selection persists, the document
language and direction are correct, dates/numbers/currency/units are formatted
for the locale, right-to-left layouts work, and user-authored text remains in
its original language. A locale is production-verified only after catalog
coverage tests and human review of agricultural, safety, verification, and
legal terminology.

The change is complete only when configured production paths never substitute
fictional records, a clean database applies every migration, real database
authorization tests pass for anonymous and every account/organization role,
desktop/mobile browser journeys pass, the production build passes, and the
release runbook identifies every external credential or operational gate. This
plan does not add checkout, payment custody, shipment fulfillment, government
benefit eligibility, or automatic translation; offers and produce enquiries
remain direct leads.

### Release order and relationship to earlier addenda

This program has three independently reversible releases. Release A completes
the existing “Production data integrity and full-site deployment” addendum:
fictional market data moves to a labeled read-only demo route, live loaders fail
closed, invented metrics and overstated verification claims disappear, the
anonymous listing-policy repair is verified, and the unfinished public Farmer
profile tests pass. Release A establishes the honest baseline and must land
before new public company inventory.

Release B adds locale, taxonomy, capability, and resumable-onboarding contracts
behind disabled-by-default feature flags. Release C adds organizations, offers,
shared enquiries, public discovery, moderation, and remaining operational
hardening. The earlier Farmer-groups addendum becomes Release D and must consume
the canonical categories and confirmed locale instead of introducing a second
crop/language normalization system. Group work is not a prerequisite for this
addendum.

No live database migration or Cloudflare deployment occurs merely because this
written plan is approved. Plan approval authorizes local implementation and
verification. Before the first production mutation, present the exact migration
list, generated Worker configuration, dry-run output, backup/rollback evidence,
and current deployment version for a separate release approval.

### Non-negotiable constraints

- Preserve the current dirty worktree. Do not reset, checkout, stash, delete,
  overwrite, or rewrite existing migrations and untracked marketplace work.
- Use only forward migrations newer than
  `supabase/migrations/20260807110000_public_farmer_profiles.sql`.
- Keep legacy `participant_type`, `account_role`, `crops`,
  `produce_listings.farmer_id`, current enquiry/review links, and public URLs
  readable throughout the rollout.
- Every browser-exposed table enables Row Level Security before grants. Revoke
  defaults, use explicit column grants, and revoke default function execution.
- Public company/profile rows never expose private registration data, private
  contacts, verification evidence, enquiry contents, or storage paths.
- An account role is a primary identity, not the full authorization model.
  Named capability helpers must drive shell navigation, server actions, and
  database policies.
- A Farmer or Wholesaler may source/buy without changing primary role. A
  Customer cannot publish produce. Only authorized organization members can
  publish or manage organization offers.
- Keep canonical categories and translated display labels separate. A locale
  change must never change stored category identity.
- Custom category text is user content. It does not become a global filter,
  alias, or trusted FarmerBook category until reviewed.
- Keep Organic/Natural/Conventional/Mixed as farming methods, not activity
  categories.
- Keep aquaculture distinct from capture fisheries and keep seafood as a
  commercial family rather than claiming every seafood activity is farming.
- Do not automatically translate or overwrite user-authored content.
- Do not return raw Supabase, OAuth, storage, or database messages to users.
- No unverified seller-entered string may render as a FarmerBook-verified
  certification or purchase claim.
- Company-offer enquiries require an active signed-in participant in the first
  release. Existing anonymous produce enquiries must pass bot/rate/privacy
  controls before remaining enabled in production.
- New dashboards show durable record-derived values or honest empty states,
  never invented trends, members, inventory, reviews, response times, or reach.
- The application must remain useful with all optional AI providers disabled.

### Context and orientation

`app/` contains Next.js App Router pages and layouts. `features/` contains
validation, server actions, database queries, and client components.
`lib/types.ts` and `lib/data-mappers.ts` are the current handwritten domain
boundary. `supabase/migrations/` contains ordered PostgreSQL schema, functions,
grants, and policies. Browser code uses the Supabase publishable key, so RLS is
the final authorization boundary. `proxy.ts` refreshes the session and protects
non-public routes. Vinext builds the application into a Cloudflare Worker whose
entry point is `worker/index.ts` and whose current environment configuration is
assembled in `vite.config.ts`.

The current onboarding implementation is
`features/profiles/onboarding-form.tsx`, with one final action in
`features/profiles/actions.ts`. The current produce marketplace is
`features/marketplace/` with public routes under `app/marketplace/`, an
authenticated browser at `app/(product)/market/`, and the Farmer/Wholesaler
dashboard at `app/(product)/business/`. The two existing i18n files are unused
stubs. Full evidence and file/line references are in the final section of
`research.md`.

### Milestone 0: establish the honest reproducible baseline

First execute Release A exactly as described by the production-data-integrity
addendum. The resulting configured application shows real records, an honest
empty state, or a bounded retryable error; it never shows fixtures. The explicit
demo market remains available only at `/marketplace/demo`, visibly says every
record is fictional, is `noindex`, and exposes no live save, detail, enquiry,
review, purchase, or storefront action.

In addition to the existing Release A files, correct reproducibility and trust
gaps in these paths:

- Fix `supabase/seed.sql` so a completed Farmer always has a valid farming
  method, and add deterministic, clearly fictional local identities without
  touching production.
- Remove live Supabase defaults from `vite.config.ts`. Local, staging, and
  production project URLs/keys must come from their environments. Demo mode
  becomes an explicit non-production flag rather than the absence of secrets.
- Update `lib/env.ts`, `.env.example`, `README.md`, and the generated Worker
  config checks so a production origin cannot silently enter unrestricted demo
  or demo-admin mode.
- Replace seller-entered “Verified farm”, “Residue-tested”, and “Lot traceable”
  UI choices with clearly labeled self-declared practices until a reviewed
  `certification_claims` record exists. Rename “Verified purchase” to an honest
  phrase such as “Seller-confirmed completed enquiry” until transaction evidence
  exists.
- Revoke broad listing INSERT and grant only owner-editable fields; counters,
  ownership, moderation, and protected status remain server/database controlled.
- Complete the existing public Farmer profile test/deployment TODO before using
  profile pages as an organization pattern.

Run focused tests after every change, then `npm run check` and the existing
desktop/mobile Playwright suite. Record the new passing count in
`implementation-log.md`. Acceptance is observable by configuring an empty
database: `/marketplace` shows zero real listings and no fictional names, while
`/marketplace/demo` remains explicitly fictional and read-only.

### Milestone 1: add forward-only locale, taxonomy, capability, and draft contracts

Create one additive migration, for example
`supabase/migrations/20260809120000_agriculture_ecosystem_foundation.sql`.
Do not edit the previous migrations. The migration introduces locale and
taxonomy reference data, an owner-only onboarding draft, a fourth primary role,
and capability functions while leaving existing rows and columns intact.

Add these TypeScript/data modules:

- `lib/i18n/locales.ts` for the typed locale registry and direction.
- `lib/agriculture/categories.ts` for stable category slugs, parent slugs,
  domain, translation keys, selectable state, and sort order.
- `lib/agriculture/company-sectors.ts` for tractor/tools/inputs/services
  sectors and high-risk moderation flags.
- `lib/agriculture/normalization.ts` for bounded Unicode normalization of
  custom labels; it must preserve original text.
- `features/onboarding/types.ts` for versioned step data and action results.
- `features/auth/capabilities.ts` for application helpers mirroring database
  authorization names.

The locale registry is exactly:

```ts
export const supportedLocales = [
  "en-IN", "as-IN", "bn-IN", "brx-IN", "doi-IN", "gu-IN", "hi-IN",
  "kn-IN", "ks-Arab-IN", "kok-Deva-IN", "mai-IN", "ml-IN",
  "mni-Mtei-IN", "mr-IN", "ne-IN", "or-IN", "pa-Guru-IN",
  "sa-IN", "sat-Olck-IN", "sd-Arab-IN", "ta-IN", "te-IN", "ur-IN",
] as const;

export type AppLocale = (typeof supportedLocales)[number];
export const rtlLocales = new Set<AppLocale>([
  "ks-Arab-IN", "sd-Arab-IN", "ur-IN",
]);
```

The database stores the same tags in `supported_locales`, including native and
English names, direction, enabled state, and human-review status. Add
`profiles.preferred_locale` with a foreign key after seeding the registry;
backfill `en -> en-IN`, `hi -> hi-IN`, and `mr -> mr-IN`. Keep
`preferred_language` for compatibility during this program.

The taxonomy schema is intentionally small and stable:

```sql
create table public.agriculture_categories (
  slug text primary key,
  parent_slug text references public.agriculture_categories(slug),
  domain text not null check (domain in (
    'farming_activity', 'commodity', 'business_sector', 'offer_category'
  )),
  translation_key text not null unique,
  selectable boolean not null default true,
  sort_order integer not null,
  status text not null default 'active'
    check (status in ('active', 'retired'))
);

create table public.profile_category_affinities (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category_slug text not null references public.agriculture_categories(slug),
  relationship text not null check (relationship in (
    'grows', 'raises', 'farms', 'catches', 'processes',
    'buys', 'sells', 'supplies', 'services', 'interested_in'
  )),
  is_primary boolean not null default false,
  primary key (profile_id, category_slug, relationship)
);
```

Seed the complete curated tree from `lib/agriculture/categories.ts` with stable
slugs. At minimum it contains every family and child listed in the associated
research checkpoint: field/horticulture/specialized crops; dairy and livestock;
all named poultry types; freshwater, brackish and marine aquaculture; inland and
marine capture; shrimp/prawn, crab/lobster, shellfish, seaweed, ornamental fish,
and hatchery; beekeeping, sericulture, lac, agroforestry, compost, value
addition, and integrated farming. Add a test proving expected slugs and parents.

Create `custom_category_requests` and
`profile_custom_category_affinities`. Keep original label, locale, a bounded
normalized comparison label, domain, relationship, owner, moderation status,
optional promoted slug, timestamps, and moderator audit metadata. Enforce two to
80 visible characters, no controls or bidi-control abuse, a small per-profile
pending limit, and normalized duplicate rejection. URLs, phone numbers, handles,
and advertising copy fail validation. Pending values appear only to their owner
and in administrator review; approved owner labels may appear on that profile,
but only promoted canonical categories enter global filters.

Create `onboarding_progress` with `profile_id` primary key, flow version,
current step, completed-step identifiers, bounded validated `draft_data jsonb`,
an integer revision for optimistic concurrency, and timestamps. Enforce a 32 KB
maximum and owner-only select/insert/update/delete. The JSON is a resumable draft,
not the final domain source of truth.

Extend the profile role checks with `agri_business`, including the legacy
participant compatibility value, but replace scattered authorization with
capability helpers. Database helpers use `SECURITY DEFINER`, an empty search
path, schema-qualified references, revoked default execution, and explicit
grants. Application helpers must share the names:

```ts
canPublishProduce(role) // farmer or wholesaler
canSource(role)         // every active, completed role
canManageOrganization(membershipRole) // owner/admin/editor as appropriate
canRespondToOrganizationEnquiries(membershipRole) // owner/admin/enquiry_agent
```

Update `lib/types.ts`, `lib/data-mappers.ts`,
`features/profiles/queries.ts`, `features/auth/require-user.ts`, schema tests,
and RLS tests only through the primary integrator after the new isolated modules
land. `ParticipantProfile` gains `preferredLocale` and normalized affinities.
Existing `crops` remains a compatibility display fallback until backfill and
dual-read tests pass.

Backfill exact known crop strings case-insensitively. Unknown strings become
owner-associated custom requests with their original value preserved. The
migration must be idempotent, report mapped/unmapped counts, and never drop or
rewrite `crops`.

### Milestone 2: wire the complete localization system

Replace the unused `lib/i18n/en.ts` and `hi.ts` stubs with a typed, namespaced
catalog under `lib/i18n/messages/`. Use namespaces such as `common`, `auth`,
`onboarding`, `profile`, `community`, `market`, `companies`, `moderation`,
`errors`, and `legal`. English defines the canonical key/value/interpolation
shape; every enabled locale supplies the same keys. Do not use HTML strings in
catalog values.

Create:

- `lib/i18n/get-request-locale.ts` to parse the locale cookie and
  `Accept-Language` safely.
- `lib/i18n/get-messages.ts` with a static lazy-loader registry so Vinext can
  build per-locale chunks.
- `lib/i18n/translate.ts` for key lookup and safe named interpolation.
- `lib/i18n/format.ts` around `Intl.DateTimeFormat`,
  `Intl.RelativeTimeFormat`, `Intl.NumberFormat`, `Intl.ListFormat`, and unit
  labels.
- `components/locale-provider.tsx` for client components.
- `components/language-selector.tsx` and
  `features/profiles/locale-actions.ts` for cookie/profile persistence.
- `tests/i18n-catalogs.test.ts` and `tests/i18n-format.test.ts` for key parity,
  nonempty strings, interpolation parity, locale parsing, direction, and
  representative formatting.

Use stable URLs in this release to avoid moving every high-conflict App Router
file below a locale segment. Locale resolution is: explicit language-selector
submission, secure SameSite `fb_locale` cookie, authenticated
`preferred_locale` synchronized during auth callback/product layout, supported
`Accept-Language`, then `en-IN`. The selector sets the cookie and updates the
profile when authenticated. `app/auth/callback/route.ts` restores the bounded
destination and locale. `app/layout.tsx` resolves before render and sets both
`<html lang>` and `dir`, preventing hydration mismatch.

Pass only the route's namespaces into client providers. Server components call
the request translator directly. A missing noncritical key falls back to
English and emits a privacy-safe key/locale warning; auth, onboarding, safety,
verification, marketplace, and legal namespaces fail CI if any enabled locale
uses fallback, placeholder English, or an empty value.

Inventory and replace all hard-coded visible copy across `app/`, `components/`,
and `features/`, including metadata, navigation, labels, helpers, empty/loading/
error states, dialogs, moderation, policies, and uploads. Change Zod/server
action results to stable codes and field maps rather than translated/raw
strings:

```ts
type ActionError = {
  code: "validation.invalid" | "auth.required" | "conflict.handle" |
        "permission.denied" | "service.unavailable";
  fieldErrors?: Record<string, string>;
};
```

Components translate codes at render time. Underlying errors are logged with a
correlation identifier, never contact data, message bodies, or secrets.

Replace preformatted English domain labels with raw dates/timestamps where
necessary. New listings/offers use ISO date columns. Render money as INR by
default with `Intl.NumberFormat`, dates with request locale, relative time with
`Intl.RelativeTimeFormat`, and units through translated unit keys. Render
user-authored biography/post/message/listing/offer/custom text with its language
tag and `dir="auto"`; never silently translate it.

Convert physical CSS that affects direction to logical properties, including
left/right padding, borders, offsets, and text alignment. Do not apply forced
uppercase or tight letter spacing to Indic/Arabic-script text. Add and license
locally hosted Noto font subsets needed for Devanagari, Bengali/Assamese,
Gujarati, Gurmukhi, Odia, Tamil, Telugu, Kannada, Malayalam, Arabic-derived
scripts, Meitei Mayek, and Ol Chiki, with system fallbacks. Verify fonts are
loaded from FarmerBook assets, not a third-party runtime request.

Translation work is not considered production complete merely because an
agent filled every key. Maintain `lib/i18n/review-status.ts` with reviewer,
date, catalog hash, and status. The release gate requires human review of
agricultural categories, safety/reporting, verification/certification,
enquiry/privacy, account deletion, and legal copy. Locales without that evidence
are visibly marked beta and cannot be described as production-verified.

### Milestone 3: build resumable, role-aware onboarding

Create `features/onboarding/` and keep
`features/profiles/onboarding-form.tsx` as a compatibility wrapper until the new
journeys pass. Split steps into isolated components so field validation,
translation, and focus behavior are testable. Use one explicit radio group for
the primary role; do not preselect Farmer just because the incomplete database
row defaults to Farmer.

The version-one flow is:

1. Language. It is available before any personal data and changing it preserves
   current draft/step.
2. Primary participation: Farmer, Customer, Wholesaler, or Agricultural
   business. Explain that every active participant may buy/source, while
   publishing rights differ.
3. Identity and location: display name or representative name, ASCII public
   handle, state/Union Territory from a curated list, district, and optional
   photo. Company creation collects its public name later, not in a person's
   name field.
4. Agriculture activities/interests: a searchable hierarchical picker with
   translated labels, selected stable slugs, role-specific relationship, and
   “Other — define my own” with the safe custom workflow.
5. Role details: Farmer method/experience; Wholesaler supply/procurement focus;
   Customer sourcing interests; or organization identity, company sector,
   service areas, and public-contact consent.
6. Review and visibility: show exactly which profile/company fields become
   public, require relevant terms/privacy acknowledgement, and finish through
   one idempotent transaction.

Each Next/Back transition validates the current step client-side and then calls
`saveOnboardingStepAction`. The action authenticates with `allowIncomplete`,
validates a step-specific Zod discriminated union, checks the supplied revision,
and upserts only bounded draft data. It returns the new revision and stable
error codes. Refresh or another device loads `onboarding_progress` and resumes
the last valid step. Conflicting revisions show a choice to reload the newer
server draft; they never silently overwrite it.

`finalize_onboarding` is a locked database RPC. It derives `auth.uid()`, locks
the profile/draft, checks flow version and revision, revalidates required
relationships, writes profile and affinities, creates the organization plus
initial owner membership when applicable, marks onboarding complete, archives
or deletes the draft, and emits `profile_completed` exactly once. Repeated
requests with the same idempotency key return the same success. A failure rolls
back everything, leaving the draft resumable.

Accessibility requirements are part of implementation, not a later polish:

- ordered progress with `aria-current="step"` and a polite step announcement;
- focus the new step heading after navigation;
- native radio/checkbox/combobox semantics and visible non-color selection;
- translated inline errors with `aria-invalid`/`aria-describedby` plus a
  focusable error summary that returns the user to the failing step;
- at least 44×44 CSS-pixel targets, keyboard operation, 200% zoom, and no
  horizontal overflow at 320 px;
- recoverable pending/saved/offline states and no duplicated completion;
- optional fields have explicit Skip, and Back never destroys saved data.

After completion, update `features/profiles/profile-settings-form.tsx` to reuse
the same category picker and locale selector. Primary role stays locked; public
activity/custom selections remain editable under the same validation. Discover
and profile filters use canonical slugs with a legacy-string fallback during
the transition.

### Milestone 4: add organizations, membership, and verification boundaries

Create a second forward migration, for example
`supabase/migrations/20260809130000_agriculture_organizations_and_offers.sql`.
Add these core tables:

```text
organizations
organization_memberships
organization_category_affinities
organization_service_areas
organization_private_details
organization_verification_requests
certification_claims
```

`organizations` stores a stable slug, display name, organization type,
description, coarse state/district, website, publication state, verification
state, moderation state, and timestamps. Organization types are a bounded enum:
manufacturer/brand, dealer/distributor, retailer, wholesaler/trader,
processor/exporter, FPO/cooperative, custom-hiring/rental centre,
logistics/warehouse, finance/insurance, advisory/training/research, NGO, and
government/support body. Fine-grained sectors come from taxonomy rather than an
ever-growing role enum.

`organization_memberships` has owner, admin, editor, enquiry-agent, and viewer
roles plus invited/active/suspended/removed state. Company onboarding creates
the organization and initial owner atomically. Only owner/admin can invite or
change members; no user can self-promote; the last owner cannot leave or be
removed until ownership transfers. Member changes write immutable audit rows.

Registration type/number, GSTIN/CIN where used, private contact points,
verification notes, and document paths live in
`organization_private_details`/verification tables, never the public
organization row. Documents use a private bucket with `<organization>/<file>`
paths, explicit MIME/size limits, owner/admin write, reviewer read, no anonymous
grant, and cleanup on replacement. Do not collect verification evidence until
the privacy/retention/delete text is implemented.

`can_manage_organization(org_id, minimum_role)` and
`can_respond_to_organization_enquiry(org_id)` derive the actor from
`auth.uid()`. Public users see only active, published organization columns.
Authenticated outsiders get the same public view. Suspended organizations or
members lose access immediately. Verification, publication, and moderation are
separate states: a verified organization does not automatically validate every
offer or claim.

Create `features/organizations/` with types, schemas, queries, actions,
organization onboarding fields, public cards/page, settings, membership, and
administrator review. Add public routes `/companies` and
`/companies/[slug]`, authenticated `/company`, and admin review routes. Update
`proxy.ts`, public/product headers, shell, footer, sitemap, and policy pages.

The first UI supports one organization created during onboarding plus owner
management. Membership tables and authorization ship from day one so a shared
inbox does not later depend on one employee's private account, but invitation
UX may remain behind the organization feature flag until its full tests pass.

### Milestone 5: add company offers, discovery, and shared enquiries

Keep `produce_listings` and its existing URL/review relationships. Add:

```text
business_offers
business_offer_categories
business_offer_service_areas
business_offer_media
business_offer_enquiries
business_offer_enquiry_events
business_offer_enquiry_assignments
```

An offer belongs to one organization and has a product/service/rental/
promotion/finance/insurance/advisory/training/support kind, canonical categories,
title, original content locale, description, terms, price model
(fixed/range/quote/free/subsidized), INR amounts when applicable, real
`date`/`timestamptz` validity, service states/districts/radius, publication,
moderation and expiry states, and timestamps. Use real units for equipment,
liquids, trays/dozens, time/rental, land area, and quote-only services; never
compare unlike units as one number.

The prepopulated company/offer tree includes tractors and farm vehicles; large
machinery; tillers/sprayers/pumps/drones; hand tools/implements/spares; rental/
custom hiring/repair; seeds/nurseries; fertilizer/bio-inputs/crop protection;
irrigation/water/solar; dairy/livestock/poultry/aquaculture feed, equipment and
health; packaging/grading/cold chain/warehousing/logistics/processing; soil/
water/residue testing and certification; agronomy/training/weather/software;
finance/credit/insurance; buyers/processors/exporters/retail; renewable energy;
government/NGO/FPO support; and Other/custom.

Offer media uses a private `offer-images` bucket plus signed public-display URLs
for active offers. Enforce JPEG/PNG/WebP, five MB, owner organization folder,
alt text, replacement cleanup, and safe category-icon fallback. Do not reuse a
tomato image for unknown categories.

Create `features/offers/` with discriminated Zod schemas, queries, protected
actions, public cards/detail, create/edit/status forms, shared enquiry timeline,
and organization dashboard. Add `/offers/[offerId]` and integrate result tabs
into `/marketplace`: Produce, Equipment & inputs, Services & support, Offers,
and Companies. Preserve `/marketplace/[listingId]` and `/store/[handle]`.

All filters initialize from and persist to bounded URL search parameters. Query
Supabase server-side with indexed category, state, organization, kind,
publication/expiry, and normalized-search fields. Use cursor pagination on
`(published_at, id)` rather than downloading a hard-coded 100 rows. The shared
result type is discriminated:

```ts
type MarketResult =
  | { kind: "produce"; listing: ProduceListing }
  | { kind: "offer"; offer: BusinessOffer }
  | { kind: "organization"; organization: OrganizationSummary };
```

An authenticated participant can submit an offer enquiry even when their
primary role is Farmer or Wholesaler. A locked `connect_to_business_offer` RPC
verifies active participant, active/published/unexpired offer, organization and
block state, prevents contacting one's own organization, creates one idempotent
enquiry with an immutable offer snapshot, and writes the first enquiry event.
The requester and authorized organization enquiry agents alone can read the
thread. Assignment/status changes are auditable. Organization enquiries do not
appear in or expose private one-to-one DMs.

Extend reports and moderation to organization, offer, produce listing, and
certification claim. Move moderation state changes and their audit insert into
one transaction/RPC; the current profile moderation action can otherwise leave
an unaudited state if the second insert fails. High-risk finance/insurance,
pesticide, veterinary, or regulated claims require review before publication
and show required disclaimers. General unverified businesses may publish
ordinary offers but are clearly labeled unverified and cannot use verification
badges.

### Milestone 6: finish security, privacy, accessibility, SEO, and operations

Use the `turnstile-spin` skill during implementation to add Cloudflare
Turnstile to signup and any retained anonymous produce-enquiry path. Verify the
token server-side with bounded timeouts and expected hostname/action. Direct
database anonymous inserts must not bypass the control: route them through a
bounded server/RPC boundary or remove the anonymous grant. Add per-target and
per-origin/account throttles, idempotency keys, duplicate suppression, and
privacy-safe abuse events. Signed-in organization enquiries still receive
account/target throttles.

Map every public error to a stable code, check affected-row counts after
updates, and return conflict/unavailable rather than false success. Add request
correlation IDs and structured logs that exclude contact values, message text,
tokens, URLs with secrets, and verification documents. Add `app/error.tsx`,
`app/global-error.tsx`, route `loading.tsx` boundaries, honest empty/retry
states, and a minimal `/api/health` response containing no database details.

Set production security headers in `worker/index.ts` or the verified supported
configuration: Content-Security-Policy compatible with Supabase and Turnstile,
HSTS on HTTPS, `X-Content-Type-Options`, `Referrer-Policy`, frame restrictions,
and a narrow `Permissions-Policy`. Test OAuth, image optimization, signed media,
and Turnstile under the policy before release.

Add `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts`, canonical metadata,
localized titles/descriptions, and valid Organization/Offer/Product JSON-LD
without private contacts or false ratings. Beta/local-cookie languages share
the canonical URL in this release; locale-prefixed/hreflang URLs are a future
SEO project, not a hidden route-tree rewrite.

Correct account export/deletion and policy text. Deletion must either actually
remove/schedule Auth, media, memberships, private enquiry/contact data, and
organization ownership transfer/archive, or describe precisely what remains
and for how long. Replace `.example` contact details with configured operational
contacts. Define enquiry, verification-document, moderation-audit, and log
retention plus a data-deletion request path.

Fix dialog focus trap, initial focus, Escape, background inertness, scroll lock,
and focus restoration. Add a skip link, 44px controls, error live regions,
logical CSS, 200% zoom support, reduced motion, long-translation wrapping, and
no hidden essential filters. Test at 320/360/390/768/1024/1280/1440 widths.

Separate local/staging/production Supabase projects and secrets. Update
`.github/workflows/ci.yml` so a clean checkout runs lint, typecheck, unit tests,
build, migration apply/seed, real database authorization tests, and a bounded
browser smoke suite. Document transactional email, named moderation ownership,
backup frequency, restore drill, incident contact, release rollback, and live
smoke checks in `README.md` and a new `docs/PRODUCTION_RUNBOOK.md`.

### Test strategy and continuous checkpoints

The domain/data subagent adds migration and real authorization tests before UI
integration. The localization subagent adds catalog/format/direction tests
before components consume the API. The marketplace subagent adds organization/
offer modules and focused tests after the data contract lands. The primary
agent runs typecheck after every cross-domain integration and owns shared E2E,
CSS, shell, profile, and existing marketplace changes.

Add or extend these suites:

- `tests/i18n-catalogs.test.ts`, `tests/i18n-format.test.ts`, and component tests
  for selector persistence, document `lang`/`dir`, stable errors, long strings,
  RTL, and `dir="auto"` authored content.
- `tests/agriculture-categories.test.ts` for hierarchy, required poultry/
  aquaculture/seafood/allied slugs, stable translations, custom normalization,
  controls/URL/phone rejection, duplicate behavior, and legacy backfill.
- `tests/onboarding.test.tsx` for explicit role selection, per-step validation,
  focus/errors, revision conflicts, locale switches, and draft resume.
- `tests/organization-schemas.test.ts`, `tests/offer-schemas.test.ts`, component
  tests for company onboarding, service areas, sectors, price models, expiry,
  media, high-risk moderation, shared enquiries, and honest empty states.
- Extend `tests/rls-migration.test.ts` as a cheap static guard, but add executable
  tests under `supabase/tests/` for anonymous, incomplete, Farmer, Customer,
  Wholesaler, business owner/admin/editor/enquiry-agent/viewer, outsider,
  suspended member, moderator, and service role.
- Add query/action tests for capability checks, zero-row detection, raw-error
  suppression, idempotency, pagination, expiry, blocked/self contact, and demo
  isolation.
- Extend `tests/e2e/demo-journeys.spec.ts` only for explicit demo behavior; add
  configured multi-user Playwright journeys backed by a local/staging Supabase
  project so RLS and persistence are exercised.
- Add `@axe-core/playwright` checks for core public/auth/onboarding/market/
  company/offer/admin pages and keyboard-specific dialog/combobox tests.

Required behavioral journeys are:

1. A Farmer selects poultry plus one custom category, leaves after a saved
   step, signs back in, resumes, reviews visibility, and completes exactly once.
2. An aquaculture participant selects freshwater fish plus shrimp/seafood and
   retains stable category slugs after switching language.
3. Customer and Wholesaler journeys render only relevant fields and both can
   source/contact without role mutation; only the Wholesaler can publish
   produce.
4. A tractor-company owner creates an organization, selects tractor sale/rental
   sectors and service states, publishes an offer, and sees it on the company
   page and filtered market.
5. A tool company publishes a tool/rental promotion with real validity; it
   disappears after expiry without hiding the company.
6. A Farmer submits a signed-in offer enquiry; an authorized enquiry agent can
   read/reply/assign, while an outsider/viewer cannot.
7. Company/offer/report moderation is transactional and badges distinguish
   self-declared, verified organization, and reviewed claim.
8. Switching locale mid-onboarding preserves every draft field; the preference
   persists across refresh and auth callback.
9. All 23 locales smoke-render public header, auth, onboarding, app shell,
   market, company, offer, settings, safety, privacy, and error states. Full
   functional runs cover English, Hindi, Bengali/Assamese, Tamil, Telugu,
   Malayalam, Meitei Mayek, Ol Chiki, Urdu, and Kashmiri/Sindhi RTL.
10. Configured empty/error marketplace and company loaders never return fixture
    IDs or sample reviews; only `/marketplace/demo` contains fictional inventory.

At the end of every milestone run the focused test files, `npm run typecheck`,
and `npm run lint`. Before release run, from
`/Users/ngonapa/Downloads/farmerbook`:

```sh
npm run check
npm run test:e2e
supabase db reset
supabase test db
npm run test:e2e:configured
```

Expected evidence is zero lint/type errors, all Vitest/SQL/Playwright tests
passing, an applied idempotent seed, no unauthorized row access in the RLS
matrix, no horizontal overflow or critical axe violations, and a complete
Vinext build. If the Supabase CLI or configured test project is unavailable,
local code work may continue, but production readiness remains explicitly
blocked; do not replace real RLS tests with text assertions.

### Production release gate

Before applying any live migration:

1. Confirm whether every existing untracked migration is already applied and
   record its checksum and remote migration state.
2. Obtain a current logical backup or provider-supported backup and prove a
   restore in staging.
3. Apply all new migrations to an empty local database and a copy of production
   data; compare profile/listing/enquiry/review/custom/organization/offer counts.
4. Run the full real RLS matrix and configured browser suite against staging.
5. Mark every enabled locale catalog with its review evidence; visibly beta or
   disable any locale that lacks the required human review.
6. Verify custom SMTP, Turnstile keys/hostnames, Supabase project separation,
   service-role/verification storage secrets, operational contact, moderator,
   retention, backup, and alerting configuration.
7. Run `wrangler deploy --dry-run` against the generated configuration, inspect
   variables/bindings/routes, and prove no service secret is embedded in source
   or public variables.
8. Present the migration list, dry-run, backup/restore evidence, test transcript,
   current Worker version, and rollback commands for explicit release approval.

After approval, deploy Release A, then B, then C independently. Verify custom
domains and workers.dev; anonymous/live Supabase endpoints; Google/Facebook
redirects; every public/authenticated/admin route; all 23 locale smoke pages;
desktop/mobile/RTL layouts; company/offer publish and enquiry; logs/health;
and absence of demo content on live routes. Record Worker version IDs and
evidence in `.structured-dev-state` and `implementation-log.md`.

### Idempotence, rollback, and recovery

All catalog seeds use stable keys and `ON CONFLICT`. Draft saves use revisions
and idempotency keys. Organization creation and onboarding finalization are
transactional. Offer publication/status/enquiry updates check affected rows and
can be retried safely. Backfills preserve original free text and record counts.

Feature flags default off in configured production:

```text
ENABLE_CANONICAL_AGRICULTURE_TAXONOMY
ENABLE_RESUMABLE_ONBOARDING
ENABLE_AGRI_BUSINESSES
ENABLE_BUSINESS_OFFERS
ENABLE_EXTENDED_LOCALES
```

Emergency application rollback disables the affected navigation/actions,
restores English fallback or the legacy onboarding/produce view, and rolls the
Worker back to the last recorded healthy version. Additive tables, columns,
locale/category identities, drafts, memberships, consent, enquiries, and audit
rows remain in place; do not drop them during an incident. If a policy is wrong,
ship a corrective forward migration that denies unsafe access. Release A, B,
and C Worker versions can roll back independently, but live schema changes are
always forward-corrected.

If implementation reveals that Vinext cannot safely lazy-load locale catalogs,
set request `lang`/`dir`, or apply required security headers, stop that milestone
and return to planning with a focused reproducible spike. Do not patch around a
runtime incompatibility by exposing all translations/secrets or weakening CSP.

### Assigned subagent work and merge discipline

After explicit plan approval, use the same three subagent workstreams plus the
primary integrator:

- The domain/data subagent owns only new forward migrations, new agriculture/
  capability modules, seed/backfill logic, RLS/RPC definitions, and database
  tests. It does not edit onboarding UI, shell, CSS, or existing marketplace
  components.
- The localization subagent owns `lib/i18n/`, the locale provider/selector,
  font/license assets, catalog/format tests, and a hard-coded-copy inventory. It
  does not edit shared dirty pages until the primary integrator asks for a
  bounded file.
- The marketplace/quality subagent owns new `features/organizations/`,
  `features/offers/`, new public/company/offer routes, focused schemas/tests,
  and release/runbook drafts after domain types are stable. It does not modify
  existing produce queries/dashboard concurrently with Release A integration.
- The primary agent owns the dirty shared files: existing migrations list,
  `lib/types.ts`, data mapper/profile query integration, current profile/auth
  actions, onboarding wrapper, app layout/proxy/shell/headers/footer, existing
  marketplace integration, global CSS, shared schema/E2E tests, feature flags,
  and final quality/release evidence.

Domain and localization foundations run in parallel. The primary agent reviews
and integrates both before assigning organization/offer implementation. No two
agents edit the same file concurrently. Every subagent runs focused tests and
returns changed paths plus transcripts; the primary agent reviews diffs and
runs the complete gate.

### Open assumptions resolved by this plan

“All Indian languages” means the 22 Scheduled languages plus English, not every
mother tongue or dialect. The locale registry is extensible. The first release
uses one primary interface script for multi-script languages while user content
accepts normal Unicode; adding another script variant is additive.

Agricultural business is a fourth primary account identity, while exact tractor,
tool, input, livestock, poultry, aquaculture, logistics, finance, advisory, and
support distinctions are organization/category data. Farmers and Wholesalers
can buy/source; a primary role does not ban compatible participation.

Custom categories are usable in onboarding immediately as private/pending user
content, but do not become global taxonomy until moderated. Company and offer
verification are separate. Unverified organizations may publish ordinary,
clearly labeled offers; high-risk regulated sectors require review.

The program creates leads and shared enquiry threads, not payments, orders,
shipping guarantees, subsidy eligibility, loan approval, or legal certification.
Those are future independently planned systems.

### TODO checklist

- [x] Assign and complete deep domain/data, onboarding/i18n, and
      marketplace/quality research with exact file/line evidence.
- [x] Record the architecture, taxonomy, locale registry, production risks,
      compatibility boundary, and test expectations in `research.md`.
- [x] Run the current local baseline: ESLint, TypeScript, 66 Vitest tests, and
      Vinext production build pass on 2026-08-09.
- [x] Add this self-contained plan, code-shape examples, ownership, rollback,
      release order, test strategy, and full task list.
- [x] User explicitly approved this addendum on 2026-08-09.
- [x] Release A local implementation: isolate demo data, fix honest empty/error behavior, remove
      invented/overstated claims, correct seed/config/grants, and finish public
      profile verification.
- [x] Domain agent: add locale/taxonomy/draft/capability migration, catalogs,
      backfill, RLS/RPCs, and executable database tests.
- [x] Localization foundation: add all 23 catalogs, resolver/provider/selector,
      formatting, RTL handling, review status, and catalog/format tests. The 22
      non-English catalogs remain visibly Beta pending native/legal review.
- [x] Primary agent: integrate profile types/queries, auth locale sync,
      capability-based shell/actions, and feature flags without overwriting the
      dirty worktree.
- [x] Build and verify resumable role-aware onboarding, hierarchical poultry/
      aquaculture/seafood/allied selection, and bounded custom categories.
- [x] Domain/marketplace agents: add organizations, memberships, private
      verification boundary, RLS, and company onboarding/public/dashboard UI.
- [x] Add general offers, media, service areas, server-side discovery, shared
      enquiries, assignments/events, moderation, and high-risk review rules.
- [ ] Localize every route and state, replace raw errors/preformatted English,
      apply logical CSS/accessibility behavior, and record human review status.
- [ ] Add anti-abuse, privacy/deletion/retention, security headers, error/loading,
      health, SEO/JSON-LD, config separation, monitoring, and production runbook.
- [ ] Pass focused tests continuously, the complete local gate, real Supabase
      migration/RLS tests, configured multi-user E2E, all-locale smoke, RTL,
      accessibility, responsive, and performance checks.
- [ ] Present backup/restore, migrations, dry-run configuration, test evidence,
      current version and rollback commands for separate production approval.
- [ ] Deploy Releases A/B/C independently, verify live routes/data/auth/locales/
      companies/offers/enquiries/health, and record versioned evidence.

### Plan revision note

2026-08-09: Added this agriculture-ecosystem addendum after three parallel
read-only audits. The user approved implementation on 2026-08-09. Local
implementation and code-level gates are complete; production activation remains
blocked on executable database/RLS validation, native/legal locale review,
external abuse/operations configuration, backup/restore evidence, and separate
staged release approval. It supersedes the earlier Farmer-groups release order
but not its design: production data integrity remains first, canonical taxonomy
and localization precede groups, and company/offer functionality is modeled
separately from produce.

## Addendum: international Farmer professional profile and card

### Purpose and outcome

This addendum turns the existing public Farmer homepage into a polished,
LinkedIn-style professional profile and replaces the misleading sidebar
“identity card” with a corporate FarmerBook Professional Card. After completion,
an active, onboarded Farmer can explicitly publish a professional profile,
choose the safe optional fields that appear on a two-sided card, preview it,
share it, and print/save it as an ID-1-proportioned PDF. A recipient can scan a
high-contrast QR or follow the adjacent HTTPS URL to see the current live card
status without signing in.

The card is not a government identity credential. It contains no invented
number, issue date, expiry, certification, follower count, score, or activity.
The visible handle is labelled “Profile handle,” not “FarmerBook ID.” An opaque
random reference exists only to keep QR destinations stable and revocable; it
is not presented as a member/identity number. All participant-provided facts are
described honestly, and the existing broad review flag never implies land,
identity, certification, supplier, or produce verification.

This is a new staged release after the production data-integrity repair and
current public-profile migration rollout. No implementation begins until the
user explicitly approves this addendum.

### Progress

- [x] (2026-08-09) Assigned three parallel read-only audits for profile UX,
      data/RLS/trust, and standards/production/test readiness.
- [x] (2026-08-09) Inspected the current public profile at desktop and mobile
      sizes and measured the existing non-ID-1 card geometry.
- [x] (2026-08-09) Verified official ID-1 dimensions and WCAG 2.2 requirements;
      recorded the evidence and architecture in `research.md`.
- [x] (2026-08-09) Selected a non-credential live-card model with explicit
      publication consent, a stable opaque reference, honest trust labels, and
      no fake fields.
- [x] (2026-08-09) Wrote this implementation and verification plan.
- [ ] Obtain explicit user approval for this addendum.
- [ ] Implement milestones 1–6 with bounded parallel ownership.
- [ ] Pass local, configured database, accessibility, print/QR, and staging
      gates before requesting separate production deployment approval.

### Architecture and user-visible contract

Keep the two existing profile routes purposeful:

```text
/farmers/[handle]            authenticated community profile
  -> follow / message / posts / block / report

/profile/[handle]            public professional Farmer homepage
  -> identity summary / about / crops / produce / reviews / share

/farmer-card/[reference]     public noindex live-card status
  -> current card faces / visible URL / print-save PDF / unavailable tombstone
```

Create a reusable professional identity header so the public and authenticated
pages share portrait, name, handle, role, broad location, crops, and review
language while retaining their route-specific actions. Do not redirect signed-in
navigation from `/farmers` to `/profile`; external sharing remains public.

The card has two explicit, keyboard-operable faces. The front contains brand,
semantic portrait/fallback, name, Profile handle, Farmer account category,
district/state, at most three crops/categories, and optional real method/
experience. The back contains a locally generated QR, visible/copyable canonical
URL, current scoped review status when applicable, and the non-government/
non-certification disclaimer. Both use `aspect-ratio: 85.6 / 53.98`; print uses
exact `85.60mm x 53.98mm`. There is no hover-only flip and no rasterized-only
text.

Add a single tightly scoped `farmer_profile_cards` table through a forward
migration:

```text
profile_id uuid primary key -> profiles(id)
public_reference uuid unique not null
status active | withdrawn | revoked
display_fields text[] from a fixed allowlist
consent_version text not null
consented_at / status_changed_at / created_at / updated_at
```

The table is not an issuance or verification ledger. It records explicit card
publication consent and a stable lookup. No direct anonymous/authenticated
insert, update, or delete is granted. Owner-only security-definer RPCs with
fixed search paths and row locks create/update/withdraw after rechecking active,
onboarded, published Farmer eligibility. Suspension, deletion, or role loss
revokes the card. One exact-reference public lookup returns only current,
allowlisted, public-profile fields for an active card; inactive cards return a
generic no-PII state. Public enumeration is impossible. Demo fixtures never
receive a row or QR.

The QR payload is constructed exclusively from configured `NEXT_PUBLIC_SITE_URL`
and the server-provided opaque reference. Host headers, browser origin, query
data, redirects, arbitrary URLs, profile fields, media signatures, and secrets
are rejected. The route is `no-store` and
`noindex,nofollow,noarchive`, is absent from the sitemap, and has bounded edge
rate limiting. Public-profile indexing itself must be an explicit product
decision reflected consistently in consent copy, privacy policy, robots, and
sitemap behavior.

### Milestone 1: trust, consent, and persistence boundary

Add one forward migration and executable SQL tests. Create
`farmer_profile_cards`, status/display-field checks, timestamps/indexes, RLS,
owner RPCs, exact-reference lookup, and profile-status invalidation. Revoke
default function/table execution before granting only the intended calls. The
lookup must distinguish active, unavailable/revoked, missing, and backend
failure without leaking whether a profile/email/account exists.

Update profile publication Settings to enumerate exactly which fields become
public: name, handle, account category, district/state, bio, crops/categories,
method, experience, photo, cover, social links, listings, and completed-enquiry
reviews. Add separate card consent with required core fields and toggles for
the allowlisted optional fields. Require an explicit click to import the OAuth
photo and explain that publishing can expose it. Do not create/backfill a card
for existing profiles, demo records, or users who have not consented.

Reconcile the privacy notice and indexing behavior. The card route always stays
noindex. If public professional profiles remain indexable, state that plainly
and add only active published Farmer URLs to the sitemap. Otherwise set them
noindex and remove the robots allowance. The implementation must choose one
coherent behavior and present it for release review; no silent conflict remains.

Files include a new migration under `supabase/migrations/`, a new executable
test under `supabase/tests/`, new `features/professional-cards/{types,schemas,
queries,actions}.ts`, and bounded updates to profile settings/actions/queries,
`proxy.ts`, `app/robots.ts`, `app/sitemap.ts`, privacy/data-deletion copy, and
the production runbook.

### Milestone 2: shared professional identity and public profile redesign

Extract reusable identity primitives and redesign
`features/profiles/public-farmer-profile.tsx` around a compact decorative cover,
112–128px meaningful portrait, one `h1`, real role/method/location/crops, and
clear actions. Use `dir="auto"` on participant-authored fields. The cover has
empty alt; the portrait uses `alt="Photo of [name]"` when real and an
aria-hidden neutral fallback when absent.

Replace decorative trust claims with facts sourced from successful live
queries. Omit absent experience instead of showing a dash. Say
“completed-enquiry reviews” rather than “verified reviews.” Show
“FarmerBook profile reviewed” only when the scoped review state is present and
include an explanation of what it does and does not establish. Apply the same
language to storefront/listing surfaces. Do not fabricate experience suffixes,
followers, counts, verified supplier status, listings, or reviews.

Retain genuine farm story/social links, real current listings and reviews, and
honest empty/unavailable states. Deduplicate metadata/page profile loading,
replace provenance-overstating metadata, and distinguish backend outage from
not-found. Add safe Person/ProfilePage JSON-LD containing only published fields
and no unverified rating or contact claims.

### Milestone 3: professional card, QR, and status route

Add `features/professional-cards/farmer-professional-card.tsx` and a local SVG
QR component/library with no external QR API. Add
`app/farmer-card/[publicReference]/page.tsx` and a reusable status component.
Provide explicit Front and QR controls with 44px targets, visible focus, polite
status for copy/print, and visible alerts for failure. The URL remains a normal
selectable link beside the QR.

The layout has a deterministic long-content policy: preserve readable minimum
type sizes, clamp only non-critical crop overflow with an explicit “+N more,”
and move secondary details outside/below the physical card at 200%/400% zoom
rather than clipping. It supports long Unicode/RTL names and handles, absent
photo/method/experience, forced colors, reduced motion, and monochrome print.

The public profile shows a card preview only when the owner has published one;
other users see no create control. Settings shows a full preview and Create/
Update/Withdraw actions. The authenticated `/farmers/[handle]` view may link the
owner to settings or an active card, but its connection/message actions remain
unchanged. The demo profile is relabelled “Sample professional profile,” is
visibly fictional, and has no scannable QR, reference, or issued/published date.

### Milestone 4: print/save and media safety

Add a dedicated print presentation with `@page` and `@media print`: exact
85.60mm by 53.98mm output, zero unrelated navigation/footer/feed content,
preserved foreground/background colors, visible canonical URL, and no broken
page/card splits. The first release uses browser Print / Save as PDF, avoiding
an unnecessary raster/PDF generator. It states that printer scaling affects
physical dimensions.

If an image-download button is added, it must export only after safe same-origin
media preparation. Uploaded/OAuth portraits are decoded by magic bytes, bounded
by pixels/dimensions, re-encoded, stripped of metadata, and stored under a
random name; browser MIME/name alone is not trusted. Card media uses a short
TTL/status-checked delivery path, and neither stored nor signed media URLs enter
QR, metadata, logs, or persistent card rows. Otherwise defer image download and
ship the safer PDF/print path rather than weakening revocation/privacy.

Fix `ShareProfileButton` so native-share cancellation is quiet but clipboard,
permission, and unexpected share failures surface a bounded accessible error.
Canonical URLs come from the server configuration, not the browser location.

### Milestone 5: accessibility, localization, and visual quality

Use the existing cream/forest/terracotta visual language with a restrained
corporate grid, strong typography, subtle farm pattern/line work, and no flags,
government seals, Ashoka emblem, barcodes, hologram imitation, official
signature, or certification ornament. Correct the current white-on-terracotta
normal-text contrast failure and meet WCAG 2.2 AA. Preserve real text, logical
headings, focus visibility, screen-reader names, 200% resize, 320px reflow,
forced colors, reduced motion, and keyboard-only use.

Add professional-profile/card message keys to the locale system. At minimum the
release cannot present a partly translated legal/trust disclaimer as fully
localized. `en-IN` is source-reviewed; other enabled catalogs keep their Beta
label until native/legal review. Participant content remains as entered with
`dir="auto"`; no machine translation is presented as the original.

Responsive contracts are desktop two-column identity/action and about/card
layouts, stack below approximately 860px, and full-width actions/card below
620px. Validate 1280, 393, and 320px with no horizontal overflow. Print and
screen variants share the same field allowlist and trust copy.

### Milestone 6: verification and release gates

Add/expand Vitest coverage for:

- professional-card schemas, canonical URL/host allowlist, safe filenames,
  field allowlisting, consent/publication/revocation, and no fake/private fields;
- public profile omission of absent facts, scoped review wording, semantic
  portrait/fallback, JSON-LD, and unavailable versus missing behavior;
- QR payload, accessible URL/name, long/RTL content, unpublished state, share/
  copy/print success and failures, and object-URL cleanup;
- privacy/robots/sitemap consistency and proof that demo data never receives a
  card reference or QR.

Execute Supabase SQL tests for anonymous, active owner, other participant,
unpublished/incomplete/suspended Farmer, non-Farmer, admin, and service role.
Prove raw writes/public enumeration fail, owner RPCs are idempotent, status
invalidation is atomic, withdrawn/revoked lookup contains no PII, and unrelated
avatar/storage objects remain private.

Playwright covers desktop/mobile, keyboard, 200%/400% zoom, print media,
`en-IN`, `hi-IN`, `mr-IN`, one RTL locale, long content, missing media, no
overflow, and no critical accessibility violations. Decode the actual rendered
QR from screen and saved/print artifact, plus grayscale and downscaled variants;
the value must exactly equal the expected configured HTTPS URL. Assert visual
ratio within 0.5% and exact PDF/print page dimensions.

Run the focused tests continuously, then:

```sh
npm run check
npm run test:e2e
supabase db reset
supabase test db
npm run test:e2e:configured
```

Add the currently missing `test:e2e:configured` command rather than claiming a
gate that cannot run. If the Supabase CLI/configured environment or print/QR
decoder is unavailable, local work may continue but the release remains
blocked and the missing evidence is recorded.

Before production, apply all pending migrations to staging, verify anonymous
`200` for active published Farmer profiles/cards and honest unavailable states,
verify `/robots.txt`, `/sitemap.xml`, and `/api/health` are intentionally public,
run RLS/storage/browser/accessibility/print tests, decode the staging QR, and
record the Worker version and rollback target. Present that evidence for a
separate deployment approval. After deployment, repeat live QR scan, card
withdrawal/revocation, profile/share, desktop/mobile/print, security headers,
and absence-of-demo-data smoke checks.

### Rollback and recovery

Guard card creation, card navigation, and public lookup behind
`ENABLE_PROFESSIONAL_FARMER_CARDS`, default off in configured production until
the migration and tests pass. Application rollback disables the card UI/route
and returns to the existing public profile while preserving user consent rows.
Schema rollback is forward-only: never drop card consent/status records during
an incident. Repair RLS/RPC errors with a corrective migration. Withdrawing a
card or public profile immediately removes PII from the status route; short-
lived media may remain valid only for its bounded TTL, which is documented.

No rollback may restore the old “FarmerBook ID,” “Farmer identity card,” or
blanket verification language. Those misleading claims are removed independently
of the feature flag.

### Multiple-agent ownership and merge discipline

After explicit approval, use the same three subagents with disjoint ownership:

- The data/security agent owns the new forward migration, RLS/RPCs, narrow
  professional-card data modules, and executable SQL/unit tests. It does not
  edit public profile UI, global CSS, or shared E2E files.
- The profile/visual agent owns the new reusable identity/card/QR components,
  public profile hierarchy, focused component tests, and a scoped CSS module or
  clearly bounded new global-CSS block. It does not edit migrations, actions,
  proxy, or privacy policy.
- The quality/standards agent owns QR decoding/geometry/print/a11y helpers,
  new isolated test files, production route verification, and runbook evidence.
  It does not change feature behavior while auditing.
- The primary agent owns dirty shared files and integration: profile types/
  mappers/queries/actions, settings, photo import, authenticated profile,
  metadata/JSON-LD, storefront wording, proxy/robots/sitemap/privacy, shared CSS
  and E2E, feature flag, conflict resolution, full gates, and release handoff.

The data and visual foundations may proceed in parallel. The primary agent
reviews their contracts before integrating settings/routes. No two agents edit
the same file concurrently. Every agent returns exact changed paths and focused
test output; the primary agent reviews every diff and runs the complete gate.

### Decision log

- The deliverable is a professional network card, not a government identity
  document or verified credential.
- ID-1 is a visual/print proportion only; no ISO certification claim is made.
- No displayed synthetic card number, issue date, expiry, trust score, follower
  count, or verification claim is added.
- A hidden opaque reference is necessary for stable/revocable QR lookup because
  profile handles are editable. It is never described as identity.
- The first release is live/current rather than an immutable claim snapshot.
  A future reviewed credential requires a separate approved issuance/revision/
  evidence program.
- Browser print/save-PDF ships before image export unless the image pipeline can
  meet the same-origin, metadata-stripping, revocation, and decode gates.
- Professional profiles may be indexed only after consent/privacy/robots/
  sitemap agree; card status pages are always noindex.

### Approval gate

This addendum is ready for implementation but not yet approved. Implementation
starts only after the user replies **Plan approved**. Production deployment is
a later, separate approval after staging evidence is presented.

## Addendum: Consent-first autonomous acquisition and onboarding agent

### Outcome and hard boundary

After this addendum is implemented, FarmerBook can autonomously receive an
opted-in farmer/customer/wholesaler/agricultural-company lead, verify and record
granular consent, qualify the lead, create a personalized introduction in the
chosen language, queue it through an approved provider, guide the person through
onboarding, stop on withdrawal, and record the result. The operator does not
review each lead or draft.

A public contact in a description or screenshot is not treated as consent. The
agent may extract an explicitly labelled business-enquiry contact from an
operator-supplied description/screenshot, but it may only send a consent request
through a registered Digital Consent Acquisition provider and approved template.
If that provider is not configured, the prospect remains `consent_blocked`.
FarmerBook never scrapes social/YouTube pages or uses an unofficial sender.

### Architecture

Keep Supabase as the durable state/audit system and add a Cloudflare Workers AI
binding for bounded qualification/drafting. Do not add an Agents SDK Durable
Object until a real delivery provider makes a long-running consent workflow
necessary. Use an idempotent database state machine and transactional outbox;
both application and private database release controls default off.

```ts
export interface ConsentAcquisitionProvider {
  requestConsent(input: RegisteredConsentRequest): Promise<ProviderReceipt>;
  verifyWebhook(request: Request): Promise<ConsentDecision>;
}

export interface OutreachDeliveryProvider {
  deliver(input: ConsentedIntroduction): Promise<ProviderReceipt>;
  verifyWebhook(request: Request): Promise<DeliveryEvent>;
}
```

Local/test adapters never send. Production adapters fail closed unless their
registered sender, approved template, webhook secret, and release flag are all
present. Introduction and follow-up work never enters the outbox without a
current receipt matching the channel, purpose and recipient; the only
pre-consent outbox purpose is a bounded verified-provider confirmation request
created from an explicit inbound form.

### Milestone 1: release controls and private data contract

Add `ENABLE_OUTREACH_AGENT=false` to the feature flag registry, Vite's bounded
variable map, `.env.example`, tests, and runbook. Extend private database release
controls with `outreach_agent=false`. Add the forward migration
`supabase/migrations/20260809140000_outreach_agent.sql` with:

- `outreach_prospects` and revisioned lifecycle state;
- private `outreach_contact_candidates` with normalized hashes/provenance;
- immutable `outreach_consents` with purpose/channel/template/provider receipt;
- transactional `outreach_outbox` with idempotency, limits, expiry, and receipts;
- append-only `outreach_events`, private `outreach_suppressions`, and redacted
  `outreach_agent_runs`.

Revoke all table access from public, anon, and ordinary authenticated roles.
Expose narrow security-definer RPCs that fix `search_path=''`, validate
`public.is_admin()` or a dedicated verified webhook path, require the database
release flag, and enforce transitions. Webhook writes must not use a public
service-role key; route handlers verify the provider signature then call a
server-only RPC/client.

```sql
if not consent_is_active(prospect_id_input, channel_input, purpose_input) then
  raise exception 'Active consent is required'
    using errcode = '42501', detail = 'CONSENT_REQUIRED';
end if;

insert into public.outreach_outbox (...)
values (...)
on conflict (idempotency_key) do nothing;
```

Withdrawal must atomically revoke consent, cancel pending outbox rows, clear
unneeded contact/draft data, insert suppression hashes, and append an audit event.

### Milestone 2: source intake, pasted descriptions, and screenshot OCR

Add `features/outreach/source-policy.ts`, `url-policy.ts`, `schemas.ts`,
`html-to-text.ts`, `contact-extractor.ts`, and `ocr.ts`. Intake accepts one URL,
an optional pasted description, or an administrator-uploaded screenshot.

- Classify social/YouTube URLs before network access and never fetch them.
- Validate image magic bytes/type/size/dimensions, re-encode without metadata,
  process transiently, and delete immediately after OCR.
- Preserve the exact text/evidence excerpt and confidence; do not guess obscured
  or partial contacts.
- Permit safe website fetching only with HTTPS/redirect/SSRF/content/time/byte
  controls described in `research.md`.
- Prefer explicitly labelled role inboxes/business phone numbers. Ambiguity
  results in `consent_blocked`, not AI completion.

```ts
if (isSocialOrYouTube(sourceUrl)) {
  return evidenceInput
    ? extractFromOperatorEvidence(evidenceInput)
    : { code: "EVIDENCE_REQUIRED", fetched: false };
}
```

### Milestone 3: consent capture and inbound acquisition

Create a public, localized `/join` route and `features/acquisition` forms/actions.
State FarmerBook's identity, exact purpose, selected channel, maximum follow-up
frequency, AI personalization, privacy notice, and withdrawal method. Collect
only role, name/business name, state/district, preferred language, and one
contact channel. Use separate unchecked boxes for introduction and onboarding
follow-ups; neither is bundled into account terms.

Issue a server nonce and consent-policy version, use Turnstile and rate limits,
enforce suppression/deduplication, and require double opt-in email or OTP/verified
provider receipt before consent becomes active. Store the exact rendered
statement/template version and evidence—not merely `true`.

Add an optional signed Google lead-form webhook route. Validate its secret,
timestamp/replay ID, expected campaign/form, field allowlist, privacy/purpose
version, and idempotency. Ambiguous submissions enter `consent_pending` and get
only the approved confirmation flow, never a promotional introduction.

### Milestone 4: AI qualification and multilingual introduction

Configure the Workers AI binding in `vite.config.ts` and a typed server-only
accessor. Add `features/outreach/agent.ts`, `prompt.ts`, and `ai-schema.ts`.
Treat source/lead text as untrusted delimited data, reject instructions inside
it, restrict roles/categories to canonical FarmerBook values, and parse JSON
mode through Zod.

```ts
const analysis = outreachAnalysisSchema.parse(await model.generate({
  roleValues: ["farmer", "customer", "wholesaler", "agri_business"],
  allowedCategorySlugs,
  lead: boundedLeadContext,
}));
```

The introduction identifies FarmerBook honestly, explains relevant benefits,
links only to the canonical HTTPS site, and contains fixed reviewed withdrawal
copy. It cannot promise customers, income, prices, verification, subsidies,
partnership, endorsement, or government affiliation. AI/model failure uses a
reviewed deterministic template and never invents missing fields. Store model/
prompt versions and usage/error metadata without raw prompts or contact values.

### Milestone 5: autonomous outbox, replies, and onboarding

Add an outbox processor with bounded attempts, exponential backoff, `not_before`,
expiry, per-recipient frequency caps, provider idempotency keys, and circuit
breaker. It processes only active-consent rows. Provider webhooks verify
signatures/replay IDs and record delivery, bounce, complaint, reply, opt-out, or
failure atomically.

Successful introduction moves the lead into an onboarding sequence tailored to
role/language. Follow-ups stop on reply, joined account, withdrawal, decline,
complaint, hard bounce, expiry, or frequency limit. A signed invitation connects
the resulting account to the prospect without exposing contact data. The agent
may answer only bounded FarmerBook onboarding questions; uncertain/safety/legal/
financial requests receive a neutral support route.

Implement the provider contracts and non-sending adapter locally. A real email,
DLT/SMS, WhatsApp, or social adapter is enabled only after the matching external
registration/credentials/templates are supplied and separately approved.

### Milestone 6: administrator observability and privacy operations

Add `/admin/outreach` as an admin-only status console—not a per-lead approval
queue. Show aggregate funnel counts, blocked-provider reasons, consent evidence,
delivery state, opt-outs, provider health, AI usage, retention deadlines, and
individual audit history. Allow pause, suppress, delete, and retry-safe failure
recovery; do not add a bypass-consent or force-send control.

Update privacy, data-deletion, community rules, locale source copy, and the
production runbook for AI processing, source/OCR evidence, consent purpose,
withdrawal, suppression, delivery providers, retention/purge, data-subject
requests, complaints, incident response, and costs. Production retention values
and legal owner must be approved rather than inferred.

### Milestone 7: verification

Add unit/component/action coverage for source classification, no social fetch,
image validation/metadata removal/cleanup, OCR uncertainty, SSRF redirects,
provenance, consent nonces/versions, webhook signatures/replay, AI schema/prompt
injection/fallback, outbox idempotency/retries/circuit breaker, frequency caps,
withdrawal/suppression, invite linkage, privacy copy, and no force-send path.

Add static and executable SQL tests for anonymous, normal authenticated, admin,
verified webhook, service role, release-disabled, duplicate, revision conflict,
expired consent, withdrawn contact, re-imported suppression, purge, and audit
immutability. Playwright covers `/join` and admin observability on mobile/desktop,
keyboard, core locales plus RTL, double opt-in, withdrawal, provider/AI failure,
and no overflow.

Run:

```sh
npm run check
npm run test:e2e
supabase db reset
supabase test db
git diff --check
```

Unavailable PostgreSQL/provider credentials do not justify skipped release
evidence. Local implementation may finish, but production remains blocked.

### Detailed todo list

- [x] Add default-off application/database controls and environment contracts.
- [x] Add private prospect/contact/consent/outbox/event/suppression/run schema.
- [x] Add admin/webhook RPCs, revisions, idempotency, rate and frequency limits.
- [x] Implement URL/source classification with a hard no-fetch social policy.
- [x] Implement pasted-description and transient screenshot OCR provenance.
- [x] Implement bounded SSRF-safe public-business website extraction.
- [x] Build localized `/join`, granular consent, nonce, Turnstile, double opt-in.
- [x] Add the signed Google lead-form webhook behind a separate flag/config.
- [x] Add Workers AI qualification/drafting with strict schema and fallback.
- [x] Add provider interfaces, non-sending adapter, outbox processor and webhooks.
- [x] Add autonomous onboarding, reply stop conditions, invite/account linkage.
- [x] Build the admin observability/pause/suppress/delete interface.
- [x] Update privacy, deletion, rules, localization, and production runbook.
- [x] Add unit, action, component, static SQL, executable SQL, and browser tests.
- [x] Run complete local gates and record all unavailable external evidence.
- [ ] Obtain provider/legal/retention approval before a separate staged release.

### External prerequisites and rollback

Real autonomous delivery requires a verified FarmerBook sender domain or PE/DLT/
official business-messaging registration, approved consent/content templates,
webhook credentials, custom SMTP/provider configuration, Turnstile, a reviewed
privacy notice, retention decision, named owner, and budget/usage limits. These
are not present in source and cannot be fabricated.

Rollback disables the private database control first, cancels pending outbox
rows, then disables the app flag/provider binding. Do not drop consent,
withdrawal, suppression, or provider receipts during an incident; apply the
reviewed retention/purge path. No rollback may re-enable scraping, unofficial
senders, consent bypass, or repeated contact after withdrawal.

### Approval gate

The user approved local implementation on 9 August 2026. The implemented local
slice covers consent intake, bounded research/OCR, qualification/drafting,
verified-provider confirmation, introduction delivery, one separately
consented onboarding follow-up, withdrawal/suppression, cleanup and a private
status console. Reply classification, account/invitation linkage, admin
pause/delete controls, executable PostgreSQL evidence and every external gate
remain open. Approval does not authorize advertising spend, provider
registration, production deployment, or contacting any real person.

## Plan revision note — 2026-08-11

This revision establishes the stable requirements-intake and traceability process requested by the product owner. It records the approved social-media boundary—attributed original-URL embeds with no media copying—and adds the managed identity-verification-agent requirement. The verification model separates identity, role, organization, social-presence, contact, location, community, and reputation evidence, keeps unsupported profiles visibly `Not verified`, and records Cloudflare Agents SDK, Workers AI, Durable Objects, and Workflows as the selected managed runtime without an application AI key.

## Implementation addendum: complete localization remediation

### Authorization and outcome

The product owner directed “Fix all the failures” on 11 August 2026 after the
parallel localization audit. This is defect completion inside the previously
approved 23-locale implementation program, not authorization to deploy or mark
unreviewed translations as human reviewed.

After this addendum is complete, changing locale updates the complete
FarmerBook interface rather than only the selector. Shared navigation, public
pages, authentication, onboarding, professional profiles, marketplace,
authenticated product routes, settings, organizations/offers, moderation,
outreach administration, legal/help pages, validation errors, empty states,
metadata, dates, numbers, currency, relative time, role/method/status labels,
and accessibility text all use the request locale. User-authored content stays
in its original language with `dir="auto"`. RTL locales use a logical layout.

### Architecture

Keep the existing typed English source catalog and lazy loader registry. Add a
request-scoped server helper beside the client provider so server and client
components share the same translator:

```ts
export async function getServerI18n() {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const locale = getRequestLocale({
    cookie: cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    acceptLanguage: requestHeaders.get("accept-language"),
  });
  const messages = await loadMessages(locale);
  return { locale, t: createTranslator(messages) };
}
```

Route-oriented namespaces keep ownership clear: `navigation`, `home`, `auth`,
`onboarding`, `publicProfile`, `marketplace`, `feed`, `network`, `messages`,
`settings`, `business`, `organizations`, `offers`, `reviews`, `moderation`,
`outreach`, `legal`, `errors`, and shared `common`/`domain`. Client modules call
`useTranslations(namespace)`; server routes call `getServerTranslations` or
`getServerI18n`. Do not add DOM text replacement, translation by CSS, runtime
network translation, unsafe HTML catalogs, or locale-prefixed route churn.

Non-English catalogs must define their full shape without `...englishMessages`
spreads. Machine-assisted copy remains `Beta` and retains
`needs_native_review`; only recorded human reviewer/date/hash evidence can
change that status. Legal, consent, identity, deletion, moderation, and
marketplace-commitment copy remains disabled from production locale rollout
until the existing native/legal review gate is satisfied.

### Implementation stages

1. **Translation primitives and persistence.** Add server translation helpers,
   namespace/type utilities, domain-label helpers, and a single locale-cookie
   writer shared by selector, auth callback, password login, signup, and profile
   restoration. Preserve demo mode. A missing cookie after authenticated login
   restores `profiles.preferred_locale`; explicit cookie choice remains higher
   priority.
2. **Shared shells first.** Localize `components/public-header.tsx`,
   `public-footer.tsx`, `app-shell.tsx`, `settings-nav.tsx`, shared buttons,
   errors, loading/empty states, report controls, language status, and metadata.
   This prevents every route from looking English even while route batches are
   converted.
3. **Public/auth/legal batch.** Convert `app/page.tsx`, login/signup/password/
   confirm-email, public profile/store, marketplace/listing/demo, company/offer,
   privacy/terms/rules/deletion/unsubscribe, not-found and global error routes.
4. **Authenticated product batch.** Convert feed/posts, market/business/
   purchases, discover/network, messages, farmer profile, company dashboard,
   settings/account/profile, moderation/admin, reviews, organizations/offers,
   and outreach console. Platform copy comes from catalogs; names, handles,
   posts, messages, descriptions, and source excerpts remain original.
5. **Domain data and formatting.** Replace precomposed English labels in
   `lib/data-mappers.ts` with stable codes/raw timestamps or locale-aware render
   helpers. Translate roles, farming methods, statuses, categories, sectors,
   units, report reasons, and action results at render time. Use
   `formatNumber`, `formatCurrency`, `formatDate`, `formatRelativeTime`, and
   `formatList` with the active locale.
6. **Catalog completion.** Expand English keys, translate Hindi and Marathi
   completely, then complete the other 20 Beta catalogs with interpolation and
   HTML-free parity. Preserve native scripts and correct text direction. Add a
   deterministic catalog validation tool so accidental fallback/placeholder
   mismatch fails CI.
7. **RTL and long text.** Replace physical direction CSS with logical
   properties where direction is semantic; add `dir="auto"` to user content;
   verify rail, cards, search, conversations, forms, dialogs, tables, badges,
   and public profile at RTL and 200% zoom.
8. **Regression gates.** Add unit/component/static tests and Playwright journeys
   that select a locale, wait for refresh, reload/navigate, assert visible
   translated content, and verify `lang`, `dir`, persistence, long-text wrap,
   no overflow, and original-language authored content.

### Test strategy

Run focused typecheck and tests after each stage, then:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
git diff --check
```

Catalog tests must smoke-render all 23 locales. Browser functional coverage uses
English, Hindi, Marathi, Bengali or Assamese, Tamil, Telugu, and one RTL locale
(Urdu first), on desktop and mobile. The extended-locale flag remains local-only
for those tests; no production flag or database control changes.

### Rollback

Localization changes are additive catalog/component changes. If a route batch
regresses behavior, revert that batch to the last passing checkpoint while
keeping the shared translator and tests. If a locale has malformed or unsafe
copy, keep it visibly Beta and disabled through `ENABLE_EXTENDED_LOCALES`; do
not silently fall back on safety/legal/marketplace commitment text. Rollback
must not delete saved locale preferences or change stable domain identifiers.

### Detailed todo list

- [ ] Document audit findings, route inventory, catalog gaps, RTL risks, and
      the proposed acquisition boundary in `research.md` and requirements.
- [ ] Add server translation and request-locale helpers with typed namespaces.
- [ ] Reconcile authenticated profile locale during password/OAuth sessions.
- [ ] Localize shared public/product/settings shells and global states.
- [ ] Localize public home, auth, legal, profile, store, marketplace, companies,
      offers, metadata, manifests, and public errors.
- [ ] Localize feed/posts, network/discover, messages, business/market/purchases,
      settings, organizations/offers, reviews, moderation/admin, and outreach.
- [ ] Replace English-precomposed domain labels and fixed `en-IN` formatting.
- [ ] Complete Hindi and Marathi catalogs without English spreads.
- [ ] Complete the remaining 20 Beta catalogs without English spreads.
- [ ] Translate canonical taxonomy/sector display labels while preserving slugs.
- [ ] Convert directional CSS to logical properties and add `dir="auto"`.
- [ ] Add strict catalog, hard-coded-copy, persistence, all-locale smoke, RTL,
      long-copy, and browser localization tests.
- [ ] Run full local gates, visually inspect representative locales, and record
      exact evidence in `implementation-log.md`, `docs/REQUIREMENTS.md`, and
      `.structured-dev-state`.
- [ ] Keep production deployment, release flags, native/legal review status,
      provider setup, and real outreach outside this authorization.

## Implementation addendum: approved-source candidate discovery and private previews

FB-REQ-014 records the product owner's request to identify potential Farmers,
Customers, Wholesalers, and agricultural organizations from public professional
sources, locate a contact channel, send an invitation, and prepare a sample
profile. The supplied-URL, Brave name-search, and recipient-approval paths are
locally implemented; provider subscription/secret setup and production release
remain separately gated.

The acceptable product boundary is approved provider APIs, authorized search,
or operator-supplied URLs; exact source/fact provenance; private previews marked
`Unclaimed`; no copied third-party media or inferred private contacts; no trust
badge, public member profile, or activity attributed to a non-member; and a
signed claim flow after verified contact and explicit acceptance. Decline,
deletion, source correction, expiry, and durable suppression are mandatory.
Visible contact data alone remains evidence rather than permission to contact,
and social/YouTube access controls or provider policy may not be bypassed.
Production sending still requires the existing approved provider, consent,
privacy/retention, template, webhook, staged-test, and separate release gates.

The product owner approved Brave Search API on 2026-08-11. Name discovery is
administrator-only and accepts a full name plus optional location and farming
hints. It keeps at most five exact-name, agriculture-relevant HTTPS results,
records `brave_search`, a query hash, and `provider_storage_plan` on each source,
and refuses to start unless both a Cloudflare secret and an explicit
storage-rights confirmation exist. A private database reservation caps each
administrator at 25 searches/day and 250/month before any provider call. The
adapter performs no automatic provider retry. Search snippets never become
contact candidates or consent; a separate verified, purpose-specific consent
path is still required before any invitation can leave FarmerBook.

The local implementation uses the Cloudflare Agents SDK and managed Workers AI.
Each prospect maps to a named SQLite Durable Object; the Durable Object stores
only workflow identifiers and status, while Supabase remains the private source
of truth for evidence and cited sample data. A Cloudflare Workflow waits up to
14 days for the invitation holder's explicit approval. The sample is not a
public route, never creates a verification badge, and is redacted and revoked
on rejection. An approved and authenticated claim records contact verification
from the consented channel and pre-fills only bounded, reviewed onboarding
fields. All behavior is behind both Worker and private database controls that
default false.

## Implementation addendum: Inc direct sourcing

FB-REQ-015 is locally authorized. `Incs` becomes the friendly label for
organization participants that supply agriculture or depend on farmers for raw
materials. Exact legal form remains a separate field and verification claim.

Implementation stages:

1. Extend the organization sector catalog for food processing and other
   farmer-dependent industries without changing existing slugs.
2. Present `Inc` in onboarding, navigation, directories, organization cards,
   dashboards and localized catalogs while retaining `agri_business` as the
   stable authorization code.
3. Add private, claim-specific organization verification evidence and
   decisions for representative authority, registration, GST, official
   domain, facility and relevant industry licence. AI can triage evidence but
   deterministic provider/registry or moderator rules issue claims.
4. Add a dedicated `sourcing_requests` aggregate with categories, product and
   quality needs, quantity/unit/cadence, destination, dates, price/quote and
   payment terms, lifecycle, moderation, RLS and immutable audit.
5. Let qualified Inc members create drafts; require the configured verification
   claims before publication; let Farmers discover matching requests and send
   private, idempotent supply responses that enter a conversation.
6. Localize the complete flow, add structured-data boundaries, abuse/rate
   limits, database authorization tests, component tests and Farmer/Inc browser
   journeys. Keep production migrations and release controls off.

Inc sourcing is additive to the localization repair. New UI keys enter the same
typed catalogs and must not introduce a second localization mechanism.

## Implementation addendum: comprehensive Farmer produce taxonomy

### Status and authorization

FB-REQ-003 has been clarified by the product owner on 2026-08-12. Research is
complete and the product owner explicitly approved this implementation plan on
2026-08-12. Local implementation is complete: the application now has 317
nodes and 311 selectable entries, shared curated/custom editing, localized
core labels, marketplace suggestions and an additive canonical migration.
Production migration, feature flags and deployment remain outside that
approval.

### Approach

Expand the stable taxonomy rather than replacing it. Preserve all 91 existing
slugs, add a broad official-source-informed commodity layer, add aliases and
selection contexts, and reuse one accessible picker in default onboarding,
canonical onboarding and profile settings. Keep marketplace crop text backward
compatible while offering catalog suggestions. Retain a bounded custom produce
path so regional or new products are never blocked.

The finite catalog covers practical crop/species/product classes. Variety,
breed, grade, certification and processing detail remain separate fields. A
profile category does not grant permission to sell regulated food.

### 1. Expand and type the application catalog

**Files:** `lib/agriculture/categories.ts`,
`lib/agriculture/normalization.ts`

Add at least 200 selectable choices spanning grains/millets, pulses, oilseeds,
commercial/fibre/sugar/fodder crops, Indian fruit and nuts, vegetables/tubers,
mushrooms, spices/herbs, plantation crops, flowers, medicinal/aromatic plants,
livestock and primary products, poultry/eggs, fisheries/seafood and allied farm
products. Preserve existing slugs and parent relationships.

Add aliases and usage contexts so produce-only controls do not offer farming
methods as saleable products:

```ts
export type AgricultureSelectionContext =
  | "profile"
  | "produce"
  | "sourcing";

export type AgricultureCategory = {
  slug: string;
  name: string;
  aliases: readonly string[];
  contexts: readonly AgricultureSelectionContext[];
  kind: "group" | "activity" | "commodity";
  parentSlug?: string;
  // existing domain, translationKey, selectable and sortOrder remain
};
```

Add shared helpers for localized labels, alias keys, commodity filtering,
legacy label-to-slug resolution and stable slug-to-display-label conversion.
Normalization must compare custom text against canonical names and aliases, not
only the English display name.

Representative mandatory outputs include `milk`, species-specific milk,
`meat`, sheep/goat meat, buffalo meat, poultry meat, `eggs`, wool, honey,
common Indian fruits/vegetables, cereals/millets/pulses/oilseeds, cultured fish,
shrimp/prawn and shellfish. Prohibited wildlife products and controlled crops
without a lawful FarmerBook use stay absent.

### 2. Localize labels and search terms

**Files:** `lib/i18n/messages/en-IN.ts`, `lib/i18n/messages/hi-IN.ts`,
`lib/i18n/messages/mr-IN.ts`, `lib/i18n/messages.ts`

Add a flat, typed `agricultureCategories` namespace whose keys are stable slugs.
Update the catalog translation key from the currently unused three-part form
to the translator-compatible form:

```ts
translationKey: `agricultureCategories.${category.slug}`;
```

Translate group, common commodity and control labels for English, Hindi and
Marathi. Proper names may be transliterated where that is the normal farm/market
usage. Search indexes the active localized label, English canonical label and
aliases. The other 20 Beta locales remain disabled and may use the English
source catalog until their separately gated completion.

### 3. Make the picker usable at catalog scale

**File:** `features/onboarding/category-picker.tsx`, `app/globals.css`

Refactor the existing component without changing its controlled-state contract:

- support `profile` and `produce` contexts;
- show collapsible root/subgroup sections rather than 200+ flat checkboxes;
- show selected chips and combined curated/custom count;
- search localized labels plus aliases;
- expose “Add your own produce or category” when search has no exact match;
- enforce the caller's combined limit, not independent limits that can exceed
  the legacy schema;
- retain Unicode-safe validation, `dir="auto"`, keyboard operation, labels,
  focus/error announcements and removal controls.

Illustrative API:

```tsx
<AgricultureCategoryPicker
  context="profile"
  selectedSlugs={selectedSlugs}
  customLabels={customLabels}
  maxTotalSelections={8}
  maxCustomLabels={3}
  onSelectedSlugsChange={setSelectedSlugs}
  onCustomLabelsChange={setCustomLabels}
/>
```

### 4. Replace the default six-crop onboarding control

**Files:** `features/profiles/onboarding-form.tsx`,
`features/profiles/schemas.ts`, `features/profiles/actions.ts`

Map existing `initialProfile.crops` into curated slugs by canonical label or
alias; retain unmatched labels as custom. Replace the six buttons with the
shared picker. Before calling the existing action, map selected slugs back to
bounded canonical labels and append custom labels. Keep the existing maximum of
eight total values and the current RPC payload, so the default production path
does not require the unreleased canonical schema.

The client and server must both reject duplicate aliases, contact details,
control/bidi characters and advertising copy. Existing unknown legacy values
must round-trip unchanged unless the user removes them.

### 5. Reuse the picker in profile settings

**Files:** `features/profiles/profile-settings-form.tsx`,
`features/profiles/actions.ts`, `features/profiles/schemas.ts`

Replace the comma-only input with the same curated/custom state and submit a
hidden bounded legacy value for the existing action. Preserve current profile
values exactly and keep role-specific labels: “produce you grow,” “produce you
supply,” or “produce interests.” No account may gain permissions by changing a
category.

### 6. Add suggestions without removing custom marketplace produce

**Files:** `features/marketplace/business-dashboard.tsx`,
`features/marketplace/schemas.ts`

Convert the crop field into an accessible catalog-backed suggestion control
filtered to `produce` context. Keep bounded free text and the separate variety
field, because regional produce and cultivars cannot all be predefined. Do not
change listing authorization or allow profile selection to bypass Farmer-role,
moderation, food-safety or verification gates.

### 7. Add the canonical database delta

**New file:**
`supabase/migrations/20260812120000_expand_farmer_produce_taxonomy.sql`

Use an additive migration; do not edit the two applied ecosystem migrations.
Insert new groups/commodities only after their parents, preserve all old slugs,
and use `on conflict` only to reconcile the intended translation key, parent,
domain, selectability and sort order. Do not delete user affinities.

Correct custom onboarding product semantics so a custom produce label is stored
as domain `commodity`, while preserving existing moderated requests and their
status. Backfill recognizable legacy `profiles.crops` into curated affinities
and unmatched safe values into owner-private custom requests using the existing
idempotent normalization and three-pending-request bound. Record migration
counts without copying unsafe legacy labels into a public catalog.

Production remains on the legacy path until the complete canonical migration,
RLS rehearsal and release controls are separately approved.

### 8. Verification and regression gates

**Files:** `tests/agriculture-catalogs.test.ts`,
`tests/onboarding-category-picker.test.tsx`,
`tests/legacy-onboarding-localization.test.tsx`, new taxonomy migration and
settings/listing component tests, Supabase pgTAP where available.

Add explicit tests for:

- unique connected slugs and preservation of every existing slug;
- at least 200 selectable entries and broad representative group coverage;
- milk, meat, eggs, wool, fruits, vegetables, fish/seafood and allied outputs;
- activity versus commodity contexts;
- English/Hindi/Marathi labels and alias search;
- brinjal/eggplant, okra/ladyfinger and tur/arhar/pigeon-pea duplicate handling;
- nested keyboard-accessible picker behavior and combined limits;
- Indian-script custom produce acceptance and unsafe/contact/ad rejection;
- default onboarding slug/custom mapping and unknown-value round trip;
- profile-settings updates and free custom marketplace produce;
- additive SQL category coverage, no destructive DDL, RLS preservation and
  correct custom commodity domain.

Run:

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
git diff --check
```

If Docker is available, rebuild local Supabase from zero and run both existing
pgTAP suites plus the new taxonomy/custom-category cases. Lack of executable DB
evidence blocks production migration but not documentation of local UI tests.

### Rollback

Application changes are reversible by restoring the prior picker/catalog while
leaving new database rows unused. Database rollback is forward-only: mark a
bad new category `retired` and correct its label/parent in a subsequent
migration; never delete a category referenced by profiles, sourcing requests or
offers. Preserve custom requests and legacy crop strings. Keep canonical flags
false if any migration, RLS, localization or usability gate fails.

### Detailed todo list

- [DONE] Obtain explicit approval for this addendum; approved 2026-08-12.
- [DONE] Snapshot all 91 existing slugs in a preservation test.
- [DONE] Expand category types, hierarchy, aliases and contexts.
- [DONE] Add English/Hindi/Marathi category label catalogs and helpers.
- [DONE] Refactor the picker for nested groups, localized/alias search, selected
      chips and one combined limit.
- [DONE] Replace the default onboarding six-crop buttons with the shared picker.
- [DONE] Preserve legacy and unknown crop values through load/save.
- [DONE] Replace profile-settings comma input with curated/custom selection.
- [DONE] Add catalog-backed marketplace suggestions while retaining safe custom
      crop and variety text.
- [DONE] Add the forward-only SQL taxonomy/custom-domain/backfill migration.
- [DONE] Add catalog, picker, onboarding, settings, listing and migration
      tests.
- [DONE] Run TypeScript, ESLint, all 439 Vitest tests, production build and
      `git diff --check`; all passed. Playwright was attempted both sandboxed
      and outside the sandbox, but its Vinext web server never became ready
      within 120 seconds. The compatibility-date startup error was repaired
      with a test-only override; the remaining readiness timeout is recorded
      rather than misreported as a passed browser suite.
- [DONE] Record exact evidence in `implementation-log.md`,
      `docs/REQUIREMENTS.md`, `PLAN.md` and `.structured-dev-state`.
- [DONE] Keep migration application, flags, deployment and regulated marketplace
      permission outside this approval unless separately requested.

### Outcomes and remaining release evidence

The six-crop default selector and comma-only profile setting are gone. The
shared picker searches canonical English names, Hindi/Marathi labels and common
aliases, keeps selected chips visible, separates profile/produce/sourcing
contexts and retains safe Indian-script custom produce. The legacy path still
saves bounded display labels; the canonical migration reconciles all current
slugs, maps known legacy crops, preserves safe unknowns as private requests and
stores new custom produce in the `commodity` moderation domain.

Local evidence: `npm run typecheck`, `npm run lint`, `npm test` (94 files,
439 tests), `npm run build` and `git diff --check` passed. Focused post-change
taxonomy/settings/migration/picker coverage passed 21 tests. Docker Desktop is
not running, so a clean Supabase rebuild, executable pgTAP/RLS rehearsal and
migration counts remain mandatory before release. Playwright remains blocked
by local Vinext web-server readiness after the compatibility-date fix. No
database migration, release control, regulated listing permission or
deployment was changed.

### Open questions resolved by assumption

No clarification is required to plan safely. “All possible” is interpreted as
broad primary/farm-gate category coverage plus a custom long tail, not every
variety or processed food. Meat and milk are profile/produce categories, but
their selection does not itself authorize a listing or certify food safety.

## Addendum: deploy a purpose-limited managed operations fleet

This ExecPlan is a living document. The sections `Progress`, `Surprises &
Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must stay current
as the managed operations fleet is implemented. This addendum follows the
repository's `execution-plan` skill.

### Purpose / Big Picture

FarmerBook already has a consent-first outreach pipeline and one managed
Farmer-profile Durable Object. This milestone turns those foundations into a
day-to-day operating system with four independently pausable roles: Growth &
Outreach processes consented introductions and follow-ups; Profile Drafting
creates private citation-backed `Not verified` samples for eligible consented
Farmers; Verification Triage routes pending evidence without issuing a badge;
and Operations Supervisor records fleet health and fails closed. An
administrator can see every role, its schedule, last outcome and recent runs at
`/admin/agents`.

### Progress

- [x] (2026-08-12 IST) Audited the existing outreach, managed-profile,
      Cloudflare binding, release-control and administrator-console code.
- [x] (2026-08-12 IST) Added FB-REQ-016 and fixed the four role boundaries,
      safety invariants and observable administrator behavior.
- [x] (2026-08-12 05:17 IST) Added the forward-only private fleet-control, run, event and verification-
      triage database migration with administrator read RPCs and service-only
      execution RPCs.
- [x] (2026-08-12 05:17 IST) Added four SQLite Durable Object classes, bounded recurring schedules,
      internal authenticated processing, additive Wrangler migrations and
      Worker exports.
- [x] (2026-08-12 05:17 IST) Added real consent-bound outreach processing, private profile-draft
      processing, recommendation-only verification triage and supervisor health
      checks.
- [x] (2026-08-12 05:17 IST) Added the administrator fleet console and initialize/pause/resume/run-now
      actions without a browser-accessible Agent route.
- [x] (2026-08-12 05:17 IST) Added focused migration, runtime, configuration, action and component tests.
- [x] (2026-08-12 05:17 IST) Ran repository-wide TypeScript, ESLint, Vitest, build and diff checks;
      record exact outcomes and remaining production gates.
- [x] (2026-08-12 IST) Product owner selected Cloudflare Workers AI for the
      managed fleet; no third-party model API key is required.
- [x] (2026-08-12 IST) Reverified the exact release candidate with ESLint,
      TypeScript, 102 Vitest files/476 tests, a Vinext production build, all 30
      desktop/mobile Playwright journeys, a clean application of all 18
      migrations, and all three executable pgTAP/RLS suites.
- [ ] Authorize the Supabase CLI, identify separate staging and production
      project refs without guessing, and prove the staged dry-run, backup/
      restore, configured synthetic journeys, processor secret, and release
      controls before requesting the exact production mutation approval.
- [x] (2026-08-12 IST) Deployed the frozen default-off production artifact as
      Worker version `d3dddcf8-139a-4361-8f21-47b91ec9ce89` at 100% traffic,
      preserving the live `kdmt…` database, registered users and both custom
      domains. All post-deploy health, core-page and security-header checks
      passed; rollback target is `9c41aa57-d038-498f-b9ac-16cb954ef717`.
- [ ] Transfer or grant the approved Gmail account reviewed access to the
      existing `kdmt…` production Supabase organization. Do not point the live
      Worker at the newly created `sxo…` project because that would hide the
      existing users and data.

### Surprises & Discoveries

- Observation: the installed `agents@0.20.1` already provides idempotent
  `scheduleEvery`, persistent SQLite state and server-to-Agent RPC, while the
  current Worker deliberately does not expose `routeAgentRequest`.
  Evidence: `features/profile-agent/managed-agent.ts`, `vite.config.ts` and
  `tests/managed-profile-agent-config.test.ts`.
- Observation: the existing outreach processor is already the safe delivery
  boundary. It claims only consent-valid outbox rows, limits attempts to five,
  opens a circuit after three provider failures, handles STOP/suppression and
  attaches a private profile preview only to a valid invitation.
  Evidence: `features/outreach/processor.ts` and the 2026-08-09 through
  2026-08-10 outreach migrations.
- Observation: the Inc and managed-profile migrations each replaced the
  release-control key constraint without preserving every earlier key, so a
  clean ordered migration run could fail before reaching the fleet migration.
  Evidence: static comparison of
  `20260809140000_outreach_agent.sql`,
  `20260811120000_inc_sourcing.sql` and
  `20260811130000_managed_farmer_profile_agents.sql`; Docker is not running, so
  executable PostgreSQL confirmation is still pending. The unapplied local Inc
  migration now preserves `outreach_agent`, and the managed-profile migration
  preserves both `outreach_agent` and `inc_sourcing`, with regression assertions
  in their focused migration tests.

### Decision Log

- Decision: use four named Durable Object classes rather than one agent with
  unrestricted tools.
  Rationale: each role can have an independent schedule, batch limit, failure
  counter, pause control and audit history; compromise or provider failure in
  one role does not enable another role's powers.
  Date/Author: 2026-08-12 / Codex.
- Decision: keep Agent routes private and invoke them only through authenticated
  server actions or an internal bearer-protected processor endpoint.
  Rationale: public WebSocket/RPC routing would broaden the attack surface and
  let clients bypass the existing administrator and database controls.
  Date/Author: 2026-08-12 / Codex.
- Decision: autonomous profile drafting requires an already consented or
  qualified prospect with operator/provider-recorded evidence; it never starts
  broad web discovery.
  Rationale: the product owner rejected Brave and Tavily remains unapproved, so
  safe automation can process authorized work but cannot silently substitute a
  new search or scraping provider.
  Date/Author: 2026-08-12 / Codex.
- Decision: verification triage produces a recommendation only.
  Rationale: badges depend on signed provider/registry outcomes or an authorized
  review. A language model or follower count cannot prove identity or Farmer
  status.
  Date/Author: 2026-08-12 / Codex.

### Outcomes & Retrospective

Local implementation is complete. The administrator now has a four-role fleet
console, while Cloudflare state, PostgreSQL run/evidence records and the
existing consent/profile Workflows retain separate authority. ESLint and
TypeScript pass, 94 Vitest files/439 tests pass, both default-off and fully
enabled Vinext builds pass, `git diff --check` is clean, and Wrangler dry-run
recognizes all four new Durable Objects plus the existing approval Workflow.

Production must remain disabled until the new
migration is rehearsed against a clean Supabase database, the Worker secret and
database control are configured, an approved email/WhatsApp provider exists,
and a staged administrator verifies pause, retry, suppression and audit
behavior. Docker is stopped in this workspace, so executable PostgreSQL/pgTAP
evidence could not be produced. The code being present locally is not
deployment evidence, and no production mutation or contact occurred.

### Context and Orientation

`features/outreach/processor.ts` performs consent-bound delivery.
`features/profile-agent/managed-agent.ts` creates a private profile sample and
starts `FarmerProfileApprovalWorkflow`. `vite.config.ts` defines Cloudflare
bindings and additive SQLite-class migrations. `worker/index.ts` exports each
Durable Object and Workflow class. The new `features/managed-agents/` directory
will coordinate these existing capabilities; it must not duplicate the consent
ledger, suppression rules, invitation tokens or badge issuance logic.

### Plan of Work

Add a forward migration named
`supabase/migrations/20260812130000_managed_operations_agents.sql`. It adds a
private default-off release control, four seeded role records, bounded run and
immutable event ledgers, a recommendation-only verification-triage table,
administrator read/configuration functions, and service-role begin/finish
functions with idempotency and an automatic three-failure pause.

Add four exported Agent classes under `features/managed-agents/`. A shared base
class owns schedule installation, cancellation, state validation, authenticated
internal execution, retry policy and health updates. Each concrete class fixes
its role and default interval. Add the four bindings and one new additive
SQLite migration tag to `vite.config.ts`; do not edit the existing tag.

Add `app/api/managed-agents/run/route.ts`. It accepts only a 32-character-or-
longer bearer secret, both application and database controls, a known role and
an idempotency key. It begins a database run, dispatches bounded work to the
existing processors, records a redacted outcome and completes the run even
when a provider is unavailable. No raw contact, evidence, prompt or provider
secret is included in Agent state, events or responses.

Add `/admin/agents` with server-side administrator authorization. The page
shows readiness, four role cards, schedules, failure state and recent run
counts. Controls initialize/resume, pause and run a role now. Disabling occurs
in the database before cancelling the schedule; enabling configures the
database before installing the schedule. Every mutation records an actor and
idempotency key.

### Concrete Steps

Work from `/Users/ngonapa/Downloads/farmerbook`. Run focused tests after each
layer, then run `npm run typecheck`, `npm run lint`, `npm test`,
`npm run build`, and `git diff --check`. If Docker is available, run a clean
Supabase rebuild and the existing pgTAP suites before any production decision.

### Validation and Acceptance

With both controls false, internal processing returns `FEATURE_DISABLED`, no
schedule can enable useful work, and all four database records remain paused.
With controls enabled in a staging environment, an administrator can initialize
the fleet and see four independent schedules. Repeating initialization does not
duplicate schedules. Growth claims only consent-valid outbox rows. Profile
Drafting creates a private cited sample only for an eligible consented Farmer
and never publishes it. Verification Triage writes a recommendation without
changing `profile_verification_claims.state`. Three consecutive failed runs
disable only the affected role. Pausing Growth prevents new delivery claims
while STOP, webhook and suppression routes remain available.

### Idempotence and Recovery

Every administrator command and Agent run has a UUID idempotency key. Agent
recurring schedules are idempotent by callback, interval and payload. Database
run begin/finish functions lock the role row and reject overlapping leases.
Rollback disables the private database control first, pauses all roles, then
sets `ENABLE_MANAGED_OPERATIONS_AGENTS=false` and restores the prior Worker.
The additive tables and immutable audit records remain for evidence; do not
drop them during rollback.

### Interfaces and Dependencies

The implementation uses the installed `agents@0.20.1` package, the existing
managed Workers AI `AI` binding, Supabase service-role server client, and a new
`MANAGED_AGENT_PROCESSOR_SECRET` stored only as a Cloudflare secret. The public
configuration adds only `ENABLE_MANAGED_OPERATIONS_AGENTS`. The stable roles
are `outreach_growth`, `profile_drafting`, `verification_triage`, and
`operations_supervisor`.

Plan revision note (2026-08-12): added this self-contained managed-operations
fleet addendum after the product owner approved implementation. It narrows
autonomy to the already-approved consent, privacy and verification boundaries.

Plan revision note (2026-08-12 05:17 IST): marked the local fleet milestones
complete after repository-wide tests and Cloudflare dry-run. Recorded the
release-control constraint repair, deterministic test synchronization and the
remaining clean-database/provider/secret/staging gates; production stays off.

## Known Farmer Intake with Google-assisted research and YouTube — implementation addendum

### Status and authorization boundary

This addendum implements FB-REQ-017 from the product owner's 2026-08-12
direction: FarmerBook administrators need a Known Farmer Intake that builds a
private cited profile from Google research, official YouTube search and other
public professional information, with social links associated to each
resulting public Farmer profile.

Research is complete in `research.md` under “Known Farmer Intake,
Google-assisted research and YouTube discovery.” The product owner approved
this plan on 2026-08-12; local implementation is in progress.

Approval of this plan will authorize local source, migration, documentation and
test changes only. It will not authorize a Google/YouTube account mutation,
secret installation, a search for a real person, production migration, feature
or database-control enablement, invitation/contact, deployment or public
profile publication.

### Approach

Add an administrator-only `/admin/known-farmers` research workspace that
creates a private 30-day intake. It will build and open a bounded Google Search
query for human review, accept only administrator-selected destination URLs,
and search YouTube through the official YouTube Data API. Every source will be
classified as the Farmer's own social profile, third-party coverage, or another
professional reference before it can be selected.

The existing managed profile Agent, private sample tables, signed review
invitation, approval Workflow and onboarding prefill remain the downstream
pipeline. The new intake is an evidence-collection layer, not a second profile
system. It creates no contact candidate and cannot send, publish or verify.

```text
/admin/known-farmers
  -> create private intake + relationship confirmation
  -> open/copy Google query -> add selected destination sources
  -> official YouTube search -> classify/select attributed candidates
  -> validate professional evidence + owned social link
  -> existing outreach prospect (no contacts)
  -> existing managed private Not verified sample + approval Workflow
  -> consent-bound invitation/claim/onboarding (existing)
```

Google Search cannot be called as a retained discovery API. Custom Search JSON
is closed to new customers; Gemini grounding terms prohibit collecting its
links to build the profile database. The implementation must never fetch a
Google result page, store a Google snippet, or describe manual results as API
data. The admin selects the destination page and FarmerBook applies the normal
destination-source policy.

### 1. Add forward-only private intake persistence

**File:** `supabase/migrations/20260812140000_known_farmer_intake.sql`

Create `known_farmer_intakes` with:

- administrator `created_by`;
- `subject_name`, optional `location_hint`, `farming_hint`, preferred locale;
- bounded relationship basis: `founder_known`, `team_known`,
  `in_person_meeting`, or `trusted_partner_referral`;
- `relationship_confirmed_at` but no publicly displayed relationship note;
- states `researching`, `research_incomplete`, `ready_to_build`, `built`,
  `rejected`, `expired`;
- optional links to the existing outreach prospect and managed sample;
- unique creation/build idempotency keys, revision, 30-day retention and
  timestamps.

Create `known_farmer_source_candidates` with:

- intake and canonical HTTPS destination URL;
- `website`, `youtube`, `instagram`, `facebook`, `linkedin` or
  `other_social` source type;
- bounded title/excerpt/hash;
- discovery method `manual_google_review`, `youtube_data_api`, or
  `operator_supplied`;
- subject association `owned_social_profile`, `third_party_coverage`, or
  `professional_reference`;
- provider item ID/query hash when applicable, candidate decision, collection,
  refresh and expiry timestamps;
- uniqueness on intake plus normalized destination URL/source hash.

Create `known_farmer_youtube_searches` for database-owned quota reservation and
completion. Cap the default project usage below YouTube's 100/day default
bucket (50/day total), plus 10/day and 100/month per administrator. Count every
reserved attempt because even invalid provider calls consume quota. Record
idempotency, query hash, result count and bounded failure code without storing
the API key or raw response.

Add security-definer RPCs with fixed search paths:

```sql
create function public.create_known_farmer_intake(
  intake_input jsonb, idempotency_key_input uuid
) returns table(code text, intake_id uuid, revision integer);

create function public.reserve_known_farmer_youtube_search(
  intake_id_input uuid, query_hash_input text, idempotency_key_input uuid
) returns table(code text, search_id uuid);

create function public.complete_known_farmer_youtube_search(
  search_id_input uuid, outcome_input jsonb
) returns table(code text, state text);
```

Authenticated execution must require `is_admin()` and both existing database
controls (`outreach_agent`, `profile_research_agents`). Candidate mutation and
intake/sample linkage use service-role-only RPCs. Enable RLS and revoke table
access from `public`, `anon` and ordinary `authenticated`. Grant only the
narrow administrator RPCs. Add retention indexes and keep suppression/consent
records outside deletion cascades.

Extend `managed_profile_sample_sources` through this migration with nullable
`subject_association` and the new discovery methods. Preserve old Brave rows
and constraints. Do not edit `20260811130000_managed_farmer_profile_agents.sql`.

### 2. Define strict intake, source and provider contracts

**Files:**

- `features/profile-agent/schemas.ts`
- `features/profile-agent/known-farmer-schemas.ts` (new)
- `features/profile-agent/schemas.ts`

Add typed schemas for intake creation, a selected source, candidate decisions,
YouTube search and final build. Reuse the existing `safeText`, URL, locale and
agriculture bounds where possible. Limit each intake to 12 selected sources and
five retained YouTube results.

Extend profile evidence with a required association for new intake evidence:

```ts
subjectAssociation: z.enum([
  "owned_social_profile",
  "third_party_coverage",
  "professional_reference",
]);
discoveryProvider: z.enum([
  "brave_search",
  "manual_google_review",
  "youtube_data_api",
  "operator_supplied",
]).optional();
```

Provider provenance combinations must be exact rather than “all optional.” A
Google-reviewed source stores only destination-page evidence, discovery method
and query hash. YouTube evidence stores the provider item ID/query hash and a
30-day refresh/expiry. Operator-supplied sources have no provider query.

### 3. Implement a Google research-link helper, never a Google scraper

**File:** `features/profile-agent/google-research-link.ts` (new)

Build one normalized, at-most-400-character query from full name, agriculture,
location and farming hints. Return both text and a `https://www.google.com/search`
URL using `URLSearchParams`. Do not perform `fetch` in this module.

```ts
export function buildKnownFarmerGoogleResearch(input: KnownFarmerHints) {
  const query = [`"${cleanName}"`, "farmer agriculture", location, farming]
    .filter(Boolean).join(" ").slice(0, 400);
  const url = new URL("https://www.google.com/search");
  url.searchParams.set("q", query);
  return { query, url: url.toString() };
}
```

The UI must label this `Open Google Search` and `Copy query`, use
`rel="noreferrer"`, and explain that FarmerBook stores only selected destination
pages. No Google result title/snippet may be accepted as evidence without the
destination source itself.

### 4. Add the official bounded YouTube search adapter

**File:** `features/profile-agent/youtube-search.ts` (new)

Read `YOUTUBE_DATA_API_KEY` only on the server. Call documented
`GET https://www.googleapis.com/youtube/v3/search` with:

- `part=snippet`;
- a bounded exact-name/agriculture/location query;
- `type=channel,video`;
- `regionCode=IN`, locale-derived `relevanceLanguage`, `safeSearch=strict`;
- `maxResults=10`, returning at most five exact-name/agriculture-relevant
  candidates.

Use an eight-second timeout, 250 KB maximum response, `redirect: "error"`, one
attempt only, and explicit 401/403/429/unavailable/malformed/no-match errors.
Do not request or retain statistics, thumbnails, comments, transcripts,
audiovisual content or cookies. Canonicalize candidate URLs to
`youtube.com/channel/<id>` or `youtube.com/watch?v=<id>` and retain only bounded
title/description text plus the provider item ID/channel ID. Every returned UI
item must show that YouTube is the source.

**Files:** `.env.example`, `README.md`, `docs/PRODUCTION_RUNBOOK.md`

Document `YOUTUBE_DATA_API_KEY` as a Cloudflare secret installed only after API
project/terms/privacy approval. Do not pass it through `vite.config.ts` public
vars, client props, logs, tests or checked-in configuration.

### 5. Add server actions for the staged intake

**File:** `features/profile-agent/known-farmer-actions.ts` (new)

Implement:

1. `createKnownFarmerIntakeAction` — validates, requires admin, records the
   relationship confirmation and returns the Google query/link.
2. `searchKnownFarmerYouTubeAction` — checks flags/configuration, reserves DB
   quota before the provider call, stores at most five private candidates and
   completes the ledger. It never automatically selects or associates one.
3. `addKnownFarmerSourceAction` — accepts an administrator-selected destination
   URL. It reuses the safe website fetcher for ordinary websites. Social URLs
   remain no-fetch and require a pasted visible description or already
   sanitized screenshot/OCR evidence through the existing policy.
4. `decideKnownFarmerCandidateAction` — records selected/rejected plus explicit
   owned-profile/coverage/reference association. A video result defaults to
   coverage and requires a deliberate override to be an owned profile.
5. `buildKnownFarmerProfileAction` — requires at least one selected professional
   source, completed social discovery and at least one selected
   `owned_social_profile` on a supported social host. It creates one no-contact
   Farmer outreach prospect, passes the selected multi-source evidence through
   the existing Agent/sample/Workflow code, and links the intake idempotently.

Refactor `generateAndSaveManagedProfileSample` from
`features/profile-agent/actions.ts` into a small shared server-only helper if
needed. Do not duplicate Workflow/fingerprint/save behavior. Partial failures
must be safely replayable: a saved prospect or sample is reused, never
duplicated, and the intake remains private.

No action may call a provider before feature checks, admin authorization,
configuration and database quota reservation succeed. No action creates a
contact candidate, consent, outbox row, invitation or public profile.

### 6. Make social-link extraction association-aware

**File:** `features/profile-agent/profile-builder.ts`

Change deterministic social extraction so a social-host URL populates
`sample.socialLinks` only when `subjectAssociation ===
"owned_social_profile"`. Third-party YouTube videos, news pages and partner
social posts remain citations. Include association in the AI prompt and require
the model to follow the same rule.

After parsing model output, deterministically rebuild or validate social links
from owned-profile evidence so an AI output cannot promote coverage into an
owned account. Bump `PROFILE_SAMPLE_PROMPT_VERSION` and preserve fallback
behavior.

### 7. Add the administrator Known Farmer workspace

**Files:**

- `app/(product)/admin/known-farmers/page.tsx` (new)
- `features/profile-agent/known-farmer-intake.tsx` (new)
- `app/(product)/admin/outreach/page.tsx`
- `app/globals.css`

The route requires `requireAdmin()` and shows:

- Farmer name, location/farming hints, language and bounded “known through”
  choice with a mandatory relationship confirmation;
- generated Google query with `Open Google Search` and `Copy query` controls;
- official YouTube search and clearly attributed candidate cards;
- a multi-source destination form for public pages and social URLs;
- source decision controls: `Farmer's own profile`, `Coverage about Farmer`,
  `Professional reference`, or reject;
- readiness summary: evidence count, social discovery state, proposed owned
  social links and blocking reasons;
- `Build private Not verified sample` only when readiness passes.

Use text-only YouTube candidate cards to avoid copying thumbnails/media. Keep
contact values, personal relationship details and raw provider responses out of
the page. Add reciprocal navigation between this route, `/admin/outreach` and
`/admin/agents`.

### 8. Preserve Farmer review and make the social requirement honest

**Files:**

- `features/profile-agent/sample-preview.tsx`
- `features/profiles/onboarding-form.tsx`
- `features/onboarding/onboarding-flow.tsx` only if the canonical flow is active
- `features/profiles/public-farmer-profile.tsx`
- English/Hindi/Marathi message catalogs used by these surfaces

In the private preview, distinguish `Proposed own social profiles` from
third-party citation links and tell the Farmer to remove/replace incorrect
links during onboarding. Existing approve/reject remains; approval does not
publish.

For a claimed known-Farmer sample, prevent public-profile enablement until the
Farmer confirms or replaces at least one supported social URL. Account creation
and private onboarding must remain possible when a Farmer has no social
account; the truthful state is “not ready for public publication,” not a fake
link. Do not globally make `profileSchema` require social links, which would
break edits for legacy Farmers.

Always render the public social section. If a legacy/private profile has no
approved links, show localized `No farmer-approved social links yet` instead of
an empty row. A pasted/approved link must be labeled only as linked; it does not
create `Social presence verified`, identity or Farmer-role claims.

### 9. Tests and evidence

**New focused tests:**

- `tests/known-farmer-google-research.test.ts`
- `tests/known-farmer-youtube-search.test.ts`
- `tests/known-farmer-intake-actions.test.ts`
- `tests/known-farmer-intake-migration.test.ts`
- `tests/known-farmer-intake-console.test.tsx`

**Updated tests:** managed profile schemas/builder/action/preview, public Farmer
profile, onboarding, production runbook and environment configuration.

Prove:

- Google helper returns only a browser link/query and performs no fetch;
- YouTube calls only the documented API, is bounded/attributed, stores no media
  or statistics, handles auth/quota/timeout/oversize/malformed/no-match without
  retry, and never runs while disabled/unconfigured;
- database quotas are idempotent, per-admin and project-wide;
- candidates stay private and expire/refresh within 30 days;
- a third-party YouTube video can support a claim but cannot populate
  `socialLinks.youtube`;
- owned social association requires an explicit admin decision and Farmer
  approval/replace opportunity;
- build requires evidence plus an owned social candidate, deduplicates sources,
  and creates no contact/consent/outbox/public-profile/badge row;
- signed preview, rejection redaction, claim linkage and existing-user field
  preservation continue to pass;
- missing social links render an honest public empty state;
- `anon` and ordinary users cannot read/write intake/search/candidate rows or
  invoke administrator/service functions;
- disabled flags/database controls fail before provider or mutation work.

Run focused tests after each layer, then:

```bash
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```

If Docker is available, run a clean Supabase rebuild and all pgTAP/RLS suites.
If it is unavailable, report the database execution gap explicitly and do not
claim production readiness.

### 10. Documentation, rollout and rollback

Update `README.md`, `docs/REQUIREMENTS.md`, `docs/PRODUCTION_RUNBOOK.md`,
`implementation-log.md` and `.structured-dev-state` with exact local evidence.
Replace the obsolete Brave/Tavily open question for this Known Farmer path;
retain Tavily only as a separate possible general candidate-discovery provider.

Production prerequisites are: Google Cloud project with YouTube Data API,
server-only key restrictions, provider-policy/privacy review, named retention
and deletion owner, database migration rehearsal, direct RLS/RPC evidence,
synthetic staging intake, quota/monitoring alerts and separate release approval.

Roll back by disabling `profile_research_agents` in the private database first,
then `ENABLE_PROFILE_RESEARCH_AGENT`; revoke the YouTube key and restore the
previous Worker. Preserve immutable audit/suppression/consent records. Let
private intake/candidate/sample retention cleanup run or delete through a
reviewed privacy operation; do not drop forward tables or rewrite migration
history.

### Detailed implementation todo list

- [DONE] Add strict Known Farmer intake/source/search schemas and association types.
- [DONE] Add Google query/link helper with no fetch capability.
- [DONE] Add bounded official YouTube Data API adapter and server-only configuration.
- [DONE] Add forward-only private intake/candidate/quota migration and grants.
- [DONE] Add pgTAP/static migration coverage for RLS, quotas, retention and gates.
- [DONE] Add staged server actions with authorization, idempotency and no-contact guarantees.
- [DONE] Refactor shared sample generation without altering existing approval behavior.
- [DONE] Make deterministic/AI social extraction association-aware and bump prompt version.
- [DONE] Add `/admin/known-farmers` and multi-stage intake UI with Google/YouTube attribution.
- [DONE] Add social-link readiness summary and block private-sample build when missing.
- [DONE] Clarify proposed social links in the Farmer review/onboarding journey.
- [DONE] Add the localized public missing-social state without breaking legacy edits.
- [DONE] Run focused provider/action/schema/component tests continuously.
- [DONE] Run full TypeScript, lint, Vitest, build and diff gates.
- [DONE] Run clean Supabase/pgTAP/RLS evidence if local infrastructure is available.
- [DONE] Update requirements, runbook, implementation log and state with exact evidence.
- [DONE] Stop before any provider account/key, real-person search, invitation or production mutation.

Plan revision note (2026-08-12): created after deep local and official-provider
research. The plan uses a human-reviewed Google destination workflow because no
current Google interface permits automated link collection into FarmerBook's
stored cited-profile database. It uses the official YouTube Data API with a
separate quota/retention/attribution boundary and requires a Farmer-approved
owned social link before public publication.

## Featured Farmer editorial profiles correction addendum (approved)

This addendum supersedes the user-facing objective and downstream architecture
of the preceding Known Farmer Intake section. That implementation remains
disabled and is not production work. The useful research/provider controls are
retained, but a personal FarmerBook relationship and member-profile claim flow
are explicitly removed from the new path.

### Outcome

After this plan is implemented, a FarmerBook administrator can research a named
farmer through Web Search, official YouTube discovery and other permitted public
sources; document why that farmer's work is significant; create a source-bound
editorial story; review it; and explicitly publish it to a beautiful public
Featured Farmers collection. Every published story has at least one confirmed
Farmer-owned social link, claim-level citations, a fact-check date, media-rights
metadata or a designed no-photo fallback, and a correction/removal route.

The output is a FarmerBook editorial article, not a FarmerBook account. It does
not create followers, activity, reviews, listings, buyer enquiries, verification
claims, contact consent, outreach work or an implication that the subject is a
member or endorses FarmerBook.

```text
/admin/featured-farmers
  -> subject name + location/farming hints + significance hypothesis
  -> open/copy Web Search query families
  -> official bounded YouTube candidate search
  -> select sources and classify quality/association
  -> author claim rows; each claim must cite selected source(s)
  -> generate/edit bounded story sections from approved claims only
  -> rights check + social-account check + editorial review
  -> explicit publish RPC creates public snapshot
        |
        +--> /featured-farmers
        +--> /featured-farmers/[slug]
              -> editorial disclosure, story, impact, social, sources,
                 fact-check date and correction/removal link
```

### 1. Add a forward-only editorial data domain

**File:** `supabase/migrations/20260812150000_featured_farmer_profiles.sql`

Keep `20260812140000_known_farmer_intake.sql` unchanged and default-disabled.
Create new private-first tables:

- `featured_farmer_research`: creator, name, public location/farming hints,
  authored locale, bounded significance hypothesis, state, revision,
  idempotency keys, created/updated timestamps and private retention metadata;
- `featured_farmer_sources`: research id, canonical HTTPS URL, source kind,
  publisher/title/publication date, bounded private excerpt/hash, discovery
  method/query hash/provider ID, association, quality classification,
  selected/rejected decision, reviewed-by/time, refresh/expiry and revision;
- `featured_farmer_drafts`: research id, canonical slug, headline, deck,
  why-featured statement, ordered bounded story-section JSON, category slugs,
  authored locale, editorial limitations, reviewer/state/revision timestamps;
- `featured_farmer_claims`: draft id, bounded claim type, statement, optional
  display label/value/context, display order and review state;
- `featured_farmer_claim_sources`: claim/source join with an optional bounded
  support note;
- `featured_farmer_social_links`: draft id, platform, canonical owned account
  URL, confirming source, ownership-basis note, reviewer/time and display order;
- `featured_farmer_media`: optional stored asset reference, alt text, credit,
  rights basis, source/permission reference and approval timestamp;
- `featured_farmer_publications`: immutable public snapshot JSON, slug,
  publication/revision/fact-check dates, publisher/reviewer and withdrawn state;
- `featured_farmer_events`: immutable bounded admin audit events; and
- a YouTube search ledger for this new research id, reusing the existing project
  quota ceiling rather than creating a separate provider allowance.

Use database checks for bounded text/JSON sizes, supported locales/source kinds,
unique canonical URLs/slugs, rights bases, valid state transitions and exact
social profile URLs. Enable RLS and revoke all private-table access from
`public`, `anon` and ordinary `authenticated`. Only `is_admin()` RPCs may mutate
research/drafts; candidate save/build internals are service-role only. Anonymous
read access is through a narrow view/RPC that returns current, non-withdrawn
publication snapshots and no private excerpts, queries, hashes or audit data.

Add a separate `featured_farmer_profiles` database release control. It defaults
false and is independent of `outreach_agent`; no editorial function may create
rows in outreach, consent, invitation, member profile, verification, messaging,
listing or enquiry tables.

Publication readiness is deterministic:

```sql
selected professional sources on distinct hosts >= 2
and authoritative-or-independent source count >= 1
and approved significance claims >= 2
and every published claim has >= 1 selected source
and confirmed owned social links >= 1
and media is absent or rights-approved
and editorial reviewer/fact-check timestamp are present
```

`publish_featured_farmer` must lock the draft, re-evaluate all gates, check the
expected revision and slug, create one immutable snapshot idempotently and emit
an audit event. `withdraw_featured_farmer` makes public reads fail immediately
without deleting the audit/source record. A later republish creates a new
snapshot revision rather than mutating old published evidence invisibly.

### 2. Define strict editorial and research schemas

**Files:**

- `features/featured-farmers/schemas.ts` (new)
- `features/featured-farmers/source-policy.ts` (new)
- `features/profile-agent/social-link-policy.ts`
- `lib/feature-flags.ts`
- `.env.example`

Define shared Zod contracts matching the database bounds. The core draft shape
should be structured rather than generated HTML:

```ts
const featuredFarmerDraftSchema = z.object({
  fullName: safeText(2, 100),
  slug: safeSlug,
  locale: z.enum(SUPPORTED_LOCALES),
  location: z.object({ district: safeText(2, 100).optional(), state: indiaState.optional() }),
  headline: safeText(8, 180),
  deck: safeText(20, 360),
  whyFeatured: safeText(40, 900),
  sections: z.array(z.object({
    kind: z.enum(["origin", "work", "impact", "community", "lessons"]),
    heading: safeText(2, 120),
    body: safeText(40, 2_500),
    claimIds: z.array(z.uuid()).min(1).max(12),
  })).min(3).max(7),
  categorySlugs: z.array(categorySlug).max(8),
});
```

Source quality values are `official_record`, `institutional_reference`,
`independent_reporting`, `first_party`, `owned_social_profile` and
`third_party_coverage`. Discovery method stays separate from evidence quality:
`manual_google_review`, `youtube_data_api` or `operator_supplied` initially.

Reuse the existing account-URL parser so posts, reels, groups, watch URLs and
third-party channels cannot become owned social links. Extend it only if tests
show a currently supported official account URL is incorrectly rejected. A
confirmed social URL is a link, not an OAuth verification claim.

Add `ENABLE_FEATURED_FARMER_PROFILES`, server-only and default false. Do not add
a Tavily/Brave key in this tranche. Tavily remains a future discovery-adapter
decision and must fit the same source/provenance contract.

### 3. Generalize the existing Web Search and YouTube helpers

**Files:**

- `features/featured-farmers/web-research.ts` (new)
- `features/profile-agent/google-research-link.ts`
- `features/profile-agent/youtube-search.ts`
- `features/featured-farmers/youtube-search.ts` (thin editorial adapter if
  necessary)

Extract neutral bounded helpers without breaking disabled old imports. Build
separate query families for identity/farming, significance, institutions,
social presence and current/conflicting information. Return query text and a
normal Google Search URL only; do not fetch Google, accept its snippets as
evidence or store result-page content.

```ts
type ResearchQuery = {
  purpose: "identity" | "significance" | "institutions" | "social" | "current";
  query: string;
  url: string;
};

export function buildFeaturedFarmerResearchQueries(input: ResearchHints): ResearchQuery[];
```

Reuse the official YouTube Data API request, timeout, response limit, canonical
URLs and text-only candidates. Reserve quota in the database before calling the
provider and treat every result as pending. Channel results may be classified
owned only after manual review; video results default to coverage. Keep API keys,
raw responses, thumbnails, statistics, transcripts and media out of storage.

### 4. Add source, claim, story and publication services

**Files:**

- `features/featured-farmers/actions.ts` (new)
- `features/featured-farmers/queries.ts` (new)
- `features/featured-farmers/story-builder.ts` (new)
- `features/featured-farmers/publication.ts` (new)
- `features/outreach/fetch-source.ts`
- `lib/cloudflare-bindings.ts` only if the existing Workers AI binding is reused

Implement administrator actions for: create research, search YouTube, add a
reviewed destination, select/reject/classify a source, create/edit a claim,
link/unlink claim sources, confirm/remove an owned social link, save media-rights
metadata, build/update a story draft, mark review-ready, publish and withdraw.
Every action requires admin authorization, feature/database gates, strict schema
validation, expected revision and idempotency where it can create a row.

For ordinary public websites, reuse the bounded SSRF-safe fetcher only where its
source policy permits. Protected social pages remain no-fetch and require a
reviewed description or transient sanitized screenshot extraction. Do not
retain raw screenshots.

The story builder may use the existing managed Workers AI binding to propose
copy, but it receives only approved claims and bounded source excerpts, treats
them as untrusted, and returns the strict structured schema. It must never
invent a claim, number, URL, quote, award, organization or social account.
After parsing, deterministically verify that every section's claim IDs exist and
that every claim has selected sources; otherwise fall back to a conservative
template. Generated output always remains a private editable draft.

Do not call `create_outreach_prospect`, `generateAndSaveManagedProfileSample`,
the approval Workflow or member onboarding. Optional claim-by-subject is only a
link from the editorial story to a separately created, authenticated member
profile after a future explicit flow.

### 5. Build the administrator Featured Farmers newsroom

**Files:**

- `app/(product)/admin/featured-farmers/page.tsx` (new)
- `app/(product)/admin/featured-farmers/[researchId]/page.tsx` (new)
- `features/featured-farmers/editorial-console.tsx` (new)
- `features/featured-farmers/source-review.tsx` (new)
- `features/featured-farmers/story-editor.tsx` (new)
- `app/(product)/admin/known-farmers/page.tsx`
- `app/(product)/admin/outreach/page.tsx`
- `app/globals.css`

Replace “Stage 1 · relationship attestation” with a newsroom-style workspace:

1. subject and significance hypothesis;
2. five Web Search query cards plus official YouTube search;
3. source cards with publisher/date/quality/association/decision;
4. structured significance claims with visible source linkage;
5. story-section editor and visual preview;
6. owned social and media-rights checks;
7. deterministic readiness checklist; and
8. explicit publish/withdraw controls with revision-conflict feedback.

Show missing evidence honestly. Never display search ranking or follower count
as significance. Keep private excerpts and provider/debug data out of public
previews. The old `/admin/known-farmers` page should redirect to
`/admin/featured-farmers` with a one-time explanatory notice; do not expose a
new personal-relationship form. Preserve disabled historical rows and remove
the old route label from admin navigation.

### 6. Build a beautiful public Featured Farmers collection

**Files:**

- `app/featured-farmers/page.tsx` (new)
- `app/featured-farmers/[slug]/page.tsx` (new)
- `features/featured-farmers/featured-farmer-card.tsx` (new)
- `features/featured-farmers/featured-farmer-story.tsx` (new)
- `components/public-header.tsx`
- `components/public-footer.tsx`
- `app/sitemap.ts`
- `app/globals.css`
- the English/Hindi/Marathi message catalogs for shared shell/disclosures

The index uses the existing Deccan editorial palette, spacious typography,
permissioned images or designed crop fallbacks, and one concise impact-led deck
per farmer. The story page includes:

- a visible “FarmerBook editorial profile” disclosure and fact-check date;
- a large visual hero, name, headline, district/state and owned social buttons;
- a “Why featured” block;
- sourced impact facts with numbered citation links;
- ordered long-form story sections;
- agriculture focus chips and optional sourced milestone timeline;
- selected interview/coverage links distinguished from owned accounts;
- a complete numbered source list; and
- a support-email `Suggest a correction, removal, or claim` link carrying only
  the public story URL/slug, never private research data.

If no rights-approved photo exists, render a deliberate branded fallback and no
fake person image. Do not copy or hotlink images found through search. Omit all
member-profile elements: verified/community badge, followers, following,
connection, enquiry, current harvest, activity, reviews, identity card and
marketplace CTAs.

Generate canonical metadata and JSON-LD as an `Article` about a `Person`, with
`sameAs` only for confirmed owned links, citations, publisher, published/
modified dates and correction URL where applicable. Do not emit `ProfilePage`,
interaction counts, FarmerBook verification, or membership semantics for an
unclaimed subject. Add only published, non-withdrawn URLs to the sitemap.

### 7. Tests and release evidence

**Focused unit/component tests:**

- Web Search query families are bounded and perform no fetch;
- source kinds, quality and association are separate and validated;
- two-domain/authoritative-source/two-claim significance readiness;
- every displayed claim has selected source linkage;
- owned social URLs reject posts/videos/groups/coverage and accept supported
  account pages;
- photo publication requires an approved rights basis while no-photo fallback
  remains publishable;
- story generation cannot introduce unknown claim IDs or URLs;
- publication is admin-only, gate-controlled, revision-safe, idempotent and
  immutable; withdrawal removes anonymous visibility;
- ordinary users and anonymous callers cannot read research/excerpts/audits;
- public views return only published snapshot fields;
- public cards/story render disclosure, source list, social links, fact-check
  date and correction path;
- public pages contain no member, verification or commerce controls;
- metadata uses `Article` about `Person`, not unclaimed `ProfilePage` semantics;
- old admin route redirects and no relationship form remains user-facing; and
- no editorial action creates prospect/contact/consent/invitation/member/
  verification/message/listing/enquiry data.

Run focused tests after each layer, then:

```bash
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
supabase db reset
supabase test db
npm run test:e2e
```

Add desktop/mobile Playwright journeys for empty index, published index/story,
admin research/readiness, no-photo fallback, 404/withdrawn story and citation/
social/correction links. Capture and visually inspect representative desktop and
mobile screenshots. Test keyboard navigation, headings, link names, focus,
contrast, reduced motion and no horizontal overflow.

No real farmer should be researched during automated tests; all fixtures must
be unmistakably fictional and `noindex` unless they are isolated test-only data.

### 8. Documentation, rollout and rollback

**Files:** `README.md`, `docs/REQUIREMENTS.md`,
`docs/PRODUCTION_RUNBOOK.md`, `implementation-log.md`, `.structured-dev-state`

Document selection criteria, source hierarchy, social ownership, media rights,
editorial disclosure, corrections/removal, annual fact-check cadence, privacy
exclusions and the exact distinction between editorial stories and member
profiles. Record the old Known Farmer flow as superseded and disabled.

Before production: name the editorial/privacy owner; obtain policy/legal review
for public living-person profiles and DPDP handling; approve the first named
subjects; confirm rights for every image; rehearse the migration on staging;
prove RLS/public-view boundaries; install the YouTube key only if that search is
enabled; run configured synthetic staging journeys; and request separate
approval for production migration, feature control, deployment and the first
real publication.

Rollback by disabling `featured_farmer_profiles` in the database first and
`ENABLE_FEATURED_FARMER_PROFILES` in the Worker, which removes all public reads
without deleting source/audit/history. Withdraw a disputed individual story
immediately through the RPC. Restore the previous Worker if necessary and use a
reviewed forward correction for schema defects; do not rewrite applied migration
history or delete correction/audit evidence outside the privacy procedure.

### Detailed implementation todo list

- [DONE] Add the forward-only private research, source, draft, claim, social,
  media, publication, event and quota schema.
- [DONE] Add release control, RLS, grants, anonymous publication view/RPC and
  executable pgTAP coverage.
- [DONE] Add strict editorial/source/claim/media/publication schemas.
- [DONE] Generalize bounded Web Search query families without Google fetching.
- [DONE] Reuse the official YouTube adapter under the editorial quota ledger.
- [DONE] Add source review, claim linkage and significance-readiness services.
- [DONE] Add structured story generation with deterministic claim/URL validation.
- [DONE] Add admin create/edit/review/publish/withdraw actions with idempotency and
  revision checks.
- [DONE] Build `/admin/featured-farmers` and redirect the obsolete admin route.
- [DONE] Build `/featured-farmers` and `/featured-farmers/[slug]` with the Deccan
  editorial design, rights-cleared original photographs, and an image-free state
  when no approved original is available.
- [DONE] Add public citations, owned social links, fact-check disclosure and
  correction/removal/claim path.
- [DONE] Add Article/Person metadata and published-only sitemap entries.
- [DONE] Add English/Hindi/Marathi shell and disclosure messages without
  machine-translating sourced claims.
- [DONE] Add focused schema/action/migration/component/metadata tests.
- [DONE] Run TypeScript, ESLint, Vitest, build and diff gates continuously.
- [DONE] Run clean Supabase/pgTAP/RLS and desktop/mobile Playwright/visual/a11y
  evidence.
- [DONE] Update requirements, runbook, implementation log and structured state.
- [DONE] Stop before provider account/key, real-person research, publication,
  production migration/control, deployment or other production mutation.

Plan revision note (2026-08-12): this replacement follows the product owner's
clarification that eligibility is significant public work, not personal
familiarity. The separate editorial domain avoids impersonating a member,
retains the safe Web Search/YouTube/source controls, requires sourced significance
and an owned social account, and makes publication, corrections and image rights
explicit. The product owner approved this addendum on 2026-08-12.

Release note (2026-08-13): after explicit deployment approval, FarmerBook
published and expanded a static historical pilot for L. Narayana Reddy. Nine
linked sources support seven original narrative chapters, eight milestones, six
reader questions and ten claim-level citation groups. Because no
verified account owned by the deceased subject was found, two YouTube links are
labelled third-party archival coverage and the limitation is stated on-page; no
account ownership is inferred. The product owner subsequently required original
images only. Unsung marks its photographs © Mahesh Bhat and no reuse licence or
written permission was found, so the generated illustration was removed from the
repository and production. At the product owner's subsequent direction, the
profile now displays the official `Sarala Virala` YouTube documentary preview as
a real source-hosted portrait. It is not copied into FarmerBook assets, links to
the full documentary and visibly credits Naguvana Creations and YouTube. A
separately hosted hero photograph still requires documented republication rights.
Canonical metadata, Article/Person/Organization/Breadcrumb structured data,
visible citations, the public sitemap and robots rules support conventional and
AI-assisted search discovery without claiming or guaranteeing ranking. Worker
version `b41699f0-ca4b-4887-b277-4a7839c96c82` serves the article at 100%
traffic. The database migration, editorial release control, provider integrations
and dynamic newsroom publication remain unapplied and disabled.
## Private Farmer Database and YouTube Discovery addendum — implementation

### Status and approval boundary

Research and planning are complete. The product owner approved this addendum
on 2026-08-13 for local implementation and tests only. This addendum
reframes the requested YouTube-to-email pipeline to comply with YouTube's
current API developer policies and FarmerBook's existing consent requirements.

The deliverable is:

- an owner-only Farmer contact database containing email and phone values that
  farmers supplied or consented to share for a recorded FarmerBook purpose;
- an administrator-only, on-demand YouTube Discovery view using the official
  Data API, with transient search results and no contact extraction;
- email integration through the existing outreach provider only for records
  with active, purpose-matched email consent; and
- WhatsApp intentionally absent until a separately approved official Business
  Platform tranche.

The implementation will not build a permanent email/phone database from
YouTube channels and will not send unsolicited email. YouTube's official policy
guide explicitly prohibits harvesting or storing usernames, full names, email,
and phone data without consent. Public contact visibility is not consent.

### Progress

- [x] (2026-08-13) Audited the existing outreach, managed-agent, YouTube,
  administrator, Supabase/RLS, feature-flag, Worker binding, and test paths.
- [x] (2026-08-13) Checked current official YouTube API resources, quota rules,
  storage rules, and the prohibition on contact/user-data harvesting.
- [x] (2026-08-13) Selected an owner-scoped encrypted contact database plus a
  separate transient YouTube discovery view.
- [x] (2026-08-13) Product owner approved this compliant scope for local
  implementation and tests only.
- [x] (2026-08-13) Implemented the forward migration, feature modules, administrator UI,
  interest/consent intake, transient discovery, and existing email handoff.
- [x] (2026-08-13) Completed unit, database, browser, build, privacy, and rollback evidence.
- [ ] Obtain separate approval before any production migration, secret, flag,
  provider, real contact import, search, send, schedule, or deployment.

### Decision log

- Decision: Do not extract email or phone data from YouTube API responses,
  channel descriptions, or scraped YouTube pages.
  Rationale: YouTube's current developer-policy guide identifies usernames,
  full names, email, and phone as user data that API clients must not harvest or
  store without consent. It also requires refresh/deletion of stored API data.
  Date/Author: 2026-08-13 / Codex; approved by the product owner.
- Decision: Populate the private database through direct Farmer interest forms,
  existing FarmerBook membership, approved partner/FPO consent campaigns, or a
  manual import with verifiable channel/purpose consent evidence.
  Rationale: This produces useful contacts while preserving a provable path to
  consent and withdrawal.
  Date/Author: 2026-08-13 / Codex; approved by the product owner.
- Decision: Keep YouTube discovery on demand and transient for the low-budget
  pilot instead of running a 24/7 scheduled crawler.
  Rationale: A permanent discovery queue would add privacy/platform-policy risk
  and operating cost without creating a lawful email recipient. Current results
  are useful for market research and partner targeting without retention.
  Date/Author: 2026-08-13 / Codex; approved by the product owner.
- Decision: Reuse the current consent-checked outreach provider and outbox; do
  not introduce another email sender or force-send route.
  Rationale: The existing SQL and processor already enforce consent,
  idempotency, suppression, provider events, reply handling, and auditability.
  Date/Author: 2026-08-13 / Codex; approved by the product owner.

### Data flow

```text
Farmer interest form / existing member / approved partner consent
                              |
                              v
               owner-only encrypted contact database
                              |
                    active email consent?
                         /          \
                       no            yes
                       |              |
                  never queue     existing outreach outbox
                                      |
                                approved email provider

Administrator query --official YouTube API--> transient discovery results
                                                |
                                         open original channel
                                                |
                                    no contact extraction/storage
```

Discovery and contact acquisition are deliberately separate. No YouTube result
can be promoted directly to a contact or outbox row.

### 1. Add a forward-only, owner-scoped contact schema

**Files:**

- `supabase/migrations/20260813120000_private_farmer_contacts.sql` (new)
- `supabase/tests/private_farmer_contacts_test.sql` (new)
- `tests/private-farmer-contacts-migration.test.ts` (new)
- `docs/REQUIREMENTS.md`

Add the default-off database release control `private_farmer_contacts` and the
following service-only tables:

```sql
create table public.farmer_contact_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  purpose text not null,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.farmer_contacts (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null,
  owner_id uuid not null,
  encrypted_display_name text,
  encrypted_email text,
  email_hash text,
  encrypted_phone text,
  phone_hash text,
  acquisition_source text not null,
  source_reference text,
  consent_channel text not null,
  consent_purpose text not null,
  consent_state text not null,
  consent_text_version text not null,
  consent_recorded_at timestamptz,
  consent_expires_at timestamptz,
  review_state text not null default 'pending',
  suppression_state text not null default 'none',
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (list_id, owner_id)
    references public.farmer_contact_lists(id, owner_id) on delete cascade
);

create table public.farmer_contact_events (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.farmer_contacts(id),
  owner_id uuid not null references auth.users(id),
  event_type text not null,
  bounded_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

Use constraints rather than trusting the UI:

- accepted acquisition sources are `farmerbook_interest_form`,
  `existing_farmerbook_member`, `partner_consent_campaign`, and
  `manual_consent_import`; `youtube_api` is invalid;
- at least one encrypted email or phone value is required;
- a value cannot be marked consented without channel, purpose, text version,
  timestamp, evidence reference, and non-expired consent;
- suppression and withdrawal immediately make delivery ineligible;
- owner ID is immutable and every duplicate hash is scoped to one owner;
- event rows are insert-only and contain no raw email/phone;
- public, anonymous, and authenticated table privileges are revoked; RLS is
  enabled; service-role access is explicit; and any authenticated RPC verifies
  `auth.uid()`, administrator metadata, the database gate, and row ownership.

Do not modify or rewrite earlier migrations. The new RPC that hands a consented
contact to outreach should call the existing consent/outbox functions and
preserve their stricter checks.

### 2. Encrypt private contact values and validate imports

**Files:**

- `features/farmer-database/crypto.ts` (new)
- `features/farmer-database/schemas.ts` (new)
- `features/farmer-database/types.ts` (new)
- `tests/farmer-database-crypto.test.ts` (new)
- `tests/farmer-database-schemas.test.ts` (new)
- `.env.example`
- `lib/cloudflare-bindings.ts`

Add `FARMER_CONTACT_ENCRYPTION_KEY` as a server-only Cloudflare secret. Use
WebCrypto AES-256-GCM with a new random IV for each value and an authenticated
versioned envelope. Use a separate derived HMAC key for normalized email/phone
deduplication. Never log plaintext, include it in error text, put it in URLs, or
return it from a client mutation.

The import schema accepts a maximum of 100 records at a time and requires:

```ts
{
  displayName?: string;
  email?: string;
  phone?: string;
  acquisitionSource:
    | "farmerbook_interest_form"
    | "existing_farmerbook_member"
    | "partner_consent_campaign"
    | "manual_consent_import";
  consentChannel: "email" | "phone";
  consentPurpose: "farmerbook_invitation";
  consentTextVersion: string;
  consentRecordedAt: string;
  consentExpiresAt?: string;
  sourceReference: string;
}
```

Normalize Indian phone numbers to `+91XXXXXXXXXX`, validate email conservatively,
reject spreadsheet formula prefixes and unexpected fields, and produce a dry-run
summary before the administrator confirms an import. CSV export is out of scope
for the first release; this reduces accidental leakage.

### 3. Build the owner-only Farmer Database service and administrator page

**Files:**

- `features/farmer-database/actions.ts` (new)
- `features/farmer-database/queries.ts` (new)
- `features/farmer-database/farmer-database-console.tsx` (new)
- `app/(product)/admin/farmer-database/page.tsx` (new)
- `app/(product)/admin/outreach/page.tsx`
- `app/(product)/admin/agents/page.tsx`
- `app/globals.css`
- `tests/farmer-database-actions.test.ts` (new)
- `tests/farmer-database-console.test.tsx` (new)

Every query and mutation first calls `requireAdmin()`. Queries then use the
server-only Supabase client and filter by the returned administrator ID before
decrypting only the current page. The interface provides:

- list creation and purpose;
- count cards for total, email-consented, phone-only, expired, suppressed, and
  duplicates;
- a private table with name, email, phone, consent source/state/date, review
  state, last contacted date, and evidence link;
- add-one and bounded CSV dry-run/import flows;
- consent correction, withdrawal, suppression, and deletion controls;
- audit history with contact values redacted; and
- an “Eligible for consented email” filter and per-record preparation action.

The page must state: “Private to your administrator account. YouTube results are
never copied into this database.” Do not place private counts or values in page
metadata, logs, analytics, client caches, public routes, sitemap, or demo data.

### 4. Add direct consent intake

**Files:**

- `app/join/farmer-interest/page.tsx` (new)
- `features/farmer-database/interest-form.tsx` (new)
- `features/farmer-database/interest-actions.ts` (new)
- `app/api/farmer-interest/confirm/route.ts` (new)
- English/Hindi/Marathi message catalogs
- privacy notice and production runbook
- `tests/farmer-interest-form.test.tsx` (new)
- `tests/farmer-interest-routes.test.ts` (new)

Create a minimal mobile-first interest form so a Farmer can provide name,
email and/or phone, preferred language, district/state, and explicit consent to
receive a FarmerBook invitation through each selected channel. Record the exact
consent copy version, timestamp, source campaign, IP/user-agent only if the
approved privacy policy requires them, and a signed confirmation token. Email
must be confirmed before it becomes active consent. Phone collection does not
enable WhatsApp and the form must say so.

Use Turnstile, duplicate throttling, generic success responses, expiring signed
tokens, and no account-existence disclosure. A withdrawal link must work without
requiring login and must suppress future use.

### 5. Add a transient official YouTube Discovery view

**Files:**

- `features/farmer-database/youtube-discovery.ts` (new)
- `features/farmer-database/youtube-actions.ts` (new)
- `features/farmer-database/youtube-discovery-panel.tsx` (new)
- `supabase/migrations/20260813120000_private_farmer_contacts.sql`
- `tests/youtube-discovery.test.ts` (new)
- `tests/youtube-discovery-actions.test.ts` (new)

Refactor common bounded request/response handling from
`features/profile-agent/youtube-search.ts`, without changing the existing Known
Farmer or Featured Farmer behavior. The new query uses the official endpoint:

```ts
new URLSearchParams({
  part: "snippet",
  q: approvedQuery,
  type: "channel",
  regionCode: "IN",
  relevanceLanguage: language,
  safeSearch: "strict",
  maxResults: "10",
  key: configuration.apiKey,
});
```

Return current channel title, original channel URL, short description for the
active screen, and YouTube attribution. Do not extract contact patterns or send
the result through `extractContactCandidates`. Do not persist result items.

Persist only an owner-scoped quota/audit row containing query hash, language,
region, result count, provider status, requested time, and completion time.
Reserve at most 10 manual searches per owner per day and 100 per month, with a
lower project cap that can be configured. Do not auto-page or retry quota/auth
failures. Reject a request unless `YOUTUBE_DATA_API_KEY` is server-configured.

The first release will not add a scheduled Durable Object class because a
background crawler cannot lawfully create the requested contact database. The
UI may call this bounded service the “YouTube Discovery Agent,” but it is
operator-initiated and read-only. A true scheduled role remains a future option
only after a YouTube API compliance review for the exact retained-data use case.

### 6. Connect consented email without adding a force-send path

**Files:**

- `features/farmer-database/actions.ts`
- `features/outreach/processor.ts` only if a narrow compatibility adapter is
  required
- `features/outreach/providers.ts`
- `features/outreach/postmark-provider.ts`
- `tests/farmer-database-email-handoff.test.ts` (new)
- existing outreach provider/processor tests

The prepare-email action must atomically re-check:

1. authenticated administrator and owner ID;
2. database/application feature controls;
3. active, non-expired email consent for `farmerbook_invitation`;
4. confirmed email ownership;
5. no withdrawal, suppression, complaint, bounce, or prior duplicate send;
6. configured approved provider and verified sender; and
7. campaign batch/spend limits.

It then creates or links the existing outreach prospect/contact/consent rows and
queues the existing outbox message with an idempotency key. The Outreach Growth
Agent remains the only delivery worker. One introduction and one separately
consented bounded follow-up are the maximum. Every email contains FarmerBook
identity, reason/purpose, privacy link, unsubscribe link, and provider tracking.

Automated tests use fictional addresses and a fake provider. Implementation
does not install a real sender secret, enqueue a real recipient, activate an
agent, or send a message.

### 7. Keep WhatsApp impossible in this tranche

**Files:**

- `features/farmer-database/schemas.ts`
- `features/farmer-database/farmer-database-console.tsx`
- `docs/PRODUCTION_RUNBOOK.md`
- tests asserting no WhatsApp provider/action/binding

Phone numbers may be privately stored after consent, but they are not a
deliverable WhatsApp channel. Show `WhatsApp: not configured` and no send
button. Do not add WhatsApp Web automation, QR-session storage, unofficial APIs,
templates, webhooks, or agent branches. A later addendum must name the official
Business Platform provider, approved sender, template, opt-in wording,
webhooks, costs, suppression, staging proof, and rollback.

### 8. Feature controls, tests, rollout, and rollback

**Files:**

- `lib/feature-flags.ts`
- `.env.example`
- `vite.config.ts`
- `docs/PRODUCTION_RUNBOOK.md`
- `docs/REQUIREMENTS.md`
- `research.md`
- `PLAN.md`
- `implementation-log.md`
- `.structured-dev-state`
- `tests/feature-flags.test.ts`
- `tests/platform-routes.test.ts`
- `tests/e2e/farmer-database.spec.ts` (new)

Add `ENABLE_PRIVATE_FARMER_CONTACTS=false`; keep the database release control
false as well. The YouTube view also requires the server API key but no new
public variable. The contact encryption key and provider secrets are never
embedded in Vite public Worker vars.

Focused tests prove:

- anonymous, ordinary authenticated, another administrator, and browser clients
  cannot read the product owner's contacts;
- service operations cannot omit the owner filter;
- encrypted values do not appear in SQL/API snapshots, logs, errors, metadata,
  analytics, URLs, or audit rows;
- duplicates, malformed contacts, missing consent, expired consent, withdrawal,
  suppression, and provider failures fail closed;
- YouTube result data cannot be imported, promoted, extracted, queued, or sent;
- YouTube quotas, timeouts, response sizes, safe search, official host, no
  pagination, no retry, and transient results are enforced;
- direct-interest confirmation and withdrawal are token-safe and idempotent;
- an eligible fictional email reaches only the fake provider once; and
- WhatsApp remains impossible.

After focused tests, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
supabase db reset
supabase test db
npm run test:e2e
```

Visually inspect desktop and mobile views with fictional contacts and prove no
horizontal overflow, keyboard traps, plaintext leakage in page source, or
private data in screenshots committed to the repository.

Production rollout is a separate approval sequence: backup the target database,
apply the forward migration to staging, install a staging encryption key,
create synthetic consented contacts, configure a verified test sender, prove
provider events/unsubscribe/withdrawal, run multi-user ownership checks, obtain
privacy/retention approval, then request explicit production approval. Keep
YouTube discovery manual and WhatsApp off.

Rollback pauses the Outreach Growth Agent first, disables the database release
control and `ENABLE_PRIVATE_FARMER_CONTACTS`, cancels queued test messages,
verifies the outbox is empty, then rolls back the Worker version. Do not drop or
decrypt contact tables during an operational rollback. Data deletion follows
the documented owner/request/retention process and creates a redacted audit
event.

### Implementation questions resolved by this plan

- “Keep the data private to me” means row ownership by the authenticated founder
  administrator, service-only database grants, application encryption, and no
  CSV export in the first release.
- “For now send email” means send only after confirmed active email consent via
  the existing provider path. It does not authorize harvested or unsolicited
  outreach.
- “WhatsApp later” means phone storage is allowed after consent, but there is no
  WhatsApp send capability in this tranche.
- “24/7 agents on a low budget” means event-driven consent intake and delivery,
  manual YouTube discovery, and no continuously running model process.

### Approval recorded

The product owner approved local implementation and tests on 2026-08-13. That
approval did not authorize a production migration, secret installation,
external search, real-person data import, email, WhatsApp message, agent
activation, deployment, or any other production mutation.

## Bounded sourced-Farmer research workspace addendum — 2026-08-14

### Status and approved interpretation needed

This plan responds to the request to use multiple agents in a loop to discover
farming channels like `https://www.youtube.com/@RythuBadi`, parse video
descriptions, store farmer details privately, and add an administrator UI.
Research and approved local implementation are complete. Production/provider
activation still requires a separate approval naming the seed and batch cap.

The literal YouTube-to-named-farmer database is excluded: current YouTube API
policy prohibits harvesting/deriving/storing identifying names, usernames and
contact data without consent. The implementable interpretation is:

- official YouTube API data is an attributed, transient discovery surface;
- descriptions are contact-redacted in memory and never stored raw;
- agents persist anonymous agriculture topics, counts, run metadata and
  refreshable source provenance only;
- a durable named sourced-farmer profile requires documented subject consent
  or an administrator-reviewed, independently approved non-YouTube source;
- the new domain never creates a contact, consent, member, outreach prospect,
  message, outbox item, verification badge or public profile.

### Approach

Add a separate founder-only research domain and two private routes. Keep the
existing `farmer_contacts` schema and its transient channel search unchanged.
Use a bounded checkpointed pipeline rather than an infinite/self-feeding crawl:

```text
Seed resolver -> Upload batch reader -> Contact redactor/topic parser
     |                  |                         |
     +------ quota/checkpoint/run ledger --------+
                              |
                 transient admin source review
                              |
          consent OR independent-source evidence review
                              |
                 durable sourced-farmer profile
```

The roles are purpose-limited stages, not independent unrestricted identities.
The initial release runs one administrator-requested batch at a time; no cron or
24/7 crawler is enabled. The database run ledger and checkpoint make repeated
manual runs resume safely. A later scheduled trigger requires a separate
production/provider/privacy approval.

### 1. Feature and founder access boundary

**Files:** `lib/feature-flags.ts`, `.env.example`,
`features/sourced-farmers/access.ts`, `docs/PRODUCTION_RUNBOOK.md`

Add `ENABLE_SOURCED_FARMER_RESEARCH=false` and a separate
`sourced_farmer_research` SQL release control. Reuse the exact founder UUID but
do not require the private-contact encryption key or contact feature flag.
Every query/action calls a dedicated founder guard and every SQL function checks
the database control.

```ts
export async function requireSourcedFarmerResearchOwner() {
  if (!isFeatureEnabled("ENABLE_SOURCED_FARMER_RESEARCH")) {
    return { ok: false as const, code: "FEATURE_DISABLED" as const };
  }
  const administrator = await requireAdmin();
  const { ownerId, configured } = sourcedFarmerResearchConfiguration();
  if (!configured || administrator.demo || administrator.id !== ownerId) {
    return { ok: false as const, code: "FORBIDDEN" as const };
  }
  return { ok: true as const, administrator };
}
```

### 2. Forward-only owner-scoped schema

**Files:** new `supabase/migrations/20260814120000_sourced_farmer_research.sql`,
new `supabase/tests/sourced_farmer_research_test.sql`

Create `farmer_source_channels`, `farmer_source_videos`,
`farmer_source_discovery_runs`, `sourced_farmer_profiles`,
`sourced_farmer_facts`, and immutable `farmer_source_events`. Denormalize
`owner_id`, use composite owner foreign keys, enable RLS, revoke all access from
`public`/`anon`/`authenticated`, and grant only narrow service RPCs. Add unique
provider IDs, fact fingerprints, idempotency keys, optimistic revisions,
refresh/expiry constraints and bounded text/JSON checks.

The profile eligibility constraint is conceptually:

```sql
check (
  evidence_basis in ('documented_subject_consent', 'independent_public_source')
  and youtube_identity_source = false
)
```

No table contains email, phone, WhatsApp, home address, outreach IDs, consent
state, member profile IDs, publication state, raw provider response, transcript,
comments, media copies or person-level financial claims.

The SQL surface consists of release-control-aware operations for run reserve,
checkpoint/complete/fail, anonymous source save, independent-evidence profile
create/update/review, archive/remove, expiry purge and exact summary counts.

### 3. Official YouTube API client and bounded loop

**Files:** new `features/sourced-farmers/youtube-client.ts`,
`channel-seed.ts`, `redaction.ts`, `topic-parser.ts`, `runner.ts`

Implement only official endpoints under `www.googleapis.com/youtube/v3`:

- `channels.list` resolves a handle or stable channel ID and its uploads list;
- `playlistItems.list` reads at most 50 items per page and at most two pages per
  run initially;
- `videos.list` retrieves current snippet/status metadata for batches of 50;
- the existing server-only `YOUTUBE_DATA_API_KEY` is reused;
- every response has an eight-second timeout and 500 KB cap;
- reservation occurs before provider calls, with no automatic pagination past
  the run cap and no recursive description-link following.

```ts
for (let page = 0; page < MAX_PAGES_PER_RUN; page += 1) {
  const batch = await listUploadBatch(checkpoint);
  const redacted = batch.items.map(toContactFreeTransientSource);
  await saveAnonymousTopicsAndCheckpoint(redacted, batch.nextPageToken);
  if (!batch.nextPageToken || batch.hitKnownVideo) break;
}
```

`toContactFreeTransientSource` uses an allowlisted output DTO. It destroys
emails, Indian/international phone patterns, WhatsApp/contact handles and direct
contact URLs before any UI, model, log, audit or database boundary. It then
derives only crop/livestock/practice/actor-type tags and aggregates detached
from a person. Candidate agriculture matching tests source content independently
of the seed query.

### 4. Evidence review and durable profile actions

**Files:** new `features/sourced-farmers/schemas.ts`, `types.ts`, `actions.ts`,
`queries.ts`

Define separate transient-source and durable-profile schemas. Durable creation
requires an HTTPS non-YouTube evidence URL or documented subject-consent
reference, bounded cited facts, an explicit administrator attestation, a
revision and an idempotency key. Do not accept a raw name/location extracted by
the YouTube stage.

```ts
const durableProfileInput = z.object({
  evidenceBasis: z.enum([
    "documented_subject_consent",
    "independent_public_source",
  ]),
  evidenceUrl: nonYouTubeHttpsUrl.optional(),
  consentReference: z.string().min(8).max(500).optional(),
  facts: z.array(citedProfessionalFactSchema).min(1).max(20),
  operatorAttested: z.literal(true),
  revision: z.number().int().nonnegative(),
  idempotencyKey: z.uuid(),
}).superRefine(requireEvidenceForBasis);
```

Queries use exact database counts and bounded URL-backed pagination; every
service call contains the authenticated `owner_id`. Suggested duplicate matches
never merge automatically. Archive/removal and expiry delete unsupported
provider data and record only redacted immutable events.

### 5. Founder-only index and detail UI

**Files:** new `app/(product)/admin/sourced-farmers/page.tsx`,
`[profileId]/page.tsx`, `loading.tsx`, `error.tsx`, new
`features/sourced-farmers/sourced-farmer-console.tsx`,
`sourced-farmer-detail.tsx`, changes to `app/globals.css` and admin header links

Both routes are dynamic, independently owner-authorized and `noindex, nofollow,
nocache`. `/admin/sourced-farmers` provides:

- seed-channel input and `Run one bounded batch` control;
- recent bounded-run state, quota, checkpoint and safe failure status;
- exact summary counts and URL-backed filters;
- transient attributed videos with contact-free descriptions and anonymous
  agriculture tags;
- durable reviewed profiles sourced from consent/independent evidence;
- distinct empty, filtered-empty, disabled, stale and provider-error states.

`/admin/sourced-farmers/[profileId]` shows every professional fact beside its
independent source, review decision, freshness, revision and audit history. It
supports approve/reject and archive-to-remove-from-active-research. It never
renders contact fields or send/invite/verify/connect/marketplace/publication
controls.

Visible disclosure:

> Private research · not a FarmerBook member · not verified · no contact or
> outreach consent.

Source links open with `target="_blank" rel="noreferrer"`; original-language
text uses `dir="auto"`. Add links from the existing Farmer database, Outreach
and Agents headers without changing the global member navigation.

### 6. Documentation and retention operations

**Files:** `README.md`, `docs/REQUIREMENTS.md`,
`docs/PRODUCTION_RUNBOOK.md`, `research.md`, `PLAN.md`,
`implementation-log.md`, `.structured-dev-state`

Document the strict separation between transient YouTube research, durable
independent evidence, consented contacts and public/member profiles. The runbook
must cover API-key setup, quotas, pause, refresh/delete within 30 days, expiry
purge proof, feature/database activation order, incident response and rollback.
Enabling a feature does not authorize a live search, a real-person durable row,
or a scheduled trigger.

### 7. Verification strategy

Add focused tests:

- `tests/sourced-farmer-access.test.ts`
- `tests/sourced-farmer-schemas.test.ts`
- `tests/sourced-farmer-youtube-client.test.ts`
- `tests/sourced-farmer-redaction.test.ts`
- `tests/sourced-farmer-runner.test.ts`
- `tests/sourced-farmer-actions.test.ts`
- `tests/sourced-farmer-queries.test.ts`
- `tests/sourced-farmer-console.test.tsx`
- `tests/sourced-farmer-detail.test.tsx`
- `tests/sourced-farmer-migration.test.ts`
- `tests/e2e/sourced-farmers.spec.ts`

Fixtures are fictional and provider calls mocked. Prove:

- official hosts/endpoints only, quota-before-fetch, size/timeout/page caps and
  checkpoint/idempotent replay;
- Telugu/English text handling, contact destruction, no forbidden output keys,
  and no accidental redaction of acres/years/yield quantities;
- YouTube identity facts cannot create durable profiles;
- independent evidence/consent, citations, revisions and operator attestation
  are mandatory;
- owner/application/database controls fail before provider/service work;
- RLS/no browser grants, cross-owner denial, immutable events and actual expiry
  deletion;
- zero reads/writes to contacts, profiles, consent, outreach, outbox, messages
  and Featured Farmer publications;
- accessible filters, loading/error/empty states, source-link safety, no private
  metadata, and desktop/mobile no-overflow behavior.

Run after significant changes:

```bash
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
supabase db reset
supabase test db
npm run test:e2e
```

### Rollout and rollback

Local implementation and fictional tests do not authorize real collection.
Before any live run: obtain a YouTube API key, complete provider/privacy review,
apply the forward migration to staging, enable only the database control and
application flag for the founder, run synthetic mocked/replay evidence, verify
the expiry purge, then request explicit approval naming the seed and maximum
batch. A production scheduled trigger remains off.

Rollback pauses new reservations, disables the SQL control and application
flag, completes/fails any identified active run, purges expired/unreviewed API
metadata, verifies no contact/outreach rows exist, and rolls back the Worker.
Reviewed independently sourced records remain private unless an approved
privacy/removal request requires deletion.

### Detailed todo list

- [DONE] Add the application flag, server configuration and dedicated founder guard.
- [DONE] Add the forward-only release control, sourced tables and bounded RPCs.
- [DONE] Add RLS/grants, owner-composite constraints, immutable events and purge.
- [DONE] Implement channel seed normalization and official handle resolution.
- [DONE] Implement bounded uploads/video batching with quota and checkpoints.
- [DONE] Implement contact-destructive redaction and anonymous topic extraction.
- [DONE] Implement no-retry run orchestration, stop bounds and safe failure handling.
- [DONE] Implement durable independent-evidence/consent schemas and actions.
- [DONE] Implement owner-scoped summaries, filters, pagination and detail queries.
- [DONE] Build the private index, run controls and transient source-review UI.
- [DONE] Build the cited durable-profile detail/review/audit UI.
- [DONE] Add route-local loading/error boundaries, styles and admin header links.
- [DONE] Add all unit, component, action, query, migration, pgTAP and E2E tests.
- [DONE] Update README, requirements, runbook, implementation log and state.
- [DONE] Run TypeScript/lint/focused tests after each significant tranche.
- [DONE] Run full unit/build/diff/database/pgTAP/desktop-mobile E2E gates.
- [DONE] Inspect desktop/mobile fail-closed UI and verify no private-data leakage.
- [DONE] Leave all new controls, schedules, live provider work and deployment off.

### Approval and completion checkpoint

Approval recorded: the product owner said `Plan approved` on 2026-08-14. Local
implementation and fictional verification are authorized. This does not
authorize a live YouTube API run, real-person durable record, hosted migration,
scheduled trigger, deployment, message, or other production mutation.

## 2026-08-16 implementation plan: supervised support and social-content pilot

### Approach

Extend the existing private managed-operations fleet with two independent
scheduled roles, while making Supabase the sole approval authority. Workers AI
can create a bounded proposal; only an authenticated administrator RPC can
approve, reject or escalate it. The feature stays behind both the application
flag `ENABLE_SUPPORT_SOCIAL_PILOT` and the database release control
`support_social_pilot`.

The pilot deliberately has no send/post connector. An approved support reply is
shown in the authenticated requester's FarmerBook support page. An approved
social proposal becomes `copy_ready` for manual posting. This produces useful
24-by-7 draft work without granting an agent public-action authority.

### 1. Forward-only database domain

**File:** `supabase/migrations/20260816120000_support_social_pilot.sql`

Add the release key and extend the managed-role constraint with
`customer_support` and `social_content`. Insert both default-disabled fleet
rows. Do not alter `20260812130000_managed_operations_agents.sql`.

Create private `support_cases`, `social_campaign_briefs`,
`agent_action_proposals` and `agent_action_proposal_events` tables with bounded
text/JSON, 90-day support visibility/expiry, revisions, idempotency, immutable events,
RLS and revoked browser table privileges.

Add narrow functions:

```sql
public.create_support_case(...)
public.list_my_support_cases(limit_input integer)
public.create_social_campaign_brief(...)
public.record_agent_action_proposal(...)
public.review_agent_action_proposal(...)
```

The participant functions require `auth.uid()` and the release control. The
brief/review functions require `public.is_admin()`. Draft recording requires
`auth.role() = 'service_role'`, the matching managed run role and the release
control. Review uses expected revision plus an idempotency key, and copies no
support body into immutable event JSON. The service role receives no execute
grant on the administrator review function.

Recreate only the two existing role-validation functions whose explicit role
allowlists must accept the added fleet roles. Preserve their existing
authorization, idempotency and failure semantics.

### 2. Strict AI proposal builders

**Files:**

- `features/customer-operations/schemas.ts`
- `features/customer-operations/ai.ts`

Define Zod contracts for support submission, campaign briefs, decisions and AI
outputs. Use the existing Workers AI binding and model pattern:

```ts
await ai.run(MODEL, {
  messages: boundedUntrustedPrompt,
  response_format: { type: "json_schema", json_schema: strictSchema },
  temperature: 0.1,
  max_tokens: boundedLimit,
});
```

The deterministic support classifier runs before inference and forces human
escalation for complaints, account/privacy actions, prices/refunds, legal,
financial, medical/veterinary, crop treatment/chemical dosage, threats and
emergencies. AI output cannot lower a deterministic risk. Invalid or missing AI
returns a safe review-only template. Social output never claims it was posted
and cannot contain fabricated evidence or unsupported outcome guarantees.

### 3. Two private scheduled Agents

**Files:**

- `features/managed-agents/contracts.ts`
- `features/managed-agents/agents.ts`
- `features/managed-agents/actions.ts`
- `features/managed-agents/processor.ts`
- `app/api/managed-agents/run/route.ts`
- `lib/cloudflare-bindings.ts`
- `worker/index.ts`
- `vite.config.ts`

Add definitions with separate state/schedules and boundaries:

- `customer_support`: every 300 seconds, maximum 10 cases;
- `social_content`: every 3,600 seconds, maximum 5 briefs.

Add `CustomerSupportAgent` and `SocialContentAgent`, private binding lookup,
worker exports and an additive `support-social-agents-v1` SQLite migration tag
containing only the two new classes. Both route prerequisites require the new
feature flag. The processor reads only open/draft source rows, builds proposals
and persists them through the service-only RPC. It never changes a proposal to
approved and never invokes a sender/provider.

Repair the existing scheduled-call authentication path in `proxy.ts`: add a
separate exact `isInternalServicePath()` check for only
`/api/managed-agents/run`, and keep all security enforcement in the route.
Harden public prefix matching to `pathname === prefix` or
`pathname.startsWith(prefix + "/")`. Add tests proving the internal route
bypasses browser-session authentication while prefix-confusable neighboring
paths do not.

Extend the supervisor summary with pending review counts and expired support
cleanup only if the SQL contract makes that operation bounded and safe.

### 4. Participant and administrator UI

**Files:**

- `features/customer-operations/types.ts`
- `features/customer-operations/queries.ts`
- `features/customer-operations/actions.ts`
- `features/customer-operations/support-console.tsx`
- `features/customer-operations/operations-console.tsx`
- `app/(product)/support/page.tsx`
- `app/(product)/admin/operations/page.tsx`
- `components/settings-nav.tsx`
- `app/(product)/admin/agents/page.tsx`
- `app/globals.css`

The support page uses the current request locale, permits one bounded
authenticated question, and lists only that requester's cases plus approved
replies. The administrator workspace lists original support questions and
campaign briefs beside editable AI proposals, risk/escalation labels,
model/prompt metadata and approve/reject/escalate controls.

Approved social content is labelled `Copy ready`, never `Published`. There is
no Send or Post button. Link the support page from settings and the operations
workspace from the managed-agent header; do not add admin state to the global
participant navigation.

### 5. Configuration and operations documentation

**Files:**

- `.env.example`
- `lib/feature-flags.ts`
- `vite.config.ts`
- `docs/PRODUCTION_RUNBOOK.md`
- `docs/SECRETS_AND_GITHUB_DEPLOYMENT.md`
- `README.md`

Add only the default-false non-secret flag. Document that Workers AI is a
binding, not a Google/OpenAI/Codex subscription key. Activation order is:
forward migration, local/staging RLS proof, Worker deploy with the flag, DB
control, then individually resume each Agent. No production activation is part
of this implementation.

### 6. Verification

**Files:** focused additions under `tests/` and
`supabase/tests/support_social_pilot_test.sql`.

Cover schema bounds, deterministic escalation, prompt-injection isolation,
strict AI success/fallback, fleet role/config registration, route feature
gating, forward-only migration contents, RLS/grants, service-can-draft but
cannot-approve, revision/idempotency behavior, participant ownership, admin
review, honest copy-ready UI and explicit-demo isolation.

Run focused tests and typecheck after each tranche, then ESLint, all Vitest,
production build and `git diff --check`. If local Supabase/Docker is available,
run a clean reset and the pgTAP suite. Do not claim external delivery or 24-by-7
production operation without a deployed enabled Worker and observed schedules.

### Rollback

Pause the two new Agents, disable `support_social_pilot`, disable
`ENABLE_SUPPORT_SOCIAL_PILOT`, and roll back the Worker to the prior healthy
version. Keep the additive database tables private for evidence/retention; do
not down-migrate or delete user support cases. Because no connector exists,
rollback cannot leave a partially sent reply or social post.

### Detailed todo list

- [DONE] Append the scoped research and approval checkpoint without replacing history.
- [DONE] Add the forward-only database schema, role extension, RLS, grants and RPCs.
- [DONE] Add strict support/social contracts, safety classification and AI fallbacks.
- [DONE] Register two additive Agent classes, bindings, feature gates and schedules.
- [DONE] Repair and test the exact internal processor session-bypass path.
- [DONE] Add bounded processor roles that create pending proposals only.
- [DONE] Build authenticated participant support submission/history.
- [DONE] Build administrator support/social review workspace with copy-ready semantics.
- [DONE] Add navigation links, responsive styles and honest disabled states.
- [DONE] Add unit, component, action, route, configuration and migration tests.
- [DONE] Add executable pgTAP authorization tests.
- [DONE] Update environment example, secrets guidance, README and production runbook.
- [DONE] Run focused and full local quality gates and record evidence.
- [DONE] Leave hosted migration, production flag/control, schedules, sending and posting off.

### Approval checkpoint

Approval recorded: the product owner said `ok implement this using multiple
subagents` on 2026-08-16, after explicitly authorizing the supervised pilot in
the preceding conversation. That instruction approves this local, default-off
implementation plan. It does not authorize hosted database changes, production
feature activation, a scheduled production Agent, a customer reply, an email,
a direct social message or a public post.

## 2026-08-17 implementation and release plan: production consent intake and collaboration email

### Status and scope

This plan was **approved by the product owner on 2026-08-17** with “Do the
needful for next steps.” Research and read-only production preflight are
complete. Implementation and default-off release preparation are authorized;
real delivery and final activation remain separately gated. No database row,
secret, Turnstile widget, Postmark account, Worker version, email or production
control had been changed at the approval checkpoint.

Sender verification update (2026-08-17): `ceo@farmerbook.in` is an active
Cloudflare Email Routing address forwarding to the product owner's Gmail. A
controlled message was accepted and the Cloudflare activity log recorded the
result as `Forwarded`. Gmail's `Send mail as` settings currently contain only
the Gmail account, so `ceo@farmerbook.in` is receive-only and must not yet be
used in the From field. Reserve it as `POSTMARK_FROM_EMAIL` and the professional
reply address after Postmark verifies `farmerbook.in` and the required outbound
SPF/DKIM/DMARC alignment is installed.

The release will let farmers and organizations ask FarmerBook to email them,
verify that request with double opt-in, and then receive one introduction plus
at most one separately requested follow-up. Natural/organic/regenerative
requests are processed before sustainable/smallholder and general requests
after confirmation. International groups use a dedicated partnership-interest
form. Discovery-only channel/group CSVs are not imported or contacted.

Email is the only delivery channel. WhatsApp remains disabled. “Constant
communication” means an immediate requested response, one optional follow-up,
and timely handling of inbound replies; it does not mean an unbounded automated
sequence.

### 1. Create dual-shape forward migrations

**New file:**
`supabase/migrations/20260817120000_outreach_production_compatibility.sql`

**Safety-completion file:**
`supabase/migrations/20260817130000_outreach_production_safety_completion.sql`

Do not edit the historical agriculture/outreach migrations. Use two ordered,
forward-only migrations that converge both supported starting states. The first
creates the isolated consent/outbox domain; the second completes database-level
consent triggers, membership invitation redemption and administrator controls:

1. the full local migration history where the outreach tables already exist;
2. the live production shape: original five migrations, sourced-Farmer release
   control/objects, and no agriculture foundation or outreach objects.

The migration will:

- preserve the union of every existing release-control key, add
  `outreach_agent=false`, and never change the live sourced-Farmer value;
- create missing outreach tables, indexes, triggers and security-definer
  functions, or add/replace their forward fields/functions when already
  present;
- remove the consent path's dependency on absent `supported_locales` and
  `agriculture_categories`; locale/category input remains bounded and validated
  by server schemas and database syntax/size checks;
- repair the legacy `agriculture_categories.active` reference without creating
  the unrelated agriculture foundation;
- add `engagement_type` (`membership` or `collaboration`), `interest_kind`,
  `country_code`, `region_name`, `locality_name`, `farming_approach` and
  `priority_tier` to prospects;
- retain contact values only in the existing private candidate table, enforce
  RLS and service-only grants, and keep events immutable;
- leave `outreach_runtime_controls.delivery_paused=true` and the database
  release control false;
- update confirmation, claim, consent, withdrawal, result, invitation,
  provider-event, purge, health and admin functions atomically;
- make confirmation rows prompt for all priorities while ordering confirmed
  introductions by `priority_tier`, `not_before`, then creation time;
- prepare a signed `/signup` invitation only for `membership`; a
  `collaboration` message contains no account bearer token;
- preserve one optional follow-up maximum and cancel all pending work on STOP,
  withdrawal, complaint or hard bounce.

Illustrative claim ordering:

```sql
order by
  case when outbox.purpose = 'consent_confirmation' then 0 else 1 end,
  prospect.priority_tier,
  outbox.not_before,
  outbox.created_at
for update of outbox skip locked
```

Use `to_regclass`, catalog checks, `IF NOT EXISTS`, conditionally installed
triggers and `CREATE OR REPLACE FUNCTION` so a second application is harmless.
The migration must fail before mutation if it finds a partially incompatible
outreach object rather than silently guessing.

**Test files:**

- extend `tests/outreach-migration.test.ts`;
- add `tests/outreach-production-compatibility-migration.test.ts`;
- extend `supabase/tests/outreach_agent_test.sql`;
- add a production-shape rehearsal script under `scripts/` that creates a
  disposable local database, applies the five baseline migrations, sourced
  bridge/schema/hardening, then this migration and pgTAP assertions.

The test must compare critical columns, constraints, routines, grants and RLS
between a clean full-history reset and the production-shaped rehearsal.

### 2. Separate member and international collaboration intake

**Files:**

- `app/join/page.tsx`
- `app/partner-interest/page.tsx` (new)
- `features/outreach/consent-join-form.tsx`
- `features/outreach/partner-interest-form.tsx` (new)
- `features/outreach/consent-intake.ts` (new shared server mapping)
- `features/outreach/schemas.ts`
- `features/outreach/actions.ts`
- `features/outreach/types.ts`
- `lib/i18n/messages/en-IN.ts`
- `lib/i18n/messages/hi-IN.ts`
- `lib/i18n/messages/mr-IN.ts`
- `app/globals.css`

Keep `/join` focused on Indian individuals/member invitations. Build
`/partner-interest` for Indian or international groups with:

- full name and email;
- organization/group name;
- interest kind: farmer group, cooperative, association, natural/organic
  network, creator/educator, NGO or agriculture business;
- country code, region and optional locality;
- optional organization website (HTTP/HTTPS only);
- self-declared farming approach;
- exact consent for one verification and collaboration introduction;
- separate optional consent for one follow-up;
- a campaign code limited to a safe allowlist/query mapping, never arbitrary
  hidden user text.

The client never chooses `priority_tier`; the server deterministically maps the
validated farming approach:

```ts
const priorityTier =
  ["natural", "organic", "regenerative", "agroecological"].includes(approach)
    ? 10
    : ["sustainable", "low_input", "smallholder"].includes(approach)
      ? 20
      : 30;
```

Both actions use a same-origin HMAC nonce, a route-specific Turnstile action,
bounded normalized fields, a SHA-256 input fingerprint and the service-only
RPC. The database independently revalidates engagement type, location bounds,
policy version, origin, source path, priority mapping and exact consent.

Update the consent policy version. Do not reinterpret old receipts: a new
policy version applies only to new form submissions. Store the exact statement
text/version on confirmation. The confirmation page reads only the signed
engagement type to choose an honest next step: signup for membership, or reply/
FarmerBook home for collaboration.

### 3. Harden Turnstile and intake readiness

**Files:**

- `features/outreach/turnstile.ts`
- `app/join/page.tsx`
- `app/partner-interest/page.tsx`
- `tests/outreach-actions.test.ts`
- `tests/outreach-consent-ui.test.tsx`
- `tests/outreach-turnstile.test.ts` (new)

Add `expectedAction` to verification and require both exact hostname and exact
action when production expectations are supplied. Missing response fields fail
closed. Keep the existing five-second provider timeout and single-use signed
form nonce/idempotency behavior.

An intake page is configured only when all of these are true:

```text
application flag + Supabase + service role + consent HMAC
+ Turnstile site/secret + concrete configured email provider
+ sender identity/footer configuration
```

Create a managed production Turnstile widget only after plan approval, limited
to `farmerbook.in` and `www.farmerbook.in`. The public site key becomes a
Worker variable; the secret goes only to encrypted Worker secrets. Use official
test keys for unit/E2E environments, never the production widget on localhost.

### 4. Correct and complete the Postmark provider contract

**Files:**

- `features/outreach/postmark-provider.ts`
- `features/outreach/providers.ts`
- `features/outreach/processor.ts`
- `features/outreach/email-action-token.ts`
- `app/api/outreach/email/confirm/route.ts`
- `app/api/outreach/provider/events/route.ts`
- `app/confirm-email/page.tsx`
- `.env.example`
- `tests/outreach-postmark-provider.test.ts`
- `tests/outreach-email-action-token.test.ts`
- `tests/outreach-email-routes.test.ts`
- `tests/outreach-processor.test.ts`

Replace the single stream setting with explicit configuration:

```text
POSTMARK_TRANSACTIONAL_MESSAGE_STREAM
POSTMARK_BROADCAST_MESSAGE_STREAM
OUTREACH_SENDER_POSTAL_ADDRESS
```

The immediate form verification and requested one-to-one introduction use the
transactional stream. The optional follow-up is disabled unless a verified
Broadcast stream exists. Keep `POSTMARK_SERVER_TOKEN`, verified
`POSTMARK_FROM_EMAIL`, private `POSTMARK_INBOUND_ADDRESS`, random webhook Basic
credentials and `OUTREACH_EMAIL_ACTION_SIGNING_SECRET` server-only.

Every email contains FarmerBook's name, verified From address, valid physical
business postal address, privacy link, one-click unsubscribe URL and reply-STOP
instruction. It has no open/click tracking, attachment or copied public-profile
content. The configuration validator rejects placeholder/missing postal
addresses and a sender outside a verified FarmerBook domain.

Version the consent token payload to bind:

```ts
{
  prospectId,
  contactCandidateId,
  engagementType,
  requestedPurposes,
  expiresAt,
}
```

Continue to treat network timeouts and provider 5xx responses as ambiguous and
non-retryable until operator review. Correlate provider events by Postmark
MessageID/outbox metadata, compare Basic credentials in constant time, reject
oversized/unbound payloads, never retain raw reply bodies, and return idempotent
success for duplicate webhook delivery.

### 5. Provider and legal setup outside the repository

The product owner must create or authorize the Postmark account and accept any
vendor terms/billing. In that account:

1. create a dedicated FarmerBook server;
2. verify the `farmerbook.in` sending domain and complete DKIM/custom
   Return-Path/DMARC alignment;
3. create a transactional stream for requested confirmations/introductions;
4. create a Broadcast stream only if the optional follow-up is approved;
5. configure a private inbound address;
6. install HTTPS inbound, bounce, spam-complaint and subscription-change
   webhooks at `/api/outreach/provider/events` with random HTTP Basic
   credentials; disable open/click tracking and webhook content retention;
7. provide a valid FarmerBook business postal address and approve the final
   English/Hindi/Marathi plus international-English text;
8. provide one owner-controlled canary inbox.

Postmark secrets are entered interactively or via standard input into
Cloudflare's encrypted secret store. Never place a secret in a shell argument,
log, committed file or response. Internal signing/password secrets are
independently generated random values; none is reused across purposes.

### 6. Configuration and operations documentation

**Files:**

- `.env.example`
- `README.md`
- `docs/OUTREACH_AGENT_ARCHITECTURE.md`
- `docs/PRODUCTION_RUNBOOK.md`
- `docs/SECRETS_AND_GITHUB_DEPLOYMENT.md`
- `docs/REQUIREMENTS.md`
- `implementation-log.md`
- `.structured-dev-state`

Document the two intake audiences, priority semantics, exact provider stream
split, sender-address requirement, international consent wording, one-follow-up
limit, discovery-only CSV boundary and WhatsApp exclusion. Replace the old
historical migration instructions with the production bridge for this live
environment while retaining a note for clean new installations.

Add an operator checklist for daily queue/complaint/bounce review and reply
handoff. Do not describe the system as continuously messaging, autonomous cold
outreach or WhatsApp-capable.

### 7. Verification gates

Run focused tests after each tranche, then:

```bash
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
npx supabase db reset
npx supabase test db
npm run test:e2e
```

Required evidence:

- full-history and production-shaped schema convergence;
- release control false and runtime paused after migration;
- anonymous/authenticated direct table writes denied;
- service-only intake and delivery RPC grants;
- membership vs collaboration message/token separation;
- international location bounds and self-declared priority mapping;
- confirmation work never starved by priority ordering;
- expired/tampered/replayed nonce and email token rejection;
- missing/mismatched Turnstile hostname/action rejection;
- missing provider/postal address causes an unavailable page and zero outbox
  claim;
- transactional vs Broadcast stream routing;
- exact one introduction and at most one follow-up;
- STOP, unsubscribe, withdrawal, complaint and hard bounce cancel/suppress;
- retry/idempotency behavior for duplicate webhooks and ambiguous sends;
- no email/phone import from `outreach/*.csv`;
- responsive and accessible `/join`, `/partner-interest`, confirmation and
  unsubscribe pages;
- no real provider call in automated tests.

### 8. Staged production release

After the local gates pass and the external inputs exist:

1. take an encrypted/protected live schema/data backup and record the active
   Worker rollback version;
2. rehearse the exact migration against a disposable production-shape clone;
3. apply only `20260817120000_outreach_production_compatibility.sql` followed by
   `20260817130000_outreach_production_safety_completion.sql` in one reviewed
   transaction, verify catalog/RLS/grants, then reconcile both exact timestamps
   in Supabase migration history; do not run unrestricted `db push`;
4. verify `outreach_agent=false` and delivery paused;
5. create the hostname-limited Turnstile widget and install all secrets without
   printing values;
6. upload a Worker version with `ENABLE_OUTREACH_AGENT=true` using Wrangler
   version upload, but send it no production traffic;
7. enable only the database release control while runtime remains paused, then
   test both forms through the staged version using an owner-controlled canary;
8. confirm exactly one confirmation row, token, consent receipt and
   collaboration/member introduction; verify unsubscribe and a synthetic
   bounce/STOP path;
9. resume delivery for the single canary, verify the Postmark receipt and
   provider lifecycle correlation, then pause again for evidence review;
10. after explicit activation approval, deploy gradually and monitor HTTP
    errors, queue age, failures, bounces and complaints; keep batch size at ten
    and no recurring managed-agent schedule in this release.

No discovered channel/group receives a message during this rollout. Outreach
begins by publishing or manually sharing the opt-in URLs through FarmerBook's
owned surfaces. Any future campaign distribution or scheduler requires its own
approval and provider-volume review.

### Rollback

At the first unexpected send, complaint spike, consent mismatch, queue anomaly
or provider-authentication failure:

1. set delivery paused through the audited admin control;
2. set the database `outreach_agent` control false;
3. return Worker traffic to the recorded pre-release version or deploy with
   `ENABLE_OUTREACH_AGENT=false`;
4. stop any external trigger and revoke the Postmark server token/webhook
   credentials if compromise is suspected;
5. verify no pending row is claimable and export bounded audit IDs/counts for
   incident review;
6. retain consent, suppression and immutable event evidence; do not drop tables
   or delete complaint/withdrawal records during operational rollback.

### Detailed todo list

- [x] Receive explicit approval for this written plan. [DONE 2026-08-17]
- [ ] Receive/confirm Postmark account authority, postal address and canary inbox (`ceo@farmerbook.in` is the selected sender, inbound forwarding verified).
- [x] Add the dual-shape forward-only compatibility migrations. [DONE 2026-08-17]
- [x] Add production-shape migration rehearsal and schema-convergence tests. [DONE 2026-08-17]
- [x] Add prospect engagement, international location and farming-approach fields. [DONE 2026-08-17]
- [x] Build `/partner-interest` and shared consent-intake mapping. [DONE 2026-08-17]
- [x] Add self-declared natural/organic/sustainable/general priority mapping. [DONE 2026-08-17]
- [x] Keep confirmations prompt and prioritize only confirmed introduction work. [DONE 2026-08-17]
- [x] Bind membership/collaboration type into consent tokens and messages. [DONE 2026-08-17]
- [x] Prevent signup invitation creation for collaboration interests. [DONE 2026-08-17]
- [x] Harden Turnstile exact hostname/action verification and page readiness. [DONE 2026-08-17]
- [x] Split Postmark transactional/Broadcast streams and add sender postal footer. [DONE 2026-08-17]
- [x] Preserve no-tracking, suppression, ambiguous-send and webhook boundaries. [DONE 2026-08-17]
- [ ] Complete human review of localized consent, confirmation, unsubscribe and collaboration copy (English fallback is implemented).
- [x] Update environment, architecture, runbook, requirements, log and state docs. [DONE 2026-08-17]
- [x] Run all focused/full application, database, RLS, E2E and diff gates. [DONE 2026-08-17]
- [ ] Take a protected production backup and rehearse the exact migration.
- [ ] Apply only the two isolated migrations; verify controls remain off/paused.
- [ ] Create restricted Turnstile widget and install encrypted secrets.
- [ ] Configure and verify Postmark domain, streams, inbound and lifecycle webhooks.
- [ ] Upload a no-traffic Worker version and run one owner-controlled canary.
- [ ] Review canary consent, receipt, STOP/bounce/unsubscribe and audit evidence.
- [ ] Obtain explicit activation approval before gradual production traffic.

### Approval checkpoint

The product owner approved this concrete implementation plan on 2026-08-17.
Code, tests and a default-off release candidate may proceed. Real delivery and
final activation still require product-owner authority for the Postmark
account/domain setup, a valid FarmerBook business postal address, an
owner-controlled canary inbox, successful staged evidence, and a separate
activation approval. Until those inputs exist, the public intake must fail
closed and no outreach message may be sent.
