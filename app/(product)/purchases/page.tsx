import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, PackageCheck } from "lucide-react";
import { ProductHeader } from "@/components/product-header";
import { ReviewForm } from "@/features/reviews/review-form";
import { loadCustomerPurchases } from "@/features/reviews/queries";
import { requireUser } from "@/features/auth/require-user";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "My purchases" };

const statusLabels = {
  new: "Request sent",
  contacted: "Seller responded",
  qualified: "Discussing order",
  won: "Seller marked complete",
  closed: "Closed",
};

export default async function PurchasesPage() {
  if (isSupabaseConfigured()) {
    const user = await requireUser();
    if (user.profile.accountRole !== "customer") redirect("/business");
  }
  const { enquiries } = await loadCustomerPurchases();

  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Customer account"
        title="My purchases"
        description="Track seller connections, continue conversations and review seller-confirmed completed enquiries."
      />
      {enquiries.length ? (
        <section className="purchase-list">
          {enquiries.map((enquiry) => (
            <article className="card purchase-card" key={enquiry.id}>
              <div className="purchase-card__head">
                <div>
                  <span className={`status-pill status-pill--${enquiry.status}`}>
                    {statusLabels[enquiry.status]}
                  </span>
                  <h2>{enquiry.listingTitle ?? "Produce enquiry"}</h2>
                  <p>
                    {enquiry.seller?.fullName ?? "Seller"} ·{" "}
                    {enquiry.seller?.roleLabel}
                  </p>
                </div>
                <PackageCheck size={26} aria-hidden="true" />
              </div>
              <dl className="purchase-facts">
                <div>
                  <dt>Quantity</dt>
                  <dd>{enquiry.quantityNeeded}</dd>
                </div>
                <div>
                  <dt>Needed by</dt>
                  <dd>{enquiry.needBy}</dd>
                </div>
                <div>
                  <dt>Sent</dt>
                  <dd>{enquiry.createdLabel}</dd>
                </div>
              </dl>
              <p>{enquiry.message}</p>
              {enquiry.conversationId ? (
                <Link
                  className="button button--secondary button--small"
                  href={`/messages/${enquiry.conversationId}`}
                >
                  <MessageCircle size={15} aria-hidden="true" />
                  Open conversation
                </Link>
              ) : null}
              {enquiry.status === "won" ? (
                <ReviewForm
                  enquiryId={enquiry.id}
                  initialReview={enquiry.review}
                />
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <section className="card empty-state">
          <div>
            <h2>No purchase connections yet</h2>
            <p>Browse current produce and send your first seller enquiry.</p>
            <Link className="button" href="/market">
              Browse produce
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
