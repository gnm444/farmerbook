import { Database, Search } from "lucide-react";

export default function SourcedFarmersLoading() {
  return (
    <main
      className="product-page sourced-farmers-loading"
      aria-busy="true"
      aria-live="polite"
    >
      <section className="card empty-state sourced-farmers-loading__card">
        <Search aria-hidden="true" />
        <div>
          <p className="eyebrow">Founder administrator · private research</p>
          <h1>Loading sourced Farmer research</h1>
          <p>
            Reading the latest bounded run, exact counts, and reviewed evidence.
          </p>
          <p className="muted">
            Private research · not a FarmerBook member · not verified · no contact
            or outreach consent.
          </p>
        </div>
        <Database aria-hidden="true" />
      </section>
    </main>
  );
}
