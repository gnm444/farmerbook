# Implementation Plan: Google-managed website-greeter canary

Approval: the delegated product-owner instruction explicitly authorizes direct
implementation of the secure greeting-agent canary. It does not authorize a
service-account key, external messaging/publication, or activation without a
verified keyless caller path.

## Approach

Repair the existing provider-neutral architecture instead of replacing its
privacy and budget controls. Keep deterministic FAQ answers first, route Google
only through a server-owned canary endpoint, retain Cloudflare as a budgeted
fallback, and keep all activation flags false by default. Make the ADK source
deployable through a keyless ADC/Agent Identity script with pinned deployment
requirements and zero warm instances. Do not create a public URL or claim a
live canary until the personal Google/Cloudflare identities and end-to-end WIF
path are available for verification.

## Changes required

### 1. Correct and harden the Google transport

Files: `features/website-greeter/google-provider.server.ts`,
`features/website-greeter/google-contract.ts`

- Send the documented `class_method` REST field.
- Assemble partial SSE content without truncation and ignore thought parts.
- Include the server-owned approved policy alongside the untrusted visitor JSON.
- Enforce bounded text, 90-word output, requested-script presence, and core
  false-action/verification claim rejection before a Google answer is accepted.
- Retry request-scoped session deletion once, still rejecting the answer if
  deletion cannot be confirmed.

Wire shape:

```ts
{ class_method: "async_stream_query", input: { user_id, session_id, message } }
```

### 2. Move canary eligibility to the server

Files: `features/website-greeter/contracts.ts`,
`components/website-greeting-agent.tsx`, `worker/index.ts`,
`features/website-greeter/agent.ts`

- Reject unknown public request fields, including a caller-supplied `surface`.
- Use `/api/website-greeter` for the Cloudflare launcher and
  `/api/website-greeter/canary` for `/chat`.
- Pass the resolved surface as a separate server-to-Durable-Object argument.

### 3. Make the Google agent artifact deployable

Files: `services/google-website-greeter/app/agent.py`,
`services/google-website-greeter/app/deploy.py`, dependency lock and README.

- Keep the reviewed tool-free ADK runtime on `gemini-2.5-flash-lite` while still
  requiring explicit project/location inputs.
- Add create/update/dry-run deployment commands using ADC, Agent Identity,
  pinned requirements, `min_instances=0`, `max_instances=1`, and resource-name
  plus operation-schema verification.
- Never read or accept a service-account key path.

### 4. Add focused tests and update truthful operator docs

Files: Google/website-greeter Vitest suites, Python contract/deployment tests,
`.env.example`, Google canary/privacy docs.

- Test snake-case wire bodies, partial/final SSE behavior, thought suppression,
  output safety/language guards, deletion retry, endpoint isolation, deployment
  config, and no-key invariants.
- Describe the unresolved external OIDC assertion/broker gate accurately.
- Document the staged daily Featured Farmer/blog/consented-outreach/growth
  workflow without activating or publishing anything.

## Testing strategy

Run focused Vitest and Python unit suites after each component, then repository
typecheck, ESLint, and `git diff --check`. Run the deployment script in dry-run
mode with synthetic metadata. A real Agent Runtime smoke test and a public
canary remain release gates, not local test claims.

## Rollback

Set `WEBSITE_GREETER_GOOGLE_CANARY_ENABLED=false`; the ordinary launcher and
Cloudflare provider stay intact. Revert the canary-only endpoint/provider files
without touching the existing Durable Object history or central budget ledger.

## Todo

- [ ] Correct REST wire casing and streamed response assembly.
- [ ] Add trusted policy and output safety/language validation.
- [ ] Retry session deletion without returning unconfirmed Google output.
- [ ] Server-enforce canary endpoint routing and reject public `surface`.
- [ ] Add keyless ADC/Agent Identity create/update deployment artifact.
- [ ] Generate reproducible deployment requirements.
- [ ] Add focused TypeScript and Python tests.
- [ ] Update privacy, canary, environment, and automation-roadmap documentation.
- [ ] Run focused and repository verification.
- [ ] Record the external keyless-broker/login gate and do not claim deployment.

