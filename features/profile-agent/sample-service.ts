import { revalidatePath } from "next/cache";
import { z } from "zod";
import { outreachFailure } from "@/features/outreach/action-result";
import { sha256, uuidFromText } from "@/features/outreach/crypto";
import { getCloudflareBindings } from "@/lib/cloudflare-bindings";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FarmerProfileAgent } from "./managed-agent";
import type { ManagedProfileAgentInput } from "./schemas";

const savedSampleSchema = z.object({
  code: z.enum(["CREATED", "IDEMPOTENT_REPLAY"]),
  sample_id: z.uuid(),
  revision: z.number().int().nonnegative(),
});

function firstRow(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

export async function managedProfileAgent(name: string) {
  const bindings = await getCloudflareBindings();
  if (!bindings?.FARMER_PROFILE_AGENT) return null;
  const { getAgentByName } = await import("agents");
  return getAgentByName(
    bindings.FARMER_PROFILE_AGENT,
    name,
  ) as Promise<DurableObjectStub<FarmerProfileAgent>>;
}

type ManagedEvidence = ManagedProfileAgentInput["evidence"];

export async function generateAndSaveManagedProfileSample(input: {
  supabase: ReturnType<typeof createAdminClient>;
  prospectId: string;
  subjectName: string;
  preferredLocale: ManagedProfileAgentInput["preferredLocale"];
  evidence: ManagedEvidence;
  storageEvidence?: ManagedEvidence;
  idempotencyKey: string;
}) {
  const sampleId = await uuidFromText(
    `managed-profile-sample:${input.idempotencyKey}`,
  );
  const agentInstanceName = `prospect-${input.prospectId}`;
  const agent = await managedProfileAgent(agentInstanceName);
  if (!agent) return outreachFailure("AI_UNAVAILABLE");
  let generated;
  try {
    generated = await agent.generateSample({
      sampleId,
      prospectId: input.prospectId,
      subjectName: input.subjectName,
      preferredLocale: input.preferredLocale,
      evidence: input.evidence,
    });
  } catch {
    return outreachFailure("AI_UNAVAILABLE");
  }
  const sampleFingerprint = await sha256(
    JSON.stringify({
      prospectId: input.prospectId,
      subjectName: input.subjectName,
      sourceHashes: input.evidence.map((item) => item.sourceHash),
      promptVersion: generated.run.promptVersion,
    }),
  );
  const saved = await input.supabase.rpc("save_managed_profile_sample", {
    prospect_id_input: input.prospectId,
    subject_name_input: input.subjectName,
    sample_data_input: generated.sample,
    sources_input: input.storageEvidence ?? input.evidence,
    agent_instance_name_input: agentInstanceName,
    run_input: generated.run,
    sample_fingerprint_input: sampleFingerprint,
    idempotency_key_input: input.idempotencyKey,
  });
  if (saved.error) return outreachFailure("DATA_UNAVAILABLE");
  const savedRow = savedSampleSchema.safeParse(firstRow(saved.data));
  if (!savedRow.success) return outreachFailure("DATA_UNAVAILABLE");
  try {
    const workflow = await agent.beginApproval({
      sampleId: savedRow.data.sample_id,
      sampleFingerprint,
    });
    const workflowLink = await input.supabase.rpc(
      "set_managed_profile_sample_workflow",
      {
        sample_id_input: savedRow.data.sample_id,
        workflow_id_input: workflow.workflowId,
        sample_fingerprint_input: sampleFingerprint,
      },
    );
    if (workflowLink.error) throw new Error("WORKFLOW_LINK_FAILED");
    revalidatePath("/admin/outreach");
    revalidatePath("/admin/known-farmers");
    return {
      ok: true as const,
      code: savedRow.data.code,
      data: {
        sampleId: savedRow.data.sample_id,
        workflowId: workflow.workflowId,
        sample: generated.sample,
        run: generated.run,
      },
    };
  } catch {
    return outreachFailure("DATA_UNAVAILABLE");
  }
}
