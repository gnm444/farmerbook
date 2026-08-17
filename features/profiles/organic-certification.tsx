import { BadgeCheck, FileWarning } from "lucide-react";
import type { FarmerProfile } from "@/lib/types";

export type OrganicCertificationStatus =
  | "not_submitted"
  | "pending"
  | "verified"
  | "rejected"
  | "revoked";

export type OrganicCertificationSubmission = {
  id: string;
  status: Exclude<OrganicCertificationStatus, "not_submitted">;
  evidencePath: string;
  evidenceMimeType: string;
  evidenceSizeBytes: number;
  submittedAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
  evidenceUrl?: string;
};

export const NON_CERTIFIED_ORGANIC_LABEL =
  "Non-certified organic farmer (paperwork not yet completed to prove certification).";

export function isOrganicCertificationClaim(value: string) {
  return /\b(?:certified\s+organic|organic\s+certified|organic\s+certification|n?pop|pgs[- ]?india)\b/i.test(value);
}

export function publicOrganicCertificationLabel(profile: FarmerProfile) {
  if (profile.accountRole !== "farmer" || profile.farmingMethod !== "organic") {
    return null;
  }
  return profile.organicCertificationVerified
    ? "Certified organic"
    : NON_CERTIFIED_ORGANIC_LABEL;
}

export function OrganicCertificationLabel({
  profile,
  compact = false,
}: {
  profile: FarmerProfile;
  compact?: boolean;
}) {
  const label = publicOrganicCertificationLabel(profile);
  if (!label) return null;
  const verified = profile.organicCertificationVerified === true;
  const Icon = verified ? BadgeCheck : FileWarning;
  return (
    <span
      className={`organic-certification-label organic-certification-label--${verified ? "verified" : "unverified"}${compact ? " organic-certification-label--compact" : ""}`}
    >
      <Icon size={compact ? 13 : 16} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
