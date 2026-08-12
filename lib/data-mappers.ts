import type {
  AccountRole,
  FarmingMethod,
  FarmerProfile,
  ParticipantType,
  ProfileCategoryAffinity,
} from "@/lib/types";
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";

export type ProfileRow = {
  id: string;
  handle: string;
  full_name: string;
  participant_type: ParticipantType;
  account_role: AccountRole;
  preferred_locale?: SupportedLocale | string | null;
  district: string;
  state: string;
  crops: string[];
  bio: string;
  verification_status: string;
  experience_years: number | null;
  farming_method: FarmingMethod | null;
  website_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  avatar_path: string | null;
  cover_path: string | null;
  public_profile_enabled: boolean;
  created_at: string;
};

const legacyRoleLabels: Record<ParticipantType, string> = {
  farmer: "Farmer",
  agronomist: "Agronomist",
  fpo: "FPO representative",
  buyer: "Agriculture buyer",
  trainer: "Agriculture trainer",
  ngo: "NGO participant",
  agri_business: "Agricultural business representative",
};

const accountRoleLabels: Record<AccountRole, string> = {
  farmer: "Farmer",
  customer: "Customer",
  wholesaler: "Wholesaler",
  agri_business: "Agricultural business",
};

export function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function createdLabel(value: string) {
  const date = new Date(value);
  const deltaMinutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60_000),
  );
  if (deltaMinutes < 1) return "Just now";
  if (deltaMinutes < 60) return `${deltaMinutes} min ago`;
  if (deltaMinutes < 1_440) return `${Math.floor(deltaMinutes / 60)} hr ago`;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function mapProfile(
  row: ProfileRow,
  options: {
    followers?: number;
    following?: number;
    isFollowing?: boolean;
    avatarUrl?: string;
    avatarSource?: "oauth" | "uploaded";
    coverUrl?: string;
    categoryAffinities?: ProfileCategoryAffinity[];
  } = {},
): FarmerProfile {
  return {
    id: row.id,
    handle: row.handle,
    fullName: row.full_name,
    initials: initialsFor(row.full_name),
    participantType: row.participant_type,
    accountRole: row.account_role,
    roleLabel:
      accountRoleLabels[row.account_role] ?? legacyRoleLabels[row.participant_type],
    preferredLocale: normalizeLocale(row.preferred_locale) ?? DEFAULT_LOCALE,
    categoryAffinities: options.categoryAffinities ?? [],
    district: row.district,
    state: row.state,
    crops: row.crops ?? [],
    bio: row.bio,
    farmingMethod: row.farming_method ?? undefined,
    socialLinks: {
      website: row.website_url ?? undefined,
      linkedin: row.linkedin_url ?? undefined,
      instagram: row.instagram_url ?? undefined,
      facebook: row.facebook_url ?? undefined,
      youtube: row.youtube_url ?? undefined,
    },
    reviewSummary: { average: 0, count: 0 },
    verified: row.verification_status === "verified",
    followers: options.followers ?? 0,
    following: options.following ?? 0,
    experienceYears: row.experience_years ?? undefined,
    joinedLabel: `Joined ${new Intl.DateTimeFormat("en-IN", {
      month: "long",
      year: "numeric",
    }).format(new Date(row.created_at))}`,
    isFollowing: options.isFollowing,
    avatarPath: row.avatar_path ?? undefined,
    avatarUrl: options.avatarUrl,
    avatarSource: options.avatarSource,
    coverPath: row.cover_path ?? undefined,
    coverUrl: options.coverUrl,
    publicProfileEnabled: row.public_profile_enabled,
  };
}
