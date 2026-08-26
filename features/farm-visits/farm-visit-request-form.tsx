"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import { createFarmVisitRequestAction } from "./actions";
import { INDIA_STATES_AND_UNION_TERRITORIES } from "./schemas";

export function FarmVisitRequestForm({
  requesterName,
  requesterEmail,
}: {
  requesterName: string;
  requesterEmail: string;
}) {
  const t = useTranslations("farmVisits");
  const idempotencyKey = useRef<string | null>(null);
  const [resultCode, setResultCode] = useState<
    "CREATED" | "IDEMPOTENT_REPLAY" | "OPEN_REQUEST_EXISTS" | "BOT_IGNORED" | null
  >(null);
  const [error, setError] = useState("");
  const [visitorType, setVisitorType] = useState("individual");
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    idempotencyKey.current ??= crypto.randomUUID();
    setError("");
    startTransition(async () => {
      const result = await createFarmVisitRequestAction({
        phone: form.get("phone"),
        addressLine1: form.get("addressLine1"),
        addressLine2: form.get("addressLine2"),
        locality: form.get("locality"),
        district: form.get("district"),
        state: form.get("state"),
        postalCode: form.get("postalCode"),
        farmingInterest: form.get("farmingInterest"),
        partySize: form.get("partySize"),
        preferredSchedule: form.get("preferredSchedule"),
        visitorType: form.get("visitorType"),
        organizationName: form.get("organizationName"),
        contactRole: form.get("contactRole"),
        notes: form.get("notes"),
        consent: form.get("consent") === "on",
        website: form.get("website"),
        idempotencyKey: idempotencyKey.current,
      });
      if (!result.ok) {
        setError(result.message || t("genericError"));
        return;
      }
      setResultCode(result.code);
    });
  }

  if (resultCode) {
    const existing = resultCode === "OPEN_REQUEST_EXISTS";
    return (
      <div className="farm-visits-success" role="status">
        <CheckCircle2 size={34} aria-hidden="true" />
        <h2>{existing ? t("existingTitle") : t("successTitle")}</h2>
        <p>{existing ? t("existingBody") : t("successBody")}</p>
      </div>
    );
  }

  return (
    <form className="farm-visits-form" onSubmit={submit}>
      <div>
        <h2>{t("requestHeading")}</h2>
        <p>{t("requestIntro")}</p>
      </div>

      <div className="form-row">
        <label className="field">
          <span>{t("accountName")}</span>
          <input className="input" value={requesterName} readOnly />
        </label>
        <label className="field">
          <span>{t("accountEmail")}</span>
          <input className="input" type="email" value={requesterEmail} readOnly />
        </label>
      </div>

      <label className="field">
        <span>{t("visitorType")}</span>
        <select
          className="select"
          name="visitorType"
          value={visitorType}
          onChange={(event) => setVisitorType(event.target.value)}
          required
        >
          <option value="individual">{t("visitorIndividual")}</option>
          <option value="school">{t("visitorSchool")}</option>
          <option value="fpo">{t("visitorFpo")}</option>
          <option value="corporate">{t("visitorCorporate")}</option>
          <option value="other">{t("visitorOther")}</option>
        </select>
      </label>
      {visitorType === "school" || visitorType === "fpo" || visitorType === "corporate" ? (
        <div className="form-row">
          <label className="field">
            <span>{t("organizationName")}</span>
            <input className="input" name="organizationName" minLength={2} maxLength={160} required dir="auto" />
          </label>
          <label className="field">
            <span>{t("contactRole")}</span>
            <input className="input" name="contactRole" minLength={2} maxLength={100} required dir="auto" />
          </label>
        </div>
      ) : null}

      <label className="field">
        <span>{t("phone")}</span>
        <input
          className="input"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+919876543210"
          pattern="\+91[6-9][0-9]{9}"
          required
        />
        <small>{t("phoneHelp")}</small>
      </label>

      <label className="field">
        <span>{t("addressLine1")}</span>
        <input
          className="input"
          name="addressLine1"
          autoComplete="address-line1"
          minLength={4}
          maxLength={160}
          required
          dir="auto"
        />
      </label>
      <label className="field">
        <span>{t("addressLine2")}</span>
        <input
          className="input"
          name="addressLine2"
          autoComplete="address-line2"
          maxLength={160}
          dir="auto"
        />
      </label>

      <div className="form-row">
        <label className="field">
          <span>{t("locality")}</span>
          <input className="input" name="locality" autoComplete="address-level2" minLength={2} maxLength={100} required dir="auto" />
        </label>
        <label className="field">
          <span>{t("district")}</span>
          <input className="input" name="district" minLength={2} maxLength={100} required dir="auto" />
        </label>
      </div>

      <div className="form-row">
        <label className="field">
          <span>{t("state")}</span>
          <select className="select" name="state" autoComplete="address-level1" defaultValue="" required>
            <option value="" disabled>{t("chooseState")}</option>
            {INDIA_STATES_AND_UNION_TERRITORIES.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("postalCode")}</span>
          <input
            className="input"
            name="postalCode"
            inputMode="numeric"
            autoComplete="postal-code"
            pattern="[1-9][0-9]{5}"
            maxLength={6}
            required
          />
        </label>
      </div>

      <div className="form-row">
        <label className="field">
          <span>{t("interest")}</span>
          <select className="select" name="farmingInterest" defaultValue="both" required>
            <option value="organic">{t("interestOrganic")}</option>
            <option value="natural">{t("interestNatural")}</option>
            <option value="both">{t("interestBoth")}</option>
            <option value="general">{t("interestGeneral")}</option>
          </select>
        </label>
        <label className="field">
          <span>{t("partySize")}</span>
          <input className="input" name="partySize" type="number" min={1} max={20} defaultValue={1} required />
        </label>
      </div>

      <label className="field">
        <span>{t("preferredSchedule")}</span>
        <select className="select" name="preferredSchedule" defaultValue="either" required>
          <option value="weekday">{t("scheduleWeekday")}</option>
          <option value="weekend">{t("scheduleWeekend")}</option>
          <option value="either">{t("scheduleEither")}</option>
        </select>
      </label>

      <label className="field">
        <span>{t("notes")}</span>
        <textarea className="textarea" name="notes" maxLength={500} placeholder={t("notesPlaceholder")} dir="auto" />
      </label>

      <label className="farm-visits-consent">
        <input name="consent" type="checkbox" required />
        <span>{t("consent")}</span>
      </label>
      <label className="market-honeypot" aria-hidden="true">
        {t("website")}
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button button--full" type="submit" disabled={isPending}>
        <Send size={17} aria-hidden="true" />
        {isPending ? t("sending") : t("submit")}
      </button>
      <p className="farm-visits-private">{t("privateNotice")}</p>
    </form>
  );
}
