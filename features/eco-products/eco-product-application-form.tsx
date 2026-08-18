"use client";

import { useState, type FormEvent } from "react";
import { ClipboardCopy, Mail, Send } from "lucide-react";
import { useLocale, useTranslations } from "@/components/locale-provider";
import {
  ECO_FRIENDLY_COMPANY_SECTOR_SLUGS,
} from "@/lib/agriculture/company-sectors";
import {
  ecoSupplierFallbackLanguageProps,
  ecoSupplierRoleMessageName,
  ecoSupplierSectorMessageName,
  ecoSupplierUsesEnglishFallback,
} from "@/lib/i18n/eco-suppliers";
import {
  FARMERBOOK_CONTACT_EMAIL,
  FARMERBOOK_CONTACT_PHONE,
  FARMERBOOK_CONTACT_PHONE_DISPLAY,
} from "@/lib/contact";
import { buildEcoProductApplicationEmail } from "./application-email";
import {
  ECO_PRODUCT_BUSINESS_ROLES,
  ecoProductIntakeSchema,
} from "./intake-schema";

type PreparedApplication = ReturnType<typeof buildEcoProductApplicationEmail>;

export function EcoProductApplicationForm() {
  const locale = useLocale();
  const t = useTranslations("ecoSuppliers");
  const fallbackLanguageProps = ecoSupplierFallbackLanguageProps(locale);
  const [prepared, setPrepared] = useState<PreparedApplication | null>(null);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  function prepareApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = ecoProductIntakeSchema.safeParse({
      businessRole: form.get("businessRole"),
      organizationName: form.get("organizationName"),
      representativeName: form.get("representativeName"),
      email: form.get("email"),
      phone: form.get("phone"),
      location: form.get("location"),
      websiteUrl: form.get("websiteUrl"),
      categorySlugs: form.getAll("categorySlugs"),
      productName: form.get("productName"),
      productDescription: form.get("productDescription"),
      environmentalClaims: form.get("environmentalClaims"),
      evidenceLinks: form.get("evidenceLinks"),
      consent: form.get("consent") === "on",
    });

    setCopyStatus("");
    if (!parsed.success) {
      setPrepared(null);
      setError(parsed.error.issues[0]?.message ?? "Review the application fields.");
      return;
    }

    setError("");
    setPrepared(buildEcoProductApplicationEmail(parsed.data));
  }

  async function copySummary() {
    if (!prepared) return;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard is unavailable.");
      await navigator.clipboard.writeText(prepared.summary);
      setCopyStatus(t("copied"));
    } catch {
      setCopyStatus(t("copyFailed"));
    }
  }

  return (
    <form
      className="card company-onboarding-fields"
      onSubmit={prepareApplication}
      onChange={() => {
        setPrepared(null);
        setCopyStatus("");
      }}
      aria-label={t("eyebrow")}
      {...fallbackLanguageProps}
    >
      {ecoSupplierUsesEnglishFallback(locale) ? (
        <p className="notice">{t("fallbackNotice")}</p>
      ) : null}
      <fieldset className="compact-fieldset">
        <legend>{t("roleHeading")}</legend>
        <div className="checkbox-grid">
          {ECO_PRODUCT_BUSINESS_ROLES.map((role, index) => {
            const messageName = ecoSupplierRoleMessageName(role);
            return (
              <label key={role}>
                <input
                  name="businessRole"
                  type="radio"
                  value={role}
                  defaultChecked={index === 0}
                  required
                />
                <span>{messageName ? t(messageName) : role}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="form-grid form-grid--two">
        <label className="field">
          <span>{t("businessName")}</span>
          <input className="input" name="organizationName" minLength={2} maxLength={120} required dir="auto" />
        </label>
        <label className="field">
          <span>{t("contactName")}</span>
          <input className="input" name="representativeName" minLength={2} maxLength={120} required dir="auto" />
        </label>
        <label className="field">
          <span>{t("email")}</span>
          <input className="input" name="email" type="email" maxLength={254} required inputMode="email" />
        </label>
        <label className="field">
          <span>{t("phone")}</span>
          <input className="input" name="phone" type="tel" maxLength={21} inputMode="tel" />
        </label>
        <label className="field">
          <span>{t("location")}</span>
          <input className="input" name="location" minLength={2} maxLength={160} required dir="auto" />
        </label>
        <label className="field">
          <span>{t("websiteOptional")}</span>
          <input className="input" name="websiteUrl" type="url" maxLength={300} placeholder="https://" inputMode="url" />
        </label>
      </div>

      <fieldset className="compact-fieldset">
        <legend>{t("categoriesHeading")}</legend>
        <p className="form-helper">{t("categoriesHelp")}</p>
        <div className="checkbox-grid">
          {ECO_FRIENDLY_COMPANY_SECTOR_SLUGS.map((slug) => {
            const messageName = ecoSupplierSectorMessageName(slug);
            return (
              <label key={slug}>
                <input name="categorySlugs" type="checkbox" value={slug} />
                <span>{messageName ? t(messageName) : slug}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="field">
        <span>{t("productName")}</span>
        <input className="input" name="productName" minLength={2} maxLength={120} required dir="auto" />
      </label>
      <label className="field">
        <span>{t("productDescription")}</span>
        <textarea className="textarea" name="productDescription" minLength={30} maxLength={600} required dir="auto" />
      </label>
      <label className="field">
        <span>{t("sellerDeclaredLabel")}</span>
        <textarea className="textarea" name="environmentalClaims" maxLength={400} dir="auto" />
        <small>{t("sellerDeclaredDisclosure")}</small>
      </label>
      <label className="field">
        <span>{t("evidenceLinks")}</span>
        <textarea className="textarea" name="evidenceLinks" maxLength={500} dir="auto" />
        <small>{t("evidenceHelp")}</small>
      </label>

      <label className="consent-field">
        <input name="consent" type="checkbox" required />
        <span><strong>{t("consentLabel")}</strong><br />{t("consentHelp")}</span>
      </label>
      <p className="muted">{t("privacyDisclosure")}</p>
      {error ? <p className="notice notice--error" role="alert">{error}</p> : null}
      <button className="button" type="submit">
        <Send size={16} aria-hidden="true" /> {t("prepareEmail")}
      </button>

      {prepared ? (
        <section className="notice" aria-live="polite">
          <div>
            <strong>{t("emailHelp")}</strong>
            <p><strong>{prepared.claimAssessment.statusLabel}</strong></p>
            <p><strong>{prepared.evidenceStateLabel}</strong></p>
            <p>
              <a href={`mailto:${FARMERBOOK_CONTACT_EMAIL}`}>{FARMERBOOK_CONTACT_EMAIL}</a>
              {" · "}
              <a href={`tel:${FARMERBOOK_CONTACT_PHONE}`}>{FARMERBOOK_CONTACT_PHONE_DISPLAY}</a>
            </p>
            <div className="button-row">
              <a className="button" href={prepared.href}>
                <Mail size={16} aria-hidden="true" /> {t("openEmail")}
              </a>
              <button className="button button--secondary" type="button" onClick={copySummary}>
                <ClipboardCopy size={16} aria-hidden="true" /> {t("copySummary")}
              </button>
            </div>
            {copyStatus ? <p role="status">{copyStatus}</p> : null}
            <textarea
              className="textarea"
              aria-label={t("copySummary")}
              readOnly
              rows={14}
              value={prepared.summary}
            />
          </div>
        </section>
      ) : null}
    </form>
  );
}
