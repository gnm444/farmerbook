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
import type { FarmerProfile } from "@/lib/types";

function activeFor(pathname: string, href: string, profileHref: string) {
  if (href === profileHref) {
    return (
      pathname.startsWith(profileHref) ||
      pathname.startsWith("/settings")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  currentUser,
  demo,
}: {
  children: React.ReactNode;
  currentUser: FarmerProfile;
  demo: boolean;
}) {
  const pathname = usePathname();
  const profileHref = `/farmers/${currentUser.handle}`;
  const navItems = [
    { href: "/feed", label: "Feed", icon: Home },
    { href: "/discover", label: "Discover", icon: Search },
    { href: "/network", label: "Network", icon: UsersRound },
    { href: "/messages", label: "Messages", icon: MessageCircle },
    { href: profileHref, label: "My Profile", icon: UserRound },
  ];

  return (
    <>
      <DemoBanner visible={demo} />
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
                aria-current={
                  activeFor(pathname, href, profileHref) ? "page" : undefined
                }
              >
                <Icon size={20} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="rail-profile">
            <Avatar
              initials={currentUser.initials}
              imageUrl={currentUser.avatarUrl}
              size="small"
            />
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
              aria-current={
                activeFor(pathname, href, profileHref) ? "page" : undefined
              }
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
