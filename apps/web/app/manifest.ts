import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DeepSkyMate",
    short_name: "DeepSkyMate",
    description: "Astrophotography planner by DarkSkyscapes",
    start_url: "/",
    display: "standalone",
    background_color: "#141616",
    theme_color: "#141616",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
