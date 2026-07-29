"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { reports as initialReports } from "@/lib/demo-data";
import type { ModerationReport } from "@/lib/types";
import { moderateReportAction } from "./actions";

export function ReportQueue({
  reports: providedReports = initialReports,
}: {
  reports?: ModerationReport[];
}) {
  const [reports, setReports] = useState(providedReports);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const pending = reports.filter((report) => report.status === "pending");

  function updateReport(
    report: ModerationReport,
    status: ModerationReport["status"],
    action: "dismiss" | "hide" | "suspend",
  ) {
    setError("");
    startTransition(async () => {
      const result = await moderateReportAction({
        reportId: report.id,
        action,
        targetId: report.targetId,
        targetType: report.targetType,
        note: `Decision recorded from the FarmerBook report queue: ${action}.`,
      });

      if (!result.ok) {
        setError(result.message ?? "The moderation decision could not be saved.");
        return;
      }

      setReports((current) =>
        current.map((item) =>
          item.id === report.id ? { ...item, status } : item,
        ),
      );
    });
  }

  return (
    <div className="admin-grid">
      <section aria-label="Pending reports">
        {pending.length ? (
          pending.map((report) => (
            <article className="card report-card" key={report.id}>
              <div className="report-head">
                <span className="badge badge--danger">
                  <AlertTriangle size={13} aria-hidden="true" />
                  {report.reason}
                </span>
                <span className="muted" style={{ fontSize: ".74rem" }}>
                  {report.createdLabel}
                </span>
              </div>
              <h2>{report.targetLabel}</h2>
              <p>{report.details}</p>
              {report.targetType === "profile" ? (
                <Link
                  className="text-link"
                  href={`/admin/users/${report.targetId}`}
                >
                  Review participant account
                </Link>
              ) : null}
              <div className="report-actions">
                <button
                  className="button button--secondary button--small"
                  type="button"
                  disabled={isPending}
                  onClick={() => updateReport(report, "dismissed", "dismiss")}
                >
                  Dismiss
                </button>
                {report.targetType !== "profile" ? (
                  <button
                    className="button button--small"
                    type="button"
                    disabled={isPending}
                    onClick={() => updateReport(report, "actioned", "hide")}
                  >
                    Hide target
                  </button>
                ) : (
                  <button
                    className="button button--danger button--small"
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      updateReport(report, "actioned", "suspend")
                    }
                  >
                    Suspend account
                  </button>
                )}
              </div>
            </article>
          ))
        ) : (
          <section className="card empty-state">
            <div>
              <div className="empty-state__icon">
                <CheckCircle2 size={28} aria-hidden="true" />
              </div>
              <h2>Report queue is clear</h2>
              <p>
                Every pending report has a moderator decision in this
                demonstration.
              </p>
            </div>
          </section>
        )}
      </section>
      <aside>
        <section className="card context-card">
          <h2>Moderator response target</h2>
          <div className="network-stat">
            <strong>{pending.length}</strong>
            <span>reports awaiting a decision</span>
          </div>
          <div className="network-stat">
            <strong>24h</strong>
            <span>maximum response time during the controlled pilot</span>
          </div>
        </section>
        <section className="card context-card">
          <ShieldCheck size={24} aria-hidden="true" />
          <h2 style={{ marginTop: 12 }}>Every action is auditable</h2>
          <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>
            Production actions record the moderator, target, decision, note and
            timestamp before changing content visibility or account status.
          </p>
        </section>
      </aside>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
