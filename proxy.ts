import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { normalizeRole, roleToDashboard } from "@/lib/roles";

const PUBLIC_ROUTES = new Set<string>(["/", "/sign-in", "/sign-up", "/role-redirect"]);

function getRoleFromClaims(sessionClaims: unknown) {
  if (!sessionClaims || typeof sessionClaims !== "object") return null;

  const claims = sessionClaims as Record<string, unknown>;
  const directRole = normalizeRole(claims.role);
  if (directRole) return directRole;

  const metadata = claims.metadata;
  if (metadata && typeof metadata === "object") {
    const role = normalizeRole((metadata as Record<string, unknown>).role);
    if (role) return role;
  }

  const publicMetadata = claims.public_metadata;
  if (publicMetadata && typeof publicMetadata === "object") {
    const role = normalizeRole((publicMetadata as Record<string, unknown>).role);
    if (role) return role;
  }

  return null;
}

function isRoleNeutralRoute(pathname: string) {
  return ["/role-redirect", "/role-switching"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function getCanonicalLegacyRoute(pathname: string) {
  const routeMap: Record<string, string> = {
    "/buyer/marketplace": "/marketplace",
    "/buyer/orders": "/renter/rentals",
    "/buyer/wishlist": "/marketplace/wishlist",
    "/buyer/settings": "/renter/settings",
    "/buyer/chat": "/marketplace",
    "/farmer/dashboard": "/admin",
    "/farmer/listings": "/admin/listings",
    "/farmer/oracle": "/admin/price-advisor",
    "/farmer/wishlist": "/marketplace/wishlist",
    "/farmer/settings": "/admin/settings",
  };

  if (routeMap[pathname]) {
    return routeMap[pathname];
  }

  if (pathname.startsWith("/buyer/")) {
    return "/marketplace";
  }

  if (pathname.startsWith("/farmer/")) {
    return "/admin";
  }

  return null;
}

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const { pathname } = req.nextUrl;

  const isApiRoute = pathname.startsWith("/api/");
  const isPublic = PUBLIC_ROUTES.has(pathname);
  const isRoleSwitching = req.cookies.get("role_switching")?.value === "true";
  const canonicalLegacyRoute = getCanonicalLegacyRoute(pathname);

  if (!userId) {
    if (isPublic || pathname.startsWith("/api/")) return NextResponse.next();
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (canonicalLegacyRoute) {
    return NextResponse.redirect(new URL(canonicalLegacyRoute, req.url));
  }

  const roleFromClaims = getRoleFromClaims(sessionClaims);
  const roleFromCookie = normalizeRole(req.cookies.get("app_role_hint")?.value);
  const role = roleFromClaims ?? roleFromCookie;

  // During role switching, allow access to neutral routes without redirect
  if (isRoleSwitching && isRoleNeutralRoute(pathname)) {
    return NextResponse.next();
  }

  // Allow the landing page to act as the role selection screen.
  if (!role && pathname === "/") {
    return NextResponse.next();
  }

  if (!role && !isRoleNeutralRoute(pathname) && !isApiRoute) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // If role exists and on neutral route, redirect to dashboard
  if (role && isRoleNeutralRoute(pathname)) {
    return NextResponse.redirect(new URL(roleToDashboard(role), req.url));
  }

  // Cross-role access prevention (unless role switching)
  if (!isRoleSwitching) {
    if (pathname.startsWith("/admin") && role === "renter") {
      return NextResponse.redirect(new URL("/marketplace", req.url));
    }

    if (pathname.startsWith("/marketplace") && role === "owner") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    if (pathname.startsWith("/renter") && role === "owner") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    if (pathname.startsWith("/owner") && role === "renter") {
      return NextResponse.redirect(new URL("/marketplace", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|glb|gltf|bin|mp4|webm)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
