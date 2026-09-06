# Google website greeter canary integration

The dedicated `/chat` surface is the only request surface eligible for the
Google Vertex AI Agent Engine canary. The ordinary public-site launcher is
forced to the existing Cloudflare provider. Disabling one server-side flag
therefore rolls the canary back without changing the rest of the site.

This repository contains application transport and validation only. It does
not create or deploy an Agent Engine, workload identity pool/provider, service
account, identity broker, IAM policy, API, or billing resource.

## Request path

1. The browser sends a bounded message, release locale, anonymous session UUID,
   and opt-in context choice to the existing same-origin canary endpoint. The
   Worker assigns the `chat_canary` surface server-side; the public schema
   rejects a caller-supplied surface. The browser never receives Google
   metadata or credentials.
2. Approved deterministic questions are answered before any provider call.
3. The Durable Object checks session, daily, monthly, application, fleet, and
   website-greeting workstream limits. A Google reservation includes a
   conservative USD 0.02 fixed per-call allowance plus token allowance, so the
   USD 5 workstream cap stops the canary after at most 250 Google attempts even
   when Agent Engine does not report usage.
4. The Worker calls the private `GOOGLE_IDENTITY_BROKER` service binding. The
   broker must exchange its trusted ambient OIDC identity through Google
   Workload Identity Federation and impersonate the one dedicated runtime
   service account. Only the returned short-lived access token enters the
   calling Worker.
5. With explicit context consent, the Worker resolves a server-only random
   `memory-<UUID>` scope, retrieves at most three bounded sanitized Memory Bank
   facts, and passes them as untrusted prompt data. The browser UUID is never a
   Google lookup scope. Requests without consent make no Memory Bank calls.
6. The Worker creates a request-scoped ADK session, invokes
   `async_stream_query`, validates the bounded text-only SSE response, and
   deletes the session in `finally`. It rejects the Google answer if deletion
   cannot be confirmed. Only after session deletion does it submit sanitized
   user and assistant text for memory generation.
7. Any Google authentication, budget, transport, response, or deletion failure
   attempts the existing budgeted Cloudflare path. If that is unavailable, the
   existing safe contact handoff is returned.

## Memory Bank operator design

Configuration and proof are intentionally separate from application traffic.
Both utilities are bound to the single verified resource
`projects/659765383594/locations/us-central1/reasoningEngines/2785816668377448448`;
`core-song-507701-f6` is accepted only as its verified project-ID alias. They use
the `v1beta1` Reasoning Engine, operation, and Memory Bank APIs consistently.

The configuration utility sends one `PATCH` with query parameter
`updateMask=contextSpec.memoryBankConfig`. The body contains only the canonical
name, current etag when Google supplies one, and the approved Memory Bank leaf.
It reads the runtime before and after, asserts optional telemetry and content
capture absent or explicitly off, and hashes every field other than that leaf,
`etag`, and `updateTime`. A change to deployment, scaling, identity, traffic, or
another `contextSpec` member fails verification.

The smoke utility defaults to a network-free dry run. Live mode uses a unique
`memory-smoke-<UUID>` consent scope and two non-personal synthetic events. It
waits for the generation operation, proves retrieval with similarity search,
then enters unconditional cleanup. Cleanup exhaustively retrieves the exact
scope, validates every child name belongs to this runtime, waits for every
delete operation, and requires two consecutive empty reads. It creates no Agent
Engine session. An unsettled generation operation or unconfirmed deletion makes
the proof fail closed and reports only the disposable scope.

Google rejected the originally proposed Memory Bank generation model,
`gemini-2.5-flash-lite`, on 2026-09-06 and requested `gemini-3.5-flash`. The
live resource now uses that supported model, the multilingual embedding model,
an opaque `user_id` scope containing no FarmerBook identity, two bounded
managed topics (`USER_PREFERENCES` and `EXPLICIT_INSTRUCTIONS`), one revision
candidate, and 24-hour TTLs for both memories and revisions. This Memory Bank
model is separate from the tool-free ADK greeter runtime model, which remains
`gemini-2.5-flash-lite`.

