"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, Filter } from "lucide-react";
import type { StatCard } from "@/config/stats.config";
import { getCropImage } from "@/lib/asset-mapping";
import { cn } from "@/lib/utils";
import { MANDI_MARKET_OPTIONS, MANDI_STATE_OPTIONS } from "@/lib/agmarknet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ClientAnimationWrapper } from "@/components/ui/preloader/ClientAnimationWrapper";
import { DashboardSkeleton } from "@/components/sidebar/dashboard-skeleton";
import { SectionCards } from "@/components/sidebar/section-cards";
import { ProductGrid } from "@/components/marketplace/product-grid";
import { type MarketplaceProduct } from "@/components/marketplace/types";
import { ANCHOR_DATE_ISO } from "@/lib/time-anchor";

type MarketplacePayload = {
  anchorDateLabel: string;
  commodity: string;
  state: string;
  city: string;
  modalPricePerQuintal: number;
  marketSource: "live" | "fallback";
  products: MarketplaceProduct[];
};

const initialFilters = {
  commodity: "All",
  state: "All",
  city: "All",
};

const COMMODITIES = [
  "All", "Wheat", "Mustard", "Rice", "Paddy", "Cotton", "Soybean", "Onion", 
  "Tomato", "Potato", "Maize", "Bajra", "Jowar", "Sugarcane", 
  "Groundnut", "Gram", "Tur", "Moong", "Urad", "Sunflower", 
  "Sesame", "Copra", "Jute", "Apple", "Banana"
];

type ComboboxFieldProps = {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  icon?: React.ReactNode;
  renderOption?: (option: string) => React.ReactNode;
  renderValue?: (value: string) => React.ReactNode;
};

