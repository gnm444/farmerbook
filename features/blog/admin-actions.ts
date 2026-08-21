"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/features/auth/require-admin";
import { getSiteUrl } from "@/lib/env";
import { blogPublicationFingerprint } from "./autonomous-publication-policy";
import {
  blogDraftReplacementSchema,
  blogDraftReviewSchema,
  blogPublicationSchema,
  blogScheduleControlSchema,
  type BlogPublication,
} from "./contracts";
import { blogWritingAgentStub } from "./runtime";
import { socialChannelControlSchema } from "@/features/social-publisher/contracts";
import { ownedSocialPublisherStub } from "@/features/social-publisher/runtime";

async function verifyPublishedRoute(
  id: string,
  publication: BlogPublication,
  verifierId: string,
) {
  const agent = await blogWritingAgentStub();
  if (!agent) return { status: "failed" as const, code: "BLOG_AGENT_UNAVAILABLE" };
  let status: "verified" | "failed" = "failed";
  let code = "PUBLICATION_ROUTE_FETCH_FAILED";
  const expectedContentSha256 = await blogPublicationFingerprint(publication);
  try {
    const url = new URL(`/blog/${publication.slug}`, getSiteUrl());
    url.searchParams.set("verify", Date.now().toString());
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
    });
    const body = await response.text();
    if (!response.ok) {
      code = `PUBLICATION_ROUTE_HTTP_${response.status}`;
    } else if (!body.includes(
      `data-publication-sha256="${expectedContentSha256}"`,
    )) {
      code = "PUBLICATION_ROUTE_CONTENT_MISMATCH";
    } else {
      status = "verified";
      code = "PUBLICATION_ROUTE_VERIFIED";
    }
  } catch {
    code = "PUBLICATION_ROUTE_FETCH_FAILED";
  }
  await agent.recordPublicationVerification({
    id,
    verifierId,
    status,
    code,
    expectedContentSha256,
  });
  return { status, code };
}

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
      ok: result.code === "DRAFT_CREATED"
        || result.code === "AUTO_PUBLISHED_PROVISIONAL"
        || result.code === "ALREADY_PREPARED",
      message: result.code === "AUTO_PUBLISHED_PROVISIONAL"
        ? "Today's low-risk article was published provisionally and queued for independent verification."
        : result.code === "AUTO_SKIPPED"
          ? "Today's draft failed the standing policy and was kept private; no approval is required."
          : result.code === "DRAFT_CREATED"
            ? "Today's evidence-bounded draft is ready for review."
        : result.code === "ALREADY_PREPARED"
          ? "Today's draft already exists; no second inference was used."
          : result.code === "ALREADY_ATTEMPTED"
            ? "Today's run already ended or failed; it will not be retried with new AI spend."
            : result.code === "SOURCE_MANIFEST_STALE"
              ? "Today's run was skipped because a reviewed source is stale."
              : result.code === "AGENT_PAUSED"
                ? "The daily Blog Writing Agent is paused."
                : "The monthly 31-run drafting limit has been reached.",
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return {
      ok: false as const,
      message: code.includes("BUDGET")
        ? "The Blog Writing Agent reached its monthly $2 AI cap."
        : "Draft preparation failed closed; no article was published.",
    };
  }
}

export async function reviewBlogDraftAction(rawInput: unknown) {
  const administrator = await requireAdmin();
  const publicInput = z.object({
    id: z.string().uuid(),
    decision: z.enum(["publish", "reject"]),
    expectedRevision: z.number().int().min(1),
    reason: z.string().trim().min(10).max(1_000),
    qualityOutcome: z.enum([
      "approved",
      "light_edits",
      "heavy_edits",
      "rejected",
    ]),
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
    if (result.code === "PUBLISHED") {
      revalidatePath(`/blog/${result.publication.slug}`);
      const verification = await verifyPublishedRoute(
        publicInput.data.id,
        result.publication,
        administrator.id,
      );
      return {
        ok: true as const,
        message: verification.status === "verified"
          ? "The reviewed draft is published and its public route is verified."
          : "The draft was published, but route verification failed and daily drafting was paused.",
      };
    }
    return {
      ok: true as const,
      message: result.code === "REJECTED"
          ? "The draft was rejected and will not be published."
          : "This draft already has a review decision.",
    };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error && error.message.includes("REVISION_CONFLICT")
        ? "The draft changed before review. Reload and review the latest revision."
        : "The review decision could not be recorded.",
    };
  }
}

