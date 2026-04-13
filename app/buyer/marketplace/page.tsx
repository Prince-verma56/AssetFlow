"use client";

import { useMemo, useState } from "react";
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

const categories = ["All", "Cereals", "Vegetables", "Pulses", "Fruits", "Oilseeds"];

function getCategory(cropName: string) {
  const crop = cropName.toLowerCase();
  if (["wheat", "rice", "paddy", "maize", "bajra", "jowar"].some((x) => crop.includes(x))) return "Cereals";
  if (["onion", "tomato", "potato"].some((x) => crop.includes(x))) return "Vegetables";
  if (["gram", "tur", "moong", "urad"].some((x) => crop.includes(x))) return "Pulses";
  if (["apple", "banana"].some((x) => crop.includes(x))) return "Fruits";
  return "Oilseeds";
}

export default function BuyerMarketplacePage() {
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
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
      ? { lat, lng, radiusKm: distanceKm[0], limit: 150 }
      : "skip"
  );

  const listings = useMemo(() => {
    const raw = nearby?.success ? nearby.data : [];
    const mapped = raw.map((item) => ({
      id: item.id,
      cropName: item.cropName,
      description: item.description,
      pricePerKg: item.pricePerKg,
      quantity: item.quantity,
      location: item.location,
      imageUrl: item.imageUrl,
      farmerId: item.farmerId,
      farmerName: item.farmerName,
      farmerImage: item.farmerImage,
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
        listing.cropName.toLowerCase().includes(query.toLowerCase()) ||
        listing.location.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "All" || getCategory(listing.cropName) === category;
      const matchesPrice = listing.pricePerKg >= priceRange[0] && listing.pricePerKg <= priceRange[1];
      return matchesQuery && matchesCategory && matchesPrice;
    });

    if (sortBy === "price_low") filtered.sort((a, b) => a.pricePerKg - b.pricePerKg);
    if (sortBy === "price_high") filtered.sort((a, b) => b.pricePerKg - a.pricePerKg);
    if (sortBy === "distance") filtered.sort((a, b) => a.distanceKm - b.distanceKm);

    return filtered;
  }, [nearby, query, category, priceRange, sortBy]);

  return (
    <div className="space-y-4 p-4 md:p-6">
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
              <p className="text-sm font-medium">Category</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((item) => (
                  <Badge
                    key={item}
                    variant={item === category ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Price Range (₹/kg)</p>
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
