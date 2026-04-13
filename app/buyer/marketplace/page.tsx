"use client";

import { Suspense, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListingCard } from "@/components/buyer/listing-card";
import { ListingDetailSheet, type BuyerListing } from "@/components/buyer/listing-detail-sheet";

import { ASSET_CATEGORIES } from "@/lib/constants/categories";
import { useRouter, useSearchParams } from "next/navigation";

function BuyerMarketplacePageContent() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCategoryId = searchParams.get("category");
  // Default to "All" if missing/invalid, else use the raw category.
  const [query, setQuery] = useState("");
  const category = rawCategoryId && ASSET_CATEGORIES.some(c => c.id === rawCategoryId) ? rawCategoryId : "All";
  
  const setCategory = (catId: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (catId === "All") {
      newParams.delete("category");
    } else {
      newParams.set("category", catId);
    }
    router.replace(`?${newParams.toString()}`);
  };
  const [priceRange, setPriceRange] = useState([0, 300]);
  const [distanceKm, setDistanceKm] = useState([50]);
  const [sortBy, setSortBy] = useState("distance");
  const [cartCount, setCartCount] = useState(0);
  const [selectedListing, setSelectedListing] = useState<BuyerListing | null>(null);

  const userRecord = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip");
  const lat = userRecord?.data?.lat;
  const lng = userRecord?.data?.lng;

  const nearby = useQuery(
    api.listings.getListingsNearby,
    typeof lat === "number" && typeof lng === "number"
      ? { lat, lng, radiusKm: distanceKm[0], limit: 150, categoryId: category }
      : "skip"
  );

  const listings = useMemo(() => {
    const raw = nearby?.success ? nearby.data : [];
    const mapped = raw.map((item) => ({
      id: item.id,
      assetCategory: item.assetCategory,
      description: item.description,
      pricePerDay: item.pricePerDay,
      quantity: item.quantity,
      location: item.location,
      imageUrl: item.imageUrl,
      farmerId: item.farmerId,
      farmerName: item.farmerName,
      farmerImage: item.farmerImage,
      categoryId: item.categoryId || "farming", // Fallback for old data
      subCategoryId: item.subCategoryId || "tractor",
      approxLat: item.approxLat,
      approxLng: item.approxLng,
      distanceKm: item.distanceKm,
      oraclePrice: item.oraclePrice,
      mandiModalPrice: item.mandiModalPrice,
      qualityScore: item.qualityScore,
    })) as BuyerListing[];

    const filtered = mapped.filter((listing) => {
      const matchesQuery =
        query.trim().length === 0 ||
        listing.assetCategory.toLowerCase().includes(query.toLowerCase()) ||
        listing.location.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "All" || listing.categoryId === category;
      const matchesPrice = listing.pricePerDay >= priceRange[0] && listing.pricePerDay <= priceRange[1];
      return matchesQuery && matchesCategory && matchesPrice;
    });

    if (sortBy === "price_low") filtered.sort((a, b) => a.pricePerDay - b.pricePerDay);
    if (sortBy === "price_high") filtered.sort((a, b) => b.pricePerDay - a.pricePerDay);
    if (sortBy === "distance") filtered.sort((a, b) => a.distanceKm - b.distanceKm);

    return filtered;
  }, [nearby, query, category, priceRange, sortBy]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Horizontal Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Button
          variant={category === "All" ? "default" : "outline"}
          className="rounded-full shrink-0"
          onClick={() => setCategory("All")}
        >
          All
        </Button>
        {ASSET_CATEGORIES.map((item) => (
          <Button
            key={item.id}
            variant={item.id === category ? "default" : "outline"}
            className="rounded-full gap-2 shrink-0"
            onClick={() => setCategory(item.id)}
          >
            <item.icon className="size-4" />
            {item.name}
          </Button>
        ))}
      </div>

      <div className="sticky top-16 z-10 rounded-xl border bg-background/95 p-3 backdrop-blur">
        <div className="grid gap-2 md:grid-cols-[1fr_220px_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search listings" className="pl-9" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distance">Sort by Distance</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">Cart ({cartCount})</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit lg:sticky lg:top-36">
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">Price Range (₹/day)</p>
              <Slider value={priceRange} min={0} max={300} step={1} onValueChange={setPriceRange} />
              <p className="text-xs text-muted-foreground">
                ₹{priceRange[0]} - ₹{priceRange[1]}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Distance</p>
              <Slider value={distanceKm} min={5} max={100} step={5} onValueChange={setDistanceKm} />
              <p className="text-xs text-muted-foreground">Within {distanceKm[0]} km</p>
            </div>
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, staggerChildren: 0.15 }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {listings.map((listing, index) => (
            <motion.div key={listing.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
              <ListingCard
                listing={listing}
                onViewDetails={setSelectedListing}
                onQuickAdd={() => setCartCount((count) => count + 1)}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>

      <ListingDetailSheet open={Boolean(selectedListing)} onOpenChange={(open) => !open && setSelectedListing(null)} listing={selectedListing} />
    </div>
  );
}

export default function BuyerMarketplacePage() {
  return (
    <Suspense fallback={<div className="p-4 md:p-6 text-sm text-muted-foreground">Loading marketplace...</div>}>
      <BuyerMarketplacePageContent />
    </Suspense>
  );
}
