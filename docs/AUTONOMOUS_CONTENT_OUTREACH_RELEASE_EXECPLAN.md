# Release autonomous content, owned social publishing, and consented outreach

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with the ExecPlan requirements and guidelines in the `execution-plan` skill.

## Purpose / Big Picture

FarmerBook already has production feature flags for the autonomous blog, FarmerBook-owned Facebook publishing, outreach, the AI company, and managed operations. This release makes the repository match that deployed intent, verifies that a reviewed blog publication can create a safely controlled owned-social publication, and makes consented outreach capable of autonomous processing only when its legal, provider, consent, suppression, cap, audit, and automatic-stop gates all pass. The observable result is a committed and pushed release, applied database migrations and Worker deployments when credentials are available, and read-only production checks that prove readiness without publishing a new post, spending money, or sending a message.

## Progress

- [x] (2026-08-21 23:17Z) Located the clean delegated worktree at commit `1a68c79`, the dirty primary checkout at `/Users/ngonapa/Downloads/farmerbook`, and remote `origin/main` at `9cfc27a`.
- [x] (2026-08-21 23:17Z) Created branch `codex/autonomous-content-outreach-release` from the primary checkout's current `main` commit without modifying the dirty checkout.
- [x] (2026-08-21 23:20Z) Classified and transferred 115 candidate files: application/configuration code, additive migrations, tests, and operator documentation. Excluded planning state, research, generated evidence, and lead/discovery data.
- [x] (2026-08-21 23:23Z) Verified the candidate's content-to-social and consented-outreach safety behavior with 32 focused suites (151 tests).
- [x] (2026-08-21 23:28Z) Ran the full repository check (170 files and 779 tests), Gitleaks history scan, a production-shaped build, and strict dry runs for the main Worker and isolated connector.
- [ ] Commit the intended release and push it without including research notes, generated evidence, lead lists, or unrelated user work.
- [ ] Apply pending production database migrations and deploy the application and isolated owned-social connector if documented credentials are available (blocked: production has no listed physical backup and the documented migration dry run refuses an out-of-order 19-migration history gap).
- [x] (2026-08-21 23:28Z) Verified production configuration, current Worker deployments, secret names, database release controls, and migration prerequisites using read-only checks; no provider action was invoked.
- [ ] Send the coordinator a concise deployment, autonomy, test, and prerequisite report.

## Surprises & Discoveries

- Observation: Local `main` contains 13 production-oriented commits that have not reached `origin/main`.
  Evidence: `git rev-list --left-right --count HEAD...origin/main` returned `13 0`; the commits range from the consent-first outreach candidate through the reviewed food-trust articles.
- Observation: The primary checkout contains both release implementation and clearly non-release material.
  Evidence: code, tests, migrations, and runbook changes coexist with `research.md`, `PLAN.md`, `.structured-dev-state`, generated `artifacts/`, and outreach CSV lead lists.
- Observation: The repository-verifiable release is internally coherent and passes its full validation suite.
  Evidence: 32 focused suites passed 151 tests; `npm run check` passed lint, type-check, 170 Vitest files with 779 tests, and a Vinext production build; both Wrangler strict dry runs completed.
- Observation: The production database cannot follow the documented `supabase db push --linked --dry-run` path yet.
  Evidence: the CLI reported 19 local migrations older than already-recorded remote migrations and requires `--include-all`; applying that broad set would exceed this release. `supabase backups list` reported no physical backups and PITR disabled.
- Observation: Production is missing exactly the new final-dispatch database objects while existing outreach remains active.
  Evidence: read-only SQL showed `outreach_agent`, `managed_operations_agents`, and `ai_company` enabled, `delivery_paused = false`, and no `daily_delivery_limit`, `outreach_dispatch_checks`, `outreach_automatic_events`, `authorize_outreach_dispatch`, or automatic-pause function. Live-action tables/functions are also absent and its Worker flag remains false.
- Observation: Production-shaped Worker inputs preserve the intended safety split.
  Evidence: the generated config has autonomous blog, owned social/Facebook, outreach, AI company, and managed operations enabled; Instagram and live-action are false; the private connector service is bound; no secret-like name appears in plaintext `vars`; strict dry runs exited without upload.

## Decision Log

