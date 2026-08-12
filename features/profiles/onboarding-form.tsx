"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  ShoppingBasket,
  Sprout,
  Warehouse,
} from "lucide-react";
import { LanguageSelector } from "@/components/language-selector";
import { useLocale, useTranslations } from "@/components/locale-provider";
import type {
  AccountRole,
  FarmerProfile,
  FarmingMethod,
  ParticipantType,
} from "@/lib/types";
import { INDIA_STATES_AND_UNION_TERRITORIES } from "@/lib/india/regions";
import {
  agricultureCategoryBySlug,
  agricultureSelectionFromLabels,
} from "@/lib/agriculture/categories";
import { AgricultureCategoryPicker } from "@/features/onboarding/category-picker";
import { saveProfileAction } from "./actions";
import { ProfilePhotoField } from "./profile-photo-field";

const roleOptions: Array<{
  value: Exclude<AccountRole, "agri_business">;
  icon: typeof Sprout;
}> = [
  {
    value: "farmer",
    icon: Sprout,
  },
  {
    value: "customer",
    icon: ShoppingBasket,
  },
  {
    value: "wholesaler",
    icon: Warehouse,
  },
];

const farmingMethods: FarmingMethod[] = ["organic", "natural", "conventional", "mixed"];

const roleTitleKeys = {
  farmer: "roleFarmerTitle",
  customer: "roleCustomerTitle",
  wholesaler: "roleWholesalerTitle",
} as const;

const roleDescriptionKeys = {
  farmer: "roleFarmerDescription",
  customer: "roleCustomerDescription",
  wholesaler: "roleWholesalerDescription",
} as const;

const methodLabelKeys = {
  organic: "methodOrganic",
  natural: "methodNatural",
  conventional: "methodConventional",
  mixed: "methodMixed",
} as const;

const methodDescriptionKeys = {
  organic: "methodOrganicDescription",
  natural: "methodNaturalDescription",
  conventional: "methodConventionalDescription",
  mixed: "methodMixedDescription",
} as const;

function legacyParticipantType(role: AccountRole): ParticipantType {
  if (role === "wholesaler") return "fpo";
  if (role === "customer") return "buyer";
  return "farmer";
}

