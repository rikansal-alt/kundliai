import type { Metadata, Viewport } from "next";
import { Lexend, Fraunces } from "next/font/google";
import "./globals.css";
import AppNav from "@/components/AppNav";
import { NavProvider } from "@/context/NavContext";
import AuthProvider from "@/components/AuthProvider";
import { Analytics } from "@vercel/analytics/next";

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-lexend",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  style: ["italic", "normal"],
  weight: "variable",
  variable: "--font-fraunces",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#d6880a",
  // Resizes the layout viewport when the virtual keyboard opens (Chrome 108+, Safari 16+)
  // This lets env(keyboard-inset-height) push content above the keyboard.
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "KundliAI — Vedic Astrology & AI",
  description: "AI-powered Vedic birth charts, Kundali reading and Jyotish consultation",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KundliAI",
  },
  icons: {
    apple: [
      { url: "/icons/icon-152.png", sizes: "152x152" },
      { url: "/icons/icon-192.png", sizes: "192x192" },
    ],
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lexend.variable} ${fraunces.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Fraunces:ital,opsz,wght@1,9..144,400;1,9..144,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background-light">
        <AuthProvider>
          <NavProvider>
            <div
              className="relative mx-auto min-h-screen bg-white overflow-hidden"
              style={{ maxWidth: "430px", boxShadow: "0 0 60px rgba(0,0,0,0.12)" }}
            >
              {children}
            </div>
            <AppNav />
          </NavProvider>
        </AuthProvider>
          <Analytics />
          <script
            dangerouslySetInnerHTML={{
              __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});})}`,
            }}
          />
      </body>
    </html>
  );
}
