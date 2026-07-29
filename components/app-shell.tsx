"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Home,
  MessageCircle,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Avatar, Brand, DemoBanner } from "@/components/ui";
import { getProfile, currentUserId } from "@/lib/demo-data";

const navItems = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/discover", label: "Discover", icon: Search },
  { href: "/network", label: "Network", icon: UsersRound },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/farmers/meera_kulkarni", label: "My Profile", icon: UserRound },
];

function activeFor(pathname: string, href: string) {
  if (href === "/farmers/meera_kulkarni") {
    return (
      pathname.startsWith("/farmers/meera_kulkarni") ||
      pathname.startsWith("/settings")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentUser = getProfile(currentUserId);

  return (
    <>
      <DemoBanner />
      <div className="app-shell">
        <aside className="app-rail">
          <Link
            href="/feed"
            className="app-rail__brand brand"
            aria-label="FarmerBook feed"
          >
            <Brand inverse />
          </Link>
          <nav className="app-nav" aria-label="Primary">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={activeFor(pathname, href) ? "page" : undefined}
              >
                <Icon size={20} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="rail-profile">
            <Avatar initials={currentUser.initials} size="small" />
            <div className="rail-profile__copy">
              <strong>{currentUser.fullName}</strong>
              <span>@{currentUser.handle}</span>
            </div>
          </div>
        </aside>

        <header className="mobile-topbar">
          <Link href="/feed" className="brand" aria-label="FarmerBook feed">
            <Brand />
          </Link>
          <Link
            className="icon-button"
            href="/discover"
            aria-label="Search FarmerBook"
          >
            <Compass size={20} aria-hidden="true" />
          </Link>
        </header>

        <main className="app-main">{children}</main>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={activeFor(pathname, href) ? "page" : undefined}
            >
              <Icon size={21} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
