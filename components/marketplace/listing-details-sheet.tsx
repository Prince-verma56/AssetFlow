"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import {
  BadgeCheck,
  CalendarIcon,
  CheckCircle2,
  ChevronRight,
  Eye,
  Heart,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserPlus,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useRazorpay } from "@/hooks/use-razorpay";
import { buildInvoiceUrl } from "@/lib/invoices";
import { calculateDynamicPrice } from "@/lib/rental-pricing";
import { processOrderCommunication } from "@/app/actions/order-communication";
import type { MarketplaceListing } from "./listing-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type ListingDetailsSheetProps = {
  listing: MarketplaceListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaved: boolean;
  onToggleSaved: () => void;
  onBookNow?: () => void; // optional — modal handles checkout inline
};

// ─── Trust Meter Component ────────────────────────────────────────────────────

function TrustMeter({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Trust Meter</span>
        <span className="text-sm font-black text-slate-950">{clamped}/100</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-slate-900"
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ─── Star Rating Input ────────────────────────────────────────────────────────

function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = React.useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              "size-5 transition-colors",
              star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-slate-300",
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Asset History Stepper ────────────────────────────────────────────────────

function AssetStepper({
  listing,
}: {
  listing: MarketplaceListing;
}) {
  const steps = [
    {
      label: "Listed",
      value: "Active on Marketplace",
      icon: CheckCircle2,
      done: true,
    },
    {
      label: "Condition",
      value: listing.condition ?? "Quality Verified",
      icon: ShieldCheck,
      done: true,
    },
    {
      label: "Tenure",
      value:
        typeof listing.assetAge === "number" && listing.assetAge >= 0
          ? `${listing.assetAge} Year${listing.assetAge === 1 ? "" : "s"} Old`
          : "Tenure Pending",
      icon: CalendarIcon,
      done: typeof listing.assetAge === "number",
    },
    {
      label: "Rentals",
      value: `${listing.totalRentals ?? listing.lifetimeRentals ?? 0} Completed`,
      icon: TrendingUp,
      done: (listing.totalRentals ?? 0) > 0 || (listing.lifetimeRentals ?? 0) > 0,
    },
    {
      label: "Avg Rating",
      value:
        listing.averageRating != null
          ? `${listing.averageRating.toFixed(1)} / 5.0`
          : "No ratings yet",
      icon: Star,
      done: listing.averageRating != null,
    },
  ];

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <div key={step.label} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-2 transition-colors",
                  step.done
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-400",
                )}
              >
                <Icon className="size-3.5" />
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mt-0.5 h-5 w-0.5 rounded-full",
                    step.done ? "bg-slate-900" : "bg-slate-200",
                  )}
                />
              )}
            </div>
            <div className="pb-3 pt-0.5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                {step.label}
              </p>
              <p className="text-sm font-bold text-slate-900">{step.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function ListingDetailsSheet({
  listing,
  open,
  onOpenChange,
  isSaved,
  onToggleSaved,
}: ListingDetailsSheetProps) {
  const router = useRouter();
  const { user } = useUser();
  const { checkoutWithEscrow, isProcessing } = useRazorpay();
  const attachInvoiceUrl = useMutation(api.orders.attachInvoiceUrl);
  const toggleFollow = useMutation(api.follows.toggleFollow);
  const submitRating = useMutation(api.ratings.submitRating);
  const incrementViewCount = useMutation(api.ratings.incrementViewCount);

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 2),
  });
  const [ratingScore, setRatingScore] = React.useState(0);
  const [ratingComment, setRatingComment] = React.useState("");
  const [isSubmittingRating, setIsSubmittingRating] = React.useState(false);

  // ── Convex queries ──────────────────────────────────────────────────────────

  const followingState = useQuery(
    api.follows.isFollowing,
    user?.id && listing?.ownerId
      ? { followerId: user.id, ownerId: listing.ownerId }
      : "skip",
  );

  const ratingData = useQuery(
    api.ratings.getRatingsForListing,
    listing ? { listingId: listing._id as Id<"listings"> } : "skip",
  );

  const userOrderStatus = useQuery(
    api.ratings.getUserOrderStatusForListing,
    listing ? { listingId: listing._id as Id<"listings"> } : "skip",
  );

  const renterOrders = useQuery(
    api.orders.getRenterOrdersDetailed,
    user?.id ? { clerkId: user.id } : "skip",
  );

  const availability = useQuery(
    api.listings.getBookingAvailability,
    listing
      ? {
          listingId: listing._id as Id<"listings">,
          startDate: dateRange?.from?.getTime(),
          endDate: dateRange?.to?.getTime(),
        }
      : "skip",
  );

  // ── Increment view count on modal open ─────────────────────────────────────
  React.useEffect(() => {
    if (open && listing) {
      void incrementViewCount({ listingId: listing._id as Id<"listings"> });
    }
  }, [open, listing, incrementViewCount]);

  // ── Reset on close ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!open) {
      setDateRange({ from: new Date(), to: addDays(new Date(), 2) });
      setRatingScore(0);
      setRatingComment("");
    }
  }, [open]);

  // ── Pre-fill existing rating ────────────────────────────────────────────────
  React.useEffect(() => {
    if (userOrderStatus?.hasRated && userOrderStatus.existingScore) {
      setRatingScore(userOrderStatus.existingScore);
      setRatingComment(userOrderStatus.existingComment ?? "");
    }
  }, [userOrderStatus]);

  // ── Computed values (must be before conditional return for hooks) ───────────
  const dailyPrice = listing?.basePricePerDay ?? listing?.pricePerDay ?? 0;
  const assetAge = listing?.assetAge ?? null;
  const minDays = Math.max(1, listing?.minimumRentalDays ?? 1);
  const viewCount = listing?.viewCount ?? 0;

  const selectedDays =
    dateRange?.from && dateRange?.to
      ? Math.max(1, differenceInCalendarDays(dateRange.to, dateRange.from) + 1)
      : 0;

  const renterCompletedCount = React.useMemo(
    () =>
      (renterOrders ?? []).filter((o) => {
        const s = String(o.orderStatus ?? "");
        return s === "completed" || s === "delivered";
      }).length,
    [renterOrders],
  );

  const pricing = React.useMemo(
    () =>
      calculateDynamicPrice(dailyPrice, selectedDays || 1, assetAge, renterCompletedCount, viewCount),
    [dailyPrice, selectedDays, assetAge, renterCompletedCount, viewCount],
  );

  const isDurationValid = Boolean(dateRange?.from && dateRange?.to && selectedDays >= minDays);
  const availableStock = availability?.success
    ? availability.data.availableStock
    : listing?.availableStock ?? listing?.stockCount ?? listing?.stockQuantity ?? 1;
  const isStockAvailable = availableStock > 0;

  // Trust score = (completedRentals * 10) + (avgRating * 10), capped at 100
  const avgRating = ratingData?.avgScore ?? listing?.averageRating ?? 0;
  const completedRentals = listing?.ownerLifetimeCompletedOrders ?? 0;
  const trustScore = Math.min(
    100,
    Math.max(
      listing?.ownerTrustScore ?? 70,
      completedRentals * 10 + avgRating * 10,
    ),
  );

  const isHighDemand = viewCount > 50;

  if (!listing) return null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleFollowOwner = async () => {
    if (!user?.id || !listing.ownerId) {
      toast.error("Sign in first to follow this owner.");
      return;
    }
    const result = await toggleFollow({ followerId: user.id, ownerId: listing.ownerId });
    toast.success(result.following ? "Owner followed!" : "Owner unfollowed.");
  };

  const handleRatingSubmit = async () => {
    if (ratingScore === 0) {
      toast.error("Please select a star rating.");
      return;
    }
    setIsSubmittingRating(true);
    try {
      await submitRating({
        listingId: listing._id as Id<"listings">,
        score: ratingScore,
        comment: ratingComment,
      });
      toast.success("Rating submitted! Thank you.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit rating.");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleCheckout = async () => {
    if (!user?.id || !user.primaryEmailAddress?.emailAddress) {
      toast.error("Please sign in before booking.");
      return;
    }
    if (!dateRange?.from || !dateRange?.to) {
      toast.error("Please select a rental date range.");
      return;
    }
    if (!isDurationValid) {
      toast.error(`Minimum booking is ${minDays} day${minDays === 1 ? "" : "s"}.`);
      return;
    }
    if (!isStockAvailable) {
      toast.error("Equipment not available for selected dates.");
      return;
    }

    try {
      const dynamicPriceApplied =
        pricing.durationDiscountRate + pricing.tenureDiscountRate + pricing.loyaltyDiscountRate;

      const result = await checkoutWithEscrow({
        renterId: user.id,
        ownerId: String(listing.farmerId ?? ""),
        listingId: listing._id as Id<"listings">,
        type: "bulk",
        quantity: selectedDays,
        unit: "days",
        totalAmount: pricing.finalTotal,
        description: `Rental: ${listing.title || listing.assetCategory} (${selectedDays} days)`,
        deliveryAddress: listing.location,
        customer: {
          name: user.fullName || "Renter",
          email: user.primaryEmailAddress.emailAddress,
        },
        dynamicPriceApplied,
        dynamicTotal: pricing.finalTotal,
        rentalStartDate: dateRange.from.getTime(),
        rentalEndDate: dateRange.to.getTime(),
      });

      const orderId = String(result.data.orderId);
      const invoiceUrl = buildInvoiceUrl({
        orderId,
        itemName: listing.title || listing.assetCategory,
        rentalStart: dateRange.from.toISOString(),
        rentalEnd: dateRange.to.toISOString(),
        totalAmount: pricing.finalTotal,
      });

      await attachInvoiceUrl({ orderId: result.data.orderId, invoiceUrl });

      await processOrderCommunication({
        renterEmail: user.primaryEmailAddress.emailAddress,
        renterName: user.fullName || "Renter",
        ownerEmail:
          listing.ownerEmail ||
          process.env.NEXT_PUBLIC_DEFAULT_OWNER_EMAIL ||
          user.primaryEmailAddress.emailAddress,
        ownerName: listing.ownerName || "Equipment Owner",
        assetCategory: listing.title || listing.assetCategory,
        amount: pricing.finalTotal,
        orderId,
        paymentId: String(result.data.paymentId),
        gatewayOrderId: "-",
        quantity: `${selectedDays} days`,
        unitPricePerKg: dailyPrice,
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

      toast.success("Payment secured in escrow!");
      onOpenChange(false);
      router.push("/renter/orders");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking failed");
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border-zinc-200 bg-white p-0 shadow-2xl sm:max-w-3xl lg:max-w-5xl relative">
        <motion.div
          className="grid h-full max-h-[95vh] grid-cols-1 overflow-auto md:overflow-hidden md:grid-cols-[1fr] lg:grid-cols-[1.1fr_0.9fr]"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {/* ═══ LEFT COLUMN: Visuals ═══════════════════════════════════════════ */}
          <div className="flex flex-col overflow-y-auto border-b border-zinc-200 bg-zinc-50/60 lg:border-b-0 lg:border-r">
            {/* Header badges */}
            <div className="space-y-4 p-6 pb-0">
              <DialogHeader className="text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-zinc-200 bg-white text-zinc-700">
                    {listing.assetCategory}
                  </Badge>
                  {listing.condition && (
                    <Badge variant="outline" className="border-zinc-200 bg-white text-zinc-700">
                      {listing.condition}
                    </Badge>
                  )}
                  {isHighDemand && (
                    <Badge className="gap-1 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50">
                      <Zap className="size-3 fill-amber-500 text-amber-500" />
                      High Demand
                    </Badge>
                  )}
                  {viewCount > 0 && (
                    <Badge variant="outline" className="gap-1 border-zinc-200 bg-white text-zinc-500">
                      <Eye className="size-3" />
                      {viewCount} views
                    </Badge>
                  )}
                </div>
                <DialogTitle className="mt-2 text-3xl font-black tracking-tighter text-slate-950">
                  {listing.title || listing.assetCategory}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500">
                  {listing.location}
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Product Image */}
            <div className="px-6 pt-4">
              <div className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white">
                <div className="relative aspect-[16/9]">
                  {listing.imageUrl ? (
                    <Image
                      src={listing.imageUrl}
                      alt={listing.title || listing.assetCategory}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-zinc-100 text-sm font-medium text-zinc-400">
                      No image available
                    </div>
                  )}
                  {/* Overlay badges */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                      <Star className="size-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold text-slate-900">
                        {avgRating > 0 ? avgRating.toFixed(1) : "New"}
                      </span>
                      {ratingData && ratingData.count > 0 && (
                        <span className="text-xs text-slate-500">({ratingData.count})</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Asset History Stepper */}
            <div className="px-6 pt-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Asset History
              </p>
              <AssetStepper listing={listing} />
            </div>

            {/* Description */}
            {listing.description && (
              <div className="px-6 pb-6 pt-2">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
                  About This Asset
                </p>
                <p className="text-sm leading-6 text-slate-600">{listing.description}</p>
              </div>
            )}

            {/* Ratings Section */}
            {ratingData && ratingData.ratings.length > 0 && (
              <div className="border-t border-zinc-200 px-6 pb-6 pt-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  Renter Reviews
                </p>
                <div className="space-y-3">
                  {ratingData.ratings.slice(0, 3).map((r: { _id: string | number; score: number; authorName?: string; comment?: string }) => (
                    <div
                      key={String(r._id)}
                      className="rounded-xl border border-zinc-200 bg-white p-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={cn(
                                "size-3",
                                s <= r.score
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-none text-zinc-200",
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-slate-900">{r.authorName}</span>
                      </div>
                      {r.comment && (
                        <p className="mt-1 text-xs text-slate-500">{r.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ═══ RIGHT COLUMN: Actions ══════════════════════════════════════════ */}
          <div className="flex flex-col md:overflow-y-auto">
            <div className="space-y-5 p-6 pt-10 lg:pt-6">
              {/* Owner Card */}
              <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                      Equipment Owner
                    </p>
                    <h3 className="mt-1 text-lg font-black tracking-tighter text-slate-950">
                      {listing.ownerName ?? listing.farmerName ?? "Verified Owner"}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {completedRentals} completed rentals ·{" "}
                      {listing.ownerFollowerCount ?? 0} followers
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="gap-1 border-zinc-200 bg-white text-zinc-700"
                  >
                    <BadgeCheck className="size-3.5 text-emerald-500" />
                    {listing.ownerBadge ?? "Verified"}
                  </Badge>
                </div>

                <div className="mt-4">
                  <TrustMeter score={trustScore} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    className="h-9 rounded-xl bg-slate-950 text-white hover:bg-slate-800"
                    onClick={() => void handleFollowOwner()}
                  >
                    <UserPlus className="mr-1.5 size-3.5" />
                    {followingState?.following ? "Following" : "Follow"}
                  </Button>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 rounded-xl border-zinc-200 bg-white text-slate-700 hover:bg-slate-50",
                      isSaved && "border-red-200 text-red-600 hover:bg-red-50",
                    )}
                    onClick={onToggleSaved}
                  >
                    <Heart
                      className={cn(
                        "mr-1.5 size-3.5",
                        isSaved ? "fill-current" : "",
                      )}
                    />
                    {isSaved ? "Saved" : "Save"}
                  </Button>
                </div>
              </div>

              {/* Smart Booking Engine */}
              <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                      Smart Booking Engine
                    </p>
                    <p className="mt-1 text-3xl font-black tracking-tighter text-slate-950">
                      ₹{dailyPrice.toFixed(0)}
                    </p>
                    <p className="text-xs text-slate-500">per day</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Available</p>
                    <p className="text-sm font-black text-slate-900">
                      {availableStock} unit{availableStock === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                {/* Date Picker */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-600">Rental Dates</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-11 w-full justify-start rounded-xl border-zinc-200 bg-zinc-50 text-left font-medium text-slate-900",
                          !dateRange?.from && "text-slate-400",
                        )}
                      >
                        <CalendarIcon className="mr-2 size-4 text-slate-500" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            `${format(dateRange.from, "dd MMM")} – ${format(dateRange.to, "dd MMM yyyy")}`
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
                        numberOfMonths={1}
                        disabled={[
                          { before: new Date(new Date().setHours(0, 0, 0, 0)) },
                          ...(availability?.success
                            ? availability.data.blockedDates.map((r: { from: number; to: number }) => ({
                                from: new Date(r.from),
                                to: new Date(r.to),
                              }))
                            : []),
                        ]}
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-slate-400">
                    Minimum: {minDays} day{minDays === 1 ? "" : "s"} 
                  </p>
                </div>

                {/* Price Breakdown Receipt */}
                {selectedDays > 0 && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 space-y-2.5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      Price Breakdown
                    </p>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">
                        ₹{dailyPrice.toFixed(0)} × {selectedDays} day{selectedDays === 1 ? "" : "s"}
                      </span>
                      <span className="font-medium text-slate-900">₹{pricing.baseAmount.toFixed(0)}</span>
                    </div>

                    {pricing.surgeAmount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-amber-600">
                          <Zap className="size-3.5" /> High Demand Surge (+15%)
                        </span>
                        <span className="font-semibold text-amber-600">
                          +₹{pricing.surgeAmount.toFixed(0)}
                        </span>
                      </div>
                    )}

                    {pricing.durationDiscount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Duration Discount (7+ days)</span>
                        <span className="font-semibold text-emerald-600">
                          −₹{pricing.durationDiscount.toFixed(0)}
                        </span>
                      </div>
                    )}

                    {pricing.tenureDiscount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Tenure Discount (3+ yr asset)</span>
                        <span className="font-semibold text-emerald-600">
                          −₹{pricing.tenureDiscount.toFixed(0)}
                        </span>
                      </div>
                    )}

                    {pricing.loyaltyDiscount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Loyalty Discount</span>
                        <span className="font-semibold text-emerald-600">
                          −₹{pricing.loyaltyDiscount.toFixed(0)}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-zinc-200 pt-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-slate-950">Final Total</span>
                        <span className="text-xl font-black tracking-tighter text-slate-950">
                          ₹{pricing.finalTotal.toFixed(0)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Exact amount charged to Razorpay · Held in escrow
                      </p>
                    </div>
                  </div>
                )}

                {/* Availability Warning */}
                {!isStockAvailable && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-slate-500">
                    {availability?.success && availability.data.nearestEndDate
                      ? `Available again on ${format(new Date(availability.data.nearestEndDate), "dd MMM yyyy")}`
                      : "Not available for selected dates — try a different range."}
                  </div>
                )}

                {/* Escrow Shield */}
                <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                  <ShieldCheck className="size-4 shrink-0 text-slate-600" />
                  <p className="text-xs text-slate-500">
                    Funds held in escrow — released only after return confirmation.
                  </p>
                </div>

                {/* Book Now Button */}
                <Button
                  className="h-12 w-full rounded-xl bg-slate-950 text-base font-black text-white tracking-tight hover:bg-slate-800 disabled:opacity-50"
                  disabled={
                    !dateRange?.from ||
                    !dateRange?.to ||
                    !isDurationValid ||
                    !isStockAvailable ||
                    isProcessing
                  }
                  onClick={() => void handleCheckout()}
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="size-4 animate-pulse" />
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Secure Booking
                      <ChevronRight className="size-4" />
                    </span>
                  )}
                </Button>
              </div>

              {/* Rate This Equipment — only for users with completed orders */}
              <AnimatePresence>
                {userOrderStatus?.canRate && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-[1.5rem] border border-zinc-200 bg-white p-5 space-y-3"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                      {userOrderStatus.hasRated ? "Update Your Rating" : "Rate This Equipment"}
                    </p>
                    <StarRatingInput value={ratingScore} onChange={setRatingScore} />
                    <Textarea
                      placeholder="Share your experience with this equipment..."
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      className="min-h-[80px] resize-none rounded-xl border-zinc-200 text-sm placeholder:text-slate-400"
                    />
                    <Button
                      className="h-10 w-full rounded-xl bg-slate-100 font-semibold text-slate-900 hover:bg-slate-200"
                      onClick={() => void handleRatingSubmit()}
                      disabled={isSubmittingRating || ratingScore === 0}
                    >
                      {isSubmittingRating
                        ? "Submitting..."
                        : userOrderStatus.hasRated
                        ? "Update Rating"
                        : "Submit Rating"}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
