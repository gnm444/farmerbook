"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "@/components/locale-provider";
import type { OrganizationForMember } from "@/features/organizations/types";
import { submitIncVerificationAction } from "./actions";
import type { IncVerificationClaimType } from "./types";

const optionalClaims = [
  ["gst_registration", "claimGst"],
  ["official_domain", "claimDomain"],
  ["facility_registration", "claimFacility"],
  ["industry_licence", "claimLicence"],
  ["bank_account_name", "claimBank"],
] as const satisfies readonly [IncVerificationClaimType, string][];

export function IncVerificationForm({
  organizations,
  requests,
}: {
  organizations: readonly OrganizationForMember[];
  requests: readonly { id: string; organization_id: string; status: string; requested_claim_types: string[]; created_at: string }[];
}) {
  const t = useTranslations("incSourcing");
  const errors = useTranslations("errors");
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await submitIncVerificationAction({
        organizationId: String(data.get("organizationId") ?? ""),
        requestedClaimTypes: [
          "organization_registration",
          "authorized_representative",
          ...data.getAll("requestedClaimTypes").map(String),
        ],
        officialDomain: String(data.get("officialDomain") ?? ""),
        applicantNote: String(data.get("applicantNote") ?? ""),
      });
      setStatus(result.ok ? t("verificationSubmitted") : errors("generic"));
    });
  }

  return (
    <section className="card inc-sourcing-form-card">
      <h2>{t("verificationTitle")}</h2>
      <p>{t("verificationHelp")}</p>
      <form className="form-grid" onSubmit={submit}>
        <label className="field"><span>{t("organization")}</span><select name="organizationId" required disabled={isPending}>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.displayName}</option>)}</select></label>
        <div className="inc-verification-claims">
          <label className="chip"><input type="checkbox" checked readOnly /> {t("claimOrganization")}</label>
          <label className="chip"><input type="checkbox" checked readOnly /> {t("claimRepresentative")}</label>
          {optionalClaims.map(([claim, key]) => <label className="chip" key={claim}><input type="checkbox" name="requestedClaimTypes" value={claim} disabled={isPending} /> {t(key)}</label>)}
        </div>
        <label className="field"><span>{t("officialDomain")}</span><input name="officialDomain" inputMode="url" placeholder="example.com" disabled={isPending} /></label>
        <label className="field"><span>{t("applicantNote")}</span><textarea name="applicantNote" maxLength={1000} dir="auto" disabled={isPending} /></label>
        <button className="button" type="submit" disabled={isPending}>{isPending ? t("submittingVerification") : t("submitVerification")}</button>
        {status ? <p className="form-status" role="status">{status}</p> : null}
      </form>
      {requests.map((request) => <p className="muted" key={request.id}>{t("verificationPending", { status: request.status })}</p>)}
    </section>
  );
}
