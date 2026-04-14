"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, HelpCircle, MapPin, Settings, Tractor, Truck, UserRound } from "lucide-react";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { normalizeRole } from "@/lib/roles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import ThemeToggleButton from "@/components/ui/theme-toggle-button";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function GlobalTopNav() {
  const pathname = usePathname();
  const { user, isSignedIn } = useUser();
  const profile = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip");
  const wishlistEntries = useQuery(api.wishlist.listByRenter, user?.id ? { renterId: user.id } : "skip");

  if (pathname === "/" || pathname === "/onboarding") {
    return null;
  }

  const role = normalizeRole(profile?.data?.role) ?? null;
  const displayName = profile?.data?.name ?? user?.fullName ?? "Your Account";
  const avatarUrl = profile?.data?.avatarUrl ?? user?.imageUrl ?? undefined;
  const recentWishlist = (wishlistEntries ?? []).slice(0, 3);
  const workspacePrimaryHref = role === "owner" ? "/admin/listings" : "/renter/rentals";
  const workspacePrimaryLabel = role === "owner" ? "My Equipment" : "My Rentals";
  const settingsHref = role === "owner" ? "/admin/settings" : "/renter/settings";
  const helpHref = role === "owner" ? "/admin/help" : "/marketplace/help";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link href={role === "owner" ? "/admin" : "/marketplace"} className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Tractor className="size-5" />
            </span>
            <div className="hidden sm:block">
              <p className="text-sm font-black tracking-tight">AgriRent</p>
              <p className="text-xs text-muted-foreground">Equipment rentals with live logistics</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggleButton variant="circle-blur" start="top-right" />

          {isSignedIn ? (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Wishlist">
                    <Heart className="size-4" />
                    {(wishlistEntries?.length ?? 0) > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {wishlistEntries?.length}
                      </span>
                    ) : null}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                  <PopoverHeader>
                    <PopoverTitle>Wishlist</PopoverTitle>
                    <PopoverDescription>Recently saved equipment ready for a closer look.</PopoverDescription>
                  </PopoverHeader>
                  <div className="space-y-2">
                    {recentWishlist.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        No saved items yet.
                      </div>
                    ) : (
                      recentWishlist.map((entry) => (
                        <Link
                          key={String(entry._id)}
                          href="/marketplace/wishlist"
                          className="flex items-center justify-between rounded-xl border p-3 transition-colors hover:bg-muted/50"
                        >
                          <div>
                            <p className="font-medium">{entry.listing.title ?? entry.listing.assetCategory}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.listing.location} • ₹{Math.round(entry.listing.pricePerDay)}/day
                            </p>
                          </div>
                          <Heart className="size-4 text-primary" />
                        </Link>
                      ))
                    )}
                  </div>
                  <Button asChild className="mt-1 w-full">
                    <Link href="/marketplace/wishlist">View All Wishlist</Link>
                  </Button>
                </PopoverContent>
              </Popover>

              <Button asChild variant="ghost" size="icon" className="rounded-full" aria-label="Map hub">
                <Link href="/map">
                  <MapPin className="size-4" />
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 rounded-full px-1.5">
                    <Avatar size="sm">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback>{initials(displayName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={avatarUrl} alt={displayName} />
                        <AvatarFallback>{initials(displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {role === "owner" ? "Owner Workspace" : "Renter Workspace"}
                        </p>
                      </div>
                    </div>
                    <Button asChild size="sm" className="mt-3 w-full">
                      <Link href={settingsHref}>View / Edit Profile</Link>
                    </Button>
                  </div>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link href={workspacePrimaryHref}>
                      <UserRound className="size-4" />
                      {workspacePrimaryLabel}
                    </Link>
                  </DropdownMenuItem>

                  {role !== "owner" ? (
                    <DropdownMenuItem asChild>
                      <Link href="/renter/saved-owners">
                        <Heart className="size-4" />
                        Saved Owners
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem asChild>
                      <Link href="/owner/tracking">
                        <Truck className="size-4" />
                        Tracking
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem asChild>
                    <Link href={settingsHref}>
                      <Settings className="size-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link href={helpHref}>
                      <HelpCircle className="size-4" />
                      Help
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <SignOutButton>
                    <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">
                      Sign out
                    </button>
                  </SignOutButton>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="outline">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
