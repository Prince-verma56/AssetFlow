import type { Metadata } from "next";
import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import ThemeToggleButton from "@/components/ui/theme-toggle-button";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { resolveAppFonts } from "@/config/fonts.config";
import "./globals.css";

import { ConvexClientProvider } from "@/components/convex-client-provider";

export const metadata: Metadata = {
  title: "AgriRent",
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
            <header className="flex h-16 items-center justify-end gap-3 border-b px-4">
              <ThemeToggleButton variant="circle-blur" start="top-right" />
              <Show when="signed-out">
                <Button asChild variant="outline">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href="/sign-up">Sign up</Link>
                </Button>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </header>

            {children}

            <Toaster />
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
