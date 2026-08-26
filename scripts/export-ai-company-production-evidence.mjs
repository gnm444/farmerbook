import fs from "node:fs";
import path from "node:path";

const keyFile = process.env.FARMERBOOK_RELEASE_KEY_FILE;
if (!keyFile) throw new Error("FARMERBOOK_RELEASE_KEY_FILE is required");

const outputDirectory = path.resolve(
  process.env.FARMERBOOK_EVIDENCE_DIR ?? "artifacts",
);
const keysDocument = JSON.parse(fs.readFileSync(keyFile, "utf8"));
const keys = Array.isArray(keysDocument)
  ? keysDocument
  : keysDocument.api_keys;
const serviceKey = keys.find((candidate) =>
  candidate.name === "service_role"
)?.api_key;
if (!serviceKey) throw new Error("Supabase service-role key is unavailable");

const supabaseOrigin = "https://kdmtjavpxxcppmbzlttr.supabase.co";
const headers = {
  apikey: serviceKey,
  authorization: `Bearer ${serviceKey}`,
};

const roles = [
  ["executive_strategy", "Executive Strategy"],
  ["operations_coordinator", "Operations Coordinator"],
  ["data_experimentation", "Data & Experimentation"],
  ["governance_risk", "Governance & Risk"],
  ["independent_auditor", "Independent Agent Auditor"],
  ["growth_strategy", "Growth Strategy"],
  ["farmer_acquisition", "Farmer Acquisition"],
  ["buyer_acquisition", "Buyer & Wholesaler Acquisition"],
  ["farmer_onboarding", "Farmer Onboarding"],
  ["marketplace_matching", "Marketplace Matching"],
  ["seo_editorial", "SEO & Editorial"],
  ["product_management", "Product Management"],
  ["engineering_planning", "Engineering Planning"],
  ["qa_reliability", "QA & Reliability"],
  ["support_trust", "Support & Trust"],
];
const roleFilter = roles.map(([role]) => role).join(",");

