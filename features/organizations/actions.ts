"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canManageOrganization } from "@/features/auth/capabilities";
import { requireUser } from "@/features/auth/require-user";
import { isSupabaseConfigured } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { actionFailure, databaseActionFailure } from "./action-result";
import {
  ORGANIZATION_RPCS,
  type CreateOrganizationRpcArgs,
  type CreateOrganizationRpcResult,
  type DatabaseServiceAreaInput,
  type SetOrganizationPublicationRpcArgs,
  type SetOrganizationPublicationRpcResult,
  type UpdateOrganizationRpcArgs,
  type UpdateOrganizationRpcResult,
} from "./database-contract";
import { loadActiveOrganizationMembership } from "./queries";
import {
  createOrganizationSchema,
  organizationPublicationSchema,
  organizationSlugSchema,
  updateOrganizationSchema,
} from "./schemas";

const createResultSchema = z.object({
  organization_id: z.uuid(),
  slug: z.string().min(1),
});
const updateResultSchema = createResultSchema.extend({
  updated_at: z.string().min(1),
});
const publicationResultSchema = z.object({
  organization_id: z.uuid(),
  slug: organizationSlugSchema,
  publication_state: z.enum(["published", "unpublished"]),
  updated_at: z.iso.datetime({ offset: true }),
});

function rpcRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

function databaseServiceAreas(
  serviceAreas: Array<{
    state: string;
    district?: string;
    serviceRadiusKm?: number;
  }>,
): DatabaseServiceAreaInput[] {
  return serviceAreas.map((area) => ({
    state: area.state,
    district: area.district ?? null,
    service_radius_km: area.serviceRadiusKm ?? null,
  }));
}

function createRpcArgs(
  input: z.infer<typeof createOrganizationSchema>,
): CreateOrganizationRpcArgs {
  return {
    slug_input: input.slug,
    display_name_input: input.displayName,
    organization_type_input: input.organizationType,
    description_input: input.description,
    state_input: input.state,
    district_input: input.district ?? null,
    website_url_input: input.websiteUrl ?? null,
    category_slugs_input: input.sectorSlugs,
    service_areas_input: databaseServiceAreas(input.serviceAreas),
  };
}

export async function createOrganizationAction(input: unknown) {
  if (!isFeatureEnabled("ENABLE_AGRI_BUSINESSES")) {
    return actionFailure("FEATURE_DISABLED");
  }
  const parsed = createOrganizationSchema.safeParse(input);
  if (!parsed.success) return actionFailure("INVALID_INPUT");
  if (!isSupabaseConfigured()) return actionFailure("NOT_CONFIGURED");

  const user = await requireUser();
  if (user.demo) return actionFailure("NOT_CONFIGURED");
  if (user.profile.accountRole !== "agri_business") {
    return actionFailure("FORBIDDEN");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    ORGANIZATION_RPCS.create,
    createRpcArgs(parsed.data),
  );
  if (error) return databaseActionFailure(error);

  const result = createResultSchema.safeParse(
    rpcRow(data as CreateOrganizationRpcResult | CreateOrganizationRpcResult[] | null),
  );
  if (!result.success) return actionFailure("DATA_UNAVAILABLE");
  revalidatePath("/companies");
  revalidatePath("/company");
  return {
    ok: true as const,
    code: "CREATED" as const,
    data: {
      organizationId: result.data.organization_id,
      slug: result.data.slug,
    },
  };
}

export async function updateOrganizationAction(input: unknown) {
  if (!isFeatureEnabled("ENABLE_AGRI_BUSINESSES")) {
    return actionFailure("FEATURE_DISABLED");
  }
  const parsed = updateOrganizationSchema.safeParse(input);
  if (!parsed.success) return actionFailure("INVALID_INPUT");
  if (!isSupabaseConfigured()) return actionFailure("NOT_CONFIGURED");

  const user = await requireUser();
  if (user.demo) return actionFailure("NOT_CONFIGURED");

  let membership;
  try {
    membership = await loadActiveOrganizationMembership(
      parsed.data.organizationId,
      user.id,
    );
  } catch {
    return actionFailure("DATA_UNAVAILABLE");
  }
  if (!membership || !canManageOrganization(membership.role)) {
    return actionFailure("FORBIDDEN");
  }

  const args: UpdateOrganizationRpcArgs = {
    ...createRpcArgs(parsed.data),
    organization_id_input: parsed.data.organizationId,
    expected_updated_at_input: parsed.data.expectedUpdatedAt,
  };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(ORGANIZATION_RPCS.update, args);
  if (error) return databaseActionFailure(error);

  const result = updateResultSchema.safeParse(
    rpcRow(data as UpdateOrganizationRpcResult | UpdateOrganizationRpcResult[] | null),
  );
  if (!result.success) return actionFailure("DATA_UNAVAILABLE");
  revalidatePath("/companies");
  revalidatePath(`/companies/${result.data.slug}`);
  revalidatePath("/company");
  return {
    ok: true as const,
    code: "UPDATED" as const,
    data: {
      organizationId: result.data.organization_id,
      slug: result.data.slug,
      updatedAt: result.data.updated_at,
    },
  };
}

export async function setOrganizationPublicationAction(input: unknown) {
  if (!isFeatureEnabled("ENABLE_AGRI_BUSINESSES")) {
    return actionFailure("FEATURE_DISABLED");
  }
  const parsed = organizationPublicationSchema.safeParse(input);
  if (!parsed.success) return actionFailure("INVALID_INPUT");
  if (!isSupabaseConfigured()) return actionFailure("NOT_CONFIGURED");

  const user = await requireUser();
  if (user.demo) return actionFailure("NOT_CONFIGURED");

  let membership;
  try {
    membership = await loadActiveOrganizationMembership(
      parsed.data.organizationId,
      user.id,
    );
  } catch {
    return actionFailure("DATA_UNAVAILABLE");
  }
  if (
    !membership ||
    (membership.role !== "owner" && membership.role !== "admin")
  ) {
    return actionFailure("FORBIDDEN");
  }

  const args: SetOrganizationPublicationRpcArgs = {
    organization_id_input: parsed.data.organizationId,
    publication_state_input: parsed.data.publicationState,
    expected_updated_at_input: parsed.data.expectedUpdatedAt,
  };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    ORGANIZATION_RPCS.setPublication,
    args,
  );
  if (error) return databaseActionFailure(error);

  const result = publicationResultSchema.safeParse(
    rpcRow(
      data as
        | SetOrganizationPublicationRpcResult
        | SetOrganizationPublicationRpcResult[]
        | null,
    ),
  );
  if (!result.success) return actionFailure("DATA_UNAVAILABLE");

  revalidatePath("/companies");
  revalidatePath(`/companies/${result.data.slug}`);
  revalidatePath("/company");
  return {
    ok: true as const,
    code: "PUBLICATION_UPDATED" as const,
    data: {
      organizationId: result.data.organization_id,
      slug: result.data.slug,
      publicationState: result.data.publication_state,
      updatedAt: result.data.updated_at,
    },
  };
}
