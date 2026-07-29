import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  HandHeart,
  MapPinned,
  MessageCircleMore,
  Search,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { Avatar, VerifiedBadge } from "@/components/ui";

export const metadata: Metadata = {
  title: "FarmerBook — Grow knowledge together",
};

export default function LandingPage() {
  return (
    <>
      <PublicHeader />
      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="badge badge--green">
                <Sprout size={15} aria-hidden="true" />
                Built for farming communities
              </span>
              <h1>Grow knowledge. Build trusted connections.</h1>
              <p>
                FarmerBook helps farmers find people working with similar crops,
                exchange practical experience, and start useful conversations
                with confidence.
              </p>
              <div className="hero-actions">
                <Link className="button" href="/signup">
                  Join the controlled pilot
                </Link>
                <Link className="button button--secondary" href="/feed">
                  Explore the demo
                </Link>
              </div>
              <div className="hero-note">
                <span>
                  <Check size={15} aria-hidden="true" /> Designed for mobile
                </span>
                <span>
                  <Check size={15} aria-hidden="true" /> Community moderated
                </span>
                <span>
                  <Check size={15} aria-hidden="true" /> No marketplace clutter
                </span>
              </div>
            </div>

            <div className="community-preview" aria-label="FarmerBook feed preview">
              <div className="preview-top">
                <span className="preview-title">From your community</span>
                <span className="preview-live">12 farmers active nearby</span>
              </div>
              <article className="card preview-post">
                <div className="person-row">
                  <Avatar initials="RP" />
                  <div className="person-row__copy">
                    <div className="person-name">
                      Ramesh Patil <VerifiedBadge />
                    </div>
                    <div className="person-meta">
                      Tomato farmer · Nashik, Maharashtra · 18 min ago
                    </div>
                  </div>
                </div>
                <div className="preview-post__tags">
                  <span className="badge">Tomato</span>
                  <span className="badge badge--amber">Question</span>
                </div>
                <p>
                  White spots appeared on the lower tomato leaves after last
                  week’s rain. Has anyone nearby seen this pattern?
                </p>
                <div className="crop-art" role="img" aria-label="Tomato crop" />
                <div className="preview-actions">
                  <strong>24 Helpful</strong>
                  <span>8 comments</span>
                  <span>Share</span>
                </div>
              </article>
              <div className="floating-person">
                <Avatar initials="AD" />
                <div className="person-row__copy">
                  <div className="person-name">
                    Anjali Deshmukh <VerifiedBadge />
                  </div>
                  <div className="person-meta">Agronomist · Drip irrigation</div>
                </div>
                <span className="badge badge--green">Follow</span>
              </div>
            </div>
          </div>
        </section>

        <section className="trust-strip" aria-label="FarmerBook principles">
          <div className="container trust-grid">
            <div className="trust-item">
              <div className="trust-icon">
                <MapPinned size={22} aria-hidden="true" />
              </div>
              <div>
                <strong>Locally relevant</strong>
                <span>Find people by crop, district and state.</span>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">
                <ShieldCheck size={22} aria-hidden="true" />
              </div>
              <div>
                <strong>Safer by design</strong>
                <span>Reporting, blocking and active moderation.</span>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">
                <HandHeart size={22} aria-hidden="true" />
              </div>
              <div>
                <strong>Useful over viral</strong>
                <span>Chronological updates and practical answers.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="why">
          <div className="container">
            <div className="section-heading">
              <p className="eyebrow">A practical professional network</p>
              <h2>Built around the decisions farmers make every week.</h2>
              <p>
                Share what you observe, find experienced people nearby, and keep
                the conversation going privately when it becomes specific.
              </p>
            </div>
            <div className="feature-grid">
              <article className="card feature-card">
                <div className="feature-icon">
                  <Sprout size={22} aria-hidden="true" />
                </div>
                <h3>Share field experience</h3>
                <p>
                  Publish a question, useful observation or opportunity with one
                  clear image and the crop context that matters.
                </p>
              </article>
              <article className="card feature-card">
                <div className="feature-icon">
                  <Search size={22} aria-hidden="true" />
                </div>
                <h3>Find the right people</h3>
                <p>
                  Discover farmers, agronomists and trusted ecosystem
                  participants by crop, role and location.
                </p>
              </article>
              <article className="card feature-card">
                <div className="feature-icon">
                  <MessageCircleMore size={22} aria-hidden="true" />
                </div>
                <h3>Continue the conversation</h3>
                <p>
                  Start a simple one-to-one text conversation without exposing
                  your phone number to the whole community.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section section--green" id="how">
          <div className="container">
            <div className="section-heading section-heading--center">
              <p className="eyebrow">How the pilot works</p>
              <h2>From introduction to useful connection in three steps.</h2>
              <p>
                The pilot stays intentionally small so profiles, conversations
                and safety reports receive real attention.
              </p>
            </div>
            <div className="steps-grid">
              <article className="step-card">
                <div className="step-number">1</div>
                <h3>Create your farming profile</h3>
                <p>
                  Add your district, crops, experience and the kind of work you
                  want to learn or share.
                </p>
              </article>
              <article className="step-card">
                <div className="step-number">2</div>
                <h3>Follow useful people</h3>
                <p>
                  Browse verified and community participants working with
                  similar crops or challenges.
                </p>
              </article>
              <article className="step-card">
                <div className="step-number">3</div>
                <h3>Ask, answer and connect</h3>
                <p>
                  Join chronological discussions, mark helpful answers and
                  message people directly.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="container cta-card">
            <div>
              <p className="eyebrow">Controlled Maharashtra pilot</p>
              <h2>Help shape a better farming network.</h2>
              <p>
                Join a small moderated group and tell us what makes the product
                genuinely useful on your phone and in your work.
              </p>
            </div>
            <Link className="button" href="/signup">
              Request pilot access
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
