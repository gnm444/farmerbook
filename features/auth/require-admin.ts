import { redirect } from "next/navigation";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  if (!isSupabaseConfigured()) {
    if (!isDemoMode()) {
      throw new Error("FarmerBook administration is not configured.");
    }
    return { id: "demo-admin", demo: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "admin") {
    redirect("/feed");
  }

  return { id: user.id, demo: false };
}
