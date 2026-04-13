"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FarmerListingsPage() {
  const { user } = useUser();
  const listings = useQuery(api.listings.getListingsByFarmer, user?.id ? { clerkId: user.id } : "skip");

  const data = listings?.success ? listings.data : [];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-black">Farmer Listings</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((listing) => (
          <Card key={listing._id}>
            <CardHeader>
              <CardTitle>{listing.cropName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p>{listing.location}</p>
              <p>₹{listing.pricePerKg.toFixed(2)}/kg</p>
              <p>{listing.quantity}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
