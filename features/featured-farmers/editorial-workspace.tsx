/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileSearch,
  Link2,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  Video,
} from "lucide-react";
import { SELECTABLE_AGRICULTURE_CATEGORIES } from "@/lib/agriculture/categories";
import {
  addFeaturedFarmerSourceAction,
  confirmFeaturedFarmerSocialAction,
  decideFeaturedFarmerSourceAction,
  publishFeaturedFarmerAction,
  removeFeaturedFarmerSocialAction,
  saveFeaturedFarmerDraftAction,
  searchFeaturedFarmerYouTubeAction,
  withdrawFeaturedFarmerAction,
} from "./actions";
import type {
  FeaturedFarmerSourceAssociation,
  FeaturedFarmerSourceQuality,
  FeaturedFarmerStorySection,
} from "./schemas";
import {
  featuredFarmerClaimTypes,
  featuredFarmerMediaRightsBases,
  featuredFarmerSourceQualities,
  featuredFarmerStorySectionKinds,
} from "./schemas";
import { assessFeaturedFarmerReadiness } from "./source-policy";
import type {
  FeaturedFarmerSourceRow,
  FeaturedFarmerWorkspace,
} from "./queries";

const associationLabels: Record<FeaturedFarmerSourceAssociation, string> = {
  professional_reference: "Professional reference",
  owned_social_profile: "Farmer-owned social account",
  third_party_coverage: "Third-party coverage",
};

const qualityLabels: Record<FeaturedFarmerSourceQuality, string> = {
  official_record: "Official record",
  institutional_reference: "Institutional reference",
  independent_reporting: "Independent reporting",
  first_party: "First-party publication",
  owned_social_profile: "Farmer-owned social account",
  third_party_coverage: "Third-party coverage",
};

type EditableClaim = FeaturedFarmerWorkspace["claims"][number];

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

