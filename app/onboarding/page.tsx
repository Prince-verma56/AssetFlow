"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { ShoppingCart, Tractor } from "lucide-react";
import { toast } from "sonner";
import { roleToDashboard, type ClerkRole } from "@/lib/roles";

const roleCards: Array<{
  role: ClerkRole;
  title: string;
  description: string;
  icon: typeof ShoppingCart;
  accent: string;
}> = [
  {
    role: "renter",
    title: "I'm a Renter",
    description: "Browse equipment, compare listings, and manage rentals with tracking and saved owners.",
    icon: ShoppingCart,
    accent: "border-blue-500/40 bg-blue-500/5 text-blue-600",
  },
  {
    role: "owner",
    title: "I'm an Owner",
    description: "Manage inventory, pricing, logistics, and rental performance from the owner workspace.",
    icon: Tractor,
    accent: "border-emerald-500/40 bg-emerald-500/5 text-emerald-600",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [savingRole, setSavingRole] = useState<ClerkRole | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  const handleRoleSelect = async (role: ClerkRole) => {
    setSavingRole(role);
    try {
      const response = await fetch("/api/me/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        throw new Error("Failed to save your role");
      }

      const payload = (await response.json()) as { redirectTo?: "/admin" | "/marketplace" };
      router.replace(payload.redirectTo ?? roleToDashboard(role));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to continue");
      setSavingRole(null);
    }
  };

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-24">
        <p className="text-sm text-muted-foreground">Preparing your workspace…</p>
      </main>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_26%)] px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-4xl rounded-[2rem] border border-border bg-background/92 p-8 shadow-2xl backdrop-blur-sm md:p-10"
      >
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">Select Your Workspace</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground md:text-base">
            Choose how you want to use AgriRent right now. We’ll save the role and send you to the correct dashboard.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
          {roleCards.map((card) => {
            const Icon = card.icon;
            const isSaving = savingRole === card.role;

            return (
              <button
                key={card.role}
                onClick={() => void handleRoleSelect(card.role)}
                disabled={Boolean(savingRole)}
                className="group rounded-[1.75rem] border border-border bg-card p-6 text-left transition-all hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div className={`inline-flex rounded-2xl border p-4 ${card.accent}`}>
                  <Icon className="h-8 w-8" />
                </div>
                <h2 className="mt-5 text-2xl font-bold tracking-tight text-foreground">{card.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{card.description}</p>
                <div className="mt-6 inline-flex rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background">
                  {isSaving ? "Opening workspace..." : "Continue"}
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </main>
  );
}
