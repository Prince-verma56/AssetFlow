"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, useUser } from "@clerk/nextjs";
import { MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeRole, roleToDashboard, type ClerkRole } from "@/lib/roles";
import { useLenisScroll } from "@/components/providers/lenis-provider";

const navItems = [
  { href: "#provide", label: "What We Provide" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#community", label: "Community" },
  { href: "#blog", label: "Blog & Tips" },
] as const;

export function LandingNavbar() {
  const router = useRouter();
  const { scrollTo } = useLenisScroll();
  const { isLoaded, isSignedIn, user } = useUser();
  const [dashboardRole, setDashboardRole] = useState<ClerkRole>("renter");

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    const metadataRole = normalizeRole(user.publicMetadata?.role);
    if (metadataRole) {
      setDashboardRole(metadataRole);
      return;
    }

    let cancelled = false;

    const resolveRole = async () => {
      try {
        const response = await fetch("/api/me/role", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) return;

        const payload = (await response.json()) as { role: ClerkRole | null };
        if (!cancelled && payload.role) {
          setDashboardRole(payload.role);
        }
      } catch {
        // Keep renter as a safe fallback for the landing shell.
      }
    };

    void resolveRole();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user]);

  const handleAnchorClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    scrollTo(href, -72);
  };

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <a href="#hero" onClick={(event) => handleAnchorClick(event, "#hero")} className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-sm">
            AF
          </span>
          <div className="hidden sm:block">
            <p className="text-sm font-black tracking-tight text-slate-950">AssetFlow</p>
            <p className="text-xs text-muted-foreground">Premium modular landing shell</p>
          </div>
        </a>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(event) => handleAnchorClick(event, item.href)}
              className="transition-colors hover:text-slate-950"
            >
              {item.label}
            </a>
          ))}
          <a
            href="#map"
            onClick={(event) => handleAnchorClick(event, "#map")}
            className="flex items-center gap-2 transition-colors hover:text-slate-950"
          >
            <span>Map</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-slate-700">Live</span>
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <Button
              onClick={() => router.push(roleToDashboard(dashboardRole))}
              className="rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800"
            >
              <MapPinned className="size-4" />
              Dashboard
            </Button>
          ) : (
            <SignInButton mode="modal" fallbackRedirectUrl="/">
              <Button className="rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800">Dashboard</Button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
  );
}
