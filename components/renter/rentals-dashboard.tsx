"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { Package } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VerticalRentalCard } from "@/components/rentals/vertical-rental-card";
import { ClientAnimationWrapper } from "@/components/ui/preloader/ClientAnimationWrapper";
import { getCropImage } from "@/lib/asset-mapping";

type RentalCard = {
  _id: string;
  title: string;
  location: string;
  imageUrl?: string;
  ownerName: string;
  ownerTrustScore: number;
  ownerImage?: string;
  currentTrackingStatus: string;
  paymentStatus: string;
  razorpayPaymentId?: string;
  totalAmount: number;
  rentalStartDate?: string | number;
  rentalEndDate?: string | number;
  invoiceUrl?: string;
  assetCategory?: string;
};

function mapTrackingToDisplayStatus(status: string): string {
  if (status === "placed" || status === "pending") return "Order Placed";
  if (status === "escrow") return "Payment in Escrow";
  if (status === "shipped") return "Out for Delivery";
  if (status === "delivered") return "Delivered";
  if (status === "completed") return "Completed";
  return status;
}

function getStatusTone(status: string): "amber" | "sky" | "emerald" | "rose" | "zinc" {
  if (status === "delivered" || status === "completed") return "emerald";
  if (status === "shipped") return "sky";
  if (status === "placed" || status === "escrow") return "amber";
  if (status === "disputed" || status === "cancelled") return "rose";
  return "zinc";
}

export function RentalsDashboard() {
  const { user } = useUser();
  const rentals = useQuery(api.orders.getRenterActiveRentals, user?.id ? { clerkId: user.id } : "skip") as
    | RentalCard[]
    | undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-20">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">My Rentals</p>
        <h1 className="text-4xl font-black tracking-tight">Live rental book</h1>
        <p className="font-medium text-muted-foreground">
          Review booked equipment, rental windows, and payment status in one place.
        </p>
      </div>

      {/* Rental Cards Grid */}
      <ClientAnimationWrapper>
        {!rentals ? null : rentals.length === 0 ? (
          <div className="py-20 text-center bg-emerald-50/50 rounded-[2rem] border border-dashed border-emerald-200">
            <Package className="size-12 mx-auto text-emerald-300 mb-4" />
            <h3 className="text-lg font-bold text-emerald-900">No confirmed rentals yet</h3>
            <p className="text-emerald-600/70 mb-6">
              Once you place a rental order, it will show up here with payment and tracking details.
            </p>
            <Button asChild>
              <Link href="/marketplace">Browse equipment</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {rentals.map((order, index) => (
              <motion.div
                key={String(order._id)}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <VerticalRentalCard
                  id={String(order._id)}
                  imageUrl={order.imageUrl || getCropImage(order.assetCategory || order.title)}
                  assetTitle={order.title}
                  assetCategory={order.assetCategory}
                  renterOrOwnerName={order.ownerName}
                  renterOrOwnerAvatar={order.ownerImage}
                  location={order.location}
                  status={mapTrackingToDisplayStatus(order.currentTrackingStatus)}
                  statusTone={getStatusTone(order.currentTrackingStatus)}
                  startDate={order.rentalStartDate}
                  endDate={order.rentalEndDate}
                  totalAmount={order.totalAmount}
                  paymentStatus={order.paymentStatus}
                  role="renter"
                  historyLink={`/renter/history/${String(order._id)}`}
                />
              </motion.div>
            ))}
          </div>
        )}
      </ClientAnimationWrapper>
    </div>
  );
}