async function getRows(query) {
  const response = await fetch(`${supabaseOrigin}/rest/v1/${query}`, {
    headers,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Evidence query failed: ${response.status}`);
  return body;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const [controls, agents, runs, snapshots, proposals] = await Promise.all([
  getRows(
    "ecosystem_release_controls?select=control_key,enabled,updated_at" +
      "&control_key=in.(managed_operations_agents,ai_company)" +
      "&order=control_key.asc",
  ),
  getRows(
    "managed_operations_agents?select=role,enabled,runtime_state," +
      "interval_seconds,max_items_per_run,last_run_at,last_success_at," +
      `consecutive_failures&role=in.(${roleFilter})&order=role.asc`,
  ),
  getRows(
    "managed_operations_agent_runs?select=id,role,trigger_type,state," +
      "claimed_count,succeeded_count,failed_count,failure_code,summary," +
      `started_at,completed_at&role=in.(${roleFilter})&order=started_at.asc`,
  ),
  getRows(
    "company_kpi_snapshots?select=id,run_id,role,metrics,captured_at" +
      "&order=captured_at.asc",
  ),
  getRows(
    "company_agent_proposals?select=id,run_id,snapshot_id,role,title," +
      "summary,action_kind,priority,risk_level,evidence,state,revision," +
      "created_at&order=created_at.asc",
  ),
]);

const latestRunByRole = new Map();
for (const run of runs) latestRunByRole.set(run.role, run);
const latestSnapshotByRole = new Map();
for (const snapshot of snapshots) latestSnapshotByRole.set(
  snapshot.role,
  snapshot,
);
const latestProposalByRole = new Map();
for (const proposal of proposals) latestProposalByRole.set(
  proposal.role,
  proposal,
);
const agentByRole = new Map(agents.map((agent) => [agent.role, agent]));

const conversations = roles.map(([role, displayName]) => {
  const agent = agentByRole.get(role);
  const run = latestRunByRole.get(role);
  const snapshot = latestSnapshotByRole.get(role);
  const proposal = latestProposalByRole.get(role);
  if (!agent || !run || !snapshot || !proposal) {
    throw new Error(`Incomplete production evidence for ${role}`);
  }
  return {
    role,
    displayName,
    operatorMessage:
      `Run ${displayName} once in production. ` +
      "Audit reason: Production validation: run each AI company role once.",
    agentContext:
      "Use aggregate FarmerBook KPIs only. Create one reviewable proposal; " +
      "do not execute an external action or call a language model.",
    aggregateInput: snapshot.metrics,
    agentOutput: {
      title: proposal.title,
      summary: proposal.summary,
      actionKind: proposal.action_kind,
      priority: proposal.priority,
      riskLevel: proposal.risk_level,
      evidence: proposal.evidence,
      state: proposal.state,
      revision: proposal.revision,
    },
    runEvidence: {
      id: run.id,
      triggerType: run.trigger_type,
      state: run.state,
      claimed: run.claimed_count,
      succeeded: run.succeeded_count,
      failed: run.failed_count,
      failureCode: run.failure_code,
      summary: run.summary,
      startedAt: run.started_at,
      completedAt: run.completed_at,
    },
    scheduleEvidence: {
      enabled: agent.enabled,
      runtimeState: agent.runtime_state,
      intervalSeconds: agent.interval_seconds,
      maxItemsPerRun: agent.max_items_per_run,
      consecutiveFailures: agent.consecutive_failures,
    },
  };
});

const invalid = conversations.filter((conversation) =>
  !conversation.scheduleEvidence.enabled ||
  conversation.runEvidence.state !== "succeeded" ||
  conversation.runEvidence.succeeded !== 1 ||
  conversation.runEvidence.failed !== 0 ||
  conversation.runEvidence.summary?.modelCalls !== 0 ||
  conversation.runEvidence.summary?.externalActionsExecuted !== 0 ||
  conversation.agentOutput.state !== "pending"
);
if (
  controls.length !== 2 || controls.some((control) => !control.enabled) ||
  agents.length !== 15 || conversations.length !== 15 || invalid.length
) {
  throw new Error("Production evidence did not satisfy the release assertions");
}

const evidence = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  environment: "production",
  site: "https://farmerbook.in",
  workerVersion: "1b42b9b8-373f-4322-a522-84b683abdfa2",
  framework:
    "Cloudflare Agents SDK 0.20.1 with Durable Objects, Supabase/Postgres, " +
    "and deterministic company-policy-v1",
  executionMode: "deterministic aggregate-only proposal generation",
  assertions: {
    releaseControlsEnabled: true,
    agentsEnabled: 15,
    successfulRuns: 15,
    pendingReviewProposals: 15,
    modelCalls: 0,
    externalActionsExecuted: 0,
  },
  controls,
  conversations,
};

const markdown = [
  "# FarmerBook AI company production test transcript",
  "",
  `Generated: ${evidence.generatedAt}`,
  "",
  "This is a deterministic test transcript, not an LLM chat log. Each " +
    "production Agent received aggregate KPIs and produced one pending, " +
    "human-reviewable proposal.",
  "",
  "## Result",
  "",
  "- 15/15 schedules enabled",
  "- 15/15 manual production runs succeeded",
  "- 15 pending review proposals created",
  "- 0 language-model calls",
  "- 0 external actions executed",
  "",
  ...conversations.flatMap((conversation, index) => [
    `## ${index + 1}. ${conversation.displayName}`,
    "",
    `**Operator:** ${conversation.operatorMessage}`,
    "",
    `**Agent context:** ${conversation.agentContext}`,
    "",
    "**Aggregate input:**",
    "",
    "```json",
    JSON.stringify(conversation.aggregateInput, null, 2),
    "```",
    "",
    `**Agent proposal:** ${conversation.agentOutput.title}`,
    "",
    conversation.agentOutput.summary,
    "",
    `Action: \`${conversation.agentOutput.actionKind}\` · ` +
      `Priority: \`${conversation.agentOutput.priority}\` · ` +
      `Risk: \`${conversation.agentOutput.riskLevel}\` · ` +
      `State: \`${conversation.agentOutput.state}\``,
    "",
    "**Evidence used:**",
    "",
    "```json",
    JSON.stringify(conversation.agentOutput.evidence, null, 2),
    "```",
    "",
    `**Run outcome:** \`${conversation.runEvidence.state}\` · ` +
      `${conversation.runEvidence.succeeded} succeeded · ` +
      `${conversation.runEvidence.failed} failed · ` +
      `${conversation.runEvidence.summary.modelCalls} model calls · ` +
      `${conversation.runEvidence.summary.externalActionsExecuted} external actions`,
    "",
  ]),
].join("\n");

