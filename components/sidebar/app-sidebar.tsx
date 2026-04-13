"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { navConfig } from "@/config/nav.config";
import { normalizeRole, roleLabel, roleToDashboard, toClerkRole, toConvexRole, type ClerkRole, type ConvexRole } from "@/lib/roles";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/sidebar/nav-main";
import { NavSecondary } from "@/components/sidebar/nav-secondary";
import { RoleSwitchOverlay } from "@/components/sidebar/role-switch-overlay";

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isSignedIn } = useUser();
  const [role, setRole] = useState<ConvexRole>("farmer");
  const [switchingRole, setSwitchingRole] = useState(false);
  const [targetRole, setTargetRole] = useState<ConvexRole>("farmer");
  const toggleRole = useMutation(api.users.toggleRole);

  const convexUser = useQuery(
    api.users.getRoleByClerkId,
    isSignedIn && user?.id ? { clerkId: user.id } : "skip"
  );
  const clerkRole = normalizeRole(user?.publicMetadata?.role);

  useEffect(() => {
    if (clerkRole) {
      setRole(toConvexRole(clerkRole));
      return;
    }
    if (convexUser?.role === "farmer" || convexUser?.role === "buyer") {
      setRole(convexUser.role);
      return;
    }
    setRole(pathname.startsWith("/marketplace") || pathname.startsWith("/renter") ? "buyer" : "farmer");
  }, [pathname, convexUser, clerkRole]);

  const isFarmer = role === "farmer";
  const currentWorkspaceLabel = roleLabel(toClerkRole(role));

  // Data fetching for counts
  const farmerListings = useQuery(api.listings.listByFarmer, 
    isFarmer && convexUser?.id ? { farmerId: convexUser.id } : "skip"
  );
  const farmerSales = useQuery(api.orders.getFarmerOrders, 
    isFarmer && user?.id ? { clerkId: user.id } : "skip"
  );
  const buyerOrders = useQuery(api.orders.getBuyerOrders, 
    !isFarmer && user?.id ? { clerkId: user.id } : "skip"
  );

  const mainItems = useMemo(() => {
    const baseItems = isFarmer ? [...navConfig.farmerNav] : [...navConfig.buyerNav];
    
    return baseItems.map(item => {
      if (isFarmer) {
        if (item.title === "My Equipment" && farmerListings) {
          return { ...item, badge: farmerListings.length.toString() };
        }
        if (item.title === "Rentals" && farmerSales) {
          return { ...item, badge: farmerSales.length.toString() };
        }
      } else {
        if (item.title === "My Rentals" && buyerOrders) {
          return { ...item, badge: buyerOrders.length.toString() };
        }
      }
      return item;
    });
  }, [buyerOrders, farmerListings, farmerSales, isFarmer]);

  const secondaryItems = useMemo(
    () => (role === "buyer" ? navConfig.buyerSecondaryNav : navConfig.farmerSecondaryNav),
    [role],
  );

  const switchRole = async (nextRole: ClerkRole) => {
    const nextConvexRole = toConvexRole(nextRole);
    if (!user?.id || nextConvexRole === role || switchingRole) return;
    setTargetRole(nextConvexRole);
    setSwitchingRole(true);
    try {
      // 1. Update Convex
      const result = await toggleRole({
        clerkId: user.id,
        targetRole: nextConvexRole,
      });
      if (!result.success) throw new Error(result.error || "Role update failed");

      // 2. Sync Clerk publicMetadata for proxy/session consistency
      const response = await fetch("/api/me/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });

      if (!response.ok) {
        throw new Error("Failed to update role in Clerk");
      }

      // 3. Wait for cookies to be set
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 4. Update local state and navigate
      setRole(nextConvexRole);
      router.push(roleToDashboard(nextRole));
      router.refresh();

      // 5. Wait for navigation to complete
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Role switch error:", error);
      toast.error("Failed to switch role. Please try again.");
    } finally {
      setSwitchingRole(false);
    }
  };

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="gap-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="data-active:bg-transparent">
              <Link href={isFarmer ? "/admin" : "/marketplace"}>
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  P
                </span>
                <span className="truncate font-semibold">{navConfig.appName}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between" disabled={!isSignedIn || switchingRole}>
              <span>{switchingRole ? "Switching..." : currentWorkspaceLabel}</span>
              <ChevronDown className="size-4 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Switch Workspace Role</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => switchRole("owner")}>Owner</DropdownMenuItem>
            <DropdownMenuItem onClick={() => switchRole("renter")}>Renter</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={mainItems} />
      </SidebarContent>

      <SidebarFooter>
        <NavSecondary items={secondaryItems} />
      </SidebarFooter>

      <RoleSwitchOverlay isSwitching={switchingRole} targetRole={targetRole} />
    </Sidebar>
  );
}
