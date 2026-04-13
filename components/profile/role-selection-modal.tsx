"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Check, LoaderCircle, ShoppingBag, Tractor } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { normalizeRole, roleToDashboard, toConvexRole, type ClerkRole } from "@/lib/roles";

type Role = ClerkRole;

const roleCards: Array<{
  role: Role;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  description: string;
}> = [
  {
    role: "owner",
    title: "Farm Owner",
    subtitle: "List equipment and manage rentals",
    icon: <Tractor className="size-8" />,
    description: "Set rental pricing, manage equipment availability, track renter bookings, and accept rental requests.",
  },
  {
    role: "renter",
    title: "Equipment Renter",
    subtitle: "Find and book nearby equipment",
    icon: <ShoppingBag className="size-8" />,
    description: "Discover equipment listings, contact owners directly, book rentals, and track your orders.",
  },
];

interface RoleSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRole?: "farmer" | "buyer" | null;
}

export function RoleSelectionModal({
  open,
  onOpenChange,
  currentRole,
}: RoleSelectionModalProps) {
  const router = useRouter();
  const { user } = useUser();
  const setUserRole = useMutation(api.users.setUserRole);
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setSelectedRole(null);
      setSaving(false);
    }
  }, [open]);

  const handleSelect = (role: Role) => {
    setSelectedRole(role);
  };

  const handleContinue = async () => {
    if (!selectedRole || !user?.id) return;

    setSaving(true);
    try {
      // 1. Update Convex role
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
        throw new Error(roleResult.error || "Failed to save role");
      }

      // 2. Update Clerk metadata
      const res = await fetch("/api/me/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!res.ok) {
        throw new Error("Failed to update role");
      }

      const data = (await res.json()) as { redirectTo?: string };
      const redirectUrl = data.redirectTo ?? roleToDashboard(selectedRole);

      toast.success(`Switched to ${selectedRole === "owner" ? "Owner" : "Renter"} workspace`);

      // Close modal before navigation
      onOpenChange(false);

      // Wait a bit for cookies to be set, then navigate
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      // Use router.push then refresh to ensure session is synced
      router.push(redirectUrl);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to change role";
      toast.error(message);
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-zinc-200">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-bold">Choose Your Role</DialogTitle>
          <DialogDescription>
            Select how you want to use the platform. You can switch between roles anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Role Selection Cards */}
          <div className="grid gap-3">
            {roleCards.map((card) => (
              <motion.div
                key={card.role}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  onClick={() => handleSelect(card.role)}
                  className={`relative cursor-pointer overflow-hidden border-2 p-4 transition-all ${
                    selectedRole === card.role
                      ? "border-emerald-500 bg-emerald-50/50"
                      : "border-zinc-200 hover:border-emerald-300 hover:bg-zinc-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-lg p-2 ${
                          selectedRole === card.role
                            ? "bg-emerald-600 text-white"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {card.icon}
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.subtitle}</p>
                        <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                    </div>
                    {selectedRole === card.role && (
                      <Check className="size-5 text-emerald-600 mt-1 flex-shrink-0" />
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Info Message */}
          <div className="rounded-lg bg-blue-50 p-3 border border-blue-200">
            <p className="text-xs text-blue-900 leading-relaxed">
              <span className="font-semibold">💡 Tip:</span> You can switch between roles anytime from your profile settings. Your data and bookings are separate for each role.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!selectedRole || saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {saving ? (
                <>
                  <LoaderCircle className="size-4 mr-2 animate-spin" />
                  Switching...
                </>
              ) : (
                <>
                  <Check className="size-4 mr-2" />
                  Continue as {selectedRole === "owner" ? "Owner" : "Renter"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
