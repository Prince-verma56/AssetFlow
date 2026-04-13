"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Bookmark, Heart, Info, ShoppingBag } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { ASSET_CATEGORIES } from "@/lib/constants/categories";
import { MANDI_MARKET_OPTIONS, MANDI_STATE_OPTIONS } from "@/lib/agmarknet";
import type { MarketplaceListing } from "@/components/marketplace/listing-types";
import { ListingMedia } from "@/components/listings/listing-media";
import { BookingDialog } from "@/components/marketplace/booking-dialog";
import { ListingDetailsSheet } from "@/components/marketplace/listing-details-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

function resolveCategoryLabel(categoryId: string | undefined) {
  if (!categoryId) return "All Categories";
  return ASSET_CATEGORIES.find((c) => c.id === categoryId)?.name ?? "All Categories";
}

export default function MarketplacePage() {
  const { user } = useUser();
  const [query, setQuery] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string>("All");
  const [state, setState] = React.useState<string>("All");
  const [city, setCity] = React.useState<string>("All");
  const [selectedListing, setSelectedListing] = React.useState<MarketplaceListing | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [bookingOpen, setBookingOpen] = React.useState(false);

  const toggleSaved = useMutation(api.wishlist.toggleSaved);
  const toggleSavedOwner = useMutation(api.savedOwners.toggleSavedOwner);
  const cityOptions = React.useMemo(() => {
    if (state === "All") return ["All"];
    return ["All", ...(MANDI_MARKET_OPTIONS[state] ?? [])];
  }, [state]);

  const location = state !== "All" && city !== "All" ? `${city}, ${state}` : undefined;
  const selectedCategoryId = categoryId !== "All" ? categoryId : undefined;

  const listings = useQuery(api.listings.listAvailable, {
    categoryId: selectedCategoryId,
    location,
    limit: 60,
  });
  const wishlistCount = useQuery(api.wishlist.countByRenter, user?.id ? { renterId: user.id } : "skip");
  const wishlistEntries = useQuery(api.wishlist.listByRenter, user?.id ? { renterId: user.id } : "skip");
  const savedOwnerIds = useQuery(api.savedOwners.listOwnerIdsByRenter, user?.id ? { renterId: user.id } : "skip");

  const savedSet = React.useMemo(() => {
    return new Set((wishlistEntries ?? []).map((entry) => String(entry.listing._id)));
  }, [wishlistEntries]);
  const savedOwnerSet = React.useMemo(() => new Set(savedOwnerIds ?? []), [savedOwnerIds]);

  const filtered = React.useMemo(() => {
    const raw = (listings ?? []) as unknown as MarketplaceListing[];
    if (!query.trim()) return raw;
    const q = query.trim().toLowerCase();
    return raw.filter((listing) => {
      const title = String(listing.title ?? listing.assetCategory ?? "").toLowerCase();
      const loc = String(listing.location ?? "").toLowerCase();
      return title.includes(q) || loc.includes(q);
    });
  }, [listings, query]);

  const handleToggleSaved = async (listing: MarketplaceListing) => {
    if (!user?.id) {
      toast.error("Please sign in to save listings.");
      return;
    }

    const result = await toggleSaved({
      renterId: user.id,
      listingId: listing._id as Id<"listings">,
    });

    toast.success(result.saved ? "Saved to wishlist" : "Removed from wishlist");
  };

  const handleToggleSavedOwner = async (listing: MarketplaceListing) => {
    if (!user?.id || !listing.ownerId) {
      toast.error("Please sign in to save owners.");
      return;
    }

    const result = await toggleSavedOwner({
      renterId: user.id,
      ownerId: listing.ownerId,
    });

    toast.success(result.saved ? "Owner saved" : "Owner removed");
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 pb-20 md:p-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">Renter Marketplace</p>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">Book Equipment With Escrow Confidence</h1>
          <p className="font-medium text-muted-foreground">Explore verified listings, save options, and secure rentals instantly.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="relative rounded-xl border-zinc-200 bg-white dark:border-border dark:bg-background">
            <Link href="/marketplace/wishlist">
            <Heart className="mr-2 size-4" />
            Wishlist
            <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
              {wishlistCount ?? 0}
            </span>
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Find equipment by title, category, and region.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title or location" />
          </div>

          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              {ASSET_CATEGORIES.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Select
              value={state}
              onValueChange={(value) => {
                setState(value);
                setCity("All");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All States</SelectItem>
                {MANDI_STATE_OPTIONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={city} onValueChange={setCity}>
              <SelectTrigger>
                <SelectValue placeholder="City/Region" />
              </SelectTrigger>
              <SelectContent>
                {cityOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item === "All" ? "All Regions" : item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{resolveCategoryLabel(selectedCategoryId)}</Badge>
          {location ? <Badge variant="outline">{location}</Badge> : null}
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          {filtered.length} listings
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((listing) => {
          const isSaved = savedSet.has(String(listing._id));
          const trustScore = listing.ownerTrustScore ?? Math.min(99, Math.max(82, Math.round((listing.oracleConfidence ?? 72) + 17)));
          const isOwnerSaved = listing.ownerId ? savedOwnerSet.has(listing.ownerId) : false;
          const availableStock = listing.availableStock ?? listing.stockQuantity ?? 1;
          const isSoldOut = availableStock <= 0;
          const nearestEndDate = listing.nearestEndDate ? format(new Date(listing.nearestEndDate), "dd MMM yyyy") : null;
          const rentalsCount = listing.totalRentals ?? listing.lifetimeRentals ?? 0;
          const assetAge = listing.assetAge;

          return (
            <Card key={String(listing._id)} className="overflow-hidden border-zinc-200/70 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-border dark:bg-card">
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => {
                  setSelectedListing(listing);
                  setDetailsOpen(true);
                }}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <ListingMedia
                    imageUrl={listing.imageUrl}
                    alt={listing.title || listing.assetCategory}
                    title={listing.title || listing.assetCategory}
                    subtitle={listing.location}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                </div>
              </button>

              <CardHeader className="space-y-3 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base leading-tight">{listing.title || listing.assetCategory}</CardTitle>
                    <CardDescription className="mt-1">{listing.location}</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-600">₹{listing.pricePerDay.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">per day</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{listing.qualityScore ?? "AI Verified"}</Badge>
                  <Badge variant="outline">Trust {trustScore}/100</Badge>
                  {assetAge !== null && assetAge !== undefined ? (
                    <Badge variant="outline">{assetAge} yrs old</Badge>
                  ) : null}
                  <Badge variant="outline">{rentalsCount} rentals</Badge>
                  {availableStock > 0 && availableStock < 3 ? (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Only {availableStock} left!</Badge>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Owner</p>
                    <p className="text-sm font-semibold">{listing.ownerName ?? listing.farmerName ?? "Verified Owner"}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full"
                    onClick={() => void handleToggleSavedOwner(listing)}
                    disabled={!listing.ownerId}
                    aria-label="Save owner"
                  >
                    <Bookmark className={isOwnerSaved ? "size-4 fill-current text-primary" : "size-4"} />
                  </Button>
                </div>

                <div className="line-clamp-3 rounded-xl bg-zinc-50 p-3 text-sm text-muted-foreground dark:bg-muted/40">
                  {listing.description}
                </div>

                {isSoldOut ? (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-600">
                    {nearestEndDate ? `Available again on ${nearestEndDate}` : "Currently rented out"}
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                    {availableStock} unit{availableStock === 1 ? "" : "s"} available now
                  </div>
                )}

                <div className="grid gap-2">
                  {isSoldOut ? (
                    <Button disabled className="w-full rounded-xl bg-zinc-300 text-zinc-700 hover:bg-zinc-300">
                      {nearestEndDate ? `Available again on ${nearestEndDate}` : "Temporarily unavailable"}
                    </Button>
                  ) : (
                    <Button
                      className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        setSelectedListing(listing);
                        setBookingOpen(true);
                      }}
                    >
                      <ShoppingBag className="mr-2 size-4" />
                      Book Now
                    </Button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => void handleToggleSaved(listing)}>
                      <Heart className={isSaved ? "mr-2 size-4 fill-current text-red-500" : "mr-2 size-4"} />
                      {isSaved ? "Saved" : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        setSelectedListing(listing);
                        setDetailsOpen(true);
                      }}
                    >
                      <Info className="mr-2 size-4" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {listings && filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="space-y-2 py-16 text-center">
            <p className="text-lg font-bold">No equipment found</p>
            <p className="text-sm text-muted-foreground">Try clearing filters or searching a different region.</p>
            <div className="pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setCategoryId("All");
                  setState("All");
                  setCity("All");
                }}
              >
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <ListingDetailsSheet
        listing={selectedListing}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        isSaved={selectedListing ? savedSet.has(String(selectedListing._id)) : false}
        onToggleSaved={() => {
          if (selectedListing) void handleToggleSaved(selectedListing);
        }}
        onBookNow={() => {
          setDetailsOpen(false);
          setBookingOpen(true);
        }}
      />

      <BookingDialog listing={selectedListing} open={bookingOpen} onOpenChange={setBookingOpen} />
    </div>
  );
}
