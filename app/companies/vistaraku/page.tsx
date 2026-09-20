import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { VISTARAKU_PARTNER } from "@/features/vistaraku/catalog";
import { VISTARAKU_STORE_PRODUCTS } from "@/features/vistaraku/store-products";
import { VistarakuStorefront } from "@/features/vistaraku/storefront";
import styles from "@/features/vistaraku/vistaraku.module.css";

export const metadata: Metadata = {
  title: "Vistaraku — natural tableware store",
  description: "Shop Vistaraku natural leaf plates, bowls, takeaway boxes and plant-based tableware through FarmerBook.",
  alternates: { canonical: "/companies/vistaraku" },
};

const VISTARAKU_STORE_ORDER_EMAIL = "gnm444@gmail.com";
const VISTARAKU_WHATSAPP_URL = "https://wa.me/919177901022";

export default function VistarakuPage() {
  return (
    <>
      <PublicHeader />
      <main className={styles.page}>
        <div className={`container ${styles.container}`}>
          <div className={styles.storeTopbar}>
            <Link className="back-link" href="/marketplace"><ArrowLeft size={16} aria-hidden="true" /> Marketplace</Link>
            <a href={VISTARAKU_PARTNER.website} target="_blank" rel="noopener noreferrer">Official Vistaraku website <ExternalLink size={14} aria-hidden="true" /></a>
          </div>
          <VistarakuStorefront
            products={VISTARAKU_STORE_PRODUCTS}
            orderEmail={VISTARAKU_STORE_ORDER_EMAIL}
            turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
          />
          <section className={styles.partnerFooter} aria-label="Vistaraku contact details">
            <div><ShieldCheck size={20} aria-hidden="true" /><strong>Vistaraku — a women-led social enterprise</strong><span>Creating sustainable products while empowering rural and tribal women.</span></div>
            <div><MapPin size={18} aria-hidden="true" /><span>{VISTARAKU_PARTNER.address}</span></div>
            <div><Mail size={18} aria-hidden="true" /><span>Store enquiries: </span><a href={`mailto:${VISTARAKU_STORE_ORDER_EMAIL}`}>{VISTARAKU_STORE_ORDER_EMAIL}</a></div>
            <div><Phone size={18} aria-hidden="true" /><span>WhatsApp: </span><a href={VISTARAKU_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">+91 91779 01022</a></div>
          </section>
        </div>
      </main>
      <PublicFooter />
    </>
  );
}
