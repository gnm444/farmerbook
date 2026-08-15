"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { submitAcquisitionConsentAction } from "./actions";
import { OUTREACH_CONSENT_POLICY_VERSION } from "./schemas";
import { INDIA_STATES_AND_UNION_TERRITORIES } from "@/lib/india/regions";
import {
  localeRegistry,
  type SupportedLocale,
} from "@/lib/i18n/locales";
import { localeNeedsNativeReview } from "@/lib/i18n/review-status";
import { useLocale, useTranslations } from "@/components/locale-provider";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          action: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

const roleOptions = [
  ["farmer", "roleFarmer"],
  ["customer", "roleCustomer"],
  ["wholesaler", "roleWholesaler"],
  ["agri_business", "roleCompany"],
] as const;

type SuccessState = {
  prospectId: string;
};

export function ConsentJoinForm({
  consentNonce,
  turnstileSiteKey,
  locales,
}: {
  consentNonce: string;
  turnstileSiteKey: string;
  locales: readonly SupportedLocale[];
}) {
  const t = useTranslations("outreach");
  const common = useTranslations("common");
  const legal = useTranslations("legal");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, readonly string[]>>({});
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const rawId = useId();
  const formId = rawId.replaceAll(":", "");

  useEffect(() => {
    if (!turnstileReady || !window.turnstile || !turnstileContainer.current) return;
    if (widgetId.current) window.turnstile.remove(widgetId.current);
    widgetId.current = window.turnstile.render(turnstileContainer.current, {
      sitekey: turnstileSiteKey,
      action: "farmerbook_join",
      callback: setTurnstileToken,
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
    return () => {
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [turnstileReady, turnstileSiteKey]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await submitAcquisitionConsentAction({
        role: form.get("role"),
        fullName: form.get("fullName"),
        businessName: form.get("businessName") || undefined,
        state: form.get("state"),
        district: form.get("district"),
        preferredLocale: form.get("preferredLocale"),
        preferredChannel: form.get("preferredChannel"),
        email: form.get("email") || undefined,
        phone: form.get("phone") || undefined,
        introductionConsent: form.get("introductionConsent") === "on",
        followupConsent: form.get("followupConsent") === "on",
        consentPolicyVersion: OUTREACH_CONSENT_POLICY_VERSION,
        consentNonce,
        turnstileToken,
        campaignCode: form.get("campaignCode") || undefined,
      });
      if (!result.ok) {
        setError(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        if (widgetId.current && window.turnstile) {
          window.turnstile.reset(widgetId.current);
          setTurnstileToken("");
        }
        return;
      }
      setSuccess({
        prospectId: result.data.prospectId,
      });
    });
  }

  if (success) {
    return (
      <section className="consent-success card" role="status">
        <CheckCircle2 size={40} aria-hidden="true" />
        <p className="eyebrow">{t("requestReceived")}</p>
        <h2>{t("confirmNext")}</h2>
        <p>{t("confirmationQueued")}</p>
        <p className="muted">{t("reference", { id: success.prospectId })}</p>
        <Link className="button" href="/signup">
          {t("createAccount")}
        </Link>
      </section>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setTurnstileReady(true)}
      />
      <form className="consent-form card" onSubmit={submit} noValidate>
        {localeNeedsNativeReview(locale) ? (
          <p className="beta-notice" role="status">{t("betaDisclosure")}</p>
        ) : null}
        <div className="consent-form__heading">
          <div>
            <p className="eyebrow">{t("formEyebrow")}</p>
            <h2>{t("formTitle")}</h2>
          </div>
          <ShieldCheck aria-hidden="true" />
        </div>

        {error ? (
          <div className="form-error" role="alert" tabIndex={-1}>
            {error}
          </div>
        ) : null}

        <div className="form-grid form-grid--two">
          <label className="field" htmlFor={`${formId}-role`}>
            <span>{t("role")}</span>
            <select id={`${formId}-role`} name="role" defaultValue="" required>
              <option value="" disabled>{t("selectRole")}</option>
              {roleOptions.map(([value, key]) => (
                <option value={value} key={value}>{t(key)}</option>
              ))}
            </select>
            {fieldErrors.role?.[0] ? <small>{fieldErrors.role[0]}</small> : null}
          </label>
          <label className="field" htmlFor={`${formId}-name`}>
            <span>{t("fullName")}</span>
            <input id={`${formId}-name`} name="fullName" autoComplete="name" required maxLength={100} />
            {fieldErrors.fullName?.[0] ? <small>{fieldErrors.fullName[0]}</small> : null}
          </label>
          <label className="field" htmlFor={`${formId}-business`}>
            <span>{t("businessName")} <em>{common("optional")}</em></span>
            <input id={`${formId}-business`} name="businessName" autoComplete="organization" maxLength={120} />
          </label>
          <label className="field" htmlFor={`${formId}-state`}>
            <span>{t("state")}</span>
            <select id={`${formId}-state`} name="state" defaultValue="" required>
              <option value="" disabled>{t("selectState")}</option>
              {INDIA_STATES_AND_UNION_TERRITORIES.map((state) => (
                <option value={state} key={state}>{state}</option>
              ))}
            </select>
          </label>
          <label className="field" htmlFor={`${formId}-district`}>
            <span>{t("district")}</span>
            <input id={`${formId}-district`} name="district" autoComplete="address-level2" required maxLength={100} />
          </label>
          <label className="field" htmlFor={`${formId}-locale`}>
            <span>{t("preferredLanguage")}</span>
            <select id={`${formId}-locale`} name="preferredLocale" defaultValue="en-IN" required>
              {locales.map((locale) => (
                <option value={locale} lang={locale} key={locale}>
                  {localeRegistry[locale].nativeName} · {localeRegistry[locale].englishName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <input type="hidden" name="preferredChannel" value="email" />
        <div className="form-grid form-grid--two">
          <label className="field" htmlFor={`${formId}-email`}>
            <span>{t("email")}</span>
            <input id={`${formId}-email`} name="email" type="email" autoComplete="email" required maxLength={254} />
            {fieldErrors.email?.[0] ? <small>{fieldErrors.email[0]}</small> : null}
          </label>
          <label className="field" htmlFor={`${formId}-phone`}>
            <span>{t("phone")} <em>{common("optional")}</em></span>
            <input
              id={`${formId}-phone`}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+919876543210"
              pattern="\+91[6-9][0-9]{9}"
            />
            {fieldErrors.phone?.[0] ? <small>{fieldErrors.phone[0]}</small> : null}
          </label>
        </div>
        <p className="muted">
          Email is the only enabled invitation channel. An optional phone number
          is stored privately for future consent workflows; WhatsApp is not enabled.
        </p>

        <div className="consent-statements">
          <label>
            <input type="checkbox" name="introductionConsent" required />
            <span>
              {t("introductionConsent")}
            </span>
          </label>
          <label>
            <input type="checkbox" name="followupConsent" />
            <span>
              {t("followupConsent")}
            </span>
          </label>
        </div>

        <input type="hidden" name="campaignCode" value="direct-join" />
        <div className="turnstile-slot" ref={turnstileContainer} aria-label="Spam protection" />
        <button className="button button--large" type="submit" disabled={isPending || !turnstileToken}>
          {isPending ? t("recording") : t("recordRequest")}
        </button>
        <p className="consent-fine-print">
          <LockKeyhole size={14} aria-hidden="true" />
          {t("publicContactNotice")} {t("policyLinks")} <Link href="/privacy">{legal("privacy")}</Link> · <Link href="/terms">{legal("terms")}</Link>
        </p>
      </form>
    </>
  );
}
