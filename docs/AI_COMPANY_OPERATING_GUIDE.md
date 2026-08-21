# FarmerBook AI company operating guide

## What the 15 company Agents do

FarmerBook's company Agents are role-isolated planners. Each scheduled run
reads an aggregate KPI snapshot and creates at most one reviewable proposal.
The snapshot contains counters only—no names, contacts, messages, support text
or prompts. `Approve for backlog` records an operating decision; it does not
send, publish, deploy, spend, moderate, verify or change an account.

Use the authenticated command center at `/admin/agents`. The browser-friendly
version of this guide is at `/admin/agents/guide`.

## Daily operating loop

1. Read the three 180-day objectives and latest aggregate snapshot.
2. Investigate unsuccessful managed runs before requesting more work.
3. Review critical and high-priority proposals first.
4. Enter a concrete decision reason and choose `Approve for backlog`, `Reject`
   or `Escalate`.
5. Assign approved backlog work to a person or the correct purpose-limited
   worker.
6. Review outreach failures, complaints, bounces, opt-outs and suppressions.
7. Leave healthy schedules alone. Use `Run now` only when fresh evidence is
   necessary and `Pause` for maintenance or anomalous output.

## Weekly operating loop

1. Compare registrations, activations and the 30-day activity proxy with the
   current targets.
2. Select a small number of measurable company outcomes.
3. Reject duplicate, stale or unsupported proposals.
4. Confirm every approved item has an owner, success measure and risk review.
5. Review schedule cadence, failure streaks and the independent audit output.

## Role guide

| Role | Read/review | Safe handoff |
| --- | --- | --- |
| Executive Strategy | Objective pace and company-wide priority. | Approve one weekly focus and assign an owner. |
| Operations Coordinator | Failed runs and review bottlenecks. | Clear a verified blocker or pause the affected role. |
| Data & Experimentation | Activation and product-event coverage. | Improve measurement before running an experiment. |
| Governance & Risk | Pending moderation and high-risk proposals. | Escalate legal, safety or trust decisions. |
| Independent Agent Auditor | Fleet failures and control anomalies. | Record an independent audit action; never self-approve execution. |
| Growth Strategy | Registration, activation and activity gaps. | Approve one bounded growth hypothesis. |
| Farmer Acquisition | Aggregate Farmer acquisition gaps. | Use owned content, partners or opt-in forms—not a scraped list. |
| Buyer & Wholesaler Acquisition | Demand participation, supply and enquiries. | Approve a consented buyer cohort or landing page. |
| Farmer Onboarding | Registration-to-onboarding completion. | Approve a mobile or language funnel improvement. |
| Marketplace Matching | Listings without enquiries and outcomes. | Investigate liquidity without exposing buyer details. |
| SEO & Editorial | Community, supply and search opportunities. | Send a sourced brief through editorial review. |
| Product Management | The largest validated funnel constraint. | Create an outcome-based product backlog item. |
| Engineering Planning | Technical support and run failures. | Create an investigation; code and deployment stay separate. |
| QA & Reliability | Reproducible failures and regression gaps. | Add a test/release-gate task; the role cannot declare itself safe. |
| Support & Trust | Aggregate support and moderation pressure. | Route private work to authorized people or support workflows. |

## How a proposal becomes consented outreach

```text
Growth/Farmer/Buyer proposal
        -> administrator backlog decision
        -> Social Content draft with /join or /partner-interest
        -> person submits their own contact and confirms consent
        -> Growth & Outreach sends a bounded email
        -> authorized person handles substantive replies
```

The `Social Content Drafting` specialized worker creates copy for FarmerBook's
owned channels but cannot publish or contact anyone. The `Growth & Outreach`
specialized worker processes consent confirmations, introductions, provider
events and one optional follow-up. Public contact information and discovery
research are not consent.

## Live-action Phase 1: separate planning from execution

Phase 1 adds a second, stricter gate between an approved company proposal and
any executor. It is local and default-off until a separate production canary is
approved. `Approve for backlog` still does not execute anything.

The current Phase 1 artifact is an inactive control-plane scaffold, not a
canary-ready executor. Executor resume is hard-disabled. Dedicated restricted
database roles, isolated connector services, authorization/start and approval-
wake integration, an independent verifier/reconciler, and observed shadow-mode
evidence must be completed before a canary can even be proposed.

An action can proceed only when all of these records agree:

1. the application flag and private database release control are enabled;
2. the named executor is not paused and its canary stage permits the action;
3. the proposal revision, action type, target-scope hash and payload hash match;
4. the required distinct human approvals are present and have not expired;
5. daily and monthly action/spend budgets can be reserved atomically;
6. the executor receives a short lease for that exact authorization; and
7. a receipt is verified or the result is marked unknown for reconciliation.

The Agent that proposes an action cannot approve or verify it. Unknown external
results are not retried blindly. Use `/admin/agents/actions` to inspect redacted
authorization metadata, approvals, receipts and verifier state, or to pause one
executor. Disabling the database control is the first emergency stop.

Initial proposed canary ceilings remain ten consented emails per day, fifty
in-app lifecycle items per day, ten supervised support replies per day and one
reviewed owned-site publication per day. These are upper bounds, not permission
to activate them. Cold email, scraped contacts, personal Facebook automation,
public-profile/group DMs, ads, transfers, contracts and autonomous deployment
remain prohibited.

## Outreach controls

- Sender: `FarmerBook CEO <ceo@farmerbook.in>` through Postmark.
- Intake: `/join` for membership and `/partner-interest` for collaboration.
- Consent: signed double opt-in for the exact email and purpose.
- Cadence: every 15 minutes, maximum ten eligible jobs per run.
- Sequence: one introduction and at most one separately consented follow-up.
- Tracking: opens and links disabled.
- Exit: one-click unsubscribe, reply `STOP`, withdrawal, complaint or hard
  bounce immediately cancels and suppresses later delivery.
- Emergency: pause delivery in `/admin/outreach`, then pause `Growth &
  Outreach` in `/admin/agents`.

Never import the research CSV files into delivery, buy or scrape a recipient
list, automate YouTube comments/messages, treat a public business email as
consent, or describe proposal approval as external execution.
