"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import { saveProfileCoverAction } from "./actions";
import { removeProfileImage, uploadProfileCover } from "./uploads";

type ProfileCoverFieldProps = {
  initialImageUrl?: string;
  initialPath?: string;
};

export function ProfileCoverField({
  initialImageUrl,
  initialPath,
}: ProfileCoverFieldProps) {
  const t = useTranslations("settings");
  const inputId = useId();
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [path, setPath] = useState(initialPath);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasImage = Boolean(imageUrl || path);

  useEffect(() => {
    if (!imageUrl?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  function changeCover(file: File | undefined) {
    if (!file) return;
    setMessage("");
    setError("");
    startTransition(async () => {
      try {
        const upload = await uploadProfileCover(file);
        const result = await saveProfileCoverAction(upload.path);
        if (!result.ok) {
          if (upload.path) await removeProfileImage(upload.path);
          setError(t("backgroundSaveFailed"));
          return;
        }
        if (result.previousPath) {
          await removeProfileImage(result.previousPath);
        }
        setImageUrl(upload.url);
        setPath(upload.path);
        setMessage(t("backgroundUpdated"));
      } catch {
        setError(t("backgroundUploadFailed"));
      }
    });
  }

  function clearCover() {
    setMessage("");
    setError("");
    startTransition(async () => {
      const result = await saveProfileCoverAction(undefined);
      if (!result.ok) {
        setError(t("backgroundRemoveFailed"));
        return;
      }
      const previousPath = result.previousPath ?? path;
      if (previousPath) await removeProfileImage(previousPath);
      setImageUrl(undefined);
      setPath(undefined);
      setMessage(t("backgroundRemoved"));
    });
  }

  return (
    <fieldset className="profile-cover-field">
      <legend>{t("backgroundPhoto")}</legend>
      <div className="profile-cover-preview">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={t("currentBackgroundAlt")} />
        ) : (
          <span>{t("defaultBackground")}</span>
        )}
      </div>
      <div className="profile-photo-field__actions">
        <label
          className="button button--secondary button--small"
          htmlFor={inputId}
        >
          <ImagePlus size={16} aria-hidden="true" />
          {hasImage ? t("changeBackground") : t("addBackground")}
        </label>
        <input
          className="sr-only"
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={isPending}
          onChange={(event) => {
            changeCover(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        {hasImage ? (
          <button
            className="button button--ghost button--small"
            type="button"
            disabled={isPending}
            onClick={clearCover}
          >
            <Trash2 size={15} aria-hidden="true" /> {t("removeBackground")}
          </button>
        ) : null}
      </div>
      <p className="form-helper">
        {t("backgroundHelp")}
      </p>
      {isPending ? <p className="form-helper" role="status">{t("updatingBackground")}</p> : null}
      {message ? <p className="form-helper" role="status">{message}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </fieldset>
  );
}
