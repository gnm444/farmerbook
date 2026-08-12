"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useLocale, useTranslations } from "@/components/locale-provider";
import { AGRICULTURE_CATEGORIES } from "@/lib/agriculture/categories";
import type { OrganizationForMember } from "@/features/organizations/types";
import { createIncSourcingRequestAction } from "./actions";
import { INC_SOURCING_CADENCES, INC_SOURCING_UNITS } from "./types";

const cadenceMessageNames = {
  one_time: "cadenceOneTime",
  weekly: "cadenceWeekly",
  monthly: "cadenceMonthly",
  seasonal: "cadenceSeasonal",
  ongoing: "cadenceOngoing",
} as const;

export function IncSourcingCreateForm({
  organizations,
}: {
  organizations: readonly OrganizationForMember[];
}) {
  const locale = useLocale();
  const t = useTranslations("incSourcing");
  const errors = useTranslations("errors");
  const [priceModel, setPriceModel] = useState<"quote" | "target" | "range">("quote");
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();
  const categories = AGRICULTURE_CATEGORIES.filter((category) => category.selectable);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const publicationIntent = submitter?.value === "submit" ? "submit" : "draft";
    const priceMin = String(data.get("priceMin") ?? "");
    const priceMax = String(data.get("priceMax") ?? "");
    startTransition(async () => {
      const result = await createIncSourcingRequestAction({
        organizationId: String(data.get("organizationId") ?? ""),
        contentLocale: locale,
        productName: String(data.get("productName") ?? ""),
        varietyOrGrade: String(data.get("varietyOrGrade") ?? ""),
        qualityRequirements: String(data.get("qualityRequirements") ?? ""),
        quantityMin: String(data.get("quantityMin") ?? ""),
        quantityMax: String(data.get("quantityMax") ?? ""),
        quantityUnit: String(data.get("quantityUnit") ?? ""),
        cadence: String(data.get("cadence") ?? ""),
        deliveryMode: String(data.get("deliveryMode") ?? ""),
        destinationState: String(data.get("destinationState") ?? ""),
        destinationDistrict: String(data.get("destinationDistrict") ?? ""),
        opensOn: String(data.get("opensOn") ?? ""),
        closesOn: String(data.get("closesOn") ?? ""),
        needBy: String(data.get("needBy") ?? ""),
        priceModel,
        currency: priceModel === "quote" ? null : "INR",
        priceMin: priceModel === "quote" ? null : priceMin,
        priceMax: priceModel === "range" ? priceMax : null,
        priceUnit: priceModel === "quote" ? null : String(data.get("priceUnit") ?? ""),
        paymentTerms: String(data.get("paymentTerms") ?? ""),
        requiredLicenceScope: String(data.get("requiredLicenceScope") ?? ""),
        categorySlugs: data.getAll("categorySlugs").map(String),
        publicationIntent,
      });
      if (!result.ok) {
        setStatus(result.code === "VERIFICATION_REQUIRED" ? t("publicationBlocked") : errors("generic"));
        return;
      }
      setStatus(
        result.data.publicationState === "published"
          ? t("createdPublished")
          : result.data.moderationState === "pending"
            ? t("createdReview")
            : t("createdDraft"),
      );
      form.reset();
      setPriceModel("quote");
    });
  }

  return (
    <section className="card inc-sourcing-form-card">
      <h2>{t("createTitle")}</h2>
      <p>{t("createHelp")}</p>
      <form className="form-grid" onSubmit={submit}>
        <label className="field"><span>{t("organization")}</span><select name="organizationId" required disabled={isPending}>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.displayName}</option>)}</select></label>
        <div className="form-grid form-grid--two">
          <label className="field"><span>{t("productName")}</span><input name="productName" required minLength={2} maxLength={120} dir="auto" placeholder={t("productPlaceholder")} disabled={isPending} /></label>
          <label className="field"><span>{t("varietyGrade")}</span><input name="varietyOrGrade" maxLength={160} dir="auto" disabled={isPending} /></label>
          <label className="field"><span>{t("quantityMin")}</span><input name="quantityMin" type="number" min="0.01" step="0.01" required disabled={isPending} /></label>
          <label className="field"><span>{t("quantityMax")}</span><input name="quantityMax" type="number" min="0.01" step="0.01" disabled={isPending} /></label>
          <label className="field"><span>{t("unit")}</span><select name="quantityUnit" defaultValue="kg" required disabled={isPending}>{INC_SOURCING_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
          <label className="field"><span>{t("cadence")}</span><select name="cadence" defaultValue="one_time" required disabled={isPending}>{INC_SOURCING_CADENCES.map((cadence) => <option key={cadence} value={cadence}>{t(cadenceMessageNames[cadence])}</option>)}</select></label>
          <label className="field"><span>{t("deliveryMode")}</span><select name="deliveryMode" defaultValue="either" required disabled={isPending}><option value="collect">{t("deliveryCollect")}</option><option value="deliver">{t("deliveryDeliver")}</option><option value="either">{t("deliveryEither")}</option></select></label>
          <label className="field"><span>{t("destinationState")}</span><input name="destinationState" required minLength={2} maxLength={80} dir="auto" disabled={isPending} /></label>
          <label className="field"><span>{t("destinationDistrict")}</span><input name="destinationDistrict" maxLength={80} dir="auto" disabled={isPending} /></label>
          <label className="field"><span>{t("opensOn")}</span><input name="opensOn" type="date" required disabled={isPending} /></label>
          <label className="field"><span>{t("closesOn")}</span><input name="closesOn" type="date" required disabled={isPending} /></label>
          <label className="field"><span>{t("needBy")}</span><input name="needBy" type="date" required disabled={isPending} /></label>
        </div>
        <label className="field"><span>{t("qualityRequirements")}</span><textarea name="qualityRequirements" maxLength={1200} dir="auto" disabled={isPending} /></label>
        <label className="field"><span>{t("categories")}</span><select name="categorySlugs" multiple required size={8} disabled={isPending}>{categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
        <div className="form-grid form-grid--two">
          <label className="field"><span>{t("priceModel")}</span><select name="priceModel" value={priceModel} onChange={(event) => setPriceModel(event.target.value as typeof priceModel)} disabled={isPending}><option value="quote">{t("priceQuote")}</option><option value="target">{t("targetPrice")}</option><option value="range">{t("minimumPrice")}–{t("maximumPrice")}</option></select></label>
          {priceModel !== "quote" ? <label className="field"><span>{priceModel === "range" ? t("minimumPrice") : t("targetPrice")}</span><input name="priceMin" type="number" min="0.01" step="0.01" required disabled={isPending} /></label> : null}
          {priceModel === "range" ? <label className="field"><span>{t("maximumPrice")}</span><input name="priceMax" type="number" min="0.01" step="0.01" required disabled={isPending} /></label> : null}
          {priceModel !== "quote" ? <label className="field"><span>{t("priceUnit")}</span><select name="priceUnit" defaultValue="kg" required disabled={isPending}>{INC_SOURCING_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label> : null}
        </div>
        <label className="field"><span>{t("paymentTerms")}</span><textarea name="paymentTerms" maxLength={1000} dir="auto" disabled={isPending} /></label>
        <label className="field"><span>{t("licenceScope")}</span><input name="requiredLicenceScope" maxLength={120} aria-describedby="inc-licence-help" disabled={isPending} /><small id="inc-licence-help">{t("licenceHelp")}</small></label>
        <div className="form-actions">
          <button className="button button--secondary" type="submit" name="publicationIntent" value="draft" disabled={isPending}>{isPending ? t("creating") : t("saveDraft")}</button>
          <button className="button" type="submit" name="publicationIntent" value="submit" disabled={isPending}>{isPending ? t("creating") : t("submitPublish")}</button>
        </div>
        {status ? <p className="form-status" role="status">{status}</p> : null}
      </form>
    </section>
  );
}
