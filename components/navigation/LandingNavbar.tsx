"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { MapPin, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useLenisScroll } from "@/components/providers/lenis-provider";

const navItems = [
  { href: "#provide", label: "Infrastructure" },
  { href: "#how-it-works", label: "How it Works" },
] as const;

export function LandingNavbar() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { isSignedIn } = useUser();
  const { scrollTo } = useLenisScroll();
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    setThemeReady(true);
  }, []);

  const handleAnchorClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    scrollTo(href, -72);
  };

  return (
    <nav className="fixed top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-bold tracking-tighter text-background">
            AR
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">AgriRent</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(event) => handleAnchorClick(event, item.href)}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
          <Link href="/map" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>Live Map</span>
            <span className="rounded-sm bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-500">
              Live
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full p-2 text-foreground transition-colors hover:bg-muted"
            aria-label="Toggle theme"
          >
            {themeReady && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {!isSignedIn ? (
            <>
              <SignInButton mode="modal" fallbackRedirectUrl="/">
                <button className="hidden px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block">
                  Sign In
                </button>
              </SignInButton>
              <SignInButton mode="modal" fallbackRedirectUrl="/">
                <button className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm transition-all hover:opacity-90">
                  Get Started
                </button>
              </SignInButton>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push("/onboarding")}
                className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm transition-all hover:opacity-90"
              >
                Dashboard
              </button>

              <div className="ml-2 border-l border-border pl-4">
                <UserButton appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
