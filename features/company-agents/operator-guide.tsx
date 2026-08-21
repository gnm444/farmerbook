import {
  COMPANY_AGENT_ROLES,
  managedAgentDefinition,
  type CompanyAgentRole,
} from "@/features/managed-agents/contracts";

type AgentOperatorGuidance = {
  input: string;
  reviewQuestion: string;
  handoff: string;
};

export const COMPANY_AGENT_OPERATOR_GUIDANCE = {
  executive_strategy: {
    input: "Objective progress, registrations, activations and 30-day activity.",
    reviewQuestion: "Is this the single most useful company focus for this operating week?",
    handoff: "Approve one focus for the backlog and assign an accountable owner.",
  },
  operations_coordinator: {
    input: "Failed managed runs and pending company or supervised-action proposals.",
    reviewQuestion: "Which verified blocker should be cleared first?",
    handoff: "Resolve the blocker or pause the affected role; never bypass a gate.",
  },
  data_experimentation: {
    input: "Aggregate activation and trailing-30-day product-event coverage.",
    reviewQuestion: "Is measurement reliable enough to support the proposed experiment?",
    handoff: "Approve a measurement task before authorizing an experiment.",
  },
  governance_risk: {
    input: "Pending moderation reports and high-risk supervised proposals.",
    reviewQuestion: "Does this require accountable legal, safety or trust review?",
    handoff: "Escalate high-risk decisions to a qualified person.",
  },
  independent_auditor: {
    input: "Fleet failures, pending risk work and control-plane anomalies.",
    reviewQuestion: "Is the evidence independent, reproducible and free of self-approval?",
    handoff: "Record an audit action or escalation; the auditor cannot execute it.",
  },
  growth_strategy: {
    input: "Registered, activated and monthly-active progress against 180-day targets.",
    reviewQuestion: "Will this improve activated users rather than vanity registrations?",
    handoff: "Approve one bounded, measurable growth hypothesis.",
  },
  farmer_acquisition: {
    input: "Aggregate Farmer registration and activation gaps.",
    reviewQuestion: "Is the proposed cohort permission-based and specific enough to measure?",
    handoff: "Use owned content, partners or the public opt-in form—never a scraped list.",
  },
  buyer_acquisition: {
    input: "Buyer/wholesaler counts, active supply and marketplace enquiries.",
    reviewQuestion: "Does the proposed demand cohort match real active supply?",
    handoff: "Approve a consented cohort or landing-page task without exposing buyer data.",
  },
  farmer_onboarding: {
    input: "Registered versus onboarding-complete users and Farmer counts.",
    reviewQuestion: "Is the largest validated mobile or language drop-off addressed?",
    handoff: "Create a reviewed onboarding improvement; reminders still require consent.",
  },
  marketplace_matching: {
    input: "Active listings, listings without enquiries and enquiry outcomes.",
    reviewQuestion: "Does this address an aggregate supply-demand gap without revealing identities?",
    handoff: "Approve a liquidity investigation, not a claimed or negotiated match.",
  },
  seo_editorial: {
    input: "Aggregate community, listing and Farmer supply signals.",
    reviewQuestion: "Can the topic be supported by reviewed sources and useful search intent?",
    handoff: "Send the brief through the separate editorial review and publication workflow.",
  },
  product_management: {
    input: "Activation, marketplace and support-pressure counters.",
    reviewQuestion: "Is this a measurable product outcome rather than a premature feature solution?",
    handoff: "Create a product backlog item with an owner and success measure.",
  },
  engineering_planning: {
    input: "Technical support pressure and managed-run failures.",
    reviewQuestion: "Is there enough evidence for a bounded engineering investigation?",
    handoff: "Create an engineering task; code, merge and deployment remain separate.",
  },
  qa_reliability: {
    input: "Failed/partial runs and open technical support cases.",
    reviewQuestion: "Can the dominant issue be reproduced and protected by a regression test?",
    handoff: "Add a QA/release-gate task; this role cannot declare its own release safe.",
  },
  support_trust: {
    input: "Aggregate open support, moderation and supervised-action demand.",
    reviewQuestion: "Is the oldest high-risk work routed without exposing private case content?",
    handoff: "Route cases to authorized people or purpose-limited support workflows.",
  },
} satisfies Record<CompanyAgentRole, AgentOperatorGuidance>;

