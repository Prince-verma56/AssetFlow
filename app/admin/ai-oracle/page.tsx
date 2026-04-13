"use client";

import * as React from "react";
import { Suspense } from "react";
import { Check, ChevronsUpDown, Sparkles, TrendingUp, Wallet, ArrowRight } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import type { StatCard } from "@/config/stats.config";
import type { TableConfig } from "@/config/table.config";
import { cn } from "@/lib/utils";
import { MANDI_MARKET_OPTIONS, MANDI_STATE_OPTIONS } from "@/lib/agmarknet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  equipment: string;
  location: string;
  quantity: string;
  mandiPrice: string;
  fairPrice: string;
  buyerPrice: string;
  availableFrom: string;
  daysToAvailable: number;
  oracleAdvice: string;
  rawMandiPrice: number;
  rawFairPrice: number;
  rawQuantity: number;
};

type DashboardContext = {
  categoryId: string;
  state: string;
  city: string;
};

type DashboardPayload = {
  stats: StatCard[];
  chartData: OracleChartPoint[];
  tableRows: Array<Omit<DashboardListingRow, "daysToAvailable">>;
  processingLabel: string;
  error?: string;
  context?: DashboardContext;
};

const initialState: DashboardPayload = {
  stats: [],
  chartData: [],
  tableRows: [],
  processingLabel: "Processing Rental Data...",
};

const defaultFilters: DashboardContext = {
  categoryId: "farming",
  state: "Rajasthan",
  city: "Jaipur",
};

const RENTAL_CATEGORIES = [
  { id: "farming", label: "Farming Machinery" },
  { id: "construction", label: "Construction & Tools" },
  { id: "electronics", label: "Electronics" },
  { id: "home_outdoor", label: "Home Appliances" },
];

function getRentalCategoryLabel(categoryId: string) {
  return RENTAL_CATEGORIES.find((c) => c.id === categoryId)?.label ?? RENTAL_CATEGORIES[0]?.label ?? "Farming Machinery";
}

function getRentalCategoryIdFromLabel(label: string) {
  return RENTAL_CATEGORIES.find((c) => c.label === label)?.id ?? "farming";
}

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
    categoryId: searchParams.get("categoryId") || defaultFilters.categoryId,
    state: searchParams.get("state") || defaultFilters.state,
    city: searchParams.get("city") || defaultFilters.city,
  });

  const updateListing = useMutation(api.crud.patchListing);

  const cityOptions = React.useMemo(() => MANDI_MARKET_OPTIONS[filters.state] ?? [], [filters.state]);

  const loadDashboard = React.useCallback(async (context: DashboardContext) => {
    setIsLoading(true);
    setError(null);
    const query = new URLSearchParams({
      categoryId: context.categoryId,
      state: context.state,
      city: context.city,
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
    try {
      await updateListing({
        id: row.id as Id<"listings">,
        oraclePrice: row.rawFairPrice,
        mandiModalPrice: row.rawMandiPrice,
      });
      toast.success("Listing Updated!", {
        description: `Advisor rate: ₹${Math.round(row.rawFairPrice).toLocaleString("en-IN")}/day`,
      });
    } catch {
      toast.error("Sync failed");
    }
  };

  const listingsTableConfig: TableConfig<DashboardListingRow> = React.useMemo(() => ({
    title: "Sync Advisor to Listings",
    description: "Update your public marketplace pricing with regional rental insights.",
    searchKey: "equipment",
    searchPlaceholder: "Filter by equipment...",
    statusKey: "oracleAdvice",
    pageSize: 5,
    columns: [
      { key: "equipment", header: "Equipment", sortable: true },
      { key: "mandiPrice", header: "Market Rate", sortable: true },
      { key: "fairPrice", header: "Advisor Rate", sortable: true },
      { key: "oracleAdvice", header: "Rental Advice", type: "status", cell: (row) => renderStatusBadge(row.oracleAdvice) },
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
  }), [handleSync]);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
          <Sparkles className="size-8 text-primary" />
          AI Price Oracle
        </h1>
        <p className="text-muted-foreground font-medium">Tuesday, April 7, 2026 • Real-time Rental Analysis</p>
      </div>

      <Card className="border-none bg-primary/5 backdrop-blur-xl rounded-[2rem]">
        <CardContent className="p-8">
          <form className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 items-end" onSubmit={(e) => { e.preventDefault(); loadDashboard(filters); }}>
            <ComboboxField
              label="Asset Category"
              value={getRentalCategoryLabel(filters.categoryId)}
              options={RENTAL_CATEGORIES.map((c) => c.label)}
              onSelect={(label) => setFilters((p) => ({ ...p, categoryId: getRentalCategoryIdFromLabel(label) }))}
            />
            <ComboboxField
              label="State"
              value={filters.state}
              options={[...MANDI_STATE_OPTIONS]}
              onSelect={(state) => {
                const nextCity = (MANDI_MARKET_OPTIONS[state] ?? [""])[0] || "";
                setFilters((p) => ({ ...p, state, city: nextCity }));
              }}
            />
            <ComboboxField
              label="City/Region"
              value={filters.city}
              options={cityOptions}
              onSelect={(city) => setFilters((p) => ({ ...p, city }))}
            />
            <Button type="submit" className="h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl" disabled={isLoading}>
              {isLoading ? "Running Advisor..." : "Run Price Advisor"}
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
                    &ldquo;
                    {dashboard.tableRows[0]?.oracleAdvice === "Good Deal"
                      ? "Listings in this region are currently priced below the local average. Great moment to attract renters quickly."
                      : "Rates are trending premium versus the local average. Consider adjusting price or improving listing quality for faster bookings."}
                    &rdquo;
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
            <DataTable config={listingsTableConfig} data={dashboard.tableRows.map(r => ({ ...r, daysToAvailable: 0 }))} />
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
