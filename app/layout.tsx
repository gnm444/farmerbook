import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const description =
  "A trusted, crop- and location-aware professional community for farmers and people working in agriculture.";

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
  const socialImage = new URL("/og.png", metadataBase);

  return {
    metadataBase,
    title: {
      default: "FarmerBook — Grow knowledge together",
      template: "%s · FarmerBook",
    },
    description,
    openGraph: {
      type: "website",
      siteName: "FarmerBook",
      title: "FarmerBook — Grow knowledge together",
      description,
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: "FarmerBook — Grow knowledge. Build trusted connections.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "FarmerBook — Grow knowledge together",
      description,
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
