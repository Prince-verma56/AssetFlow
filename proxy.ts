import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { normalizeRole, roleToDashboard } from "@/lib/roles";

const PUBLIC_ROUTES = new Set<string>(["/", "/sign-in", "/sign-up", "/onboarding", "/role-redirect"]);

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
  return ["/onboarding", "/role-redirect"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const { pathname } = req.nextUrl;

  const isApiRoute = pathname.startsWith("/api/");
  const isPublic = PUBLIC_ROUTES.has(pathname);

  if (!userId) {
    if (isPublic || pathname.startsWith("/api/")) return NextResponse.next();
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const roleFromClaims = getRoleFromClaims(sessionClaims);
  const roleFromCookie = normalizeRole(req.cookies.get("app_role_hint")?.value);
  const role = roleFromClaims ?? roleFromCookie;

  if (!role && pathname === "/onboarding") {
    return NextResponse.next();
  }

  if (!role && !isRoleNeutralRoute(pathname) && !isApiRoute) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  if (role && (pathname === "/" || isRoleNeutralRoute(pathname))) {
    return NextResponse.redirect(new URL(roleToDashboard(role), req.url));
  }

  if (pathname.startsWith("/admin") && role === "renter") {
    return NextResponse.redirect(new URL("/marketplace", req.url));
  }

  if (pathname.startsWith("/marketplace") && role === "owner") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
