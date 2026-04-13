"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { Download, PackageCheck, ShieldCheck } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { ListingMedia } from "@/components/listings/listing-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RenterOrdersPage() {
  const { user } = useUser();
  const releaseEscrow = useMutation(api.orders.releaseEscrow);
  const orders = useQuery(api.orders.getRenterOrdersDetailed, user?.id ? { clerkId: user.id } : "skip");

  const activeOrders = React.useMemo(() => (orders ?? []).filter((order) => order.status === "escrow"), [orders]);
  const pastOrders = React.useMemo(() => (orders ?? []).filter((order) => order.status !== "escrow"), [orders]);

  const confirmReturn = async (orderId: Id<"orders">) => {
    await releaseEscrow({ orderId, buyerConfirmed: true });
  };

  const renderOrders = (title: string, items: NonNullable<typeof orders>) => (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">{title}</h2>
        <Badge variant="outline">{items.length}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((order) => (
          <Card key={String(order._id)} className="overflow-hidden border-zinc-200 bg-white shadow-sm dark:border-border dark:bg-card">
            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <div className="relative h-full min-h-[180px]">
                <ListingMedia
                  imageUrl={order.imageUrl}
                  alt={order.title}
                  title={order.title}
                  subtitle={order.location}
                  sizes="180px"
                />
              </div>
              <div className="p-5">
                <CardHeader className="p-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{order.title}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{order.location}</p>
                    </div>
                    <Badge variant={order.status === "escrow" ? "default" : "secondary"}>{order.status}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-0 pt-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Order ID</p>
                      <p className="font-semibold">#{String(order._id).slice(-8)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Paid</p>
                      <p className="font-semibold">₹{order.totalAmount.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Rental Dates</p>
                      <p className="font-semibold">
                        {order.rentalStartDate ? new Date(order.rentalStartDate).toLocaleDateString() : "-"} to {" "}
                        {order.rentalEndDate ? new Date(order.rentalEndDate).toLocaleDateString() : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Owner</p>
                      <p className="font-semibold">{order.ownerName}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild variant="outline" className="flex-1 rounded-xl">
                      <a href={order.invoiceUrl ?? "#"} target="_blank" rel="noreferrer">
                        <Download className="mr-2 size-4" />
                        Download Invoice
                      </a>
                    </Button>

                    {order.status === "escrow" ? (
                      <Button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={() => void confirmReturn(order._id)}>
                        <PackageCheck className="mr-2 size-4" />
                        Confirm Return
                      </Button>
                    ) : (
                      <Button variant="secondary" className="flex-1 rounded-xl" disabled>
                        <ShieldCheck className="mr-2 size-4" />
                        Escrow Released
                      </Button>
                    )}
                  </div>
                </CardContent>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-6">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">Renter Orders</p>
        <h1 className="text-4xl font-black tracking-tight">Track Rentals & Invoices</h1>
        <p className="font-medium text-muted-foreground">Monitor active escrows, download invoices, and confirm returns.</p>
      </div>

      {renderOrders("Active Rentals", activeOrders)}
      {renderOrders("Past Rentals", pastOrders)}
    </div>
  );
}
