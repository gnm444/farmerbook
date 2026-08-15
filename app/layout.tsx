import type { Metadata } from "next";
import { headers } from "next/headers";
import { ClientReady } from "@/components/client-ready";
import { LocaleProvider } from "@/components/locale-provider";
import { assertPublicRuntimeConfiguration } from "@/lib/env";
import { directionForLocale, getServerI18n } from "@/lib/i18n";
import "./globals.css";

const description =
  "A farmer-first social and professional network with a direct agriculture marketplace - LinkedIn-style identity and Facebook-style community, purpose-built for farmers.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  const metadataBase = host
    ? new URL(`${protocol}://${host}`)
    : new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  const socialImage = new URL("/og-marketplace.png", metadataBase);

  return {
    metadataBase,
    title: {
      default: "FarmerBook — Build trust. Reach more customers.",
      template: "%s · FarmerBook",
    },
    description,
    openGraph: {
      type: "website",
      siteName: "FarmerBook",
      title: "FarmerBook — Build trust. Reach more customers.",
      description,
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: "FarmerBook — Build trust. Reach more customers.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "FarmerBook — Build trust. Reach more customers.",
      description,
      images: [socialImage],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  assertPublicRuntimeConfiguration({
    requestHost:
      requestHeaders.get("host") ?? requestHeaders.get("x-forwarded-host"),
  });
  const { locale, messages } = await getServerI18n({ restoreProfile: true });

  return (
    <html lang={locale} dir={directionForLocale(locale)}>
      <body>
        <ClientReady />
        <LocaleProvider locale={locale} messages={messages}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
