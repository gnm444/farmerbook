import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Mail, MapPin, PackageCheck, Phone, ShieldCheck } from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import {
  VISTARAKU_CATALOG_REVIEWED_AT,
  VISTARAKU_PARTNER,
  VISTARAKU_PRODUCTS,
} from "@/features/vistaraku/catalog";
import styles from "@/features/vistaraku/vistaraku.module.css";

export const metadata: Metadata = {
  title: "Vistaraku tableware",
  description: "FarmerBook manufacturer catalog for Vistaraku plates, bowls, boxes, cutlery, straws and cups, with source-linked specifications.",
  alternates: { canonical: "/companies/vistaraku" },
};

const evidence = [
  { label: "OECD — Global Plastics Outlook", href: "https://www.oecd.org/en/publications/2022/02/global-plastics-outlook_a653d1c9.html", detail: "Global plastics use, waste and recycling evidence." },
  { label: "UNEP — marine litter and plastic pollution", href: "https://www.unep.org/resources/pollution-solution-global-assessment-marine-litter-and-plastic-pollution", detail: "Assessment of plastic pollution across ecosystems." },
  { label: "WHO — microplastics in drinking-water", href: "https://www.who.int/news/item/22-08-2019-who-calls-for-more-research-into-microplastics-and-a-crackdown-on-plastic-pollution", detail: "Calls for more research and careful risk communication." },
  { label: "UNEP — single-use product life cycles", href: "https://wedocs.unep.org/items/b775ce01-324b-40db-b46f-ef9ed4a61b51", detail: "Why impacts should be considered across a product’s life cycle." },
  { label: "CPCB — India single-use plastic measures", href: "https://cpcb.nic.in/uploads/Press-release-SUP-ban-17062022.pdf", detail: "Official Indian policy context for identified single-use plastic items." },
];

