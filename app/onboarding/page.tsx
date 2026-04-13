"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Check, LoaderCircle, ShoppingBag, Tractor } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { normalizeRole, roleToDashboard, toClerkRole, toConvexRole, type ClerkRole } from "@/lib/roles";

type Role = ClerkRole;

const roleCards: Array<{
  role: Role;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  bullets: string[];
}> = [
  {
    role: "owner",
    title: "I'm an Owner",
    subtitle: "List equipment, manage availability, and accept rentals",
    icon: <Tractor className="size-6" />,
    bullets: ["Rental pricing support", "Direct renter discovery", "Escrow-ready rentals"],
  },
  {
    role: "renter",
    title: "I'm a Renter",
    subtitle: "Discover equipment nearby and book what you need quickly",
    icon: <ShoppingBag className="size-6" />,
    bullets: ["Nearby equipment listings", "Direct owner contact", "Fast checkout and tracking"],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const setUserRole = useMutation(api.users.setUserRole);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.replace("/sign-in");
      return;
    }

    let cancelled = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!cancelled) {
        setChecking(false);
      }
    }, 1500);

    const resolveRole = async () => {
      const clerkRole = normalizeRole(user.publicMetadata?.role);
      if (clerkRole) {
        router.replace(roleToDashboard(clerkRole));
        return;
      }

      const response = await fetch("/api/me/role", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to verify your saved role");
      }

      const payload = (await response.json()) as { role: "owner" | "renter" | null };
      const persistedRole = payload.role ? payload.role : null;
      if (persistedRole) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        router.replace(roleToDashboard(persistedRole));
        return;
      }

      window.clearTimeout(fallbackTimer);
      setChecking(false);
    };

    resolveRole().catch((error) => {
      window.clearTimeout(fallbackTimer);
      const message = error instanceof Error ? error.message : "Unable to verify your role";
      toast.error(message);
      setChecking(false);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
    };
  }, [isLoaded, router, user]);

  const canContinue = useMemo(() => Boolean(selectedRole) && !saving, [selectedRole, saving]);

  const onContinue = async () => {
    if (!selectedRole || !user?.id) return;
    setSaving(true);
    try {
      const email =
        user.primaryEmailAddress?.emailAddress ||
        user.emailAddresses?.[0]?.emailAddress ||
        "unknown@example.com";
      const roleResult = await setUserRole({
        role: toConvexRole(selectedRole),
        clerkId: user.id,
        name: user.fullName || user.firstName || "User",
        email,
        imageUrl: user.imageUrl || undefined,
      });
      if (!roleResult.success) {
        throw new Error(roleResult.error || "Failed to save role in Convex");
      }

      const res = await fetch("/api/me/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      if (!res.ok) throw new Error("Failed to update Clerk role metadata");

      const payload = (await res.json()) as {
        redirectTo?: "/admin" | "/marketplace";
      };

      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success("Role saved successfully");
      router.push(payload.redirectTo ?? roleToDashboard(selectedRole));
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete onboarding";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <LoaderCircle className="size-8 animate-spin text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Checking your workspace</h1>
            <p className="text-sm text-muted-foreground">Syncing your role and preparing the right dashboard.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-8 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, staggerChildren: 0.15 }}
        className="mx-auto flex max-w-5xl flex-col gap-6"
      >
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">Choose Your Workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            This is a one-time setup. You can switch between owner and renter workspaces later.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {roleCards.map((card) => {
            const selected = selectedRole === card.role;
            return (
              <motion.div key={card.role} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  className={`relative h-full cursor-pointer border-2 transition-all ${
                    selected ? "border-primary shadow-lg" : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedRole(card.role)}
                >
                  {selected ? (
                    <span className="absolute right-4 top-4 inline-flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-4" />
                    </span>
                  ) : null}
                  <CardHeader>
                    <div className="mb-2 inline-flex size-12 items-center justify-center rounded-xl border bg-card text-primary">
                      {card.icon}
                    </div>
                    <CardTitle>{card.title}</CardTitle>
                    <CardDescription>{card.subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {card.bullets.map((bullet) => (
                      <div key={bullet} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="size-4 text-primary" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant={selected ? "default" : "outline"}
                      className="mt-3 w-full"
                      onClick={() => setSelectedRole(card.role)}
                    >
                      Select
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <Button disabled={!canContinue} onClick={onContinue} className="h-11 w-full md:ml-auto md:w-56">
          {saving ? "Saving..." : "Continue"}
        </Button>
      </motion.div>
    </main>
  );
}
