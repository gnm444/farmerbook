"use client";

import Script from "next/script";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { INDIA_STATES_AND_UNION_TERRITORIES } from "@/features/farm-visits/schemas";
import { HARI_BABU_WORKSHOP_PATH, type WorkshopCopy } from "./workshop-copy";
import styles from "@/app/workshops/hari-babu-2026/workshop.module.css";

const registrationEndpoint = `/api${HARI_BABU_WORKSHOP_PATH}/registrations`;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const expiredSessionError = "The registration session expired. Reload the form and try again.";

type SubmissionProof = { submissionId: string; nonce: string };
type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string;
  remove(widgetId: string): void;
  reset(widgetId: string): void;
};

function turnstileApi() {
  return (window as typeof window & { turnstile?: TurnstileApi }).turnstile;
}

function optionalText(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function normalizeWorkshopPhone(input: string): string | null {
  const compact = input.replace(/[\s-]/g, "");
  if (/^[6-9]\d{9}$/.test(compact)) return `+91${compact}`;
  if (/^(?:\+91|91)[6-9]\d{9}$/.test(compact)) {
    return `+91${compact.replace(/^\+?91/, "")}`;
  }
  return null;
}

export function WorkshopRegistrationForm({
  copy,
  turnstileSiteKey,
}: {
  copy: WorkshopCopy;
  turnstileSiteKey: string;
}) {
  const id = useId().replaceAll(":", "");
  const [proof, setProof] = useState<SubmissionProof | null>(null);
  const [proofState, setProofState] = useState<"loading" | "ready" | "failed">(
    turnstileSiteKey ? "loading" : "failed",
  );
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileScriptFailed, setTurnstileScriptFailed] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const widgetContainer = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  const loadProof = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(registrationEndpoint, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error("PROOF_UNAVAILABLE");
      const data: unknown = await response.json();
      if (
        !data ||
        typeof data !== "object" ||
        !("submissionId" in data) ||
        typeof data.submissionId !== "string" ||
        !uuidPattern.test(data.submissionId) ||
        !("nonce" in data) ||
        typeof data.nonce !== "string" ||
        !data.nonce
      ) {
        throw new Error("INVALID_PROOF");
      }
      if (signal?.aborted) return false;
      setProof({ submissionId: data.submissionId, nonce: data.nonce });
      setProofState("ready");
      return true;
    } catch {
      if (signal?.aborted) return false;
      setProofState("failed");
      return false;
    }
  }, []);

  useEffect(() => {
    if (!turnstileSiteKey) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void loadProof(controller.signal);
    });
    return () => controller.abort();
  }, [loadProof, turnstileSiteKey]);

  useEffect(() => {
    const api = turnstileApi();
    if (!turnstileReady || !turnstileSiteKey || !api || !widgetContainer.current) return;
    if (widgetId.current) api.remove(widgetId.current);
    widgetId.current = api.render(widgetContainer.current, {
      sitekey: turnstileSiteKey,
      action: "hari_babu_workshop_registration",
      callback: setTurnstileToken,
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
    return () => {
      const currentApi = turnstileApi();
      if (widgetId.current && currentApi) currentApi.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [turnstileReady, turnstileSiteKey]);

  function resetTurnstile() {
    if (widgetId.current) turnstileApi()?.reset(widgetId.current);
    setTurnstileToken("");
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!proof || !turnstileToken || isPending) return;
    const form = new FormData(event.currentTarget);
    const phone = normalizeWorkshopPhone(String(form.get("phone") ?? ""));
    if (!phone) {
      setError(copy.invalidPhone);
      return;
    }
    const yearsRaw = optionalText(form, "yearsFarming");
    const payload = {
      submissionId: proof.submissionId,
      nonce: proof.nonce,
      farmerName: form.get("farmerName"),
      phone,
      district: form.get("district"),
      state: form.get("state"),
      farmName: optionalText(form, "farmName"),
      farmLocation: optionalText(form, "farmLocation"),
      yearsFarming: yearsRaw ? Number(yearsRaw) : undefined,
      crops: optionalText(form, "crops"),
      attendanceInterest: form.get("attendanceInterest"),
      challenges: optionalText(form, "challenges"),
      proposedSolutions: optionalText(form, "proposedSolutions"),
      consent: form.get("consent") === "on",
      turnstileToken,
      website: form.get("website") ?? "",
    };
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch(registrationEndpoint, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data: unknown = await response.json().catch(() => null);
        if (
          response.ok &&
          data &&
          typeof data === "object" &&
          "status" in data &&
          data.status === "registered"
        ) {
          setRegistered(true);
          return;
        }
        if (
          response.status === 403 &&
          data &&
          typeof data === "object" &&
          "error" in data &&
          data.error === expiredSessionError
        ) {
          resetTurnstile();
          setError(copy.sessionRefreshing);
          setProof(null);
          setProofState("loading");
          const refreshed = await loadProof();
          setError(refreshed ? copy.sessionRefreshed : "");
          return;
        }
        setError(response.status === 429 ? copy.rateLimited : copy.genericError);
      } catch {
        setError(copy.genericError);
      }
      resetTurnstile();
    });
  }

  if (registered) {
    return (
      <div className={styles.success} role="status">
        <CheckCircle2 size={38} aria-hidden="true" />
        <h3>{copy.successTitle}</h3>
        <p>{copy.successBody}</p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit} aria-label={copy.registrationTitle}>
      {turnstileSiteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={() => {
            setTurnstileScriptFailed(false);
            setTurnstileReady(true);
          }}
          onError={() => setTurnstileScriptFailed(true)}
        />
      ) : null}
      <div className={styles.formGrid}>
        <label className={styles.field} htmlFor={`${id}-farmer-name`}>
          <span>{copy.farmerName}</span>
          <input id={`${id}-farmer-name`} className="input" name="farmerName" type="text" autoComplete="name" minLength={2} maxLength={120} required dir="auto" />
        </label>
        <div className={styles.field}>
          <label htmlFor={`${id}-phone`}>{copy.phone}</label>
          <input id={`${id}-phone`} className="input" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={24} placeholder="+919876543210" aria-describedby={`${id}-phone-help`} required />
          <small id={`${id}-phone-help`}>{copy.phoneHelp}</small>
        </div>
        <label className={styles.field} htmlFor={`${id}-district`}>
          <span>{copy.district}</span>
          <input id={`${id}-district`} className="input" name="district" type="text" minLength={2} maxLength={100} required dir="auto" />
        </label>
        <label className={styles.field} htmlFor={`${id}-state`}>
          <span>{copy.state}</span>
          <select id={`${id}-state`} className="select" name="state" defaultValue="" required>
            <option value="" disabled>{copy.chooseState}</option>
            {INDIA_STATES_AND_UNION_TERRITORIES.map((state) => <option value={state} key={state}>{state}</option>)}
          </select>
        </label>
        <label className={styles.field} htmlFor={`${id}-farm-name`}>
          <span>{copy.farmName}</span>
          <input id={`${id}-farm-name`} className="input" name="farmName" type="text" maxLength={160} dir="auto" />
        </label>
        <label className={styles.field} htmlFor={`${id}-farm-location`}>
          <span>{copy.farmLocation}</span>
          <input id={`${id}-farm-location`} className="input" name="farmLocation" type="text" maxLength={160} dir="auto" />
        </label>
        <label className={styles.field} htmlFor={`${id}-years`}>
          <span>{copy.yearsFarming}</span>
          <input id={`${id}-years`} className="input" name="yearsFarming" type="number" inputMode="numeric" min={0} max={80} step={1} />
        </label>
        <label className={styles.field} htmlFor={`${id}-crops`}>
          <span>{copy.crops}</span>
          <input id={`${id}-crops`} className="input" name="crops" type="text" maxLength={300} dir="auto" />
        </label>
      </div>

      <label className={styles.field} htmlFor={`${id}-interest`}>
        <span>{copy.attendanceInterest}</span>
        <select id={`${id}-interest`} className="select" name="attendanceInterest" defaultValue="" required>
          <option value="" disabled>{copy.chooseInterest}</option>
          <option value="attend">{copy.attendanceAttend}</option>
          <option value="interested">{copy.attendanceInterested}</option>
        </select>
      </label>
      <label className={styles.field} htmlFor={`${id}-challenges`}>
        <span>{copy.challenges}</span>
        <textarea id={`${id}-challenges`} className="textarea" name="challenges" maxLength={1000} dir="auto" />
      </label>
      <label className={styles.field} htmlFor={`${id}-solutions`}>
        <span>{copy.proposedSolutions}</span>
        <textarea id={`${id}-solutions`} className="textarea" name="proposedSolutions" maxLength={1000} dir="auto" />
      </label>
      <label className={styles.consent}>
        <input name="consent" type="checkbox" required />
        <span>{copy.consent}</span>
      </label>
      <label className={styles.honeypot} aria-hidden="true">
        {copy.website}<input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <div className={styles.turnstile}>
        <span>{copy.spamProtection}</span>
        <div ref={widgetContainer} />
      </div>
      {proofState === "loading" && turnstileSiteKey ? <p className={styles.proofStatus} role="status">{copy.loadingForm}</p> : null}
      {proofState === "failed" ? (
        <div className={styles.proofError} role="alert">
          <p>{copy.formUnavailable}</p>
          {turnstileSiteKey ? <button type="button" onClick={() => {
            setProofState("loading");
            setProof(null);
            void loadProof();
          }}>{copy.retryForm}</button> : null}
        </div>
      ) : null}
      {turnstileScriptFailed ? <p className={styles.proofError} role="alert">{copy.turnstileUnavailable}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button className={`button ${styles.submit}`} type="submit" disabled={isPending || !proof || !turnstileToken}>
        {isPending ? copy.submitting : copy.submit}<ArrowRight size={18} aria-hidden="true" />
      </button>
      <p className={styles.privacy}>{copy.privacy}</p>
    </form>
  );
}
