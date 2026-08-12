"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Building2, CheckCircle2 } from "lucide-react";
import { AGRICULTURE_COMPANY_SECTORS } from "@/lib/agriculture/company-sectors";
import { useTranslations } from "@/components/locale-provider";
import { createOrganizationAction } from "./actions";
import { ORGANIZATION_TYPES } from "./types";

const typeMessageNames = {
  manufacturer_brand: "typeManufacturerBrand", dealer_distributor: "typeDealerDistributor",
  retailer: "typeRetailer", wholesaler_trader: "typeWholesalerTrader",
  processor_exporter: "typeProcessorExporter", fpo_cooperative: "typeFpoCooperative",
  custom_hiring_rental_centre: "typeRentalCentre", logistics_warehouse: "typeLogisticsWarehouse",
  finance_insurance: "typeFinanceInsurance", advisory_training_research: "typeAdvisoryResearch",
  ngo: "typeNgo", government_support_body: "typeGovernmentSupport",
} as const;

export function OrganizationCreateForm() {
  const router = useRouter();
  const t = useTranslations("companies");
  const errors = useTranslations("errors");
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setCreated("");
    const state = String(form.get("state") ?? "");
    const district = String(form.get("district") ?? "");
    startTransition(async () => {
      const result = await createOrganizationAction({
        slug: form.get("slug"),
        displayName: form.get("displayName"),
        organizationType: form.get("organizationType"),
        description: form.get("description"),
        state,
        district,
        websiteUrl: form.get("websiteUrl"),
        sectorSlugs: form.getAll("sectorSlugs"),
        serviceAreas: [{ state, district }],
      });
      if (!result.ok) {
        setError(errors("generic"));
        return;
      }
      setCreated(result.data.slug);
      router.refresh();
    });
  }

  if (created) {
    return (
      <div className="card" role="status">
        <CheckCircle2 size={28} aria-hidden="true" />
        <h2>{t("created")}</h2>
        <p>{t("createdHelp")}</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit} aria-label={t("createAria")}>
      <p className="eyebrow">{t("onboarding")}</p>
      <h2>
        <Building2 size={21} aria-hidden="true" /> {t("createProfile")}
      </h2>
      <p>
        {t("publicFormPrivacy")}
      </p>
      {error ? <p className="notice notice--error" role="alert">{error}</p> : null}
      <div className="form-row">
        <label className="field">
          <span>{t("incName")}</span>
          <input className="input" name="displayName" minLength={2} maxLength={120} required dir="auto" />
        </label>
        <label className="field">
          <span>{t("publicSlug")}</span>
          <input className="input" name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" minLength={3} maxLength={80} required />
        </label>
      </div>
      <label className="field">
        <span>{t("organizationType")}</span>
        <select className="input" name="organizationType" required>
          {ORGANIZATION_TYPES.map((type) => (
            <option key={type} value={type}>{t(typeMessageNames[type])}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{t("provides")}</span>
        <textarea className="textarea" name="description" minLength={20} maxLength={1500} required dir="auto" />
      </label>
      <div className="form-row">
        <label className="field">
          <span>{t("state")}</span>
          <input className="input" name="state" minLength={2} maxLength={80} required dir="auto" />
        </label>
        <label className="field">
          <span>{t("district")}</span>
          <input className="input" name="district" minLength={2} maxLength={80} required dir="auto" />
        </label>
      </div>
      <label className="field">
        <span>{t("websiteOptional")}</span>
        <input className="input" name="websiteUrl" type="url" inputMode="url" placeholder="https://" />
      </label>
      <label className="field">
        <span>{t("agricultureSectors")}</span>
        <select className="input" name="sectorSlugs" multiple required size={8}>
          {AGRICULTURE_COMPANY_SECTORS.map((sector) => (
            <option key={sector.slug} value={sector.slug}>{sector.name}</option>
          ))}
        </select>
      </label>
      <p className="muted">{t("multiSelectHelp")}</p>
      <button className="button" type="submit" disabled={isPending}>
        {isPending ? t("creating") : t("createProfile")}
      </button>
    </form>
  );
}
