# Make FarmerBook Agents Operate Continuously Within Safe Limits

This ExecPlan is a living implementation plan for the request to make FarmerBook's agents operate automatically. It does not authorize unlimited sending, spending, or account changes. The intended result is continuous scheduled and event-driven operation with explicit budgets, consent checks, audit records, emergency stops, and separate provider readiness gates.

## Purpose / Big Picture

After this work, FarmerBook agents will keep checking approved work without a computer being left on. Planning agents will create reviewable operating proposals, the Blog Agent will create eligible daily content, and approved owned-channel or consented-email actions will run through isolated, auditable executors. WhatsApp will be added only after Meta changes the registered number from Pending to Active/Connected and a separate Cloud API implementation is completed.

## Progress

- [x] (2026-08-28 Asia/Kolkata) Reviewed the latest repository operating records and production-release notes.
- [x] (2026-08-28 Asia/Kolkata) Confirmed the 15 company schedules are enabled and human-review gated.
- [x] (2026-08-28 Asia/Kolkata) Confirmed Blog, consented outreach, and owned-social components have schedules or event triggers, but they do not run as permanent processes.
- [x] (2026-08-28 Asia/Kolkata) Confirmed live external-action execution is still blocked by the executor readiness gate.
- [x] (2026-08-28 Asia/Kolkata) Confirmed WhatsApp has no FarmerBook sender implementation and the separate Meta number remains Pending.
- [x] (2026-08-28 Asia/Kolkata) Built and deployed the isolated reviewed blog release as Worker version `c3ba7ce1-9637-492e-aad0-00aa1443bebf` without shipping unrelated working-folder changes.
- [x] (2026-08-28 Asia/Kolkata) Verified the public article route and `/api/health` both return HTTP 200.
- [x] (2026-08-28 Asia/Kolkata) Confirmed production already has the approved Blog, consented outreach, company, live-execution flag, and Facebook/Instagram variables enabled; those settings were preserved during deployment.
- [ ] Complete the restricted executor roles, isolated connectors, independent verifier, shadow period, and canary evidence required for external automation.
- [ ] Decide and document the exact channels, daily limits, recipients, and approval policy for automatic external actions.
- [ ] Deploy and validate each enabled workstream independently before enabling the next one.

## Surprises & Discoveries

- The phrase “running 24/7” means continuously available, not an always-running process. Cloudflare wakes a Durable Object for a cron schedule or event and lets it sleep when idle.
- The 15 company agents are enabled but use deterministic `company-policy-v1` proposals and reported zero model calls in their production test runs. They are not fifteen unrestricted AI writers.
- The Blog schedule is present, but the repository contains no confirmed autonomous Blog output for 21–28 August. A schedule can wake, reject an ineligible source, and finish without publishing.
- `ENABLE_LIVE_AGENT_EXECUTION` remains false and the executor registry is intentionally empty. The code rejects executor resume until restricted database roles, isolated connectors, an independent verifier, and shadow evidence exist.
- WhatsApp is outside the current FarmerBook agent system. The separate Namaha sender ending in 1022 is still Pending in Meta and has no token, webhook, or real message.
- The working folder contains unrelated uncommitted application and documentation changes. A clean detached worktree was used for the blog deployment so those changes were not included.
- Production metadata now reports the approved automation variables as enabled, but the source still defines `LIVE_ACTION_EXTERNAL_EXECUTORS_READY` as false. The live-action coordinator therefore cannot dispatch unsupported executor actions merely because the application flag is true.

## Decision Log

- Decision: Interpret “all agents” as continuous operation within the existing consent, budget, provider, audit, and emergency-stop boundaries; do not interpret it as unlimited autonomous authority.
  Rationale: The existing architecture deliberately separates planning from external execution and protects against duplicate messages, unapproved contact, uncontrolled spend, and provider-policy violations.
  Date/Author: 2026-08-28 / Codex.
- Decision: Keep WhatsApp disabled until Meta marks the canonical sender Active/Connected and the FarmerBook-owned Cloud API path is implemented and tested.
  Rationale: The current sender is not active and no FarmerBook WhatsApp executor exists.
  Date/Author: 2026-08-28 / Codex.
- Decision: Do not change production flags or deploy an executor in this preflight.
  Rationale: The requested supported automation was already enabled in production; the source-level executor readiness gate still hard-blocks unsupported live actions. The deployed change was limited to the reviewed blog publication.
  Date/Author: 2026-08-28 / Codex.

## Outcomes & Retrospective

At this milestone the new Five Elements article is public and health-verified. The supported Blog, consented email, company-agent, and owned Facebook/Instagram configuration was preserved because production already reports those controls enabled. The remaining work is not a single “start all” switch: action executor readiness, WhatsApp implementation/activation, and provider-specific canaries are still separate prerequisites.

## Context and Orientation

The FarmerBook app is deployed as a Cloudflare Worker at `farmerbook.in`. Cloudflare Durable Objects provide named, persistent agent state backed by private SQLite. Cron schedules wake selected agents; web requests and verified publication events wake others. Supabase stores private proposals, consent records, delivery state, and audit evidence. Workers AI is called only through the shared budget ledger.

