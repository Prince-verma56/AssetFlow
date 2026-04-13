"use client";

import React, { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Package, Receipt, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { VerticalRentalCard } from "@/components/rentals/vertical-rental-card";
import { DashboardSkeleton } from "@/components/sidebar/dashboard-skeleton";
import { ClientAnimationWrapper } from "@/components/ui/preloader/ClientAnimationWrapper";
import { Card, CardContent } from "@/components/ui/card";
import { getCropImage } from "@/lib/asset-mapping";

type SalesOrder = {
  _id: string;
  listingId: string;
  _creationTime: number;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  title?: string;
  assetCategory?: string;
  renterName?: string;
  renterEmail?: string;
  renterPhone?: string;
  renterImage?: string;
  rentalStartDate?: string | number;
  rentalEndDate?: string | number;
  location?: string;
};

type OrderStatus =
  | "pending"
  | "escrow"
  | "placed"
  | "shipped"
  | "delivered"
  | "disputed"
  | "completed"
  | "cancelled";

function getStatusTone(status: string): "amber" | "sky" | "emerald" | "rose" | "zinc" {
  if (status === "delivered" || status === "completed") return "emerald";
  if (status === "shipped") return "sky";
  if (status === "placed" || status === "escrow") return "amber";
  if (status === "disputed" || status === "cancelled") return "rose";
  return "zinc";
}

function prettyStatus(status: string) {
  if (status === "placed") return "Order Placed";
  if (status === "escrow") return "Payment in Escrow";
  if (status === "shipped") return "Out for Delivery";
  if (status === "delivered") return "Delivered";
  if (status === "completed") return "Completed";
  return status;
}

export default function SalesTrackingPage() {
  const { user, isLoaded } = useUser();
  const sales = useQuery(api.orders.getFarmerOrders, isLoaded && user?.id ? { clerkId: user.id } : "skip");
  const updateStatus = useMutation(api.orders.updateOrderStatus);

  const typedSales = (sales ?? []) as SalesOrder[];

  const stats = useMemo(() => {
    const active = typedSales.filter((order) =>
      ["placed", "escrow", "shipped", "delivered"].includes(order.orderStatus)
    ).length;
    const completed = typedSales.filter((order) => order.orderStatus === "completed").length;
    const revenue = typedSales.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const paidInvoices = typedSales.filter((order) => order.paymentStatus === "paid").length;

    return { active, completed, revenue, paidInvoices };
  }, [typedSales]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateStatus({ orderId: orderId as Id<"orders">, orderStatus: newStatus as OrderStatus });
      toast.success(`Rental updated: ${prettyStatus(newStatus)}`);
    } catch {
      toast.error("Failed to update rental status");
    }
  };

  if (!isLoaded || sales === undefined) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-20">
      <section className="overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_rgba(244,244,245,0.98)_48%,_rgba(228,228,231,0.92))] p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-zinc-500">Rental Operations</p>
            <h1 className="text-4xl font-black tracking-tight text-zinc-950">Complete product rental history, invoices, and live status</h1>
            <p className="max-w-2xl text-sm font-medium leading-6 text-zinc-600">
              Review every rental tied to your inventory, see who booked each asset and when, and jump into the full invoice ledger for any product.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Portfolio Revenue</p>
            <p className="mt-1 text-3xl font-black tracking-tight text-zinc-950">₹{stats.revenue.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <StatCard
          icon={Package}
          label="Active rentals"
          value={stats.active}
          tone="amber"
          helper="Running, handover, or awaiting closeout"
        />
        <StatCard
          icon={Receipt}
          label="Paid invoices"
          value={stats.paidInvoices}
          tone="zinc"
          helper="Orders with captured payment records"
        />
        <StatCard
          icon={WalletCards}
          label="Completed cycles"
          value={stats.completed}
          tone="emerald"
          helper="Assets returned and closed successfully"
        />
        <StatCard
          icon={Receipt}
          label="All rental records"
          value={typedSales.length}
          tone="sky"
          helper="Every order visible in your owner workspace"
        />
      </div>

      <ClientAnimationWrapper>
        {typedSales.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-zinc-50/80 py-20 text-center">
            <Package className="mx-auto mb-4 size-12 text-zinc-400" />
            <h3 className="text-lg font-bold text-zinc-900">No rentals yet</h3>
            <p className="text-sm text-zinc-500">Your booked equipment will appear here with status controls and history access.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {typedSales.map((order, index) => (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, scale: 0.97, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.22 }}
              >
                <VerticalRentalCard
                  id={String(order._id)}
                  imageUrl={getCropImage(order.assetCategory || "Equipment")}
                  assetTitle={order.title || order.assetCategory || "Equipment"}
                  assetCategory={order.assetCategory}
                  renterOrOwnerName={order.renterName || "Verified Renter"}
                  renterOrOwnerAvatar={order.renterImage}
                  location={order.location || "Unknown location"}
                  status={prettyStatus(order.orderStatus || "pending")}
                  statusTone={getStatusTone(order.orderStatus || "pending")}
                  startDate={order.rentalStartDate}
                  endDate={order.rentalEndDate}
                  totalAmount={order.totalAmount}
                  paymentStatus={order.paymentStatus}
                  role="owner"
                  onStatusChange={(newStatus) => handleStatusChange(String(order._id), newStatus)}
                  historyLink={`/admin/equipment/${String(order.listingId)}/history`}
                />
              </motion.div>
            ))}
          </div>
        )}
      </ClientAnimationWrapper>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  helper: string;
  tone: "amber" | "emerald" | "sky" | "zinc";
}) {
  const toneClasses = {
    amber: "from-amber-50 to-orange-50 text-amber-900",
    emerald: "from-emerald-50 to-lime-50 text-emerald-900",
    sky: "from-sky-50 to-slate-100 text-sky-950",
    zinc: "from-zinc-50 to-zinc-100 text-zinc-900",
  };

  return (
    <Card className={`border-none bg-gradient-to-br shadow-sm ${toneClasses[tone]}`}>
      <CardContent className="flex items-start justify-between gap-4 pt-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">{label}</p>
          <p className="text-3xl font-black">{value.toLocaleString("en-IN")}</p>
          <p className="text-xs font-medium opacity-70">{helper}</p>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/70 p-3">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
