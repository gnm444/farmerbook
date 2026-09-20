import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pledge against plastic plates",
  description:
    "Make FarmerBook's pledge to avoid single-use plastic plates and choose natural leaf plates for meals, gatherings and community events.",
  alternates: { canonical: "/pledge" },
  openGraph: {
    title: "Pledge against plastic plates · FarmerBook",
    description:
      "Choose natural leaf plates for your next meal, gathering or community event.",
    url: "/pledge",
    images: [
      {
        url: "/images/pledge-campaign/natural-leaf-plates-square-social.png",
        width: 1254,
        height: 1254,
        alt: "Choose natural plates and avoid single-use plastic — a FarmerBook pledge.",
      },
    ],
  },
};

export default function PledgeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