The 15 company roles are created by `CompanyOperationsAgent` and read aggregate metrics. They create proposals for administrator review and cannot send, publish, deploy, spend, modify users, moderate, or grant verification. `Growth & Outreach` is a separate consent-bound scheduled role. `BlogWritingAgent` runs on its daily policy schedule. `BlogPublicationVerifierAgent` checks an eligible publication after a delay. `OwnedSocialPublisherAgent` handles approved FarmerBook-owned Facebook and Instagram publication through an isolated connector. `WebsiteGreetingAgent` responds on demand.

The live-action control plane is implemented as a guarded scaffold in `features/action-control`. It currently has no production executor connectors and rejects resume while `ENABLE_LIVE_AGENT_EXECUTION` is false or the external-executor readiness constant is false. The production runbook requires restricted database roles, isolated connectors, an independent verifier, quotas, expiry, receipts, reconciliation, and at least seven shadow days before a canary.

WhatsApp is not implemented in FarmerBook. The documented separate Namaha migration uses Meta WABA `1107571931859328` and Phone Number ID `1324126314111095`; Meta still reports the sender as Pending. The documented report received “Feedback submitted” but no case number.

## Plan of Work

First, keep the existing safe schedules enabled and add visible per-agent run evidence so an administrator can tell whether a job woke, found no eligible work, created a proposal, published content, or paused after an error. The Blog Agent needs a visible reason when its daily eligibility checks produce no draft.

Next, finish the action boundary before granting any autonomous external capability. Each executor must have a restricted database role, a separate connector, a short-lived capability token, a daily and monthly cap, an expiry, an immutable receipt, and a separate verifier. A proposal approval must remain different from permission to dispatch. Unknown outcomes must pause the executor rather than retrying blindly.

Then activate workstreams one at a time. Blog publication can use the existing standing policy and rendered-hash verifier. Owned Facebook and Instagram publishing can use the existing connector and one-post-per-channel limits. Consent-based email can use the verified Postmark sender only for recipients with active matching consent and after its delivery pause, suppression, and canary evidence are current. Support replies remain private until the defined approval policy is changed and tested.

Finally, handle WhatsApp as a separate provider project. Wait for Meta activation, create the token and webhook only after the sender is Active/Connected, verify a self-controlled test recipient, and implement explicit opt-in, template, suppression, rate-limit, and human-handoff behavior. Do not treat the Meta migration as a FarmerBook sender until those checks pass.

## Concrete Steps

Run all local checks from `/Users/ngonapa/Downloads/farmerbook`:

    npm run lint
    npm run typecheck
    npm test
    npm run build

Expected results are zero lint/type errors, a passing Vitest suite, and a successful production build. Before any deployment, perform a strict Wrangler dry run, take the documented production backup, verify the exact bindings and secrets by name without printing values, and run a no-traffic smoke test.

The 2026-08-28 isolated publication used a clean detached worktree based on commit `8233b8c`, applied only the new publication files, passed the full check (`188` test files and `858` tests), passed a strict Wrangler dry run, and deployed Worker version `c3ba7ce1-9637-492e-aad0-00aa1443bebf`. Live verification returned HTTP 200 for the article and `/api/health`.

For operational review, use:

    https://farmerbook.in/admin/agents
    https://farmerbook.in/admin/blog

These pages require the configured founder administrator. Review the latest run, schedule state, eligible-work count, pause reason, proposal count, provider receipt, and verifier result. Do not use a “resume” control unless the corresponding executor readiness and canary gates are green.

## Validation and Acceptance

Acceptance requires observable behavior, not just enabled flags. A scheduled agent must record a run with a deterministic idempotency key, a bounded result, and a clear no-work or success outcome. The Blog Agent must produce at most one eligible article per India calendar day and the independent verifier must either confirm the rendered hash or quarantine the publication. The social and email executors must show the exact provider receipt and read-back or remain paused. No recipient without matching consent may be contacted, and no WhatsApp message may be sent while Meta reports Pending.

The final rollout is accepted only when the administrator can inspect each run in `/admin/agents`, reproduce a safe no-work cycle, see automatic pause behavior after a controlled failure, and confirm that budgets and daily caps stop further work. A live canary must be owner-controlled and separately approved for each external channel.

## Idempotence and Recovery

Every schedule and event handler must use its India-date or provider-event idempotency key before creating work. Re-running a completed schedule must not create a second draft, post, email, or message. If a provider response is ambiguous, mark the outcome unknown and pause the executor for reconciliation. Roll back by pausing the affected executor first, then restore the last healthy Worker only if code or binding behavior is defective. WhatsApp migration or deletion is never a rollback shortcut.

## Artifacts and Notes

The primary current evidence is in `docs/REQUIREMENTS.md`, `docs/PRODUCTION_RUNBOOK.md`, `docs/OUTREACH_AGENT_ARCHITECTURE.md`, `implementation-log.md`, and `.structured-dev-state`. The article deployment evidence is the Worker version `c3ba7ce1-9637-492e-aad0-00aa1443bebf`, article HTTP 200, and health HTTP 200. No WhatsApp sender or unrestricted executor was enabled.

## Interfaces and Dependencies

The rollout depends on Cloudflare Workers, Durable Objects, the Agents SDK, Workers AI, cron schedules, Supabase private RPCs and RLS, Postmark for consented email, the isolated Meta connector for owned Facebook/Instagram publishing, and eventually Meta WhatsApp Cloud API. Existing feature flags, database controls, provider secrets, executor controls, budgets, consent records, suppression records, and independent verification must remain separate. No secret, OTP, access token, or full phone number belongs in source control, logs, chat, or this plan.
