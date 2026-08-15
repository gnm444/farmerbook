import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FarmerBook",
    short_name: "FarmerBook",
    description:
      "A farmer-first social and professional network with a direct agriculture marketplace for India.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4e9",
    theme_color: "#1f6b45",
  };
}
