import type { Metadata, Viewport } from "next";
import { Anton, Inter, JetBrains_Mono } from "next/font/google";
import { Pwa } from "@/components/pwa/Pwa";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

// iOS launch screens from scripts/icons.mjs: [css width, css height, pixel ratio].
const SPLASH = [[440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [428, 926, 3],
  [390, 844, 3], [375, 812, 3], [414, 896, 3], [414, 896, 2], [375, 667, 2]];
const startupImage = SPLASH.map(([w, h, r]) => ({
  url: `/splash/${w * r}x${h * r}.png`,
  media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`,
}));

export const metadata: Metadata = {
  title: "IRONHEART",
  description: "Train with a partner. Hit your week or owe the stake.",
  appleWebApp: { capable: true, title: "IRONHEART", statusBarStyle: "black-translucent", startupImage },
  icons: { icon: "/icons/192.png", apple: "/icons/180.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#D4AF37",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${anton.variable} ${mono.variable} antialiased`}>
      <body className="min-h-dvh font-sans">{children}<Pwa /></body>
    </html>
  );
}