function SourceReview({
  source,
  researchId,
}: {
  source: FeaturedFarmerSourceRow;
  researchId: string;
}) {
  const router = useRouter();
  const [association, setAssociation] =
    useState<FeaturedFarmerSourceAssociation>(source.subject_association);
  const [quality, setQuality] =
    useState<FeaturedFarmerSourceQuality>(source.source_quality);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateAssociation(next: FeaturedFarmerSourceAssociation) {
    setAssociation(next);
    if (next === "owned_social_profile") setQuality("owned_social_profile");
    if (next !== "owned_social_profile" && quality === "owned_social_profile") {
      setQuality(next === "third_party_coverage" ? "third_party_coverage" : "independent_reporting");
    }
  }

  function decide(decision: "selected" | "rejected") {
    setFeedback("");
    setFailed(false);
    startTransition(async () => {
      const result = await decideFeaturedFarmerSourceAction({
        researchId,
        sourceId: source.id,
        decision,
        sourceQuality: quality,
        subjectAssociation: association,
        expectedRevision: source.revision,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        setFailed(true);
        setFeedback(result.message);
        return;
      }
      setFeedback(decision === "selected" ? "Evidence selected." : "Source rejected.");
      router.refresh();
    });
  }

  return (
    <article className={`featured-source featured-source--${source.decision}`}>
      <div className="tag-row">
        <span className="tag">{source.source_type}</span>
        <span className="tag">{source.discovery_method.replaceAll("_", " ")}</span>
        <span className={`tag featured-source__decision featured-source__decision--${source.decision}`}>
          {source.decision}
        </span>
      </div>
      <div>
        <p className="eyebrow">{source.publisher_name}</p>
        <h4>{source.source_title}</h4>
        <p>{source.source_excerpt}</p>
      </div>
      <a href={source.source_url} target="_blank" rel="noreferrer">
        Review original source <ExternalLink size={14} aria-hidden="true" />
      </a>
      <div className="featured-source__classify">
        <label className="field">
          <span>Association</span>
          <select
            value={association}
            onChange={(event) =>
              updateAssociation(event.target.value as FeaturedFarmerSourceAssociation)
            }
            disabled={isPending}
          >
            {Object.entries(associationLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Evidence quality</span>
          <select
            value={quality}
            onChange={(event) =>
              setQuality(event.target.value as FeaturedFarmerSourceQuality)
            }
            disabled={isPending || association === "owned_social_profile"}
          >
            {featuredFarmerSourceQualities.map((value) => (
              <option key={value} value={value}>{qualityLabels[value]}</option>
            ))}
          </select>
        </label>
      </div>
      {association === "owned_social_profile" ? (
        <p className="form-helper">
          Confirm only a channel/profile owned by this farmer—not an interview,
          video, repost, publisher account, fan page, or similarly named person.
        </p>
      ) : null}
      <div className="report-actions">
        <button className="button button--secondary" type="button" disabled={isPending} onClick={() => decide("selected")}>
          Select evidence
        </button>
        <button className="button button--ghost" type="button" disabled={isPending} onClick={() => decide("rejected")}>
          Reject
        </button>
      </div>
      {feedback ? (
        <p className={failed ? "form-error" : "form-success"} role={failed ? "alert" : "status"}>{feedback}</p>
      ) : null}
    </article>
  );
}

function ResearchDesk({ workspace }: { workspace: FeaturedFarmerWorkspace }) {
  const router = useRouter();
  const screenshotInput = useRef<HTMLInputElement>(null);
  const [discoveryMethod, setDiscoveryMethod] = useState("manual_google_review");
  const [association, setAssociation] =
    useState<FeaturedFarmerSourceAssociation>("professional_reference");
  const [quality, setQuality] =
    useState<FeaturedFarmerSourceQuality>("independent_reporting");
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateAssociation(next: FeaturedFarmerSourceAssociation) {
    setAssociation(next);
    setQuality(
      next === "owned_social_profile"
        ? "owned_social_profile"
        : next === "third_party_coverage"
          ? "third_party_coverage"
          : "independent_reporting",
    );
  }

  function youtubeSearch() {
    setFeedback("");
    setFailed(false);
    startTransition(async () => {
      const result = await searchFeaturedFarmerYouTubeAction({
        researchId: workspace.id,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        setFailed(true);
        setFeedback(result.message);
        return;
      }
      setFeedback(`YouTube research retained ${result.data.resultCount} candidate${result.data.resultCount === 1 ? "" : "s"} for review.`);
      router.refresh();
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
        const result = await addFeaturedFarmerSourceAction({
          researchId: workspace.id,
          sourceUrl: form.get("sourceUrl"),
          publisher: form.get("publisher"),
          sourceTitle: form.get("sourceTitle"),
          publishedAt: form.get("publishedAt") || undefined,
          description: form.get("description") || undefined,
          screenshotDataUrl: screenshot ? await readScreenshot(screenshot) : undefined,
          discoveryMethod,
          researchPurpose:
            discoveryMethod === "manual_google_review"
              ? form.get("researchPurpose")
              : undefined,
          sourceQuality: quality,
          subjectAssociation: association,
          sourcePermissionConfirmed: form.get("sourcePermissionConfirmed") === "on",
          idempotencyKey: crypto.randomUUID(),
        });
        if (!result.ok) {
          setFailed(true);
          setFeedback(result.message);
          return;
        }
        setFeedback("Public source added to the evidence review queue.");
        formElement.reset();
        router.refresh();
      } catch (caught) {
        setFailed(true);
        setFeedback(caught instanceof Error ? caught.message : "The source could not be added.");
      }
    });
  }

  return (
    <section className="card featured-stage" id="research">
      <div className="featured-stage__head">
        <div>
          <p className="eyebrow">Stage 1 · research and evidence</p>
          <h2>Build the public record</h2>
          <p className="muted">Open focused searches, review the original pages, and retain only destinations you select.</p>
        </div>
        <FileSearch aria-hidden="true" />
      </div>
      <div className="featured-research-queries">
        {workspace.researchQueries.map((query) => (
          <a href={query.url} target="_blank" rel="noreferrer" key={query.purpose}>
            <span>{query.purpose}</span>
            <strong>{query.query}</strong>
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        ))}
      </div>
      <div className="featured-research-toolbar">
        <p>Google opens for manual research. YouTube uses the official API, strict quotas, and no automatic selection.</p>
        <button className="button button--secondary" type="button" disabled={isPending} onClick={youtubeSearch}>
          <Video size={17} aria-hidden="true" />
          {isPending ? "Researching…" : "Search YouTube"}
        </button>
      </div>
      <form className="featured-source-form" onSubmit={addSource}>
        <div className="featured-source-form__title">
          <Link2 aria-hidden="true" />
          <div><h3>Add a reviewed public source</h3><p>Paste the original destination—not a search results page.</p></div>
        </div>
        <label className="field featured-source-form__url"><span>Public HTTPS URL</span><input name="sourceUrl" type="url" required placeholder="https://…" /></label>
        <label className="field"><span>Publisher</span><input name="publisher" required minLength={2} maxLength={160} /></label>
        <label className="field"><span>Page or video title</span><input name="sourceTitle" required minLength={2} maxLength={240} /></label>
        <label className="field"><span>Publication date <em>if known</em></span><input name="publishedAt" type="date" /></label>
        <label className="field"><span>How found?</span><select value={discoveryMethod} onChange={(event) => setDiscoveryMethod(event.target.value)}><option value="manual_google_review">Manual Google review</option><option value="operator_supplied">Already known public source</option></select></label>
        {discoveryMethod === "manual_google_review" ? <label className="field"><span>Research route</span><select name="researchPurpose" defaultValue="identity">{workspace.researchQueries.map((query) => <option value={query.purpose} key={query.purpose}>{query.purpose}</option>)}</select></label> : null}
        <label className="field"><span>Association</span><select value={association} onChange={(event) => updateAssociation(event.target.value as FeaturedFarmerSourceAssociation)}>{Object.entries(associationLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="field"><span>Evidence quality</span><select value={quality} disabled={association === "owned_social_profile"} onChange={(event) => setQuality(event.target.value as FeaturedFarmerSourceQuality)}>{featuredFarmerSourceQualities.map((value) => <option value={value} key={value}>{qualityLabels[value]}</option>)}</select></label>
        <label className="field featured-source-form__wide"><span>Visible public evidence <em>required for social sources; optional for fetchable websites</em></span><textarea name="description" rows={5} maxLength={8000} /></label>
        <label className="field"><span>Permitted screenshot <em>optional; image is not retained</em></span><input ref={screenshotInput} type="file" accept="image/png,image/jpeg,image/webp" /></label>
        <label className="consent-check featured-source-form__wide"><input name="sourcePermissionConfirmed" type="checkbox" required /><span>I reviewed this public source and may submit its URL and visible professional information for editorial fact-checking.</span></label>
        <button className="button" type="submit" disabled={isPending}><Plus size={16} aria-hidden="true" /> Add source</button>
      </form>
      {feedback ? <div className={failed ? "form-error" : "form-success"} role={failed ? "alert" : "status"}>{feedback}</div> : null}
      <div className="featured-sources">
        <div className="featured-stage__subhead"><h3>Evidence review</h3><span className="tag">{workspace.sources.length} sources</span></div>
        {workspace.sources.length ? workspace.sources.map((source) => <SourceReview key={`${source.id}:${source.revision}`} source={source} researchId={workspace.id} />) : <div className="empty-state"><p>No sources yet. Start with identity, significance, and institutional searches.</p></div>}
      </div>
    </section>
  );
}

function StoryEditor({ workspace }: { workspace: FeaturedFarmerWorkspace }) {
  const router = useRouter();
  const selectedSources = workspace.sources.filter((source) => source.decision === "selected");
  const defaultSourceId = selectedSources[0]?.id ?? "";
  const initialClaims: EditableClaim[] = workspace.claims.length >= 2
    ? workspace.claims
    : [
        { id: crypto.randomUUID(), claimKey: "significance", claimType: "significance", statement: "", sourceIds: defaultSourceId ? [defaultSourceId] : [] },
        { id: crypto.randomUUID(), claimKey: "impact", claimType: "impact", statement: "", sourceIds: selectedSources[1]?.id ? [selectedSources[1].id] : defaultSourceId ? [defaultSourceId] : [] },
      ];
  const initialSections: FeaturedFarmerStorySection[] = workspace.draft?.story_sections ?? [
    { kind: "work", heading: "The work", body: "", claimKeys: ["significance"] },
    { kind: "impact", heading: "Why it matters", body: "", claimKeys: ["impact"] },
    { kind: "lessons", heading: "What others can learn", body: "", claimKeys: ["significance", "impact"] },
  ];
  const [claims, setClaims] = useState(initialClaims);
  const [sections, setSections] = useState(initialSections);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFeedback("");
    setFailed(false);
    startTransition(async () => {
      const mediaUrl = String(form.get("mediaUrl") ?? "").trim();
      const result = await saveFeaturedFarmerDraftAction({
        researchId: workspace.id,
        slug: form.get("slug"),
        headline: form.get("headline"),
        deck: form.get("deck"),
        whyFeatured: form.get("whyFeatured"),
        categorySlugs: form.getAll("categorySlugs"),
        limitations: [form.get("limitation")],
        claims: claims.map((_, index) => ({
          claimKey: form.get(`claim-${index}-key`),
          claimType: form.get(`claim-${index}-type`),
          statement: form.get(`claim-${index}-statement`),
          displayLabel: form.get(`claim-${index}-label`) || undefined,
          displayValue: form.get(`claim-${index}-value`) || undefined,
          displayContext: form.get(`claim-${index}-context`) || undefined,
          sourceIds: form.getAll(`claim-${index}-sources`),
        })),
        sections: sections.map((_, index) => ({
          kind: form.get(`section-${index}-kind`),
          heading: form.get(`section-${index}-heading`),
          body: form.get(`section-${index}-body`),
          claimKeys: form.getAll(`section-${index}-claims`),
        })),
        ...(mediaUrl ? {
          media: {
            assetUrl: mediaUrl,
            altText: form.get("mediaAlt"),
            credit: form.get("mediaCredit"),
            rightsBasis: form.get("mediaRightsBasis"),
            rightsReference: form.get("mediaRightsReference"),
          },
        } : {}),
        ...(workspace.draft ? { expectedRevision: workspace.draft.revision } : {}),
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        setFailed(true);
        setFeedback(result.message);
        return;
      }
      setFeedback(result.data.ready ? "Story is review ready." : `Draft saved. ${result.data.blockers.join(" ")}`);
      router.refresh();
    });
  }

  return (
    <section className="card featured-stage" id="story">
      <div className="featured-stage__head"><div><p className="eyebrow">Stage 2 · cited story</p><h2>Shape the evidence into a profile</h2><p className="muted">Write conservatively in the selected story language. Every claim and section must point to selected evidence.</p></div><FileCheck2 aria-hidden="true" /></div>
      {!selectedSources.length ? <div className="form-error">Select evidence before saving a story.</div> : null}
      <form className="featured-story-form" onSubmit={save}>
        <div className="featured-story-form__basics">
          <label className="field"><span>Story URL slug</span><input name="slug" required defaultValue={workspace.draft?.slug ?? workspace.subject_name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
          <label className="field"><span>Headline</span><input name="headline" required minLength={8} maxLength={180} defaultValue={workspace.draft?.headline ?? ""} /></label>
          <label className="field featured-story-form__wide"><span>Deck</span><textarea name="deck" required minLength={20} maxLength={360} rows={2} defaultValue={workspace.draft?.deck ?? ""} /></label>
          <label className="field featured-story-form__wide"><span>Why FarmerBook is featuring this work</span><textarea name="whyFeatured" required minLength={40} maxLength={900} rows={4} defaultValue={workspace.draft?.why_featured ?? workspace.significance_hypothesis} /></label>
          <label className="field"><span>Categories</span><select name="categorySlugs" multiple required defaultValue={workspace.draft?.category_slugs ?? []}>{SELECTABLE_AGRICULTURE_CATEGORIES.map((category) => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select><small>Use Command/Ctrl to select several.</small></label>
          <label className="field"><span>Known limitation or uncertainty</span><textarea name="limitation" required minLength={5} maxLength={300} rows={3} defaultValue={workspace.draft?.limitations[0] ?? "This profile is based on the public sources cited and may not cover all of the farmer’s work."} /></label>
        </div>

        <div className="featured-editor-list">
          <div className="featured-stage__subhead"><div><p className="eyebrow">Fact ledger</p><h3>Claims</h3></div><button className="button button--secondary" type="button" onClick={() => setClaims((items) => [...items, { id: crypto.randomUUID(), claimKey: `claim_${items.length + 1}`, claimType: "impact", statement: "", sourceIds: defaultSourceId ? [defaultSourceId] : [] }])}><Plus size={15} /> Add claim</button></div>
          {claims.map((claim, index) => <fieldset className="featured-editor-card" key={claim.id}><legend>Claim {index + 1}</legend><div className="featured-editor-card__grid"><label className="field"><span>Claim key</span><input name={`claim-${index}-key`} required defaultValue={claim.claimKey} pattern="[a-z][a-z0-9_]*" /></label><label className="field"><span>Claim type</span><select name={`claim-${index}-type`} defaultValue={claim.claimType}>{featuredFarmerClaimTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label><label className="field featured-story-form__wide"><span>Factual statement</span><textarea name={`claim-${index}-statement`} required minLength={10} maxLength={700} rows={3} defaultValue={claim.statement} /></label><label className="field"><span>Stat label <em>optional</em></span><input name={`claim-${index}-label`} defaultValue={claim.displayLabel ?? ""} /></label><label className="field"><span>Stat value <em>optional</em></span><input name={`claim-${index}-value`} defaultValue={claim.displayValue ?? ""} /></label><label className="field"><span>Stat context <em>optional</em></span><input name={`claim-${index}-context`} defaultValue={claim.displayContext ?? ""} /></label><label className="field"><span>Cited selected sources</span><select name={`claim-${index}-sources`} multiple required defaultValue={claim.sourceIds}>{selectedSources.map((source) => <option key={source.id} value={source.id}>{source.publisher_name} · {source.source_title}</option>)}</select></label></div>{claims.length > 2 ? <button className="button button--ghost" type="button" onClick={() => setClaims((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /> Remove claim</button> : null}</fieldset>)}
        </div>

        <div className="featured-editor-list">
          <div className="featured-stage__subhead"><div><p className="eyebrow">Narrative</p><h3>Story sections</h3></div><button className="button button--secondary" type="button" onClick={() => setSections((items) => [...items, { kind: "community", heading: "", body: "", claimKeys: claims[0] ? [claims[0].claimKey] : [] }])}><Plus size={15} /> Add section</button></div>
          {sections.map((section, index) => <fieldset className="featured-editor-card" key={`${section.kind}:${index}`}><legend>Section {index + 1}</legend><div className="featured-editor-card__grid"><label className="field"><span>Section kind</span><select name={`section-${index}-kind`} defaultValue={section.kind}>{featuredFarmerStorySectionKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></label><label className="field"><span>Heading</span><input name={`section-${index}-heading`} required minLength={2} maxLength={120} defaultValue={section.heading} /></label><label className="field featured-story-form__wide"><span>Body</span><textarea name={`section-${index}-body`} required minLength={40} maxLength={2500} rows={6} defaultValue={section.body} /></label><label className="field featured-story-form__wide"><span>Claims used in this section</span><select name={`section-${index}-claims`} multiple required defaultValue={section.claimKeys}>{claims.map((claim, claimIndex) => <option value={claim.claimKey} key={claim.id}>{claim.claimKey || `Claim ${claimIndex + 1}`}</option>)}</select></label></div>{sections.length > 3 ? <button className="button button--ghost" type="button" onClick={() => setSections((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /> Remove section</button> : null}</fieldset>)}
        </div>

        <fieldset className="featured-media-rights"><legend>Optional hero image—with recorded rights</legend><p>Leave the URL blank to use FarmerBook&apos;s designed crop-field fallback. Never copy a search thumbnail or publisher photograph without permission.</p><div className="featured-editor-card__grid"><label className="field featured-story-form__wide"><span>FarmerBook asset path or permitted HTTPS image URL</span><input name="mediaUrl" defaultValue={workspace.media?.asset_url ?? ""} /></label><label className="field"><span>Alt text</span><input name="mediaAlt" defaultValue={workspace.media?.alt_text ?? ""} /></label><label className="field"><span>Credit</span><input name="mediaCredit" defaultValue={workspace.media?.credit ?? ""} /></label><label className="field"><span>Rights basis</span><select name="mediaRightsBasis" defaultValue={workspace.media?.rights_basis ?? "subject_permission"}>{featuredFarmerMediaRightsBases.map((basis) => <option key={basis} value={basis}>{basis.replaceAll("_", " ")}</option>)}</select></label><label className="field"><span>Permission or licence reference</span><input name="mediaRightsReference" defaultValue={workspace.media?.rights_reference ?? ""} /></label></div></fieldset>
        {feedback ? <div className={failed ? "form-error" : "form-success"} role={failed ? "alert" : "status"}>{feedback}</div> : null}
        <button className="button" disabled={isPending || !selectedSources.length || workspace.state === "published"}><FileCheck2 size={17} />{isPending ? "Saving…" : "Save and run readiness review"}</button>
      </form>
    </section>
  );
}

function PublicationDesk({ workspace }: { workspace: FeaturedFarmerWorkspace }) {
  const router = useRouter();
  const ownedSources = workspace.sources.filter((source) => source.decision === "selected" && source.subject_association === "owned_social_profile" && source.source_quality === "owned_social_profile" && ["youtube", "instagram", "facebook", "linkedin"].includes(source.source_type));
  const readiness = assessFeaturedFarmerReadiness({
    sources: workspace.sources.map((source) => ({ id: source.id, sourceUrl: source.source_url, sourceType: source.source_type, publisherHost: source.publisher_host, sourceQuality: source.source_quality, subjectAssociation: source.subject_association, decision: source.decision })),
    claims: workspace.claims,
    socialLinks: workspace.socialLinks.map((social) => ({ sourceId: social.source_id, platform: social.platform, profileUrl: social.profile_url })),
    sectionCount: workspace.draft?.story_sections.length ?? 0,
    requireProfessionalSources: workspace.professionalSourcesRequired,
    media: workspace.media ? { rightsApproved: true } : null,
  });
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function confirmSocial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const source = ownedSources.find((item) => item.id === form.get("sourceId"));
    if (!source || !["youtube", "instagram", "facebook", "linkedin"].includes(source.source_type)) return;
    startTransition(async () => {
      const result = await confirmFeaturedFarmerSocialAction({ researchId: workspace.id, sourceId: source.id, platform: source.source_type, ownershipBasis: form.get("ownershipBasis"), displayOrder: workspace.socialLinks.length, idempotencyKey: crypto.randomUUID() });
      if (!result.ok) { setFailed(true); setFeedback(result.message); return; }
      setFailed(false); setFeedback("Farmer-owned account confirmed for public display."); router.refresh();
    });
  }

  function removeSocial(platform: string) {
    startTransition(async () => {
      const result = await removeFeaturedFarmerSocialAction({ researchId: workspace.id, platform, expectedRevision: workspace.revision, idempotencyKey: crypto.randomUUID() });
      if (!result.ok) { setFailed(true); setFeedback(result.message); return; }
      setFailed(false); setFeedback("Social link removed; publication readiness was recalculated."); router.refresh();
    });
  }

  function publish() {
    startTransition(async () => {
      const result = await publishFeaturedFarmerAction({ researchId: workspace.id, expectedRevision: workspace.revision, factCheckedAt: new Date().toISOString(), idempotencyKey: crypto.randomUUID() });
      if (!result.ok) { setFailed(true); setFeedback(result.message); return; }
      setFailed(false); setFeedback("Featured Farmer story published."); router.refresh();
    });
  }

  function withdraw(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await withdrawFeaturedFarmerAction({ researchId: workspace.id, reason: form.get("reason"), expectedRevision: workspace.revision, idempotencyKey: crypto.randomUUID() });
      if (!result.ok) { setFailed(true); setFeedback(result.message); return; }
      setFailed(false); setFeedback("The public story was withdrawn."); router.refresh();
    });
  }

  return (
    <section className="card featured-stage" id="publish">
      <div className="featured-stage__head"><div><p className="eyebrow">Stage 3 · identity-safe publication</p><h2>Confirm social ownership and publish</h2><p className="muted">A social link is public only after an administrator confirms it is the farmer&apos;s own account.</p></div><ShieldCheck aria-hidden="true" /></div>
      {workspace.draft ? <section className="featured-admin-preview" aria-label="Saved public story preview"><div className="featured-admin-preview__visual">{workspace.media ? <img src={workspace.media.asset_url} alt={workspace.media.alt_text} /> : <div><span>Designed crop-field cover</span></div>}</div><div className="featured-admin-preview__copy"><p className="eyebrow">Saved public preview</p><h3>{workspace.subject_name}</h3><h4>{workspace.draft.headline}</h4><p>{workspace.draft.deck}</p><div className="tag-row">{workspace.draft.category_slugs.map((slug) => <span className="tag" key={slug}>{slug.replaceAll("-", " ")}</span>)}</div><ol>{workspace.draft.story_sections.map((section) => <li key={`${section.kind}:${section.heading}`}><strong>{section.heading}</strong><span>{section.body}</span></li>)}</ol></div></section> : null}
      {workspace.draft ? <form className="featured-social-confirm" onSubmit={confirmSocial}><label className="field"><span>Selected farmer-owned source</span><select name="sourceId" required defaultValue=""><option value="" disabled>Select account</option>{ownedSources.map((source) => <option key={source.id} value={source.id}>{source.source_type} · {source.source_title}</option>)}</select></label><label className="field"><span>Ownership evidence</span><textarea name="ownershipBasis" minLength={10} maxLength={500} required rows={3} placeholder="Describe the public signals used to confirm this profile/channel belongs to the farmer." /></label><button className="button button--secondary" disabled={isPending || !ownedSources.length}><CheckCircle2 size={16} /> Confirm owned account</button></form> : <p className="form-helper">Save a draft before confirming its social links.</p>}
      <div className="featured-social-list">{workspace.socialLinks.map((social) => <div key={social.id}><a href={social.profile_url} target="_blank" rel="noreferrer"><strong>{social.platform}</strong><span>{social.profile_url}</span><ExternalLink size={14} /></a><button type="button" className="button button--ghost" disabled={isPending} onClick={() => removeSocial(social.platform)}><Trash2 size={14} /> Remove</button></div>)}</div>
      {!workspace.professionalSourcesRequired ? <div className="featured-editorial-notice">Professional website sources are temporarily optional. Every displayed claim still requires selected evidence, and optional mode does not mean the story is independently verified.</div> : null}
      <div className={`featured-readiness featured-readiness--${readiness.ready ? "ready" : "blocked"}`}><div><p className="eyebrow">Publication gate</p><h3>{readiness.ready ? "Evidence complete" : "Still needs editorial work"}</h3></div><div className="featured-readiness__metrics"><span><strong>{readiness.professionalDomainCount}</strong> professional domains</span><span><strong>{readiness.authoritativeSourceCount}</strong> authoritative sources</span><span><strong>{readiness.citedClaimCount}</strong> cited claims</span><span><strong>{readiness.ownedSocialCount}</strong> owned social links</span></div>{readiness.blockers.length ? <ul>{readiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul> : <p>All application readiness checks pass. The database repeats them atomically at publication.</p>}</div>
      {feedback ? <div className={failed ? "form-error" : "form-success"} role={failed ? "alert" : "status"}>{feedback}</div> : null}
      {workspace.state === "published" ? <form className="featured-withdraw" onSubmit={withdraw}><label className="field"><span>Correction or withdrawal reason</span><input name="reason" required minLength={10} maxLength={500} /></label><button className="button button--danger" disabled={isPending}><Trash2 size={16} /> Withdraw story</button></form> : <button className="button featured-publish-button" type="button" onClick={publish} disabled={isPending || !readiness.ready || workspace.state !== "review_ready"}><Send size={17} />{isPending ? "Publishing…" : "Fact-check and publish story"}</button>}
    </section>
  );
}

export function FeaturedFarmerEditorialWorkspace({ workspace }: { workspace: FeaturedFarmerWorkspace }) {
  return (
    <div className="featured-workspace">
      <div className="featured-workspace__rail"><Link href="/admin/featured-farmers"><ArrowLeft size={16} /> Back to newsroom</Link><nav aria-label="Story workflow"><a href="#research">1. Research</a><a href="#story">2. Write story</a><a href="#publish">3. Publish</a></nav></div>
      <header className="featured-workspace__hero"><div><p className="eyebrow">Featured Farmer story desk</p><h1>{workspace.subject_name}</h1><p>{workspace.significance_hypothesis}</p><div className="tag-row"><span className={`tag featured-state featured-state--${workspace.state}`}>{workspace.state.replaceAll("_", " ")}</span><span className="tag">revision {workspace.revision}</span><span className="tag">{workspace.preferred_locale}</span></div></div><div className="featured-workspace__location"><strong>{[workspace.district_hint, workspace.state_hint].filter(Boolean).join(", ") || "India"}</strong><span>{workspace.farming_hint || "Public-interest farming story"}</span></div></header>
      <div className="featured-editorial-notice">Editorial profile only. This workflow does not create a FarmerBook member, identity verification, endorsement, outreach prospect, invitation, message, or marketplace listing.</div>
      <ResearchDesk workspace={workspace} />
      <StoryEditor workspace={workspace} />
      <PublicationDesk workspace={workspace} />
    </div>
  );
}
