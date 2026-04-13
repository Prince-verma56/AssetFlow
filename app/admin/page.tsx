"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { getCropImage } from "@/lib/asset-mapping";
import type { StatCard } from "@/config/stats.config";
import type { TableConfig } from "@/config/table.config";
import { cn } from "@/lib/utils";
import { MANDI_MARKET_OPTIONS, MANDI_STATE_OPTIONS } from "@/lib/agmarknet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const defaultFilters: DashboardContext = {
  commodity: "Wheat",
  state: "Rajasthan",
  city: "Jaipur",
  quantity: 100,
  unit: "quintal",
};

const COMMODITIES = [
  "Wheat", "Mustard", "Rice", "Paddy", "Cotton", "Soybean", "Onion", 
  "Tomato", "Potato", "Maize", "Bajra", "Jowar", "Sugarcane", 
  "Groundnut", "Gram", "Tur", "Moong", "Urad", "Sunflower", 
  "Sesame", "Copra", "Jute", "Apple", "Banana"
];

function daysFromAnchor(isoDate: string) {
  const target = new Date(`${isoDate}T00:00:00.000Z`);
  const anchor = new Date(`${ANCHOR_DATE_ISO}T00:00:00.000Z`);
  const diffMs = target.getTime() - anchor.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

type ComboboxFieldProps = {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  renderOption?: (option: string) => React.ReactNode;
  renderValue?: (value: string) => React.ReactNode;
};

function ComboboxField({ label, value, options, onSelect, renderOption, renderValue }: ComboboxFieldProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between overflow-hidden">
            <span className="truncate">{value ? (renderValue ? renderValue(value) : value) : `Select ${label}`}</span>
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
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => {
                      onSelect(option);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 size-4", value === option ? "opacity-100" : "opacity-0")} />
                    {renderOption ? renderOption(option) : option}
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

export default function AdminPage() {
  const [dashboard, setDashboard] = React.useState<DashboardPayload>(initialState);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<DashboardContext>(defaultFilters);

  const cityOptions = React.useMemo(() => MANDI_MARKET_OPTIONS[filters.state] ?? [], [filters.state]);

  const loadDashboard = React.useCallback(async (context: DashboardContext) => {
    setIsLoading(true);
    setError(null);

    const startedAt = performance.now();
    const query = new URLSearchParams({
      commodity: context.commodity,
      state: context.state,
      city: context.city,
      quantity: String(context.quantity),
      unit: context.unit,
    });

    const response = await fetch(`/api/dashboard/command-center?${query.toString()}`, { cache: "no-store" });
    const payload = (await response.json()) as DashboardPayload;

    const elapsed = performance.now() - startedAt;
    const wait = Math.max(0, 1500 - elapsed);
    await new Promise((resolve) => setTimeout(resolve, wait));

    if (!response.ok) {
      setError(payload.error || "Unable to load live dashboard data.");
      setDashboard((prev) => ({ ...prev, processingLabel: payload.processingLabel || prev.processingLabel }));
      setIsLoading(false);
      return;
    }

    setDashboard(payload);
    setFilters(payload.context ?? context);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    loadDashboard(defaultFilters).catch(() => {
      setIsLoading(false);
      setError("Failed to load live dashboard data.");
    });
  }, [loadDashboard]);

  const rows = React.useMemo<DashboardListingRow[]>(
    () =>
      dashboard.tableRows.map((row) => ({
        ...row,
        daysToHarvest: daysFromAnchor(row.harvestDate),
      })),
    [dashboard.tableRows]
  );

  const listingsTableConfig: TableConfig<DashboardListingRow> = React.useMemo(
    () => ({
      title: "Equipment Overview",
      description: "Live rental intelligence for your listed equipment.",
      searchKey: "crop",
      searchPlaceholder: "Filter by equipment...",
      statusKey: "oracleAdvice",
      pageSize: 5,
      initialSort: { id: "daysToHarvest", desc: false },
      columns: [
        { 
          key: "crop", 
          header: "Equipment", 
          sortable: true,
          cell: (row) => (
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg overflow-hidden border border-zinc-100 shadow-sm shrink-0">
                <img src={getCropImage(row.crop)} alt={row.crop} className="w-full h-full object-cover" />
              </div>
              <span className="font-bold">{row.crop}</span>
            </div>
          )
        },
        { key: "location", header: "Location", sortable: true },
        { key: "quantity", header: "Qty", sortable: true },
        { key: "mandiPrice", header: "Market Rate", sortable: true },
        { key: "fairPrice", header: "Advisor Rate", sortable: true },
        {
          key: "oracleAdvice",
          header: "Rental Advice",
          sortable: true,
          type: "status",
          cell: (row) => renderStatusBadge(row.oracleAdvice),
        },
      ],
    }),
    []
  );

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadDashboard(filters);
  };

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Live Rental Filters</CardTitle>
          <CardDescription>Run the market sync and pricing advisor with typo-safe region selectors.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" onSubmit={onSubmit}>
            <ComboboxField
              label="Commodity"
              value={filters.commodity}
              options={COMMODITIES}
              onSelect={(commodity) => setFilters((prev) => ({ ...prev, commodity }))}
              renderOption={(opt) => (
                <div className="flex items-center gap-2 w-full">
                  <div className="size-6 shrink-0 rounded overflow-hidden">
                    <img src={getCropImage(opt)} className="w-full h-full object-cover" alt={opt} />
                  </div>
                  <span>{opt}</span>
                </div>
              )}
              renderValue={(val) => (
                <div className="flex items-center gap-2">
                  <div className="size-5 shrink-0 rounded overflow-hidden">
                    <img src={getCropImage(val)} className="w-full h-full object-cover" alt={val} />
                  </div>
                  <span className="truncate">{val}</span>
                </div>
              )}
            />

            <ComboboxField
              label="State"
              value={filters.state}
              options={[...MANDI_STATE_OPTIONS]}
              onSelect={(state) => {
                const nextCity = (MANDI_MARKET_OPTIONS[state] ?? [""])[0] || "";
                setFilters((prev) => ({ ...prev, state, city: nextCity }));
              }}
            />

            <ComboboxField
              label="Mandi City"
              value={filters.city}
              options={cityOptions}
              onSelect={(city) => setFilters((prev) => ({ ...prev, city }))}
            />

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (quintal)</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={filters.quantity}
                onChange={(e) => setFilters((prev) => ({ ...prev, quantity: Number(e.target.value || 0) }))}
              />
            </div>

            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Processing Rental Data..." : "Run Price Advisor"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{dashboard.processingLabel}</p>
          <DashboardSkeleton />
        </div>
      ) : null}

      {!isLoading && error ? (
        <Card className="border border-red-500/30 bg-red-500/5">
          <CardContent className="py-6">
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !error ? (
        <ClientAnimationWrapper>
          <div className="space-y-6">
            <SectionCards stats={dashboard.stats} />
            <ChartAreaInteractive data={dashboard.chartData} anchorDate={ANCHOR_DATE_ISO} />
            <DataTable config={listingsTableConfig} data={rows} />
          </div>
        </ClientAnimationWrapper>
      ) : null}
    </div>
  );
}
