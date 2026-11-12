import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DSS Astro Planner",
    short_name: "DSS Astro Planner",
    description: "Plan a deep-sky night: targets, altitude, framing, gear, and cloud cover.",
    start_url: "/",
    display: "standalone",
    background_color: "#141616",
    theme_color: "#141616",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
