import type { FarmerProfileAgent } from "@/features/profile-agent/managed-agent";
import type { AiFleetBudgetAgent } from "@/features/ai-budget/agent";
import type {
  CustomerSupportAgent,
  OperationsSupervisorAgent,
  OutreachGrowthAgent,
  ProfileDraftingAgent,
  SocialContentAgent,
  VerificationTriageAgent,
} from "@/features/managed-agents/agents";
import type { WebsiteGreetingAgent } from "@/features/website-greeter/agent";
import type { BlogWritingAgent } from "@/features/blog/agent";
import type { BlogPublicationVerifierAgent } from "@/features/blog/publication-verifier-agent";
import type { OwnedSocialPublisherAgent } from "@/features/social-publisher/agent";
import type { CompanyOperationsAgent } from "@/features/company-agents/agent";
import type { LiveActionCoordinatorAgent } from "@/features/action-control/coordinator-agent";
import type { LiveActionWorkflowInput } from "@/features/action-control/contracts";

export interface WorkersAiBinding {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

export interface ImagesBinding {
  input(stream: ReadableStream): {
    transform(options: Record<string, unknown>): {
      output(options: {
        format: string;
        quality?: number;
      }): Promise<{ response(): Response }>;
    };
  };
}

export type FarmerBookBindings = {
  NEXT_PUBLIC_SITE_URL?: string;
  MANAGED_AGENT_PROCESSOR_SECRET?: string;
  AI?: WorkersAiBinding;
  IMAGES?: ImagesBinding;
  AI_FLEET_BUDGET_AGENT?: DurableObjectNamespace<AiFleetBudgetAgent>;
  FARMER_PROFILE_AGENT?: DurableObjectNamespace<FarmerProfileAgent>;
  OUTREACH_GROWTH_AGENT?: DurableObjectNamespace<OutreachGrowthAgent>;
  PROFILE_DRAFTING_AGENT?: DurableObjectNamespace<ProfileDraftingAgent>;
  VERIFICATION_TRIAGE_AGENT?: DurableObjectNamespace<VerificationTriageAgent>;
  CUSTOMER_SUPPORT_AGENT?: DurableObjectNamespace<CustomerSupportAgent>;
  SOCIAL_CONTENT_AGENT?: DurableObjectNamespace<SocialContentAgent>;
  OPERATIONS_SUPERVISOR_AGENT?: DurableObjectNamespace<OperationsSupervisorAgent>;
  WEBSITE_GREETING_AGENT?: DurableObjectNamespace<WebsiteGreetingAgent>;
  BLOG_WRITING_AGENT?: DurableObjectNamespace<BlogWritingAgent>;
  BLOG_PUBLICATION_VERIFIER_AGENT?: DurableObjectNamespace<BlogPublicationVerifierAgent>;
  BLOG_AUTONOMOUS_PUBLISHING?: string;
  OWNED_SOCIAL_PUBLISHER_AGENT?: DurableObjectNamespace<OwnedSocialPublisherAgent>;
  OWNED_SOCIAL_PUBLISHING?: string;
  OWNED_SOCIAL_FACEBOOK_ENABLED?: string;
  OWNED_SOCIAL_INSTAGRAM_ENABLED?: string;
  OWNED_SOCIAL_INSTAGRAM_MEDIA_READY?: string;
  OWNED_SOCIAL_CONNECTOR?: Fetcher;
  COMPANY_OPERATIONS_AGENT?: DurableObjectNamespace<CompanyOperationsAgent>;
  LIVE_ACTION_COORDINATOR_AGENT?: DurableObjectNamespace<LiveActionCoordinatorAgent>;
  LIVE_ACTION_EXECUTION_WORKFLOW?: Workflow<LiveActionWorkflowInput>;
};

export async function getCloudflareBindings(): Promise<FarmerBookBindings | null> {
  try {
    const runtime = await import("cloudflare:workers");
    return runtime.env as unknown as FarmerBookBindings;
  } catch {
    return null;
  }
}
