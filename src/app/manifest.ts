import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PharmaCare — Your AI Pharmacy Assistant",
    short_name: "PharmaCare",
    description:
      "Search medicines, upload prescriptions, manage orders — all through AI-powered chat.",
    start_url: "/chat",
    display: "standalone",
    background_color: "#ece5f3",
    theme_color: "#1A1A2F",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
