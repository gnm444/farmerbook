import { BadgeCheck } from "lucide-react";

export function Avatar({
  initials,
  size,
  imageUrl,
}: {
  initials: string;
  size?: "small" | "large";
  imageUrl?: string;
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
      {imageUrl ? "" : initials}
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

export function DemoBanner({ visible = true }: { visible?: boolean }) {
  if (!visible) return null;

  return (
    <div className="demo-banner" role="status">
      Demonstration mode · Explore every journey with fictional pilot data
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
