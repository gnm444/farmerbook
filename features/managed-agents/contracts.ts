import { z } from "zod";

export const SPECIALIZED_AGENT_ROLES = [
  "outreach_growth",
  "profile_drafting",
  "verification_triage",
  "customer_support",
  "social_content",
  "operations_supervisor",
] as const;

export const COMPANY_AGENT_ROLES = [
  "executive_strategy",
  "operations_coordinator",
  "data_experimentation",
  "governance_risk",
  "independent_auditor",
  "growth_strategy",
  "farmer_acquisition",
  "buyer_acquisition",
  "farmer_onboarding",
  "marketplace_matching",
  "seo_editorial",
  "product_management",
  "engineering_planning",
  "qa_reliability",
  "support_trust",
] as const;

export const MANAGED_AGENT_ROLES = [
  ...SPECIALIZED_AGENT_ROLES,
  ...COMPANY_AGENT_ROLES,
] as const;

export const managedAgentRoleSchema = z.enum(MANAGED_AGENT_ROLES);

export type ManagedAgentRole = z.infer<typeof managedAgentRoleSchema>;
export type CompanyAgentRole = (typeof COMPANY_AGENT_ROLES)[number];

const companyAgentRoleSet = new Set<string>(COMPANY_AGENT_ROLES);

export function isCompanyAgentRole(
  role: ManagedAgentRole,
): role is CompanyAgentRole {
  return companyAgentRoleSet.has(role);
}

export const managedAgentTriggerSchema = z.enum(["scheduled", "manual"]);
export type ManagedAgentTrigger = z.infer<typeof managedAgentTriggerSchema>;

export const managedAgentConfigurationSchema = z.object({
  role: managedAgentRoleSchema,
  enabled: z.boolean(),
  intervalSeconds: z.number().int().min(300).max(604_800),
  maxItemsPerRun: z.number().int().min(1).max(25),
});

export const managedAgentCommandSchema = z.object({
  role: managedAgentRoleSchema,
  operation: z.enum(["resume", "pause", "run_now"]),
  intervalSeconds: z.number().int().min(300).max(604_800).optional(),
  maxItemsPerRun: z.number().int().min(1).max(25).optional(),
  reason: z.string().trim().min(5).max(500),
  idempotencyKey: z.uuid(),
});

export const managedAgentRunRequestSchema = z.object({
  role: managedAgentRoleSchema,
  instanceName: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{2,120}$/),
  trigger: managedAgentTriggerSchema,
  maxItems: z.number().int().min(1).max(25),
  idempotencyKey: z.uuid(),
});

export const managedAgentRunResultSchema = z.object({
  code: z.enum([
    "SUCCEEDED",
    "PARTIAL",
    "SKIPPED",
    "FEATURE_DISABLED",
    "NOT_CONFIGURED",
  ]),
  runId: z.uuid().nullable().optional(),
  claimed: z.number().int().nonnegative(),
  succeeded: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  summary: z.record(z.string(), z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
  ])).default({}),
});

export type ManagedAgentRunResult = z.infer<
  typeof managedAgentRunResultSchema
>;

export type ManagedAgentState = {
  role: ManagedAgentRole;
  enabled: boolean;
  status: "idle" | "running" | "healthy" | "degraded" | "paused";
  intervalSeconds: number;
  maxItemsPerRun: number;
  scheduleId: string | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastFailureCode: string | null;
  consecutiveFailures: number;
  updatedAt: string;
};

export type ManagedAgentDefinition = {
  role: ManagedAgentRole;
  division: "company" | "specialized_operations";
  displayName: string;
  description: string;
  defaultIntervalSeconds: number;
  defaultMaxItemsPerRun: number;
  boundary: string;
};

