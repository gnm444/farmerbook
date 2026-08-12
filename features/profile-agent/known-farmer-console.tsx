"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Link2,
  ShieldCheck,
  Video,
} from "lucide-react";
import {
  addKnownFarmerSourceAction,
  buildKnownFarmerProfileAction,
  createKnownFarmerIntakeAction,
  decideKnownFarmerCandidateAction,
  searchKnownFarmerYouTubeAction,
} from "./known-farmer-actions";
import type {
  KnownFarmerCandidateRow,
  KnownFarmerIntakeView,
} from "./known-farmer-queries";
import type { KnownFarmerSubjectAssociation } from "./known-farmer-schemas";

const relationshipLabels = {
  founder_known: "Personally known to a founder",
  team_known: "Personally known to the FarmerBook team",
  in_person_meeting: "Met in person",
  trusted_partner_referral: "Known through a trusted partner",
};

const associationLabels: Record<KnownFarmerSubjectAssociation, string> = {
  owned_social_profile: "Farmer-owned social profile",
  third_party_coverage: "Third-party coverage",
  professional_reference: "Professional reference",
};

function readScreenshot(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (file.size > 2_000_000) {
      reject(new Error("Upload a screenshot smaller than 2 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The screenshot could not be read."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function CandidateReview({
  candidate,
}: {
  candidate: KnownFarmerCandidateRow;
}) {
  const router = useRouter();
  const [association, setAssociation] = useState<KnownFarmerSubjectAssociation>(
    candidate.subject_association,
  );
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  function decide(decision: "selected" | "rejected") {
    setFeedback("");
    startTransition(async () => {
      const result = await decideKnownFarmerCandidateAction({
        intakeId: candidate.intake_id,
        candidateId: candidate.id,
        decision,
        subjectAssociation: association,
        expectedRevision: candidate.revision,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }
      setFeedback(decision === "selected" ? "Source selected." : "Source rejected.");
      router.refresh();
    });
  }

  return (
    <article className="known-farmer-candidate">
      <div>
        <span className="tag">{candidate.source_type}</span>
        <span className="tag">{candidate.discovery_method.replaceAll("_", " ")}</span>
        <span className={`tag known-farmer-decision known-farmer-decision--${candidate.decision}`}>
          {candidate.decision}
        </span>
      </div>
      <h4>{candidate.source_title ?? new URL(candidate.source_url).hostname}</h4>
      <p>{candidate.source_excerpt}</p>
      <a href={candidate.source_url} target="_blank" rel="noreferrer">
        Review original public source <ExternalLink size={14} aria-hidden="true" />
      </a>
      <label className="field">
        <span>How is this source associated with the farmer?</span>
        <select
          value={association}
          onChange={(event) =>
            setAssociation(event.target.value as KnownFarmerSubjectAssociation)
          }
          disabled={isPending}
        >
          {Object.entries(associationLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      {association === "owned_social_profile" ? (
        <p className="form-helper">
          Select this only after opening the source and confirming it is the farmer&apos;s own account—not a video, interview, repost, or fan page.
        </p>
      ) : null}
      <div className="report-actions">
        <button className="button button--secondary" type="button" disabled={isPending} onClick={() => decide("selected")}>
          Select source
        </button>
        <button className="button button--ghost" type="button" disabled={isPending} onClick={() => decide("rejected")}>
          Reject
        </button>
      </div>
      {feedback ? <p className="form-helper" role="status">{feedback}</p> : null}
    </article>
  );
}

function IntakeCard({ intake }: { intake: KnownFarmerIntakeView }) {
  const router = useRouter();
  const screenshotInput = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function youtubeSearch() {
    setFeedback("");
    setFailed(false);
    startTransition(async () => {
      const result = await searchKnownFarmerYouTubeAction({
        intakeId: intake.id,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        setFailed(true);
        setFeedback(result.message);
        return;
      }
      setFeedback(`YouTube research completed with ${result.data.resultCount} retained candidate${result.data.resultCount === 1 ? "" : "s"}.`);
      router.refresh();
    });
  }

  function copyGoogleQuery() {
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(intake.googleResearchQuery);
        setFailed(false);
        setFeedback("Google research query copied.");
      } catch {
        setFailed(true);
        setFeedback("The query could not be copied. Open Google research instead.");
      }
    });
  }

  function addSource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setFeedback("");
    setFailed(false);
    startTransition(async () => {
      try {
        const screenshot = screenshotInput.current?.files?.[0];
        const result = await addKnownFarmerSourceAction({
          intakeId: intake.id,
          sourceUrl: form.get("sourceUrl"),
          description: form.get("description") || undefined,
          screenshotDataUrl: screenshot ? await readScreenshot(screenshot) : undefined,
          discoveryMethod: form.get("discoveryMethod"),
          sourcePermissionConfirmed: form.get("sourcePermissionConfirmed") === "on",
          idempotencyKey: crypto.randomUUID(),
        });
        if (!result.ok) {
          setFailed(true);
          setFeedback(result.message);
          return;
        }
        setFeedback("Public source retained as a review candidate.");
        formElement.reset();
        router.refresh();
      } catch (caught) {
        setFailed(true);
        setFeedback(caught instanceof Error ? caught.message : "The source could not be added.");
      }
    });
  }

  function buildProfile() {
    setFeedback("");
    setFailed(false);
    startTransition(async () => {
      const result = await buildKnownFarmerProfileAction({
        intakeId: intake.id,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        setFailed(true);
        setFeedback(result.message);
        return;
      }
      setFeedback("Private, cited farmer profile draft created. Nothing was published or sent.");
      router.refresh();
    });
  }

  const ownedSocialCount = intake.candidates.filter(
    (candidate) =>
      candidate.decision === "selected" &&
      candidate.subject_association === "owned_social_profile",
  ).length;

  return (
    <section className="card known-farmer-intake">
      <div className="outreach-section-head">
        <div>
          <p className="eyebrow">{relationshipLabels[intake.relationship_basis]}</p>
          <h2>{intake.subject_name}</h2>
          <p className="muted">
            {[intake.location_hint, intake.farming_hint].filter(Boolean).join(" · ") || "No research hints supplied"}
          </p>
        </div>
        <span className="tag">{intake.state.replaceAll("_", " ")}</span>
      </div>

      <div className="known-farmer-research-actions">
        <a className="button button--secondary" href={intake.googleResearchUrl} target="_blank" rel="noreferrer">
          <FileSearch size={16} aria-hidden="true" /> Open Google research
        </a>
        <button className="button button--secondary" type="button" disabled={isPending} onClick={copyGoogleQuery}>
          Copy Google query
        </button>
        <button className="button button--secondary" type="button" disabled={isPending || intake.state === "built"} onClick={youtubeSearch}>
          <Video size={17} aria-hidden="true" />
          {isPending ? "Working…" : "Search YouTube"}
        </button>
      </div>
      <p className="form-helper">
        Google opens in your browser for manual review; FarmerBook stores only a destination you select. YouTube candidates come from the official API and remain unselected until reviewed.
      </p>

      <form className="known-farmer-source-form" onSubmit={addSource}>
        <h3>Add a reviewed public source</h3>
        <label className="field">
          <span>Public source URL</span>
          <input name="sourceUrl" type="url" required placeholder="https://…" />
        </label>
        <label className="field">
          <span>How was it found?</span>
          <select name="discoveryMethod" defaultValue="manual_google_review">
            <option value="manual_google_review">Selected from this Google review</option>
            <option value="operator_supplied">Already known public source</option>
          </select>
        </label>
        <label className="field known-farmer-description">
          <span>Visible public description <em>required for social sources unless a screenshot is supplied</em></span>
          <textarea name="description" rows={3} maxLength={8000} />
        </label>
        <label className="field">
          <span>Permitted screenshot <em>optional; not retained after text extraction</em></span>
          <input ref={screenshotInput} type="file" accept="image/png,image/jpeg,image/webp" />
        </label>
        <label className="consent-check known-farmer-description">
          <input name="sourcePermissionConfirmed" type="checkbox" required />
          <span>I reviewed this public source and am permitted to submit its URL and visible professional information.</span>
        </label>
        <button className="button" type="submit" disabled={isPending || intake.state === "built"}>
          <Link2 size={16} aria-hidden="true" /> Add candidate
        </button>
      </form>

      <div className="known-farmer-candidates">
        <div className="outreach-section-head">
          <div>
            <h3>Source review</h3>
            <p className="muted">{intake.candidates.length} candidate{intake.candidates.length === 1 ? "" : "s"}; {ownedSocialCount} selected farmer-owned social link{ownedSocialCount === 1 ? "" : "s"}.</p>
          </div>
          {ownedSocialCount ? <CheckCircle2 color="var(--success)" aria-label="Owned social requirement met" /> : <ShieldCheck aria-label="Owned social review required" />}
        </div>
        {intake.candidates.length ? intake.candidates.map((candidate) => (
          <CandidateReview key={`${candidate.id}:${candidate.revision}`} candidate={candidate} />
        )) : <p className="empty-state">No sources yet. Open Google research or run the bounded YouTube search.</p>}
      </div>

      {feedback ? <div className={failed ? "form-error" : "form-success"} role={failed ? "alert" : "status"}>{feedback}</div> : null}
      <button className="button" type="button" onClick={buildProfile} disabled={isPending || intake.state !== "ready_to_build"}>
        <ShieldCheck size={17} aria-hidden="true" />
        {intake.state === "built" ? "Private sample built" : "Build private Not verified sample"}
      </button>
      {intake.state !== "ready_to_build" && intake.state !== "built" ? (
        <p className="form-helper">Complete social discovery, select supporting evidence, and select at least one reviewed farmer-owned YouTube, Instagram, Facebook, or LinkedIn profile.</p>
      ) : null}
    </section>
  );
}

export function KnownFarmerConsole({
  available,
  intakes,
}: {
  available: boolean;
  intakes: KnownFarmerIntakeView[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function createIntake(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setFeedback("");
    setFailed(false);
    startTransition(async () => {
      const result = await createKnownFarmerIntakeAction({
        fullName: form.get("fullName"),
        locationHint: form.get("locationHint") || undefined,
        farmingHint: form.get("farmingHint") || undefined,
        preferredLocale: form.get("preferredLocale"),
        relationshipBasis: form.get("relationshipBasis"),
        relationshipConfirmed: form.get("relationshipConfirmed") === "on",
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        setFailed(true);
        setFeedback(result.message);
        return;
      }
      setFeedback("Private Known Farmer Intake created. No invitation, message, or public profile was created.");
      formElement.reset();
      router.refresh();
    });
  }

  return (
    <div className="known-farmer-console">
      {!available ? <div className="form-error" role="status">Known Farmer Intake is unavailable until both research release flags and private database controls are configured.</div> : null}
      <section className="card known-farmer-create-card">
        <div className="outreach-section-head">
          <div>
            <p className="eyebrow">Stage 1 · relationship attestation</p>
            <h2>Create a private intake</h2>
          </div>
          <ShieldCheck aria-hidden="true" />
        </div>
        <p className="muted">Use this only for a farmer personally known to FarmerBook. The confirmation is an intake basis, not identity verification or permission to publish.</p>
        <form className="known-farmer-create-form" onSubmit={createIntake}>
          <label className="field"><span>Farmer full name</span><input name="fullName" required minLength={2} maxLength={100} /></label>
          <label className="field"><span>District or state <em>recommended</em></span><input name="locationHint" maxLength={120} /></label>
          <label className="field"><span>Crop or farming hint</span><input name="farmingHint" maxLength={120} /></label>
          <label className="field"><span>Profile language</span><select name="preferredLocale" defaultValue="en-IN"><option value="en-IN">English</option><option value="hi-IN">हिन्दी</option><option value="mr-IN">मराठी</option></select></label>
          <label className="field"><span>Relationship basis</span><select name="relationshipBasis" defaultValue="team_known">{Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="consent-check known-farmer-confirmation"><input name="relationshipConfirmed" type="checkbox" required /><span>I confirm this person is personally known through the selected FarmerBook relationship. This does not assert verification, consent, or endorsement.</span></label>
          {feedback ? <div className={failed ? "form-error" : "form-success"} role={failed ? "alert" : "status"}>{feedback}</div> : null}
          <button className="button" type="submit" disabled={!available || isPending}><ShieldCheck size={17} aria-hidden="true" />{isPending ? "Creating…" : "Create Known Farmer Intake"}</button>
        </form>
      </section>
      <div className="known-farmer-intake-list">
        {intakes.length ? intakes.map((intake) => <IntakeCard key={`${intake.id}:${intake.revision}`} intake={intake} />) : <section className="card empty-state"><h2>No Known Farmer Intakes</h2><p>Create the first private intake above.</p></section>}
      </div>
    </div>
  );
}
