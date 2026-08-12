"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui";
import { useTranslations } from "@/components/locale-provider";
import type { AccountRole } from "@/lib/types";
import { importOAuthAvatarAction, saveAvatarAction } from "./actions";
import { removeAvatar, uploadAvatar } from "./uploads";

type ProfilePhotoFieldProps = {
  initials: string;
  initialImageUrl?: string;
  initialPath?: string;
  initialSource?: "oauth" | "uploaded";
  role?: AccountRole;
};

export function ProfilePhotoField({
  initials,
  initialImageUrl,
  initialPath,
  initialSource,
  role,
}: ProfilePhotoFieldProps) {
  const t = useTranslations("settings");
  const inputId = useId();
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [path, setPath] = useState(initialPath);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const importAttempted = useRef(false);
  const hasPhoto = Boolean(imageUrl || path);

  useEffect(() => {
    if (
      initialSource !== "oauth" ||
      initialPath ||
      importAttempted.current
    ) {
      return;
    }
    importAttempted.current = true;
    startTransition(async () => {
      const result = await importOAuthAvatarAction();
      if (!result.ok) return;
      setImageUrl(result.url ?? initialImageUrl);
      setPath(result.path);
      if (result.path) setMessage(t("photoImported"));
    });
  }, [initialImageUrl, initialPath, initialSource, t]);

  useEffect(() => {
    if (!imageUrl?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  function changePhoto(file: File | undefined) {
    if (!file) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const upload = await uploadAvatar(file);
        const result = await saveAvatarAction(upload.path);
        if (!result.ok) {
          if (upload.path) await removeAvatar(upload.path);
          setError(t("photoSaveFailed"));
          return;
        }
        if (result.previousPath) await removeAvatar(result.previousPath);
        setImageUrl(upload.url);
        setPath(upload.path);
        setMessage(t("photoUpdated"));
      } catch {
        setError(t("photoUploadFailed"));
      }
    });
  }

  function clearPhoto() {
    setMessage("");
    setError("");
    startTransition(async () => {
      const result = await saveAvatarAction(undefined);
      if (!result.ok) {
        setError(t("photoRemoveFailed"));
        return;
      }
      const previousPath = result.previousPath ?? path;
      if (previousPath) await removeAvatar(previousPath);
      setImageUrl(undefined);
      setPath(undefined);
      setMessage(t("photoRemoved"));
    });
  }

  return (
    <fieldset className="profile-photo-field">
      <legend>
        {role === "farmer" ? t("farmerPhoto") : t("optionalPhoto")}
      </legend>
      <div className="person-row">
        <Avatar
          initials={initials}
          imageUrl={imageUrl}
          role={role}
          size="large"
        />
        <div className="profile-photo-field__actions">
          <label
            className="button button--secondary button--small"
            htmlFor={inputId}
          >
            <ImagePlus size={16} aria-hidden="true" />
            {hasPhoto ? t("changePhoto") : t("addPhoto")}
          </label>
          <input
            className="sr-only"
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={isPending}
            onChange={(event) => {
              changePhoto(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          {hasPhoto ? (
            <button
              className="button button--ghost button--small"
              type="button"
              disabled={isPending}
              onClick={clearPhoto}
            >
              <Trash2 size={15} aria-hidden="true" /> {t("removePhoto")}
            </button>
          ) : null}
        </div>
      </div>
      <p className="form-helper">
        {role === "farmer"
          ? t("farmerPhotoHelp")
          : t("photoHelp")}
      </p>
      {isPending ? (
        <p className="form-helper" role="status">
          {t("updatingPhoto")}
        </p>
      ) : null}
      {message ? (
        <p className="form-helper" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
