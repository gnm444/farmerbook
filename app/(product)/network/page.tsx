import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { ProductHeader } from "@/components/product-header";
import { NetworkClient } from "@/features/network/network-client";

export const metadata: Metadata = { title: "Your network" };

export default function NetworkPage() {
  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Your community"
        title="Your network"
        description="Keep track of people whose field experience is useful to you."
        action={
          <Link className="button" href="/discover">
            <UserPlus size={17} aria-hidden="true" /> Find people
          </Link>
        }
      />
      <NetworkClient />
    </div>
  );
}
