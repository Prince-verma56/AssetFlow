"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { Heart, MapPin, Star, Zap, ArrowLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { ListingMedia } from "@/components/listings/listing-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export default function WishlistPage() {
  const { user } = useUser();
  const profile = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip");
  const role = profile?.data?.role === "farmer" ? "owner" : "renter";
  
  const wishlistRenter = useQuery(
    api.wishlist.listByRenter,
    role === "renter" && user?.id ? { renterId: user.id } : "skip"
  );
  
  const wishlistOwner = useQuery(
    api.wishlist.listByOwner,
    role === "owner" && user?.id ? { ownerId: user.id } : "skip"
  );

  const isEmptyRenter = wishlistRenter && wishlistRenter.length === 0;
  const isEmptyOwner = wishlistOwner && wishlistOwner.length === 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4">
      {/* Back Button */}
      <div className="flex items-center">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
          {role === "renter" ? "Your Wishlist" : "Renter Interest"}
        </p>
        <h1 className="text-4xl font-black tracking-tight">
          {role === "renter" ? "Saved Equipment" : "Who's Interested in Your Assets?"}
        </h1>
        <p className="font-medium text-muted-foreground">
          {role === "renter" 
            ? "Your shortlist of equipment worth revisiting before you book."
            : "See which renters have wishlisted your products and manage interest."}
        </p>
      </div>

      {/* Renter View - Equipment Wishlist */}
      {role === "renter" && (
        <>
          {!wishlistRenter ? (
            <div className="flex justify-center">
              <div className="animate-pulse text-muted-foreground">Loading wishlist...</div>
            </div>
          ) : isEmptyRenter ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-16 text-center">
                <Heart className="mx-auto mb-4 size-12 text-muted-foreground/50" />
                <p className="text-lg font-semibold">Your wishlist is empty</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Save equipment from the marketplace to keep your best options together.
                </p>
                <Button asChild className="mt-6">
                  <Link href="/marketplace">Explore Equipment</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {wishlistRenter.map((entry) => (
                <Card
                  key={String(entry._id)}
                  className="group overflow-hidden border-border/70 shadow-sm transition-all hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <ListingMedia
                      imageUrl={entry.listing.imageUrl}
                      alt={entry.listing.title ?? entry.listing.assetCategory}
                      title={entry.listing.title ?? entry.listing.assetCategory}
                      subtitle={entry.listing.location}
                      sizes="(max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute right-2 top-2 rounded-full bg-background/80 p-2 backdrop-blur">
                      <Heart className="size-4 fill-primary text-primary" />
                    </div>
                  </div>

                  <CardHeader>
                    <div className="space-y-1">
                      <CardTitle className="line-clamp-2">{entry.listing.title ?? entry.listing.assetCategory}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {entry.listing.location}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">₹{Math.round(entry.listing.pricePerDay)}</p>
                        <p className="text-xs text-muted-foreground">/day</p>
                      </div>
                      {entry.owner && (
                        <div className="flex items-center gap-1.5">
                          {entry.owner.avatarUrl && (
                            <Image
                              src={entry.owner.avatarUrl}
                              alt={entry.owner.name}
                              width={24}
                              height={24}
                              className="size-6 rounded-full object-cover"
                            />
                          )}
                          <div className="text-right">
                            <p className="text-xs font-medium line-clamp-1">{entry.owner.name}</p>
                            <div className="flex items-center gap-0.5">
                              <Star className="size-3 fill-primary text-primary" />
                              <span className="text-xs text-muted-foreground">{entry.owner.trustScore}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button asChild className="w-full">
                      <Link href="/marketplace">View & Book</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Owner View - Renters Who Wishlisted */}
      {role === "owner" && (
        <>
          {!wishlistOwner ? (
            <div className="flex justify-center">
              <div className="animate-pulse text-muted-foreground">Loading renter interest...</div>
            </div>
          ) : isEmptyOwner ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-16 text-center">
                <Zap className="mx-auto mb-4 size-12 text-muted-foreground/50" />
                <p className="text-lg font-semibold">No renter interest yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  When renters add your equipment to their wishlist, you'll see their profiles here.
                </p>
                <Button asChild className="mt-6">
                  <Link href="/admin/listings">Manage Listings</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {wishlistOwner.map((renter) => (
                <Card key={renter.id} className="overflow-hidden border-border/70 shadow-sm transition-all hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        {renter.avatarUrl && (
                          <Image
                            src={renter.avatarUrl}
                            alt={renter.name}
                            width={48}
                            height={48}
                            className="size-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <CardTitle className="line-clamp-1">{renter.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {renter.location ? renter.location : "Location not set"}
                          </CardDescription>
                          {renter.bio && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{renter.bio}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1 rounded-lg bg-primary/10 px-2 py-1">
                        <Star className="size-3 fill-primary text-primary" />
                        <span className="text-xs font-semibold">{renter.trustScore}</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Wishlisted Products */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        Saved Equipment ({renter.listings.length})
                      </p>
                      <div className="mt-2 space-y-2">
                        {renter.listings.map((listing: { _id: string; imageUrl?: string; title?: string; pricePerDay: number }) => (
                          <div
                            key={String(listing._id)}
                            className="flex gap-2 rounded-lg border bg-muted/30 p-2 transition-all hover:bg-muted/50"
                          >
                            {listing.imageUrl && (
                              <div className="relative size-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                                <Image
                                  src={listing.imageUrl}
                                  alt={listing.title || "Wishlisted equipment"}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div className="min-w-0 flex-1 text-xs">
                              <p className="line-clamp-1 font-medium">{listing.title}</p>
                              <p className="text-muted-foreground">₹{Math.round(listing.pricePerDay)}/day</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link href={`/admin/orders`}>View Orders</Link>
                      </Button>
                      <Button asChild size="sm" className="flex-1">
                        <Link href={`/admin`}>Dashboard</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
