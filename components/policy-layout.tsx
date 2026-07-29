import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";

export function PolicyLayout({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="policy-page">
      <PublicHeader />
      <main>
        <article className="card policy-article">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="muted">Last updated {updated}</p>
          {children}
          <p>
            Questions or feedback? Contact{" "}
            <a href="mailto:pilot@farmerbook.example">
              pilot@farmerbook.example
            </a>
            .
          </p>
          <p>
            <Link href="/">Return to FarmerBook</Link>
          </p>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
