/** Cloudflare Worker entry point for FarmerBook. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { getAgentByName } from "agents";
import { withSecurityHeaders } from "../lib/security-headers";
import { websiteGreeterRequestSchema } from "../features/website-greeter/contracts";
import type { WebsiteGreetingAgent } from "../features/website-greeter/agent";
import type { LiveActionCoordinatorAgent } from "../features/action-control/coordinator-agent";
import type { LiveActionWorkflowInput } from "../features/action-control/contracts";

export { FarmerProfileAgent } from "../features/profile-agent/managed-agent";
export { AiFleetBudgetAgent } from "../features/ai-budget/agent";
export { WebsiteGreetingAgent } from "../features/website-greeter/agent";
export { BlogWritingAgent } from "../features/blog/agent";
export { BlogPublicationVerifierAgent } from "../features/blog/publication-verifier-agent";
export { OwnedSocialPublisherAgent } from "../features/social-publisher/agent";
export { CompanyOperationsAgent } from "../features/company-agents/agent";
export { LiveActionCoordinatorAgent } from "../features/action-control/coordinator-agent";
export { LiveActionExecutionWorkflow } from "../features/action-control/execution-workflow";
export { FarmerProfileApprovalWorkflow } from "../features/profile-agent/approval-workflow";
export {
  CustomerSupportAgent,
  OperationsSupervisorAgent,
  OutreachGrowthAgent,
  ProfileDraftingAgent,
  SocialContentAgent,
  VerificationTriageAgent,
} from "../features/managed-agents/agents";

interface Env {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  IMAGES?: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
  WEBSITE_GREETING_AGENT: DurableObjectNamespace<WebsiteGreetingAgent>;
  ENABLE_LIVE_AGENT_EXECUTION?: string;
  LIVE_ACTION_COORDINATOR_AGENT?: DurableObjectNamespace<LiveActionCoordinatorAgent>;
  LIVE_ACTION_EXECUTION_WORKFLOW?: Workflow<LiveActionWorkflowInput>;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/website-greeter") {
      const respond = (body: unknown, status = 200) => withSecurityHeaders(
        request,
        Response.json(body, {
          status,
          headers: { "cache-control": "no-store" },
        }),
        env.NEXT_PUBLIC_SUPABASE_URL,
      );
      if (request.method !== "POST") return respond({ code: "METHOD_NOT_ALLOWED" }, 405);
      if (request.headers.get("sec-fetch-site") === "cross-site") {
        return respond({ code: "FORBIDDEN" }, 403);
      }
      const origin = request.headers.get("origin");
      if (origin && origin !== url.origin) return respond({ code: "FORBIDDEN" }, 403);
      const contentLength = Number(request.headers.get("content-length") ?? 0);
      if (contentLength > 2_048) return respond({ code: "PAYLOAD_TOO_LARGE" }, 413);
      const parsed = websiteGreeterRequestSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return respond({ code: "INVALID_INPUT" }, 400);
      try {
        const agent = await getAgentByName(
          env.WEBSITE_GREETING_AGENT,
          "farmerbook-website-greeting",
        );
        return respond(await agent.reply(parsed.data));
      } catch {
        return respond({ code: "GREETER_UNAVAILABLE" }, 503);
      }
    }

    if (url.pathname === "/_vinext/image") {
      if (!env.IMAGES) {
        return withSecurityHeaders(
          request,
          new Response("Image optimization is not configured.", { status: 503 }),
          env.NEXT_PUBLIC_SUPABASE_URL,
        );
      }
      const images = env.IMAGES;
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await images.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return withSecurityHeaders(request, response, env.NEXT_PUBLIC_SUPABASE_URL);
    }

    const response = await handler.fetch(request, env, ctx);
    return withSecurityHeaders(request, response, env.NEXT_PUBLIC_SUPABASE_URL);
  },
};

export default worker;
