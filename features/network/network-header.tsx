"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { ProductHeader } from "@/components/product-header";
import { useAuthenticatedMessages } from "@/components/locale-provider";

export function NetworkHeader() {
  const { network } = useAuthenticatedMessages();

  return (
    <ProductHeader
      eyebrow={network.eyebrow}
      title={network.title}
      description={network.description}
      action={
        <Link className="button" href="/discover">
          <UserPlus size={17} aria-hidden="true" /> {network.findPeople}
        </Link>
      }
    />
  );
}
