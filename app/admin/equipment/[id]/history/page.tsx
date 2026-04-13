"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { ArrowLeft, BadgeIndianRupee, CalendarClock, FileText, Receipt, RotateCcw, TrendingUp, UserRound } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AiMarketBrief } from "@/components/shared/ai-market-brief";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type HistoryRow = {
  _id: string;
  renterName: string;
  renterEmail?: string;
  renterPhone?: string;
  renterAvatar?: string;
  startDate?: string | number;
  endDate?: string | number;
  status: string;
  totalAmount: number;
  paymentStatus: string;
  paymentId?: string;
  invoiceUrl?: string;
  dynamicPriceApplied?: number;
  createdAt?: number;
};

function formatDate(value?: string | number) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "MMM dd, yyyy");
}

function formatDateTime(value?: number) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "MMM dd, yyyy hh:mm a");
}

function statusTone(status: string) {
  if (status === "completed") return "default";
  if (status === "placed" || status === "shipped" || status === "delivered") return "secondary";
  if (status === "cancelled" || status === "disputed") return "destructive";
  return "outline";
}

export default function AssetLedgerPage() {
  const params = useParams();
  const listingId = params.id as string;
  const [aiInsight, setAiInsight] = React.useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = React.useState(false);

  const listing = useQuery(api.listings.getById, listingId ? { id: listingId as Id<"listings"> } : "skip") as
    | {
        title?: string;
        assetCategory?: string;
        location?: string;
        status?: string;
        totalRentals?: number;
      }
    | null
    | undefined;

  const history = useQuery(
    api.orders.getAssetHistory,
    listingId ? { listingId: listingId as Id<"listings"> } : "skip"
  ) as HistoryRow[] | undefined;

  const stats = useQuery(
    api.orders.getRentalStats,
    listingId ? { listingId: listingId as Id<"listings"> } : "skip"
  ) as
    | {
        totalRentals: number;
        lifetimeEarnings: number;
        averageRevenue: number;
        activeRentals: number;
        invoicesIssued: number;
      }
    | undefined;

  const uniqueRenters = React.useMemo(() => {
    return new Set((history ?? []).map((row) => row.renterEmail || row.renterName)).size;
  }, [history]);

  React.useEffect(() => {
    if (!history || history.length === 0) return;

    const generateInsight = async () => {
      setIsLoadingAi(true);
      try {
        const response = await fetch("/api/ai/market-intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "owner",
            assetName: listing?.title || listing?.assetCategory,
            rentalCount: stats?.totalRentals || 0,
            lifetimeEarnings: stats?.lifetimeEarnings || 0,
            recentRentals: history.slice(0, 5).map((row) => ({
              renterName: row.renterName,
              duration:
                row.startDate && row.endDate
                  ? Math.max(
                      1,
                      Math.ceil(
                        (new Date(row.endDate).getTime() - new Date(row.startDate).getTime()) / (1000 * 60 * 60 * 24)
                      )
                    )
                  : 1,
            })),
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

    void generateInsight();
  }, [history, listing, stats]);

  if (!listing) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Loading product ledger...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-20">
      <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_rgba(244,244,245,0.96)_42%,_rgba(228,228,231,0.96))] p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Button variant="ghost" size="sm" asChild className="-ml-3 w-fit text-zinc-600">
              <Link href="/admin/orders">
                <ArrowLeft className="mr-2 size-4" />
                Back to rentals
              </Link>
            </Button>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-zinc-500">Asset Invoice Ledger</p>
              <h1 className="text-4xl font-black tracking-tight text-zinc-950">
                {listing.title || listing.assetCategory}
              </h1>
              <p className="text-sm font-medium text-zinc-600">
                Full owner-side record of every rental, every renter, every invoice, and each payment event tied to this product.
              </p>
            </div>
          </div>

          <Badge variant="outline" className="w-fit border-zinc-300 px-4 py-2 text-sm capitalize text-zinc-700">
            {listing.status || "available"}
          </Badge>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={RotateCcw} label="Total rental history" value={stats?.totalRentals || 0} helper="All completed and active rental records" />
        <MetricCard icon={Receipt} label="Invoices visible" value={stats?.invoicesIssued || 0} helper="Invoice documents attached to this asset" />
        <MetricCard
          icon={BadgeIndianRupee}
          label="Lifetime earnings"
          value={`₹${(stats?.lifetimeEarnings || 0).toLocaleString("en-IN")}`}
          helper="Gross rental revenue from this asset"
        />
        <MetricCard icon={UserRound} label="Unique renters" value={uniqueRenters} helper="Distinct customers who rented this product" />
      </div>

      {aiInsight ? <AiMarketBrief insight={aiInsight} variant="owner" /> : null}
      {isLoadingAi ? (
        <div className="rounded-3xl border border-zinc-200 bg-zinc-50/80 p-5 text-sm text-zinc-500">
          Generating market intelligence for this asset...
        </div>
      ) : null}

      <Card className="border-zinc-200/80 shadow-sm">
        <CardHeader className="flex flex-col gap-2 border-b border-zinc-100 bg-zinc-50/70">
          <CardTitle className="text-xl font-black text-zinc-950">Rental and invoice history</CardTitle>
          <CardDescription>
            Owners can review every rental of this product, including who rented it, when it ran, how much it earned, and whether the invoice is attached.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-zinc-100 hover:bg-transparent">
                  <TableHead>Renter</TableHead>
                  <TableHead>Rental window</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history && history.length > 0 ? (
                  history.map((row) => (
                    <TableRow key={row._id} className="border-b border-zinc-100/80">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {row.renterAvatar ? (
                            <img src={row.renterAvatar} alt={row.renterName} className="size-10 rounded-full object-cover" />
                          ) : (
                            <div className="flex size-10 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-700">
                              {row.renterName?.charAt(0) || "R"}
                            </div>
                          )}
                          <div className="space-y-1">
                            <p className="font-semibold text-zinc-950">{row.renterName}</p>
                            <p className="text-xs text-zinc-500">{row.renterEmail || row.renterPhone || "-"}</p>
                            <p className="text-[11px] text-zinc-400">Booked {formatDateTime(row.createdAt)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-zinc-900">{formatDate(row.startDate)} to {formatDate(row.endDate)}</p>
                          <p className="text-xs text-zinc-500">Payment ID: {row.paymentId || "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusTone(row.status)} className="capitalize">
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={row.paymentStatus === "paid" ? "default" : "outline"} className="capitalize">
                            {row.paymentStatus}
                          </Badge>
                          {row.dynamicPriceApplied ? (
                            <p className="text-xs text-amber-600">Discount {(row.dynamicPriceApplied * 100).toFixed(0)}%</p>
                          ) : (
                            <p className="text-xs text-zinc-400">No discount</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.invoiceUrl ? (
                          <Button asChild size="sm" variant="outline" className="rounded-xl">
                            <a href={row.invoiceUrl} target="_blank" rel="noreferrer">
                              <FileText className="mr-2 size-4" />
                              Open
                            </a>
                          </Button>
                        ) : (
                          <span className="text-sm text-zinc-400">Not attached</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-black text-emerald-700">₹{row.totalAmount.toLocaleString("en-IN")}</p>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-zinc-500">
                      No rental history found for this product yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-zinc-200/80 bg-zinc-50/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4" />
              Current asset health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-600">
            <p>Location: <span className="font-medium text-zinc-900">{listing.location || "-"}</span></p>
            <p>Average revenue per rental: <span className="font-medium text-zinc-900">₹{(stats?.averageRevenue || 0).toLocaleString("en-IN")}</span></p>
            <p>Active rental cycles: <span className="font-medium text-zinc-900">{stats?.activeRentals || 0}</span></p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80 bg-zinc-50/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4" />
              What this page guarantees
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-600">
            <p>Owners can see the total history count for this product.</p>
            <p>Every invoice link stored on the order is visible from one ledger.</p>
            <p>Renter names, timestamps, payment records, and revenue stay grouped under the product instead of a single order card.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <Card className="border-zinc-200/80 bg-white/90 shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 pt-5">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
          <p className="text-3xl font-black tracking-tight text-zinc-950">{value}</p>
          <p className="text-xs text-zinc-500">{helper}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <Icon className="size-5 text-zinc-700" />
        </div>
      </CardContent>
    </Card>
  );
}
