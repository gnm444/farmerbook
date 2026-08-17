"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Clock3, FileCheck2, FileWarning, Upload } from "lucide-react";
import type { FarmingMethod } from "@/lib/types";
import { submitOrganicCertificationAction } from "./organic-certification-actions";
import {
  NON_CERTIFIED_ORGANIC_LABEL,
  type OrganicCertificationSubmission,
} from "./organic-certification";
import {
  removeOrganicCertificate,
  uploadOrganicCertificate,
} from "./organic-certification-upload";

export function OrganicCertificationForm({
  farmingMethod,
  initialSubmission,
}: {
  farmingMethod?: FarmingMethod;
  initialSubmission: OrganicCertificationSubmission | null;
}) {
  const [submission, setSubmission] = useState(initialSubmission);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();
  const status = submission?.status ?? "not_submitted";
  const maySubmit = farmingMethod === "organic"
    && status !== "pending"
    && status !== "verified";

  return (
    <section className="card settings-card organic-certification-form" aria-labelledby="organic-certification-title">
      <div className="organic-certification-form__heading">
        <span><FileCheck2 aria-hidden="true" /></span>
        <div>
          <p className="eyebrow">Document verification</p>
          <h2 id="organic-certification-title">Organic certification paperwork</h2>
        </div>
      </div>
      <p>
        Selecting “Organic practices” describes your farming method. FarmerBook
        shows “Certified organic” only after you upload a certificate and an
        administrator verifies it.
      </p>

      {status === "verified" ? (
        <div className="organic-certification-state organic-certification-state--verified" role="status">
          <BadgeCheck aria-hidden="true" />
          <span><strong>Certified organic</strong>Your uploaded paperwork was verified.</span>
        </div>
      ) : status === "pending" ? (
        <div className="organic-certification-state organic-certification-state--pending" role="status">
          <Clock3 aria-hidden="true" />
          <span><strong>Paperwork under review</strong>Your public label remains non-certified until approval.</span>
        </div>
      ) : (
        <div className="organic-certification-state organic-certification-state--unverified" role="status">
          <FileWarning aria-hidden="true" />
          <span>
            <strong>{NON_CERTIFIED_ORGANIC_LABEL}</strong>
            {status === "rejected"
              ? submission?.reviewerNote || "The last submission was not approved. Upload valid paperwork to try again."
              : status === "revoked"
                ? "The previous approval no longer applies. Upload current paperwork to request a new review."
                : "No verified organic certificate is on file."}
          </span>
        </div>
      )}

      {farmingMethod !== "organic" ? (
        <p className="form-helper">Select “Organic practices” above and save your profile before uploading certification paperwork.</p>
      ) : null}

      {maySubmit ? (
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (!file) {
              setError("Choose your organic certificate file first.");
              return;
            }
            setError("");
            setNotice("");
            startTransition(async () => {
              let uploadedPath: string | undefined;
              try {
                const uploaded = await uploadOrganicCertificate(file);
                uploadedPath = uploaded.path;
                const result = await submitOrganicCertificationAction({
                  path: uploaded.path,
                  mimeType: file.type,
                  sizeBytes: file.size,
                });
                if (!result.ok) {
                  await removeOrganicCertificate(uploaded.path);
                  setError(result.message);
                  return;
                }
                setSubmission({
                  id: submission?.id ?? crypto.randomUUID(),
                  status: "pending",
                  evidencePath: uploaded.path,
                  evidenceMimeType: file.type,
                  evidenceSizeBytes: file.size,
                  submittedAt: new Date().toISOString(),
                });
                setFile(null);
                setNotice("Paperwork submitted. FarmerBook will show Certified organic only after administrator approval.");
              } catch (uploadError) {
                if (uploadedPath) await removeOrganicCertificate(uploadedPath);
                setError(uploadError instanceof Error ? uploadError.message : "The certificate could not be submitted.");
              }
            });
          }}
        >
          <label className="field" htmlFor="organic-certificate-file">
            <span>Certificate file</span>
            <input
              className="input"
              id="organic-certificate-file"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              disabled={isPending}
              required
            />
          </label>
          <p className="form-helper">PDF, JPEG or PNG · maximum 10 MB · kept private from public visitors.</p>
          <div>
            <button className="button" type="submit" disabled={isPending || !file}>
              <Upload size={17} aria-hidden="true" />
              {isPending ? "Submitting…" : "Submit for verification"}
            </button>
          </div>
        </form>
      ) : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="form-success" role="status">{notice}</p> : null}
    </section>
  );
}
