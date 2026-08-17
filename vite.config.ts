import vinext from "vinext";
import agents from "agents/vite";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json" with { type: "json" };
import { sites } from "./build/sites-vite-plugin.ts";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

const configuredCustomDomains = (
  process.env.FARMERBOOK_CUSTOM_DOMAINS ?? ""
)
  .split(",")
  .map((domain) => domain.trim())
  .filter(Boolean);

const publicWorkerVars: Record<string, string> = {};
for (const [name, value] of Object.entries({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  ENABLE_CANONICAL_AGRICULTURE_TAXONOMY:
    process.env.ENABLE_CANONICAL_AGRICULTURE_TAXONOMY,
  ENABLE_RESUMABLE_ONBOARDING: process.env.ENABLE_RESUMABLE_ONBOARDING,
  ENABLE_AGRI_BUSINESSES: process.env.ENABLE_AGRI_BUSINESSES,
  ENABLE_BUSINESS_OFFERS: process.env.ENABLE_BUSINESS_OFFERS,
  ENABLE_EXTENDED_LOCALES: process.env.ENABLE_EXTENDED_LOCALES,
  ENABLE_OUTREACH_AGENT: process.env.ENABLE_OUTREACH_AGENT,
  ENABLE_PROFILE_RESEARCH_AGENT:
    process.env.ENABLE_PROFILE_RESEARCH_AGENT,
  ENABLE_MANAGED_OPERATIONS_AGENTS:
    process.env.ENABLE_MANAGED_OPERATIONS_AGENTS,
  ENABLE_SUPPORT_SOCIAL_PILOT:
    process.env.ENABLE_SUPPORT_SOCIAL_PILOT,
  ENABLE_FEATURED_FARMER_PROFILES:
    process.env.ENABLE_FEATURED_FARMER_PROFILES,
  ENABLE_PRIVATE_FARMER_CONTACTS:
    process.env.ENABLE_PRIVATE_FARMER_CONTACTS,
  ENABLE_SOURCED_FARMER_RESEARCH:
    process.env.ENABLE_SOURCED_FARMER_RESEARCH,
  BRAVE_SEARCH_STORAGE_RIGHTS_CONFIRMED:
    process.env.BRAVE_SEARCH_STORAGE_RIGHTS_CONFIRMED,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY:
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  WEBSITE_GREETER_MODEL: process.env.WEBSITE_GREETER_MODEL,
  WEBSITE_GREETER_MONTHLY_REPLY_LIMIT:
    process.env.WEBSITE_GREETER_MONTHLY_REPLY_LIMIT,
  WEBSITE_GREETER_DAILY_AI_REPLY_LIMIT:
    process.env.WEBSITE_GREETER_DAILY_AI_REPLY_LIMIT,
  WEBSITE_GREETER_MONTHLY_BUDGET_USD:
    process.env.WEBSITE_GREETER_MONTHLY_BUDGET_USD,
})) {
  if (value) publicWorkerVars[name] = value;
}

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_date:
    process.env.FARMERBOOK_COMPATIBILITY_DATE ?? "2026-08-11",
  compatibility_flags: ["nodejs_compat"],
  workers_dev: true,
  routes: configuredCustomDomains.map((pattern) => ({
    pattern,
    custom_domain: true,
  })),
  vars: publicWorkerVars,
  ai: { binding: "AI" },
  ...(process.env.ENABLE_OUTREACH_AGENT?.toLowerCase() === "true"
    ? { images: { binding: "IMAGES" } }
    : {}),
  durable_objects: {
    bindings: [
      {
        name: "FARMER_PROFILE_AGENT",
        class_name: "FarmerProfileAgent",
      },
      {
        name: "OUTREACH_GROWTH_AGENT",
        class_name: "OutreachGrowthAgent",
      },
      {
        name: "PROFILE_DRAFTING_AGENT",
        class_name: "ProfileDraftingAgent",
      },
      {
        name: "VERIFICATION_TRIAGE_AGENT",
        class_name: "VerificationTriageAgent",
      },
      {
        name: "OPERATIONS_SUPERVISOR_AGENT",
        class_name: "OperationsSupervisorAgent",
      },
      {
        name: "CUSTOMER_SUPPORT_AGENT",
        class_name: "CustomerSupportAgent",
      },
      {
        name: "SOCIAL_CONTENT_AGENT",
        class_name: "SocialContentAgent",
      },
      {
        name: "WEBSITE_GREETING_AGENT",
        class_name: "WebsiteGreetingAgent",
      },
    ],
  },
  migrations: [
    {
      tag: "farmer-profile-agent-v1",
      new_sqlite_classes: ["FarmerProfileAgent"],
    },
    {
      tag: "managed-operations-agents-v1",
      new_sqlite_classes: [
        "OutreachGrowthAgent",
        "ProfileDraftingAgent",
        "VerificationTriageAgent",
        "OperationsSupervisorAgent",
      ],
    },
    {
      tag: "support-social-agents-v1",
      new_sqlite_classes: [
        "CustomerSupportAgent",
        "SocialContentAgent",
      ],
    },
    {
      tag: "website-greeting-agent-v1",
      new_sqlite_classes: ["WebsiteGreetingAgent"],
    },
  ],
  workflows: [
    {
      name: "farmer-profile-approval",
      binding: "FARMER_PROFILE_APPROVAL_WORKFLOW",
      class_name: "FarmerProfileApprovalWorkflow",
    },
  ],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      agents(),
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
