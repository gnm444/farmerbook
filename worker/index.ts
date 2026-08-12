/** Cloudflare Worker entry point for FarmerBook. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { withSecurityHeaders } from "../lib/security-headers";

export { FarmerProfileAgent } from "../features/profile-agent/managed-agent";
export { FarmerProfileApprovalWorkflow } from "../features/profile-agent/approval-workflow";
export {
  OperationsSupervisorAgent,
  OutreachGrowthAgent,
  ProfileDraftingAgent,
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
