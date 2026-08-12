"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import { setOrganizationPublicationAction } from "./actions";
import type { OrganizationForMember } from "./types";

export function OrganizationPublicationControl({
  organization,
}: {
  organization: OrganizationForMember;
}) {
  const router = useRouter();
  const t = useTranslations("companies");
  const errors = useTranslations("errors");
  const [publicationState, setPublicationState] = useState(
    organization.publicationState,
  );
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState(
    organization.updatedAt,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const canSetPublication =
    organization.membershipRole === "owner" ||
    organization.membershipRole === "admin";

  if (!canSetPublication) return null;

  const isPublished = publicationState === "published";
  const targetState = isPublished ? "unpublished" : "published";
  const publishBlockers = !isPublished
    ? [
        ...(organization.moderationState !== "active"
          ? [t("moderationBlocker")]
          : []),
        ...(!organization.sectorSlugs.length
          ? [t("sectorBlocker")]
          : []),
        ...(!organization.serviceAreas.length
          ? [t("serviceAreaBlocker")]
          : []),
      ]
    : [];

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publishBlockers.length) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      const result = await setOrganizationPublicationAction({
        organizationId: organization.id,
        publicationState: targetState,
        expectedUpdatedAt,
      });
      if (!result.ok) {
        setError(errors("generic"));
        return;
      }
      setPublicationState(result.data.publicationState);
      setExpectedUpdatedAt(result.data.updatedAt);
      setMessage(
        result.data.publicationState === "published"
          ? t("profilePublished")
          : t("profileUnpublished"),
      );
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} aria-label={t("publicationSettings", { name: organization.displayName })}>
      <p>
        {t("publicVisibility")}: <strong>{publicationState}</strong>
      </p>
      {publishBlockers.length ? (
        <p className="notice notice--error" role="status">
          {t("cannotPublish", { reasons: publishBlockers.join("; ") })}
        </p>
      ) : null}
      {message ? (
        <p className="notice" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="button button--secondary"
        type="submit"
        disabled={isPending || Boolean(publishBlockers.length)}
        aria-label={isPublished ? t("unpublish", { name: organization.displayName }) : t("publish", { name: organization.displayName })}
      >
        {isPublished ? (
          <EyeOff size={16} aria-hidden="true" />
        ) : (
          <Eye size={16} aria-hidden="true" />
        )}
        {isPending
          ? t("updatingVisibility")
          : isPublished
            ? t("unpublishInc")
            : t("publishInc")}
      </button>
    </form>
  );
}
