"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  Factory,
  Compass,
  HelpCircle,
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
import {
  useAuthenticatedMessages,
  useTranslations,
} from "@/components/locale-provider";

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
  const { navigation } = useAuthenticatedMessages();
  const common = useTranslations("common");
  const profileHref = `/farmers/${currentUser.handle}`;
  const commerceItem =
    currentUser.accountRole === "customer"
      ? {
          href: "/purchases",
          label: navigation.myPurchases,
          icon: ShoppingBasket,
        }
      : currentUser.accountRole === "agri_business"
        ? {
            href: "/company",
            label: navigation.myCompany,
            icon: Building2,
          }
        : {
            href: "/business",
            label: navigation.growBusiness,
            icon: BriefcaseBusiness,
          };
  const desktopNavItems = [
    { href: "/feed", label: navigation.feed, icon: Home },
    { href: "/market", label: navigation.produceMarket, icon: Store },
    ...(incSourcingEnabled ? [{ href: "/sourcing", label: navigation.sourcingNeeds, icon: Factory }] : []),
    { href: "/discover", label: navigation.discover, icon: Search },
    { href: "/network", label: navigation.network, icon: UsersRound },
    { href: "/messages", label: navigation.messages, icon: MessageCircle },
    { href: "/support", label: navigation.support, icon: HelpCircle },
    commerceItem,
    { href: profileHref, label: navigation.myProfile, icon: UserRound },
  ];
  const mobileNavItems = [
    { href: "/feed", label: navigation.feed, icon: Home },
    { href: "/market", label: navigation.market, icon: Store },
    currentUser.accountRole === "customer"
      ? { href: "/purchases", label: navigation.purchases, icon: ShoppingBasket }
      : currentUser.accountRole === "agri_business"
        ? { href: "/company", label: navigation.company, icon: Building2 }
        : { href: "/network", label: navigation.network, icon: UsersRound },
    { href: "/messages", label: navigation.messages, icon: MessageCircle },
    { href: profileHref, label: navigation.profile, icon: UserRound },
  ];

  return (
    <>
      <DemoBanner visible={demo} label={common("demoBanner")} />
      <div className="app-shell">
        <aside className="app-rail">
          <Link
            href="/feed"
            className="app-rail__brand brand"
            aria-label={navigation.farmerbookFeed}
          >
            <Brand inverse />
          </Link>
          <nav className="app-nav" aria-label={navigation.primary}>
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
          <Link href="/feed" className="brand" aria-label={navigation.farmerbookFeed}>
            <Brand />
          </Link>
          <Link
            className="icon-button"
            href="/discover"
            aria-label={navigation.searchFarmerbook}
          >
            <Compass size={20} aria-hidden="true" />
          </Link>
        </header>

        <main className="app-main">{children}</main>

        <nav className="mobile-nav" aria-label={navigation.mobileNavigation}>
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
