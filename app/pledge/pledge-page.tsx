"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Leaf,
  MapPin,
  Recycle,
  ShieldCheck,
  Sprout,
  Users,
} from "lucide-react";
import { Brand } from "@/components/ui";
import styles from "./pledge.module.css";

type PlateChoice = "natural";

type SubmittedPledge = {
  name: string;
  choice: PlateChoice;
  number: number | null;
};

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

function getTurnstileApi() {
  return (window as typeof window & { turnstile?: TurnstileApi }).turnstile;
}

type PublicPledge = {
  name: string;
};

type PledgeApiPayload = {
  count?: number;
  total?: number;
  pledges?: unknown;
  names?: unknown;
  data?: {
    count?: number;
    total?: number;
    pledges?: unknown;
    names?: unknown;
  };
  message?: string;
};

function parsePublicPledges(payload: unknown) {
  const body = (payload && typeof payload === "object" ? payload : {}) as PledgeApiPayload;
  const source = body.data && typeof body.data === "object" ? body.data : body;
  const rawPledges = Array.isArray(source.pledges)
    ? source.pledges
    : Array.isArray(source.names)
      ? source.names
      : Array.isArray(payload)
        ? payload
        : [];
  const pledges = rawPledges
    .map((item): PublicPledge | null => {
      if (typeof item === "string" && item.trim()) return { name: item.trim() };
      if (!item || typeof item !== "object") return null;
      const name = "name" in item && typeof item.name === "string" ? item.name.trim() : "";
      return name ? { name } : null;
    })
    .filter((item): item is PublicPledge => Boolean(item));
  const count = [source.count, source.total]
    .find((value) => typeof value === "number" && Number.isFinite(value));

  return { pledges, count };
}

const plateChoices: Array<{
  value: PlateChoice;
  title: string;
  description: string;
  note: string;
  icon: typeof Leaf;
}> = [
  {
    value: "natural",
    title: "Natural leaf plates",
    description: "Choose natural leaf plates from Vistaraku for your next meal or event.",
    note: "Order through FarmerBook · WhatsApp +91 9177901022",
    icon: Leaf,
  },
];

function PledgeHeader() {
  return (
    <header className="public-header">
      <nav className="container public-nav" aria-label="Primary navigation">
        <Link href="/" className="brand" aria-label="FarmerBook home">
          <Brand />
        </Link>
        <div className="public-links">
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/featured-farmers">Meet farmers</Link>
          <Link href="/companies/vistaraku">Natural tableware</Link>
        </div>
        <div className="public-actions">
          <Link className="button button--ghost" href="/login">
            Sign in
          </Link>
          <Link className="button" href="/signup">
            Join FarmerBook
          </Link>
        </div>
      </nav>
    </header>
  );
}

function PledgeFooter() {
  return (
    <footer className="public-footer">
      <div className="container footer-main">
        <div className="footer-story">
          <Brand inverse />
          <p>FarmerBook connects people, produce and practical choices that help rural communities thrive.</p>
          <span>Build trust. Reach more customers.</span>
        </div>
        <nav className="footer-column" aria-label="Explore FarmerBook">
          <strong>Explore</strong>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/featured-farmers">Featured farmers</Link>
          <Link href="/companies/vistaraku">Natural tableware</Link>
          <Link href="/pledge">Pledge against plastic plates</Link>
        </nav>
        <nav className="footer-column" aria-label="Trust and support">
          <strong>Trust &amp; support</strong>
          <Link href="/community-rules">Community rules</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 FarmerBook. All rights reserved.</span>
        <span>Every thoughtful choice helps keep our shared spaces healthier.</span>
      </div>
    </footer>
  );
}

type PledgePageProps = {
  turnstileSiteKey: string;
};

