import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GitGraph Painter",
    short_name: "GitGraph",
    description: "Paint a GitHub contribution graph and download a local commit script.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF7F0",
    theme_color: "#2D5A3D",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.svg",
        sizes: "180x180",
        type: "image/svg+xml",
      },
    ],
  };
}