## Approved Memory Bank addendum (2026-09-05)

Approval: the product owner explicitly approved the supported Memory Bank model,
24-hour memory and revision TTLs, a single revision candidate, config-only
canary update, application integration, and one synthetic
create/retrieve/delete cleanup test. No automatic model fallback is authorized.

### Approach

Keep the existing private canary and provider-selection architecture. Give each
consented Durable Object conversation an independent random provider scope that
is never accepted from or returned to the browser. Retrieve only the exact
scope before a Google canary turn; generate memories only from the already
redacted and bounded user/assistant exchange after the one-turn ADK session has
been deleted; cascade explicit consent withdrawal through remote memory
deletion before removing the local scope mapping. Missing consent makes zero
Memory Bank requests. Cloudflare remains the unchanged fallback.

### Changes required

#### 1. Consent-bound opaque scope

Files: `features/website-greeter/conversation.ts`,
`features/website-greeter/agent.ts`

- Reuse the server-only `provider_session_id` column as the random Memory Bank
  scope mapping and never derive the provider scope from the browser UUID.
- Create/refresh the mapping only while the current consent version is active.
- On withdrawal, remove local turns immediately, delete all memories for the
  mapped scope, and retain the scope mapping only when deletion cannot be
  confirmed so the caller can retry.

```ts
providerSession: {
  providerId: "google_vertex_agent_engine",
  providerSessionId: `memory-${crypto.randomUUID()}`,
}
```

#### 2. Bounded Memory Bank transport

File: `features/website-greeter/google-provider.server.ts`

- Add exact-scope similarity retrieval, capped at three bounded facts.
- Treat retrieved facts as untrusted prompt data.
- Generate from two redacted text events only when consent and an opaque scope
  are present; rely on the instance `86400s` memory and revision TTLs.
- Add an exported exact-scope delete cascade that retrieves at most bounded
  pages and deletes only validated child resource names.

```ts
{
  scope: {
    user_id: opaqueScope,
  },
  directContentsSource: { events: boundedEvents },
}
```

#### 3. Config-only live update

Resource:
`projects/core-song-507701-f6/locations/us-central1/reasoningEngines/2785816668377448448`

- Re-read name, updateTime, deployment config, identity, and Memory Bank config.
- PATCH only `contextSpec.memoryBankConfig` with the approved generation model,
  multilingual embedding model, `defaultTtl=86400s`, and
  `disableMemoryRevisions=true`.
- Stop on any model rejection; do not select another model.
- Re-read the resource and compare all non-Memory-Bank invariants.

#### 4. Tests, live smoke, and cleanup

Files: `tests/google-website-greeter-provider.test.ts`,
`tests/google-website-greeter.test.ts`, `tests/website-greeter.test.ts`, operator
docs and structured-development logs.

- Test missing-consent zero-call behavior, opaque cross-session scope
  isolation, bounded/redacted generation, exact-scope retrieval, deletion
  cascade, retryable cleanup, and the existing Agent Engine session cleanup.
- Run focused Vitest, TypeScript, focused ESLint, Python canary tests, and
  `git diff --check` without changing unrelated dirty files.
- Use one non-personal synthetic fact and one one-time scope to generate,
  retrieve, delete, and verify zero remaining matching memories and sessions.

### Rollback

Application rollback keeps the canary flag false or reverts only this addendum's
transport/scope code. Cloud rollback patches only
`contextSpec.memoryBankConfig` back to the pre-write snapshot; it must not touch
the runtime deployment, scaling, environment, identity, or traffic. Any live
synthetic memory and session are deleted before completion.

### Memory Bank todo

- [ ] Re-read and record the exact pre-write canary configuration.
- [DONE] Implement the consent-bound opaque scope mapping.
- [DONE] Implement exact-scope retrieve/generate/delete transport.
- [DONE] Add missing-consent, isolation, lifecycle, and cleanup tests.
- [DONE] Run focused TypeScript and Python verification.
- [ ] Apply and verify the config-only Memory Bank PATCH.
- [ ] Run the synthetic create/retrieve/delete test and prove cleanup.
- [DONE] Update privacy/operator documentation and implementation evidence.

