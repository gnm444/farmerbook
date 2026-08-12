import { redirect } from "next/navigation";
import { canPublishProduce } from "@/features/auth/capabilities";
import { currentUserId, getProfile } from "@/lib/demo-data";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { AccountRole } from "@/lib/types";

export type ActiveUser = {
  id: string;
  email?: string;
  demo: boolean;
  profile: {
    handle: string;
    fullName: string;
    status: string;
    onboardingComplete: boolean;
    accountRole: AccountRole;
  };
};

export function isSellerRole(role: AccountRole) {
  return canPublishProduce(role);
}

export async function requireUser(
  options: { allowIncomplete?: boolean } = {},
): Promise<ActiveUser> {
  if (!isSupabaseConfigured()) {
    if (!isDemoMode()) {
      throw new Error("FarmerBook authentication is not configured.");
    }
    const profile = getProfile(currentUserId);
    return {
      id: currentUserId,
      demo: true,
      profile: {
        handle: profile.handle,
        fullName: profile.fullName,
        status: "active",
        onboardingComplete: true,
        accountRole: profile.accountRole,
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, full_name, status, onboarding_complete, account_role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active") {
    redirect(profile ? "/login?error=Account%20is%20not%20active" : "/onboarding");
  }
  if (!options.allowIncomplete && !profile.onboarding_complete) {
    redirect("/onboarding");
  }

  return {
    id: user.id,
    email: user.email,
    demo: false,
    profile: {
      handle: profile.handle,
      fullName: profile.full_name,
      status: profile.status,
      onboardingComplete: profile.onboarding_complete,
      accountRole: profile.account_role as AccountRole,
    },
  };
}
