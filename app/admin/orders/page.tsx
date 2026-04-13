"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/sidebar/dashboard-skeleton";
import { motion } from "framer-motion";
import {
  Package,
  Calendar,
  User,
  IndianRupee,
  CheckCircle2,
  Clock,
  Route,
  FileText,
  X,
  MapPin,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ClientAnimationWrapper } from "@/components/ui/preloader/ClientAnimationWrapper";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCropImage } from "@/lib/asset-mapping";

type SalesOrder = {
  _id: string;
  _creationTime: number;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  cropName?: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerImage?: string;
  deliveryAddress?:
    | string
    | {
        street: string;
        city: string;
        state: string;
        pincode: string;
      };
};

function getStatusTone(status: string) {
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
  return status;
}

function getAddressLabel(order: SalesOrder) {
  if (!order.deliveryAddress) return "Address unavailable";
  if (typeof order.deliveryAddress === "string") return order.deliveryAddress;
  return [
    order.deliveryAddress.street,
    order.deliveryAddress.city,
    order.deliveryAddress.state,
    order.deliveryAddress.pincode,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function SalesTrackingPage() {
  const { user, isLoaded } = useUser();
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  const sales = useQuery(api.orders.getFarmerOrders, isLoaded && user?.id ? { clerkId: user.id } : "skip");
  const updateStatus = useMutation(api.orders.updateOrderStatus);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateStatus({ orderId: orderId as any, orderStatus: newStatus as any });
      toast.success(`Order updated: ${prettyStatus(newStatus)}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const typedSales = (sales ?? []) as SalesOrder[];

  const stats = useMemo(() => {
    const active = typedSales.filter((o) => ["placed", "escrow", "shipped"].includes(o.orderStatus)).length;
    const delivered = typedSales.filter((o) => o.orderStatus === "delivered").length;
    const revenue = typedSales.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    return { active, delivered, revenue };
  }, [typedSales]);

  if (!isLoaded || sales === undefined) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 max-w-[1280px] mx-auto pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-foreground">Recent Rentals</h1>
        <p className="text-muted-foreground font-medium">Live rental pipeline with direct logistics handoff</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-none bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold text-amber-700">Active Rentals</p>
            <p className="text-3xl font-black text-amber-900">{stats.active}</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-gradient-to-r from-emerald-50 to-teal-50 shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold text-emerald-700">Delivered</p>
            <p className="text-3xl font-black text-emerald-900">{stats.delivered}</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-gradient-to-r from-sky-50 to-indigo-50 shadow-sm">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold text-sky-700">Rental Revenue</p>
            <p className="text-3xl font-black text-sky-900">₹{stats.revenue.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
      </div>

      <ClientAnimationWrapper>
        <div className="grid gap-4">
          {typedSales.map((order, index) => {
            const tone = getStatusTone(order.orderStatus || "pending");
            return (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                whileHover={{ scale: 1.01 }}
              >
                <Card className="border-none bg-white/80 backdrop-blur-lg shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <div
                    className={cn(
                      "h-1.5 w-full",
                      tone === "emerald" && "bg-emerald-500",
                      tone === "sky" && "bg-sky-500",
                      tone === "amber" && "bg-amber-500",
                      tone === "rose" && "bg-rose-500",
                      tone === "zinc" && "bg-zinc-300"
                    )}
                  />
                  <CardContent className="p-6">
                    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr_auto] lg:items-center">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                            Order #{order._id.slice(-6)}
                          </span>
                          <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-tight">
                            {prettyStatus(order.orderStatus || "pending")}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3">
                          <Image
                            src={getCropImage(order.cropName || "Crop")}
                            alt={order.cropName || "Crop"}
                            width={46}
                            height={46}
                            className="size-11 rounded-xl object-cover"
                          />
                          <h3 className="text-xl font-black text-zinc-900">{order.cropName || "Direct Farm Sale"}</h3>
                        </div>

                        <div className="grid grid-cols-1 gap-2 text-xs text-zinc-600 md:grid-cols-2">
                          <p className="flex items-center gap-1.5"><User className="size-3" />{order.buyerName || "Verified Buyer"}</p>
                          <p className="flex items-center gap-1.5"><Calendar className="size-3" />{new Date(order._creationTime).toLocaleString()}</p>
                          <p className="flex items-center gap-1.5 md:col-span-2"><MapPin className="size-3" />{getAddressLabel(order)}</p>
                        </div>
                      </div>

                      <div className="space-y-2 rounded-xl border bg-zinc-50/70 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Revenue</p>
                        <p className="text-2xl font-black text-zinc-900 flex items-center gap-0.5">
                          <IndianRupee className="size-4" />
                          {order.totalAmount.toLocaleString("en-IN")}
                        </p>
                        {order.paymentStatus === "paid" ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                            <CheckCircle2 className="size-3.5" /> Payment Settled
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-600 text-xs font-bold">
                            <Clock className="size-3.5" /> Payment Pending
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Select defaultValue={order.orderStatus || "placed"} onValueChange={(val) => handleStatusChange(order._id, val)}>
                          <SelectTrigger className="w-[180px] h-10 rounded-xl text-xs font-bold border-zinc-200">
                            <SelectValue placeholder="Update Status" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="placed">Placed</SelectItem>
                            <SelectItem value="escrow">Escrow</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button asChild variant="outline" className="w-[180px]">
                          <Link href={`/admin/logistics?orderId=${order._id}`}>
                            <Route className="mr-2 size-4" />
                            Track on Map
                          </Link>
                        </Button>

                        <Button variant="secondary" className="w-[180px]" onClick={() => setSelectedOrder(order)}>
                          <FileText className="mr-2 size-4" />
                          View More
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {typedSales.length === 0 && (
            <div className="py-20 text-center bg-emerald-50/50 rounded-[2rem] border border-dashed border-emerald-200">
              <Package className="size-12 mx-auto text-emerald-300 mb-4" />
              <h3 className="text-lg font-bold text-emerald-900">No rentals yet</h3>
              <p className="text-emerald-600/70">When renters book your equipment, the activity will appear here.</p>
            </div>
          )}
        </div>
      </ClientAnimationWrapper>

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="flex-row items-center justify-between space-y-0">
            <DialogTitle>Professional Invoice</DialogTitle>
            <Button variant="ghost" size="icon" className="size-10" onClick={() => setSelectedOrder(null)}>
              <X className="size-5" />
            </Button>
          </DialogHeader>

          {selectedOrder ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border p-3">
                <Image
                  src={getCropImage(selectedOrder.cropName || "Crop")}
                  alt={selectedOrder.cropName || "Crop"}
                  width={64}
                  height={64}
                  className="size-14 rounded-xl object-cover"
                />
                <div>
                  <p className="text-sm font-semibold">{selectedOrder.cropName || "Crop"}</p>
                  <p className="text-xs text-muted-foreground">Invoice #{selectedOrder._id.slice(-8)}</p>
                </div>
                <Badge className="ml-auto">{prettyStatus(selectedOrder.orderStatus || "pending")}</Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Buyer</p>
                  <p className="font-medium">{selectedOrder.buyerName || "Anonymous Buyer"}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.buyerEmail || "-"}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.buyerPhone || "-"}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Delivery Address</p>
                  <p className="font-medium text-sm">{getAddressLabel(selectedOrder)}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{new Date(selectedOrder._creationTime).toLocaleString()}</p>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-black text-xl">₹{selectedOrder.totalAmount.toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>Close</Button>
                <Button asChild>
                  <Link href={`/admin/logistics?orderId=${selectedOrder._id}`}>Open in Logistics Map</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
