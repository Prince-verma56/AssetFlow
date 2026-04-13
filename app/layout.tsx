import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { resolveAppFonts } from "@/config/fonts.config";
import { GlobalTopNav } from "@/components/navigation/global-top-nav";
import "./globals.css";

import { ConvexClientProvider } from "@/components/convex-client-provider";

export const metadata: Metadata = {
  title: "AssetFlow - AssetFlow Equipment Rental Platform",
  description: "AgriRent equipment rental platform built with Clerk and Convex",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fonts = resolveAppFonts();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${GeistSans.variable} ${GeistMono.variable} min-h-screen bg-background text-foreground antialiased`}
        style={
          {
            "--font-app-sans": fonts.sans,
            "--font-app-heading": fonts.heading,
            "--font-app-mono": fonts.mono,
          } as React.CSSProperties
        }
      >
        <ConvexClientProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <GlobalTopNav />
            {children}

            <Toaster />
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