export default function VistarakuPage() {
  return (
    <>
      <PublicHeader />
      <main className={styles.page}>
        <div className={`container ${styles.container}`}>
          <Link className="back-link" href="/marketplace"><ArrowLeft size={16} aria-hidden="true" /> Marketplace</Link>
          <section className={styles.hero}>
            <div>
              <span className={styles.verified}><ShieldCheck size={16} aria-hidden="true" /> Manufacturer information reviewed from public sources</span>
              <p className={styles.eyebrow}>FarmerBook manufacturer and brand page</p>
              <h1>Vistaraku</h1>
              <p className={styles.lede}>Areca palm leaf tableware, food boxes, wooden cutlery, rice straws and plant-fibre cups—presented with source-linked specifications and confirmation-first commerce.</p>
              <div className={styles.heroActions}>
                <a className="button" href="#vistaraku-catalog">Browse the catalog</a>
                <a href={VISTARAKU_PARTNER.website} target="_blank" rel="noopener noreferrer">Official website <ExternalLink size={15} aria-hidden="true" /></a>
              </div>
            </div>
            <div className={styles.sourceCard}>
              <PackageCheck size={28} aria-hidden="true" />
              <strong>Public-source catalog</strong>
              <p>Every listing below links directly to the manufacturer’s public page. FarmerBook does not copy or host product imagery in this candidate.</p>
              <a href={VISTARAKU_PARTNER.website} target="_blank" rel="noopener noreferrer">View Vistaraku’s official catalog <ExternalLink size={15} aria-hidden="true" /></a>
            </div>
          </section>

          <section className={styles.partnerFacts} aria-label="Vistaraku public business details">
            <div><MapPin aria-hidden="true" /><span>{VISTARAKU_PARTNER.address}</span></div>
            <div><Mail aria-hidden="true" /><a href={`mailto:${VISTARAKU_PARTNER.email}`}>{VISTARAKU_PARTNER.email}</a></div>
            <div><Phone aria-hidden="true" /><span>{VISTARAKU_PARTNER.phones.join(" · ")}</span></div>
            <div><PackageCheck aria-hidden="true" /><span>{VISTARAKU_PARTNER.hours}</span></div>
          </section>

          <section className={styles.commercialNotice}>
            <strong>Confirmation-first commerce</strong>
            <p>FarmerBook does not publish or promise a current price, tax amount, stock position, delivery fee, delivery window or fulfilment outcome for these products. Vistaraku publishes general ordering and delivery information on its own website, but whether it applies to a particular request must be confirmed directly with the manufacturer. No product is sold or reserved on this catalog page.</p>
          </section>

          <div className={styles.storyCatalogGrid}>
            <aside className={styles.awareness}>
              <p className={styles.eyebrow}>Serve with care. Share with gratitude.</p>
              <h2>A thoughtful plate begins with the whole story</h2>
              <p>A plate can hold more than a meal. Every meal brings together soil, sunlight, skilled hands and a community. Choosing thoughtfully is a quiet practice of gratitude—using what we need, wasting less and treating our shared world with care.</p>
              <p>Plastic pollution is a documented global problem, but no material has zero impact. The better question considers the full life cycle: how an item is sourced, made, transported, used, reused where suitable and managed after use.</p>
              <p>Evidence about microplastics and human health continues to develop. We avoid turning uncertainty into a health promise. Product suitability, disposal options and local facilities should be checked for the intended use.</p>
              <h3>Evidence and policy context</h3>
              <ul className={styles.sources}>
                {evidence.map((item) => <li key={item.href}><a href={item.href} target="_blank" rel="noopener noreferrer">{item.label} <ExternalLink size={13} aria-hidden="true" /></a><span>{item.detail}</span></li>)}
              </ul>
              <small>Sources reviewed 15 September 2026. These sources provide general context; they do not certify individual Vistaraku products.</small>
            </aside>

            <section id="vistaraku-catalog" className={styles.catalog} aria-labelledby="catalog-title">
              <div className={styles.sectionHeading}><p className={styles.eyebrow}>22 source-reviewed listings</p><h2 id="catalog-title">Product catalog</h2><p>Pack size and MOQ are transcribed from the manufacturer’s public catalog, reviewed {new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(new Date(`${VISTARAKU_CATALOG_REVIEWED_AT}T00:00:00+05:30`))}. Follow each source link to review the original listing.</p></div>
              <div className={styles.productGrid}>
                {VISTARAKU_PRODUCTS.map((product) => (
                  <article className={styles.productCard} key={product.slug}>
                    <div className={styles.productBody}>
                      <span>{product.category}</span><h3>{product.name}</h3>
                      <dl><div><dt>Material</dt><dd>{product.material}</dd></div><div><dt>Dimensions</dt><dd>{product.dimensions}</dd></div><div><dt>Pack</dt><dd>{product.packQuantity} pieces</dd></div><div><dt>MOQ</dt><dd>{product.minimumOrderQuantity ? `${product.minimumOrderQuantity.toLocaleString("en-IN")} pieces` : "Confirmation required"}</dd></div><div><dt>Price & tax</dt><dd>Confirm with manufacturer</dd></div><div><dt>Stock & delivery</dt><dd>Confirm with manufacturer</dd></div></dl>
                      {product.minimumOrderNote ? <p className={styles.productNote}>{product.minimumOrderNote}</p> : null}
                      {product.notes ? <p className={styles.productNote}>{product.notes}</p> : null}
                      <div className={styles.cardActions}><a href={product.sourceUrl} target="_blank" rel="noopener noreferrer">Manufacturer source <ExternalLink size={13} aria-hidden="true" /></a></div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <section className={styles.intakeSection} aria-labelledby="request-title">
            <div className={styles.sectionHeading}><p className={styles.eyebrow}>Catalog-first launch</p><h2 id="request-title">Ordering and product questions</h2><p>FarmerBook online requests are not enabled in this release. Use the manufacturer’s public contact details above and confirm every commercial and delivery detail directly.</p></div>
            <div className={styles.unavailable}><h3>Private intake remains closed</h3><p>No customer details, orders, inquiries, payments or notification-provider actions are collected by this catalog page.</p></div>
          </section>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
