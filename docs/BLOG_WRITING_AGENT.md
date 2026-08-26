# FarmerBook Blog Writing Agent

## Public and administrator URLs

- Public collection: `/blog`
- Reviewed field-trial article: `/blog/calculated-transition-to-natural-farming`
- Reviewed food-safety article: `/blog/ghee-purity-five-evidence-checks`
- Reviewed traceability article: `/blog/food-traceability-beyond-a-trust-badge`
- Founder editorial: `/blog/money-is-a-mirror-organic-farming-character`
- Founder review desk: `/admin/blog`

The runtime is a named Cloudflare Agents SDK Durable Object,
`BlogWritingAgent`, backed by SQLite state and a durable cron schedule. It wakes
every day at 03:30 UTC (09:00 IST), prepares at most one source-bounded draft,
and then returns to idle. “24/7 managed” means Cloudflare retains its state and
schedule and wakes it when required; it does not pay for a permanently running
server.

## Publication boundary

`BLOG_AUTONOMOUS_PUBLISHING=true` places only reviewed low-risk trust and
traceability briefs in `owned-blog-standing-policy-2026-08-20-v1`. The Agent
may publish one eligible article per India calendar day without per-post human
approval. The pure policy rejects stale or changed sources, medium/legacy-risk
briefs, schema drift, contact data, testimonials, digits/statistics, prices,
yield/income claims, certification conclusions, guarantees, treatment advice,
external URLs and unsafe markup. Rejected work stays private and creates no
daily review task.

An eligible row is provisional with an exact SHA-256, policy version and
idempotency key. The separate `BlogPublicationVerifierAgent` wakes after 90
seconds and fetches the rendered canonical route. It moves a matching row to
`public`; a mismatch becomes `quarantined`, disappears from public queries and
the sitemap, and pauses the schedule. No failed or ambiguous publication is
automatically retried. Existing/manual rows preserve authenticated revision-
bound review. Historical awaiting-review drafts, including “Under Conversion,”
are never adopted by the standing policy.

The code-backed Telugu and Indian English articles are editorially reviewed
before release. Supplied ideas are retained only where evidence supports them.
The first field-trial article removed fixed cost savings, fixed soil-recovery
timelines and guaranteed premiums. The community-derived food articles removed
an unsupported claim that 95% of milk, paneer and ghee is fake, treated
chargesheet reporting as allegations rather than a final finding, and described
blockchain as a record-integrity tool rather than proof of organic status or
food safety.

## Indian-language delivery

The reviewed Telugu and Indian English versions are canonical. When a visitor
selects any of the other 21 supported Scheduled Languages, the same managed
agent makes a faithful translation from the approved Indian English version
and caches it by article fingerprint and locale. The page identifies it as an
AI-assisted translation awaiting native-speaker review. If translation,
validation, the AI binding, or the budget is unavailable, the reviewed Indian
English original is shown with an explicit fallback notice.

Translation validation requires the same section and bullet structure and the
same ASCII numbers and ranges. Sources and URLs are not translated or generated
by the model.

## Sources available to scheduled drafting

The agent has a versioned, code-reviewed source manifest rather than
unrestricted web browsing. Review-only operation rotates through 30 briefs on
natural/organic farming, soil and water literacy, accurate certification
language, farmer-consumer trust, farm-to-table traceability, food safety and
practical farm-business records. Autonomous operation selects only the low-risk
trust and traceability subset. Each brief records its claim boundary, risk
class, source-review timestamp and prohibited claims. The reviewed source set
currently includes:

