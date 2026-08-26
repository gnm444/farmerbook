import { requireAdmin } from "@/features/auth/require-admin";
import type { BlogAgentDraft, BlogWritingAgentStatus } from "./contracts";
import { blogWritingAgentStub } from "./runtime";
import { ownedSocialPublisherStub } from "@/features/social-publisher/runtime";
import type { OwnedSocialPublisherStatus } from "@/features/social-publisher/contracts";

export type BlogAgentDesk = {
  configured: boolean;
  drafts: BlogAgentDraft[];
  status: BlogWritingAgentStatus | null;
  socialStatus: OwnedSocialPublisherStatus | null;
};

export async function loadBlogAgentDesk(): Promise<BlogAgentDesk> {
  await requireAdmin();
  const [agent, socialAgent] = await Promise.all([
    blogWritingAgentStub(),
    ownedSocialPublisherStub(),
  ]);
  if (!agent) {
    return { configured: false, drafts: [], status: null, socialStatus: null };
  }
  try {
    const [drafts, status, socialStatus] = await Promise.all([
      agent.listDrafts(30),
      agent.status(),
      socialAgent?.status().catch(() => null) ?? Promise.resolve(null),
    ]);
    return { configured: true, drafts, status, socialStatus };
  } catch {
    return { configured: false, drafts: [], status: null, socialStatus: null };
  }
}
