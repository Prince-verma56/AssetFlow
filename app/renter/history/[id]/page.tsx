"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, Calendar, DollarSign, User, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import Image from "next/image";
import { RentalTimelineCards } from "@/components/rentals/rental-timeline";
import type { RentalTimelineStep } from "@/components/rentals/rental-timeline";

type RentalOrder = {
  _id: string;
  _creationTime: number;
  listingId?: string;
  title?: string;
  assetCategory?: string;
  location?: string;
  farmerName?: string;
  farmerImage?: string;
  buyerName?: string;
  buyerImage?: string;
  totalAmount: number;
  dynamicPriceApplied?: number;
  rentalStartDate?: string | number;
  rentalEndDate?: string | number;
  orderStatus: string;
  paymentStatus: string;
  imageUrl?: string;
  quantity?: string;
  invoiceUrl?: string;
};

function getStatusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "delivered" || status === "completed") return "default";
  if (status === "placed" || status === "escrow" || status === "shipped") return "secondary";
  if (status === "cancelled" || status === "disputed") return "destructive";
  return "outline";
}

function formatStatus(status: string) {
  if (status === "placed") return "Order Placed";
  if (status === "escrow") return "Payment in Escrow";
  if (status === "shipped") return "Out for Delivery";
  if (status === "delivered") return "Delivered";
  if (status === "completed") return "Rental Completed";
  return status;
}

function calculateRentalDays(startDate?: string | number, endDate?: string | number): number {
  if (!startDate || !endDate) return 0;
  try {
    return differenceInDays(new Date(endDate), new Date(startDate));
  } catch {
    return 0;
  }
}