export const MANAGED_AGENT_DEFINITIONS: readonly ManagedAgentDefinition[] = [
  {
    role: "outreach_growth",
    division: "specialized_operations",
    displayName: "Growth & Outreach",
    description:
      "Processes consented introductions, provider confirmations, replies and one bounded onboarding follow-up.",
    defaultIntervalSeconds: 900,
    defaultMaxItemsPerRun: 10,
    boundary:
      "Cannot discover or message a person without an approved source, provider and purpose-matched consent.",
  },
  {
    role: "profile_drafting",
    division: "specialized_operations",
    displayName: "Farmer Profile Drafting",
    description:
      "Builds private, citation-backed profile previews for eligible consented Farmers.",
    defaultIntervalSeconds: 3_600,
    defaultMaxItemsPerRun: 5,
    boundary:
      "Every preview stays private, unclaimed and Not verified until the invitation holder approves and claims it.",
  },
  {
    role: "verification_triage",
    division: "specialized_operations",
    displayName: "Verification Triage",
    description:
      "Routes pending evidence to deterministic provider confirmation or authorized review.",
    defaultIntervalSeconds: 21_600,
    defaultMaxItemsPerRun: 10,
    boundary:
      "Produces a recommendation only; it cannot set a verification claim to verified or issue a badge.",
  },
  {
    role: "customer_support",
    division: "specialized_operations",
    displayName: "Customer Support Drafting",
    description:
      "Creates private reply proposals for authenticated FarmerBook support cases.",
    defaultIntervalSeconds: 300,
    defaultMaxItemsPerRun: 10,
    boundary:
      "Cannot approve, reveal or send a reply; every proposal requires an administrator decision and high-risk questions stay escalated.",
  },
  {
    role: "social_content",
    division: "specialized_operations",
    displayName: "Social Content Drafting",
    description:
      "Creates owned-channel social drafts from administrator-authored campaign briefs.",
    defaultIntervalSeconds: 3_600,
    defaultMaxItemsPerRun: 5,
    boundary:
      "Cannot contact a person or publish to a network; approval makes content copy-ready for a human operator only.",
  },
  {
    role: "operations_supervisor",
    division: "specialized_operations",
    displayName: "Operations Supervisor",
    description:
      "Records fleet health, detects stalled work and keeps repeated failures fail-closed.",
    defaultIntervalSeconds: 86_400,
    defaultMaxItemsPerRun: 25,
    boundary:
      "Can observe and pause unhealthy roles but cannot send outreach, publish profiles or award trust labels.",
  },
  {
    role: "executive_strategy",
    division: "company",
    displayName: "Executive Strategy",
    description:
      "Measures progress against the approved six-month objectives and proposes the next company-wide focus.",
    defaultIntervalSeconds: 86_400,
    defaultMaxItemsPerRun: 1,
    boundary:
      "Can propose priorities from aggregate metrics but cannot spend, deploy, publish, message, contract or execute a proposal.",
  },
  {
    role: "operations_coordinator",
    division: "company",
    displayName: "Operations Coordinator",
    description:
      "Finds blocked work, unhealthy managed runs and proposal-review bottlenecks across the fleet.",
    defaultIntervalSeconds: 21_600,
    defaultMaxItemsPerRun: 1,
    boundary:
      "Can coordinate the operating backlog but cannot bypass a release gate, approval, pause, consent check or role boundary.",
  },
  {
    role: "data_experimentation",
    division: "company",
    displayName: "Data & Experimentation",
    description:
      "Audits aggregate funnel signals, measurement coverage and experiment-readiness without reading personal content.",
    defaultIntervalSeconds: 86_400,
    defaultMaxItemsPerRun: 1,
    boundary:
      "Receives aggregate counters only and cannot access raw profiles, contacts, messages, support text or experiment on a user.",
  },
  {
    role: "governance_risk",
    division: "company",
    displayName: "Governance & Risk",
    description:
      "Surfaces pending trust work and high-risk proposals for an accountable administrator.",
    defaultIntervalSeconds: 86_400,
    defaultMaxItemsPerRun: 1,
    boundary:
      "Can recommend review or pause but cannot make legal decisions, verify a claim, suspend an account or disclose personal data.",
  },
  {
    role: "independent_auditor",
    division: "company",
    displayName: "Independent Agent Auditor",
    description:
      "Independently checks fleet failures, pending high-risk work and control-plane anomalies.",
    defaultIntervalSeconds: 21_600,
    defaultMaxItemsPerRun: 1,
    boundary:
      "Reports directly through immutable evidence and cannot approve its own proposal or execute another role's action.",
  },
  {
    role: "growth_strategy",
    division: "company",
    displayName: "Growth Strategy",
    description:
      "Compares acquisition and activation pace with the 100,000-user objective and proposes one bounded growth focus.",
    defaultIntervalSeconds: 86_400,
    defaultMaxItemsPerRun: 1,
    boundary:
      "Cannot buy advertising, start outreach, import contacts, change a budget or treat a public contact as consent.",
  },
  {
    role: "farmer_acquisition",
    division: "company",
    displayName: "Farmer Acquisition",
    description:
      "Monitors aggregate Farmer acquisition and activation gaps and proposes permission-based acquisition work.",
    defaultIntervalSeconds: 86_400,
    defaultMaxItemsPerRun: 1,
    boundary:
      "Cannot scrape, create an unclaimed public profile, infer consent, send an invitation or contact a Farmer.",
  },
  {
    role: "buyer_acquisition",
    division: "company",
    displayName: "Buyer & Wholesaler Acquisition",
    description:
      "Monitors aggregate demand-side participation and marketplace enquiry creation.",
    defaultIntervalSeconds: 86_400,
    defaultMaxItemsPerRun: 1,
    boundary:
      "Cannot contact a buyer, reveal enquiry details, promise supply, quote a price or create a commercial commitment.",
  },
  {
    role: "farmer_onboarding",
    division: "company",
    displayName: "Farmer Onboarding",
    description:
      "Finds the aggregate onboarding-completion gap and proposes improvements to the farmer activation journey.",
    defaultIntervalSeconds: 21_600,
    defaultMaxItemsPerRun: 1,
    boundary:
      "Cannot alter a profile, claim certification, publish a listing or send an onboarding message without the existing consent path.",
  },
  {
    role: "marketplace_matching",
    division: "company",
    displayName: "Marketplace Matching",
    description:
      "Measures marketplace liquidity and proposes ways to reduce active listings without enquiries.",
    defaultIntervalSeconds: 3_600,
    defaultMaxItemsPerRun: 1,
    boundary:
      "Uses aggregate counters only and cannot expose buyer details, place an order, negotiate terms or represent a match as confirmed.",
  },
  {
    role: "seo_editorial",
    division: "company",
    displayName: "SEO & Editorial",
    description:
      "Uses aggregate supply and community signals to propose one source-bounded discoverability priority.",
    defaultIntervalSeconds: 86_400,
    defaultMaxItemsPerRun: 1,
    boundary:
      "Cannot publish, invent agriculture claims, copy third-party media or change a reviewed article without editorial approval.",
  },
  {
    role: "product_management",
    division: "company",
    displayName: "Product Management",
    description:
      "Identifies the largest aggregate funnel or marketplace constraint and proposes a product outcome to investigate.",
    defaultIntervalSeconds: 86_400,
    defaultMaxItemsPerRun: 1,
    boundary:
      "Can propose backlog outcomes but cannot change the roadmap, deploy code, run an unsafe experiment or promise delivery.",
  },
  {
    role: "engineering_planning",
    division: "company",
    displayName: "Engineering Planning",
    description:
      "Converts aggregate reliability and support pressure into a bounded engineering investigation proposal.",
    defaultIntervalSeconds: 86_400,
    defaultMaxItemsPerRun: 1,
    boundary:
      "Cannot write to production, rotate secrets, change infrastructure, merge code or deploy a release.",
  },
  {
    role: "qa_reliability",
    division: "company",
    displayName: "QA & Reliability",
    description:
      "Surfaces managed-run failures and technical-support pressure for test and reliability follow-up.",
    defaultIntervalSeconds: 21_600,
    defaultMaxItemsPerRun: 1,
    boundary:
      "Cannot suppress an incident, declare a release safe, change monitoring or bypass required test and rollout gates.",
  },
  {
    role: "support_trust",
    division: "company",
    displayName: "Support & Trust",
    description:
      "Monitors aggregate open support and moderation demand and proposes a human-review priority.",
    defaultIntervalSeconds: 3_600,
    defaultMaxItemsPerRun: 1,
    boundary:
      "Cannot read case bodies, send replies, moderate content, suspend an account, decide a dispute or grant verification.",
  },
] as const;

export function managedAgentDefinition(role: ManagedAgentRole) {
  const definition = MANAGED_AGENT_DEFINITIONS.find(
    (candidate) => candidate.role === role,
  );
  if (!definition) throw new Error("UNKNOWN_MANAGED_AGENT_ROLE");
  return definition;
}

export function initialManagedAgentState(
  role: ManagedAgentRole,
): ManagedAgentState {
  const definition = managedAgentDefinition(role);
  return {
    role,
    enabled: false,
    status: "paused",
    intervalSeconds: definition.defaultIntervalSeconds,
    maxItemsPerRun: definition.defaultMaxItemsPerRun,
    scheduleId: null,
    lastRunAt: null,
    lastSuccessAt: null,
    lastFailureCode: null,
    consecutiveFailures: 0,
    updatedAt: new Date(0).toISOString(),
  };
}