function intervalLabel(seconds: number) {
  if (seconds % 86_400 === 0) return `Every ${seconds / 86_400} day`;
  if (seconds % 3_600 === 0) return `Every ${seconds / 3_600} hour`;
  return `Every ${seconds / 60} minutes`;
}

export function CompanyAgentOperatorGuide() {
  return (
    <div className="managed-agent-console">
      <section className="card company-metrics-card" aria-labelledby="agent-operating-loop">
        <p className="eyebrow">Start here</p>
        <h2 id="agent-operating-loop">The operating loop</h2>
        <ol>
          <li>Read objective progress, the latest aggregate snapshot and failed-run count.</li>
          <li>Review critical and high-priority proposals before medium or low work.</li>
          <li>Record a concrete reason, then approve for backlog, reject or escalate.</li>
          <li>Assign approved backlog work to a person or the correct purpose-limited worker.</li>
          <li>Use Run now only when fresh aggregate evidence is needed; pause anomalous roles.</li>
        </ol>
        <p className="managed-agent-boundary">
          Approve for backlog never sends, publishes, deploys, spends, moderates or changes an account.
        </p>
      </section>

      <section aria-labelledby="agent-role-guide">
        <div className="outreach-section-head">
          <div>
            <p className="eyebrow">Fifteen role-isolated planners</p>
            <h2 id="agent-role-guide">Role-by-role guide</h2>
          </div>
        </div>
        <div className="managed-agent-grid">
          {COMPANY_AGENT_ROLES.map((role) => {
            const definition = managedAgentDefinition(role);
            const guidance = COMPANY_AGENT_OPERATOR_GUIDANCE[role];
            return (
              <article className="card managed-agent-card" key={role}>
                <p className="eyebrow">{intervalLabel(definition.defaultIntervalSeconds)}</p>
                <h3>{definition.displayName}</h3>
                <p>{definition.description}</p>
                <dl className="managed-agent-metrics">
                  <div><dt>Reads</dt><dd>{guidance.input}</dd></div>
                  <div><dt>Review</dt><dd>{guidance.reviewQuestion}</dd></div>
                  <div><dt>Handoff</dt><dd>{guidance.handoff}</dd></div>
                </dl>
                <p className="managed-agent-boundary">{definition.boundary}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card company-metrics-card" aria-labelledby="outreach-handoff">
        <p className="eyebrow">Consent-first acquisition</p>
        <h2 id="outreach-handoff">How proposals become outreach</h2>
        <ol>
          <li>Growth, Farmer or Buyer Acquisition proposes a permission-based cohort.</li>
          <li>An administrator approves a bounded backlog task.</li>
          <li>Social Content Drafting prepares owned-channel copy with `/join` or `/partner-interest`.</li>
          <li>The person submits and confirms their own email consent.</li>
          <li>Growth &amp; Outreach sends one introduction and at most one separately consented follow-up.</li>
          <li>An authorized person handles substantive replies; STOP and unsubscribe suppress immediately.</li>
        </ol>
      </section>

      <section className="card company-metrics-card" aria-labelledby="agent-cadence">
        <p className="eyebrow">Operator cadence</p>
        <h2 id="agent-cadence">Daily and weekly rhythm</h2>
        <p><strong>Daily:</strong> review critical/high proposals, failed runs, outreach suppressions and provider failures. Leave healthy schedules alone.</p>
        <p><strong>Weekly:</strong> compare objective progress, approve a small measurable backlog, reject stale duplicates and assign owners.</p>
      </section>
    </div>
  );
}
