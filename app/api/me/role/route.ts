import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { normalizeRole, roleToDashboard, toClerkRole, toConvexRole } from "@/lib/roles";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const unAwaitedClerkClient = await clerkClient();
    const user = await unAwaitedClerkClient.users.getUser(userId);
    let clerkRole = normalizeRole(user.publicMetadata?.role);

    let convexRole: "owner" | "renter" | null = null;
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (convexUrl) {
      const convex = new ConvexHttpClient(convexUrl);
      const convexUser = await convex.query(api.users.getRoleByClerkId, {
        clerkId: userId,
      });
      convexRole = convexUser?.role ? toClerkRole(convexUser.role) : null;
    }
    let role = clerkRole ?? convexRole;

    if (!role) {
      role = "renter";

      await unAwaitedClerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          role,
        },
      });

      if (convexUrl) {
        const convex = new ConvexHttpClient(convexUrl);
        await convex.mutation(api.users.upsertRoleByClerkId, {
          clerkId: user.id,
          role: toConvexRole(role),
          name: user.fullName || user.firstName || "User",
          email:
            user.primaryEmailAddress?.emailAddress ||
            user.emailAddresses?.[0]?.emailAddress ||
            "unknown@example.com",
          imageUrl: user.imageUrl || undefined,
        });
      }
    }

    return NextResponse.json({ exists: !!role, role: role || null });
  } catch (error) {
    console.error("[GET /api/me/role]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const normalizedRole = normalizeRole(body.role);

    if (!normalizedRole) {
      return new NextResponse("Invalid role", { status: 400 });
    }

    const unAwaitedClerkClient = await clerkClient();
    const user = await unAwaitedClerkClient.users.getUser(userId);

    await unAwaitedClerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: normalizedRole,
      },
    });

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (convexUrl) {
      const convex = new ConvexHttpClient(convexUrl);
      await convex.mutation(api.users.upsertRoleByClerkId, {
        clerkId: user.id,
        role: toConvexRole(normalizedRole),
        name: user.fullName || user.firstName || "User",
        email:
          user.primaryEmailAddress?.emailAddress ||
          user.emailAddresses?.[0]?.emailAddress ||
          "unknown@example.com",
        imageUrl: user.imageUrl || undefined,
      });
    }

    const response = NextResponse.json({
      success: true,
      role: normalizedRole,
      redirectTo: roleToDashboard(normalizedRole),
    });

    response.cookies.set("app_role_hint", normalizedRole, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 5,
    });

    // Set role_switching cookie to flag that a role switch is in progress
    // This prevents middleware from blocking access during the transition
    response.cookies.set("role_switching", "true", {
      maxAge: 5, // 5 seconds - just long enough for the redirect to complete
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[POST /api/me/role]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
