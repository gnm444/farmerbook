"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import type { OrganizationSummary } from "@/features/organizations/types";
import { EcoFriendlyClaimNotice } from "@/features/organizations/eco-friendly-claim-notice";
import { CompanySectorOptions } from "@/features/organizations/company-sector-options";
import { createBusinessOfferAction } from "./actions";
import {
  OFFER_KINDS,
  OFFER_PRICE_MODELS,
  OFFER_PRICE_UNITS,
} from "./types";

const kindMessageNames = { product: "kindProduct", service: "kindService", rental: "kindRental", promotion: "kindPromotion", finance: "kindFinance", insurance: "kindInsurance", advisory: "kindAdvisory", training: "kindTraining", support: "kindSupport" } as const;
const modelMessageNames = { fixed: "modelFixed", range: "modelRange", quote: "modelQuote", free: "modelFree", subsidized: "modelSubsidized" } as const;

export function OfferCreateForm({ organization }: { organization: OrganizationSummary }) {
  const router = useRouter();
  const t = useTranslations("offers");
  const errors = useTranslations("errors");
  const [priceModel, setPriceModel] = useState<(typeof OFFER_PRICE_MODELS)[number]>("quote");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const priced = priceModel === "fixed" || priceModel === "range" || priceModel === "subsidized";

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    const selectedPriceModel = String(form.get("priceModel"));
    const offer = {
      organizationId: organization.id,
      kind: form.get("kind"),
      contentLocale: form.get("contentLocale"),
      title: form.get("title"),
      description: form.get("description"),
      terms: form.get("terms"),
      categorySlugs: form.getAll("categorySlugs"),
      serviceAreas: organization.serviceAreas.length
        ? organization.serviceAreas
        : [{ state: organization.state, district: organization.district }],
      validFrom: form.get("validFrom"),
      validUntil: form.get("validUntil"),
      publicationIntent: form.get("publicationIntent"),
      priceModel: selectedPriceModel,
      ...(priced
        ? {
            currency: "INR",
            priceMin: form.get("priceMin"),
            ...(selectedPriceModel === "range" ? { priceMax: form.get("priceMax") } : {}),
            priceUnit: form.get("priceUnit"),
          }
        : {}),
    };
    startTransition(async () => {
      const result = await createBusinessOfferAction(offer);
      if (!result.ok) {
        setError(errors("generic"));
        return;
      }
      formElement.reset();
      setPriceModel("quote");
      router.refresh();
    });
  }

  return (
    <form className="card" onSubmit={submit} aria-label={t("createAria", { name: organization.displayName })}>
      <p className="eyebrow">{t("newOffer")}</p>
      <h2>{t("createOffer")}</h2>
      <p>{t("directLeadHelp")}</p>
      {error ? <p className="notice notice--error" role="alert">{error}</p> : null}
      <div className="form-row">
        <label className="field">
          <span>{t("offerKind")}</span>
          <select className="input" name="kind">
            {OFFER_KINDS.map((kind) => <option key={kind} value={kind}>{t(kindMessageNames[kind])}</option>)}
          </select>
        </label>
        <label className="field">
          <span>{t("originalLanguage")}</span>
          <select className="input" name="contentLocale" defaultValue="en-IN">
            {SUPPORTED_LOCALES.map((locale) => <option key={locale} value={locale}>{locale}</option>)}
          </select>
        </label>
      </div>
      <label className="field">
        <span>{t("title")}</span>
        <input className="input" name="title" minLength={5} maxLength={120} required dir="auto" />
      </label>
      <label className="field">
        <span>{t("description")}</span>
        <textarea className="textarea" name="description" minLength={20} maxLength={2000} required dir="auto" />
      </label>
      <label className="field">
        <span>{t("termsOptional")}</span>
        <textarea className="textarea" name="terms" maxLength={2000} dir="auto" />
      </label>
      <label className="field">
        <span>{t("categories")}</span>
        <select className="input" name="categorySlugs" multiple required size={6}>
          <CompanySectorOptions />
        </select>
      </label>
      <EcoFriendlyClaimNotice alwaysVisible />
      <div className="form-row">
        <label className="field">
          <span>{t("validFrom")}</span>
          <input className="input" name="validFrom" type="date" required />
        </label>
        <label className="field">
          <span>{t("validUntil")}</span>
          <input className="input" name="validUntil" type="date" required />
        </label>
      </div>
      <label className="field">
        <span>{t("priceModel")}</span>
        <select
          className="input"
          name="priceModel"
          value={priceModel}
          onChange={(event) => setPriceModel(event.target.value as typeof priceModel)}
        >
          {OFFER_PRICE_MODELS.map((model) => <option key={model} value={model}>{t(modelMessageNames[model])}</option>)}
        </select>
      </label>
      {priced ? (
        <div className="form-row">
          <label className="field">
            <span>{priceModel === "range" ? t("minimumPrice") : t("price")}</span>
            <input className="input" name="priceMin" type="number" min="0.01" step="0.01" required />
          </label>
          {priceModel === "range" ? (
            <label className="field">
              <span>{t("maximumPrice")}</span>
              <input className="input" name="priceMax" type="number" min="0.01" step="0.01" required />
            </label>
          ) : null}
          <label className="field">
            <span>{t("unit")}</span>
            <select className="input" name="priceUnit">
              {OFFER_PRICE_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </label>
        </div>
      ) : null}
      <label className="field">
        <span>{t("nextStep")}</span>
        <select className="input" name="publicationIntent" defaultValue="draft">
          <option value="draft">{t("saveDraft")}</option>
          <option value="submit">{t("submitPublication")}</option>
        </select>
      </label>
      <p className="muted">
        {t("moderationHelp")}
      </p>
      <button className="button" type="submit" disabled={isPending}>
        <Plus size={16} aria-hidden="true" /> {isPending ? t("saving") : t("saveOffer")}
      </button>
    </form>
  );
}
