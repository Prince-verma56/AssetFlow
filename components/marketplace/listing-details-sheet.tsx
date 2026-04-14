"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import {
  BadgeCheck,
  CalendarDays,
  Heart,
  ShieldCheck,
  Sparkles,
  Star,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { MarketplaceListing } from "./listing-types";
import { ListingMedia } from "@/components/listings/listing-media";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ListingDetailsSheetProps = {
  listing: MarketplaceListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaved: boolean;
  onToggleSaved: () => void;
  onBookNow: () => void;
};

export function ListingDetailsSheet({
  listing,
  open,
  onOpenChange,
  isSaved,
  onToggleSaved,
  onBookNow,
}: ListingDetailsSheetProps) {
  const { user } = useUser();
  const toggleFollow = useMutation(api.follows.toggleFollow);

  const followingState = useQuery(
    api.follows.isFollowing,
    user?.id && listing?.ownerId
      ? {
          followerId: user.id,
          ownerId: listing.ownerId,
        }
      : "skip",
  );

  if (!listing) return null;

  const trustScore = listing.ownerTrustScore ?? Math.min(99, Math.max(82, Math.round((listing.oracleConfidence ?? 72) + 17)));
  const assetAgeLabel =
    typeof listing.assetAge === "number" ? `${listing.assetAge} Years Old` : "Tenure Pending";
  const dailyPrice = listing.basePricePerDay ?? listing.pricePerDay;

  const handleFollowOwner = async () => {
    if (!user?.id || !listing.ownerId) {
      toast.error("Sign in first to follow this owner.");
      return;
    }

    const result = await toggleFollow({
      followerId: user.id,
      ownerId: listing.ownerId,
    });

    toast.success(result.following ? "Owner followed" : "Owner unfollowed");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-zinc-200 bg-white p-0 shadow-2xl sm:max-w-5xl">
        <div className="grid min-h-full gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6 border-b border-zinc-200 bg-zinc-50/50 p-6 lg:border-b-0 lg:border-r">
            <SheetHeader className="text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-zinc-300 bg-white text-zinc-700">
                  {listing.assetCategory}
                </Badge>
                <Badge variant="outline" className="border-zinc-300 bg-white text-zinc-700">
                  <CalendarDays className="mr-1 size-3.5" />
                  {assetAgeLabel}
                </Badge>
                {listing.condition ? (
                  <Badge variant="outline" className="border-zinc-300 bg-white text-zinc-700">
                    {listing.condition}
                  </Badge>
                ) : null}
              </div>
              <SheetTitle className="text-3xl font-black text-zinc-950">
                {listing.title || listing.assetCategory}
              </SheetTitle>
              <SheetDescription className="text-sm text-zinc-600">{listing.location}</SheetDescription>
            </SheetHeader>

            <div className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white">
              <div className="relative h-[340px]">
                <ListingMedia
                  imageUrl={listing.imageUrl}
                  alt={listing.title || listing.assetCategory}
                  title={listing.title || listing.assetCategory}
                  subtitle={listing.location}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                  <Sparkles className="size-4 text-zinc-700" />
                  Quality Badge
                </div>
                <p className="mt-3 text-xl font-black text-zinc-950">{listing.qualityScore ?? "Verified"}</p>
                <p className="mt-1 text-xs text-zinc-500">Inspection-ready profile with clear rental details.</p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                  <ShieldCheck className="size-4 text-zinc-700" />
                  Owner Trust Score
                </div>
                <p className="mt-3 text-xl font-black text-zinc-950">{trustScore}/100</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {listing.ownerLifetimeCompletedOrders ?? 0} completed rentals and {listing.ownerFollowerCount ?? 0} followers
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                  <Star className="size-4 text-zinc-700" />
                  Inventory Snapshot
                </div>
                <p className="mt-3 text-xl font-black text-zinc-950">₹{dailyPrice.toFixed(0)}/day</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {listing.availableStock ?? listing.stockCount ?? listing.stockQuantity ?? 1} units open for booking
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Description</h3>
              <p className="mt-3 leading-7 text-zinc-700">
                {listing.description || "No description provided yet."}
              </p>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Smart Booking Box</p>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-3xl font-black text-zinc-950">₹{dailyPrice.toFixed(0)}</p>
                  <p className="text-sm text-zinc-500">per day, billed against your selected range</p>
                </div>
                <Badge className="rounded-full bg-zinc-900 px-3 py-1 text-white hover:bg-zinc-900">
                  {listing.ownerBadge ?? "Verified Owner"}
                </Badge>
              </div>

              <div className="mt-5 space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Availability</span>
                  <span className="font-medium text-zinc-900">
                    {listing.availableStock ?? listing.stockCount ?? listing.stockQuantity ?? 1} in stock
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Minimum term</span>
                  <span className="font-medium text-zinc-900">
                    {listing.minimumRentalDays ?? 1} day{(listing.minimumRentalDays ?? 1) === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Rental history</span>
                  <span className="font-medium text-zinc-900">
                    {listing.totalRentals ?? listing.lifetimeRentals ?? 0} completed cycles
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50/40 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Social Trust</p>
                  <h3 className="mt-2 text-xl font-black text-zinc-950">
                    {listing.ownerName ?? listing.farmerName ?? "Verified Owner"}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    Owner Trust Score: {trustScore}/100 based on completed rentals, profile quality, and follower trust.
                  </p>
                </div>
                <Badge variant="outline" className="gap-1 border-zinc-300 bg-white text-zinc-700">
                  <BadgeCheck className="size-3.5" />
                  {listing.ownerBadge ?? "Verified Owner"}
                </Badge>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Button className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800" onClick={onBookNow}>
                  Book Now
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={handleFollowOwner}>
                  <UserPlus className="mr-2 size-4" />
                  {followingState?.following ? "Following Owner" : "Follow Owner"}
                </Button>
              </div>

              <Button variant="outline" className="mt-3 w-full rounded-xl bg-white" onClick={onToggleSaved}>
                <Heart className={isSaved ? "mr-2 size-4 fill-current text-red-500" : "mr-2 size-4"} />
                {isSaved ? "Saved to Wishlist" : "Save to Wishlist"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
