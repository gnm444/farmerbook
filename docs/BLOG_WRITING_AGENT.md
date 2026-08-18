# FarmerBook Blog Writing Agent

## Public and administrator URLs

- Public collection: `/blog`
- First reviewed article: `/blog/calculated-transition-to-natural-farming`
- Founder review desk: `/admin/blog`

The runtime is a named Cloudflare Agents SDK Durable Object,
`BlogWritingAgent`, backed by SQLite state and a durable cron schedule. It wakes
each Tuesday at 03:30 UTC (09:00 IST), prepares one source-bounded draft, and
then returns to idle. “24/7 managed” means Cloudflare retains its state and
schedule and wakes it when required; it does not pay for a permanently running
server.

## Publication boundary

The agent cannot publish a newly written article during a scheduled or manual
draft run. New writing is stored as `awaiting_review` and becomes public only
after an authenticated FarmerBook administrator selects **Publish reviewed
draft** in `/admin/blog`. Rejection is terminal for that draft. Public article
queries return only `published` records.

The first Telugu article is code-backed and was editorially reviewed before
release. The supplied idea was retained, but unsupported claims—fixed cost
savings, fixed soil-recovery timelines, guaranteed premiums, and the claim that
soil needs only microbes and organic carbon—were removed or explicitly
qualified. It cites Government of India and ICAR material and explains that
FarmerBook verifies organic certification only after paperwork is uploaded and
reviewed.

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

The agent has a small, code-reviewed source packet rather than unrestricted
web browsing. It currently rotates through:

- [NITI Aayog Natural Farming](https://naturalfarming.niti.gov.in/natural-farming/)
- [Government of India Soil Health Card FAQ](https://soilhealth.dac.gov.in/files/FAQ_Final_English.pdf)
- [ICAR natural-farming and Soil Health Card field guidance](https://icar.gov.in/index.php/hi/node/25263)
- [ICAR balanced fertilizer and soil-health guidance](https://www.icar.gov.in/en/icar-ccari-goa-organises-khet-bachao-abhiyan-balanced-use-fertilizers-and-sustainable-soil-health)
- [PGS-India certification guidelines](https://pgsindia-ncof.gov.in/Default/assets/front/PDF/Revised_PGS_India_Guidlines.pdf)

An editor must review that packet when an official page changes. The agent is
instructed not to invent sources, statistics, yields, prices, savings,
certification, safety claims, or guaranteed results.

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

1. Open `/blog` once after a new Durable Object class deploy. This initializes
   the singleton and its idempotent weekly schedule.
2. Open `/admin/blog` as a FarmerBook administrator. Confirm the next scheduled
   run, the model, the USD 2 cap, and reserved monthly estimate.
3. Select **Prepare a draft now** only for a controlled test. Confirm the draft
   remains private.
4. Read the full text and open every cited source before publishing.
5. Select a non-English/non-Telugu language on the public article and confirm
   the AI-translation disclosure or honest English fallback.
6. If `BLOG_MONTHLY_BUDGET_REACHED` appears, do not raise the cap beyond the
   approved fleet allocation. Publishing reviewed static content remains
   available without AI.

Cloudflare’s current scheduling behavior is documented in
[Schedule tasks](https://developers.cloudflare.com/agents/runtime/execution/schedule-tasks/),
and the approval boundary follows its
[Human-in-the-loop guidance](https://developers.cloudflare.com/agents/concepts/human-in-the-loop/).
