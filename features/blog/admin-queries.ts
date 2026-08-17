import { requireAdmin } from "@/features/auth/require-admin";
import type { BlogAgentDraft, BlogWritingAgentStatus } from "./contracts";
import { blogWritingAgentStub } from "./runtime";

export type BlogAgentDesk = {
  configured: boolean;
  drafts: BlogAgentDraft[];
  status: BlogWritingAgentStatus | null;
};

export async function loadBlogAgentDesk(): Promise<BlogAgentDesk> {
  await requireAdmin();
  const agent = await blogWritingAgentStub();
  if (!agent) return { configured: false, drafts: [], status: null };
  try {
    const [drafts, status] = await Promise.all([
      agent.listDrafts(30),
      agent.status(),
    ]);
    return { configured: true, drafts, status };
  } catch {
    return { configured: false, drafts: [], status: null };
  }
}
