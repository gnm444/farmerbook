"use client";

import { useEffect, useState } from "react";

type VisitCount = {
  totalVisits: number;
  visitsThisMonth: number;
};

const SESSION_KEY = "farmerbook-visit-session";
const RECORDED_KEY = "farmerbook-visit-recorded";

function browserSessionId() {
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

export function VisitCounter() {
  const [count, setCount] = useState<VisitCount | null>(null);

  useEffect(() => {
    let cancelled = false;
    const sessionId = browserSessionId();
    const recorded = window.sessionStorage.getItem(RECORDED_KEY) === "1";
    const record = recorded
      ? Promise.resolve()
      : fetch("/api/visit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId, path: window.location.pathname }),
        }).then((response) => {
          if (!response.ok) throw new Error("VISIT_COUNTER_UNAVAILABLE");
          window.sessionStorage.setItem(RECORDED_KEY, "1");
        });

    void record
      .catch(() => undefined)
      .then(() => fetch("/api/visit-count", { cache: "no-store" }))
      .then((response) => (response.ok ? response.json() as Promise<VisitCount> : null))
      .then((value) => {
        if (!cancelled && value && Number.isInteger(value.totalVisits)) setCount(value);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <span className="visit-counter" title="Anonymous unique browser visits">
      Community visits: {count ? count.totalVisits.toLocaleString() : "—"}
    </span>
  );
}
