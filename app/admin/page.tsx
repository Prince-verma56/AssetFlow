"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { Area, AreaChart, CartesianGrid, XAxis, ResponsiveContainer } from "recharts";
import { AlertTriangle, IndianRupee, Package2, Tractor, Wrench, TrendingUp, DollarSign, Clock, ChevronDown } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { IdleAssetCalculator } from "@/components/admin/idle-asset-calculator";
import { DataTable, renderStatusBadge } from "@/components/sidebar/data-table";
import type { TableConfig } from "@/config/table.config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type OwnerRow = {
  listingId: string;
  assetName: string;
  status: string;
  currentRenter: string;
  nextAvailableDate: string;
  totalEarned: string;
  rawId: string;
};

const chartConfig = {
  requests: {
    label: "Rental Requests",
    color: "hsl(142, 71%, 45%)", // Neutral green
  },
} satisfies ChartConfig;

export default function AdminPage() {
  const router = useRouter();
  const { user } = useUser();
  const [days, setDays] = React.useState<number>(30);
  const [aiBrief, setAiBrief] = React.useState<string | null>(null);
  const dashboard = useQuery(api.listings.getOwnerDashboard, user?.id ? { clerkId: user.id, days } : "skip");
  const updateListing = useMutation(api.listings.updateListing);
  const deleteListing = useMutation(api.listings.deleteListing);

  const handleMaintenance = async (listingId: string) => {
    await updateListing({ listingId: listingId as Id<"listings">, status: "maintenance" });
    toast.success("Asset moved to maintenance.");
  };

  const handleDelete = async (listingId: string) => {
    await deleteListing({ listingId: listingId as Id<"listings"> });
    toast.success("Asset deleted.");
  };

  const rows = React.useMemo<OwnerRow[]>(() => {
    if (!dashboard?.success) return [];
    return dashboard.data.rows.map((row) => ({
      listingId: row.listingId,
      rawId: row.listingId,
      assetName: row.assetName,
      status: row.status,
      currentRenter: row.currentRenter,
      nextAvailableDate: row.nextAvailableDate ? new Date(row.nextAvailableDate).toLocaleDateString() : "Available now",
      totalEarned: `₹${Math.round(row.totalEarned).toLocaleString("en-IN")}`,
    }));
  }, [dashboard]);

  const tableConfig = React.useMemo<TableConfig<OwnerRow>>(
    () => ({
      title: "Equipment Overview",
      description: "Track the current earning state and availability of each asset in your fleet.",
      searchKey: "assetName",
      searchPlaceholder: "Search assets...",
      statusKey: "status",
      pageSize: 6,
      columns: [
        { key: "assetName", header: "Asset Name", sortable: true },
        { key: "status", header: "Status", sortable: true, type: "status" as const, cell: (row: OwnerRow) => renderStatusBadge(row.status) },
        { key: "currentRenter", header: "Current Renter", sortable: true },
        { key: "nextAvailableDate", header: "Next Available Date", sortable: true },
        { key: "totalEarned", header: "Total Earned", sortable: true },
        {
          key: "rawId",
          header: "Actions",
          sortable: false,
          cell: (row: OwnerRow) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">Manage</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push("/admin/listings")}>Edit Asset</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleMaintenance(row.rawId)}>Mark for Maintenance</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleDelete(row.rawId)}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ),
        },
      ],
      initialSort: { id: "assetName", desc: false },
    }),
    [router]
  );

  React.useEffect(() => {
    if (!dashboard?.success || dashboard.data.rows.length === 0) return;

    const generateBrief = async () => {
      try {
        const hottestAsset = [...dashboard.data.rows].sort((a, b) => b.totalEarned - a.totalEarned)[0];
        const response = await fetch("/api/ai/market-intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "owner",
            assetName: hottestAsset.assetName,
            rentalCount: dashboard.data.metrics.currentlyRentedOut,
            lifetimeEarnings: dashboard.data.metrics.totalEarnings,
            recentRentals: dashboard.data.rows.slice(0, 4).map((row) => ({
              renterName: row.currentRenter,
              duration: 3,
            })),
          }),
        });

        const data = await response.json();
        setAiBrief(data.insight ?? null);
      } catch (error) {
        console.error("Failed to generate owner smart brief:", error);
      }
    };

    void generateBrief();
  }, [dashboard]);

  if (!dashboard) return null;

  if (!dashboard.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Owner dashboard unavailable</CardTitle>
          <CardDescription>{dashboard.error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const metrics = dashboard.data.metrics;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Owner Console</p>
        <h1 className="text-4xl font-black tracking-tight">Rental performance dashboard</h1>
        <p className="font-medium text-muted-foreground">
          Monitor fleet earnings, in-use assets, and requests that need your attention.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard 
          title="Total Earnings" 
          value={`₹${Math.round(metrics.totalEarnings).toLocaleString("en-IN")}`} 
          icon={<IndianRupee className="size-5 text-primary" />}
          subtitle="This month"
          trend="+12%"
        />
        <MetricCard 
          title="Active Assets" 
          value={String(metrics.activeAssets)} 
          icon={<Tractor className="size-5 text-primary" />}
          subtitle="Available to rent"
          detail={`${metrics.activeAssets - metrics.currentlyRentedOut} idle`}
        />
        <MetricCard 
          title="Currently Rented Out" 
          value={String(metrics.currentlyRentedOut)} 
          icon={<Package2 className="size-5 text-primary" />}
          subtitle="In active rentals"
          detail="Generating revenue"
        />
        <MetricCard 
          title="Pending Requests" 
          value={String(metrics.pendingRequests)} 
          icon={<AlertTriangle className="size-5 text-primary" />}
          subtitle="Awaiting action"
          detail="Respond within 24h"
        />
      </div>

      {aiBrief ? (
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Smart Brief</CardTitle>
            <CardDescription>AI demand and pricing guidance based on live owner activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-muted-foreground">{aiBrief}</p>
          </CardContent>
        </Card>
      ) : null}

      <IdleAssetCalculator />

      <Card className="border-border/70 col-span-full">
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Rental Requests Over the Last {days} Days</CardTitle>
              <CardDescription>Trend line for incoming rental activity across your assets.</CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 w-fit">
                  <Clock className="size-4" />
                  {days} Days
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDays(7)}>
                  <span className={days === 7 ? "font-semibold" : ""}>7 Days</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDays(30)}>
                  <span className={days === 30 ? "font-semibold" : ""}>30 Days</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDays(90)}>
                  <span className={days === 90 ? "font-semibold" : ""}>90 Days</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {dashboard.data.chart.every((point) => point.requests === 0) ? (
            <div className="rounded-3xl border border-dashed p-12 text-center">
              <Wrench className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-4 text-lg font-semibold">No rental requests yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                As new bookings and requests come in, your demand trend will start to populate here.
              </p>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <AreaChart data={dashboard.data.chart} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="0" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="day" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  interval={Math.floor(dashboard.data.chart.length / 10)}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="natural"
                  dataKey="requests"
                  stroke="#2d6a4f"
                  fill="#74c69d"
                  fillOpacity={0.5}
                  strokeWidth={3}
                  isAnimationActive={true}
                  animationDuration={500}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <DataTable config={tableConfig} data={rows} />
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  icon, 
  subtitle, 
  trend,
  detail 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode;
  subtitle?: string;
  trend?: string;
  detail?: string;
}) {
  return (
    <Card className="border-border/70 bg-gradient-to-br from-card to-card/50 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardDescription className="text-xs">{title}</CardDescription>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2">
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-3xl font-black tracking-tight">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-1">
              <TrendingUp className="size-3 text-green-600" />
              <span className="text-xs font-semibold text-green-600">{trend}</span>
            </div>
          )}
        </div>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );
}