## Memory Bank operator-utility corrective addendum (2026-09-06)

Approval: the delegated corrective instruction authorizes local code, tests,
and operator documentation for the defects found by the independent audit. It
explicitly forbids Google Cloud calls or mutations in this implementation run.

### Bounded approach

1. Bind the numeric canonical Reasoning Engine name and accept only the one
   verified project-ID spelling as an optional input alias. Use `v1beta1` for
   Reasoning Engine, operation, memory, and session URLs.
2. Protect all resource fields except the approved Memory Bank leaf and known
   server metadata. Assert optional telemetry/content capture absent or false
   on both reads without placing those controls in the PATCH body.
3. Dependency-inject HTTP sessions and sleep behavior so request/response tests
   prove the exact GET/PATCH/LRO/read-back contract without network access.
4. Add a standalone, dry-run-by-default, non-personal smoke utility. Its
   unconditional cleanup repeatedly retrieves the exact unique scope, deletes
   every validated matching memory, waits for each deletion operation, confirms
   empty state, and deletes/verifies any disposable session it created.
5. Update exact operator commands and truthfully record that the approved model
   remains rejected and no live retry is authorized in this corrective pass.

### Corrective todo

- [DONE] Canonicalize the exact numeric resource and v1beta1 endpoints.
- [DONE] Preserve every non-Memory-Bank context sibling in invariant checks.
- [DONE] Assert telemetry/content capture off before and after, outside PATCH.
- [DONE] Add HTTP-level GET/PATCH/LRO/read-back tests.
- [DONE] Add bounded fail-closed standalone live-smoke utility and cleanup tests.
- [DONE] Update operator documentation and exact dry-run/live commands.
- [DONE] Run focused Python tests, applicable TypeScript gates, scoped lint,
         both dry-runs, and whitespace checks without any Google Cloud call.
         Evidence: 41 Python tests, 27 focused Vitest tests, TypeScript, and
         scoped ESLint all pass. Repository-wide ESLint still scans the local
         Python `.venv` and reports third-party bundled-JavaScript findings.

## Authenticated locale switching corrective plan (2026-09-07)

1. Make `LocaleProvider` own synchronized client locale/catalog state and expose
   an atomic replacement API that also updates `<html lang>` and `dir`.
2. Make `LanguageSelector` validate the requested locale, lazy-load its catalog,
   update the mounted app immediately, persist the cookie/profile preference,
   refresh server components, and roll back on persistence failure.
3. Add a typed, complete authenticated-interface catalog for every locale in
   `SUPPORTED_LOCALES`; use it for the shared shell, language disclosure,
   Network, Discover, profile cards, actions, errors, and accessibility labels.
4. Keep user/profile content verbatim and localize only application-owned copy.
5. Add registry-completeness, immediate switching, rollback, persistence,
   navigation, RTL, and unknown-locale fallback tests; then run focused tests,
   the full suite, typecheck, lint, and a production build.

### Locale switching todo

- [DONE] Implement reactive client locale state and persistence rollback.
- [DONE] Add complete authenticated-interface translations for all 23 locales.
- [DONE] Remove authenticated Network/Discover hard-coded English copy.
- [DONE] Add switching, persistence, navigation, RTL, and fallback coverage.
- [DONE] Run focused and repository-wide verification: 200 Vitest files / 915
  tests, TypeScript, ESLint (one pre-existing `<img>` warning), production
  build, and `git diff --check` pass.

## Goal 9 — Vistaraku recovery and completion plan (2026-09-15)

Approval: the current delegated user instruction explicitly supersedes older
stop/cancellation state and authorizes this bounded implementation plus a
protected production deployment after every gate passes. The same instruction
requires the recovered `AGENTS.md` release controls, privacy controls, and
provider gates to remain fail-closed.

