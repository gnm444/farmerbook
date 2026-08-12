"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { LanguageSelector } from "@/components/language-selector";
import type { FarmerProfile } from "@/lib/types";
import { saveProfileAction } from "./actions";
import { ProfilePhotoField } from "./profile-photo-field";
import { ProfileCoverField } from "./profile-cover-field";
import { ProfileHomeSettings } from "./profile-home-settings";
import { useTranslations } from "@/components/locale-provider";
import { AgricultureCategoryPicker } from "@/features/onboarding/category-picker";
import {
  agricultureCategoryBySlug,
  agricultureSelectionFromLabels,
} from "@/lib/agriculture/categories";

export function ProfileSettingsForm({
  profile,
  extendedLocalesEnabled,
}: {
  profile: FarmerProfile;
  extendedLocalesEnabled: boolean;
}) {
  const t = useTranslations("settings");
  const common = useTranslations("common");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const initialCategorySelection = agricultureSelectionFromLabels(profile.crops);
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState(
    initialCategorySelection.selectedSlugs,
  );
  const [customCategoryLabels, setCustomCategoryLabels] = useState(
    initialCategorySelection.customLabels,
  );
  const crops = [
    ...selectedCategorySlugs.flatMap((slug) => {
      const category = agricultureCategoryBySlug(slug);
      return category ? [category.name] : [];
    }),
    ...customCategoryLabels,
  ];

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

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
              accountRole: profile.accountRole,
              district: form.get("district"),
              state: form.get("state"),
              crops: String(form.get("crops") ?? "")
                .split(",")
                .map((crop) => crop.trim())
                .filter(Boolean),
              bio: form.get("bio"),
              experienceYears: profile.experienceYears,
              farmingMethod: form.get("farmingMethod") || undefined,
              socialLinks: {
                website: form.get("website"),
                linkedin: form.get("linkedin"),
                instagram: form.get("instagram"),
                facebook: form.get("facebook"),
                youtube: form.get("youtube"),
              },
            });
            if (!result.ok) {
              setError(t("changesFailed"));
              return;
            }
            setToast(t("changesSaved"));
          });
        }}
      >
        <h2>{t("profileLanguage")}</h2>
        <p>{t("profileHelp")}</p>
        <ProfilePhotoField
          initials={profile.initials}
          initialImageUrl={profile.avatarUrl}
          initialPath={profile.avatarPath}
          initialSource={profile.avatarSource}
          role={profile.accountRole}
        />
        {profile.accountRole === "farmer" ? (
          <>
            <ProfileCoverField
              initialImageUrl={profile.coverUrl}
              initialPath={profile.coverPath}
            />
            <ProfileHomeSettings
              handle={profile.handle}
              fullName={profile.fullName}
              initialEnabled={profile.publicProfileEnabled}
            />
          </>
        ) : null}
        <div className="form-row">
          <div className="field">
            <label htmlFor="settings-name">{t("fullName")}</label>
            <input
              className="input"
              id="settings-name"
              name="fullName"
              defaultValue={profile.fullName}
            />
          </div>
          <div className="field">
            <label htmlFor="settings-handle">{t("publicHandle")}</label>
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
            <label htmlFor="settings-district">{t("district")}</label>
            <input
              className="input"
              id="settings-district"
              name="district"
              defaultValue={profile.district}
            />
          </div>
          <div className="field">
            <label htmlFor="settings-state">{t("state")}</label>
            <input
              className="input"
              id="settings-state"
              name="state"
              defaultValue={profile.state}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="settings-bio">{t("bio")}</label>
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
            <label htmlFor="settings-role">{t("accountSegment")}</label>
            <input
              className="input"
              id="settings-role"
              value={
                profile.accountRole === "farmer"
                  ? t("farmer")
                  : profile.accountRole === "customer"
                    ? t("customer")
                    : profile.accountRole === "wholesaler"
                      ? t("wholesaler")
                      : t("inc")
              }
              readOnly
            />
            <p className="form-helper">
              {t("segmentLocked")}
            </p>
          </div>
          {profile.accountRole === "farmer" ? (
            <div className="field">
              <label htmlFor="settings-method">{t("farmingMethod")}</label>
              <select
                className="select"
                id="settings-method"
                name="farmingMethod"
                defaultValue={profile.farmingMethod}
                required
              >
                <option value="organic">{t("organic")}</option>
                <option value="natural">{t("natural")}</option>
                <option value="conventional">{t("conventional")}</option>
                <option value="mixed">{t("mixed")}</option>
              </select>
            </div>
          ) : null}
        </div>
        <input type="hidden" name="crops" value={crops.join(", ")} />
        <AgricultureCategoryPicker
          title={
            profile.accountRole === "farmer"
              ? t("primaryCrops")
              : profile.accountRole === "wholesaler"
                ? t("produceCategories")
                : t("produceInterests")
          }
          context="profile"
          selectedSlugs={selectedCategorySlugs}
          customLabels={customCategoryLabels}
          onSelectedSlugsChange={setSelectedCategorySlugs}
          onCustomLabelsChange={setCustomCategoryLabels}
          maxTotalSelections={8}
          maxCustomLabels={3}
          maxCustomLabelLength={40}
        />
        <div className="form-row">
          <LanguageSelector
            label={t("interfaceLanguage")}
            extendedLocalesEnabled={extendedLocalesEnabled}
          />
        </div>
        <fieldset className="role-fieldset social-fields">
          <legend>{t("socialLinks")}</legend>
          <div className="form-row">
            <div className="field">
              <label htmlFor="settings-website">{t("website")}</label>
              <input
                className="input"
                id="settings-website"
                name="website"
                type="url"
                placeholder="https://"
                defaultValue={profile.socialLinks.website}
              />
            </div>
            <div className="field">
              <label htmlFor="settings-linkedin">LinkedIn</label>
              <input
                className="input"
                id="settings-linkedin"
                name="linkedin"
                type="url"
                placeholder="https://www.linkedin.com/..."
                defaultValue={profile.socialLinks.linkedin}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="settings-instagram">Instagram</label>
              <input
                className="input"
                id="settings-instagram"
                name="instagram"
                type="url"
                placeholder="https://www.instagram.com/..."
                defaultValue={profile.socialLinks.instagram}
              />
            </div>
            <div className="field">
              <label htmlFor="settings-facebook">Facebook</label>
              <input
                className="input"
                id="settings-facebook"
                name="facebook"
                type="url"
                placeholder="https://www.facebook.com/..."
                defaultValue={profile.socialLinks.facebook}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="settings-youtube">YouTube</label>
            <input
              className="input"
              id="settings-youtube"
              name="youtube"
              type="url"
              placeholder="https://www.youtube.com/..."
              defaultValue={profile.socialLinks.youtube}
            />
          </div>
        </fieldset>
        <div>
          <button className="button" type="submit" disabled={isPending}>
            {isPending ? common("saving") : t("saveChanges")}
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
