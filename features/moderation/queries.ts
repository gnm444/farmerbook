import { requireAdmin } from "@/features/auth/require-admin";
import { reports as demoReports } from "@/lib/demo-data";
import { createdLabel } from "@/lib/data-mappers";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ModerationReport } from "@/lib/types";

export async function loadPendingReports(): Promise<ModerationReport[]> {
  if (!isSupabaseConfigured()) return isDemoMode() ? demoReports : [];

  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, reporter_id, target_type, target_id, reason, details, status, created_at",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((report) => ({
    id: report.id as string,
    reporterId: report.reporter_id as string,
    targetType: report.target_type as ModerationReport["targetType"],
    targetId: report.target_id as string,
    targetLabel: `${String(report.target_type)} ${String(report.target_id).slice(0, 8)}`,
    reason: report.reason as ModerationReport["reason"],
    details: report.details as string,
    createdLabel: createdLabel(report.created_at as string),
    status: report.status as ModerationReport["status"],
  }));
}