export function PledgePage({ turnstileSiteKey }: PledgePageProps) {
  const nameId = useId();
  const phoneId = useId();
  const localityId = useId();
  const organizationId = useId();
  const choiceId = useId();
  const consentId = useId();
  const publicConsentId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [locality, setLocality] = useState("");
  const [organization, setOrganization] = useState("");
  const [choice, setChoice] = useState<PlateChoice | "">("");
  const [consent, setConsent] = useState(false);
  const [showNamePublicly, setShowNamePublicly] = useState(false);
  const [pledgeCount, setPledgeCount] = useState<number | null>(null);
  const [publicPledges, setPublicPledges] = useState<PublicPledge[]>([]);
  const [isLoadingPublicPledges, setIsLoadingPublicPledges] = useState(true);
  const [publicPledgesUnavailable, setPublicPledgesUnavailable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [submittedPledge, setSubmittedPledge] = useState<SubmittedPledge | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileContainer = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/pledges", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Public pledges are unavailable.");
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        if (!active) return;
        const parsed = parsePublicPledges(payload);
        setPublicPledges(parsed.pledges);
        setPledgeCount(parsed.count ?? parsed.pledges.length);
        setPublicPledgesUnavailable(false);
      })
      .catch(() => {
        if (active) {
          setPledgeCount(null);
          setPublicPledgesUnavailable(true);
        }
      })
      .finally(() => {
        if (active) setIsLoadingPublicPledges(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (
      submittedPledge
      || !turnstileReady
      || !turnstileSiteKey
      || !turnstileContainer.current
    ) {
      return undefined;
    }

    const api = getTurnstileApi();
    if (!api) return undefined;
    if (turnstileWidgetId.current) api.remove(turnstileWidgetId.current);
    const widgetId = api.render(turnstileContainer.current, {
      sitekey: turnstileSiteKey,
      action: "plate_pledge",
      callback: setTurnstileToken,
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
    turnstileWidgetId.current = widgetId;

    return () => {
      getTurnstileApi()?.remove(widgetId);
      turnstileWidgetId.current = null;
      setTurnstileToken("");
    };
  }, [submittedPledge, turnstileReady, turnstileSiteKey]);

  function resetTurnstile() {
    if (turnstileWidgetId.current) {
      getTurnstileApi()?.reset(turnstileWidgetId.current);
    }
    setTurnstileToken("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const compactPhone = trimmedPhone.replace(/[\s().-]+/gu, "");
    const phoneDigits = compactPhone.startsWith("+") ? compactPhone.slice(1) : compactPhone;
    const normalizedPhone = /^[6-9]\d{9}$/u.test(phoneDigits)
      ? `+91${phoneDigits}`
      : /^0[6-9]\d{9}$/u.test(phoneDigits)
        ? `+91${phoneDigits.slice(1)}`
        : /^91[6-9]\d{9}$/u.test(phoneDigits)
          ? `+${phoneDigits}`
          : null;

    if (!trimmedName) {
      setFormError("Please add your name so we can recognise your pledge.");
      nameRef.current?.focus();
      return;
    }

    if (!normalizedPhone) {
      setFormError("Please add a valid Indian mobile number so we can contact you about your pledge.");
      return;
    }

    if (!choice) {
      setFormError("Please confirm that you will choose natural leaf plates.");
      return;
    }

    if (!consent) {
      setFormError("Please confirm that you want to record this pledge.");
      return;
    }

    if (!turnstileSiteKey) {
      setFormError("Pledge protection is temporarily unavailable. Please try again later.");
      return;
    }

    if (!turnstileToken) {
      setFormError("Complete the spam-protection check and try again.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/pledges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          phone: normalizedPhone,
          locality: locality.trim(),
          organization: organization.trim(),
          show_public_name: showNamePublicly,
          consent: true,
          website: String(formData.get("website") ?? ""),
          turnstileToken,
        }),
      });
      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        if (response.status < 500) {
          const message =
            payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
              ? payload.message
              : "Please check your details and try again.";
          setFormError(message);
          resetTurnstile();
          return;
        }
        throw new Error("The pledge database is unavailable.");
      }

      if (response.status !== 201) {
        setFormError("We could not confirm that the pledge was saved. Please try again.");
        resetTurnstile();
        return;
      }

      const nextCount =
        showNamePublicly && pledgeCount !== null ? pledgeCount + 1 : pledgeCount;
      setPledgeCount(nextCount);
      if (showNamePublicly && !publicPledgesUnavailable) {
        setPublicPledges((current) => [
          { name: trimmedName },
          ...current.filter((pledge) => pledge.name.toLowerCase() !== trimmedName.toLowerCase()),
        ]);
      }
      setSubmittedPledge({
        name: trimmedName,
        choice,
        number: showNamePublicly ? nextCount : null,
      });
    } catch {
      setFormError("We could not save your pledge. Please check your connection and try again.");
      resetTurnstile();
    } finally {
      setIsSubmitting(false);
    }
  }

  function makeAnotherPledge() {
    setSubmittedPledge(null);
    setName("");
    setPhone("");
    setLocality("");
    setOrganization("");
    setChoice("");
    setConsent(false);
    setShowNamePublicly(false);
    setFormError("");
    window.setTimeout(() => nameRef.current?.focus(), 0);
  }

  const selectedChoice = plateChoices.find((item) => item.value === submittedPledge?.choice);

  return (
    <div className={styles.page}>
      <PledgeHeader />
      <main>
        <section className={styles.hero} aria-labelledby="pledge-title">
          <div className={`container ${styles.heroInner}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>
                <Sprout size={16} aria-hidden="true" /> A small choice with a wide ripple
              </p>
              <h1 id="pledge-title">Say no to plastic plates.</h1>
              <p className={styles.heroLead}>
                Pledge to avoid plastic plates and choose natural leaf plates for your next meal, gathering or community event.
              </p>
              <div className={styles.heroActions}>
                <a className="button" href="#make-pledge">
                  Make the pledge <ArrowRight size={17} aria-hidden="true" />
                </a>
                <Link className="button button--secondary" href="/companies/vistaraku">
                  Order natural leaf plates
                </Link>
              </div>
              <p className={styles.heroNote}>
                Visit <a href="https://farmerbook.in/companies/vistaraku">https://farmerbook.in/companies/vistaraku</a> or WhatsApp <a href="https://wa.me/919177901022">+91 9177901022</a>.
              </p>
              <p className={styles.heroNote}>
                <ShieldCheck size={16} aria-hidden="true" /> Your phone number is kept private and never shown publicly.
              </p>
            </div>

            <div className={styles.heroArt} aria-label="A natural leaf plate with fresh leaves and grain" role="img">
              <div className={styles.sunGlow} />
              <div className={styles.plateIllustration}>
                <div className={`${styles.plate} ${styles.plateBack}`} />
                <div className={`${styles.plate} ${styles.plateMiddle}`} />
                <div className={`${styles.plate} ${styles.plateFront}`}>
                  <span className={styles.plateStamp}>NATURAL<br />CHOICE</span>
                </div>
                <Leaf className={styles.leafOne} size={72} strokeWidth={1.25} aria-hidden="true" />
                <Leaf className={styles.leafTwo} size={46} strokeWidth={1.35} aria-hidden="true" />
                <span className={styles.grain} aria-hidden="true">✦</span>
              </div>
              <div className={styles.artCaption}>
                <span>Choose with care</span>
                <strong>Natural at the table</strong>
              </div>
            </div>
          </div>
        </section>

        <section className={`container ${styles.content}`} id="make-pledge" aria-labelledby="form-title">
          <div className={styles.formColumn}>
            {submittedPledge ? (
              <section className={styles.successCard} aria-live="polite">
                <div className={styles.successIcon}>
                  <CheckCircle2 size={30} aria-hidden="true" />
                </div>
                <p className={styles.eyebrow}>Pledge recorded</p>
                <h2>Thank you, {submittedPledge.name}.</h2>
                <p>
                  You pledged to choose and promote natural leaf plates instead of plastic plates. That is a practical step worth sharing.
                </p>
                <div className={styles.successDetails}>
                  <div>
                    <span>Chosen path</span>
                    <strong>{selectedChoice?.title}</strong>
                  </div>
                  <div>
                    <span>{submittedPledge.number ? "Public names displayed" : "Phone privacy"}</span>
                    <strong>{submittedPledge.number ? `#${submittedPledge.number}` : "Never displayed"}</strong>
                  </div>
                </div>
                <p className={styles.storageNote}>
                  Your pledge was saved. Your phone number is private and will never be displayed on this page.
                </p>
                <div className={styles.successActions}>
                  <Link className="button" href="/companies/vistaraku">
                    Order natural leaf plates <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                  <button className="button button--secondary" type="button" onClick={makeAnotherPledge}>
                    Make another pledge
                  </button>
                </div>
              </section>
            ) : (
              <form className={styles.formCard} onSubmit={handleSubmit} aria-describedby={formError ? `${choiceId}-error` : undefined}>
                <div className={styles.formHeader}>
                  <p className={styles.eyebrow}>Your promise</p>
                  <h2 id="form-title">Make your pledge</h2>
                  <p>Tell us what you will choose, and add just enough detail to make this promise feel like yours.</p>
                </div>

                <div className={styles.fields}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={nameId}>
                      Your name <span aria-hidden="true">*</span>
                    </label>
                    <input
                      ref={nameRef}
                      className={styles.input}
                      id={nameId}
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="e.g. Ananya Rao"
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label} htmlFor={phoneId}>
                      Phone number <span aria-hidden="true">*</span>
                    </label>
                    <input
                      className={styles.input}
                      id={phoneId}
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="e.g. 9177901022"
                      required
                    />
                    <span className={styles.fieldHint}>Used privately for pledge follow-up. Never displayed.</span>
                  </div>

                  <div className={styles.twoFields}>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor={localityId}>
                        Locality <span className={styles.optional}>Optional</span>
                      </label>
                      <div className={styles.inputWithIcon}>
                        <MapPin size={17} aria-hidden="true" />
                        <input
                          className={styles.input}
                          id={localityId}
                          name="locality"
                          type="text"
                          autoComplete="address-level2"
                          value={locality}
                          onChange={(event) => setLocality(event.target.value)}
                          placeholder="Town or district"
                        />
                      </div>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor={organizationId}>
                        Organization <span className={styles.optional}>Optional</span>
                      </label>
                      <input
                        className={styles.input}
                        id={organizationId}
                        name="organization"
                        type="text"
                        autoComplete="organization"
                        value={organization}
                        onChange={(event) => setOrganization(event.target.value)}
                        placeholder="Farm, school or group"
                      />
                    </div>
                  </div>

                  <fieldset className={styles.choiceFieldset}>
                    <legend className={styles.legend}>
                      What will you choose or promote? <span aria-hidden="true">*</span>
                    </legend>
                    <div className={styles.choiceGrid}>
                      {plateChoices.map((plate) => {
                        const Icon = plate.icon;
                        const inputId = `${choiceId}-${plate.value}`;
                        return (
                          <label
                            className={`${styles.choice} ${choice === plate.value ? styles.choiceSelected : ""}`}
                            htmlFor={inputId}
                            key={plate.value}
                          >
                            <input
                              id={inputId}
                              name="plate-choice"
                              type="radio"
                              value={plate.value}
                              checked={choice === plate.value}
                              onChange={() => {
                                setChoice(plate.value);
                                setFormError("");
                              }}
                              required
                            />
                            <span className={styles.choiceIcon} aria-hidden="true">
                              <Icon size={22} strokeWidth={1.8} />
                            </span>
                            <span className={styles.choiceCopy}>
                              <strong>{plate.title}</strong>
                              <span>{plate.description}</span>
                              <small>{plate.note}</small>
                            </span>
                            <span className={styles.choiceCheck} aria-hidden="true">
                              <Check size={14} strokeWidth={3} />
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <label className={styles.consent} htmlFor={consentId}>
                    <input
                      id={consentId}
                      name="consent"
                      type="checkbox"
                      checked={consent}
                      onChange={(event) => {
                        setConsent(event.target.checked);
                        setFormError("");
                      }}
                      required
                    />
                    <span>
                      I confirm this is my pledge and consent to FarmerBook storing my name and phone number privately for pledge follow-up. <span aria-hidden="true">*</span>
                    </span>
                  </label>

                  <label className={styles.consent} htmlFor={publicConsentId}>
                    <input
                      id={publicConsentId}
                      name="showNamePublicly"
                      type="checkbox"
                      checked={showNamePublicly}
                      onChange={(event) => setShowNamePublicly(event.target.checked)}
                    />
                    <span>
                      I consent to showing my name in FarmerBook&apos;s public pledge list. My phone number will never be shown.
                    </span>
                  </label>

                  <label className={styles.honeypot} aria-hidden="true">
                    Website
                    <input name="website" type="text" tabIndex={-1} autoComplete="off" />
                  </label>

                  <div className={styles.turnstile}>
                    <span>Spam protection</span>
                    {turnstileSiteKey ? (
                      <>
                        <Script
                          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                          strategy="afterInteractive"
                          onReady={() => setTurnstileReady(true)}
                        />
                        <div ref={turnstileContainer} />
                      </>
                    ) : (
                      <p>Pledge protection is temporarily unavailable.</p>
                    )}
                  </div>

                  {formError ? (
                    <p className={styles.formError} id={`${choiceId}-error`} role="alert">
                      {formError}
                    </p>
                  ) : null}

                  <div className={styles.submitRow}>
                    <button
                      className="button"
                      type="submit"
                      disabled={isSubmitting || !turnstileSiteKey || !turnstileToken}
                      aria-busy={isSubmitting}
                    >
                      {isSubmitting ? "Saving pledge…" : "Record my pledge"} {!isSubmitting ? <ArrowRight size={17} aria-hidden="true" /> : null}
                    </button>
                    <span>Required fields are marked with *</span>
                  </div>
                </div>
              </form>
            )}
          </div>

          <aside className={styles.aside} aria-label="About the pledge">
            <section className={styles.countCard}>
              <div className={styles.countTopline}>
                <span className={styles.countIcon} aria-hidden="true">
                  <Users size={19} />
                </span>
                <span>Local pledge tally</span>
              </div>
              <strong className={styles.count} aria-live="polite">{pledgeCount ?? "—"}</strong>
              <p>Public names displayed</p>
              <span className={styles.countNote}>Loaded from FarmerBook&apos;s public pledge list</span>
            </section>

            <section className={styles.namesCard} aria-labelledby="public-names-title">
              <p className={styles.eyebrow}>People choosing natural</p>
              <h2 id="public-names-title">Public pledge names</h2>
              {isLoadingPublicPledges ? (
                <p className={styles.namesStatus}>Loading names…</p>
              ) : publicPledgesUnavailable ? (
                <p className={styles.namesStatus}>Pledge list temporarily unavailable.</p>
              ) : publicPledges.length ? (
                <ul className={styles.namesList}>
                  {publicPledges.map((pledge, index) => (
                    <li key={`${pledge.name}-${index}`}>
                      <Check size={15} aria-hidden="true" />
                      <span>{pledge.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.namesStatus}>Be the first person to share their name.</p>
              )}
              <p className={styles.privateNamesNote}>Only people who give separate permission appear here. Phone numbers are never displayed.</p>
            </section>

            <section className={styles.infoCard}>
              <p className={styles.eyebrow}>Why this matters</p>
              <h2>Make the better choice visible.</h2>
              <p>
                Reusable or compostable tableware can make a gathering feel more thoughtful while supporting growers and makers of natural products.
              </p>
              <ul className={styles.promiseList}>
                <li><Recycle size={18} aria-hidden="true" /><span>Skip single-use plastic plates</span></li>
                <li><Leaf size={18} aria-hidden="true" /><span>Choose natural leaf plates</span></li>
                <li><Users size={18} aria-hidden="true" /><span>Share the choice with your community</span></li>
              </ul>
              <Link className={styles.inlineLink} href="/companies/vistaraku">
                Order natural leaf plates <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <p className={styles.contactNote}>
                <a href="https://farmerbook.in/companies/vistaraku">https://farmerbook.in/companies/vistaraku</a><br />
                WhatsApp: <a href="https://wa.me/919177901022">+91 9177901022</a>
              </p>
            </section>
          </aside>
        </section>

        <section className={`container ${styles.bottomCta}`} aria-label="Continue exploring FarmerBook">
          <div>
            <p className={styles.eyebrow}>Keep the promise moving</p>
            <h2>Good choices grow when we share them.</h2>
          </div>
          <Link className="button button--secondary" href="/marketplace">
            Explore the marketplace <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>

        <section className={`container ${styles.campaignSection}`} aria-labelledby="campaign-title">
          <div className={styles.campaignHeading}>
            <div>
              <p className={styles.eyebrow}>Share the message</p>
              <h2 id="campaign-title">Posters for a plastic-free table.</h2>
            </div>
            <p>Download and share these one-line campaign wallpapers with your family, farm, school or community group.</p>
          </div>
          <div className={styles.campaignGrid}>
            <figure className={styles.campaignCard}>
              <div className={`${styles.campaignImage} ${styles.campaignImagePortrait}`}>
                <Image
                  src="/images/pledge-campaign/natural-leaf-plates-mobile-poster.png"
                  alt="Choose natural plates. Avoid single-use plastic. FarmerBook poster."
                  fill
                  unoptimized
                  sizes="(max-width: 620px) 100vw, 33vw"
                />
              </div>
              <figcaption>
                <strong>Mobile poster</strong>
                  <a href="/images/pledge-campaign/natural-leaf-plates-mobile-poster.png" download>Download poster</a>
              </figcaption>
            </figure>
            <figure className={styles.campaignCard}>
              <div className={`${styles.campaignImage} ${styles.campaignImageSquare}`}>
                <Image
                  src="/images/pledge-campaign/natural-leaf-plates-square-social.png"
                  alt="Natural leaf plates. Skip single-use plastic. FarmerBook social poster."
                  fill
                  unoptimized
                  sizes="(max-width: 620px) 100vw, 33vw"
                />
              </div>
              <figcaption>
                <strong>Social square</strong>
                  <a href="/images/pledge-campaign/natural-leaf-plates-square-social.png" download>Download poster</a>
              </figcaption>
            </figure>
            <figure className={styles.campaignCard}>
              <div className={`${styles.campaignImage} ${styles.campaignImageLandscape}`}>
                <Image
                  src="/images/pledge-campaign/natural-leaf-plates-desktop-wallpaper.png"
                  alt="Serve with care. Avoid single-use plastic plates. FarmerBook desktop wallpaper."
                  fill
                  unoptimized
                  sizes="(max-width: 620px) 100vw, 33vw"
                />
              </div>
              <figcaption>
                <strong>Desktop wallpaper</strong>
                  <a href="/images/pledge-campaign/natural-leaf-plates-desktop-wallpaper.png" download>Download wallpaper</a>
              </figcaption>
            </figure>
          </div>
          <div className={styles.qrCta}>
            <Image
              src="/images/pledge-campaign/vistaraku-order-qr.png"
              alt="QR code to order Vistaraku natural leaf plates"
              width={150}
              height={150}
              unoptimized
            />
            <div>
              <p className={styles.eyebrow}>Scan to order</p>
              <h3>Vistaraku natural leaf plates</h3>
              <p>Visit <a href="https://farmerbook.in/companies/vistaraku">https://farmerbook.in/companies/vistaraku</a> or WhatsApp <a href="https://wa.me/919177901022">+91 9177901022</a>.</p>
              <a className={styles.inlineLink} href="/images/pledge-campaign/vistaraku-order-qr.png" download>
                Download QR code <ArrowRight size={15} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>
      <PledgeFooter />
    </div>
  );
}
