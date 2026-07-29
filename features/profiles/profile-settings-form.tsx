"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Upload } from "lucide-react";
import { Avatar } from "@/components/ui";
import type { FarmerProfile } from "@/lib/types";
import { saveAvatarAction, saveProfileAction } from "./actions";
import { removeAvatar, uploadAvatar } from "./uploads";

export function ProfileSettingsForm({ profile }: { profile: FarmerProfile }) {
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function changeAvatar(file: File | undefined) {
    if (!file) return;
    setError("");
    startTransition(async () => {
      try {
        const upload = await uploadAvatar(file);
        const result = await saveAvatarAction(upload.path);
        if (!result.ok) {
          if (upload.path) await removeAvatar(upload.path);
          setError(result.message ?? "The avatar could not be saved.");
          return;
        }
        if (result.previousPath) await removeAvatar(result.previousPath);
        setAvatarUrl(upload.url);
        setToast("Avatar updated.");
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "The avatar could not be uploaded.",
        );
      }
    });
  }

  return (
    <>
      <form
        className="card settings-card form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError("");
          startTransition(async () => {
            const result = await saveProfileAction({
              fullName: form.get("fullName"),
              handle: form.get("handle"),
              participantType: profile.participantType,
              district: form.get("district"),
              state: form.get("state"),
              crops: String(form.get("crops") ?? "")
                .split(",")
                .map((crop) => crop.trim())
                .filter(Boolean),
              bio: form.get("bio"),
              preferredLanguage: form.get("preferredLanguage"),
              experienceYears: profile.experienceYears,
            });
            if (!result.ok) {
              setError(result.message ?? "Profile changes could not be saved.");
              return;
            }
            setToast("Profile changes saved.");
          });
        }}
      >
        <h2>Profile and language</h2>
        <p>Keep your public farming identity current and useful.</p>
        <div className="person-row">
          <Avatar
            initials={profile.initials}
            imageUrl={avatarUrl}
            size="large"
          />
          <label className="button button--secondary button--small">
            <Upload size={16} aria-hidden="true" /> Change avatar
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={isPending}
              onChange={(event) => changeAvatar(event.target.files?.[0])}
            />
          </label>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="settings-name">Full name</label>
            <input
              className="input"
              id="settings-name"
              name="fullName"
              defaultValue={profile.fullName}
            />
          </div>
          <div className="field">
            <label htmlFor="settings-handle">Public handle</label>
            <input
              className="input"
              id="settings-handle"
              name="handle"
              defaultValue={profile.handle}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="settings-district">District</label>
            <input
              className="input"
              id="settings-district"
              name="district"
              defaultValue={profile.district}
            />
          </div>
          <div className="field">
            <label htmlFor="settings-state">State</label>
            <input
              className="input"
              id="settings-state"
              name="state"
              defaultValue={profile.state}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="settings-bio">Short introduction</label>
          <textarea
            className="textarea"
            id="settings-bio"
            name="bio"
            defaultValue={profile.bio}
            maxLength={500}
          />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="settings-crops">Primary crops</label>
            <input
              className="input"
              id="settings-crops"
              name="crops"
              defaultValue={profile.crops.join(", ")}
            />
          </div>
          <div className="field">
            <label htmlFor="settings-language">Interface language</label>
            <select
              className="select"
              id="settings-language"
              name="preferredLanguage"
              defaultValue="en"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="mr">मराठी (translation review pending)</option>
            </select>
          </div>
        </div>
        <div>
          <button className="button" type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </form>
      {toast ? (
        <div className="toast" role="status">
          <CheckCircle2 size={19} aria-hidden="true" /> {toast}
        </div>
      ) : null}
    </>
  );
}
