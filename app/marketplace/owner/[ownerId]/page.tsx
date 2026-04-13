"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Users, Trophy, ShieldCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { ListingMedia } from "@/components/listings/listing-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OwnerListingsPage() {
  const params = useParams<{ ownerId: string }>();
  const { user } = useUser();
  const data = useQuery(api.listings.getListingsByOwnerId, params?.ownerId ? { ownerId: params.ownerId, limit: 24 } : "skip");
  const followState = useQuery(
    api.follows.isFollowing,
    user?.id && params?.ownerId ? { followerId: user.id, ownerId: params.ownerId } : "skip",
  );
  const toggleFollow = useMutation(api.follows.toggleFollow);

  if (!data) return null;
  if (!data.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Owner not found</CardTitle>
          <CardDescription>{data.error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleFollow = async () => {
    if (!user?.id || !params?.ownerId) {
      toast.error("Please sign in to follow this owner.");
      return;
    }

    const result = await toggleFollow({
      followerId: user.id,
      ownerId: params.ownerId,
    });

    toast.success(result.following ? "Owner followed" : "Owner unfollowed");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 md:px-6">
      <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-[linear-gradient(135deg,#ffffff_0%,#f6f7f3_55%,#eef2eb_100%)] p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">Owner Profile</p>
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tight text-zinc-950">{data.owner.name}</h1>
              <p className="max-w-2xl text-sm font-medium text-zinc-600">{data.owner.bio}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1 border-emerald-200 bg-white/80 text-emerald-700">
                <ShieldCheck className="size-3.5" />
                Trust {data.owner.trustScore}/100
              </Badge>
              <Badge variant="outline" className="gap-1 border-zinc-200 bg-white/80 text-zinc-700">
                <Users className="size-3.5" />
                {data.owner.followerCount} followers
              </Badge>
              <Badge variant="outline" className="gap-1 border-amber-200 bg-white/80 text-amber-700">
                <Trophy className="size-3.5" />
                {data.owner.badge} - {data.owner.lifetimeCompletedOrders}+ completed rentals
              </Badge>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 rounded-[1.5rem] border border-zinc-200 bg-white/80 p-5 md:items-end">
            <p className="text-sm font-medium text-zinc-500">Stay updated when this owner adds new equipment.</p>
            <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={() => void handleFollow()}>
              {followState?.following ? "Following" : "+ Follow"}
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/marketplace">Back to Marketplace</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.data.map((listing) => (
          <Card key={String(listing._id)} className="overflow-hidden border-zinc-200 bg-white shadow-sm">
            <div className="relative aspect-[4/3]">
              <ListingMedia
                imageUrl={listing.imageUrl}
                alt={listing.title ?? listing.assetCategory}
                title={listing.title ?? listing.assetCategory}
                subtitle={listing.location}
                sizes="(max-width: 1200px) 50vw, 33vw"
              />
            </div>
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{listing.title ?? listing.assetCategory}</CardTitle>
                  <CardDescription>{listing.location}</CardDescription>
                </div>
                <Badge variant="secondary">₹{Math.round(listing.pricePerDay)}/day</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{listing.availableStock ?? listing.stockQuantity ?? 1} available</Badge>
                {listing.assetAge !== null && listing.assetAge !== undefined ? (
                  <Badge variant="outline">{listing.assetAge} yrs old</Badge>
                ) : null}
                <Badge variant="outline">{listing.totalRentals ?? listing.lifetimeRentals ?? 0} rentals</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{listing.description}</p>
              <Button asChild size="sm" className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700">
                <Link href="/marketplace">Open in Marketplace</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
