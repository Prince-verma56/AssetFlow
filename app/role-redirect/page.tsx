"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { normalizeRole, roleToDashboard } from "@/lib/roles";

export default function RoleRedirectPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      router.replace("/sign-in");
      return;
    }

    const role = normalizeRole(user.publicMetadata?.role);
    router.replace(role ? roleToDashboard(role) : "/onboarding");
  }, [isLoaded, isSignedIn, router, user]);

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">Preparing your workspace...</p>
    </main>
  );
}
