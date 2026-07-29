import Link from "next/link";
import { Brand } from "@/components/ui";

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="container footer-grid">
        <Brand />
        <div className="footer-links">
          <Link href="/community-rules">Community rules</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href="mailto:pilot@farmerbook.example">Pilot feedback</a>
          <span>© 2026 FarmerBook</span>
        </div>
      </div>
    </footer>
  );
}
