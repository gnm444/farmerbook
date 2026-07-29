"use server";

import { redirect } from "next/navigation";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { emailSchema, loginSchema, signupSchema } from "./schemas";

function authRedirect(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function signupAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    acceptedTerms: formData.get("acceptedTerms"),
  });

  if (!parsed.success) {
    authRedirect("/signup", parsed.error.issues[0]?.message ?? "Check the form.");
  }

  if (!isSupabaseConfigured()) {
    redirect("/onboarding?demo=1");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    authRedirect("/signup", error.message);
  }

  redirect("/signup?checkEmail=1");
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    authRedirect("/login", parsed.error.issues[0]?.message ?? "Check the form.");
  }

  if (!isSupabaseConfigured()) {
    redirect("/feed");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    authRedirect("/login", "Email or password was not recognized.");
  }

  redirect("/feed");
}

export async function requestPasswordResetAction(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    authRedirect("/forgot-password", parsed.error.issues[0]?.message);
  }

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/settings/account`,
    });
  }

  redirect("/forgot-password?sent=1");
}

export async function logoutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