- Decision: Work on a new `codex/` branch in the delegated worktree and treat the dirty primary checkout as read-only source material.
  Rationale: This preserves all user edits in place and gives the release an independently reviewable commit boundary.
  Date/Author: 2026-08-21 / Codex.
- Decision: Exclude lead lists, generated production evidence, research notes, and development-state files unless a later dependency proves they are required at runtime.
  Rationale: They are not deployable application behavior and may contain sensitive or unrelated work. The requested release needs code, database controls, tests, configuration contracts, and operator guidance.
  Date/Author: 2026-08-21 / Codex.
- Decision: Production verification will not invoke any endpoint or schedule capable of creating a provider-side post or delivering an outreach message.
  Rationale: The authorization explicitly requires safe non-spend/non-message verification and forbids uncontrolled outreach.
  Date/Author: 2026-08-21 / Codex.
- Decision: Do not use `supabase db push --include-all`, migration-history repair, or direct SQL application as an undocumented workaround.
  Rationale: The runbook requires an exact dry run and recoverable backup before mutation. The live project has an out-of-order ledger gap and no listed physical backup, so those actions could apply unrelated schemas or leave an unverifiable migration history.
  Date/Author: 2026-08-21 / Codex.
- Decision: Do not deploy the main Worker before the final-dispatch migration is safely applied.
  Rationale: Active outreach would call a new required RPC that does not exist in production. Deploying code first could disrupt current processing and trigger a safety pause.
  Date/Author: 2026-08-21 / Codex.

## Outcomes & Retrospective

The repository release candidate is complete and fully validated. Production mutation remains blocked by the database backup and migration-history prerequisites described above. The final entry will add the pushed commit and coordinator handoff.

## Context and Orientation

The repository is a Vinext/Next.js application deployed as a Cloudflare Worker. `worker/index.ts` exports the application fetch handler plus scheduled and Durable Object handlers. `vite.config.ts` converts server-only environment values into Worker bindings, while `.env.example` documents the configuration contract. Supabase SQL migrations in `supabase/migrations/` provide the database safety controls.

The blog implementation is under `features/blog/`. Autonomous publication means a standing policy may publish only an eligible reviewed draft, after which an independent verifier records the outcome. Owned social publishing is under `features/social-publisher/`; it may publish only to FarmerBook-owned channels and uses an isolated connector Worker under `workers/owned-social-connector/`. Outreach is under `features/outreach/`; it may process only purpose-specific consented messages, must re-check consent and suppression immediately before dispatch, must obey an India-calendar daily cap, and must automatically pause on ambiguous or unsafe provider outcomes. `features/action-control/` is the live-action authorization control plane, and `features/company-agents/` is the aggregate-only AI company operating layer.

The primary checkout at `/Users/ngonapa/Downloads/farmerbook` is intentionally not modified. It contains the uncommitted candidate implementation. This worktree starts from its current committed base `1a68c79`. Remote `origin/main` is 13 commits behind that base, so the final push must fast-forward through those already committed production releases plus one isolated autonomy release commit.

## Plan of Work

First, inspect import graphs, tests, migrations, and runbook changes in the primary checkout to determine the minimal coherent release file set. Transfer those files into this branch with `apply_patch`, never staging files directly from the dirty checkout. Exclude research, planning state, generated evidence, and lead data.

Second, install the exact locked dependencies and run focused tests for the blog policy, daily editorial loop, verifier, owned-social publisher and Meta connector, outreach readiness and dispatch, live-action control, AI company, and managed-agent routes. Diagnose failures against the code and implement the smallest safe corrections. The release must fail closed when secrets, provider setup, database controls, consent, suppression, caps, receipts, or audit persistence are unavailable.

Third, run all repository checks and validate every new SQL migration locally. Run secret scanning and inspect the final diff. Use Wrangler's dry run before any deployment. Commit only the classified release files and push the release to the remote after confirming the remote is a fast-forward target.

Finally, follow `docs/PRODUCTION_RUNBOOK.md` and `docs/SECRETS_AND_GITHUB_DEPLOYMENT.md`. Inventory credential names without printing values. Apply migrations in order only if the linked production project and authentication are unambiguous. Deploy the isolated connector before the application when its binding is required, then deploy the application with existing secrets preserved. Verify deployed versions, binding/configuration presence, database controls, and read-only readiness/health surfaces. Do not trigger scheduled handlers, processor routes, publication endpoints, connector fetches, provider calls, or any action executor.

## Concrete Steps