export async function replaceBlogDraftAction(rawInput: unknown) {
  const administrator = await requireAdmin();
  const publicInput = z.object({
    id: z.string().uuid(),
    expectedRevision: z.number().int().min(1),
    publicationJson: z.string().trim().min(2).max(100_000),
  }).safeParse(rawInput);
  if (!publicInput.success) {
    return { ok: false as const, message: "Provide a valid draft revision." };
  }
  let publication: BlogPublication;
  try {
    publication = blogPublicationSchema.parse(
      JSON.parse(publicInput.data.publicationJson),
    );
  } catch {
    return { ok: false as const, message: "The replacement must be valid publication JSON." };
  }
  const agent = await blogWritingAgentStub();
  if (!agent) {
    return { ok: false as const, message: "The Cloudflare Blog Writing Agent is unavailable." };
  }
  try {
    const input = blogDraftReplacementSchema.parse({
      id: publicInput.data.id,
      expectedRevision: publicInput.data.expectedRevision,
      editorId: administrator.id,
      publication,
    });
    const result = await agent.replaceDraft(input);
    revalidatePath("/admin/blog");
    return {
      ok: true as const,
      message: `The reviewed replacement is saved as revision ${result.revision}. Reload before publishing.`,
    };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error && error.message.includes("REVISION_CONFLICT")
        ? "The draft changed before replacement. Reload and edit the latest revision."
        : "The reviewed replacement could not be saved.",
    };
  }
}

export async function controlDailyBlogScheduleAction(rawInput: unknown) {
  const administrator = await requireAdmin();
  const publicInput = z.object({
    operation: z.enum(["pause", "resume"]),
    reason: z.string().trim().min(10).max(500),
  }).safeParse(rawInput);
  if (!publicInput.success) {
    return { ok: false as const, message: "Add a reason of at least 10 characters." };
  }
  const agent = await blogWritingAgentStub();
  if (!agent) {
    return { ok: false as const, message: "The Cloudflare Blog Writing Agent is unavailable." };
  }
  const input = blogScheduleControlSchema.parse({
    operatorId: administrator.id,
    reason: publicInput.data.reason,
  });
  try {
    if (publicInput.data.operation === "pause") {
      await agent.pauseDailySchedule(input);
    } else {
      await agent.resumeDailySchedule(input);
    }
    revalidatePath("/admin/blog");
    return {
      ok: true as const,
      message: publicInput.data.operation === "pause"
        ? "Daily drafting and autonomous publication are paused; existing evidence was retained."
        : "Exactly one daily standing-policy schedule is active at 09:00 IST.",
    };
  } catch {
    return { ok: false as const, message: "The schedule control could not be changed." };
  }
}

export async function verifyBlogPublicationAction(rawInput: unknown) {
  const administrator = await requireAdmin();
  const input = z.object({ id: z.string().uuid() }).safeParse(rawInput);
  if (!input.success) {
    return { ok: false as const, message: "Choose a valid publication." };
  }
  const agent = await blogWritingAgentStub();
  if (!agent) {
    return { ok: false as const, message: "The Cloudflare Blog Writing Agent is unavailable." };
  }
  const draft = (await agent.listDrafts(40)).find((item) => item.id === input.data.id);
  if (!draft || draft.status !== "published") {
    return { ok: false as const, message: "The publication could not be found." };
  }
  const verification = await verifyPublishedRoute(
    draft.id,
    draft.content,
    administrator.id,
  );
  revalidatePath("/admin/blog");
  return {
    ok: verification.status === "verified",
    message: verification.status === "verified"
      ? "The public article route is verified."
      : "Route verification failed and daily drafting remains paused.",
  };
}

export async function controlOwnedSocialChannelAction(rawInput: unknown) {
  const administrator = await requireAdmin();
  const publicInput = z.object({
    channel: z.enum(["facebook", "instagram"]),
    paused: z.boolean(),
    reason: z.string().trim().min(10).max(500),
  }).safeParse(rawInput);
  if (!publicInput.success) {
    return { ok: false as const, message: "Add a valid channel-control reason." };
  }
  const agent = await ownedSocialPublisherStub();
  if (!agent) {
    return { ok: false as const, message: "The owned-social publisher is unavailable." };
  }
  try {
    const input = socialChannelControlSchema.parse({
      ...publicInput.data,
      operatorId: administrator.id,
    });
    const result = await agent.controlChannel(input);
    revalidatePath("/admin/blog");
    return {
      ok: true as const,
      message: result.code === "CHANNEL_PAUSED"
        ? `${result.channel} publishing is paused.`
        : `${result.channel} publishing is enabled under the standing policy.`,
    };
  } catch {
    return {
      ok: false as const,
      message:
        "This channel cannot be enabled until its official connector and credentials are verified.",
    };
  }
}