export function OnboardingForm({
  initialProfile,
}: {
  initialProfile: FarmerProfile;
}) {
  const router = useRouter();
  const locale = useLocale();
  const common = useTranslations("common");
  const onboarding = useTranslations("onboarding");
  const profile = useTranslations("profile");
  const settings = useTranslations("settings");
  const legal = useTranslations("legal");
  const [step, setStep] = useState(1);
  const initialCategorySelection = useMemo(
    () => agricultureSelectionFromLabels(initialProfile.crops),
    [initialProfile.crops],
  );
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState(
    initialCategorySelection.selectedSlugs,
  );
  const [customCategoryLabels, setCustomCategoryLabels] = useState(
    initialCategorySelection.customLabels,
  );
  const [details, setDetails] = useState({
    fullName: initialProfile.fullName,
    handle: initialProfile.handle,
    accountRole: initialProfile.accountRole,
    district: initialProfile.district,
    state: initialProfile.state,
    bio: initialProfile.bio,
    experienceYears: initialProfile.experienceYears ?? 0,
    preferredLanguage: locale.slice(0, 2) as "en" | "hi" | "mr",
    preferredLocale: locale,
    farmingMethod: initialProfile.farmingMethod as FarmingMethod | undefined,
    socialLinks: initialProfile.socialLinks,
  });
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const cropLabel =
    details.accountRole === "farmer"
      ? onboarding("cropsGrow")
      : details.accountRole === "wholesaler"
        ? onboarding("produceSupply")
        : onboarding("produceInterest");
  const needsCrops = details.accountRole !== "customer";
  const crops = [
    ...selectedCategorySlugs.flatMap((slug) => {
      const category = agricultureCategoryBySlug(slug);
      return category ? [category.name] : [];
    }),
    ...customCategoryLabels,
  ];

  function chooseRole(accountRole: AccountRole) {
    setDetails((current) => ({
      ...current,
      accountRole,
      farmingMethod:
        accountRole === "farmer" ? current.farmingMethod : undefined,
    }));
  }

  function finish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await saveProfileAction({
        ...details,
        crops,
        termsAccepted,
        participantType: legacyParticipantType(details.accountRole),
      });
      if (!result.ok) {
        setError(onboarding("finishError"));
        return;
      }
      router.push("/feed");
      router.refresh();
    });
  }

  return (
    <form className="form-stack" onSubmit={finish}>
      <div className="notice notice--success">
        <Check size={18} aria-hidden="true" />
        {onboarding("progress", { current: step, total: 3 })} · {onboarding("segmentHelp")}
      </div>

      {step === 1 ? (
        <>
          <fieldset className="role-fieldset">
            <legend>{onboarding("roleQuestion")}</legend>
            <div className="role-card-grid">
              {roleOptions.map(({ value, icon: Icon }) => (
                <button
                  className={`role-card ${
                    details.accountRole === value ? "is-selected" : ""
                  }`}
                  type="button"
                  aria-pressed={details.accountRole === value}
                  key={value}
                  onClick={() => chooseRole(value)}
                >
                  <span className="role-card__icon">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <strong>{onboarding(roleTitleKeys[value])}</strong>
                  <span>{onboarding(roleDescriptionKeys[value])}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <button
            className="button button--full"
            type="button"
            onClick={() => setStep(2)}
          >
            {common("continue")} <ChevronRight size={17} aria-hidden="true" />
          </button>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <div className="form-row">
            <div className="field">
              <label htmlFor="full-name">{profile("fullName")}</label>
              <input
                className="input"
                id="full-name"
                dir="auto"
                value={details.fullName}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="handle">{profile("handle")}</label>
              <input
                className="input"
                id="handle"
                value={details.handle}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    handle: event.target.value,
                  }))
                }
                pattern="[a-z0-9_]{3,30}"
                required
              />
              <p className="form-helper">{onboarding("handleHelp")}</p>
            </div>
          </div>
          <ProfilePhotoField
            initials={initialProfile.initials}
            initialImageUrl={initialProfile.avatarUrl}
            initialPath={initialProfile.avatarPath}
            initialSource={initialProfile.avatarSource}
            role={details.accountRole}
          />
          <div className="form-row">
            <div className="field">
              <label htmlFor="district">{profile("district")}</label>
              <input
                className="input"
                id="district"
                dir="auto"
                value={details.district}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    district: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="state">{profile("state")}</label>
              <select
                className="select"
                id="state"
                value={details.state}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    state: event.target.value,
                  }))
                }
                required
              >
                <option value="">{onboarding("chooseState")}</option>
                {INDIA_STATES_AND_UNION_TERRITORIES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setStep(1)}
            >
              {common("back")}
            </button>
            <button
              className="button"
              type="button"
              onClick={() => setStep(3)}
            >
              {common("continue")} <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <div className="field role-fieldset">
            <AgricultureCategoryPicker
              title={cropLabel}
              context="profile"
              selectedSlugs={selectedCategorySlugs}
              customLabels={customCategoryLabels}
              onSelectedSlugsChange={setSelectedCategorySlugs}
              onCustomLabelsChange={setCustomCategoryLabels}
              maxTotalSelections={8}
              maxCustomLabels={3}
              maxCustomLabelLength={40}
            />
            {details.accountRole === "customer" ? (
              <p className="form-helper">{onboarding("optionalSuggestions")}</p>
            ) : null}
          </div>

          {details.accountRole === "farmer" ? (
            <fieldset className="role-fieldset">
              <legend>{onboarding("howFarm")}</legend>
              <div className="method-grid">
                {farmingMethods.map((value) => (
                  <button
                    className={`method-card ${
                      details.farmingMethod === value ? "is-selected" : ""
                    }`}
                    type="button"
                    aria-pressed={details.farmingMethod === value}
                    key={value}
                    onClick={() =>
                      setDetails((current) => ({
                        ...current,
                        farmingMethod: value,
                      }))
                    }
                  >
                    <strong>{onboarding(methodLabelKeys[value])}</strong>
                    <span>{onboarding(methodDescriptionKeys[value])}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div className="field">
            <label htmlFor="bio">{profile("bio")}</label>
            <textarea
              className="textarea"
              id="bio"
              dir="auto"
              maxLength={500}
              value={details.bio}
              onChange={(event) =>
                setDetails((current) => ({
                  ...current,
                  bio: event.target.value,
                }))
              }
            />
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="experience">{profile("experience")}</label>
              <input
                className="input"
                id="experience"
                type="number"
                min={0}
                max={80}
                value={details.experienceYears}
                onChange={(event) =>
                  setDetails((current) => ({
                    ...current,
                    experienceYears: Number(event.target.value),
                  }))
                }
              />
            </div>
            <div className="field">
              <LanguageSelector className="field" label={settings("interfaceLanguage")} />
            </div>
          </div>

          <fieldset className="role-fieldset social-fields">
            <legend>{onboarding("socialOptional")}</legend>
            <div className="form-row">
              <SocialInput
                id="website"
                label={settings("website")}
                value={details.socialLinks.website ?? ""}
                onChange={(value) =>
                  setDetails((current) => ({
                    ...current,
                    socialLinks: { ...current.socialLinks, website: value },
                  }))
                }
              />
              <SocialInput
                id="linkedin"
                label="LinkedIn"
                value={details.socialLinks.linkedin ?? ""}
                onChange={(value) =>
                  setDetails((current) => ({
                    ...current,
                    socialLinks: { ...current.socialLinks, linkedin: value },
                  }))
                }
              />
            </div>
            <div className="form-row">
              <SocialInput
                id="instagram"
                label="Instagram"
                value={details.socialLinks.instagram ?? ""}
                onChange={(value) =>
                  setDetails((current) => ({
                    ...current,
                    socialLinks: { ...current.socialLinks, instagram: value },
                  }))
                }
              />
              <SocialInput
                id="facebook"
                label="Facebook"
                value={details.socialLinks.facebook ?? ""}
                onChange={(value) =>
                  setDetails((current) => ({
                    ...current,
                    socialLinks: { ...current.socialLinks, facebook: value },
                  }))
                }
              />
            </div>
            <SocialInput
              id="youtube"
              label="YouTube"
              value={details.socialLinks.youtube ?? ""}
              onChange={(value) =>
                setDetails((current) => ({
                  ...current,
                  socialLinks: { ...current.socialLinks, youtube: value },
                }))
              }
            />
          </fieldset>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              required
            />
            <span>
              {legal("consentBeforeTerms")}<Link href="/terms">{legal("terms")}</Link>
              {legal("consentBetweenTermsPrivacy")}<Link href="/privacy">{legal("privacy")}</Link>
              {legal("consentBetweenPrivacyRules")}<Link href="/community-rules">{legal("communityRules")}</Link>{legal("consentAfterRules")}
            </span>
          </label>

          <div className="form-row">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => setStep(2)}
            >
              {common("back")}
            </button>
            <button
              className="button"
              type="submit"
              disabled={
                (needsCrops && !crops.length) ||
                (details.accountRole === "farmer" && !details.farmingMethod) ||
                !termsAccepted ||
                isPending
              }
            >
              {isPending ? common("saving") : onboarding("finishProfile")}
            </button>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
        </>
      ) : null}
    </form>
  );
}

function SocialInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={`social-${id}`}>{label}</label>
      <input
        className="input"
        id={`social-${id}`}
        type="url"
        placeholder="https://"
        dir="auto"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
