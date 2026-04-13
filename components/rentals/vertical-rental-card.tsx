"use client";

import Link from "next/link";
import Image from "next/image";
import { format, differenceInDays } from "date-fns";
import { Clock, MapPin, Truck, Eye } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type VerticalRentalCardProps = {
  id: string;
  imageUrl?: string;
  assetTitle: string;
  assetCategory?: string;
  renterOrOwnerName: string;
  renterOrOwnerAvatar?: string;
  location: string;
  status: string;
  statusTone?: "amber" | "sky" | "emerald" | "rose" | "zinc";
  startDate?: string | number;
  endDate?: string | number;
  totalAmount: number;
  paymentStatus?: string;
  // Owner-specific
  onStatusChange?: (newStatus: string) => Promise<void>;
  historyLink?: string;
  // Renter-specific
  role?: "owner" | "renter";
};

export function VerticalRentalCard({
  id,
  imageUrl,
  assetTitle,
  assetCategory,
  renterOrOwnerName,
  renterOrOwnerAvatar,
  location,
  status,
  statusTone = "zinc",
  startDate,
  endDate,
  totalAmount,
  paymentStatus,
  onStatusChange,
  historyLink,
  role = "owner",
}: VerticalRentalCardProps) {
  const isOwner = role === "owner";
  const rentalDays =
    startDate && endDate
      ? differenceInDays(new Date(endDate), new Date(startDate)) + 1
      : 0;

  const statusColors = {
    amber: "bg-amber-100 text-amber-900 border-amber-200",
    sky: "bg-sky-100 text-sky-900 border-sky-200",
    emerald: "bg-emerald-100 text-emerald-900 border-emerald-200",
    rose: "bg-rose-100 text-rose-900 border-rose-200",
    zinc: "bg-zinc-100 text-zinc-900 border-zinc-200",
  };

  const topLineColors = {
    amber: "bg-amber-500",
    sky: "bg-sky-500",
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    zinc: "bg-zinc-300",
  };

  return (
    <Card className="overflow-hidden border-border/40 hover:shadow-lg transition-all duration-300">
      {/* Top indicator line */}
      <div className={cn("h-1.5 w-full", topLineColors[statusTone])} />

      {/* Image Section - aspect-video */}
      <div className={`relative aspect-video overflow-hidden bg-muted`}>
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={assetTitle}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}
        {!imageUrl && (
          <div className="w-full h-full bg-gradient-to-br from-zinc-200 to-zinc-300 flex items-center justify-center">
            <p className="text-zinc-500 text-sm font-semibold">{assetCategory}</p>
          </div>
        )}

        {/* Status Badge - top right */}
        <div className="absolute top-3 right-3">
          <Badge className={cn("backdrop-blur-md border", statusColors[statusTone])}>
            {status}
          </Badge>
        </div>

        {/* Order ID - top left */}
        <div className="absolute top-3 left-3">
          <div className={cn("px-3 py-1.5 rounded-full text-xs font-bold bg-black/40 text-white backdrop-blur-md")}>
            #{id.slice(-6)}
          </div>
        </div>
      </div>

      {/* Body Section */}
      <CardContent className="p-4 space-y-4">
        {/* Asset Title */}
        <h3 className="text-lg font-semibold text-zinc-900 line-clamp-2">
          {assetTitle}
        </h3>

        {/* Renter/Owner Info */}
        <div className="flex items-center gap-3 pb-3 border-b border-border/40">
          {renterOrOwnerAvatar ? (
            <img
              src={renterOrOwnerAvatar}
              alt={renterOrOwnerName}
              className="size-10 rounded-full object-cover"
            />
          ) : (
            <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700">
              {renterOrOwnerName?.charAt(0) || "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate">
              {renterOrOwnerName}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="size-3 flex-shrink-0" />
              {location}
            </p>
          </div>
        </div>

        {/* Dates */}
        <div className="text-sm space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Rental Period
          </p>
          <p className="font-medium text-zinc-900">
            {startDate ? format(new Date(startDate), "MMM dd") : "N/A"} →{" "}
            {endDate ? format(new Date(endDate), "MMM dd") : "N/A"}
          </p>
          {rentalDays > 0 && (
            <p className="text-xs text-muted-foreground">
              {rentalDays} day{rentalDays !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Revenue/Amount - highlighted */}
        <div className={cn("rounded-xl p-3 border", statusColors[statusTone])}>
          <p className="text-xs font-bold uppercase tracking-wide opacity-70 mb-1">
            {isOwner ? "Revenue" : "Total Amount"}
          </p>
          <p className="text-xl font-black">₹{totalAmount.toLocaleString("en-IN")}</p>
          {paymentStatus && (
            <p className="text-xs font-semibold mt-1 opacity-70">
              {paymentStatus === "paid" ? "✓ Paid" : "⏳ Pending"}
            </p>
          )}
        </div>

        {/* Actions Grid */}
        {isOwner && onStatusChange && (
          <div className="grid grid-cols-2 gap-2">
            <Select defaultValue={status} onValueChange={onStatusChange}>
              <SelectTrigger className="text-xs font-bold rounded-lg h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="placed">Placed</SelectItem>
                <SelectItem value="escrow">Escrow</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Link href={`/admin/logistics?orderId=${id}`}>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold rounded-lg gap-1"
              >
                <Truck className="size-3" />
                Map
              </Button>
            </Link>
          </div>
        )}
      </CardContent>

      {/* Footer - Full Width Button */}
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full rounded-lg gap-2" variant="default">
          <Link href={historyLink || "#"}>
            <Clock className="size-4" />
            {isOwner ? "View Full History" : "View Booking History"}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
