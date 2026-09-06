# FarmerBook Google website greeter canary

This directory contains the tool-free ADK application and narrow operator
utilities for the existing private Vertex AI Agent Engine canary. Nothing here
creates a project, enables an API, changes IAM or billing, or selects traffic.
The Agents CLI manifest uses `deployment_target: none` deliberately.

## Contents

- `app/agent.py` defines one purpose-limited ADK `Agent`. It refuses to import
  until a reviewed `FARMERBOOK_GOOGLE_MODEL` is configured and has no tools.
- `app/agent_engine.py` wraps that agent in Vertex `AdkApp` for a future
  source-based Agent Engine deployment.
- `app/contracts.py` independently validates the versioned Worker/service JSON
  boundary without loading ADK or credentials.
- `app/contract_adapter.py` converts a validated request to bounded ADK query
  inputs and validates text-only response events.
- `app/memory_bank.py` can dry-run or apply the single approved config-only
  Memory Bank patch to the exact existing canary. Its update mask is only
  `contextSpec.memoryBankConfig`.
- `app/memory_bank_smoke.py` is a dry-run-by-default synthetic proof. Its live
  mode waits for generation, proves similarity retrieval, and then deletes and
  twice confirms the exact disposable scope is empty. It creates no Agent
  Engine session.
- The TypeScript mirror and server transport are in
  `features/website-greeter/google-contract.ts` and
  `features/website-greeter/google-provider.server.ts`. Cloudflare stays the
  default provider and fallback.

## Contract and privacy boundaries

The contract accepts only `en-IN`, `te-IN`, and `hi-IN`, at most eight sanitized
history turns, 2,400 history characters, a 300-character current message, 160
requested output tokens, and temperature from 0 through 0.2. History requires
the exact anonymous-context consent version. Unknown fields—including anything
credential-shaped—are rejected. Errors contain bounded codes rather than user
content.

The Worker remains the system of record for anonymous consent, 24-hour
retention, redaction, and deletion. On the private Google canary only, it maps a
consented browser session to a separate random `memory-<UUID>` scope that is
never returned to or selected by the browser. Memory Bank retrieval and
generation require that mapping and the exact consent version. Retrieved facts
and generated events are sanitized and bounded. Memory Bank uses a 24-hour
default TTL with one revision candidate and a 24-hour revision TTL; consent withdrawal and expiry delete every
memory in the exact opaque scope before the Worker drops its retry mapping.

## Local contract tests

The contract tests use only Python's standard library and make no network calls:

```sh
cd services/google-website-greeter
python3 -m unittest discover -s tests -v
```

Do not install the ADK dependencies merely to run these contract tests. Before a
future canary, create an isolated Python 3.11+ environment, review the allowed
dependency ranges, generate a reproducible lock, and run ADK's local evaluation
workflow with synthetic prompts only.

## Local `/chat` canary surface

The FarmerBook app includes a dedicated `/chat` route for local review. It
embeds the existing multilingual website greeter without the public site footer
or a second floating launcher. The route is reachable without a user session,
but is intentionally absent from the sitemap and marked `noindex` until the
Google setup and QA gate below is complete.

The page truthfully describes its conditional provider behavior. The Worker can
now invoke Agent Engine through a private workload-identity broker binding,
with central budget reservation, request-scoped provider sessions, confirmed
session deletion, Cloudflare fallback, and contact handoff. The implementation
remains inactive until every server-only identifier and binding is configured
and `WEBSITE_GREETER_GOOGLE_CANARY_ENABLED=true`.

See `docs/GOOGLE_WEBSITE_GREETER_CANARY.md` for the binding contract, least-
privilege identity design, activation inputs, QA gate, and rollback.

## Exact Memory Bank configuration

From an authenticated owner environment, first inspect the dry run:

```sh
cd services/google-website-greeter
python -m app.memory_bank
```

The explicit mutation is:

```sh
python -m app.memory_bank --apply
```

After a successful configuration read-back, inspect the cleanup-safe smoke dry
run:

```sh
python -m app.memory_bank_smoke
```

The explicit live synthetic proof is:

```sh
python -m app.memory_bank_smoke --apply
```

Both utilities are bound to the canonical resource
`projects/659765383594/locations/us-central1/reasoningEngines/2785816668377448448`.
The verified project-ID alias is `core-song-507701-f6`. The Memory Bank
configuration uses `gemini-3.5-flash`, `text-multilingual-embedding-002`, an
opaque `user_id` customization scope, the `USER_PREFERENCES` and
`EXPLICIT_INSTRUCTIONS` managed topics, one revision candidate, and `86400s`
memory and revision TTLs. The separate ADK greeter runtime remains on
`gemini-2.5-flash-lite`. The utility reads before and after, includes the current etag, and fails if
any protected non-Memory-Bank field changes. When Google omits the optional
etag, the API performs a blind write limited to this one update-mask leaf; the
before/after protected-field comparison still fails on any observed sibling
change. It has no model fallback.

On 2026-09-07 the live read-back matched this supported Memory Bank shape. The
live smoke remains an explicit operator action because it creates a disposable
synthetic memory before unconditional cleanup. The configured Memory Bank model
is substantially costlier than the rejected Flash-Lite counterfactual, so the
application and billing budgets remain release gates.

## Activation gate

Use short-lived Workload Identity Federation; do not create or download a
service-account key. The application canary remains inactive until its exact
server-side identifiers, private broker binding, permissions, and flag are
configured.

Before changing the manifest away from `none` or enabling the `/chat` canary,
require all of these:

1. Privacy and native-language review of the agent instruction and synthetic
   evaluation set.
2. A dedicated least-privilege runtime identity and authenticated private
   Worker-to-Google transport.
3. Provider cost estimation and settlement wired into the existing application
   ledger before every Google call. The code-level application ceiling remains
   USD 20/month; the current USD 10 fleet cap and USD 5 greeter allocation are
   intentionally narrower.
4. A Google Cloud budget with notifications below the application ceiling.
   Billing budgets alert; they are not a hard spending cap.
5. Maximum output-token and request-rate enforcement, zero optional tools,
   content logging and prompt capture disabled, Memory Bank limited to one
   revision candidate with a 24-hour revision TTL,
   a 24-hour default Memory Bank TTL, and no minimum warm instances until cost
   is measured.
6. A synthetic staging canary proving English, Telugu, Hindi, session deletion,
   prompt-injection resistance, quota denial, timeout fallback, and zero
   cross-session context leakage.
7. An explicit rollback that leaves the Cloudflare binding and provider config
   intact. Only a verified canary may change traffic selection.

Official references used for this skeleton:

- [ADK/Agents CLI project structure](https://google.github.io/agents-cli/guide/project-structure/)
- [Vertex AI Agent Engine deployment](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/agent-engine/deploy)
- [Vertex `AdkApp` reference](https://docs.cloud.google.com/python/docs/reference/vertexai/latest/vertexai.agent_engines.AdkApp)
- [Invoke an ADK Agent Engine](https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/use-an-adk-agent)
- [Workload Identity Federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation)
- [Workload Identity Federation best practices](https://docs.cloud.google.com/iam/docs/best-practices-for-using-workload-identity-federation)
