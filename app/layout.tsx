import type { Metadata, Viewport } from "next";
import { Nova_Mono, Azeret_Mono } from "next/font/google";

import { Providers } from "@/components/providers/providers";

import "./globals.css";

const novaMono = Nova_Mono({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-nova",
  display: "swap",
});

const azeretMono = Azeret_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-azeret",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: "rizzlr",
  description: "Talk your way in. Or get talked out of.",
  icons: {
    icon: "/api/icon",
  },
  openGraph: {
    title: "rizzlr",
    description: "A savage AI dating game powered by voice, Blinks, and bad decisions.",
    images: ["/api/og/replay"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#090b14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${novaMono.variable} ${azeretMono.variable}`}>
      <body>
        <Providers>
          <div className="app-shell">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
