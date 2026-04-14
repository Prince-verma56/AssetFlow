"use client";

import * as React from "react";
import { useAction, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Brain,
  CheckCircle,
  ChevronRight,
  CircleDollarSign,
  Flame,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { ASSET_CATEGORIES } from "@/lib/constants/categories";
import { MANDI_MARKET_OPTIONS, MANDI_STATE_OPTIONS } from "@/lib/agmarknet";
import { calculateDynamicPrice } from "@/lib/rental-pricing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type OracleResult = {
  fairPrice: number;
  confidence: number;
  recommendation: "sell_now" | "wait" | "negotiate";
  reasoning: string;
  forecast14: number[];
  mandiDate: string;
  mandiModalPrice: number;
  mandiMinPrice: number;
  mandiMaxPrice: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const conditionMultiplier = { "Like New": 1.12, Excellent: 1.08, Good: 1.0, Fair: 0.9 } as const;
type Condition = keyof typeof conditionMultiplier;

const recommendationConfig = {
  sell_now: {
    label: "List at Oracle Price Now",
    icon: TrendingUp,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    description: "Market conditions are favourable — list at the oracle price immediately.",
  },
  wait: {
    label: "Hold — Rates Climbing",
    icon: Activity,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    description: "Demand signals suggest better rates in the next 5-7 days.",
  },
  negotiate: {
    label: "Negotiate Strategically",
    icon: BadgeCheck,
    color: "text-slate-700",
    bg: "bg-slate-50 border-slate-200",
    description: "Moderate demand. Use the range from Mandi data as a negotiation anchor.",
  },
};

// ─── ROI Calculator ───────────────────────────────────────────────────────────

function RoiCalculator({
  purchaseCost,
  dailyRate,
  age,
}: {
  purchaseCost: number;
  dailyRate: number;
  age: number;
}) {
  if (purchaseCost <= 0 || dailyRate <= 0) return null;

  const depreciatedValue = Math.max(purchaseCost * 0.3, purchaseCost * (1 - age * 0.08));
  const rentalsNeeded = Math.ceil(purchaseCost / dailyRate);
  const annualRevenueAt60Util = dailyRate * 365 * 0.6;
  const annualRoiPercent = Math.round((annualRevenueAt60Util / purchaseCost) * 100);
  const paybackMonths = Math.ceil((purchaseCost / annualRevenueAt60Util) * 12);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-5 space-y-4">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">ROI Analysis</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Current Value", value: `₹${Math.round(depreciatedValue / 1000)}K` },
          { label: "Days to Break Even", value: `${rentalsNeeded} days` },
          { label: "Annual ROI (60% util)", value: `${annualRoiPercent}%` },
          { label: "Payback Period", value: `${paybackMonths} months` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-zinc-200 bg-white p-3 text-center">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-black tracking-tighter text-slate-950">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 14-day Forecast Chart ────────────────────────────────────────────────────

function ForecastChart({
  forecast14,
  currentPrice,
}: {
  forecast14: number[];
  currentPrice: number;
}) {
  const data = forecast14.map((price, i) => ({
    day: `D${i + 1}`,
    price: Math.round(price),
    base: Math.round(currentPrice),
  }));

  const min = Math.min(...forecast14, currentPrice) * 0.92;
  const max = Math.max(...forecast14, currentPrice) * 1.08;
  const trend = forecast14[13]! > forecast14[0]! ? "up" : "down";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            14-Day AI Price Forecast
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {trend === "up" ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <TrendingUp className="size-3" /> Rates trend upward
              </span>
            ) : (
              <span className="text-amber-600 font-semibold flex items-center gap-1">
                <TrendingDown className="size-3" /> Rates softening
              </span>
            )}
          </p>
        </div>
        <Badge
          variant="outline"
          className="gap-1 border-zinc-200 bg-white text-xs text-slate-600"
        >
          <Brain className="size-3" /> AI Forecast
        </Badge>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f172a" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              interval={2}
            />
            <YAxis
              domain={[Math.round(min), Math.round(max)]}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `₹${v}`}
              width={50}
            />
            <Tooltip
              formatter={(value: any) => [`₹${value}`, "AI Forecast"]}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                fontSize: 12,
                padding: "8px 12px",
              }}
            />
            <ReferenceLine
              y={currentPrice}
              stroke="#94a3b8"
              strokeDasharray="4 2"
              label={{ value: "Current", position: "right", fontSize: 10, fill: "#94a3b8" }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#0f172a"
              strokeWidth={2}
              fill="url(#priceGrad)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "#0f172a", fill: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Surge Simulator ─────────────────────────────────────────────────────────

function SurgeSimulator({ baseRate }: { baseRate: number }) {
  const scenarios = [
    { days: 3, views: 40, label: "3 days · Low demand" },
    { days: 7, views: 30, label: "7 days · Moderate" },
    { days: 10, views: 80, label: "10 days · High demand" },
    { days: 14, views: 120, label: "14 days · Peak surge" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
        Renter Pricing Simulator
      </p>
      <p className="text-xs text-slate-400">
        How renters see dynamic pricing based on duration and demand.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {scenarios.map((s) => {
          const p = calculateDynamicPrice(baseRate, s.days, 2, 0, s.views);
          const savingsOrSurge = p.surgeAmount - p.totalDiscount + p.surgeAmount;

          return (
            <div
              key={s.label}
              className="rounded-xl border border-zinc-200 bg-white p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">{s.label}</p>
                {s.views > 50 && (
                  <Badge className="gap-0.5 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50 py-0 h-4">
                    <Zap className="size-2.5" /> Surge
                  </Badge>
                )}
              </div>
              <p className="text-lg font-black tracking-tighter text-slate-950">
                ₹{Math.round(p.finalTotal).toLocaleString("en-IN")}
              </p>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                {p.surgeAmount > 0 && (
                  <span className="text-amber-600">+₹{Math.round(p.surgeAmount)} surge</span>
                )}
                {p.totalDiscount > 0 && (
                  <span className="text-emerald-600">−₹{Math.round(p.totalDiscount)} discounts</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OwnerOraclePage() {
  const { user } = useUser();
  const runOracle = useAction(api.actions.priceOracle.runPriceOracle);

  const listings = useQuery(
    api.listings.getListingsByFarmer,
    user?.id ? { clerkId: user.id } : "skip",
  );

  // ── Form state ──────────────────────────────────────────────────────────────
  const [selectedListingId, setSelectedListingId] = React.useState<string>("");
  const [categoryId, setCategoryId] = React.useState(ASSET_CATEGORIES[0]?.id ?? "tractors");
  const [subCategoryId, setSubCategoryId] = React.useState("");
  const [state, setState] = React.useState("Rajasthan");
  const [city, setCity] = React.useState("Jaipur");
  const [assetAge, setAssetAge] = React.useState("2");
  const [condition, setCondition] = React.useState<Condition>("Good");
  const [purchaseCost, setPurchaseCost] = React.useState("750000");
  const [currentRate, setCurrentRate] = React.useState("500");
  const [viewCount, setViewCount] = React.useState("0");

  // ── Result state ────────────────────────────────────────────────────────────
  const [result, setResult] = React.useState<OracleResult | null>(null);
  const [isRunning, setIsRunning] = React.useState(false);
  const [lastRun, setLastRun] = React.useState<Date | null>(null);

  const cityOptions = React.useMemo(() => MANDI_MARKET_OPTIONS[state] ?? [], [state]);
  const selectedCategory = React.useMemo(
    () => ASSET_CATEGORIES.find((c) => c.id === categoryId),
    [categoryId],
  );

  // ── Auto-fill from selected listing ────────────────────────────────────────
  React.useEffect(() => {
    if (!selectedListingId || !listings?.success) return;
    const listing = listings.data.find((l: any) => String(l._id) === selectedListingId);
    if (!listing) return;

    if (listing.categoryId) setCategoryId(listing.categoryId);
    if (listing.subCategoryId) setSubCategoryId(listing.subCategoryId);
    if (listing.pricePerDay) setCurrentRate(String(listing.pricePerDay));
    if (listing.viewCount) setViewCount(String(listing.viewCount));
    if (listing.purchaseYear) {
      setAssetAge(String(new Date().getFullYear() - listing.purchaseYear));
    }
    if (listing.condition) setCondition((listing.condition as Condition) ?? "Good");
    if (listing.location) {
      const parts = (listing.location as string).split(",");
      const s = parts[1]?.trim();
      const c = parts[0]?.trim();
      if (s) setState(s);
      if (c) setCity(c);
    }
  }, [selectedListingId, listings]);

  // Reset subcategory when main category changes
  React.useEffect(() => {
    setSubCategoryId("");
  }, [categoryId]);

  // Auto-set city when state changes
  React.useEffect(() => {
    const firstCity = (MANDI_MARKET_OPTIONS[state] ?? [])[0] ?? "Jaipur";
    setCity(firstCity);
  }, [state]);

  // ── Run Oracle ──────────────────────────────────────────────────────────────
  const handleRunOracle = async () => {
    const cat = ASSET_CATEGORIES.find((c) => c.id === categoryId);
    const subCat = cat?.subCategories.find((s) => s.id === subCategoryId);
    const commodity = subCat?.name ?? cat?.name ?? "Agricultural Equipment";

    setIsRunning(true);
    setResult(null);

    try {
      const data = await runOracle({
        commodity,
        categoryId,
        subCategoryId: subCategoryId || undefined,
        state,
        city,
        quantity: 1,
        unit: "unit",
      });
      setResult(data as OracleResult);
      setLastRun(new Date());
      toast.success("Oracle analysis complete!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Oracle failed. Check API key.");
    } finally {
      setIsRunning(false);
    }
  };

  // ── Computed ────────────────────────────────────────────────────────────────
  const currentDaily = Number(currentRate) || 0;
  const oracleDaily = result?.fairPrice ?? 0;
  const age = Number(assetAge) || 0;
  const cost = Number(purchaseCost) || 0;
  const delta = oracleDaily > 0 && currentDaily > 0
    ? Math.round(((oracleDaily - currentDaily) / currentDaily) * 100)
    : null;
  const condMult = conditionMultiplier[condition];
  const adjustedOracle = Math.round(oracleDaily * condMult);

  const recConfig = result ? recommendationConfig[result.recommendation] : null;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-slate-950">
            <Brain className="size-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
              AI-Powered
            </p>
            <h1 className="text-3xl font-black tracking-tighter text-slate-950 leading-none">
              Owner Price Oracle
            </h1>
          </div>
        </div>
        <p className="max-w-xl text-sm text-slate-500 ml-11">
          Enter your equipment profile and let the AI analyze live mandi data, market conditions,
          and demand trends to recommend your optimal rental price.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        {/* ── LEFT: Inputs ──────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Equipment Profile
            </p>

            {/* Select from your listings */}
            {listings?.success && listings.data.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">Auto-fill from your listing</Label>
                <Select value={selectedListingId} onValueChange={setSelectedListingId}>
                  <SelectTrigger className="h-10 rounded-xl border-zinc-200 text-sm">
                    <SelectValue placeholder="Choose a listing..." />
                  </SelectTrigger>
                  <SelectContent>
                    {listings.data.map((l: any) => (
                      <SelectItem key={String(l._id)} value={String(l._id)}>
                        {l.title ?? l.assetCategory}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600">Main Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-10 rounded-xl border-zinc-200 text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCategory && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">Sub-Category</Label>
                <Select value={subCategoryId} onValueChange={setSubCategoryId}>
                  <SelectTrigger className="h-10 rounded-xl border-zinc-200 text-sm">
                    <SelectValue placeholder="Sub-category" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCategory.subCategories.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger className="h-10 rounded-xl border-zinc-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MANDI_STATE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">City</Label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="h-10 rounded-xl border-zinc-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cityOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">Age (years)</Label>
                <Input
                  value={assetAge}
                  onChange={(e) => setAssetAge(e.target.value)}
                  className="h-10 rounded-xl border-zinc-200 text-sm"
                  inputMode="numeric"
                  placeholder="e.g. 3"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">Condition</Label>
                <Select value={condition} onValueChange={(v) => setCondition(v as Condition)}>
                  <SelectTrigger className="h-10 rounded-xl border-zinc-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["Like New", "Excellent", "Good", "Fair"] as Condition[]).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">Purchase Cost (₹)</Label>
                <Input
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value)}
                  className="h-10 rounded-xl border-zinc-200 text-sm"
                  inputMode="numeric"
                  placeholder="750000"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-600">Your Current Rate (₹/day)</Label>
                <Input
                  value={currentRate}
                  onChange={(e) => setCurrentRate(e.target.value)}
                  className="h-10 rounded-xl border-zinc-200 text-sm"
                  inputMode="numeric"
                  placeholder="500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600">
                Listing View Count{" "}
                <span className="text-slate-400">(for surge simulation)</span>
              </Label>
              <Input
                value={viewCount}
                onChange={(e) => setViewCount(e.target.value)}
                className="h-10 rounded-xl border-zinc-200 text-sm"
                inputMode="numeric"
                placeholder="0"
              />
            </div>

            <Button
              className={cn(
                "group relative h-12 w-full overflow-hidden rounded-xl font-black tracking-tight text-[15px] transition-all duration-300",
                isRunning 
                  ? "bg-slate-800 text-white" 
                  : "bg-slate-950 text-white shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30 hover:-translate-y-0.5"
              )}
              onClick={() => void handleRunOracle()}
              disabled={isRunning}
            >
              {isRunning && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[pulse_1.5s_ease-in-out_infinite]" />
              )}
              {isRunning ? (
                <span className="relative z-10 flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-amber-400" />
                  Consulting AI Oracle...
                </span>
              ) : (
                <span className="relative z-10 flex w-full items-center justify-center gap-2">
                  <Sparkles className="size-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  Run Price Oracle
                  <ArrowRight className="size-4 opacity-60 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </Button>

            {lastRun && (
              <p className="text-center text-xs text-slate-400">
                Last run: {lastRun.toLocaleTimeString("en-IN")}
              </p>
            )}
          </div>

          {/* Surge Simulator always visible */}
          {currentDaily > 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <SurgeSimulator baseRate={currentDaily} />
            </div>
          )}
        </div>

        {/* ── RIGHT: Results ────────────────────────────────────────────────── */}
        <div className="space-y-5">
          <AnimatePresence mode="wait">
            {isRunning && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-64 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50"
              >
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="relative flex size-14 items-center justify-center">
                    <div className="absolute inset-0 animate-ping rounded-full bg-slate-200" />
                    <Brain className="relative size-7 text-slate-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    Consulting live mandi data...
                  </p>
                  <p className="text-xs text-slate-400">
                    Gemini 2.0 Flash is analyzing market conditions for your equipment
                  </p>
                </div>
              </motion.div>
            )}

            {result && !isRunning && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-5"
              >
                {/* ── Oracle Price Hero ──────────────────────────────────────── */}
                <div className="rounded-2xl border border-zinc-200 bg-slate-950 p-6 text-white">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                        AI Oracle Recommendation
                      </p>
                      <div className="mt-2 flex items-end gap-3">
                        <p className="text-6xl font-black tracking-tighter">
                          ₹{adjustedOracle.toLocaleString("en-IN")}
                        </p>
                        <p className="mb-1 text-sm text-slate-400">/ day</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        Base AI rate ₹{oracleDaily} · adjusted for {condition} condition ×
                        {condMult}
                      </p>
                    </div>

                    <div className="space-y-3 text-right">
                      {delta !== null && (
                        <div>
                          <p className="text-xs text-slate-400">vs. your current rate</p>
                          <p
                            className={cn(
                              "text-2xl font-black tracking-tighter",
                              delta > 0 ? "text-emerald-400" : "text-red-400",
                            )}
                          >
                            {delta > 0 ? "+" : ""}
                            {delta}%
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-slate-400">AI Confidence</p>
                        <div className="flex items-center gap-2 justify-end">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-700">
                            <div
                              className="h-full rounded-full bg-emerald-400"
                              style={{ width: `${result.confidence}%` }}
                            />
                          </div>
                          <p className="text-sm font-bold text-white">{result.confidence}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Recommendation Banner ──────────────────────────────────── */}
                {recConfig && (
                  <div
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-4",
                      recConfig.bg,
                    )}
                  >
                    <recConfig.icon className={cn("mt-0.5 size-5 shrink-0", recConfig.color)} />
                    <div>
                      <p className={cn("font-bold text-sm", recConfig.color)}>
                        {recConfig.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{recConfig.description}</p>
                    </div>
                  </div>
                )}

                {/* ── AI Reasoning ───────────────────────────────────────────── */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-slate-600" />
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                      AI Market Analysis
                    </p>
                  </div>
                  <p className="text-sm leading-7 text-slate-700">{result.reasoning}</p>

                  {/* Mandi Data */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { label: "Mandi Min", value: `₹${result.mandiMinPrice}` },
                      { label: "Mandi Modal", value: `₹${result.mandiModalPrice}` },
                      { label: "Mandi Max", value: `₹${result.mandiMaxPrice}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl bg-zinc-50 border border-zinc-200 p-3 text-center">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
                        <p className="mt-0.5 text-base font-black text-slate-900">{value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 text-right">
                    Mandi data as of {result.mandiDate}
                  </p>
                </div>

                {/* ── 14-Day Chart ───────────────────────────────────────────── */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <ForecastChart
                    forecast14={result.forecast14}
                    currentPrice={adjustedOracle}
                  />
                </div>

                {/* ── ROI Calculator ─────────────────────────────────────────── */}
                {cost > 0 && (
                  <RoiCalculator
                    purchaseCost={cost}
                    dailyRate={adjustedOracle}
                    age={age}
                  />
                )}

                {/* ── Dynamic Pricing for Renters ────────────────────────────── */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                  <SurgeSimulator baseRate={adjustedOracle} />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl border-zinc-200 font-semibold text-slate-700"
                    onClick={() => void handleRunOracle()}
                  >
                    <RefreshCw className="mr-2 size-4" />
                    Re-run Oracle
                  </Button>
                  <Button
                    className="flex-1 h-11 rounded-xl bg-slate-950 font-black text-white hover:bg-slate-800"
                    onClick={() => {
                      setCurrentRate(String(adjustedOracle));
                      toast.success("Optimal rate filled into form.");
                    }}
                  >
                    <CheckCircle className="mr-2 size-4" />
                    Use Oracle Price
                    <ChevronRight className="ml-1 size-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {!result && !isRunning && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative flex h-72 flex-col items-center justify-center gap-5 rounded-[2rem] border border-zinc-200/60 bg-gradient-to-br from-white via-zinc-50/50 to-zinc-100/50 text-center shadow-sm overflow-hidden"
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.04)_0%,transparent_70%)] opacity-0 transition-opacity duration-1000 group-hover:opacity-100" />
                
                <div className="relative flex size-16 items-center justify-center rounded-2xl border border-zinc-100 bg-white shadow-xl shadow-amber-500/5 ring-4 ring-zinc-50 transition-transform duration-500 group-hover:scale-105">
                  <Brain className="size-8 text-amber-500/90 drop-shadow-sm" />
                </div>
                
                <div className="relative z-10 space-y-1.5">
                  <p className="text-[17px] font-black tracking-tighter text-slate-900">
                    Oracle Ready & Waiting
                  </p>
                  <p className="text-xs text-slate-500 max-w-[260px] mx-auto leading-relaxed">
                    Fill in your equipment profile and let the AI analyze live mandi data to simulate optimal pricing.
                  </p>
                </div>
                
                <div className="relative z-10 flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50/80 px-3 py-1.5 text-[10px] font-bold tracking-wide uppercase text-amber-600 shadow-sm">
                  <Brain className="size-3 fill-amber-500" />
                  Powered by Gemini 2.0 Flash
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
