"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { CalendarIcon, ShieldCheck, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useRazorpay } from "@/hooks/use-razorpay";
import { buildInvoiceUrl } from "@/lib/invoices";
import { calculateDynamicPrice } from "@/lib/rental-pricing";
import { processOrderCommunication } from "@/app/actions/order-communication";
import type { MarketplaceListing } from "./listing-types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { AiMarketBrief } from "@/components/shared/ai-market-brief";
import { cn } from "@/lib/utils";
import { type DateRange } from "react-day-picker";

type BookingDialogProps = {
  listing: MarketplaceListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BookingDialog({ listing, open, onOpenChange }: BookingDialogProps) {
  const router = useRouter();
  const { user } = useUser();
  const { checkoutWithEscrow, isProcessing } = useRazorpay();
  const attachInvoiceUrl = useMutation(api.orders.attachInvoiceUrl);
  const renterOrders = useQuery(api.orders.getRenterOrdersDetailed, user?.id ? { clerkId: user.id } : "skip");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 2),
  });
  const [aiInsight, setAiInsight] = React.useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setDateRange({
        from: new Date(),
        to: addDays(new Date(), 2),
      });
      setAiInsight(null);
    }
  }, [open]);

  const rentalStart = dateRange?.from;
  const rentalEnd = dateRange?.to;
  const hasFullRange = Boolean(rentalStart && rentalEnd);
  const selectedDays = rentalStart && rentalEnd ? Math.max(1, differenceInCalendarDays(rentalEnd, rentalStart) + 1) : 0;
  const minDays = Math.max(1, listing?.minimumRentalDays ?? 1);
  const assetAge = listing?.assetAge ?? null;
  const viewCount = listing?.viewCount ?? 0;
  const renterCompletedCount = React.useMemo(() => {
    return (renterOrders ?? []).filter((order) => {
      const status = String(order.orderStatus ?? "");
      return status === "completed" || status === "delivered";
    }).length;
  }, [renterOrders]);
  const pricing = React.useMemo(
    () => calculateDynamicPrice(listing?.basePricePerDay ?? listing?.pricePerDay ?? 0, selectedDays || 1, assetAge, renterCompletedCount, viewCount),
    [assetAge, listing?.basePricePerDay, listing?.pricePerDay, renterCompletedCount, selectedDays, viewCount],
  );
  const dynamicPriceApplied = pricing.durationDiscountRate + pricing.tenureDiscountRate + pricing.loyaltyDiscountRate;
  const isDurationValid = hasFullRange && selectedDays >= minDays;

  const availability = useQuery(
    api.listings.getBookingAvailability,
    listing
      ? {
          listingId: listing._id as Id<"listings">,
          startDate: rentalStart?.getTime(),
          endDate: rentalEnd?.getTime(),
        }
      : "skip",
  );

  const availableStock = availability?.success
    ? availability.data.availableStock
    : listing?.availableStock ?? listing?.stockCount ?? listing?.stockQuantity ?? 1;
  const isStockAvailable = availableStock > 0;

  React.useEffect(() => {
    if (!listing || !rentalStart || !rentalEnd) return;

    const generatePricingInsight = async () => {
      setIsLoadingAi(true);
      try {
        const response = await fetch("/api/ai/market-intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "renter",
            assetName: listing.title || listing.assetCategory,
            days: selectedDays,
            dynamicDiscount: pricing.durationDiscountRate + pricing.loyaltyDiscountRate,
            tenureDiscount: pricing.tenureDiscountRate,
            assetAge,
            escrowFee: 0,
            totalAmount: pricing.finalTotal,
          }),
        });

        const data = await response.json();
        if (data.insight) {
          setAiInsight(data.insight);
        }
      } catch (error) {
        console.error("Failed to generate AI insight:", error);
      } finally {
        setIsLoadingAi(false);
      }
    };

    void generatePricingInsight();
  }, [
    assetAge,
    listing,
    pricing.durationDiscountRate,
    pricing.finalTotal,
    pricing.loyaltyDiscountRate,
    pricing.tenureDiscountRate,
    rentalEnd,
    rentalStart,
    selectedDays,
  ]);

  if (!listing) return null;

  const handleCheckout = async () => {
    if (!user?.id || !user.primaryEmailAddress?.emailAddress) {
      toast.error("Please sign in before booking.");
      return;
    }

    if (!rentalStart || !rentalEnd) {
      toast.error("Please select a full rental date range.");
      return;
    }

    if (!isDurationValid) {
      toast.error(`Minimum booking is ${minDays} day${minDays === 1 ? "" : "s"}.`);
      return;
    }

    if (!isStockAvailable) {
      toast.error("This equipment is not available for the selected dates.");
      return;
    }

    try {
      const result = await checkoutWithEscrow({
        renterId: user.id,
        ownerId: String(listing.farmerId ?? ""),
        listingId: listing._id as Id<"listings">,
        type: "bulk",
        quantity: selectedDays,
        unit: "days",
        totalAmount: pricing.finalTotal,
        description: `Rental for ${listing.title || listing.assetCategory}`,
        deliveryAddress: listing.location,
        customer: {
          name: user.fullName || "Renter",
          email: user.primaryEmailAddress.emailAddress,
        },
        dynamicPriceApplied,
        dynamicTotal: pricing.finalTotal,
        rentalStartDate: rentalStart.getTime(),
        rentalEndDate: rentalEnd.getTime(),
      });

      const orderId = String(result.data.orderId);
      const invoiceUrl = buildInvoiceUrl({
        orderId,
        itemName: listing.title || listing.assetCategory,
        rentalStart: rentalStart.toISOString(),
        rentalEnd: rentalEnd.toISOString(),
        totalAmount: pricing.finalTotal,
      });

      await attachInvoiceUrl({
        orderId: result.data.orderId,
        invoiceUrl,
      });

      await processOrderCommunication({
        renterEmail: user.primaryEmailAddress.emailAddress,
        renterName: user.fullName || "Renter",
        ownerEmail: listing.ownerEmail || process.env.NEXT_PUBLIC_DEFAULT_OWNER_EMAIL || user.primaryEmailAddress.emailAddress,
        ownerName: listing.ownerName || "Equipment Owner",
        assetCategory: listing.title || listing.assetCategory,
        amount: pricing.finalTotal,
        orderId,
        paymentId: String(result.data.paymentId),
        gatewayOrderId: "-",
        quantity: `${selectedDays} days`,
        unitPricePerKg: listing.basePricePerDay ?? listing.pricePerDay,
        unitLabel: "day",
        sourceLocation: listing.location,
        deliveryAddress: {
          street: listing.location,
          city: listing.location.split(",")[0]?.trim() || "Unknown City",
          state: listing.location.split(",")[1]?.trim() || "Unknown State",
          pincode: "000000",
        },
        productImageUrl: listing.imageUrl,
      });

      toast.success("Payment secured in escrow.");
      onOpenChange(false);
      router.push("/renter/orders");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Booking failed";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] sm:max-w-5xl md:w-full max-h-[90vh] flex flex-col rounded-[2rem] border-zinc-200 bg-zinc-50 p-0 shadow-2xl overflow-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5 border-b border-zinc-200 bg-white p-6 lg:border-b-0 lg:border-r">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-2xl font-black text-zinc-950">Confirm Your Rental</DialogTitle>
              <DialogDescription className="text-sm text-zinc-600">
                Review the booking window, neutral pricing summary, and owner trust before payment.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-zinc-50">
              <div className="relative aspect-[4/3]">
                {listing.imageUrl ? (
                  <Image src={listing.imageUrl} alt={listing.title || listing.assetCategory} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-zinc-100 text-sm font-medium text-zinc-500">
                    No image available
                  </div>
                )}
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-zinc-950">{listing.title || listing.assetCategory}</p>
                    <p className="text-sm text-zinc-500">{listing.location}</p>
                  </div>
                  <Badge className="bg-zinc-900 text-white hover:bg-zinc-900">
                    ₹{(listing.basePricePerDay ?? listing.pricePerDay).toFixed(0)}/day
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Product Score</p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                      <Star className="size-4 text-zinc-700" />
                      Successfully rented {listing.totalRentals ?? listing.lifetimeRentals ?? 0} times
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Asset Tenure</p>
                    <p className="mt-2 text-sm font-semibold text-zinc-900">
                      {assetAge !== null ? `${assetAge} years old` : "Year not added yet"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Owner Trust</p>
                  <p className="mt-1 text-lg font-black text-zinc-950">{listing.ownerName || "Equipment Owner"}</p>
                  <p className="text-sm text-zinc-600">
                    Trust Score: {listing.ownerTrustScore ?? 78}% based on completed rentals and followers
                  </p>
                </div>
                <div className="text-right text-sm text-zinc-600">
                  <p>{listing.ownerLifetimeCompletedOrders ?? 0}+ completed rentals</p>
                  <p>{listing.ownerFollowerCount ?? 0} followers</p>
                </div>
              </div>
            </div>

            {aiInsight && !isLoadingAi ? <AiMarketBrief insight={aiInsight} variant="renter" /> : null}
            {isLoadingAi ? (
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
                <Sparkles className="size-4 animate-pulse" />
                Generating the smart pricing summary...
              </div>
            ) : null}
          </div>

          <div className="space-y-5 p-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-zinc-800">Rental Date Range</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-12 w-full justify-start rounded-xl border-zinc-200 bg-white text-left font-medium text-zinc-900",
                      !dateRange?.from && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        `${format(dateRange.from, "dd MMM yyyy")} - ${format(dateRange.to, "dd MMM yyyy")}`
                      ) : (
                        format(dateRange.from, "dd MMM yyyy")
                      )
                    ) : (
                      "Pick rental dates"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-zinc-500">Minimum rental: {minDays} day{minDays === 1 ? "" : "s"}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Availability</p>
                <p className="mt-2 text-lg font-black text-zinc-950">
                  {isStockAvailable ? `${availableStock} unit${availableStock === 1 ? "" : "s"} open` : "Already booked"}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  {isStockAvailable
                    ? "Your selected dates still have available inventory."
                    : availability?.success && availability.data.nearestEndDate
                      ? `Already Booked: Available on ${format(new Date(availability.data.nearestEndDate), "dd MMM yyyy")}.`
                      : listing.nearestEndDate
                        ? `Already Booked: Available on ${format(new Date(listing.nearestEndDate), "dd MMM yyyy")}.`
                        : "Try a different date range."}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Escrow Protection</p>
                <p className="mt-2 flex items-center gap-2 text-lg font-black text-zinc-950">
                  <ShieldCheck className="size-5 text-zinc-700" />
                  Funds held safely
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  The owner is paid only after return confirmation.
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-5">
              <p className="text-sm font-semibold text-zinc-800">Pre-Transaction Receipt</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Dates</span>
                  <span className="font-medium text-zinc-900">
                    {hasFullRange && rentalStart && rentalEnd
                      ? `${format(rentalStart, "dd MMM")} - ${format(rentalEnd, "dd MMM")} (${selectedDays} Days)`
                      : "Select a full date range"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Base Amount</span>
                  <span className="font-medium">₹{pricing.baseAmount.toFixed(0)}</span>
                </div>
                {pricing.surgeAmount > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-600">High Demand Surge (+15%)</span>
                    <span className="font-semibold text-amber-600">+₹{pricing.surgeAmount.toFixed(0)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Duration Discount</span>
                  <span className={pricing.durationDiscount > 0 ? "font-semibold text-zinc-900" : "text-zinc-400"}>
                    {pricing.durationDiscount > 0 ? `-₹${pricing.durationDiscount.toFixed(0)}` : "Not applied"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Age / Tenure Discount</span>
                  <span className={pricing.tenureDiscount > 0 ? "font-semibold text-zinc-900" : "text-zinc-400"}>
                    {pricing.tenureDiscount > 0 ? `-₹${pricing.tenureDiscount.toFixed(0)}` : "Not applied"}
                  </span>
                </div>
                {pricing.loyaltyDiscount > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Loyalty Discount</span>
                    <span className="font-semibold text-zinc-900">-₹{pricing.loyaltyDiscount.toFixed(0)}</span>
                  </div>
                ) : null}
                <div className="border-t border-zinc-200 pt-3">
                  <div className="flex items-center justify-between text-base font-black text-zinc-950">
                    <span>Final Total</span>
                    <span>₹{pricing.finalTotal.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="h-12 flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                className="h-12 flex-1 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800"
                disabled={!hasFullRange || !isDurationValid || !isStockAvailable || isProcessing}
                onClick={() => void handleCheckout()}
              >
                Proceed to Secure Payment
              </Button>
            </div>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
