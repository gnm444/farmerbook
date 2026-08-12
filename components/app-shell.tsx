"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  Factory,
  Compass,
  Home,
  MessageCircle,
  ShoppingBasket,
  Search,
  Store,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Avatar, Brand, DemoBanner } from "@/components/ui";
import { LanguageSelector } from "@/components/language-selector";
import type { FarmerProfile } from "@/lib/types";
import { useTranslations } from "@/components/locale-provider";

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
  extendedLocalesEnabled,
  incSourcingEnabled,
}: {
  children: React.ReactNode;
  currentUser: FarmerProfile;
  demo: boolean;
  extendedLocalesEnabled: boolean;
  incSourcingEnabled: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const common = useTranslations("common");
  const profileHref = `/farmers/${currentUser.handle}`;
  const commerceItem =
    currentUser.accountRole === "customer"
      ? {
          href: "/purchases",
          label: t("myPurchases"),
          icon: ShoppingBasket,
        }
      : currentUser.accountRole === "agri_business"
        ? {
            href: "/company",
            label: t("myCompany"),
            icon: Building2,
          }
        : {
            href: "/business",
            label: t("growBusiness"),
            icon: BriefcaseBusiness,
          };
  const desktopNavItems = [
    { href: "/feed", label: t("feed"), icon: Home },
    { href: "/market", label: t("produceMarket"), icon: Store },
    ...(incSourcingEnabled ? [{ href: "/sourcing", label: t("sourcingNeeds"), icon: Factory }] : []),
    { href: "/discover", label: t("discover"), icon: Search },
    { href: "/network", label: t("network"), icon: UsersRound },
    { href: "/messages", label: t("messages"), icon: MessageCircle },
    commerceItem,
    { href: profileHref, label: t("myProfile"), icon: UserRound },
  ];
  const mobileNavItems = [
    { href: "/feed", label: t("feed"), icon: Home },
    { href: "/market", label: t("market"), icon: Store },
    currentUser.accountRole === "customer"
      ? { href: "/purchases", label: t("purchases"), icon: ShoppingBasket }
      : currentUser.accountRole === "agri_business"
        ? { href: "/company", label: t("company"), icon: Building2 }
        : { href: "/network", label: t("network"), icon: UsersRound },
    { href: "/messages", label: t("messages"), icon: MessageCircle },
    { href: profileHref, label: t("profile"), icon: UserRound },
  ];

  return (
    <>
      <DemoBanner visible={demo} label={common("demoBanner")} />
      <div className="app-shell">
        <aside className="app-rail">
          <Link
            href="/feed"
            className="app-rail__brand brand"
            aria-label={t("farmerbookFeed")}
          >
            <Brand inverse />
          </Link>
          <nav className="app-nav" aria-label={t("primary")}>
            {desktopNavItems.map(({ href, label, icon: Icon }) => (
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
              role={currentUser.accountRole}
              size="small"
            />
            <div className="rail-profile__copy">
              <strong>{currentUser.fullName}</strong>
              <span>@{currentUser.handle}</span>
            </div>
          </div>
          <LanguageSelector
            className="language-selector language-selector--rail"
            extendedLocalesEnabled={extendedLocalesEnabled}
          />
        </aside>

        <header className="mobile-topbar">
          <Link href="/feed" className="brand" aria-label={t("farmerbookFeed")}>
            <Brand />
          </Link>
          <Link
            className="icon-button"
            href="/discover"
            aria-label={t("searchFarmerbook")}
          >
            <Compass size={20} aria-hidden="true" />
          </Link>
        </header>

        <main className="app-main">{children}</main>

        <nav className="mobile-nav" aria-label={t("mobileNavigation")}>
          {mobileNavItems.map(({ href, label, icon: Icon }) => (
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
