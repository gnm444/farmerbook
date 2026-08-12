"use server";

import { profileSchema } from "./schemas";
import { recordProductEvent } from "@/features/analytics/events";
import { requireUser } from "@/features/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { isSupportedOwnedSocialProfileUrl } from "@/features/profile-agent/social-link-policy";
import {
  isTrustedOAuthAvatarUrl,
  trustedOAuthAvatarForUser,
} from "./oauth-avatar";

export async function saveProfileAction(input: unknown) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, message: parsed.error.issues[0]?.message };
  }

  const user = await requireUser({ allowIncomplete: true });
  if (user.demo) {
    return { ok: true as const, demo: true };
  }

  if (!user.profile.onboardingComplete) {
    if (parsed.data.termsAccepted !== true) {
      return {
        ok: false as const,
        message: "Accept the terms, privacy notice and community rules to continue.",
      };
    }
    const supabase = await createClient();
    const { error } = await supabase.rpc("complete_legacy_onboarding", {
      profile_input: parsed.data,
    });
    if (error?.code === "PGRST202") {
      const { error: legacyError } = await supabase
        .from("profiles")
        .update({
          full_name: parsed.data.fullName,
          handle: parsed.data.handle,
          participant_type: parsed.data.participantType,
          account_role: parsed.data.accountRole,
          district: parsed.data.district,
          state: parsed.data.state,
          crops: parsed.data.crops,
          bio: parsed.data.bio,
          ...(parsed.data.preferredLanguage
            ? { preferred_language: parsed.data.preferredLanguage }
            : {}),
          experience_years: parsed.data.experienceYears,
          farming_method:
            parsed.data.accountRole === "farmer"
              ? parsed.data.farmingMethod
              : null,
          website_url: parsed.data.socialLinks.website ?? null,
          linkedin_url: parsed.data.socialLinks.linkedin ?? null,
          instagram_url: parsed.data.socialLinks.instagram ?? null,
          facebook_url: parsed.data.socialLinks.facebook ?? null,
          youtube_url: parsed.data.socialLinks.youtube ?? null,
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (!legacyError) {
        await recordProductEvent(user.id, "profile_completed");
      }
      return legacyError
        ? {
            ok: false as const,
            message:
              "The profile could not be completed. Please check the details and try again.",
          }
        : { ok: true as const, demo: false };
    }
    return error
      ? {
          ok: false as const,
          message: "The profile could not be completed. Please check the details and try again.",
        }
      : { ok: true as const, demo: false };
  }

  if (parsed.data.accountRole !== user.profile.accountRole) {
    return {
      ok: false as const,
      message: "Account roles cannot be changed from profile settings.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({
    full_name: parsed.data.fullName,
    handle: parsed.data.handle,
    district: parsed.data.district,
    state: parsed.data.state,
    crops: parsed.data.crops,
    bio: parsed.data.bio,
    ...(parsed.data.preferredLanguage
      ? { preferred_language: parsed.data.preferredLanguage }
      : {}),
    ...(parsed.data.preferredLocale
      ? { preferred_locale: parsed.data.preferredLocale }
      : {}),
    experience_years: parsed.data.experienceYears,
    farming_method:
      parsed.data.accountRole === "farmer"
        ? parsed.data.farmingMethod
        : null,
    website_url: parsed.data.socialLinks.website ?? null,
    linkedin_url: parsed.data.socialLinks.linkedin ?? null,
    instagram_url: parsed.data.socialLinks.instagram ?? null,
    facebook_url: parsed.data.socialLinks.facebook ?? null,
    youtube_url: parsed.data.socialLinks.youtube ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", user.id);

  return error
    ? {
        ok: false as const,
        message: "The profile could not be saved. Please try again.",
      }
    : { ok: true as const, demo: false };
}

export async function saveAvatarAction(path: string | undefined) {
  const user = await requireUser({ allowIncomplete: true });
  if (user.demo) {
    return { ok: true as const, demo: true, previousPath: undefined };
  }
  if (path && (!path.startsWith(`${user.id}/`) || path.length > 500)) {
    return { ok: false as const, message: "The avatar path is invalid." };
  }

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .single();
  if (currentError) {
    return {
      ok: false as const,
      message: "The profile photo could not be loaded. Please try again.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      avatar_path: path ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return error
    ? {
        ok: false as const,
        message: "The profile photo could not be saved. Please try again.",
      }
    : {
        ok: true as const,
        demo: false,
        previousPath: current.avatar_path as string | undefined,
      };
}

export async function saveProfileCoverAction(path: string | undefined) {
  const user = await requireUser({ allowIncomplete: true });
  if (user.profile.accountRole !== "farmer") {
    return {
      ok: false as const,
      message: "Only Farmer profiles can use a profile background photo.",
    };
  }
  if (user.demo) {
    return { ok: true as const, demo: true, previousPath: undefined };
  }
  if (path && (!path.startsWith(`${user.id}/cover-`) || path.length > 500)) {
    return { ok: false as const, message: "The background image path is invalid." };
  }

  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("profiles")
    .select("cover_path")
    .eq("id", user.id)
    .single();
  if (currentError) {
    return {
      ok: false as const,
      message: "The background photo could not be loaded. Please try again.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      cover_path: path ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return error
    ? {
        ok: false as const,
        message: "The background photo could not be saved. Please try again.",
      }
    : {
        ok: true as const,
        demo: false,
        previousPath: current.cover_path as string | undefined,
      };
}

export async function savePublicProfileAction(enabled: boolean) {
  if (typeof enabled !== "boolean") {
    return { ok: false as const, message: "Choose whether to publish your profile." };
  }

  const user = await requireUser();
  if (user.profile.accountRole !== "farmer") {
    return {
      ok: false as const,
      message: "Public Farmer homepages are available to Farmer accounts.",
    };
  }
  if (user.demo) {
    return { ok: true as const, demo: true };
  }

  const supabase = await createClient();
  if (enabled) {
    const current = await supabase
      .from("profiles")
      .select("linkedin_url, instagram_url, facebook_url, youtube_url")
      .eq("id", user.id)
      .maybeSingle();
    if (current.error) {
      return {
        ok: false as const,
        message: "The public profile setting could not be saved. Please try again.",
      };
    }
    if (
      !current.data ||
      ![
        ["linkedin", current.data.linkedin_url],
        ["instagram", current.data.instagram_url],
        ["facebook", current.data.facebook_url],
        ["youtube", current.data.youtube_url],
      ].some(
        ([sourceType, sourceUrl]) =>
          typeof sourceUrl === "string" &&
          isSupportedOwnedSocialProfileUrl(sourceUrl, sourceType ?? ""),
      )
    ) {
      return {
        ok: false as const,
        message:
          "Add at least one LinkedIn, Instagram, Facebook or YouTube link before publishing your Farmer profile.",
      };
    }
  }
  const { error } = await supabase
    .from("profiles")
    .update({
      public_profile_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return error
    ? {
        ok: false as const,
        message: "The public profile setting could not be saved. Please try again.",
      }
    : { ok: true as const, demo: false };
}

const importedAvatarTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function importOAuthAvatarAction() {
  const user = await requireUser({ allowIncomplete: true });
  if (user.demo) {
    return { ok: true as const, demo: true, path: undefined, url: undefined };
  }

  const supabase = await createClient();
  const [{ data: authData }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("profiles")
        .select("avatar_path")
        .eq("id", user.id)
        .single(),
    ]);

  if (profileError) {
    return {
      ok: false as const,
      message: "The profile photo could not be loaded. Please try again.",
    };
  }
  if (profile.avatar_path) {
    const { data } = await supabase.storage
      .from("avatars")
      .createSignedUrl(profile.avatar_path as string, 60 * 60);
    return {
      ok: true as const,
      demo: false,
      path: profile.avatar_path as string,
      url: data?.signedUrl,
    };
  }

  const candidate = authData.user
    ? trustedOAuthAvatarForUser(authData.user)
    : undefined;
  if (!candidate) {
    return {
      ok: false as const,
      message: "No trusted social profile photo is available.",
    };
  }

  try {
    const response = await fetch(candidate.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    const contentType = response.headers.get("content-type")?.split(";")[0];
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    const extension = contentType
      ? importedAvatarTypes.get(contentType)
      : undefined;
    if (
      !response.ok ||
      !extension ||
      contentLength > 5 * 1024 * 1024 ||
      !isTrustedOAuthAvatarUrl(candidate.provider, response.url)
    ) {
      return {
        ok: false as const,
        message: "The social profile photo could not be imported safely.",
      };
    }

    const image = await response.arrayBuffer();
    if (!image.byteLength || image.byteLength > 5 * 1024 * 1024) {
      return {
        ok: false as const,
        message: "The social profile photo is empty or too large.",
      };
    }

    const path = `${user.id}/oauth-avatar-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, image, {
        cacheControl: "3600",
        contentType,
        upsert: false,
      });
    if (uploadError) {
      return {
        ok: false as const,
        message: "The social profile photo could not be uploaded. Please try again.",
      };
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_path: path, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (updateError) {
      await supabase.storage.from("avatars").remove([path]);
      return {
        ok: false as const,
        message: "The social profile photo could not be saved. Please try again.",
      };
    }

    const { data } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60);
    return {
      ok: true as const,
      demo: false,
      path,
      url: data?.signedUrl,
    };
  } catch {
    return {
      ok: false as const,
      message: "The social profile photo could not be imported.",
    };
  }
}
