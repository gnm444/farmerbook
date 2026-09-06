# Blog Writing Agent Scheduler Fix

## Diagnosis

- `BlogWritingAgent` creates its `30 3 * * *` schedule from `onStart()`.
- `worker/index.ts` only wakes `OwnedSocialPublisherAgent` from the global
  `*/15 * * * *` Worker cron.
- Therefore a quiet deployment can leave the Blog Agent Durable Object
  uninitialized until a public or administrator request touches it.
- The public blog currently contains six static articles and no article
  published by the managed Blog Writing Agent. Review-mode drafts also remain
  private until administrator approval.

## Approved approach

1. Add the `BLOG_WRITING_AGENT` binding to the Worker handler environment.
2. On each existing 15-minute Worker cron, obtain the named Blog Agent and
   call its read-only `status()` method. This wakes the Durable Object and
   runs `onStart()`, which creates or preserves exactly one daily schedule.
3. Run the social-publisher and Blog Agent heartbeat independently with
   `Promise.allSettled()` so a failure in one background task does not suppress
   the other.
4. Add focused source-level regression assertions and update the runbook to
   document the bootstrap heartbeat.
5. Run focused tests, lint, typecheck, production build, Wrangler dry run,
   deploy, and verify the public site remains healthy.

## Safety and rollback

- The Blog Agent's India-date run ledger continues to reject duplicate runs.
- No new AI call is made by the heartbeat itself.
- Roll back by redeploying the previous Worker version; the change is limited
  to background initialization and has no schema migration.
