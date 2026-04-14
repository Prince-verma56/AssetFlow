"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { roleLabel, roleToDashboard, toConvexRole, type ClerkRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AppRole = ClerkRole;

type RoleSwitcherProps = {
  role: AppRole | null;
};

export function RoleSwitcher({ role }: RoleSwitcherProps) {
  const { user } = useUser();
  const [switching, setSwitching] = useState(false);
  const toggleRole = useMutation(api.users.toggleRole);

  const currentRole = role ?? "renter";

  const switchRole = async (nextRole: AppRole) => {
    if (switching || nextRole === currentRole) return;
    setSwitching(true);
    try {
      // 1. Update Convex DB (keeps DB in sync with Clerk)
      if (user?.id) {
        await toggleRole({
          clerkId: user.id,
          targetRole: toConvexRole(nextRole),
        });
      }

      // 2. Update Clerk publicMetadata via API route
      const response = await fetch("/api/me/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!response.ok) throw new Error("Failed to switch role");

      toast.success(`Switched to ${roleLabel(nextRole)} workspace`);

      // 3. Hard navigation ensures new session token with updated role
      const target = roleToDashboard(nextRole);
      await new Promise((resolve) => setTimeout(resolve, 350));
      window.location.assign(target);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Role switch failed";
      toast.error(message);
      setSwitching(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 capitalize" disabled={switching}>
          {switching ? "Switching..." : roleLabel(currentRole)}
          <ChevronDown className="size-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void switchRole("owner")}
          className={currentRole === "owner" ? "font-semibold" : ""}
        >
          Owner Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void switchRole("renter")}
          className={currentRole === "renter" ? "font-semibold" : ""}
        >
          Renter Marketplace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