All commands run from `/Users/ngonapa/.codex/worktrees/e6fd/farmerbook` unless noted.

Inspect state with:

    git status --short --branch
    git -C /Users/ngonapa/Downloads/farmerbook diff --name-status
    git -C /Users/ngonapa/Downloads/farmerbook ls-files --others --exclude-standard

After transferring the coherent file set, install and validate with commands discovered from `package.json` and the production runbook. The expected top-level validation is:

    npm ci
    npm run check

Before deployment, use the repository-local Wrangler version and expect a successful no-upload bundle:

    npx wrangler --version
    npx wrangler deploy --dry-run

The production-shaped build reconstructs only current non-secret/plaintext Worker inputs from deployed version `563686e9-0065-4212-9530-17e1c55c14fb`, adds the documented `farmerbook.in` and `www.farmerbook.in` custom domains, and derives the existing connector service name. Both strict dry runs pass. The linked production migration dry run fails before mutation because the remote migration ledger omits 19 older local versions. Production application must wait until an owner records a recoverable backup and reconciles that history to a separately approved exact state.

## Validation and Acceptance

The release is acceptable when all focused and full tests pass; SQL tests prove the migrations are additive and deny unauthorized callers; the final diff contains no lead data, generated evidence, secrets, or unrelated work; and the pushed commit is reachable from the intended remote branch.

Content autonomy is verified when tests demonstrate that only eligible policy-bounded drafts can publish, the verifier records the outcome, a verified publication can create an owned-social job, channel/global pause and rate controls are enforced, and ambiguous provider outcomes automatically stop further work. Outreach autonomy is verified when tests demonstrate just-in-time consent and suppression checks, explicit daily caps, immutable dispatch audits, complaint/bounce/unsubscribe suppression, automatic pause behavior, and fail-closed readiness when any legal or provider prerequisite is missing.

Production acceptance uses only read-only deployment/version, database-control, and health/readiness checks. A complete end-to-end live publish or outreach send is explicitly outside this verification because it would create spend or contact a user. The report must distinguish repository-verified end-to-end autonomy from provider-side live-action verification.

## Idempotence and Recovery

The candidate transfer modifies only this branch and can be repeated file by file. Supabase migrations use ordered, additive SQL and must be checked for idempotent guards before production application. Wrangler dry runs do not deploy. Production migrations and Worker deployments use provider version history and the runbook's backup/rollback procedure; if any prerequisite is ambiguous, stop before mutation and leave the branch pushed and ready.

No command will reset, clean, stash, or rewrite the primary checkout. No secret value will be printed, passed on a command line, or committed. No verification command will call a live provider action.

## Artifacts and Notes

Validation evidence:

    delegated branch base: 1a68c79 Publish reviewed food trust articles
    origin/main:           9cfc27a Add supervised customer operations agents
    ahead/behind:          13 / 0
    primary status:        49 modified tracked files plus grouped untracked paths
    focused tests:         32 files, 151 tests passed
    full check:            lint/type-check/build passed; 170 files, 779 tests passed
    secret scan:           21 commits, no leaks found
    main Worker dry run:   passed with production routes/flags/service binding
    connector dry run:     passed; no upload
    current main Worker:   563686e9-0065-4212-9530-17e1c55c14fb at 100%
    current connector:     50888eb0-f0da-45cd-8c52-25e87f38af4d at 100%
    production mutation:   not attempted

## Interfaces and Dependencies

The exact runtime interfaces will be preserved from the candidate implementation after validation. Key boundaries include the blog publication policy and verifier, the owned-social publication job contract and isolated connector response receipt, the outreach readiness result and database `authorize_outreach_dispatch` function, the live-action authorizer/executor/verifier pipeline, the Supabase service-role gateway, and Cloudflare Worker environment bindings. External dependencies are Supabase, Cloudflare Workers/Durable Objects/Workers AI, Meta's official Page API for the owned Facebook Page, and Postmark for separately consented email. Missing provider or legal configuration must produce a named fail-closed readiness code, not partial execution.

Plan revision note (2026-08-21 23:17Z): Created the initial self-contained release plan after inventorying the worktrees and remote divergence.

Plan revision note (2026-08-21 23:28Z): Recorded the selected transfer, complete test/dry-run evidence, production shape, and the backup/migration-history deployment blocker so another operator can resume without repeating investigation.
