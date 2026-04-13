"use client";

import * as React from "react";
import { Suspense } from "react";
import { Check, ChevronsUpDown, Sparkles, TrendingUp, Wallet, ArrowRight } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import type { StatCard } from "@/config/stats.config";
import type { TableConfig } from "@/config/table.config";
import { cn } from "@/lib/utils";
import { MANDI_MARKET_OPTIONS, MANDI_STATE_OPTIONS } from "@/lib/agmarknet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ClientAnimationWrapper } from "@/components/ui/preloader/ClientAnimationWrapper";
import { ChartAreaInteractive, type OracleChartPoint } from "@/components/sidebar/chart-area-interactive";
import { DashboardSkeleton } from "@/components/sidebar/dashboard-skeleton";
import { DataTable, renderStatusBadge } from "@/components/sidebar/data-table";
import { SectionCards } from "@/components/sidebar/section-cards";
import { ANCHOR_DATE_ISO } from "@/lib/time-anchor";
import { useSearchParams } from "next/navigation";

type DashboardListingRow = {
  listingId: string;
  id: string; // The actual Convex ID
  crop: string;
  location: string;
  quantity: string;
  mandiPrice: string;
  fairPrice: string;
  buyerPrice: string;
  harvestDate: string;
  daysToHarvest: number;
  oracleAdvice: string;
  rawMandiPrice: number;
  rawFairPrice: number;
  rawQuantity: number;
};

type DashboardContext = {
  commodity: string;
  state: string;
  city: string;
  quantity: number;
  unit: string;
};

type DashboardPayload = {
  stats: StatCard[];
  chartData: OracleChartPoint[];
  tableRows: Array<Omit<DashboardListingRow, "daysToHarvest">>;
  processingLabel: string;
  error?: string;
  context?: DashboardContext;
};

const initialState: DashboardPayload = {
  stats: [],
  chartData: [],
  tableRows: [],
  processingLabel: "Processing Market Data...",
};

