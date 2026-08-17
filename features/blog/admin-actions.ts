"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/auth/require-admin";
import { blogDraftReviewSchema } from "./contracts";
import { blogWritingAgentStub } from "./runtime";

export async function prepareBlogDraftAction() {
  await requireAdmin();
  const agent = await blogWritingAgentStub();
  if (!agent) {
    return { ok: false as const, message: "The Cloudflare Blog Writing Agent is unavailable." };
  }
  try {
    const result = await agent.prepareDraftNow();
    revalidatePath("/admin/blog");
    return {
      ok: true as const,
      message: result.code === "DRAFT_CREATED"
        ? "A new evidence-bounded draft is ready for review."
        : "This editorial run has already prepared a draft.",
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return {
      ok: false as const,
      message: code.includes("BUDGET")
        ? "The Blog Writing Agent reached its monthly $4 AI cap."
        : "Draft preparation failed closed; no article was published.",
    };
  }
}

export async function reviewBlogDraftAction(rawInput: unknown) {
  const administrator = await requireAdmin();
  const publicInput = z.object({
    id: z.string().uuid(),
    decision: z.enum(["publish", "reject"]),
  }).safeParse(rawInput);
  if (!publicInput.success) {
    return { ok: false as const, message: "Choose a valid draft decision." };
  }
  const input = blogDraftReviewSchema.parse({
    ...publicInput.data,
    reviewerId: administrator.id,
  });
  const agent = await blogWritingAgentStub();
  if (!agent) {
    return { ok: false as const, message: "The Cloudflare Blog Writing Agent is unavailable." };
  }
  try {
    const result = await agent.reviewDraft(input);
    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    return {
      ok: true as const,
      message: result.code === "PUBLISHED"
        ? "The reviewed draft is now published."
        : result.code === "REJECTED"
          ? "The draft was rejected and will not be published."
          : "This draft already has a review decision.",
    };
  } catch {
    return { ok: false as const, message: "The review decision could not be recorded." };
  }
}
