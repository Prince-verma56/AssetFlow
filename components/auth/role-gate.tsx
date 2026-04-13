"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type RoleGateProps = {
  requiredRole: "owner" | "renter";
  children: React.ReactNode;
};

export function RoleGate({ requiredRole, children }: RoleGateProps) {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const convexRole = useQuery(
    api.users.getRoleByClerkId,
    isSignedIn && user?.id ? { clerkId: user.id } : "skip"
  );

  const normalizeRole = (raw: unknown): RoleGateProps["requiredRole"] | null => {
    if (raw === "owner" || raw === "farmer") return "owner";
    if (raw === "renter" || raw === "buyer") return "renter";
    return null;
  };

  const metadataRole = user?.publicMetadata?.role;
  const normalizedMetadataRole = normalizeRole(metadataRole);
  const normalizedConvexRole = normalizeRole(convexRole?.role);
  const resolvedRole = normalizedMetadataRole ?? normalizedConvexRole;
  const isResolvingRole = Boolean(isSignedIn && user && !normalizedMetadataRole && convexRole === undefined);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      router.replace("/sign-in");
      return;
    }

    if (isResolvingRole) return;

    if (!resolvedRole) {
      router.replace("/onboarding");
      return;
    }

    if (resolvedRole !== requiredRole) {
      router.replace(resolvedRole === "owner" ? "/admin" : "/marketplace");
      return;
    }
  }, [requiredRole, router, isLoaded, isSignedIn, user, isResolvingRole, resolvedRole]);

  if (!isLoaded || isResolvingRole || !resolvedRole || resolvedRole !== requiredRole) {
    return <div className="p-6 text-sm text-muted-foreground">Resolving workspace...</div>;
  }

  return <>{children}</>;
}
