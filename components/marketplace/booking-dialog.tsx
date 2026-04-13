"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { CalendarIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useRazorpay } from "@/hooks/use-razorpay";
import { buildInvoiceUrl } from "@/lib/invoices";
import type { MarketplaceListing } from "./listing-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 2),
  });
  const [damageProtection, setDamageProtection] = React.useState(true);

  React.useEffect(() => {
    if (!open) {
      setDateRange({
        from: new Date(),
        to: addDays(new Date(), 2),
      });
      setDamageProtection(true);
    }
  }, [open]);

  if (!listing) return null;

  const rentalStart = dateRange?.from ?? new Date();
  const rentalEnd = dateRange?.to ?? rentalStart;
  const selectedDays = Math.max(1, differenceInCalendarDays(rentalEnd, rentalStart) + 1);
  const baseTotal = listing.pricePerDay * selectedDays;
  const protectionTotal = damageProtection ? selectedDays * 50 : 0;
  const total = baseTotal + protectionTotal;
  const minDays = Math.max(1, listing.minimumRentalDays ?? 1);
  const isDurationValid = selectedDays >= minDays;

  const handleCheckout = async () => {
    if (!user?.id || !user.primaryEmailAddress?.emailAddress) {
      toast.error("Please sign in before booking.");
      return;
    }

    if (!isDurationValid) {
      toast.error(`Minimum booking is ${minDays} day${minDays === 1 ? "" : "s"}.`);
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
        totalAmount: total,
        description: `Rental for ${listing.title || listing.assetCategory}`,
        deliveryAddress: listing.location,
        customer: {
          name: user.fullName || "Renter",
          email: user.primaryEmailAddress.emailAddress,
        },
      });

      const orderId = String(result.data.orderId);
      const invoiceUrl = buildInvoiceUrl({
        orderId,
        itemName: listing.title || listing.assetCategory,
        rentalStart: rentalStart.toISOString(),
        rentalEnd: rentalEnd.toISOString(),
        totalAmount: total,
      });

      await attachInvoiceUrl({
        orderId: result.data.orderId,
        invoiceUrl,
      });

      await fetch("/api/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          invoiceUrl,
          renterEmail: user.primaryEmailAddress.emailAddress,
          renterName: user.fullName || "Renter",
          itemName: listing.title || listing.assetCategory,
          rentalStart: rentalStart.toISOString(),
          rentalEnd: rentalEnd.toISOString(),
          totalAmount: total,
        }),
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
      <DialogContent className="sm:max-w-xl rounded-[2rem] border-zinc-200 bg-white shadow-2xl dark:border-border dark:bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Book {listing.title || listing.assetCategory}</DialogTitle>
          <DialogDescription>
            Choose your rental period and we&apos;ll hold the payment securely in escrow until return is confirmed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-border dark:bg-muted/40">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-foreground">{listing.location}</p>
                <p className="text-sm text-zinc-500 dark:text-muted-foreground">
                  ₹{listing.pricePerDay.toFixed(0)} per day
                </p>
              </div>
              {listing.qualityScore ? <Badge>{listing.qualityScore} Quality</Badge> : null}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Rental Dates</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-12 w-full justify-start rounded-xl border-zinc-200 bg-white text-left font-medium dark:border-border dark:bg-background",
                    !dateRange?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
                    ) : (
                      format(dateRange.from, "LLL dd, y")
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
            <p className="text-xs text-muted-foreground">Minimum rental: {minDays} day{minDays === 1 ? "" : "s"}</p>
          </div>

          <label className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-border dark:bg-muted/40">
            <div className="flex items-center gap-3">
              <Checkbox checked={damageProtection} onCheckedChange={(value) => setDamageProtection(Boolean(value))} />
              <div>
                <p className="text-sm font-semibold">Add Damage Protection</p>
                <p className="text-xs text-muted-foreground">+₹50/day for wear-and-tear coverage</p>
              </div>
            </div>
            <ShieldCheck className="size-5 text-emerald-600" />
          </label>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Base rental</span>
              <span>₹{baseTotal.toFixed(0)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Damage protection</span>
              <span>₹{protectionTotal.toFixed(0)}</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-emerald-200 pt-4 text-base font-black dark:border-emerald-900/40">
              <span>Total for {selectedDays} day{selectedDays === 1 ? "" : "s"}</span>
              <span>₹{total.toFixed(0)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 sm:justify-between">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700" disabled={!isDurationValid || isProcessing} onClick={handleCheckout}>
            Pay ₹{total.toFixed(0)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
