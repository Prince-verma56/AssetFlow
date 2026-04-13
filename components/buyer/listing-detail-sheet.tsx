"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import type { Id } from "@/convex/_generated/dataModel";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChatDrawer } from "@/components/chat/chat-drawer";
import { useRazorpay } from "@/hooks/use-razorpay";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ListingMedia } from "@/components/listings/listing-media";

export type BuyerListing = {
  id: string;
  assetCategory: string;
  categoryId?: string;
  subCategoryId?: string;
  description: string;
  pricePerDay: number;
  quantity: string;
  location: string;
  imageUrl?: string;
  farmerId: string;
  farmerName: string;
  farmerImage?: string;
  approxLat: number;
  approxLng: number;
  distanceKm: number;
  oraclePrice?: number;
  mandiModalPrice?: number;
  qualityScore?: string;
};

type ListingDetailSheetProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  listing: BuyerListing | null;
};

function dealLabel(percent: number) {
  if (percent >= 15) return "Excellent";
  if (percent >= 7) return "Good";
  return "Fair";
}

export function ListingDetailSheet({ open, onOpenChange, listing }: ListingDetailSheetProps) {
  const { user } = useUser();
  const { checkoutWithEscrow, confirmReceivedAndRelease } = useRazorpay();
  const updateOrderStatus = useMutation(api.orders.updateOrderStatus);
  const [activeOrderId, setActiveOrderId] = useState<Id<"orders"> | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const savingsPercent = useMemo(() => {
    if (!listing?.mandiModalPrice || listing.mandiModalPrice <= 0) return 0;
    return ((listing.mandiModalPrice - listing.pricePerDay) / listing.mandiModalPrice) * 100;
  }, [listing]);

  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!countdown) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [countdown]);

  const remainingHours = countdown ? Math.max(0, Math.round((countdown - now) / (1000 * 60 * 60))) : 0;

  if (!listing) return null;

  const startCheckout = async (type: "sample" | "bulk") => {
    if (!user?.id) return;
    const quantity = type === "sample" ? 1 : 100;
    const unit = "kg";
    const baseAmount = listing.pricePerDay * quantity;
    const totalAmount = type === "sample" ? baseAmount + 30 : baseAmount;
    const result = await checkoutWithEscrow({
      renterId: user.id,
      ownerId: listing.farmerId,
      listingId: listing.id as Id<"listings">,
      type,
      quantity,
      unit,
      totalAmount,
      description: `${type === "sample" ? "Sample" : "Bulk"} order for ${listing.assetCategory}`,
      deliveryAddress: "Address captured at checkout",
      customer: {
        name: user.fullName || "Renter",
        email: user.primaryEmailAddress?.emailAddress,
      },
    });
    if (result.success) {
      setActiveOrderId(result.data.orderId as Id<"orders">);
      setCountdown(result.data.escrowReleaseAt);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-2xl">
          <SheetHeader className="border-b p-6 text-left">
            <SheetTitle>{listing.assetCategory}</SheetTitle>
            <SheetDescription>{listing.location}</SheetDescription>
          </SheetHeader>

          <div className="space-y-5 p-6">
            <div className="relative h-56 overflow-hidden rounded-xl border">
              <ListingMedia
                imageUrl={listing.imageUrl}
                alt={listing.assetCategory}
                title={listing.assetCategory}
                subtitle={listing.location}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>

            <Card>
              <CardContent className="space-y-3 pt-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">AI Verified</Badge>
                  <Badge variant="outline">Direct Farm</Badge>
                  {listing.qualityScore ? <Badge>{listing.qualityScore} Grade</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">{listing.description}</p>
                <p className="text-2xl font-black text-primary">₹{listing.pricePerDay?.toFixed(2) || '0.00'}/day</p>
                <p className="text-sm text-muted-foreground">Available: {listing.quantity}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 pt-5">
                <p className="text-sm font-semibold">AI Price Oracle Gauge</p>
                <Progress value={Math.max(0, Math.min(100, savingsPercent))} />
                <p className="text-sm text-muted-foreground">
                  {Math.max(0, savingsPercent).toFixed(1)}% below Mandi - {dealLabel(Math.max(0, savingsPercent))} deal
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 pt-5">
                <p className="text-sm font-semibold">Owner Profile</p>
                <p className="text-sm text-muted-foreground">{listing.farmerName}</p>
                <p className="text-xs text-muted-foreground">Distance: {listing.distanceKm.toFixed(1)} km</p>
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
              <Button onClick={() => startCheckout("sample")}>Order 1kg Sample First</Button>
              <Button variant="outline" onClick={() => startCheckout("bulk")}>
                Place Bulk Order
              </Button>
            </div>

            {countdown ? (
              <Card>
                <CardContent className="space-y-2 pt-5">
                  <p className="text-sm text-muted-foreground">
                    Payment auto-releases to owner in approximately {remainingHours} hours.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!activeOrderId) return;
                        await confirmReceivedAndRelease(activeOrderId);
                        setCountdown(null);
                      }}
                    >
                      Confirm Received
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!activeOrderId) return;
                        await updateOrderStatus({ orderId: activeOrderId, orderStatus: "disputed" });
                      }}
                    >
                      Raise Dispute
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Button className="w-full" variant="secondary" onClick={() => setChatOpen(true)}>
              Open Chat
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ChatDrawer
        open={chatOpen}
        onOpenChange={setChatOpen}
        listingId={listing.id as Id<"listings">}
        listingName={listing.assetCategory}
        ownerName={listing.farmerName}
        senderId={user?.id || "renter"}
        receiverId={listing.farmerId}
      />
    </>
  );
}
