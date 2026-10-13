import type { MetadataRoute } from "next";

const shortcutIcon = (name: string) => [{ src: `/icons/shortcut-${name}.png`, sizes: "96x96", type: "image/png" }];

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
    // Long-press the app icon (Android, desktop). The pact calendar lives on Home;
    // "#pact" tells it apart from a plain icon tap (see LaunchTarget in components/pwa/Pwa.tsx).
    shortcuts: [
      { name: "Log workout", short_name: "Workout", url: "/workouts", icons: shortcutIcon("workout") },
      { name: "Log food", short_name: "Food", url: "/nutrition", icons: shortcutIcon("food") },
      { name: "My pact", short_name: "Pact", url: "/home#pact", icons: shortcutIcon("pact") },
    ],
    // Tapping the icon again focuses the open window instead of opening a second one.
    launch_handler: { client_mode: "focus-existing" },
    // Share a food photo or label text from another app. Answered on the device by public/sw.js.
    share_target: {
      action: "/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: { title: "title", text: "text", url: "url", files: [{ name: "image", accept: ["image/*"] }] },
    },
  };
}