export default function RenterHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  // Fetch order details
  const order = useQuery(
    api.orders.getOrderDetails,
    orderId ? { orderId: String(orderId) } : "skip"
  ) as RentalOrder | null;

  const productStats = useQuery(
    api.orders.getRentalStats,
    order?.listingId ? { listingId: order.listingId as Id<"listings"> } : "skip"
  ) as
    | {
        totalRentals: number;
        lifetimeEarnings: number;
        averageRevenue: number;
        activeRentals: number;
        invoicesIssued: number;
      }
    | undefined;

  if (!order) {
    return (
      <div className="mx-auto max-w-7xl p-8">
        <div className="flex items-center justify-center min-h-[400px] rounded-3xl border-2 border-dashed border-border/40 bg-muted/20">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground text-lg">Loading rental details...</p>
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const rentalDays = calculateRentalDays(order.rentalStartDate, order.rentalEndDate);
  const discountApplied = order.dynamicPriceApplied ? Math.round(order.dynamicPriceApplied * 100) : 0;
  const originalTotal = discountApplied > 0 ? order.totalAmount / (1 - discountApplied / 100) : order.totalAmount;
  const discountAmount = originalTotal - order.totalAmount;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/renter/rentals">
            <ArrowLeft className="size-4 mr-2" />
            Back to Rentals
          </Link>
        </Button>
        <div>
          <h1 className="text-4xl font-black tracking-tight">Booking Details</h1>
          <p className="text-muted-foreground mt-2">Order ID: {String(order._id)}</p>
        </div>
      </div>

      {/* Equipment & Owner Info */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Equipment Card */}
        <Card className="md:col-span-2 border-border/40 overflow-hidden">
          <div className="flex flex-col md:flex-row gap-4">
            {order.imageUrl && (
              <div className="relative w-full md:w-40 h-40 flex-shrink-0 bg-muted">
                <Image
                  src={order.imageUrl}
                  alt={order.title || "Equipment"}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1 p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-foreground">
                  {order.title || order.assetCategory || "Equipment"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="size-4" />
                  {order.location || "Location not specified"}
                </p>
                {order.assetCategory && (
                  <Badge variant="outline" className="mt-3">
                    {order.assetCategory}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 pt-4 border-t border-border/40">
                <Badge variant={getStatusVariant(order.orderStatus)}>
                  {formatStatus(order.orderStatus)}
                </Badge>
                <Badge variant="outline">{formatStatus(order.paymentStatus)}</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Owner Card */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="size-4" />
              Equipment Owner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {order.farmerImage && (
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted">
                  <Image
                    src={order.farmerImage}
                    alt={order.farmerName || "Owner"}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <p className="font-semibold text-sm">{order.farmerName || "Equipment Owner"}</p>
                {order.quantity && (
                  <p className="text-xs text-muted-foreground">
                    Quantity: {order.quantity}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/40 bg-zinc-50/60">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Product rental count
            </p>
            <p className="mt-2 text-3xl font-black text-zinc-900">
              {productStats?.totalRentals?.toLocaleString("en-IN") ?? "-"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              How many times this product has been rented overall
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-zinc-50/60">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Active rental cycles
            </p>
            <p className="mt-2 text-3xl font-black text-zinc-900">
              {productStats?.activeRentals?.toLocaleString("en-IN") ?? "-"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Visible asset activity right now across this equipment
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-zinc-50/60">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Invoice record
            </p>
            <p className="mt-2 text-3xl font-black text-zinc-900">
              {order.invoiceUrl ? "Ready" : "Pending"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your receipt becomes downloadable as soon as the invoice link is attached
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rental Timeline */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Rental Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Start Date */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                Rental Start
              </p>
              <p className="text-lg font-black text-blue-900 dark:text-blue-300 mt-2">
                {order.rentalStartDate
                  ? format(new Date(order.rentalStartDate), "MMM dd, yyyy")
                  : "Not set"}
              </p>
              {order.rentalStartDate && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {format(new Date(order.rentalStartDate), "hh:mm a")}
                </p>
              )}
            </div>

            {/* End Date */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                Rental End
              </p>
              <p className="text-lg font-black text-emerald-900 dark:text-emerald-300 mt-2">
                {order.rentalEndDate
                  ? format(new Date(order.rentalEndDate), "MMM dd, yyyy")
                  : "Not set"}
              </p>
              {order.rentalEndDate && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  {format(new Date(order.rentalEndDate), "hh:mm a")}
                </p>
              )}
            </div>
          </div>

          {/* Duration */}
          {rentalDays > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/40">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Total Duration
              </p>
              <p className="text-lg font-black text-foreground mt-1">{rentalDays} days</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="size-5" />
            Cost Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border border-border/40">
              <span className="text-sm font-medium">Base Price</span>
              <span className="font-semibold">₹{originalTotal.toLocaleString("en-IN")}</span>
            </div>

            {discountApplied > 0 && (
              <>
                <div className="flex justify-between items-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <span className="text-sm font-medium text-amber-900 dark:text-amber-400">
                    Discount Applied ({discountApplied}%)
                  </span>
                  <span className="font-semibold text-amber-900 dark:text-amber-400">
                    -₹{discountAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                {rentalDays >= 5 && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 px-3">
                    ✨ Long-term rental discount applied (5+ days)
                  </p>
                )}
              </>
            )}

            <div className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border-2 border-emerald-200 dark:border-emerald-800 font-bold">
              <span className="text-emerald-900 dark:text-emerald-400">Final Amount</span>
              <span className="text-xl text-emerald-900 dark:text-emerald-300">
                ₹{order.totalAmount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Tracker */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle>Order Status</CardTitle>
          <CardDescription>Track the progress of your rental</CardDescription>
        </CardHeader>
        <CardContent>
          <RentalTimelineCards currentStep={order.orderStatus as RentalTimelineStep} />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild className="flex-1" variant="outline">
          <Link href="/renter/rentals">
            <ArrowLeft className="size-4 mr-2" />
            Back to Rentals
          </Link>
        </Button>
        {order.invoiceUrl ? (
          <Button asChild className="flex-1" variant="outline">
            <a href={order.invoiceUrl} target="_blank" rel="noreferrer">
              Download Invoice
            </a>
          </Button>
        ) : null}
        <Button className="flex-1" onClick={() => window.print()}>
          Print Receipt
        </Button>
      </div>
    </div>
  );
}