function ComboboxField({ label, value, options, onSelect, icon, renderOption, renderValue }: ComboboxFieldProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-wider text-emerald-900/50 flex items-center gap-1.5">
        {icon}
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between border-emerald-900/10 bg-white/50 backdrop-blur-sm hover:bg-white hover:border-emerald-900/20 transition-all rounded-xl h-12 overflow-hidden">
            <span className="truncate">{value ? (renderValue ? renderValue(value) : value) : `Select ${label}`}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0" align="start">
          <Command className="rounded-xl">
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

export default function MarketplacePage() {
  const [filters, setFilters] = React.useState(initialFilters);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [payload, setPayload] = React.useState<MarketplacePayload | null>(null);

  const cityOptions = React.useMemo(() => {
    if (filters.state === "All") return ["All"];
    return ["All", ...(MANDI_MARKET_OPTIONS[filters.state] ?? [])];
  }, [filters.state]);

  const load = React.useCallback(async (currentFilters: typeof filters) => {
    setLoading(true);
    setError(null);
    const startedAt = performance.now();

    const params = new URLSearchParams(currentFilters);
    const response = await fetch(`/api/marketplace/discovery?${params.toString()}`, { cache: "no-store" });
    const data = (await response.json()) as MarketplacePayload & { error?: string };

    const elapsed = performance.now() - startedAt;
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, 1500 - elapsed)));

    if (!response.ok) {
      setError(data.error || "Failed to load marketplace data.");
      setLoading(false);
      return;
    }

    setPayload(data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load(initialFilters).catch(() => {
      setLoading(false);
      setError("Failed to load marketplace data.");
    });
  }, [load]);

  const stats: StatCard[] = React.useMemo(() => {
    if (!payload) return [];
    const avgDeal =
      payload.products.length > 0
        ? payload.products.reduce((sum, item) => sum + item.buyerPricePerKg, 0) / payload.products.length
        : 0;
    const avgMandiPerKg = payload.modalPricePerQuintal / 100;
    const belowPercent = avgMandiPerKg > 0 ? Math.max(0, ((avgMandiPerKg - avgDeal) / avgMandiPerKg) * 100) : 0;

    return [
      {
        id: "live-mandi",
        title: "Market Rental Context",
        value: `₹${payload.modalPricePerQuintal.toLocaleString("en-IN")}/quintal`,
        delta: payload.commodity === "All" ? "Global" : payload.marketSource === "live" ? "Live" : "Fallback",
        trend: payload.commodity === "All" ? "neutral" : payload.marketSource === "live" ? "up" : "neutral",
        subtitle: `${payload.city}, ${payload.state}`,
        livePulse: payload.marketSource === "live",
        asOfLabel: `As of ${payload.anchorDateLabel}`,
        icon: "Activity",
      },
      {
        id: "deals",
        title: "Available Equipment",
        value: `${payload.products.length}`,
        delta: `${belowPercent.toFixed(1)}%`,
        trend: "up",
        subtitle: "below market average",
        icon: "Sparkles",
      },
      {
        id: "avg-price",
        title: "Avg Rental Rate",
        value: `₹${avgDeal.toFixed(2)}/kg`,
        delta: "Marketplace view",
        trend: "neutral",
        subtitle: "AI-ranked listings",
        icon: "Wallet",
      },
    ];
  }, [payload]);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-foreground">Equipment Marketplace</h1>
        <p className="font-medium text-zinc-500 dark:text-muted-foreground">Tuesday, April 7, 2026 • AI-ranked equipment listings</p>
      </div>

      <Card className="border-none bg-emerald-50/50 backdrop-blur-xl shadow-sm rounded-[2rem] overflow-hidden">
        <CardContent className="p-8">
          <form
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 items-end"
            onSubmit={(event) => {
              event.preventDefault();
              load(filters).catch(() => null);
            }}
          >
            <ComboboxField
              label="Commodity"
              value={filters.commodity}
              options={COMMODITIES}
              icon={<Search className="size-3.5" />}
              onSelect={(commodity) => setFilters((prev) => ({ ...prev, commodity }))}
              renderOption={(opt) => (
                <div className="flex items-center gap-2 w-full">
                  <div className="size-6 shrink-0 rounded overflow-hidden flex items-center justify-center bg-zinc-100">
                    {opt === "All" ? <Search className="size-3 text-zinc-400" /> : <img src={getCropImage(opt)} className="w-full h-full object-cover" alt={opt} />}
                  </div>
                  <span className={opt === "All" ? "font-bold text-zinc-900" : ""}>{opt}</span>
                </div>
              )}
              renderValue={(val) => (
                <div className="flex items-center gap-2">
                  <div className="size-5 shrink-0 rounded overflow-hidden flex items-center justify-center bg-zinc-100">
                    {val === "All" ? <Search className="size-2.5 text-zinc-400" /> : <img src={getCropImage(val)} className="w-full h-full object-cover" alt={val} />}
                  </div>
                  <span className="truncate">{val}</span>
                </div>
              )}
            />

            <ComboboxField
              label="State"
              value={filters.state}
              options={["All", ...MANDI_STATE_OPTIONS]}
              onSelect={(state) => {
                let nextCity = "All";
                if (state !== "All") {
                  nextCity = (MANDI_MARKET_OPTIONS[state] ?? ["All"])[0] || "All";
                }
                setFilters((prev) => ({ ...prev, state, city: nextCity }));
              }}
              icon={<Filter className="size-3.5" />}
            />

            <ComboboxField
              label="Mandi City"
              value={filters.city}
              options={cityOptions}
              onSelect={(city) => setFilters((prev) => ({ ...prev, city }))}
              icon={<Filter className="size-3.5" />}
            />

            <Button type="submit" className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98]" disabled={loading}>
              {loading ? "Analyzing..." : "Refresh Discovery"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="size-2 bg-emerald-500 rounded-full animate-pulse" />
            <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Processing Market Data...</p>
          </div>
          <DashboardSkeleton />
        </div>
      )}

      {!loading && error && (
        <Card className="border-none bg-red-50 shadow-sm rounded-2xl">
          <CardContent className="py-12 text-center">
            <p className="text-red-600 font-bold">{error}</p>
            <Button variant="ghost" onClick={() => load(filters)} className="mt-4 text-red-600 hover:bg-red-100">Try Again</Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && payload && (
        <ClientAnimationWrapper>
          <div className="space-y-10">
            <SectionCards stats={stats} />
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-foreground">Live Equipment Listings</h2>
                <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 font-bold">
                  {payload.products.length} Items Found
                </Badge>
              </div>
              <ProductGrid products={payload.products} />
            </div>
          </div>
        </ClientAnimationWrapper>
      )}
    </div>
  );
}
