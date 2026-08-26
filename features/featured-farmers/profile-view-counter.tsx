"use client";

import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { countFeaturedFarmerProfileViewAction } from "./engagement-actions";

export function FeaturedFarmerProfileViewCounter({
  slug,
  initialCount,
  label,
  helpText,
}: {
  slug: string;
  initialCount: number;
  label: string;
  helpText: string;
}) {
  const [count, setCount] = useState(initialCount);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void countFeaturedFarmerProfileViewAction(slug).then((result) => {
      if (result.ok) setCount(result.count);
    });
  }, [slug]);

  return (
    <div className="featured-engagement__views" title={helpText}>
      <Eye size={19} aria-hidden="true" />
      <span>
        <strong>{new Intl.NumberFormat("en-IN").format(count)}</strong> {label}
      </span>
      <small>{helpText}</small>
    </div>
  );
}
