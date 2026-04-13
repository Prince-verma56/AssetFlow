"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { roleLabel, roleToDashboard, type ClerkRole } from "@/lib/roles";
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
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const currentRole = role ?? "renter";

  const switchRole = async (nextRole: AppRole) => {
    if (switching || nextRole === currentRole) return;
    setSwitching(true);
    try {
      const response = await fetch("/api/me/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!response.ok) throw new Error("Failed to switch role");
      const payload = (await response.json()) as { redirectTo?: "/admin" | "/marketplace" };
      toast.success(`Switched to ${roleLabel(nextRole)} workspace`);
      const target = payload.redirectTo ?? roleToDashboard(nextRole);
      router.replace(target);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Role switch failed";
      toast.error(message);
    } finally {
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
        <DropdownMenuItem onClick={() => switchRole("owner")}>Owner</DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchRole("renter")}>Renter</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


