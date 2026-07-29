import { redirect } from "next/navigation";
import { currentUserId, getProfile } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type ActiveUser = {
  id: string;
  email?: string;
  demo: boolean;
  profile: {
    handle: string;
    fullName: string;
    status: string;
    onboardingComplete: boolean;
  };
};

export async function requireUser(
  options: { allowIncomplete?: boolean } = {},
): Promise<ActiveUser> {
  if (!isSupabaseConfigured()) {
    const profile = getProfile(currentUserId);
    return {
      id: currentUserId,
      demo: true,
      profile: {
        handle: profile.handle,
        fullName: profile.fullName,
        status: "active",
        onboardingComplete: true,
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
    .select("handle, full_name, status, onboarding_complete")
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
    },
  };
}