### Approach

Recover only Vistaraku-owned files and exact shared hunks from stash object
`60726395b0eeeb9c10f6240653031b96f27db3a8`. First create a truly provider-free
catalog candidate. Then add the private intake as a separate default-off source
candidate after correcting Origin/Turnstile binding, notification-result error
handling, HMAC versioning and reproducible concurrency evidence. Build and test
only immutable Git archives. Never deploy the later intake candidate until its
isolated staging, privacy, cleanup, Turnstile and credential gates pass.

### Catalog candidate

- Recover the 22-product immutable catalog, source-linked page and CSS.
- Refresh the review date and correct stale delivery-copy claims.
- Keep the page free of form, action, database, notification, privacy,
  Turnstile and maintenance imports.
- Keep manufacturer imagery on the linked source pages; do not copy, host or
  embed it in the first candidate.
- Add only the public sitemap path for discovery. Do not enable the generic
  Companies feature or widen the constrained catalog-only delta.
- Add a catalog test that asserts the provider-free module boundary.
- Commit and annotate an immutable local candidate; build and inspect it from a
  Git archive, not the working tree.

### Private intake candidate

- Recover distinct COD/inquiry schemas, forms, actions and contracts.
- Cap Turnstile tokens at 2,048 characters; require Origin and Host; bind the
  current hostname to a non-empty `TURNSTILE_HOSTNAMES` allowlist and exact
  Siteverify hostname/action results.
- Version sender HMACs explicitly and store/validate that version through the
  database RPCs so future rotation cannot reinterpret retained records.
- Check both thrown and resolved Supabase notification-result failures without
  retrying a provider response whose outcome may be ambiguous.
- Recover the isolated forced-RLS migration, keyed withdrawal and bounded
  cleanup. Add a reproducible two-session lock harness and truthful evidence.
- Keep intake, privacy approval, cleanup, email and WhatsApp false by default;
  keep provider destinations/secrets blank or server-only.

### Verification and release gates

- [DONE] Verify the base contains no tracked Vistaraku `AGENTS.md` or
  `GOALS.md`; do not recreate a partial global ledger or recover a home-level
  instruction file outside the repository.
- [DONE] Create and test the provider-free catalog source.
- [DONE] Create immutable catalog commit/tag and a separate local evidence
  manifest that explicitly is not a release authorization.
- [DONE] Run clean install, focused/full tests, typecheck, scoped/full lint,
  production build, candidate-source and artifact sentinels, and whitespace
  checks from an immutable archive.
- [BLOCKED] Re-read current production health/route and retain the exact rollback
      Worker version through fresh authenticated provider evidence.
- [BLOCKED] Use only the protected broker for a zero/limited-traffic catalog canary;
      verify apex and `www` health, page, sitemap, assets and rollback.
- [DEFERRED] Recover and correct the default-off private intake source in a
  separately approved candidate.
- [DEFERRED] Run exact migration/pgTAP plus reproducible two-session concurrency in an
      isolated disposable database.
- [DEFERRED] Obtain isolated staging credentials and prove migration ledger, forced
      RLS/grants, rate/idempotency/withdrawal, cleanup and Turnstile valid,
      missing, expired, replayed, wrong-host and wrong-action behavior.
- [DEFERRED] Approve/test the privacy mailbox and provider-copy deletion procedure.
- [DEFERRED] Treat email and WhatsApp as independent later candidates; never enable
      either without separate credentials, consent, sender/template/webhook,
      retention and rollback evidence.
- [BLOCKED] Update a future complete goal ledger with evidence only; mark Goal 9 complete only after live
      route evidence and all applicable gates are satisfied.

### Rollback

For catalog-only release failure, return traffic to the freshly verified prior
Worker version; there is no database rollback. For any later intake incident,
disable intake/cleanup/providers first, preserve authorized records, restore the
prior Worker through the protected broker, and use only a reviewed forward SQL
correction. Never rewrite migration history or retry an unknown provider send.

Plan approved by the current user instruction. Proceed within this exact scope.
