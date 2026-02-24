import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// SSR Polyfill for indexedDB (Required by Web3Modal/WalletConnect during static generation)
if (typeof window === 'undefined') {
  (global as any).indexedDB = {
    open: () => ({ onsuccess: null, onerror: null }),
    deleteDatabase: () => ({ onsuccess: null, onerror: null })
  };
}

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TRK Blockchain | Real Cash Game Ecosystem",
  description: "Play Smart. Earn Sustainably. The first no-loss blockchain gaming ecosystem.",
};

import { headers } from "next/headers";
import { cookieToInitialState } from "wagmi";
import { getWagmiConfig } from "@/config/wagmi";
import AppProviders from "@/components/providers/AppProviders";
import MaintenanceOverlay from "@/components/system/MaintenanceOverlay";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialState = cookieToInitialState(
    getWagmiConfig(),
    (await headers()).get("cookie")
  );

  return (
    <html lang="en" className="dark">
      <body
        suppressHydrationWarning
        className={`${outfit.variable} ${inter.variable} antialiased bg-background text-foreground min-h-screen selection:bg-primary/20 selection:text-primary`}
      >
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="beforeInteractive"
        />
        <AppProviders initialState={initialState}>
          <MaintenanceOverlay />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
