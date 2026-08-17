"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ShoppingBasket,
  Sprout,
  Warehouse,
} from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import { AGRICULTURE_COMPANY_SECTORS } from "@/lib/agriculture/company-sectors";
import {
  localeRegistry,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/lib/i18n/locales";
import { localeReviewLabel } from "@/lib/i18n/review-status";
import { INDIA_STATES_AND_UNION_TERRITORIES } from "@/lib/india/regions";
import type { FarmerProfile } from "@/lib/types";
import {
  ORGANIZATION_TYPES,
  type OrganizationType,
} from "@/features/organizations/types";
import { EcoFriendlyClaimNotice } from "@/features/organizations/eco-friendly-claim-notice";
import { AgricultureCategoryPicker } from "./category-picker";
import { onboardingMutationSchema } from "./schemas";
import {
  finalizeOnboardingAction,
  saveOnboardingStepAction,
} from "./actions";
import {
  ONBOARDING_STEPS,
  type EcosystemAccountRole,
  type OnboardingProgressRecord,
  type OnboardingStep,
} from "./types";

const roleIcons = {
  farmer: Sprout,
  customer: ShoppingBasket,
  wholesaler: Warehouse,
  agri_business: Building2,
} as const;

const roleCopy = {
  farmer: {
    title: "roleFarmerTitle",
    description: "roleFarmerDescription",
  },
  customer: {
    title: "roleCustomerTitle",
    description: "roleCustomerDescription",
  },
  wholesaler: {
    title: "roleWholesalerTitle",
    description: "roleWholesalerDescription",
  },
  agri_business: {
    title: "roleCompanyTitle",
    description: "roleCompanyDescription",
  },
} as const;

const stepLabels = {
  language: "stepLanguage",
  role: "stepRole",
  identity_location: "stepIdentityLocation",
  agriculture: "stepAgriculture",
  role_details: "stepRoleDetails",
  review_visibility: "stepReview",
} as const satisfies Record<OnboardingStep, string>;

const sectorGroupLabels = {
  machinery: "sectorGroupMachinery",
  "eco-friendly-products": null,
  inputs: "sectorGroupInputs",
  "animal-aquaculture": "sectorGroupAnimalAquaculture",
  "supply-chain": "sectorGroupSupplyChain",
  "professional-services": "sectorGroupProfessionalServices",
  markets: "sectorGroupMarkets",
  "farmer-dependent-industries": "sectorGroupFarmerDependentIndustries",
} as const;

const organizationTypeMessageNames = {
  manufacturer_brand: "orgTypeManufacturerBrand",
  dealer_distributor: "orgTypeDealerDistributor",
  retailer: "orgTypeRetailer",
  wholesaler_trader: "orgTypeWholesalerTrader",
  processor_exporter: "orgTypeProcessorExporter",
  fpo_cooperative: "orgTypeFpoCooperative",
  custom_hiring_rental_centre: "orgTypeRentalCentre",
  logistics_warehouse: "orgTypeLogisticsWarehouse",
  finance_insurance: "orgTypeFinanceInsurance",
  advisory_training_research: "orgTypeAdvisoryResearch",
  ngo: "orgTypeNgo",
  government_support_body: "orgTypeGovernmentSupport",
} as const satisfies Record<OrganizationType, string>;

const CORE_LOCALES = ["en-IN", "hi-IN", "mr-IN"] as const;

function toSlug(value: string) {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase("en-IN")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function indexOfStep(step: OnboardingStep) {
  return Math.max(0, ONBOARDING_STEPS.indexOf(step));
}

export function OnboardingFlow({
  initialProfile,
  initialProgress,
  agriBusinessesEnabled,
  extendedLocalesEnabled,
}: {
  initialProfile: FarmerProfile;
  initialProgress: OnboardingProgressRecord;
  agriBusinessesEnabled: boolean;
  extendedLocalesEnabled: boolean;
}) {
  const router = useRouter();
  const common = useTranslations("common");
  const onboarding = useTranslations("onboarding");
  const profileMessages = useTranslations("profile");
  const legal = useTranslations("legal");
  const [progress, setProgress] = useState(initialProgress);
  const [step, setStep] = useState(initialProgress.currentStep);
  const [locale, setLocale] = useState<SupportedLocale>(initialProgress.locale);
  const [role, setRole] = useState<EcosystemAccountRole | null>(
    initialProgress.accountRole === "agri_business" && !agriBusinessesEnabled
      ? null
      : initialProgress.accountRole,
  );
  const [identity, setIdentity] = useState(
    initialProgress.identity ?? {
      fullName: initialProfile.fullName,
      handle: initialProfile.handle,
      district: initialProfile.district,
      state: initialProfile.state,
      bio: initialProfile.bio,
    },
  );
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState(
    initialProgress.selectedCategorySlugs,
  );
  const [customCategoryLabels, setCustomCategoryLabels] = useState(
    initialProgress.customCategoryLabels,
  );
  const [farmingMethod, setFarmingMethod] = useState(
    initialProgress.roleDetails?.farmingMethod ?? initialProfile.farmingMethod ?? "mixed",
  );
  const [experienceYears, setExperienceYears] = useState(
    initialProgress.roleDetails?.experienceYears ?? initialProfile.experienceYears ?? 0,
  );
  const [organization, setOrganization] = useState({
    organizationName: initialProgress.roleDetails?.organization?.organizationName ?? "",
    organizationSlug: initialProgress.roleDetails?.organization?.organizationSlug ?? "",
    organizationType:
      initialProgress.roleDetails?.organization?.organizationType ?? "manufacturer_brand",
    description: initialProgress.roleDetails?.organization?.description ?? "",
    websiteUrl: initialProgress.roleDetails?.organization?.websiteUrl ?? "",
    serviceStates: initialProgress.roleDetails?.organization?.serviceStates ??
      (initialProfile.state ? [initialProfile.state] : []),
  });
  const [companySectorSlugs, setCompanySectorSlugs] = useState(
    initialProgress.companySectorSlugs,
  );
  const [profileVisibility, setProfileVisibility] = useState<"members" | "public">(
    initialProgress.reviewVisibility?.profileVisibility ?? "members",
  );
  const [termsAccepted, setTermsAccepted] = useState(
    initialProgress.reviewVisibility?.termsAccepted ?? false,
  );
  const [message, setMessage] = useState(
    initialProgress.status === "in_progress" ? onboarding("resume") : "",
  );
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isPending, startTransition] = useTransition();
  const stepPanelRef = useRef<HTMLDivElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const stepIndex = indexOfStep(step);
  const visibleLocales: readonly SupportedLocale[] = extendedLocalesEnabled
    ? SUPPORTED_LOCALES
    : CORE_LOCALES.includes(locale as (typeof CORE_LOCALES)[number])
      ? CORE_LOCALES
      : [...CORE_LOCALES, locale];
  const visibleRoles = (Object.keys(roleCopy) as EcosystemAccountRole[]).filter(
    (value) => value !== "agri_business" || agriBusinessesEnabled,
  );
  const groupedSectors = useMemo(() => {
    type SectorGroup = keyof typeof sectorGroupLabels;
    const groups = new Map<
      SectorGroup,
      (typeof AGRICULTURE_COMPANY_SECTORS)[number][]
    >();
    for (const sector of AGRICULTURE_COMPANY_SECTORS) {
      groups.set(sector.group, [...(groups.get(sector.group) ?? []), sector]);
    }
    return [...groups.entries()];
  }, []);

  useEffect(() => {
    stepPanelRef.current?.focus();
  }, [step]);

  function hasFieldError(path: string) {
    return Boolean(fieldErrors[path]?.length || fieldErrors.data?.length);
  }

  function dataForStep(current: OnboardingStep) {
    switch (current) {
      case "language":
        return { locale };
      case "role":
        return { accountRole: role };
      case "identity_location":
        return identity;
      case "agriculture":
        return { selectedCategorySlugs, customCategoryLabels };
      case "role_details":
        if (role === "farmer") {
          return { accountRole: role, farmingMethod, experienceYears };
        }
        if (role === "agri_business") {
          return {
            accountRole: role,
            organization: { ...organization, companySectorSlugs },
          };
        }
        return { accountRole: role, experienceYears };
      case "review_visibility":
        return { profileVisibility, termsAccepted };
    }
  }

  function continueFlow() {
    setError("");
    setMessage("");
    setFieldErrors({});
    const request = {
      flowVersion: 1 as const,
      expectedRevision: progress.revision,
      idempotencyKey: crypto.randomUUID(),
      step,
      data: dataForStep(step),
    };
    const validation = onboardingMutationSchema.safeParse(request);
    if (!validation.success) {
      const nextFieldErrors: Record<string, string[]> = {};
      for (const issue of validation.error.issues) {
        const path = issue.path.join(".") || "data";
        nextFieldErrors[path] = [...(nextFieldErrors[path] ?? []), issue.message];
      }
      setFieldErrors(nextFieldErrors);
      setError(onboarding("validationSummary"));
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }
    startTransition(async () => {
      const result = await saveOnboardingStepAction(validation.data);
      if (!result.ok) {
        if (result.code === "REVISION_CONFLICT") {
          setError(onboarding("revisionReload"));
        } else {
          const firstFieldError = Object.values(result.fieldErrors ?? {})[0]?.[0];
          setError(firstFieldError ?? onboarding("stepTryAgain"));
        }
        requestAnimationFrame(() => errorSummaryRef.current?.focus());
        return;
      }

      setProgress(result.data);
      if (step !== "review_visibility") {
        setStep(result.data.currentStep);
        setMessage(onboarding("autosaved"));
        if (step === "language") router.refresh();
        return;
      }

      const completed = await finalizeOnboardingAction({
        expectedRevision: result.revision,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!completed.ok) {
        setError(
          completed.code === "REVISION_CONFLICT"
            ? onboarding("finishReload")
            : onboarding("finishError"),
        );
        return;
      }
      router.push(role === "agri_business" ? "/company" : "/feed");
      router.refresh();
    });
  }

  function toggleSector(slug: string) {
    setCompanySectorSlugs((current) =>
      current.includes(slug)
        ? current.filter((value) => value !== slug)
        : current.length < 12
          ? [...current, slug]
          : current,
    );
  }

  function toggleServiceState(state: string) {
    setOrganization((current) => ({
      ...current,
      serviceStates: current.serviceStates.includes(state)
        ? current.serviceStates.filter((value) => value !== state)
        : [...current.serviceStates, state],
    }));
  }

  return (
    <div className="onboarding-flow">
      <div className="onboarding-progress" aria-label={onboarding("progressLabel")}>
        <p>{onboarding("progress", { current: stepIndex + 1, total: ONBOARDING_STEPS.length })}</p>
        <ol>
          {ONBOARDING_STEPS.map((item, index) => (
            <li key={item} aria-current={item === step ? "step" : undefined}>
              <span>{index < stepIndex ? <Check size={14} aria-hidden="true" /> : index + 1}</span>
              <small>{onboarding(stepLabels[item])}</small>
            </li>
          ))}
        </ol>
      </div>

      {message ? <p className="notice notice--success" role="status">{message}</p> : null}
      {localeReviewLabel(locale) === "beta" ? (
        <p className="form-helper">
          {onboarding("betaReviewHelp", { beta: common("beta") })}
        </p>
      ) : null}
      {error ? (
        <div
          className="notice notice--error"
          id="onboarding-error-summary"
          role="alert"
          tabIndex={-1}
          ref={errorSummaryRef}
        >
          <div>
            <strong>{error}</strong>
            {Object.keys(fieldErrors).length ? (
              <ul>
                {Object.entries(fieldErrors).flatMap(([path, messages]) =>
                  messages.map((item) => <li key={`${path}-${item}`}>{item}</li>),
                )}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className="onboarding-step-panel"
        tabIndex={-1}
        ref={stepPanelRef}
        aria-live="polite"
      >

      {step === "language" ? (
        <fieldset className="onboarding-step">
          <legend>{common("selectLanguage")}</legend>
          <p className="form-helper">
            {onboarding("languageHelp")}
          </p>
          <label className="field" htmlFor="onboarding-locale">
            <span>{common("language")}</span>
            <select
              className="select"
              id="onboarding-locale"
              value={locale}
              aria-invalid={hasFieldError("data.locale")}
              aria-describedby={hasFieldError("data.locale") ? "onboarding-error-summary" : undefined}
              onChange={(event) => setLocale(event.target.value as SupportedLocale)}
            >
              {visibleLocales.map((item) => {
                const details = localeRegistry[item];
                return (
                  <option key={item} value={item} lang={item}>
                    {details.nativeName} — {details.englishName}
                    {localeReviewLabel(item) === "beta" ? ` (${common("beta")})` : ""}
                  </option>
                );
              })}
            </select>
          </label>
        </fieldset>
      ) : null}

      {step === "role" ? (
        <fieldset className="onboarding-step">
          <legend>{onboarding("roleQuestion")}</legend>
          <p className="form-helper">{onboarding("roleHelp")}</p>
          <div
            className="role-choice-grid"
            role="radiogroup"
            aria-invalid={hasFieldError("data.accountRole")}
            aria-describedby={hasFieldError("data.accountRole") ? "onboarding-error-summary" : undefined}
          >
            {visibleRoles.map((value) => {
              const Icon = roleIcons[value];
              return (
                <label key={value} className={role === value ? "role-choice is-selected" : "role-choice"}>
                  <input
                    type="radio"
                    name="account-role"
                    value={value}
                    checked={role === value}
                    onChange={() => setRole(value)}
                  />
                  <Icon size={24} aria-hidden="true" />
                  <strong>{onboarding(roleCopy[value].title)}</strong>
                  <span>{onboarding(roleCopy[value].description)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {step === "identity_location" ? (
        <fieldset className="onboarding-step">
          <legend>{onboarding("identityLocationTitle")}</legend>
          <div className="form-grid form-grid--two">
            <label className="field">
              <span>{profileMessages("fullName")}</span>
              <input className="input" dir="auto" value={identity.fullName} maxLength={80} autoComplete="name" aria-invalid={hasFieldError("data.fullName")} aria-describedby={hasFieldError("data.fullName") ? "onboarding-error-summary" : undefined} onChange={(event) => setIdentity({ ...identity, fullName: event.target.value })} />
            </label>
            <label className="field">
              <span>{profileMessages("handle")}</span>
              <input className="input" dir="ltr" value={identity.handle} maxLength={30} autoCapitalize="none" aria-invalid={hasFieldError("data.handle")} aria-describedby={hasFieldError("data.handle") ? "onboarding-error-summary" : undefined} onChange={(event) => setIdentity({ ...identity, handle: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} />
            </label>
            <label className="field">
              <span>{profileMessages("stateOrTerritory")}</span>
              <select className="select" value={identity.state} aria-invalid={hasFieldError("data.state")} aria-describedby={hasFieldError("data.state") ? "onboarding-error-summary" : undefined} onChange={(event) => setIdentity({ ...identity, state: event.target.value })}>
                <option value="">{onboarding("chooseState")}</option>
                {INDIA_STATES_AND_UNION_TERRITORIES.map((state) => <option key={state} dir="auto">{state}</option>)}
              </select>
            </label>
            <label className="field">
              <span>{profileMessages("district")}</span>
              <input className="input" dir="auto" value={identity.district} maxLength={80} autoComplete="address-level2" aria-invalid={hasFieldError("data.district")} aria-describedby={hasFieldError("data.district") ? "onboarding-error-summary" : undefined} onChange={(event) => setIdentity({ ...identity, district: event.target.value })} />
            </label>
          </div>
          <label className="field">
            <span>{profileMessages("bio")} <small>({common("optional")})</small></span>
            <textarea className="textarea" dir="auto" value={identity.bio} maxLength={500} aria-invalid={hasFieldError("data.bio")} aria-describedby={hasFieldError("data.bio") ? "onboarding-error-summary" : undefined} onChange={(event) => setIdentity({ ...identity, bio: event.target.value })} />
          </label>
          <p className="form-helper">{onboarding("locationPrivacyHelp")}</p>
        </fieldset>
      ) : null}

      {step === "agriculture" ? (
        <div className="onboarding-step">
          <AgricultureCategoryPicker
            selectedSlugs={selectedCategorySlugs}
            customLabels={customCategoryLabels}
            onSelectedSlugsChange={setSelectedCategorySlugs}
            onCustomLabelsChange={setCustomCategoryLabels}
          />
        </div>
      ) : null}

      {step === "role_details" ? (
        <fieldset className="onboarding-step">
          <legend>{onboarding(role === "agri_business" ? "companyProfileTitle" : "roleDetailsTitle")}</legend>
          {role === "farmer" ? (
            <div className="form-grid form-grid--two">
              <label className="field">
                <span>{profileMessages("farmingMethod")}</span>
                <select className="select" value={farmingMethod} onChange={(event) => setFarmingMethod(event.target.value as typeof farmingMethod)}>
                  <option value="organic">{onboarding("methodOrganic")}</option>
                  <option value="natural">{onboarding("methodNatural")}</option>
                  <option value="conventional">{onboarding("methodConventional")}</option>
                  <option value="mixed">{onboarding("methodMixed")}</option>
                </select>
              </label>
              <label className="field">
                <span>{profileMessages("experience")}</span>
                <input className="input" type="number" min={0} max={80} value={experienceYears} onChange={(event) => setExperienceYears(Number(event.target.value))} />
              </label>
            </div>
          ) : null}
          {role === "customer" || role === "wholesaler" ? (
            <div className="notice">
              {onboarding("sourcingDetailsHelp")}
            </div>
          ) : null}
          {role === "agri_business" ? (
            <div className="company-onboarding-fields">
              <div className="form-grid form-grid--two">
                <label className="field"><span>{profileMessages("organizationName")}</span><input className="input" dir="auto" value={organization.organizationName} maxLength={120} onChange={(event) => setOrganization({ ...organization, organizationName: event.target.value, organizationSlug: organization.organizationSlug || toSlug(event.target.value) })} /></label>
                <label className="field"><span>{profileMessages("organizationSlug")}</span><input className="input" dir="ltr" value={organization.organizationSlug} maxLength={80} autoCapitalize="none" onChange={(event) => setOrganization({ ...organization, organizationSlug: toSlug(event.target.value) })} /></label>
                <label className="field"><span>{profileMessages("organizationType")}</span><select className="select" value={organization.organizationType} onChange={(event) => setOrganization({ ...organization, organizationType: event.target.value })}>{ORGANIZATION_TYPES.map((type) => <option key={type} value={type}>{onboarding(organizationTypeMessageNames[type])}</option>)}</select></label>
                <label className="field"><span>{profileMessages("website")} <small>({common("optional")})</small></span><input className="input" dir="ltr" type="url" placeholder="https://" value={organization.websiteUrl} onChange={(event) => setOrganization({ ...organization, websiteUrl: event.target.value })} /></label>
              </div>
              <label className="field"><span>{profileMessages("organizationDescription")}</span><textarea className="textarea" dir="auto" minLength={20} maxLength={1500} value={organization.description} onChange={(event) => setOrganization({ ...organization, description: event.target.value })} /></label>

              <fieldset className="compact-fieldset">
                <legend>{onboarding("companySectors")}</legend>
                <p className="form-helper">{onboarding("companySectorsHelp")}</p>
                {groupedSectors.map(([group, sectors]) => (
                  <section key={group} className="sector-group">
                    <h3>
                      {group === "eco-friendly-products"
                        ? "Eco-friendly products — seller-declared"
                        : onboarding(sectorGroupLabels[group])}
                    </h3>
                    <div className="checkbox-grid">
                      {sectors.map((sector) => (
                        <label key={sector.slug}>
                          <input type="checkbox" checked={companySectorSlugs.includes(sector.slug)} disabled={!companySectorSlugs.includes(sector.slug) && companySectorSlugs.length >= 12} onChange={() => toggleSector(sector.slug)} />
                          <span dir="auto">{sector.name}</span>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
                <EcoFriendlyClaimNotice alwaysVisible />
              </fieldset>

              <fieldset className="compact-fieldset">
                <legend>{onboarding("serviceAreas")}</legend>
                <div className="checkbox-grid checkbox-grid--states">
                  {INDIA_STATES_AND_UNION_TERRITORIES.map((state) => (
                    <label key={state}><input type="checkbox" checked={organization.serviceStates.includes(state)} onChange={() => toggleServiceState(state)} /><span dir="auto">{state}</span></label>
                  ))}
                </div>
              </fieldset>
              <p className="form-helper">{onboarding("companyDraftHelp")}</p>
            </div>
          ) : null}
        </fieldset>
      ) : null}

      {step === "review_visibility" ? (
        <fieldset className="onboarding-step">
          <legend>{onboarding("review")}</legend>
          <dl className="onboarding-review-list">
            <div><dt>{onboarding("reviewRole")}</dt><dd>{role ? onboarding(roleCopy[role].title) : onboarding("notSelected")}</dd></div>
            <div><dt>{onboarding("reviewName")}</dt><dd dir="auto">{identity.fullName}</dd></div>
            <div><dt>{onboarding("reviewLocation")}</dt><dd dir="auto">{identity.district}, {identity.state}</dd></div>
            <div><dt>{onboarding("reviewActivities")}</dt><dd>{selectedCategorySlugs.length + customCategoryLabels.length}</dd></div>
            {role === "agri_business" ? <div><dt>{onboarding("reviewOrganization")}</dt><dd dir="auto">{organization.organizationName}</dd></div> : null}
          </dl>
          {role !== "customer" ? (
            <div className="visibility-options">
              <label><input type="radio" name="visibility" checked={profileVisibility === "members"} onChange={() => setProfileVisibility("members")} /><span><strong>{onboarding("membersOnly")}</strong><small>{onboarding("membersOnlyHelp")}</small></span></label>
              <label><input type="radio" name="visibility" checked={profileVisibility === "public"} onChange={() => setProfileVisibility("public")} /><span><strong>{onboarding("publicProfile")}</strong><small>{onboarding("publicProfileHelp")}</small></span></label>
            </div>
          ) : null}
          <label className="consent-field">
            <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
            <span>
              {legal("consentBeforeTerms")}<Link href="/terms" target="_blank">{legal("terms")}</Link>{legal("consentBetweenTermsPrivacy")}<Link href="/privacy" target="_blank">{legal("privacy")}</Link>{legal("consentBetweenPrivacyRules")}<Link href="/community-rules" target="_blank">{legal("communityRules")}</Link>{legal("consentAfterRules")}
            </span>
          </label>
        </fieldset>
      ) : null}

      </div>

      <div className="onboarding-actions">
        <button
          className="button button--secondary"
          type="button"
          disabled={isPending || stepIndex === 0}
          onClick={() => setStep(ONBOARDING_STEPS[stepIndex - 1])}
        >
          <ChevronLeft size={16} aria-hidden="true" /> {common("back")}
        </button>
        <button className="button" type="button" disabled={isPending} onClick={continueFlow}>
          {isPending ? common("saving") : step === "review_visibility" ? common("finish") : common("continue")}
          {!isPending ? <ChevronRight size={16} aria-hidden="true" /> : null}
        </button>
      </div>
    </div>
  );
}
