import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IRONHEART",
    short_name: "IRONHEART",
    description: "Train with a partner. Hit your week or owe the stake.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#0A0A0A",
    theme_color: "#D4AF37",
    orientation: "portrait",
    icons: [
      { src: "/icons/192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
