"use client";

import { useState, useTransition } from "react";
import {
  BadgeCheck,
  FileCheck2,
  RotateCcw,
  ShieldAlert,
  UserRoundX,
} from "lucide-react";
import type { FarmerProfile } from "@/lib/types";
import { Avatar, VerifiedBadge } from "@/components/ui";
import { moderateUserAction } from "./actions";
import { reviewOrganicCertificationAction } from "@/features/profiles/organic-certification-actions";
import type { OrganicCertificationSubmission } from "@/features/profiles/organic-certification";

type UserState = "active" | "suspended";
type VerificationState = "unverified" | "verified" | "rejected";

export function UserModeration({
  profile,
  organicCertification,
}: {
  profile: FarmerProfile;
  organicCertification: OrganicCertificationSubmission | null;
}) {
  const [status, setStatus] = useState<UserState>("active");
  const [verification, setVerification] = useState<VerificationState>(
    profile.verified ? "verified" : "unverified",
  );
  const [error, setError] = useState("");
  const [organicStatus, setOrganicStatus] = useState(organicCertification?.status ?? "not_submitted");
  const [organicNote, setOrganicNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function apply(action: "verify" | "reject" | "suspend" | "restore") {
    setError("");
    startTransition(async () => {
      const result = await moderateUserAction({
        userId: profile.id,
        action,
        note: `Administrator selected ${action} from the participant review page.`,
      });
      if (!result.ok) {
        setError(result.message ?? "The participant action could not be saved.");
        return;
      }
      if (action === "verify" || action === "reject") {
        setVerification(action === "verify" ? "verified" : "rejected");
      } else {
        setStatus(action === "suspend" ? "suspended" : "active");
      }
    });
  }

  function reviewOrganic(decision: "verified" | "rejected") {
    if (!organicCertification) return;
    setError("");
    startTransition(async () => {
      const result = await reviewOrganicCertificationAction({
        submissionId: organicCertification.id,
        decision,
        note: organicNote,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOrganicStatus(decision);
    });
  }

  return (
    <div className="admin-grid">
      <section className="card settings-card">
        <div className="person-row">
          <Avatar
            initials={profile.initials}
            imageUrl={profile.avatarUrl}
            role={profile.accountRole}
            size="large"
          />
          <div className="person-row__copy">
            <h2 style={{ margin: 0 }}>
              {profile.fullName}{" "}
              {verification === "verified" ? <VerifiedBadge /> : null}
            </h2>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              @{profile.handle} · {profile.roleLabel} · {profile.district},{" "}
              {profile.state}
            </p>
          </div>
        </div>
        <p>{profile.bio}</p>
        {profile.farmingMethod === "organic" ? (
          <p><strong>Organic-practices profile:</strong> certification paperwork status is <strong>{organicStatus.replace("_", " ")}</strong>.</p>
        ) : null}
        <div className="profile-card__crops">
          {profile.crops.map((crop) => (
            <span className="badge badge--green" key={crop}>
              {crop}
            </span>
          ))}
        </div>
      </section>
      <aside>
        <section className="card context-card">
          <ShieldAlert size={24} aria-hidden="true" />
          <h2 style={{ marginTop: 12 }}>Account controls</h2>
          <p className="muted">
            Status: <strong>{status}</strong>
            <br />
            Verification: <strong>{verification}</strong>
          </p>
          <div className="report-actions">
            <button
              className="button button--small"
              type="button"
              disabled={isPending}
              onClick={() => apply("verify")}
            >
              <BadgeCheck size={16} aria-hidden="true" /> Verify
            </button>
            {status === "active" ? (
              <button
                className="button button--danger button--small"
                type="button"
                disabled={isPending}
                onClick={() => apply("suspend")}
              >
                <UserRoundX size={16} aria-hidden="true" /> Suspend
              </button>
            ) : (
              <button
                className="button button--secondary button--small"
                type="button"
                disabled={isPending}
                onClick={() => apply("restore")}
              >
                <RotateCcw size={16} aria-hidden="true" /> Restore
              </button>
            )}
          </div>
          {error ? <p className="form-error">{error}</p> : null}
        </section>
        {profile.farmingMethod === "organic" || organicCertification ? (
          <section className="card context-card organic-admin-review">
            <FileCheck2 size={24} aria-hidden="true" />
            <h2>Organic certification</h2>
            <p className="muted">
              Public “Certified organic” appears only after this separate document review.
            </p>
            <p>Status: <strong>{organicStatus.replace("_", " ")}</strong></p>
            {organicCertification ? (
              <>
                <dl className="review-facts">
                  <div><dt>Submitted</dt><dd>{new Date(organicCertification.submittedAt).toLocaleString("en-IN")}</dd></div>
                  <div><dt>File</dt><dd>{organicCertification.evidenceMimeType} · {(organicCertification.evidenceSizeBytes / 1024 / 1024).toFixed(1)} MB</dd></div>
                </dl>
                {organicCertification.evidenceUrl ? (
                  <a className="button button--secondary button--small" href={organicCertification.evidenceUrl} target="_blank" rel="noopener noreferrer">
                    Open private paperwork
                  </a>
                ) : <p className="form-error">The private evidence file is unavailable; do not approve.</p>}
                {organicStatus === "pending" ? (
                  <>
                    <label className="field" htmlFor="organic-review-note">
                      <span>Reviewer note</span>
                      <textarea
                        className="textarea"
                        id="organic-review-note"
                        value={organicNote}
                        onChange={(event) => setOrganicNote(event.target.value)}
                        maxLength={1000}
                      />
                    </label>
                    <div className="report-actions">
                      <button
                        className="button button--small"
                        type="button"
                        disabled={isPending || !organicCertification.evidenceUrl}
                        onClick={() => reviewOrganic("verified")}
                      >
                        <BadgeCheck size={16} aria-hidden="true" /> Approve certificate
                      </button>
                      <button
                        className="button button--danger button--small"
                        type="button"
                        disabled={isPending}
                        onClick={() => reviewOrganic("rejected")}
                      >
                        Reject paperwork
                      </button>
                    </div>
                  </>
                ) : null}
              </>
            ) : (
              <p>No paperwork has been uploaded. This farmer must remain non-certified.</p>
            )}
          </section>
        ) : null}
      </aside>
    </div>
  );
}
