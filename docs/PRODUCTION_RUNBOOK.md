---
title: FarmerBook production runbook
status: Release gate
last_reviewed: 2026-08-18
---

# FarmerBook production runbook

This runbook controls staging validation, production release, verification, and
rollback for FarmerBook. It is intentionally stricter than a local demo. A
checked box means evidence exists for the exact release candidate and target
environment; it does not mean that a similar check passed previously.

> **Hard stop:** Do not apply a production migration, enable a production
> feature flag, or deploy a Worker until the release approver has reviewed the
> evidence bundle in section 9 and explicitly approved that mutation. Plan or
> pull-request approval is not production release approval.

The current application is a Vinext/Cloudflare Worker backed by Supabase Auth,
Postgres, and Storage. Live marketplace routes must use only authoritative
Supabase data. Fictional inventory is allowed only on the visibly labelled,
read-only `/marketplace/demo` route.

```text
[Immutable candidate] -> [Staging gates] -> [Evidence bundle] -> [Approval]
         |                    |                    |                 |
         +---- failure -------+--------------------+----> [STOP]
                                                                     |
                                      [Production mutation] -> [Smoke]
                                                                     |
                                                    critical failure v
                                            [Worker rollback]
                                                    +
                                      [Forward schema correction]
```

**Sources:** [package scripts](../package.json), [runtime environment
validation](../lib/env.ts), [Worker build configuration](../vite.config.ts),
[product release gates](MVP_PRODUCT_DESIGN.md), [Cloudflare Wrangler command
reference](https://developers.cloudflare.com/workers/wrangler/commands/workers/)

## 1. Required release record and ownership

Create one immutable release record before doing any environment work. Store
the record and command transcripts in an access-controlled evidence location;
do not commit database dumps, access tokens, secret values, private contact
data, or production logs to this repository.

| Field | Required value |
|---|---|
| Release ID | **REQUIRED:** unique release/change identifier |
| Release | **REQUIRED:** `A`, `B`, or `C` |
| Candidate commit | **REQUIRED:** full Git commit SHA |
| Candidate migration checksum manifest | **REQUIRED:** artifact path and SHA-256 |
| Staging Supabase project reference | **REQUIRED:** non-production project reference |
| Production Supabase project reference | **REQUIRED:** production project reference |
| Staging Worker name and origins | **REQUIRED:** names and URLs |
| Production Worker name and origins | **REQUIRED:** names and URLs |
| Release operator | **REQUIRED:** named person and approved contact method |
| Release approver | **REQUIRED:** named person distinct from the evidence producer |
| Database/backup owner | **REQUIRED:** named person and escalation method |
| Cloudflare owner | **REQUIRED:** named person and escalation method |
| Supabase/Auth owner | **REQUIRED:** named person and escalation method |
| Moderator | **REQUIRED:** named person and response coverage |
| Privacy/data-rights owner | **REQUIRED:** named person and request channel |
| Incident commander/on-call | **REQUIRED:** named rotation or person and paging method |
| Security escalation | **REQUIRED:** named destination and severity path |
| Previous healthy Worker version | **REQUIRED:** exact version ID observed immediately before release |
| New Worker version | **REQUIRED after deploy:** exact version ID and traffic percentage |

An unresolved `REQUIRED` entry is a failed production gate. An `.example`
address, a team name without a reachable person, or an undocumented chat thread
is not an operational contact.

**Expected outcome:** every production mutation and every rollback has one
owner, one approver, an exact target, and an auditable evidence location.

**Sources:** [privacy notice release placeholder](../app/privacy/page.tsx),
[account deletion behavior](../features/profiles/account-actions.ts), [MVP
release gates](MVP_PRODUCT_DESIGN.md)

## 2. Environment isolation

Local, staging, and production must not share a Supabase project, Worker,
custom domain, OAuth application/redirect allowlist, Turnstile secret, SMTP
credentials, service-role key, Storage recovery location, or release account.

| Property | Local | Staging | Production |
|---|---|---|---|
| Purpose | Development and explicit fictional demos | Production-shaped validation with non-production records | Real pilot traffic and records |
| Supabase | Local CLI stack or dedicated development project | Dedicated staging project | Dedicated production project |
| Worker | Local Miniflare/Vinext process | Dedicated staging Worker and staging-only routes | Production Worker and approved production routes |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | **REQUIRED:** staging HTTPS origin | **REQUIRED:** production HTTPS origin |
| `NEXT_PUBLIC_DEMO_MODE` | May be `true` | Must be `false` | Must be `false` |
| Custom domains | None | Staging-only domain(s) | Production domain(s) |
| Seed data | Fictional local data is allowed | Only approved non-production test data | Never run `supabase/seed.sql` |
| OAuth | Local callback in non-production provider configuration | Staging callback only | Production callback only |
| Email recipients | Developer/test mailboxes | Approved external test mailboxes | Real users after release approval |
| Feature flags | May vary for development | Match the release canary under test | Off by default; enable only per sections 10–12 |

### Isolation checks

1. Record the three Supabase project references and prove they are different.
2. Record the generated Worker name and route list for staging and production;
   prove no route overlaps.
3. Verify the environment's `NEXT_PUBLIC_SITE_URL` exactly matches its browser
   origin and Supabase Auth Site URL.
4. Verify callback allowlists contain only the intended origin plus
   `/auth/callback`. Do not point staging OAuth at production.
5. Verify the browser publishable key belongs to the target project. Never use
   a service-role key as a public value.
6. Generate staging and production builds separately. Do not reuse a build
   artifact whose generated `dist/server/wrangler.json` contains another
   environment's URL, routes, or public key.

If staging isolation is not yet provisioned, production readiness is blocked;
local demo tests are not an acceptable substitute.

**Expected outcome:** a write, authentication callback, upload, or rollback in
one environment cannot alter or route traffic to another.

**Sources:** [local Supabase configuration](../supabase/config.toml), [public
runtime guard](../lib/env.ts), [generated Worker inputs](../vite.config.ts),
[OAuth implementation notes](../README.md)

## 3. Runtime variables, secrets, and feature flags

### Application and Worker configuration

| Name | Classification | Local | Staging/production requirement |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public Worker variable | Optional for explicit demo-only work | Required; must identify the target environment |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public Worker variable | Optional for explicit demo-only work | Required; target project's publishable key only |
| `NEXT_PUBLIC_SITE_URL` | Public Worker variable | Defaults to localhost | Required absolute HTTPS origin |
| `NEXT_PUBLIC_DEMO_MODE` | Public Worker variable | `true` permitted | Exactly `false` |
| `FARMERBOOK_CUSTOM_DOMAINS` | Build-time route input | Empty | Required environment-specific comma-separated domains; inspect generated routes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Worker secret | Development project key only when needed | Required for moderation/account administration; secret store only |
| `WEBSITE_GREETER_MODEL` | Server Worker variable | Cheapest allowlisted Workers AI model | Keep `@cf/ibm-granite/granite-4.0-h-micro` unless a priced allowlist change is reviewed |
| `WEBSITE_GREETER_MONTHLY_BUDGET_USD` | Server Worker variable | `8` | At most `8`; never raise without a new fleet budget approval |
| `WEBSITE_GREETER_MONTHLY_REPLY_LIMIT` | Server Worker variable | `25000` | At most `25000` for the first-agent release |
| `WEBSITE_GREETER_DAILY_AI_REPLY_LIMIT` | Server Worker variable | `1000` | At most `1000`; the model call stops when reached |
| `AI_FLEET_BUDGET_AGENT` | Private SQLite Durable Object binding | Required for model inference | Bind `AiFleetBudgetAgent`; never expose it through an HTTP Agent route |

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It must never have a `NEXT_PUBLIC_`
prefix, appear in `.env.example` with a value, be printed in evidence, or appear
in the generated Wrangler `vars` object. Use the approved Cloudflare secret
mechanism and record only that a binding exists, its owner, and its rotation
date.

The generated Worker configuration is the deployment input. `--keep-vars`
preserves dashboard-managed values, but it does not remove the need to inventory
and compare them with the approved release record.

### Feature flags

Feature flags are exact-string booleans. All unreleased product capabilities
stay `false` until their release gate passes. The sole exception is the shipped
locale catalog: `ENABLE_EXTENDED_LOCALES` defaults to enabled when unset and an
explicit `false` is its emergency rollback.

| Flag | Release | Enable only after |
|---|---|---|
| `ENABLE_CANONICAL_AGRICULTURE_TAXONOMY` | B | taxonomy migration, seed, compatibility, and RLS gates pass |
| `ENABLE_RESUMABLE_ONBOARDING` | B | taxonomy/capability support and multi-role resume/finalization tests pass |
| `ENABLE_EXTENDED_LOCALES` | Shipped accessibility capability | enabled by default; unreviewed strings disclose their Indian-English fallback; set `false` only for emergency rollback |
| `ENABLE_INC_SOURCING` | B | Inc organization/representative/licence claims, sourcing-request RLS, moderation, farmer-response, localization, and staged database evidence pass |
| `ENABLE_AGRI_BUSINESSES` | C | organization membership/RLS, onboarding, moderation, privacy, and discovery gates pass |
| `ENABLE_BUSINESS_OFFERS` | C | business foundation plus offer expiry, enquiry, moderation, abuse, and discovery gates pass |
| `ENABLE_OUTREACH_AGENT` | Controlled growth add-on | consent wording/legal review, Turnstile, provider/DLT-DCA approval, suppression, retention, webhook, outbox, and incident gates pass |
| `ENABLE_PROFILE_RESEARCH_AGENT` | Managed private-profile add-on | outreach consent/provider gates, Agents SDK binding/migration, Workflow, private preview, verification-claim RLS, retention/deletion, cost, and staged approval/claim journeys pass |
| `ENABLE_MANAGED_OPERATIONS_AGENTS` | Purpose-limited operations fleet | outreach/profile prerequisites, four Durable Object bindings, processor secret, private fleet migration, automatic-pause, audit, scheduling and synthetic staging journeys pass |
| `ENABLE_PRIVATE_FARMER_CONTACTS` | Founder-owned consent database | owner UUID, encryption/rotation plan, private migration/RLS, synthetic consent and deletion, transient YouTube, approved email provider and rollback evidence pass |
| `ENABLE_SOURCED_FARMER_RESEARCH` | Founder-only sourced research | owner UUID, official YouTube key/privacy review, private migration/RLS, contact-redaction, 30-day refresh/purge and synthetic evidence-review rollback pass |

Release A runs with unreleased product flags `false`; the shipped locale catalog
remains enabled. Release B must not enable Release C flags.
`ENABLE_BUSINESS_OFFERS` must not be enabled before
`ENABLE_AGRI_BUSINESSES`.

The Worker flags are rollout controls, not authorization boundaries. The
database also owns twelve private controls in
`public.ecosystem_release_controls`: `extended_locales`,
`resumable_onboarding`, `agri_businesses`, `business_offers`,
`outreach_agent`, `inc_sourcing`, `profile_research_agents`,
`managed_operations_agents`, `featured_farmer_profiles`,
`private_farmer_contacts`, `sourced_farmer_research`, and
`support_social_pilot`. Every row is
seeded `false`; `anon` and `authenticated` have no privileges on the control
table. Change them only through a reviewed SQL console/session running as the
database owner or service role, and record the operator and change ticket.

Before and after every rollout or rollback, verify all twelve rows:

```sql
select control_key, enabled, updated_at
from public.ecosystem_release_controls
order by control_key;
```

Activate one reviewed control at a time (substitute exactly one approved key):

```sql
begin;
update public.ecosystem_release_controls
set enabled = true
where control_key = 'extended_locales';
commit;
```

Use the same statement with `enabled = false` for rollback. A missing row or an
unexpected row count is a failed gate; do not insert an ad-hoc control key.

Prepare the flag-enabled Worker candidate without routing public traffic, then
enable only the matching database control, run the readiness/smoke probe, and
start the approved canary. If a gate fails, disable the database control first
so direct PostgREST/RPC access fails closed, then disable the Worker flag or
roll back the Worker. Never enable all controls as a convenience.

### External configuration

| Integration | Required record |
|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | **REQUIRED:** target hostname/action, owner, rotation procedure; public value only |
| `TURNSTILE_SECRET_KEY` | **REQUIRED:** server-side verification owner and rotation procedure; secret store only |
| `OUTREACH_CONSENT_SIGNING_SECRET` | **REQUIRED:** at least 32 random bytes; consent form nonce signing; secret store only |
| `OUTREACH_INVITATION_SIGNING_SECRET` | **REQUIRED:** separate value of at least 32 random bytes; one-time account invitation signing; secret store only |
| `OUTREACH_PROCESSOR_SECRET` | **REQUIRED:** at least 32 random bytes; scheduler-to-processor authentication; secret store only |
| `MANAGED_AGENT_PROCESSOR_SECRET` | **REQUIRED for the managed fleet:** separate value of at least 32 random bytes; private Durable Object-to-processor authentication; secret store only |
| `OUTREACH_PROVIDER_BASE_URL` | **REQUIRED:** approved HTTPS provider endpoint; record data region, processor and contract version |
| `OUTREACH_PROVIDER_API_TOKEN` | **REQUIRED:** provider API token; secret store only |
| `OUTREACH_PROVIDER_WEBHOOK_SECRET` | **REQUIRED:** at least 32 random bytes; HMAC webhook verification; secret store only |
| `OUTREACH_PROVIDER_KIND` | Set to `postmark` only for the reviewed native email adapter; omit it to retain the generic fail-closed gateway |
| `POSTMARK_SERVER_TOKEN` | **REQUIRED for email:** server-scoped token; secret store only; never use the account token |
| `POSTMARK_FROM_EMAIL` | **REQUIRED for email:** `ceo@farmerbook.in`; currently receive-only, so outbound use is prohibited until Postmark verification plus SPF, DKIM, Return-Path and DMARC evidence pass |
| `POSTMARK_INBOUND_ADDRESS` | **REQUIRED for email replies:** exact private inbound Postmark address used with per-outbox plus addressing |
| `POSTMARK_TRANSACTIONAL_MESSAGE_STREAM` | **REQUIRED for email:** transactional stream for requested confirmations, introductions and bounded replies |
| `POSTMARK_BROADCAST_MESSAGE_STREAM` | **REQUIRED only for the optional follow-up:** reviewed Broadcast stream; leave unset to keep follow-ups unavailable |
| `POSTMARK_WEBHOOK_USERNAME` | **REQUIRED for email:** random Basic-auth username of at least 12 characters; secret store only |
| `POSTMARK_WEBHOOK_PASSWORD` | **REQUIRED for email:** random Basic-auth password of at least 32 characters; secret store only |
| `OUTREACH_SENDER_POSTAL_ADDRESS` | **REQUIRED for email:** valid FarmerBook business postal address included in every message; placeholders fail configuration |
| `OUTREACH_EMAIL_ACTION_SIGNING_SECRET` | **REQUIRED for email:** separate value of at least 32 random bytes for double-opt-in and unsubscribe links |
| `GOOGLE_LEAD_WEBHOOK_SECRET` | **REQUIRED only when Google lead forms are enabled:** per-form secret, owner and rotation evidence |
| `BRAVE_SEARCH_API_KEY` | **REQUIRED for name discovery:** install directly with `wrangler secret put BRAVE_SEARCH_API_KEY`; never expose through a Vite/public variable, logs, source, or support transcript |
| `BRAVE_SEARCH_STORAGE_RIGHTS_CONFIRMED` | **REQUIRED for name discovery:** set `true` only after recording that the selected Brave plan explicitly grants storage rights for the retained result snippets; otherwise discovery fails closed |
| `YOUTUBE_DATA_API_KEY` | **REQUIRED only for approved Farmer editorial/research YouTube discovery:** install directly with `wrangler secret put YOUTUBE_DATA_API_KEY` after Google Cloud project, API restriction, privacy and YouTube policy review; never expose through Vite/public variables, logs, support output or client props |
| Verification-document storage | **REQUIRED before Release C:** private bucket/binding names, encryption/access policy, malware/content handling, backup/restore proof |
| Error monitoring | **REQUIRED:** environment-specific DSN/binding name, redaction rules, alert destination; never record the value here |

**Expected outcome:** public values are safe to expose, secrets exist only in
their environment's secret manager, and no disabled capability can be reached
through navigation, a server action, or direct database access.

**Sources:** [.env contract](../.env.example), [feature flag parser](../lib/feature-flags.ts),
[admin Supabase client](../lib/supabase/admin.ts), [Worker variable
projection](../vite.config.ts), [Cloudflare deploy/secret behavior](https://developers.cloudflare.com/workers/wrangler/commands/workers/),
[Brave authentication contract](https://api-dashboard.search.brave.com/documentation/guides/authentication),
[Brave result-storage requirement](https://brave.com/search/api/),
[YouTube search.list contract](https://developers.google.com/youtube/v3/docs/search/list),
[YouTube API developer policies](https://developers.google.com/youtube/terms/developer-policies)

### Managed Agent cost and organic-certificate gates

The private singleton `AiFleetBudgetAgent` is the hard application circuit
breaker for all allowlisted Workers AI inference. It atomically reserves a
conservative maximum model cost before every call and enforces USD 10 per UTC
month across the fleet: greeting USD 5, blog USD 2, growth/OCR USD 3, and
profile/support/social USD 0. No environment variable or
administrator control can raise or reassign these caps. The private ledger
stores only bounded cost/count/model metadata and has no public Agent route.

This circuit breaker does not cap Worker requests, Durable Object operations,
storage or other platform charges. Its retail-value reservations do not
subtract Cloudflare's account-wide daily free Neuron allocation and can
therefore exceed invoiced Workers AI spend. Cloudflare account budget alerts
are informational, not a usage stop. A dedicated Cloudflare Workers Free
account/project may be retained as an additional provider-side fail-closed
boundary; on Workers Paid, the release owner must separately accept metered
platform overage.

Before traffic, prove in staging that:

- the Agent answers contact, licence and organic-certification questions from
  reviewed zero-token answers;
- the eighth session reply is the last and monthly/daily/budget exhaustion
  returns contact details without calling a model;
- an unsupported `WEBSITE_GREETER_MODEL` value falls back to the priced Granite
  allowlist entry;
- a denied workstream or fleet reservation results in zero Workers AI calls,
  and a failed or missing settlement retains the full reservation;
- `/admin/agents` shows the UTC month, USD 10 ceiling, full USD 10 allocation,
  USD 0 unavailable reserve and only aggregate cost/call outcomes;
- profile drafting, customer support and social content take their existing
  deterministic fallback paths with zero model calls;
- `ENABLE_MANAGED_OPERATIONS_AGENTS` and `ENABLE_SUPPORT_SOCIAL_PILOT` remain
  `false` for the first-agent release;
- Worker, Durable Object and Workers AI usage are reviewed weekly until a
  stable traffic baseline exists.

The organic-certification migration is a separate release gate. Rehearse an
organic Farmer uploading a private PDF, verify that anonymous/authenticated
outsiders cannot read it, confirm the public label remains non-certified while
pending and after rejection, and approve it only through the administrator RPC.
Then prove that changing away from organic practices revokes the status and
that direct listing inserts cannot create an organic-certification claim.

## 4. Candidate and migration inventory

Run this section from a clean checkout of the exact candidate commit. If
`git status --short` is non-empty, stop and produce a committed, reviewable
candidate first.

```sh
git status --short
git rev-parse HEAD
node --version
npm --version
./node_modules/.bin/wrangler --version
```

The repository requires Node 22.13.0 or newer and pins Wrangler and Supabase
CLI `2.113.0` through `package.json` and `package-lock.json`. Use that local CLI
(`./node_modules/.bin/supabase`) for release evidence; do not substitute an
unrecorded global version.

Before staging, run `npm audit --omit=dev` and require zero known production
advisories. Record the complete `npm audit` result too. Vinext `0.0.50` currently
uses `image-size` only while building trusted repository metadata/static image
files; do not allow user-controlled ICNS, JXL, or HEIF into the build. Until a
patched compatible Vinext/image-size release exists, record this build-time-only
exception and obtain security-owner approval, or stop the release.

Create a checksum manifest before staging migration work:

```sh
export FB_EVIDENCE_DIR="/secure/release-evidence/REQUIRED_RELEASE_ID"
export FB_TARGET_PROJECT_REF="REQUIRED_STAGING_PROJECT_REF"
mkdir -p "$FB_EVIDENCE_DIR"
git rev-parse HEAD > "$FB_EVIDENCE_DIR/candidate-commit.txt"
for file in supabase/migrations/*.sql; do shasum -a 256 "$file"; done \
  > "$FB_EVIDENCE_DIR/migration-sha256.txt"
shasum -a 256 supabase/seed.sql package-lock.json \
  > "$FB_EVIDENCE_DIR/release-input-sha256.txt"
supabase link --project-ref "$FB_TARGET_PROJECT_REF"
supabase migration list --linked \
  > "$FB_EVIDENCE_DIR/remote-migrations-before.txt"
```

The candidate inventory must include, in filename order, every committed SQL
file under `supabase/migrations/`. For each file record:

- local filename and SHA-256;
- whether the target reports it as applied;
- the target/environment where it was applied;
- the apply timestamp and operator;
- whether its bytes match the version tested in staging.

Do not apply a migration when a timestamp is present remotely but the local
checksum cannot be proven, when a remote-only migration is unexplained, or when
a local migration's bytes changed after staging. `migration repair` changes
history; it requires its own diagnosis and approval and is not a way to bypass
drift.

Before the production window, relink explicitly to the production project,
repeat `supabase migration list --linked`, and compare the project reference and
manifest. Never infer the current target from a previous terminal session.

**Expected outcome:** local and remote history is explained, migration bytes
are immutable between staging and production, and the operator can name the
exact target before applying anything.

**Common failure:** the repository can contain untracked migrations during
development. Untracked or modified migration files are not deployable release
artifacts even if their local tests pass.

**Sources:** [committed migrations](../supabase/migrations/), [Supabase migration
list reference](https://supabase.com/docs/reference/cli/supabase-projects-create),
[Supabase database migration guide](https://supabase.com/docs/guides/deployment/database-migrations)

## 5. Backup and restore evidence

A backup is not release evidence until a restore has succeeded in a disposable
staging/recovery target and the restored state has been checked. Choose one
approved path:

1. a provider-supported backup/restore or restore-to-new-project capability; or
2. an encrypted logical backup stored outside the source project, using the
   current official Supabase procedure.

For a logical backup, the official procedure separates roles, schema, and data.
Generate it only from the verified source project and keep connection strings
and dumps out of shell history, CI logs, and this repository:

```sh
supabase db dump --db-url "$FB_SOURCE_DB_URL" -f roles.sql --role-only
supabase db dump --db-url "$FB_SOURCE_DB_URL" -f schema.sql
supabase db dump --db-url "$FB_SOURCE_DB_URL" -f data.sql --use-copy \
  --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
shasum -a 256 roles.sql schema.sql data.sql
```

`FB_SOURCE_DB_URL` is a secret supplied through the approved credential
mechanism. Do not paste it into a ticket or commit it. Follow the official guide
for restore order, managed schemas, encryption keys, migration history, and
role handling; do not improvise a production restore from this abbreviated
capture example.

### Required restore drill evidence

- **REQUIRED:** backup method, plan/tier, backup ID or artifact references,
  creation time, source project, operator, and encrypted off-site location.
- **REQUIRED:** SHA-256 for every logical artifact, or provider backup/restore
  identifier for a managed backup.
- **REQUIRED:** disposable restore target, start/end time, transcript, and named
  database owner who verified it.
- **REQUIRED:** restored migration history and schema/RLS/function comparison.
- **REQUIRED:** before/after counts for profiles, listings, produce enquiries,
  reviews, categories, custom category requests, onboarding drafts, and—when
  present—organizations, memberships, offers, offer enquiries/events, and
  verification records.
- **REQUIRED:** sample integrity checks for authentication, one public record,
  one private record, one owner-only record, and one admin-only operation,
  without copying private values into evidence.
- **REQUIRED:** separate Storage object export and restore proof. Database
  backups contain Storage metadata but do not restore deleted object bodies.
- **REQUIRED:** reconfiguration checklist for Auth URLs, OAuth providers, SMTP,
  CAPTCHA, rate limits, API keys, Storage settings, and other settings that are
  not recreated by a database restore.
- **REQUIRED:** recovery point objective and recovery time objective approved by
  the product/privacy owner; never infer these values from a hosting tier.

If any required data class or Storage object cannot be restored, stop the
release. Do not describe provider durability as restore proof.

**Expected outcome:** the team can restore the candidate's pre-migration state
outside the production project and can explain any count difference.

**Sources:** [Supabase database backups](https://supabase.com/docs/guides/platform/backups),
[Supabase CLI backup/restore procedure](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore),
[Supabase restore-to-new-project limitations](https://supabase.com/docs/guides/platform/clone-project),
[Storage buckets and policies](../supabase/migrations/20260729160000_initial_farmerbook.sql)

## 6. Database, seed, RLS, and browser gates

Run every gate against the exact candidate. Static SQL assertions are useful but
do not replace executable authorization tests against Postgres.

### 6.1 Empty local database

```sh
supabase start
supabase db reset
supabase migration list --local
npm run test
```

Pass criteria:

- every migration applies in filename order to an empty database;
- `supabase/seed.sql` completes during reset and does not manufacture Auth users;
- the expected private `avatars` and `post-images` buckets, limits, and policies
  exist;
- all functions, grants, triggers, constraints, and indexes exist once;
- no configured live route receives fictional fixture IDs.

`supabase/seed.sql` is local-development enrichment only. Never execute it in
production. If staging uses it, the environment must be an isolated disposable
test target and the release record must say so.

### 6.2 Seed idempotence

Apply the seed twice to the same isolated local database using the reviewed
local database connection method. Record the transcript and before/after row
counts. The second apply must not duplicate data, change already completed real
profiles, or fail. Do not perform this test against production.

### 6.3 Migration rehearsal

1. Rehearse on an empty database.
2. Rehearse on a disposable restored copy of production.
3. Capture pre/post counts for every affected table and query plans for changed
   discovery/listing queries.
4. Run `supabase db push --linked --dry-run` against staging and compare its
   proposed migrations to the checksum manifest.
5. Apply only to staging, rerun `supabase migration list --linked`, and confirm
   no unexpected migration remains.
6. Do not apply to production until section 9 approval.

### 6.4 RLS and capability matrix

```sh
npx vitest run tests/rls-migration.test.ts \
  tests/agriculture-ecosystem-rls.test.ts
supabase test db
```

Executable tests must prove allowed and denied behavior for anonymous,
incomplete, Farmer, Customer, Wholesaler, agricultural-business owner/admin/
editor/enquiry-agent/viewer, outsider, suspended member, moderator, and service
role as applicable to the release. At minimum cover profiles, media, produce,
enquiries, reviews, conversations/messages, reports/moderation, categories,
custom categories, onboarding drafts, organizations, offers, and verification
evidence.

If `supabase test db` has no real SQL tests, or only static source-text checks
exist, the production gate fails.

### 6.5 Build and browser gates

```sh
npm ci
npm run check
npm run test:e2e
npm run test:e2e:configured
```

`npm run check` must pass lint, TypeScript, all Vitest tests, and a production
Vinext build. Playwright must pass on desktop and mobile. The configured suite
must use isolated staging accounts and a real staging Supabase project so it
exercises persistence and RLS. If `test:e2e:configured` is absent, production
readiness is blocked; the unconfigured/demo suite is not a substitute.

Browser coverage must include public, authenticated, seller/customer,
moderator, locale/RTL, company/offer, error, loading, empty, expired, blocked,
and unauthorized states appropriate to the release. It must prove that live
routes never display demo fixtures and `/marketplace/demo` remains labelled,
`noindex`, and read-only.

**Expected outcome:** migrations work on empty and existing data, seed behavior
is bounded, database authorization is executed for every role, and configured
desktop/mobile journeys persist only authorized state.

**Sources:** [Supabase local configuration](../supabase/config.toml), [local
seed](../supabase/seed.sql), [RLS static guard](../tests/rls-migration.test.ts),
[agriculture RLS guard](../tests/agriculture-ecosystem-rls.test.ts), [Playwright
configuration](../playwright.config.ts), [Supabase CLI reference](https://supabase.com/docs/reference/cli/supabase-projects-create)

## 7. External-service gates

### Turnstile and abuse controls

Turnstile is a required gate for signup and any retained anonymous produce-
enquiry path. The current release must not expose those writes publicly until
all of the following are evidenced:

- **REQUIRED:** separate staging and production site/secret keys;
- exact allowed hostnames and expected action names;
- accessible browser behavior, expiry/retry behavior, and failure copy;
- server-side token verification with bounded timeouts, hostname/action checks,
  and fail-closed handling;
- proof that direct anonymous database inserts cannot bypass the verification
  boundary;
- per-origin/account/target throttles, duplicate suppression, and privacy-safe
  abuse telemetry;
- secret rotation and outage/bypass decision owner. There is no silent bypass.

If the implementation or exact binding names do not yet exist, this gate is
**BLOCKED**, not “not applicable.”

### SMTP and authentication email

Supabase's default mail facility is not a production sender. Configure custom
SMTP separately in staging and production and record:

- provider and named owner;
- sending domain plus SPF, DKIM, and DMARC evidence;
- From address, templates, redirect origin, and approved rate limits;
- secret location and rotation procedure without recording credentials;
- successful signup confirmation and password-reset delivery to at least two
  non-team external mailbox providers;
- bounce/complaint monitoring and outage escalation.

Do not disable email confirmation to make a failed SMTP gate pass.

### Google and Facebook OAuth

FarmerBook supports Google and Facebook. For each environment:

1. Verify the provider is enabled in the intended Supabase project.
2. Verify its provider secret is stored in Supabase, never in browser variables.
3. Verify the provider callback targets that Supabase project.
4. Verify Supabase's Site URL and redirect allowlist contain the exact
   environment `/auth/callback` and no unintended wildcard/production crossover.
5. Complete login, signup, cancellation, provider error, callback error, and
   safe post-auth redirect tests.
6. Verify imported provider avatars accept only the implementation's bounded,
   trusted HTTPS sources and become controlled Storage objects.

LinkedIn, Instagram, and passkeys are not supported authentication providers in
this release.

### Storage

Verify `avatars` and `post-images` are private, limited to JPEG/PNG/WebP and 5
MiB, and writable only under the authenticated user's top-level folder. Verify
signed read URLs, owner removal, public Farmer profile media policy, blocked/
suspended behavior, and object cleanup behavior.

Before Release C, define and test a separate private verification-document
boundary. **REQUIRED:** bucket name, authorized roles, upload/download/delete
policy, file controls, encryption, malware/content review, retention/deletion,
audit logging, backup/export, restore, and incident owner. Never reuse a public
profile-media policy for verification evidence.

### Operations

Before real users, verify environment-specific error monitoring, redaction,
alerts, cost limits, database capacity/connection alerts, Worker error-rate and
latency alerts, SMTP/bounce alerts, Auth abuse alerts, Storage usage alerts, and
Supabase/Cloudflare status subscriptions. Evidence must show a test alert
reached the named incident contact.

**Expected outcome:** signup, reset, OAuth, uploads, abuse controls, and alerts
work in the target environment without exposing secrets or private content.

**Sources:** [Supabase custom SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp),
[Supabase CAPTCHA/Turnstile guidance](https://supabase.com/docs/guides/auth/auth-captcha),
[FarmerBook OAuth flow](../features/auth/actions.ts), [OAuth provider status
check](../features/auth/providers.ts), [profile upload controls](../features/profiles/uploads.ts),
[post upload controls](../features/posts/uploads.ts), [Storage migration](../supabase/migrations/20260729160000_initial_farmerbook.sql)

## 8. Wrangler dry run and configuration inspection

Build with the target environment's non-secret values, then run a dry run using
the locally pinned Wrangler. The extra CA file below is the repository's
documented operating requirement for the current deployment environment; if it
does not exist on the release host, stop and diagnose trust configuration.

```sh
npm ci
npm run check
npm run build
NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem \
  ./node_modules/.bin/wrangler deploy \
  --config dist/server/wrangler.json \
  --dry-run \
  --keep-vars \
  --strict
```

Capture the dry-run transcript after redaction. Inspect
`dist/server/wrangler.json` and record, without copying credential values:

- Worker name and compatibility date/flags;
- Worker entry point and assets directory;
- target custom domains/routes and `workers_dev` behavior;
- observability state;
- every public variable name and the environment it identifies;
- every binding type/name;
- absence of the Supabase service-role key, Turnstile secret, OAuth/SMTP secret,
  database password/URL, access token, or monitoring credential from `vars`,
  source maps, and built output;
- `NEXT_PUBLIC_DEMO_MODE` is absent or exactly `false` for staging/production;
- Supabase URL/publishable key and Site URL belong to the target environment.

Fail the gate if the generated configuration points to the wrong environment,
contains an unapproved route/binding, exposes a secret, or differs from the
configuration tested in staging. A successful `--dry-run` does not authorize a
deployment.

**Expected outcome:** the exact Worker artifact compiles and its routes,
bindings, and public variables match the release record without uploading it.

**Sources:** [Vinext/Cloudflare configuration](../vite.config.ts), [Worker entry
point](../worker/index.ts), [package-pinned Wrangler](../package.json),
[Cloudflare `deploy --dry-run` reference](https://developers.cloudflare.com/workers/wrangler/commands/workers/)

## 9. Separate production release approval

Stop after staging validation and dry run. Present one evidence bundle containing:

1. release ID, release `A`/`B`/`C`, full commit SHA, clean-checkout evidence,
   dependency lock checksum, and test tool versions;
2. exact ordered migration list, SHA-256 manifest, staging/production remote
   migration inventories, and production `db push --dry-run` output;
3. backup identifiers/checksums, separate Storage backup evidence, and the
   successful disposable restore drill transcript/count comparison;
4. empty-database, repeated-seed, migration-rehearsal, executable RLS, full
   build, configured browser, accessibility/RTL, and staging smoke transcripts;
5. Turnstile, SMTP, OAuth, Storage, alerting, contact, moderation, privacy,
   retention, and deletion evidence applicable to the release;
6. generated Worker configuration review and Wrangler dry-run transcript;
7. current production Worker version list, exact previous healthy version ID,
   proposed deploy command, rollback command, and smoke owner;
8. known issues and an explicit statement that none affects confidentiality,
   authorization, data integrity, authentication, recovery, or primary journeys.

The release approver must record one of:

- **APPROVED:** exact release ID, commit, migrations, Worker target, flags,
  window, and approver identity; or
- **REJECTED/BLOCKED:** reason and required remediation.

Approval for Release A does not authorize Release B or C. Approval for a Worker
does not authorize an unlisted database migration or flag change. If the
candidate, migration checksum, environment target, or generated Worker config
changes, regenerate evidence and obtain approval again.

**Sources:** [FarmerBook rollout plan](../PLAN.md), [MVP production gate](MVP_PRODUCT_DESIGN.md),
[Cloudflare versions and rollback reference](https://developers.cloudflare.com/workers/wrangler/commands/workers/)

## 10. Release A — honest production baseline

Release A must land before public company inventory. Keep all five agriculture-
ecosystem flags off.

### Scope and gates

- fictional market data exists only on labelled `/marketplace/demo`;
- configured and unconfigured live marketplace/review loaders never emit
  fixture IDs and fail closed to honest empty/not-found states;
- invented activity metrics and overstated verification claims are absent;
- the anonymous listing-policy privilege repair is applied and executable RLS
  tests prove the intended anonymous columns only;
- public Farmer profile behavior and tests pass;
- normal live routes contain no demo banner or fictional entity;
- `/marketplace/demo` is `noindex`, read-only, and exposes no live detail, save,
  enquiry, or storefront action;
- anonymous enquiry/signup abuse gates in section 7 pass before those writes are
  opened to public traffic.

Deploy and smoke Release A independently. Record its Worker version as the
rollback target for Release B.

**Release A rollback:** roll back to the immediately previous recorded healthy
Worker version. Leave additive database changes in place unless a policy is
unsafe; correct an unsafe policy with a reviewed forward migration. Never
restore fixture fallbacks to live routes.

**Sources:** [live marketplace boundary](../features/marketplace/queries.ts),
[live review boundary](../features/reviews/queries.ts), [demo route](../app/marketplace/demo/page.tsx),
[anonymous listing-policy repair](../supabase/migrations/20260804090000_anon_marketplace_policy_access.sql),
[data-boundary tests](../tests/marketplace-data-boundary.test.ts)

## 11. Release B — taxonomy, locales, capabilities, and resumable onboarding

Release B starts from a verified Release A Worker and database. Apply only
additive, checksum-verified migrations while all Release B flags remain off.

### Enablement sequence

1. Apply and verify locale, taxonomy, capability, and onboarding-progress
   schema/data in staging, then production after separate approval.
2. With flags still off, rerun legacy profile/onboarding/marketplace journeys.
3. Enable `ENABLE_CANONICAL_AGRICULTURE_TAXONOMY` for an approved canary; verify
   stable slugs, legacy compatibility, poultry/aquaculture/seafood/allied
   categories, bounded custom requests, and role capability checks.
4. Only after catalog-specific automated coverage and recorded human review,
   enable the private database `extended_locales` control, verify it, and route
   the prepared `ENABLE_EXTENDED_LOCALES` canary. Unreviewed locales remain
   disabled or visibly beta according to approved policy.
5. Enable the private database `resumable_onboarding` control in the reviewed
   operator session, verify it reads `true`, and only then route the prepared
   `ENABLE_RESUMABLE_ONBOARDING` canary. Verify optimistic revision handling,
   locale switching without data loss, resume, validation, visibility review,
   and exactly-once completion for every role.
6. Complete 23-locale smoke coverage and full functional coverage for the
   representative scripts, including RTL, long text, 200% zoom, and authored
   text direction.

Do not enable Release C flags in this release.

**Release B rollback:** in the reviewed database session, first set the affected
`resumable_onboarding` and/or `extended_locales` controls to `false` and verify
the rows. Then turn off the matching Worker flag(s), verify the legacy
English/onboarding/produce path, and roll the Worker back to the recorded
healthy Release A version if necessary. Preserve category identities, locale
rows, drafts, affinities, consent, and additive columns. Correct schema/RLS with
a forward migration.

**Sources:** [agriculture ecosystem migration](../supabase/migrations/20260809120000_agriculture_ecosystem_foundation.sql),
[feature flags](../lib/feature-flags.ts), [agriculture catalogs](../lib/agriculture/categories.ts),
[locale registry](../lib/i18n/locales.ts), [agriculture migration tests](../tests/agriculture-ecosystem-migration.test.ts)

## 12. Release C — companies, offers, shared enquiries, and hardening

Release C starts from a verified Release B baseline. It includes organizations,
membership capabilities, agricultural-business onboarding, offers, public
discovery, shared enquiries/events, moderation, and remaining security/privacy/
operations gates.

### Enablement sequence

1. Apply additive organization/offer/enquiry/moderation migrations with both
   Release C flags off. Rerun all Release A/B compatibility and RLS gates.
2. Verify private registration/contact/verification evidence is absent from
   anonymous rows, public JSON, logs, analytics, metadata, and search indexes.
3. Enable the private database `agri_businesses` control in the reviewed
   operator session, verify it reads `true`, and only then route the prepared
   `ENABLE_AGRI_BUSINESSES` canary. Verify tractor, tool,
   input, logistics, finance, advisory, poultry/aquaculture, and other supported
   sectors; membership roles; company onboarding; public discovery; and honest
   empty states.
4. Verify organization and verification moderation is transactional and
   self-declared, organization-verified, and claim-reviewed states cannot be
   confused.
5. Enable the private database `business_offers` control only after organizations
   pass, verify it reads `true`, and only then route the prepared
   `ENABLE_BUSINESS_OFFERS` canary. Verify product,
   service, rental, promotion, finance/insurance, advisory, training, and support
   offer types; real validity/expiry; service areas; filtering/pagination; and
   no false price/availability claims.
6. Verify signed-in shared offer enquiries, assignment/events, idempotency,
   duplicate suppression, blocked/self-contact denial, rate limits, and role
   isolation. Organization enquiries must not expose private direct messages.
7. Complete Turnstile, SMTP, storage, security headers, health/error boundaries,
   monitoring, SEO/structured-data, accessibility/responsive, retention,
   deletion, moderator, and incident gates before full traffic.

**Release C rollback:** in the reviewed database session, set `business_offers`
to `false` first and then `agri_businesses` to `false` if needed; verify both
rows before changing Worker traffic. Disable `ENABLE_BUSINESS_OFFERS`, then
`ENABLE_AGRI_BUSINESSES`, and roll back to the recorded healthy Release B
Worker. Preserve organizations, memberships, offers, enquiries/events,
verification/audit rows, and all additive schema. Use a forward correction for
unsafe policies, grants, constraints, or data repair.

**Sources:** [company sector catalog](../lib/agriculture/company-sectors.ts),
[FarmerBook release plan](../PLAN.md), [MVP security/privacy gates](MVP_PRODUCT_DESIGN.md)

## 12A. Consent-first acquisition agent

The outreach agent is a separate controlled-growth add-on. Code, schema or
feature-plan approval does not authorize a real campaign, provider purchase,
message delivery or upload of third-party contact lists.

### Required staging evidence

1. On a clean installation, apply the full migration history. On the current
   production-shaped installation, apply only the reviewed
   `20260817120000_outreach_production_compatibility.sql` and
   `20260817130000_outreach_production_safety_completion.sql` bridges, in that
   order and in one transaction; do not run unrestricted `db push`. Rehearse both shapes first
   and verify the Worker flag and private `outreach_agent` control remain off
   while the delivery runtime control remains paused. Prove `anon` and
   `authenticated` cannot read contact candidates, consent receipts, outbox
   rows, suppressions, events or agent runs.
2. Verify `/join` and `/partner-interest` fail closed unless Supabase, the
   service role, HMAC signing secret, exact-action/hostname Turnstile site and
   secret keys, concrete Postmark provider, verified FarmerBook sender and
   postal footer are configured together. Verify an expired or tampered nonce,
   replay, missing/mismatched hostname or action, and failed Turnstile token
   write nothing.
3. Test website intake against private IPs, localhost, credentials in URLs,
   non-HTTPS production URLs, cross-origin redirects, oversized bodies and
   non-text content. For YouTube and social URLs, prove the application never
   fetches the page and instead requires an operator-supplied public description
   or screenshot. Confirm screenshots are re-encoded, bounded and not stored.
4. Prove a discovered email or phone number creates only evidence. It must not
   create an active consent or an introduction outbox row. Test duplicate
   sources, duplicate leads, STOP/decline, expiry, hard bounce and withdrawal.
5. Contract-test the approved provider against `POST /consents`,
   `POST /messages`, `POST /api/outreach/provider/consent` and
   `POST /api/outreach/provider/events`. Prove the processor claims nothing
   when the provider is unconfigured. Prove webhook prospect/contact binding,
   provider receipt idempotency, retry backoff, maximum five attempts and that
   withdrawal during processing prevents delivery. Prove STOP, decline,
   complaint and hard bounce immediately suppress/cancel, while raw reply text
   is classified transiently and is not stored. Only an allowlisted onboarding
   question may create one bounded answer.
   For native Postmark email, replace the generic `/consents` and `/messages`
   gateway checks with its API contract, signed 48-hour double-opt-in page and
   one-click unsubscribe. Verify `ceo@farmerbook.in`, the dedicated
   transactional stream, optional Broadcast follow-up stream, valid postal
   footer, server token and private inbound address. Postmark
   webhooks use random HTTP Basic credentials because Postmark does not provide
   HMAC signatures; bind every inbound/bounce/complaint event back to the exact
   outbox and contact hash. Configure inbound, bounce, spam-complaint and
   subscription-change triggers without open/click tracking or raw bounce
   content.
6. Prove each membership introduction/follow-up receives a one-time 14-day HMAC
   invitation containing no contact data. Collaboration interests must never
   create a signup invitation. Verify tampering, expiry, replay and cross-account
   reuse fail; the browser moves membership tokens to an HTTP-only SameSite
   cookie; email, OAuth and password authentication link the account; and
   onboarding completion atomically marks the membership prospect joined.
7. Obtain legal/privacy approval for the exact consent statement, expiry,
   retention, deletion, sender identification and complaint/withdrawal path.
   For SMS or WhatsApp in India, record the approved registered sender,
   preference/consent/DLT-DCA process and templates before any traffic. Public
   contact details are never permission to send a consent request outside that
   approved mechanism.
8. Complete native-speaker review for every locale called production-ready.
   Unreviewed fallback copy must remain visibly Beta and must not be used for a
   real consent campaign.
9. Confirm priority comes only from the requester's self-declared farming
   approach. Confirmations are always claimed first; among confirmed
   introductions, natural/organic/regenerative/agroecological tier 10 precedes
   sustainable/low-input/smallholder tier 20 and general tier 30. Never infer
   this field from discovery research or a public profile.

### Daily outreach operator checklist

1. Check delivery remains paused unless an approved canary or active release
   window exists; compare the Worker flag and database control.
2. Review queue age, ambiguous sends and terminal failures without opening or
   exporting private contact values.
3. Review every complaint, hard bounce, unsubscribe and STOP event; verify its
   suppression and cancellation state before any resume.
4. Hand interested or ambiguous replies to the named administrator; never
   retain raw reply bodies in logs or audit JSON.
5. Confirm introduction/follow-up counts remain within one plus one and that no
   WhatsApp job, discovery CSV import, or recurring cold campaign exists.

### Enablement and autonomous processing

Prepare the Worker with `ENABLE_OUTREACH_AGENT=true` without public traffic.
In the reviewed database-owner/service-role session, enable exactly the
`outreach_agent` private control and verify one row changed. The forward admin
migration deliberately leaves `outreach_runtime_controls.delivery_paused=true`.
Route a staff-only canary, submit a synthetic opt-in, complete provider
verification, then resume delivery through the admin console with an audited
reason. Invoke
`POST /api/outreach/process` with the scheduler secret and verify exactly one
provider receipt plus one immutable event. Then test withdrawal and prove later
processor calls send nothing.

Only after those checks may the approved scheduler invoke the processor. Never
give the scheduler a Supabase key; it receives only `OUTREACH_PROCESSOR_SECRET`.
The Worker holds the service role and provider token in its secret store. Alert
on provider signature failures, repeated batch failures, consent/outbox trigger
violations, five-attempt failures, complaints and unexpected send volume.

### Rollback

First pause delivery in `outreach_runtime_controls` through the audited admin
control and verify no outbox row can be claimed. Then set the private `outreach_agent` control to `false`
and verify it. This stops new research RPCs,
consent writes and outbox claims even if the Worker route remains live. Disable
the Worker flag, stop the scheduler and revoke the provider token. Preserve
consent, suppression and immutable audit rows. Do not
delete suppression hashes during an incident rollback. Correct unsafe schema,
grants or data with a reviewed forward migration.

## 12B. Managed private Farmer-profile Agent

This add-on builds a private, cited sample from permitted professional evidence
and waits for the invitation holder to approve or reject it. It does not
publish a non-member profile and cannot issue an identity, Farmer-role, or
organization badge. It depends on the consent-first acquisition controls in
12A; approval of this code is not authorization to search for, contact, or
enrol real people.

### Required staging evidence

1. Apply `20260811130000_managed_farmer_profile_agents.sql` with
   `ENABLE_PROFILE_RESEARCH_AGENT=false` and the private
   `profile_research_agents` control false. Verify the new Agent Durable Object
   has the additive `farmer-profile-agent-v1` SQLite migration and the approval
   Workflow binding names exactly match the exported Worker classes.
2. Prove `anon` and `authenticated` cannot read samples, source excerpts,
   model runs, private provider receipts, or verification evidence. Public
   claim output must contain only the claim type, method, scope, verification
   time, and expiry. Exercise direct PostgREST/RPC calls, not only UI tests.
3. Test permitted website evidence plus operator-supplied social descriptions
   and re-encoded screenshot OCR. Prove protected social pages are not fetched,
   every displayed fact has one supplied HTTPS citation, prompt instructions in
   source content are ignored, sensitive/contact fields are excluded, and an
   unsupported or hallucinated result falls back to a visibly `Not verified`
   draft.
4. Prove the preview is available only through a valid, unexpired, unrevoked
   signed invitation backed by active purpose/channel consent. Test tampering,
   expiry, replay, withdrawn consent, missing sample, rejection, and retention
   expiry. Rejection must redact the sample and revoke the invitation.
5. Prove approval releases no public profile. After authenticated invitation
   redemption, copy only bounded approved fields into the still-private
   onboarding record, record contact verification for the consented channel,
   and require the person to finish onboarding. Preserve any fields they
   already entered.
6. Run database authorization tests for the approved capability levels:
   `Not verified` may profile/browse/follow and create fewer than six posts per hour;
   `Contact verified` may message and enquire; `Farmer role verified` may
   publish produce; organization verification remains required for company
   offers; identity verification is optional. Test claim expiry and revocation.
7. Record the 30-day sample retention and deletion owner, Workers AI cost/batch
   limits, Workflow alarms, operator audit owner, complaint path, and any KYC,
   registry, social OAuth, or Web Search provider terms. Store provider tokens
   only as Cloudflare secrets. For Brave name discovery, attach plan evidence
   granting snippet storage, install `BRAVE_SEARCH_API_KEY` with `wrangler
   secret put`, set `BRAVE_SEARCH_STORAGE_RIGHTS_CONFIRMED=true`, and prove the
   25-search/day and 250-search/month per-administrator reservations reject the
   next request before a provider call. Verify 401/403, 429, timeout, oversize,
   malformed, no-match, same-name ambiguity, and non-agriculture results all
   fail closed without automatic retries, contact extraction, or delivery work.
8. Run one synthetic full-name plus location/farming-hint search and verify no
   more than five exact-name agriculture results are stored with provider,
   query-hash, and storage-rights provenance. Prove the resulting profile stays
   private and `Not verified`, no search snippet grants consent, and no real
   person is contacted during this gate.

### Enablement and rollback

Deploy a no-traffic candidate containing the Agent/Workflow bindings while the
Worker flag and database control remain false. After every staging gate passes,
enable exactly `profile_research_agents` in the reviewed database session,
verify one row changed, set `ENABLE_PROFILE_RESEARCH_AGENT=true` on the canary,
and process one synthetic evidence → private preview → approval → authenticated
claim journey. Confirm no preview is discoverable through public profile,
sitemap, robots, or Agent routes; FarmerBook intentionally does not expose
`routeAgentRequest`.

For rollback, set `profile_research_agents=false` first so direct RPC access
fails closed, then set `ENABLE_PROFILE_RESEARCH_AGENT=false` or roll back the
Worker. Leave the Durable Object class/migration and private schema in place;
preserve active suppressions and required consent/audit evidence. Revoke any
search/KYC provider token and use a reviewed forward migration for unsafe
grants, policies, retention, or data repair.

## 12B.1 Known Farmer Intake

This administrator-only path is for a Farmer personally known to FarmerBook.
It is an evidence-curation layer on the existing private managed-profile flow,
not a public people directory, search scraper, consent bypass or contact tool.
The code creates no contact candidate, consent, invitation, outbox message,
public profile or verification claim.

### Required staging evidence

1. Apply `20260812140000_known_farmer_intake.sql` after the outreach and
   managed-profile migrations while `ENABLE_OUTREACH_AGENT`,
   `ENABLE_PROFILE_RESEARCH_AGENT`, `outreach_agent` and
   `profile_research_agents` remain false. Prove all three intake/search tables
   have RLS, no browser table grants, admin-only authenticated RPCs and
   service-role-only candidate/sample-link RPCs.
2. Record a retention/deletion owner. Intake and candidates expire within 30
   days; YouTube API-derived candidates have a refresh deadline no later than
   30 days. Purge or refresh API data before that deadline and preserve only
   separately justified consent/suppression/audit records.
3. Do not configure a Google result-ingestion API for this path. The UI may
   open/copy one bounded `google.com/search` query, but FarmerBook must never
   fetch a Google results page, persist its snippets, or treat a result as
   evidence until an administrator selects and submits the destination page.
4. Restrict `YOUTUBE_DATA_API_KEY` to the approved project/API and production
   caller where supported. Prove reservation precedes every provider call:
   50 searches/day project-wide, 10/day and 100/month per administrator. Test
   401/403, 429, timeout, oversize, malformed and zero-result outcomes with no
   retry and no raw response, media, thumbnail, comment, transcript, statistic
   or cookie retention.
5. Verify candidates are never selected automatically. An administrator must
   open the original URL and classify it. Only LinkedIn `/in/...`, one-account
   Instagram/Facebook URLs, Facebook `profile.php?id=...`, and YouTube
   `/@handle` or `/channel/...` URLs may qualify as owned social profiles.
   Posts, reels, groups, interviews, videos and `youtu.be` URLs remain citations.
6. Prove the state cannot reach `ready_to_build` without completed Google or
   YouTube social discovery, selected professional evidence and one selected
   owned account URL. Build one synthetic private `Not verified` sample and
   confirm its social links are rebuilt deterministically from owned evidence;
   no model output can promote coverage into an owned account.
7. Exercise the Farmer review and onboarding edit/replace path. Approval does
   not publish. Public-profile enablement and the database trigger must reject
   a Farmer with no LinkedIn, Instagram, Facebook or YouTube URL. Legacy/private
   Farmers may continue onboarding and editing; public surfaces show the
   localized missing-link state instead of inventing an account.
8. Run `supabase db reset`, `supabase test db`, the focused Known Farmer suites,
   full TypeScript/ESLint/Vitest/build gates and a synthetic staging journey.
   Record quota use, query/source hashes, expiry, zero contact/outbox/public
   rows and the exact candidate migration checksum.

### Enablement and rollback

Deploy with both application flags and database controls false. After all
staging evidence is approved, enable the existing private controls first and
then canary `ENABLE_OUTREACH_AGENT` plus `ENABLE_PROFILE_RESEARCH_AGENT`; install
the YouTube key only in the secret store. Google remains a human-opened browser
query and needs no key. Roll back by setting `profile_research_agents=false`,
then disabling the application profile-research flag and revoking the YouTube
key. Preserve required audit/consent/suppression evidence and let private
research retention cleanup run; do not rewrite migration history or drop the
tables as an incident shortcut.

The Known Farmer workflow is superseded for the public editorial objective. Do
not enable it as a substitute for Featured Farmers or publish its private
member-style samples.

## 12B.2 Featured Farmer editorial profiles

Featured Farmers are sourced editorial articles about people with significant
publicly documented agricultural work. They are not FarmerBook accounts,
verification badges, endorsements, invitations, contact leads, marketplace
profiles, or consent records. The application flag
`ENABLE_FEATURED_FARMER_PROFILES` and database release control
`featured_farmer_profiles` must both remain false until this section passes.

### Required staging and editorial evidence

1. Apply `20260812150000_featured_farmer_profiles.sql` in a clean staging
   rebuild. Prove private research, source, draft, claim, social, media, event,
   YouTube-candidate, and quota tables have RLS and no browser table grants.
   Prove public RPCs return only the latest published, non-withdrawn immutable
   snapshot and return nothing while the database release control is false.
2. Name an editorial/privacy owner and correction/removal owner. Record policy
   and legal review for public living-person articles and applicable DPDP
   handling, a support email, a deletion/retention schedule, incident response,
   and an annual review date for selection criteria and published stories.
3. Approve written selection criteria before choosing a subject. Exclude
   private contact details, sensitive personal data, inferred traits, personal
   gossip, unsupported superlatives, follower-count significance, copied media,
   and any implication that a subject joined, endorsed, or was verified by
   FarmerBook. Obtain explicit approval for each initial named subject before
   any real-person research or publication.
4. Exercise all five bounded Google query routes manually. Store only reviewed
   destination pages, never a Google results page or snippet. If YouTube search
   is enabled, restrict the official API key and prove database reservation
   precedes every call, candidate text expires within 30 days, and no media,
   thumbnail, comment, transcript, statistic, cookie, or raw response is kept.
5. For a synthetic subject, prove readiness fails without two current
   professional sources on separate domains, one authoritative or independent
   source, two approved significance claims, citations for every selected
   claim, three story sections, a fact check within 24 hours, and one manually
   confirmed owned LinkedIn, Instagram, Facebook, or YouTube account. Posts,
   reels, groups, interviews, watch URLs, and `youtu.be` links remain coverage.
6. Verify each image is an original photograph with a recorded rights basis,
   credit, reference, and approval. With no approved media, verify the image-free
   treatment appears and no generated, generic, copied, proxied, or hotlinked
   image is used.
7. Review English, Hindi, and Marathi shells without translating sourced claims
   automatically. Verify the collection and article display citations, owned
   social links, fact-check date, editorial/unclaimed disclosure, and the
   correction/removal path. Verify metadata uses `Article` about `Person`, not
   a FarmerBook member `ProfilePage`, and the sitemap contains published slugs
   only.
8. Run a clean Supabase reset and all pgTAP suites, full ESLint, TypeScript,
   Vitest, production build, and desktop/mobile browser journeys. Publish,
   revise, withdraw, and attempt stale-revision actions with synthetic data;
   confirm withdrawal immediately removes public reads without deleting the
   audit trail. Record exact migration checksum and test evidence.

### Enablement and rollback

Deploy code with both controls false. After the staging/editorial evidence and
first-subject approvals are signed, enable the database control first and then
canary `ENABLE_FEATURED_FARMER_PROFILES`. Install a YouTube key only if that
optional route is approved; Google research requires no key because it remains
human-opened. Monitor correction requests, source freshness, public RPC errors,
and unexpected publication events.

For rollback, set `featured_farmer_profiles=false` first; this removes the
collection, article reads, and sitemap entries even if an old Worker remains.
Then disable `ENABLE_FEATURED_FARMER_PROFILES` or restore the previous Worker.
For one disputed article, use the withdrawal RPC immediately. Preserve source,
revision, publication, withdrawal, and correction evidence; repair schema or
data with a reviewed forward migration rather than rewriting migration history.

## 12C. Purpose-limited managed operations fleet

The base fleet adds four independent Durable Objects: Growth & Outreach, Farmer
Profile Drafting, Verification Triage, and Operations Supervisor. The
forward-only support/social pilot adds Customer Support Drafting and Social
Content Drafting as two more independent objects. They share no
public Agent route. Each object calls only `/api/managed-agents/run` using the
separate `MANAGED_AGENT_PROCESSOR_SECRET`; the route still requires the Worker
flag, role-specific prerequisite flags, Supabase configuration and the private
database control. The secret must not appear in Wrangler `vars`, logs, Agent
state or browser responses.

Apply `20260812130000_managed_operations_agents.sql` only after every preceding
ecosystem, outreach and managed-profile migration has been rehearsed in the
same order. Keep `managed_operations_agents=false` and
`ENABLE_MANAGED_OPERATIONS_AGENTS=false` while deploying the no-traffic Worker
candidate. Verify the generated Wrangler configuration retains the original
`farmer-profile-agent-v1` migration and adds exactly one
`managed-operations-agents-v1` migration containing all four new class names.
Verify `routeAgentRequest` remains absent.

Required staging proof:

1. Direct `anon` and ordinary `authenticated` table access to fleet agents,
   runs, events and verification triage is denied. Only an authenticated
   administrator can use dashboard/configuration/request RPCs; begin, finish
   and triage-record RPCs reject every role except `service_role`.
2. Repeating a configuration command or recurring schedule does not create a
   duplicate. An overlapping run is recorded as skipped. A role with three
   consecutive partial/failed runs becomes paused in both PostgreSQL and its
   Durable Object, without pausing the other three roles.
3. Growth processes only rows claimable by the existing consent-aware outreach
   outbox. Prove withdrawn, expired, mismatched-purpose, suppressed and
   unconsented contacts remain unclaimable. STOP and provider webhooks continue
   while Growth is paused.
4. Profile Drafting selects only consented/qualified Farmer or unknown-role
   prospects with stored allowlisted evidence. It creates a private cited
   sample and approval Workflow, creates no public profile, copies no media,
   derives no contact and shows `Not verified` until the person claims it.
5. Verification Triage writes a recommendation row while leaving
   `profile_verification_claims.state` unchanged. Missing provider receipts,
   expired evidence, community vouches and unsupported/follower-count evidence
   never issue a badge.
6. Operations Supervisor closes stale run leases through the same service-only
   completion RPC and exposes counts only. Logs and run summaries contain no
   contact value, source excerpt, identity evidence, raw reply, token or secret.

For enablement, first install the processor secret, deploy the flag-enabled
no-traffic candidate, then enable the private database control in a reviewed
database session. Open `/admin/agents`, resume only Operations Supervisor, run
one synthetic cycle, then enable Verification Triage, Profile Drafting and
Growth one at a time after their prerequisite gates pass. Growth remains off
until the approved sender/provider and consent campaign are operational.

For rollback, set `managed_operations_agents=false` first. Pause all enabled roles
from `/admin/agents` if the page is healthy, then set
`ENABLE_MANAGED_OPERATIONS_AGENTS=false` or roll back the Worker. Disable
`profile_research_agents` and `outreach_agent` as their incident scope requires.
Do not delete Durable Object migrations, run/event evidence, consent receipts
or suppressions. Rotate `MANAGED_AGENT_PROCESSOR_SECRET` after any suspected
exposure.

## 12D. Founder-owned private Farmer contacts

The private Farmer database is not a harvested lead list. It accepts only
direct Farmer interest, existing-member support, an approved partner consent
campaign, or a manual record whose operator attests to purpose- and
channel-matched consent. The exact authenticated founder UUID in
`FARMER_CONTACT_OWNER_ID` is an authorization boundary in addition to the
administrator role. `FARMER_CONTACT_ENCRYPTION_KEY` is server-only key material
used to derive separate randomized encryption and keyed-deduplication keys; it
must never appear in Wrangler `vars`, a browser response, a database dump,
support logs, analytics, screenshots, or release evidence.

Apply `20260813120000_private_farmer_contacts.sql` in migration order with both
controls off. Before a staging canary, prove all of the following with fictional
records:

1. `anon`, ordinary authenticated users, and a different administrator cannot
   read or mutate lists, contacts, audit events, or discovery-run metadata. The
   configured owner can reach `/admin/farmer-database`; other users receive no
   record counts or values.
2. The stored contact fields are versioned ciphertext, duplicate matching uses
   only keyed hashes, audit rows contain no raw contact values, events are
   immutable, and a privacy deletion erases ciphertext and hashes while
   retaining a redacted compliance event.
3. A pending, expired, withdrawn, suppressed, bounced, complained, phone-only,
   or unconfirmed address cannot create an outbox row. A fictional confirmed
   address creates one idempotent email handoff through the existing outreach
   controls while delivery remains paused.
4. YouTube discovery uses only the official Data API, strict safe search,
   `type=channel`, India region, a maximum of ten results, an eight-second
   timeout and no pagination or retry. Closing the result view removes item
   data; PostgreSQL contains only the query hash, locale, state, aggregate count
   and timestamps. No action can promote a result into contacts or outreach.
5. There is no WhatsApp provider, sender action, Worker binding, QR session,
   template, webhook, queue branch, or scheduled discovery crawler.

The first release cannot be enabled in production until an approved encryption
key backup and rotation procedure can re-encrypt existing records without data
loss. Install the owner UUID, encryption key and optional YouTube API key only
in the target secret store. Enable the database control first, keep outreach
delivery paused, enable `ENABLE_PRIVATE_FARMER_CONTACTS` for the owner account,
and repeat the synthetic read/consent/deletion checks. Resume consented email
delivery only under the separate section 12A approval. A feature flag never
authorizes a real contact import, external search, or message by itself.

For rollback, pause Growth & Outreach, set `private_farmer_contacts=false`,
disable `ENABLE_PRIVATE_FARMER_CONTACTS`, cancel only identified unsent canary
outbox rows, verify none can be claimed, and restore the previous Worker
version if necessary. Preserve encrypted records, consent receipts,
withdrawals, suppressions and redacted audit evidence. Do not drop the tables
or destroy the encryption key during operational rollback; fulfill approved
retention/privacy deletion through the owner-scoped operation and a reviewed
forward correction.

## 12E. Founder-only sourced-Farmer research

Apply `20260814120000_sourced_farmer_research.sql` with both
`ENABLE_SOURCED_FARMER_RESEARCH=false` and the database control
`sourced_farmer_research=false`. This workspace is not a lead harvester. It may
show a founder a contact-redacted YouTube response transiently, but it stores
only anonymous agriculture tags and refreshable source provenance. A named
durable profile requires either documented subject consent or an independently
reviewed, non-YouTube HTTPS source for the profile and every fact.

Before a staging canary, prove all of the following with fictional fixtures:

1. The founder UUID is enforced in the application and every mutation RPC;
   browser roles and other administrators cannot read or mutate the six tables.
2. Quota is reserved before any provider request. A run resolves only an
   explicitly supplied handle/channel URL, fetches at most two upload pages and
   100 videos, uses the official API host, and stops on timeout, response-size,
   repeated-token, known-video, page, video, or quota bounds without retrying or
   following description links.
3. Contact strings are destroyed before transient display. Stored channel/video
   rows contain no title, description, name, username, location, contact,
   transcript, raw response, financial claim, or media copy. A zero-match page
   still saves its checkpoint without inventing a topic.
4. YouTube URLs cannot support a durable identity or professional fact.
   Consent/non-YouTube evidence, cited facts, operator attestation,
   idempotency, revision-aware review, immutable redacted events, and
   cross-owner denial all pass.
5. Source rows are refreshed or deleted within 30 days. Run
   `purge_expired_farmer_source_data` under an owner-authorized maintenance job,
   record the deleted count, and verify a current child video cannot be removed
   by an earlier channel expiry.
6. No sourced-research action reads or writes Farmer contacts, consent,
   outreach prospects, outbox/messages, member profiles, verification claims,
   or Featured Farmer publications.

Install `YOUTUBE_DATA_API_KEY` only in the server secret store after YouTube
API/privacy review. Enable the database control first, then the application
flag for the exact founder account. Enabling either control does not authorize
a real channel run or named record: request separate approval naming the seed
and maximum batch. No scheduled or self-feeding crawler is included.

For rollback, reject new runs by setting `sourced_farmer_research=false`, then
disable `ENABLE_SOURCED_FARMER_RESEARCH`. Mark any identified active run failed,
purge expired/unreviewed API provenance, and verify no contact/outreach rows
changed. Preserve reviewed consent/independent-evidence records unless an
approved privacy/removal request requires deletion; correct schema defects
forward rather than dropping the audit domain.

## 12F. Supervised support and social-content pilot

Apply `20260816120000_support_social_pilot.sql` only after the managed-operations
migration. Keep `support_social_pilot=false`,
`ENABLE_SUPPORT_SOCIAL_PILOT=false`, and both new Agent roles paused. The Worker
configuration must preserve prior Durable Object migrations and add only
`support-social-agents-v1` with `CustomerSupportAgent` and
`SocialContentAgent`.

The scheduled runtime reaches `/api/managed-agents/run` without a browser
session. The proxy bypass must match only that exact path; the route must still
require the managed-agent flag, role prerequisite, valid bounded input and the
constant-time checked `MANAGED_AGENT_PROCESSOR_SECRET`. Configure Cloudflare
WAF/rate limiting for that path before activation and alert on repeated 403/503
responses.

Required staging proof:

1. Browser roles cannot directly read or mutate support cases, campaign briefs,
   proposals or events. A participant can create/list only their own support
   cases through the narrow RPC, and never sees a pending/rejected draft.
2. The service role can record a proposal only for the matching leased run and
   target, but cannot execute the administrator review function. Revision and
   idempotency conflicts fail closed and every decision creates a redacted
   immutable event.
3. Complaints, account/privacy operations, prices/refunds, legal/financial,
   crop-treatment/chemical dosage, medical/veterinary, threats/emergencies and
   ambiguous questions remain human-escalated. Missing or invalid Workers AI
   output creates a safe fallback rather than an unreviewed answer.
4. A support proposal is invisible until administrator approval. Approval
   changes the case to answered and shows only the final edited content to the
   requester. No email, WhatsApp, direct message or external sender is invoked.
5. A social proposal uses only an administrator-authored owned-channel brief.
   Approval labels it `Copy ready`; no UI or processor path claims publication,
   contacts a person or calls a social-network API.
6. Support expiry, content bounds, logs, run summaries and event details contain
   no secret, bearer, email address, raw provider payload or duplicate support
   body. Test the participant and administrator pages on desktop and mobile.

Activation order is: rehearse the migration/RLS suite on an isolated staging
copy; deploy the no-traffic Worker with both new Durable Objects; set the
application flag; enable the database control; open `/admin/operations`; resume
Customer Support Drafting with fictional cases; then resume Social Content
Drafting with a fictional brief. Observe at least three healthy schedules and
review every proposal manually before considering a bounded real pilot.

Rollback pauses both roles, disables `support_social_pilot`, disables
`ENABLE_SUPPORT_SOCIAL_PILOT`, and restores the recorded healthy Worker if
needed. Preserve private cases, proposals and review evidence under the approved
retention policy. No connector exists, so rollback must not attempt to delete or
retract a falsely recorded publication.

## 13. Production deploy and Worker version recording

Immediately before deployment, record the live versions without printing
secrets:

```sh
NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem \
  ./node_modules/.bin/wrangler versions list \
  --config dist/server/wrangler.json \
  --json
```

Copy the exact current 100%-traffic version into the release record as
`PREVIOUS_HEALTHY_WORKER_VERSION_ID`. Never rely on Wrangler's implicit
“previous version” selection.

After explicit section 9 approval, relink to production and recheck the exact
approved migration set:

```sh
export FB_PRODUCTION_PROJECT_REF="REQUIRED_PRODUCTION_PROJECT_REF"
supabase link --project-ref "$FB_PRODUCTION_PROJECT_REF"
supabase migration list --linked
shasum -c "$FB_EVIDENCE_DIR/migration-sha256.txt"
supabase db push --linked --dry-run
```

Stop unless the output exactly matches the separately approved set. After the
approver reconfirms the target and dry-run transcript, apply the migrations in a
separate command:

```sh
supabase db push --linked
```

Verify remote migration history and application/RLS smoke checks before
deploying the approved Worker artifact:

```sh
NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem \
  ./node_modules/.bin/wrangler deploy \
  --config dist/server/wrangler.json \
  --keep-vars \
  --strict \
  --message "REQUIRED_RELEASE_ID Release REQUIRED_RELEASE_LETTER"
```

Then list versions again. Record the new version ID, created time, deploy
message, author, and traffic percentage. Confirm the new version receives the
approved traffic allocation on every intended route. A deploy command's success
message is not enough.

Do not combine Release A, B, and C in one deploy/approval. Do not turn flags on
in the same unrecorded action as an unrelated Worker or database change.

**Expected outcome:** the release record contains the exact before/after Worker
versions and every mutation matches the approved evidence.

**Sources:** [package Wrangler version](../package.json), [generated Worker
configuration](../vite.config.ts), [Cloudflare version listing/deploy
reference](https://developers.cloudflare.com/workers/wrangler/commands/workers/)

## 14. Live smoke checks

Run smoke checks immediately after each migration, Worker deploy, and feature-
flag change. Use dedicated release accounts and minimal reversible records. Do
not inspect another user's private data to prove authorization.

### Public and platform checks

- Production apex, `www`, and approved `workers.dev` hostname return the same
  intended release with valid HTTPS and no redirect loop.
- `/`, `/login`, `/signup`, `/forgot-password`, policy/deletion pages,
  `/marketplace`, one real listing detail, one real storefront, and one opted-in
  public Farmer profile render on desktop and mobile.
- Live marketplace/listing/storefront/review counts reflect the database,
  including honest zero states; no fictional fixture names, IDs, metrics, demo
  banner, or placeholder contact appears.
- `/marketplace/demo` is visibly fictional, read-only, `noindex`, and does not
  navigate into live listing, save, enquiry, or storefront actions.
- Unknown/expired/hidden/suspended records return the approved not-found or
  unavailable state without leaking existence or raw backend errors.
- Response headers, canonical metadata, robots/sitemap/structured data, image
  optimization, and signed media work without exposing private paths/contacts.

### Authentication and email checks

- Email signup is protected by Turnstile, requires confirmation, and sends
  through custom SMTP to a non-team mailbox.
- Password reset reaches a non-team mailbox and returns only to the approved
  production origin.
- Google and Facebook start at the correct provider, return through the correct
  Supabase project and `/auth/callback`, and reject unsafe `next` destinations.
- Cancellation and unavailable-provider paths show bounded user-facing errors,
  not provider responses or secrets.
- Logout invalidates the session; suspended/deleted users cannot regain normal
  write access.

### Authenticated role and RLS checks

- Farmer: onboarding/profile, avatar/cover, feed, network, message, produce
  publish/edit, seller enquiries, storefront, and public-profile visibility.
- Customer: browse/connect/purchases/review eligibility, with produce publishing
  denied.
- Wholesaler: sourcing plus authorized produce publishing, without role mutation.
- Moderator: report, hide/restore, verify/reject, and suspend/restore create the
  expected audit record atomically; a normal user cannot invoke them.
- Cross-user checks: conversations, enquiry contact values, onboarding drafts,
  custom category requests, and admin data remain inaccessible to outsiders.

### Release B/C additions

- Release B: canonical/custom agriculture categories, draft resume, locale
  persistence through refresh/auth callback, 23-locale smoke, representative
  script/RTL functions, date/number/currency/unit formatting, and original user-
  authored text.
- Release C: company onboarding, membership authorization, public company and
  offer discovery, offer expiry, shared enquiry assignment/thread access,
  moderation, verification-document isolation, Turnstile/throttling, and health
  endpoint. Use the candidate's route manifest rather than guessing route names.

### Operational checks

- Worker logs show the new version and no sustained error/latency regression;
  logs contain no tokens, passwords, full contacts, message bodies, private
  profile values, signed URLs, or verification documents.
- Supabase database/Auth/Storage and SMTP metrics are healthy.
- A synthetic test alert reaches the named on-call contact.
- Record every smoke URL, role, time, result, evidence reference, tester, and any
  created test-record cleanup.

Any authentication, authorization, confidentiality, data-integrity, callback,
or primary-journey failure triggers section 15. Do not continue rollout while
investigating a critical failure.

**Sources:** [application routes](../app/), [OAuth callback](../app/auth/callback/route.ts),
[marketplace demo isolation test](../tests/marketplace-demo-isolation.test.tsx),
[browser journeys](../tests/e2e/demo-journeys.spec.ts), [RLS tests](../tests/rls-migration.test.ts)

## 15. Rollback and forward schema correction

### Worker rollback

1. Declare an incident and name the incident commander.
2. Stop flag rollout. Set the affected additive flags to `false` when that can
   be done safely and record the change.
3. Retrieve the exact `PREVIOUS_HEALTHY_WORKER_VERSION_ID` from the approved
   release record and confirm it belongs to the target Worker.
4. Roll back explicitly:

```sh
export FB_PREVIOUS_HEALTHY_WORKER_VERSION_ID="REQUIRED_VERSION_ID"
NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem \
  ./node_modules/.bin/wrangler rollback \
  "$FB_PREVIOUS_HEALTHY_WORKER_VERSION_ID" \
  --config dist/server/wrangler.json \
  --message "REQUIRED_INCIDENT_ID: rollback REQUIRED_RELEASE_ID"
```

5. Run `wrangler versions list --config dist/server/wrangler.json --json`, prove
   the rollback version receives 100% intended traffic, and repeat the critical
   smoke checks.
6. Record incident time, trigger, command, operator, resulting version, traffic,
   user impact, data impact, and follow-up owner.

Cloudflare documents rollback as an immediate new deployment across the
Worker's routes/domains. Do not omit the version ID and do not assume local files
changed when the Worker rolled back.

### Database correction

Application rollback does not undo database writes or migrations. FarmerBook's
schema rollout is additive:

- do not drop new tables, columns, locale/category identities, drafts,
  memberships, consents, offers, enquiries, events, or audit rows during an
  incident;
- do not edit an already applied migration or run an improvised destructive
  down migration;
- if a policy/grant exposes data, disable the affected path/traffic and ship a
  narrowly scoped, reviewed **forward migration** that revokes unsafe access;
- if a constraint, function, backfill, or index is wrong, preserve user data and
  ship a reviewed forward correction after rehearsal on a restored copy;
- use backup restoration only for a declared data-loss/corruption disaster with
  database-owner and incident-commander approval. A restore is not the normal
  application rollback mechanism and may lose later writes.

After correction, rerun migration inventory/checksums, executable RLS tests,
configured browser tests, build/dry-run, approval, deploy, and live smoke. Never
re-enable a flag merely because the old Worker is healthy.

**Expected outcome:** user traffic returns to a recorded healthy Worker quickly,
while schema/data is preserved and any database defect is corrected forward.

**Sources:** [Cloudflare rollback reference](https://developers.cloudflare.com/workers/wrangler/commands/workers/),
[additive agriculture migration](../supabase/migrations/20260809120000_agriculture_ecosystem_foundation.sql),
[FarmerBook release plan](../PLAN.md)

## 16. Retention, deletion, and incident policy gates

No value in this section may be inferred from a provider default. These fields
must be approved by the privacy/legal and operational owners before inviting
real users.

### Retention schedule

| Data class | Required policy |
|---|---|
| Auth account/session records | **REQUIRED:** purpose, retention period/event, deletion/anonymization action, owner, legal approval |
| Profile and agriculture affinities | **REQUIRED:** retention/deletion rule and public-cache handling |
| Posts, comments, follows, blocks, and reactions | **REQUIRED:** retention/deletion/anonymization rule |
| Direct conversations and messages | **REQUIRED:** retention/deletion rule, participant expectations, safety exception |
| Produce enquiries and buyer contacts | **REQUIRED:** retention period/event, seller access cutoff, deletion action |
| Organization/offer enquiries and events | **REQUIRED before Release C:** retention period/event, assignment/audit handling, deletion action |
| Reports and moderation audit | **REQUIRED:** retention, access, legal/safety basis, deletion/anonymization rule |
| Product analytics | **REQUIRED:** retention, allowed metadata, deletion/anonymization rule |
| Worker/application/Auth/SMTP logs | **REQUIRED:** environment-specific retention, redaction, access, deletion |
| Verification documents and claims | **REQUIRED before Release C:** retention, rejected/expired-document deletion, access audit |
| Avatars, covers, post images, offer/company media | **REQUIRED:** orphan cleanup, deletion timing, backup expiration |
| Database and Storage backups | **REQUIRED:** backup frequency, retention, encryption, access, deletion propagation limits |
| Sourced YouTube provenance | Refresh or delete within 30 days; retain no descriptions, identity profiles, contact strings, transcripts, raw responses, or copied media |

### Account deletion contract

The current server action marks the profile deleted, marks posts/comments
removed, records an event, and signs the session out. It does not by itself
prove deletion of the Auth user, messages, relationships, marketplace data,
media objects, organization ownership, verification evidence, or backups.

Before production enrollment, define and test:

- **REQUIRED:** identity of the deletion/privacy request owner and reachable
  request channel;
- **REQUIRED:** verification and confirmation method for a request;
- **REQUIRED:** synchronous soft-delete behavior and user-visible result;
- **REQUIRED:** asynchronous purge/anonymization scope for Auth, database tables,
  Storage objects, organization ownership, enquiries/contacts, logs, and vendors;
- **REQUIRED:** completion target and escalation when a deletion job fails;
- **REQUIRED:** safety/legal exceptions, exact retained fields, purpose, access,
  and approved duration;
- **REQUIRED:** how backup retention delays final erasure and how restored data
  is re-suppressed;
- **REQUIRED:** export/access request scope, format, authentication, and owner;
- **REQUIRED:** evidence that policy/deletion pages describe actual behavior and
  contain real operator/contact details.

Until this contract and implementation agree, the controlled pilot remains
closed.

### Incident ownership and minimum procedure

- **REQUIRED:** 24/7 or pilot-hours incident contact and paging method.
- **REQUIRED:** severity definitions and who may disable traffic/flags, roll back
  a Worker, revoke a key, or apply an emergency forward migration.
- **REQUIRED:** privacy/security escalation and regulator/user notification
  decision owners; no notification timeframe is invented here.
- **REQUIRED:** moderator escalation for scams, harassment, unsafe advice, and
  harmful/regulated offers.
- **REQUIRED:** Supabase, Cloudflare, SMTP, OAuth, monitoring, and Storage vendor
  escalation owners.
- **REQUIRED:** evidence preservation, access restriction, communications,
  recovery, post-incident review, and action-item owners.

For an incident, first protect confidentiality and prevent further writes or
exposure; then restore the recorded healthy Worker; then diagnose and correct
schema/config forward. Never copy private messages, contact data, tokens, signed
URLs, or verification documents into a general incident channel.

**Sources:** [current account deletion action](../features/profiles/account-actions.ts),
[data-deletion page](../app/data-deletion/page.tsx), [privacy notice](../app/privacy/page.tsx),
[MVP privacy/security requirements](MVP_PRODUCT_DESIGN.md), [Supabase backup
limitations](https://supabase.com/docs/guides/platform/backups)

## 17. Troubleshooting and stop conditions

| Symptom | Likely boundary | Required action |
|---|---|---|
| Live marketplace shows sample inventory/metrics | Demo/live data isolation | Stop rollout; disable affected path; roll back Worker; rerun fixture-ID and route audit |
| Public listing query is empty despite live rows | Anonymous grants/RLS or wrong project | Confirm target project and migration inventory; test policy as anon; never add a broad grant as a quick fix |
| User can read another enquiry/message/draft | RLS/capability breach | Treat as security incident; stop traffic/flag; roll back Worker; revoke access with forward migration |
| Signup/reset mail does not arrive | SMTP/domain/rate limit/template | Keep enrollment closed; inspect provider delivery evidence without logging addresses; fix and retest external mailboxes |
| Turnstile fails or can be bypassed | Browser/server/database abuse boundary | Close public writes; there is no silent bypass; fix hostname/action/server validation and direct-insert boundary |
| OAuth returns to wrong origin | Site URL/provider allowlist/build config | Stop auth rollout; correct only the target environment; rebuild and retest cancellation and safe redirects |
| Upload succeeds but media cannot be restored | Storage backup gap | Stop release; complete object export/restore drill separately from database backup |
| Migration list differs local/remote | History drift or wrong project | Stop; confirm project reference/checksums; diagnose; do not use `migration repair` without approval |
| Dry run contains a secret or wrong route | Generated Worker configuration | Destroy/redact leaked artifact as required, rotate exposed secret, correct inputs, rebuild, and seek new approval |
| New Worker errors after deploy | Runtime/config/application regression | Roll back to the exact recorded version, verify traffic, smoke, then investigate offline |
| Worker rollback succeeds but DB remains unsafe | Schema/RLS defect | Keep path disabled and ship reviewed forward revocation/correction; do not drop data |
| No configured browser or executable RLS suite | Missing production evidence | Release remains blocked even when unit/static/demo tests pass |
| Any owner/retention/deletion field says `REQUIRED` | Operational/legal decision missing | Keep pilot closed until a named owner records an approved value and tests the process |

**Sources:** [runtime configuration guard](../lib/env.ts), [RLS migrations](../supabase/migrations/),
[marketplace integrity tests](../tests/marketplace-data-boundary.test.ts),
[Supabase Auth configuration](https://supabase.com/docs/guides/auth/general-configuration),
[Cloudflare rollback behavior](https://developers.cloudflare.com/workers/wrangler/commands/workers/)

## 18. Final go/no-go checklist

- [ ] Release record has no unresolved owner, target, contact, or version fields.
- [ ] Candidate checkout is clean and exact commit/dependency/migration checksums are recorded.
- [ ] Local, staging, and production projects, Workers, routes, keys, callbacks, and secrets are isolated.
- [ ] Remote migration history matches the immutable manifest.
- [ ] A current backup plus separate Storage copy has been restored and verified in a disposable target.
- [ ] Empty DB, repeated seed, restored-copy migration, executable RLS, and count comparisons pass.
- [ ] Lint, TypeScript, all Vitest, production build, desktop/mobile, configured multi-user, locale/RTL, and accessibility gates pass.
- [ ] Turnstile, custom SMTP, Google/Facebook OAuth, Storage, monitoring, alerts, and operational contacts pass.
- [ ] Retention and deletion contracts are approved, implemented, accurately published, and tested.
- [ ] Wrangler dry run and generated config review pass without secrets or target drift.
- [ ] Previous healthy Worker version and explicit rollback command are recorded.
- [ ] Release-specific A, B, or C gates pass; unrelated later-release flags remain off.
- [ ] If outreach is enabled, provider/legal/DLT-DCA, consent, suppression, retention, HMAC webhook, no-provider/no-send, withdrawal and volume-alert evidence passes.
- [ ] A separate production approval names this exact evidence bundle and mutation set.
- [ ] Post-deploy version, traffic, live smoke, alert, cleanup, and handoff evidence is recorded.

If every applicable item is checked, proceed only within the approved window.
Otherwise the decision is **NO-GO**.

**Sources:** all repository and official references linked in sections 1–17.