- [NITI Aayog Natural Farming](https://naturalfarming.niti.gov.in/natural-farming/)
- [ICAR natural-farming and Soil Health Card field guidance](https://icar.gov.in/index.php/hi/node/25263)
- [PGS-India certification guidelines](https://pgsindia-ncof.gov.in/Default/assets/front/PDF/Revised_PGS_India_Guidlines.pdf)
- [FSSAI Check Adulteration at Home](https://fssai.gov.in/inspection/check-adulteration)
- [FSSAI food regulations index](https://fssai.gov.in/food-law/regulations)
- [GS1 Global Traceability Standard](https://www.gs1.org/standards/gs1-global-traceability-standard/current-standard)

An editor must review that packet when an official page changes. The agent is
instructed not to invent sources, statistics, yields, prices, savings,
certification, safety claims, or guaranteed results. A source older than 180
days fails the daily run closed before any model call.

## Daily idempotency and controls

Every scheduled and manual request uses the same Asia/Kolkata calendar key.
The private run ledger is inserted before model inference, so a retry returns
the existing outcome instead of spending again. The hard limits are one total
draft attempt per day and 31 attempts per India calendar month. A budget,
source or model failure is retained as that day's bounded outcome.

The administrator desk shows today's run, source freshness, standing-policy
version, autonomous/provisional/quarantined counts, legacy review rows, route
verification and the exact schedule. Pausing cancels
only the Blog Agent's recorded daily/legacy editorial schedule IDs and retains
all drafts and publications. Resuming creates or reuses exactly one daily
schedule. Pause/resume is operational recovery, not a daily content approval.

## Owned social syndication

After independent blog verification, only the article slug, title, excerpt,
canonical URL, run key and content hash go to `OwnedSocialPublisherAgent`.
Copy is deterministic and adds per-channel UTM attribution and fixed FarmerBook
tags. The private outbox permits one post/article/channel, one/channel/day and
31/channel/month. An unknown outcome pauses that channel without retry.

The isolated `farmerbook-owned-social-connector` Worker is the only component
allowed to hold a Meta Page token. It is release-disabled and unbound until the
one-time official Page authorization is complete. Instagram also requires a
rights-cleared media pipeline. Personal profiles, groups, DMs, invitations,
comments, likes, follows, scraping and paid ads are outside this system.

## Model and budget

Draft writing uses the cheapest allowlisted Cloudflare Workers AI text model,
`@cf/ibm-granite/granite-4.0-h-micro`. Selected-language delivery uses
Cloudflare's purpose-built `@cf/ai4bharat/indictrans2-en-indic-1B`, which
supports the 22 Scheduled Indian languages and translates a fixed array of
approved text fields without reconstructing article JSON. The blog agent
reserves a conservative estimate before every model call and stops model work
at a hard default **USD 2/month** ceiling.
`BLOG_WRITING_MONTHLY_BUDGET_USD` may be set only from USD 1 through USD 2;
`BLOG_WRITING_MODEL` cannot select an unallowlisted writing model.

Current internal allocations within the shared USD 10/month agent cap are:

| Workstream | Monthly limit |
|---|---:|
| Website Greeting Agent | $5 |
| Consent-first Growth Agent | $3 |
| Blog Writing Agent | $2 |
| Unallocated fleet reserve | $0 |
| **Shared maximum** | **$10** |

The Blog Writing Agent’s local cap and the private singleton
`AiFleetBudgetAgent` both control its inference. Every draft and translation
reserves a conservative maximum estimate from the USD 2 workstream allocation
before Workers AI is called. The central Agent also enforces the USD 10 UTC-
month fleet ceiling atomically. Profile drafting, customer support and social
content have USD 0 allocations and therefore use deterministic fallback paths.

The application ledger is not the Cloudflare invoice: it prices reservations
at the reviewed retail model rates and does not subtract the account-wide daily
free Neuron allocation. Cloudflare billing notifications are informational and
do not stop calls. Worker requests, Durable Objects, storage and other platform
charges remain separate from the USD 10 model-inference ceiling.

## Operational checks

1. Open `/blog` once after deployment. This initializes the singleton, creates
   the idempotent daily schedule and cancels only the exact legacy weekly
   schedule.
2. Open `/admin/blog` as a FarmerBook administrator. Confirm the next scheduled
   run, the model, the USD 2 cap, and reserved monthly estimate.
3. Select **Run today's editorial policy now** only for a controlled test.
   Confirm a second scheduled/manual call returns the same daily result and
   does not spend or publish twice.
4. Confirm only a low-risk current-day row becomes provisional; rejected work
   stays private without entering a daily approval queue.
5. Confirm the independent public-route verifier reports `verified`. If it fails, inspect
   the route and source state before explicitly resuming the daily schedule.
6. Select a non-English/non-Telugu language on the public article and confirm
   the AI-translation disclosure or honest English fallback.
7. If `BLOG_MONTHLY_BUDGET_REACHED` appears, do not raise the cap beyond the
   approved fleet allocation. Publishing reviewed static content remains
   available without AI.

Cloudflare’s current scheduling behavior is documented in
[Schedule tasks](https://developers.cloudflare.com/agents/runtime/execution/schedule-tasks/).
This release uses a standing policy plus explicit operator pause/recovery
instead of recurring content approval.