function daysFromAnchor(isoDate: string) {
  const target = new Date(`${isoDate}T00:00:00.000Z`);
  const anchor = new Date(`${ANCHOR_DATE_ISO}T00:00:00.000Z`);
  const diffMs = target.getTime() - anchor.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function ComboboxField({ label, value, options, onSelect }: { label: string, value: string, options: string[], onSelect: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between rounded-xl h-12 border-primary/10">
            {value || `Select ${label}`}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No option found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem key={option} value={option} onSelect={() => { onSelect(option); setOpen(false); }}>
                    <Check className={cn("mr-2 size-4", value === option ? "opacity-100" : "opacity-0")} />
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function OraclePageContent() {
  const searchParams = useSearchParams();
  const [dashboard, setDashboard] = React.useState<DashboardPayload>(initialState);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<DashboardContext>({
    commodity: searchParams.get("commodity") || "Wheat",
    state: searchParams.get("state") || "Rajasthan",
    city: searchParams.get("city") || "Jaipur",
    quantity: Number(searchParams.get("quantity")) || 120,
    unit: "quintal",
  });

  const updateListing = useMutation(api.crud.patchListing);

  const cityOptions = React.useMemo(() => MANDI_MARKET_OPTIONS[filters.state] ?? [], [filters.state]);

  const loadDashboard = React.useCallback(async (context: DashboardContext) => {
    setIsLoading(true);
    setError(null);
    const query = new URLSearchParams({
      commodity: context.commodity,
      state: context.state,
      city: context.city,
      quantity: String(context.quantity),
      unit: context.unit,
    });

    const response = await fetch(`/api/dashboard/command-center?${query.toString()}`, { cache: "no-store" });
    const payload = (await response.json()) as DashboardPayload;

    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!response.ok) {
      setError(payload.error || "Unable to load live oracle data.");
      setIsLoading(false);
      return;
    }

    setDashboard(payload);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    loadDashboard(filters).catch(() => setIsLoading(false));
  }, [loadDashboard]);

  const handleSync = async (row: DashboardListingRow) => {
    const savings = (row.rawFairPrice - row.rawMandiPrice) * row.rawQuantity;
    try {
      await updateListing({
        id: row.id as any,
        oraclePrice: row.rawFairPrice,
        mandiModalPrice: row.rawMandiPrice,
      });
      toast.success("Listing Updated!", {
        description: `Middleman Savings: ₹${savings.toLocaleString("en-IN")}`,
      });
    } catch (err) {
      toast.error("Sync failed");
    }
  };

  const listingsTableConfig: TableConfig<DashboardListingRow> = React.useMemo(() => ({
    title: "Sync Oracle to Listings",
    description: "Update your public marketplace prices with AI insights.",
    searchKey: "crop",
    searchPlaceholder: "Filter by crop...",
    statusKey: "oracleAdvice",
    pageSize: 5,
    columns: [
      { key: "crop", header: "Crop", sortable: true },
      { key: "mandiPrice", header: "Mandi Rate", sortable: true },
      { key: "fairPrice", header: "AI Fair Price", sortable: true },
      { key: "oracleAdvice", header: "Advice", type: "status", cell: (row) => renderStatusBadge(row.oracleAdvice) },
      {
        key: "id",
        header: "Action",
        cell: (row) => (
          <Button size="sm" variant="ghost" className="text-primary gap-2" onClick={() => handleSync(row)}>
            Sync Price <ArrowRight className="size-3" />
          </Button>
        )
      }
    ],
  }), []);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
          <Sparkles className="size-8 text-primary" />
          AI Price Oracle
        </h1>
        <p className="text-muted-foreground font-medium">Tuesday, April 7, 2026 • Real-time Mandi Analysis</p>
      </div>

      <Card className="border-none bg-primary/5 backdrop-blur-xl rounded-[2rem]">
        <CardContent className="p-8">
          <form className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 items-end" onSubmit={(e) => { e.preventDefault(); loadDashboard(filters); }}>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Commodity</Label>
              <Input value={filters.commodity} onChange={(e) => setFilters(p => ({ ...p, commodity: e.target.value }))} className="rounded-xl h-12 border-primary/10" />
            </div>
            <ComboboxField label="State" value={filters.state} options={[...MANDI_STATE_OPTIONS]} onSelect={(s) => setFilters(p => ({ ...p, state: s }))} />
            <ComboboxField label="Mandi City" value={filters.city} options={cityOptions} onSelect={(c) => setFilters(p => ({ ...p, city: c }))} />
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quantity (q)</Label>
              <Input type="number" value={filters.quantity} onChange={(e) => setFilters(p => ({ ...p, quantity: Number(e.target.value) }))} className="rounded-xl h-12 border-primary/10" />
            </div>
            <Button type="submit" className="h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl" disabled={isLoading}>
              {isLoading ? "Running Oracle..." : "Run Live Oracle"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <DashboardSkeleton />
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <ClientAnimationWrapper>
          <div className="space-y-10">
            <SectionCards stats={dashboard.stats} />
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <ChartAreaInteractive data={dashboard.chartData} anchorDate={ANCHOR_DATE_ISO} />
              </div>
              <Card className="border-none bg-zinc-900 text-white rounded-[2rem] p-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="size-5 text-emerald-400" />
                    Market Insight
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-zinc-400 leading-relaxed italic">
                    "{dashboard.tableRows[0]?.oracleAdvice === "Sell Now" 
                      ? "Arrivals are peaking. Current prices are 8% above seasonal averages. High confidence for immediate liquidation." 
                      : "Procurement targets haven't been met. Waiting 7-10 days could yield a 500/quintal premium as supply tightens."}"
                  </p>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2 text-zinc-400">
                      <Wallet className="size-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">Potential Profit</span>
                    </div>
                    <p className="text-3xl font-black text-emerald-400">
                      ₹{dashboard.stats[2]?.value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            <DataTable config={listingsTableConfig} data={dashboard.tableRows.map(r => ({ ...r, daysToHarvest: 0 }))} />
          </div>
        </ClientAnimationWrapper>
      )}
    </div>
  );
}

export default function OraclePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <OraclePageContent />
    </Suspense>
  );
}
