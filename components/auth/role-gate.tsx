"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type RoleGateProps = {
  requiredRole: "farmer" | "buyer";
  children: React.ReactNode;
};

export function RoleGate({ requiredRole, children }: RoleGateProps) {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const [ready, setReady] = useState(false);
  const convexRole = useQuery(
    api.users.getRoleByClerkId,
    isSignedIn && user?.id ? { clerkId: user.id } : "skip"
  );

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      router.replace("/sign-in");
      return;
    }

    const metadataRole = user.publicMetadata?.role;
    const normalizedMetadataRole =
      metadataRole === "farmer" || metadataRole === "buyer" ? metadataRole : null;
    const normalizedConvexRole =
      convexRole?.role === "farmer" || convexRole?.role === "buyer" ? convexRole.role : null;
    const role = normalizedMetadataRole ?? normalizedConvexRole;

    if (!role) {
      router.replace("/onboarding");
      return;
    }

    if (role !== requiredRole) {
      router.replace(role === "farmer" ? "/admin" : "/marketplace");
      return;
    }

    setReady(true);
  }, [requiredRole, router, isLoaded, isSignedIn, user, convexRole]);

  if (!ready) {
    return <div className="p-6 text-sm text-muted-foreground">Resolving workspace...</div>;
  }

  return <>{children}</>;
}
