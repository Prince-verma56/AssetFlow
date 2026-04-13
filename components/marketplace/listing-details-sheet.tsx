"use client";

import * as React from "react";
import { BadgeCheck, Heart, ShieldCheck, Sparkles, Star } from "lucide-react";
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
  if (!listing) return null;

  const trustScore = Math.min(99, Math.max(82, Math.round((listing.oracleConfidence ?? 72) + 17)));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-zinc-200 bg-white p-0 shadow-2xl sm:max-w-2xl dark:border-border dark:bg-card">
        <div className="space-y-6">
          <div className="px-6 pt-6">
            <SheetHeader className="text-left">
              <SheetTitle className="text-2xl font-black">{listing.title || listing.assetCategory}</SheetTitle>
              <SheetDescription>{listing.location}</SheetDescription>
            </SheetHeader>
          </div>

          <div className="px-6">
            <div className="overflow-hidden rounded-[1.75rem] border border-zinc-200 dark:border-border">
              <div className="relative h-[320px]">
                <ListingMedia
                  imageUrl={listing.imageUrl}
                  alt={listing.title || listing.assetCategory}
                  title={listing.title || listing.assetCategory}
                  subtitle={listing.location}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-6 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-border dark:bg-muted/40">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="size-4 text-emerald-600" />
                AI Quality Badge
              </div>
              <p className="mt-3 text-xl font-black">{listing.qualityScore ?? "Verified"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Inspection-ready equipment profile</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-border dark:bg-muted/40">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4 text-emerald-600" />
                Owner Trust Score
              </div>
              <p className="mt-3 text-xl font-black">{trustScore}/100</p>
              <p className="mt-1 text-xs text-muted-foreground">{listing.farmerName ?? "Verified Owner"}</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-border dark:bg-muted/40">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Star className="size-4 text-amber-500" />
                Rental Summary
              </div>
              <p className="mt-3 text-xl font-black">₹{listing.pricePerDay.toFixed(0)}/day</p>
              <p className="mt-1 text-xs text-muted-foreground">{listing.quantity} available</p>
            </div>
          </div>

          <div className="space-y-4 px-6 pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{listing.assetCategory}</Badge>
              {listing.condition ? <Badge variant="outline">{listing.condition}</Badge> : null}
              {listing.minimumRentalDays ? <Badge variant="outline">Min {listing.minimumRentalDays} day{listing.minimumRentalDays === 1 ? "" : "s"}</Badge> : null}
              <Badge variant="outline" className="gap-1">
                <BadgeCheck className="size-3.5" />
                High-res listing view
              </Badge>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Description</h3>
              <p className="mt-3 leading-7 text-zinc-700 dark:text-muted-foreground">
                {listing.description || "No description provided yet."}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={onBookNow}>
                Book Now
              </Button>
              <Button variant="outline" className="flex-1 rounded-xl" onClick={onToggleSaved}>
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
