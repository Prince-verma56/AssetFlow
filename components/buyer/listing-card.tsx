"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ASSET_CATEGORIES } from "@/lib/constants/categories";
import type { BuyerListing } from "@/components/buyer/listing-detail-sheet";
import { ListingMedia } from "@/components/listings/listing-media";

export type ListingCardProps = {
  listing: BuyerListing;
  onViewDetails: (listing: BuyerListing) => void;
  onQuickAdd: (listing: BuyerListing) => void;
};

export function ListingCard({ listing, onViewDetails, onQuickAdd }: ListingCardProps) {
  const bestDeal = typeof listing.mandiModalPrice === "number" && listing.pricePerDay < listing.mandiModalPrice;

  // Resolve subcategory name gracefully
  const mainCat = ASSET_CATEGORIES.find(c => c.id === listing.categoryId);
  const subCatName = mainCat?.subCategories.find(s => s.id === listing.subCategoryId)?.name;
  const displayCategory = subCatName || listing.assetCategory.split(" - ")[1] || listing.assetCategory;

  return (
    <Card
      className={`transition-all duration-300 hover:scale-[1.02] hover:border-primary ${
        bestDeal ? "border-primary/60" : ""
      }`}
    >
      <CardHeader className="p-0">
        <div className="relative overflow-hidden rounded-t-xl">
          <div className="aspect-[4/3]">
            <ListingMedia
              imageUrl={listing.imageUrl}
              alt={listing.assetCategory}
              title={listing.assetCategory}
              subtitle={listing.location}
            />
          </div>
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            <Badge variant="outline" className="bg-background/90">
              {listing.qualityScore ? `${listing.qualityScore} Grade` : "Grade Pending"}
            </Badge>
            {listing.oraclePrice ? <Badge className="bg-primary text-primary-foreground">AI Verified</Badge> : null}
            <Badge variant="outline" className="bg-background/90">
              Verified Owner
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-4">
        <div className="flex justify-between items-start gap-2">
           <h3 className="text-base font-medium leading-tight">{listing.assetCategory.split(" - ")[0]}</h3>
           <Badge variant="secondary" className="text-[10px] bg-muted shrink-0 text-muted-foreground">{displayCategory}</Badge>
        </div>
        <p className="text-xl font-black text-primary">₹{listing.pricePerDay?.toFixed(2) || '0.00'}/day</p>
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