const metric = conversations[0].aggregateInput;
const cards = conversations.map((conversation, index) => `
  <article class="agent-card">
    <div class="card-head">
      <span class="number">${index + 1}</span>
      <span class="status">Succeeded</span>
    </div>
    <h2>${escapeHtml(conversation.displayName)}</h2>
    <p class="operator"><strong>Operator test</strong><br>${escapeHtml(conversation.operatorMessage)}</p>
    <p><strong>Agent proposal</strong><br>${escapeHtml(conversation.agentOutput.title)}</p>
    <p>${escapeHtml(conversation.agentOutput.summary)}</p>
    <div class="tags">
      <span>${escapeHtml(conversation.agentOutput.priority)} priority</span>
      <span>${escapeHtml(conversation.agentOutput.riskLevel)} risk</span>
      <span>pending review</span>
    </div>
    <div class="safety">0 model calls · 0 external actions</div>
  </article>
`).join("");

const html = `<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>FarmerBook AI company production test</title>
  <style>
    :root { color-scheme: light; --green:#244b24; --cream:#faf8f1; --rust:#bf6638; --line:#d7d8c8; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--cream); color:#1f291f; font:16px/1.5 Inter,system-ui,sans-serif; }
    header { padding:46px 5vw 34px; background:var(--green); color:white; }
    header p { max-width:900px; color:#e2eadc; }
    h1,h2 { font-family:Georgia,serif; margin:0 0 12px; }
    h1 { font-size:clamp(36px,5vw,66px); line-height:1.02; }
    main { padding:30px 5vw 60px; }
    .summary { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin:-18px 0 32px; }
    .metric { background:white; border:1px solid var(--line); border-radius:16px; padding:18px; box-shadow:0 8px 24px #1d341414; }
    .metric strong { display:block; font-size:28px; color:var(--green); }
    .snapshot { padding:18px 22px; border-left:5px solid var(--rust); background:#fff8ef; margin-bottom:28px; }
    .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
    .agent-card { background:white; border:1px solid var(--line); border-radius:18px; padding:20px; box-shadow:0 8px 24px #1d341410; }
    .card-head { display:flex; justify-content:space-between; align-items:center; }
    .number { width:32px; height:32px; display:grid; place-items:center; border-radius:50%; background:#edf4e8; font-weight:800; }
    .status { background:#e4f5df; color:#1f6b25; border-radius:99px; padding:5px 10px; font-weight:700; font-size:13px; }
    .agent-card h2 { margin-top:14px; font-size:23px; }
    .operator { background:#f4f2ea; border-radius:12px; padding:12px; }
    .tags { display:flex; flex-wrap:wrap; gap:7px; }
    .tags span { border:1px solid var(--line); border-radius:99px; padding:4px 9px; font-size:12px; }
    .safety { margin-top:14px; padding-top:12px; border-top:1px solid var(--line); color:#35623b; font-weight:700; }
    footer { padding:24px 5vw 44px; color:#586258; }
    @media (max-width:900px) { .summary,.grid { grid-template-columns:1fr 1fr; } }
    @media (max-width:600px) { .summary,.grid { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <header>
    <p>PRODUCTION VALIDATION · FARMERBOOK.IN</p>
    <h1>15 AI company Agents tested successfully</h1>
    <p>Every role ran against aggregate production KPIs, created one deterministic proposal for human review, and executed no external action.</p>
  </header>
  <main>
    <section class="summary" aria-label="Test result summary">
      <div class="metric"><strong>15/15</strong>Agents enabled</div>
      <div class="metric"><strong>15/15</strong>Runs succeeded</div>
      <div class="metric"><strong>15</strong>Pending proposals</div>
      <div class="metric"><strong>0</strong>Model calls</div>
      <div class="metric"><strong>0</strong>External actions</div>
    </section>
    <section class="snapshot">
      <strong>Aggregate production snapshot:</strong>
      ${escapeHtml(metric.registeredUsers)} registered users ·
      ${escapeHtml(metric.activatedUsers)} activated users ·
      ${escapeHtml(metric.monthlyActiveUsers)} monthly-active proxy ·
      policy <code>company-policy-v1</code>
    </section>
    <section class="grid" aria-label="Agent test conversations">${cards}</section>
  </main>
  <footer>Generated from live production run, snapshot, proposal and schedule evidence. No profile, contact, message, support text or authentication secret is included.</footer>
</body>
</html>`;

fs.mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
fs.writeFileSync(
  path.join(outputDirectory, "ai-company-production-test-transcript-2026-08-19.json"),
  `${JSON.stringify(evidence, null, 2)}\n`,
  { mode: 0o600 },
);
fs.writeFileSync(
  path.join(outputDirectory, "ai-company-production-test-transcript-2026-08-19.md"),
  `${markdown}\n`,
  { mode: 0o600 },
);
fs.writeFileSync(
  path.join(outputDirectory, "ai-company-production-test-report.html"),
  html,
  { mode: 0o600 },
);

console.log(JSON.stringify(evidence.assertions));
