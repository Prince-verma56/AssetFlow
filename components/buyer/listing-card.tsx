"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { BuyerListing } from "@/components/buyer/listing-detail-sheet";

export type ListingCardProps = {
  listing: BuyerListing;
  onViewDetails: (listing: BuyerListing) => void;
  onQuickAdd: (listing: BuyerListing) => void;
};

export function ListingCard({ listing, onViewDetails, onQuickAdd }: ListingCardProps) {
  const bestDeal =
    typeof listing.mandiModalPrice === "number" && listing.pricePerKg < listing.mandiModalPrice;

  return (
    <Card
      className={`transition-all duration-300 hover:scale-[1.02] hover:border-primary ${
        bestDeal ? "border-primary/60" : ""
      }`}
    >
      <CardHeader className="p-0">
        <div className="relative overflow-hidden rounded-t-xl">
          <Image
            src={listing.imageUrl || "/placeholder-farmer.png"}
            alt={listing.cropName}
            width={800}
            height={600}
            className="aspect-[4/3] h-auto w-full object-cover"
          />
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            <Badge variant="outline" className="bg-background/90">
              {listing.qualityScore ? `${listing.qualityScore} Grade` : "Grade Pending"}
            </Badge>
            {listing.oraclePrice ? <Badge className="bg-primary text-primary-foreground">AI Verified</Badge> : null}
            <Badge variant="outline" className="bg-background/90">
              Direct Farm
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-4">
        <h3 className="text-base font-medium">{listing.cropName}</h3>
        <p className="text-xl font-black text-primary">₹{listing.pricePerKg.toFixed(2)}/kg</p>
        <p className="text-sm text-muted-foreground">Available: {listing.quantity}</p>
        <p className="text-sm text-muted-foreground">Distance: {listing.distanceKm.toFixed(1)} km</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
            {listing.farmerName.charAt(0)}
          </div>
          <span>{listing.farmerName}</span>
          <span>•</span>
          <span>4.7</span>
        </div>
      </CardContent>
      <CardFooter className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => onViewDetails(listing)}>
          View Details
        </Button>
        <Button onClick={() => onQuickAdd(listing)}>Quick Add</Button>
      </CardFooter>
    </Card>
  );
}
