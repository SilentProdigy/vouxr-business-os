import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vouxr Business OS",
    short_name: "Vouxr",
    description:
      "AI-assisted accounting and inventory management for small and medium-sized businesses.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f8",
    theme_color: "#0f172a",
    orientation: "portrait-primary",
  };
}
