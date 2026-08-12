import { BadgeCheck, Sprout } from "lucide-react";
import type { AccountRole } from "@/lib/types";

export function Avatar({
  initials,
  size,
  imageUrl,
  role,
}: {
  initials: string;
  size?: "small" | "large";
  imageUrl?: string;
  role?: AccountRole;
}) {
  return (
    <span
      className={`avatar${size ? ` avatar--${size}` : ""}`}
      aria-hidden="true"
      style={
        imageUrl
          ? {
              backgroundImage: `url("${imageUrl}")`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      {imageUrl ? null : role === "farmer" ? (
        <Sprout aria-label="Default Farmer profile icon" />
      ) : (
        initials
      )}
    </span>
  );
}

export function VerifiedBadge({ label = "Verified" }: { label?: string }) {
  return (
    <span className="verified" aria-label={label} title={label}>
      <BadgeCheck size={17} aria-hidden="true" />
    </span>
  );
}

export function DemoBanner({
  visible = true,
  label = "Demonstration mode · Explore every journey with fictional pilot data",
}: {
  visible?: boolean;
  label?: string;
}) {
  if (!visible) return null;

  return (
    <div className="demo-banner" role="status">
      {label}
    </div>
  );
}

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`brand${inverse ? " brand--inverse" : ""}`}>
      <span className="brand-mark">F</span>
      FarmerBook
    </span>
  );
}
