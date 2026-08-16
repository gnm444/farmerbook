import { z } from "zod";

export const managedAgentRoleSchema = z.enum([
  "outreach_growth",
  "profile_drafting",
  "verification_triage",
  "customer_support",
  "social_content",
  "operations_supervisor",
]);

export type ManagedAgentRole = z.infer<typeof managedAgentRoleSchema>;

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
  displayName: string;
  description: string;
  defaultIntervalSeconds: number;
  defaultMaxItemsPerRun: number;
  boundary: string;
};

export const MANAGED_AGENT_DEFINITIONS: readonly ManagedAgentDefinition[] = [
  {
    role: "outreach_growth",
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
    displayName: "Operations Supervisor",
    description:
      "Records fleet health, detects stalled work and keeps repeated failures fail-closed.",
    defaultIntervalSeconds: 86_400,
    defaultMaxItemsPerRun: 25,
    boundary:
      "Can observe and pause unhealthy roles but cannot send outreach, publish profiles or award trust labels.",
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
