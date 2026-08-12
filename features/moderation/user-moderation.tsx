"use client";

import { useState, useTransition } from "react";
import {
  BadgeCheck,
  RotateCcw,
  ShieldAlert,
  UserRoundX,
} from "lucide-react";
import type { FarmerProfile } from "@/lib/types";
import { Avatar, VerifiedBadge } from "@/components/ui";
import { moderateUserAction } from "./actions";

type UserState = "active" | "suspended";
type VerificationState = "unverified" | "verified" | "rejected";

export function UserModeration({ profile }: { profile: FarmerProfile }) {
  const [status, setStatus] = useState<UserState>("active");
  const [verification, setVerification] = useState<VerificationState>(
    profile.verified ? "verified" : "unverified",
  );
  const [error, setError] = useState("");
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
      </aside>
    </div>
  );
}
