import Link from "next/link";

export function SettingsNav({ current }: { current: "profile" | "account" }) {
  return (
    <nav className="settings-nav" aria-label="Settings">
      <Link
        href="/settings/profile"
        aria-current={current === "profile" ? "page" : undefined}
      >
        Profile and language
      </Link>
      <Link
        href="/settings/account"
        aria-current={current === "account" ? "page" : undefined}
      >
        Account and privacy
      </Link>
      <Link href="/community-rules">Community rules</Link>
      <Link href="/privacy">Privacy notice</Link>
    </nav>
  );
}
