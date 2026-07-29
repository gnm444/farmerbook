import type {
  FarmerProfile,
  ParticipantType,
} from "@/lib/types";

export type ProfileRow = {
  id: string;
  handle: string;
  full_name: string;
  participant_type: ParticipantType;
  district: string;
  state: string;
  crops: string[];
  bio: string;
  verification_status: string;
  experience_years: number | null;
  avatar_path: string | null;
  created_at: string;
};

const roleLabels: Record<ParticipantType, string> = {
  farmer: "Farmer",
  agronomist: "Agronomist",
  fpo: "FPO representative",
  buyer: "Agriculture buyer",
  trainer: "Agriculture trainer",
  ngo: "NGO participant",
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
  } = {},
): FarmerProfile {
  return {
    id: row.id,
    handle: row.handle,
    fullName: row.full_name,
    initials: initialsFor(row.full_name),
    participantType: row.participant_type,
    roleLabel: roleLabels[row.participant_type],
    district: row.district,
    state: row.state,
    crops: row.crops ?? [],
    bio: row.bio,
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
  };
}
