"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Copy,
  Eye,
  Mail,
  MessageSquareText,
  PackagePlus,
  Phone,
  Plus,
  Share2,
  Sparkles,
  Store,
  UsersRound,
  X,
} from "lucide-react";
import type {
  FarmerProfile,
  LeadStatus,
  ListingStatus,
  MarketEnquiry,
  ProduceListing,
} from "@/lib/types";
import {
  createListingAction,
  updateLeadStatusAction,
  updateListingStatusAction,
} from "./actions";
import { ListingImage } from "./listing-image";
import { useTranslations } from "@/components/locale-provider";
import {
  agricultureCategoriesForContext,
  type AgricultureCategorySlug,
} from "@/lib/agriculture/categories";

const PRODUCE_CATEGORY_SUGGESTIONS = agricultureCategoriesForContext("produce");

const leadStatusLabels: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  won: "Seller marked complete",
  closed: "Closed",
};

function listingImageVariant(crop: string): ProduceListing["imageVariant"] {
  const value = crop.toLowerCase();
  if (value.includes("grape")) return "grape-vines";
  if (value.includes("onion")) return "onion-sacks";
  if (value.includes("okra")) return "okra-basket";
  return "tomato-crates";
}

export function BusinessDashboard({
  currentUser,
  initialListings,
  initialEnquiries,
}: {
  currentUser: FarmerProfile;
  initialListings: ProduceListing[];
  initialEnquiries: MarketEnquiry[];
}) {
  const categoryMessages = useTranslations("agricultureCategories");
  const [listings, setListings] = useState(initialListings);
  const [enquiries, setEnquiries] = useState(initialEnquiries);
  const [activeView, setActiveView] = useState<"overview" | "listings" | "enquiries">(
    "overview",
  );
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLead, setSelectedLead] = useState<MarketEnquiry | null>(null);
  const [toast, setToast] = useState("");
  const [isPending, startTransition] = useTransition();

  const metrics = useMemo(() => {
    const views = listings.reduce((sum, listing) => sum + listing.viewCount, 0);
    const saves = listings.reduce((sum, listing) => sum + listing.saveCount, 0);
    const totalEnquiries = listings.reduce(
      (sum, listing) => sum + listing.enquiryCount,
      0,
    );
    const activeListings = listings.filter(
      (listing) => listing.status === "active",
    ).length;
    const newEnquiries = enquiries.filter(
      (lead) => lead.status === "new",
    ).length;
    const won = enquiries.filter((lead) => lead.status === "won").length;
    return { activeListings, newEnquiries, views, saves, totalEnquiries, won };
  }, [enquiries, listings]);

  function updateListingStatus(listing: ProduceListing, status: ListingStatus) {
    startTransition(async () => {
      const result = await updateListingStatusAction({
        listingId: listing.id,
        status,
      });
      if (!result.ok) {
        setToast(result.message ?? "Listing status could not be changed.");
        return;
      }
      setListings((current) =>
        current.map((item) =>
          item.id === listing.id ? { ...item, status } : item,
        ),
      );
      setToast(`“${listing.title}” is now ${status}.`);
    });
  }

  function updateLeadStatus(enquiry: MarketEnquiry, status: LeadStatus) {
    startTransition(async () => {
      const result = await updateLeadStatusAction({
        enquiryId: enquiry.id,
        status,
      });
      if (!result.ok) {
        setToast(result.message ?? "Enquiry status could not be changed.");
        return;
      }
      setEnquiries((current) =>
        current.map((item) =>
          item.id === enquiry.id ? { ...item, status } : item,
        ),
      );
      setSelectedLead((current) =>
        current?.id === enquiry.id ? { ...current, status } : current,
      );
      setToast(`Buyer marked as ${leadStatusLabels[status].toLowerCase()}.`);
    });
  }

  function createListing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const crop = String(form.get("crop") ?? "");
    const input = {
      title: form.get("title"),
      crop,
      variety: form.get("variety"),
      description: form.get("description"),
      quantity: form.get("quantity"),
      unit: form.get("unit"),
      minOrder: form.get("minOrder"),
      price: form.get("price"),
      priceUnit: form.get("priceUnit"),
      harvestStart: form.get("harvestStart"),
      harvestEnd: form.get("harvestEnd"),
      availableUntil: form.get("availableUntil"),
      grade: form.get("grade"),
      deliveryRadiusKm: form.get("deliveryRadiusKm"),
      deliveryOptions: form.getAll("deliveryOptions"),
      certifications: form.getAll("certifications"),
    };

    startTransition(async () => {
      const result = await createListingAction(input);
      if (!result.ok) {
        setToast(result.message ?? "The listing could not be published.");
        return;
      }

      const newListing: ProduceListing = {
        id: result.listingId,
        sellerId: currentUser.id,
        title: String(input.title),
        crop,
        variety: String(input.variety),
        description: String(input.description),
        quantity: Number(input.quantity),
        unit: input.unit as ProduceListing["unit"],
        minOrder: Number(input.minOrder),
        price: Number(input.price),
        priceUnit: input.priceUnit as ProduceListing["priceUnit"],
        harvestStart: String(input.harvestStart),
        harvestEnd: String(input.harvestEnd),
        availableUntil: String(input.availableUntil),
        grade: String(input.grade),
        deliveryOptions: input.deliveryOptions.map(String),
        deliveryRadiusKm: Number(input.deliveryRadiusKm),
        certifications: input.certifications.map(String),
        status: "active",
        viewCount: 0,
        saveCount: 0,
        enquiryCount: 0,
        createdLabel: "Just now",
        imageVariant: listingImageVariant(crop),
        seller: currentUser,
        reviewSummary: currentUser.reviewSummary,
      };
      setListings((current) => [newListing, ...current]);
      setShowCreate(false);
      setActiveView("listings");
      setToast("Your produce listing is live and ready to share.");
    });
  }

  async function shareStore() {
    const url = `${window.location.origin}/store/${currentUser.handle}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${currentUser.fullName} on FarmerBook`,
          text: "See my current farm produce and send a direct enquiry.",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setToast("Storefront link copied.");
      }
    } catch {
      // A cancelled system share sheet does not need an error state.
    }
  }

  return (
    <>
      <section className="business-hero">
        <div>
          <span className="badge badge--amber">
            <Sparkles size={14} aria-hidden="true" />
            Seller growth centre
          </span>
          <h2>Turn your profile into a customer channel.</h2>
          <p>
            Publish what is available, share one trusted storefront and move
            every buyer from enquiry to repeat business.
          </p>
          <div className="business-hero__actions">
            <button className="button" type="button" onClick={() => setShowCreate(true)}>
              <Plus size={17} aria-hidden="true" /> Add produce listing
            </button>
            <button className="button button--secondary" type="button" onClick={shareStore}>
              <Share2 size={17} aria-hidden="true" /> Share storefront
            </button>
          </div>
        </div>
        <div className="business-score">
          <span>Active availability</span>
          <strong>{metrics.activeListings}</strong>
          <p>
            {metrics.activeListings === 1
              ? "One listing is visible to buyers."
              : `${metrics.activeListings} listings are visible to buyers.`}
          </p>
        </div>
      </section>

      <nav className="business-tabs" aria-label="Business dashboard">
        {[
          ["overview", "Overview"],
          ["listings", `Listings (${listings.length})`],
          ["enquiries", `Buyer enquiries (${enquiries.length})`],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-current={activeView === id ? "page" : undefined}
            onClick={() => setActiveView(id as typeof activeView)}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeView === "overview" ? (
        <>
          <section className="metric-grid" aria-label="Business reach">
            <article className="card metric-card">
              <span className="metric-icon"><Eye size={19} aria-hidden="true" /></span>
              <p>Listing views</p>
              <strong>{metrics.views.toLocaleString("en-IN")}</strong>
              <small>Across {listings.length} recorded listings</small>
            </article>
            <article className="card metric-card">
              <span className="metric-icon"><UsersRound size={19} aria-hidden="true" /></span>
              <p>Buyer enquiries</p>
              <strong>{metrics.totalEnquiries}</strong>
              <small>{metrics.newEnquiries} awaiting a response</small>
            </article>
            <article className="card metric-card">
              <span className="metric-icon"><CircleDollarSign size={19} aria-hidden="true" /></span>
              <p>Purchases completed</p>
              <strong>{metrics.won}</strong>
              <small>From {enquiries.length} recorded leads</small>
            </article>
            <article className="card metric-card">
              <span className="metric-icon"><Store size={19} aria-hidden="true" /></span>
              <p>Buyer saves</p>
              <strong>{metrics.saves}</strong>
              <small>People watching your availability</small>
            </article>
          </section>

          <div className="business-overview-grid">
            <section className="card reach-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Activity</p>
                  <h3>Your recorded customer reach</h3>
                </div>
              </div>
              <p className="reach-insight">
                <Eye size={16} aria-hidden="true" />
                {metrics.views
                  ? `${metrics.views.toLocaleString("en-IN")} listing views have been recorded.`
                  : "Activity history will appear after buyers view your listings."}
              </p>
            </section>

            <section className="card next-steps-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Recommended</p>
                  <h3>Grow your credibility</h3>
                </div>
              </div>
              <ul className="growth-checklist">
                <li className="is-done">
                  <CheckCircle2 size={18} aria-hidden="true" />
                  <span><strong>Complete your seller profile</strong>Customers know who they are dealing with.</span>
                </li>
                <li className={metrics.activeListings ? "is-done" : undefined}>
                  {metrics.activeListings ? (
                    <CheckCircle2 size={18} aria-hidden="true" />
                  ) : (
                    <PackagePlus size={18} aria-hidden="true" />
                  )}
                  <span>
                    <strong>Publish available produce</strong>
                    {metrics.activeListings
                      ? `${metrics.activeListings} active ${metrics.activeListings === 1 ? "listing is" : "listings are"} visible today.`
                      : "Add a current listing so buyers can find your supply."}
                  </span>
                </li>
                <li>
                  <MessageSquareText size={18} aria-hidden="true" />
                  <span><strong>Ask for a recommendation</strong>Past buyers can strengthen trust.</span>
                </li>
                <li>
                  <Share2 size={18} aria-hidden="true" />
                  <span><strong>Share your storefront</strong>Use WhatsApp groups and customer lists.</span>
                </li>
              </ul>
            </section>
          </div>

          <section className="card lead-preview-card">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Buyer inbox</p>
                <h3>Enquiries needing attention</h3>
              </div>
              <button className="text-button" type="button" onClick={() => setActiveView("enquiries")}>
                View all <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            </div>
            <LeadRows
              enquiries={enquiries.filter((lead) => lead.status === "new").slice(0, 3)}
              onSelect={setSelectedLead}
            />
          </section>
        </>
      ) : null}

      {activeView === "listings" ? (
        <section className="listing-manager">
          <div className="listing-manager__head">
            <div>
              <h2>Your produce listings</h2>
              <p>Keep availability current so buyers can trust what they see.</p>
            </div>
            <button className="button" type="button" onClick={() => setShowCreate(true)}>
              <PackagePlus size={17} aria-hidden="true" /> New listing
            </button>
          </div>
          <div className="listing-manager__grid">
            {listings.map((listing) => (
              <article className="card managed-listing" key={listing.id}>
                <ListingImage
                  className="listing-photo managed-listing__photo"
                  variant={listing.imageVariant}
                />
                <div className="managed-listing__body">
                  <div className="managed-listing__top">
                    <span className={`status-pill status-pill--${listing.status}`}>
                      {listing.status}
                    </span>
                    <span>{listing.createdLabel}</span>
                  </div>
                  <h3>{listing.title}</h3>
                  <p>
                    {listing.quantity} {listing.unit} · ₹{listing.price}/{listing.priceUnit}
                  </p>
                  <div className="managed-listing__metrics">
                    <span><Eye size={14} aria-hidden="true" /> {listing.viewCount}</span>
                    <span><MessageSquareText size={14} aria-hidden="true" /> {listing.enquiryCount}</span>
                  </div>
                  <div className="managed-listing__actions">
                    <Link className="button button--secondary button--small" href={`/marketplace/${listing.id}`}>
                      View
                    </Link>
                    <label className="status-select">
                      <span className="sr-only">Listing status</span>
                      <select
                        className="select"
                        value={listing.status}
                        disabled={isPending}
                        onChange={(event) =>
                          updateListingStatus(listing, event.target.value as ListingStatus)
                        }
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="sold">Sold out</option>
                        <option value="draft">Draft</option>
                      </select>
                      <ChevronDown size={14} aria-hidden="true" />
                    </label>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {activeView === "enquiries" ? (
        <section className="card enquiries-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Customer pipeline</p>
              <h2>Buyer enquiries</h2>
              <p>Open a lead, respond directly and keep its status current.</p>
            </div>
          </div>
          <LeadRows enquiries={enquiries} onSelect={setSelectedLead} />
        </section>
      ) : null}

      {showCreate ? (
        <div className="dialog-backdrop" role="presentation">
          <section className="dialog-card listing-dialog" role="dialog" aria-modal="true" aria-labelledby="listing-dialog-title">
            <div className="dialog-head">
              <div>
                <p className="eyebrow">Reach more buyers</p>
                <h2 id="listing-dialog-title">Add produce listing</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close" onClick={() => setShowCreate(false)}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <form className="listing-form" onSubmit={createListing}>
              <div className="form-row">
                <label className="field">
                  <span>Listing title</span>
                  <input className="input" name="title" placeholder="Fresh Roma tomatoes — weekly harvest" required minLength={5} />
                </label>
                <div className="field">
                  <label htmlFor="listing-produce-category">Crop or produce</label>
                  <input className="input" id="listing-produce-category" name="crop" list="produce-category-suggestions" placeholder="Tomato" required aria-describedby="listing-produce-category-help" />
                  <datalist id="produce-category-suggestions">
                    {PRODUCE_CATEGORY_SUGGESTIONS.map((category) => (
                      <option
                        key={category.slug}
                        value={categoryMessages(category.slug as AgricultureCategorySlug)}
                      />
                    ))}
                  </datalist>
                  <small className="form-helper" id="listing-produce-category-help">Choose a suggestion or type another produce name.</small>
                </div>
              </div>
              <div className="form-row">
                <label className="field">
                  <span>Variety</span>
                  <input className="input" name="variety" placeholder="Roma VF" required />
                </label>
                <label className="field">
                  <span>Grade / size</span>
                  <input className="input" name="grade" placeholder="A grade, 45–60 mm" required />
                </label>
              </div>
              <label className="field">
                <span>What should buyers know?</span>
                <textarea className="textarea" name="description" minLength={20} maxLength={1000} required placeholder="Describe quality, handling, packing and the kind of buyer this lot suits." />
              </label>
              <div className="listing-form__numbers">
                <label className="field">
                  <span>Available</span>
                  <input className="input" name="quantity" type="number" min="1" required />
                </label>
                <label className="field">
                  <span>Unit</span>
                  <select className="select" name="unit" defaultValue="kg">
                    <option value="kg">kg</option>
                    <option value="quintal">quintal</option>
                    <option value="tonne">tonne</option>
                    <option value="box">box</option>
                  </select>
                </label>
                <label className="field">
                  <span>Price (₹)</span>
                  <input className="input" name="price" type="number" min="1" required />
                </label>
                <label className="field">
                  <span>Per</span>
                  <select className="select" name="priceUnit" defaultValue="kg">
                    <option value="kg">kg</option>
                    <option value="quintal">quintal</option>
                    <option value="tonne">tonne</option>
                    <option value="box">box</option>
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label className="field">
                  <span>Minimum order</span>
                  <input className="input" name="minOrder" type="number" min="1" required />
                </label>
                <label className="field">
                  <span>Delivery radius (km)</span>
                  <input className="input" name="deliveryRadiusKm" type="number" min="1" defaultValue="50" />
                </label>
              </div>
              <div className="form-row">
                <label className="field">
                  <span>Harvest starts</span>
                  <input className="input" name="harvestStart" placeholder="3 Aug" required />
                </label>
                <label className="field">
                  <span>Harvest ends</span>
                  <input className="input" name="harvestEnd" placeholder="28 Aug" required />
                </label>
              </div>
              <label className="field">
                <span>Available until</span>
                <input className="input" name="availableUntil" placeholder="28 Aug 2026" required />
              </label>
              <fieldset className="choice-field">
                <legend>Delivery options</legend>
                <label><input type="checkbox" name="deliveryOptions" value="Farm pickup" defaultChecked /> Farm pickup</label>
                <label><input type="checkbox" name="deliveryOptions" value="Local delivery" /> Local delivery</label>
                <label><input type="checkbox" name="deliveryOptions" value="Transport arranged" /> Transport arranged</label>
              </fieldset>
              <fieldset className="choice-field">
                <legend>Seller-declared handling details</legend>
                <label><input type="checkbox" name="certifications" value="Farm identity provided" /> Farm identity provided</label>
                <label><input type="checkbox" name="certifications" value="Testing information available" /> Testing information available</label>
                <label><input type="checkbox" name="certifications" value="Lot tracking available" /> Lot tracking available</label>
                <small>
                  These details are supplied by the seller and are not verified
                  by FarmerBook.
                </small>
              </fieldset>
              <div className="dialog-actions">
                <button className="button button--secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="button" type="submit" disabled={isPending}>
                  {isPending ? "Publishing…" : "Publish listing"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {selectedLead ? (
        <div className="dialog-backdrop" role="presentation">
          <section className="dialog-card lead-dialog" role="dialog" aria-modal="true" aria-labelledby="lead-dialog-title">
            <div className="dialog-head">
              <div>
                <p className="eyebrow">Buyer enquiry</p>
                <h2 id="lead-dialog-title">{selectedLead.buyerName}</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Close" onClick={() => setSelectedLead(null)}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <p className="lead-dialog__business">{selectedLead.businessName} · {selectedLead.location}</p>
            <div className="lead-need">
              <span><strong>Needs</strong>{selectedLead.quantityNeeded}</span>
              <span><strong>By</strong>{selectedLead.needBy}</span>
              <span><strong>For</strong>{selectedLead.listingTitle}</span>
            </div>
            <blockquote>{selectedLead.message}</blockquote>
            <div className="lead-contact-actions">
              <a className="button" href={`tel:${selectedLead.phone}`}>
                <Phone size={17} aria-hidden="true" /> Call buyer
              </a>
              <a className="button button--secondary" href={`mailto:${selectedLead.email}`}>
                <Mail size={17} aria-hidden="true" /> Email
              </a>
              <button
                className="button button--ghost"
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectedLead.phone);
                  setToast("Phone number copied.");
                }}
              >
                <Copy size={17} aria-hidden="true" /> Copy number
              </button>
            </div>
            <label className="field">
              <span>Lead status</span>
              <select
                className="select"
                value={selectedLead.status}
                disabled={isPending}
                onChange={(event) =>
                  updateLeadStatus(selectedLead, event.target.value as LeadStatus)
                }
              >
                {Object.entries(leadStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </section>
        </div>
      ) : null}

      {toast ? (
        <button className="toast" type="button" onClick={() => setToast("")}>
          <CheckCircle2 size={19} aria-hidden="true" />
          {toast}
        </button>
      ) : null}
    </>
  );
}

function LeadRows({
  enquiries,
  onSelect,
}: {
  enquiries: MarketEnquiry[];
  onSelect: (enquiry: MarketEnquiry) => void;
}) {
  if (!enquiries.length) {
    return (
      <div className="lead-empty">
        <MessageSquareText size={23} aria-hidden="true" />
        <p>New buyer enquiries will appear here.</p>
      </div>
    );
  }

  return (
    <div className="lead-rows">
      {enquiries.map((enquiry) => (
        <button key={enquiry.id} type="button" onClick={() => onSelect(enquiry)}>
          <span className="lead-avatar">{enquiry.buyerName.slice(0, 1)}</span>
          <span className="lead-row__identity">
            <strong>{enquiry.buyerName}</strong>
            <small>{enquiry.businessName} · {enquiry.location}</small>
          </span>
          <span className="lead-row__need">
            <strong>{enquiry.quantityNeeded}</strong>
            <small>{enquiry.listingTitle}</small>
          </span>
          <span className={`lead-status lead-status--${enquiry.status}`}>
            {leadStatusLabels[enquiry.status]}
          </span>
          <span className="lead-row__time">{enquiry.createdLabel}</span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