Because this canary was created after 2026-06-29, an empty generation model
already inherits `gemini-3.5-flash`; selecting it explicitly does not raise the
model tier relative to the current managed default. It is materially costlier
than the rejected Flash-Lite counterfactual: current Standard PayGo in the `us`
endpoint is USD 1.65/M input tokens and USD 9.90/M output-and-reasoning tokens,
versus USD 0.10/M and USD 0.40/M for 2.5 Flash-Lite. Memory Bank does not expose
its internal extraction token count, so an exact per-memory amount cannot be
precomputed. See Google's [Memory Bank defaults](https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/memory-bank/setup)
and [Agent Platform model pricing](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing).

## Identity broker contract

Configure `GOOGLE_IDENTITY_BROKER_SERVICE` as a Cloudflare service binding, not
a public URL. The bound service receives only:

```json
{
  "audience": "//iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER",
  "serviceAccountEmail": "DEDICATED_ACCOUNT@PROJECT.iam.gserviceaccount.com",
  "scope": "https://www.googleapis.com/auth/cloud-platform"
}
```

It must reject every audience, service account, scope, caller, and route except
the exact configured allowlist. On success it returns:

```json
{
  "accessToken": "SHORT_LIVED_GOOGLE_ACCESS_TOKEN",
  "expiresAt": "RFC3339_TIMESTAMP"
}
```

The application accepts only tokens with between 30 seconds and 65 minutes of
remaining lifetime. The broker must not return refresh tokens, service-account
keys, external OIDC assertions, credential configuration, or diagnostic bodies
containing credentials. Never log the access token on either side.

## Operator-owned activation inputs

Keep `WEBSITE_GREETER_PROVIDER=cloudflare_workers_ai`. Supply all of the
following only through deployment configuration after the corresponding
resources and policies have been reviewed:

- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GOOGLE_CLOUD_AGENT_ENGINE_ID`
- `GOOGLE_CLOUD_WORKLOAD_IDENTITY_AUDIENCE`
- `GOOGLE_CLOUD_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_IDENTITY_BROKER_SERVICE`
- `WEBSITE_GREETER_GOOGLE_CANARY_ENABLED=true`

The workload identity provider should require its own full resource URL as the
OIDC audience and map one immutable, non-reusable workload subject. Grant
`roles/iam.workloadIdentityUser` on the dedicated service account only to that
subject, not to the entire pool. The broker service account should have only
the reviewed permissions needed to query that reasoning engine and retrieve,
generate, and delete memories in the same exact engine. Use a reviewed custom
role when practical. The deployed Agent Engine continues using its existing
Agent Identity. Enable STS and IAM Credentials data-access audit logs.

## Pre-activation checks

- Native-language reviewers approve English, Telugu, and Hindi synthetic
  evaluations and fallback wording.
- The deployed ADK agent remains tool-free and enforces temperature 0.2 and 160
  output tokens.
- The Agent Engine uses zero minimum warm instances until measured otherwise.
  Content logging and prompt capture remain disabled. Memory Bank is limited to
  one revision candidate and consented opaque scopes with 24-hour memory and
  revision TTLs.
- Consent withdrawal and expiry delete local turns immediately, delete every
  memory in the exact opaque scope, verify the scope is empty, and retain only a
  server-side retry marker if Google deletion cannot be confirmed.
- Synthetic tests cover prompt injection, unsafe output rejection, identity
  expiry, quota denial, timeout, malformed/oversized SSE, session deletion,
  Cloudflare fallback, and cross-session isolation.
- Google billing alerts are configured below the application ceiling. Alerts
  are monitoring, not a replacement for the application hard stops.

Rollback is `WEBSITE_GREETER_GOOGLE_CANARY_ENABLED=false`. Do not remove the
Cloudflare AI or central budget bindings during the canary.

## References

- [Google Agent Engine ADK invocation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/use-an-adk-agent)
- [Agent Engine Memory Bank setup](https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/memory-bank/setup)
- [Agent Engine `query` REST method](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rest/v1/projects.locations.reasoningEngines/query)
- [ADK `AdkApp` session and stream API](https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.agent_engines.AdkApp)
- [Google Workload Identity Federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation)
- [Google Workload Identity Federation best practices](https://docs.cloud.google.com/iam/docs/best-practices-for-using-workload-identity-federation)
- [Cloudflare private service bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
