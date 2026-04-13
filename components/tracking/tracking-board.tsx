"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { CalendarDays, ChevronDown, CircleDot, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TrackingBoardProps = {
  mode: "renter" | "owner";
};

type TrackingStep = {
  status: string;
  timestamp: number;
  description: string;
};

type TrackingOrder = {
  _id: string;
  title: string;
  ownerName?: string;
  renterName?: string;
  rentalStartDate?: string | number;
  rentalEndDate?: string | number;
  totalAmount: number;
  paymentStatus: string;
  trackingTimeline?: TrackingStep[];
  currentTrackingStatus?: string;
};

function formatDate(value: string | number | undefined) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString();
}

export function TrackingBoard({ mode }: TrackingBoardProps) {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const appendTrackingEvent = useMutation(api.orders.appendTrackingEvent);
  const renterOrders = useQuery(api.orders.getRenterTrackingOrders, mode === "renter" && user?.id ? { clerkId: user.id } : "skip") as
    | TrackingOrder[]
    | undefined;
  const ownerOrders = useQuery(api.orders.getOwnerTrackingOrders, mode === "owner" && user?.id ? { clerkId: user.id } : "skip") as
    | TrackingOrder[]
    | undefined;

  const orders = (mode === "renter" ? renterOrders : ownerOrders) ?? [];
  const initialOrderId = searchParams.get("orderId");
  const [expandedOrderId, setExpandedOrderId] = React.useState<string | null>(initialOrderId);

  React.useEffect(() => {
    if (initialOrderId) {
      setExpandedOrderId(initialOrderId);
    }
  }, [initialOrderId]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
          {mode === "owner" ? "Owner Tracking" : "Renter Tracking"}
        </p>
        <h1 className="text-4xl font-black tracking-tight">Real-time rental timeline</h1>
        <p className="font-medium text-muted-foreground">
          Expand any active rental to view its live step-by-step handover and return progress.
        </p>
      </div>

      {orders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <p className="text-lg font-semibold">No active tracked rentals right now</p>
            <p className="mt-2 text-sm text-muted-foreground">
              New confirmed rentals will appear here with live timeline updates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === String(order._id);
            const timeline = order.trackingTimeline ?? [];
            const hasHandover = timeline.some((step) => step.status === "Asset Handover");
            const hasInUse = timeline.some((step) => step.status === "In Use");
            const hasReturn = timeline.some((step) => step.status === "Returned");

            return (
              <Card key={String(order._id)} className="overflow-hidden shadow-sm">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setExpandedOrderId(isExpanded ? null : String(order._id))}
                >
                  <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CardTitle>{order.title}</CardTitle>
                        <Badge variant="outline">{order.currentTrackingStatus}</Badge>
                      </div>
                      <CardDescription>
                        {mode === "owner" ? `Renter: ${order.renterName}` : `Owner: ${order.ownerName}`} •{" "}
                        {formatDate(order.rentalStartDate)} to {formatDate(order.rentalEndDate)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden rounded-2xl bg-muted/40 px-3 py-2 text-sm font-medium sm:block">
                        ₹{Math.round(order.totalAmount).toLocaleString("en-IN")}
                      </div>
                      <ChevronDown className={cn("size-4 transition-transform", isExpanded ? "rotate-180" : "")} />
                    </div>
                  </CardHeader>
                </button>

                {isExpanded ? (
                  <CardContent className="grid gap-6 border-t pt-6 lg:grid-cols-[1fr_280px]">
                    <div className="relative ml-3 border-l border-border pl-6">
                      {timeline.map((step, index) => (
                        <div key={`${step.status}-${step.timestamp}-${index}`} className="relative pb-8 last:pb-0">
                          <span className="absolute -left-[1.65rem] top-1 inline-flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                            <CircleDot className="size-2.5" />
                          </span>
                          <div className="rounded-2xl bg-muted/40 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold">{step.status}</p>
                              <p className="text-xs text-muted-foreground">{new Date(step.timestamp).toLocaleString()}</p>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-3xl border bg-muted/20 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Rental summary</p>
                        <div className="mt-4 grid gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="size-4 text-primary" />
                            <span>{formatDate(order.rentalStartDate)} to {formatDate(order.rentalEndDate)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="size-4 text-primary" />
                            <span>Payment: {order.paymentStatus}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <PackageCheck className="size-4 text-primary" />
                            <span>Order #{String(order._id).slice(-8)}</span>
                          </div>
                        </div>
                      </div>

                      {mode === "owner" ? (
                        <div className="space-y-2">
                          {!hasHandover ? (
                            <Button
                              className="w-full"
                              onClick={() => void appendTrackingEvent({ orderId: order._id as Id<"orders">, eventType: "handover" })}
                            >
                              <Truck className="mr-2 size-4" />
                              Confirm Handover
                            </Button>
                          ) : null}

                          {hasHandover && !hasInUse ? (
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => void appendTrackingEvent({ orderId: order._id as Id<"orders">, eventType: "in_use" })}
                            >
                              Mark In Use
                            </Button>
                          ) : null}

                          {hasHandover && !hasReturn ? (
                            <Button
                              variant="secondary"
                              className="w-full"
                              onClick={() => void appendTrackingEvent({ orderId: order._id as Id<"orders">, eventType: "return" })}
                            >
                              Confirm Return
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
