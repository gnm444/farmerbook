import type { BlogPublication } from "@/features/blog/contracts";

export type RightsClearedSocialMedia = {
  path: string;
  provenance: "ai_generated" | "rights_approved_original";
  sha256: string;
};

const RIGHTS_CLEARED_STATIC_MEDIA: Readonly<Record<
  string,
  RightsClearedSocialMedia
>> = {
  "wealth-we-accumulate-health-we-abandon": {
    path: "/images/blog/wealth-health-paradox-editorial.jpg",
    provenance: "ai_generated",
    sha256: "9abf0c5fdcef6271ac93a9ce59f09a152a4d8245e5cdfda590895c1b45b81d21",
  },
};

export function rightsClearedSocialMediaFor(
  publication: BlogPublication,
): RightsClearedSocialMedia | null {
  const media = RIGHTS_CLEARED_STATIC_MEDIA[publication.slug];
  if (!media || media.provenance !== publication.heroImage?.provenance) {
    return null;
  }
  return media;
}
