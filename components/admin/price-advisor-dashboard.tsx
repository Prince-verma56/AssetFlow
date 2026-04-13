"use client";

import * as React from "react";
import { useDeferredValue } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useQuery } from "convex/react";
import { ArrowUpRight, IndianRupee, Layers3, Sparkles } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { ASSET_CATEGORIES } from "@/lib/constants/categories";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const chartConfig = {
  demand: {
    label: "Projected Demand",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const conditionMultiplier = {
  excellent: 1.08,
  good: 1,
  fair: 0.9,
} as const;

export function PriceAdvisorDashboard() {
  const [categoryId, setCategoryId] = React.useState(ASSET_CATEGORIES[0]?.id ?? "tractors");
  const [assetAge, setAssetAge] = React.useState("2");
  const [condition, setCondition] = React.useState<keyof typeof conditionMultiplier>("good");
  const [baseCost, setBaseCost] = React.useState("750000");

  const deferredCategoryId = useDeferredValue(categoryId);
  const comparables = useQuery(api.listings.listAvailable, {
    categoryId: deferredCategoryId,
    limit: 12,
  });

  const comparableRates = React.useMemo(
    () => (comparables ?? []).map((item) => item.pricePerDay).filter((value) => Number.isFinite(value) && value > 0),
    [comparables]
  );

  const marketAverage = comparableRates.length
    ? comparableRates.reduce((sum, value) => sum + value, 0) / comparableRates.length
    : 0;

  const cost = Number(baseCost) || 0;
  const age = Number(assetAge) || 0;
  const depreciationFactor = Math.max(0.58, 1 - age * 0.045);
  const costDerived = cost > 0 ? cost * 0.00145 * depreciationFactor * conditionMultiplier[condition] : 0;
  const recommendedRate = Math.max(0, Math.round((marketAverage * 0.55 + costDerived * 0.45) / 10) * 10);
  const delta = marketAverage > 0 ? Math.round(((recommendedRate - marketAverage) / marketAverage) * 100) : 0;

  const chartData = Array.from({ length: 7 }, (_, index) => ({
    week: `W${index + 1}`,
    demand: Math.max(30, Math.round(62 + delta * 0.25 + Math.sin(index * 0.85) * 12 + index * 2)),
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">AI Price Advisor</p>
        <h1 className="text-4xl font-black tracking-tight">Professional pricing cockpit</h1>
        <p className="font-medium text-muted-foreground">
          Tune your daily rental rate with cost, condition, and live marketplace context.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Advisor Inputs</CardTitle>
            <CardDescription>Set the asset profile and let the dashboard recommend a daily rate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Asset Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Asset Age (Years)</Label>
              <Input value={assetAge} onChange={(event) => setAssetAge(event.target.value)} inputMode="numeric" />
            </div>

            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={condition} onValueChange={(value) => setCondition(value as keyof typeof conditionMultiplier)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Base Cost</Label>
              <Input value={baseCost} onChange={(event) => setBaseCost(event.target.value)} inputMode="numeric" />
            </div>

            <Button className="w-full">Refresh recommendation</Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-primary/12 via-background to-background">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  Recommended Daily Rate
                </CardTitle>
                <CardDescription>Blended from cost basis, condition decay, and nearby market rates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-3">
                  <p className="text-5xl font-black tracking-tight text-primary">
                    ₹{recommendedRate.toLocaleString("en-IN")}
                  </p>
                  <p className="pb-1 text-sm font-medium text-muted-foreground">per day</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="rounded-2xl bg-background/80 px-4 py-3 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Market avg</p>
                    <p className="mt-1 text-lg font-semibold">₹{Math.round(marketAverage).toLocaleString("en-IN") || 0}</p>
                  </div>
                  <div className="rounded-2xl bg-background/80 px-4 py-3 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Advisor delta</p>
                    <p className="mt-1 text-lg font-semibold">{delta >= 0 ? "+" : ""}{delta}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>Pricing signals</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="rounded-2xl bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <IndianRupee className="size-4" />
                    Cost model
                  </div>
                  <p className="mt-2 text-2xl font-bold">₹{Math.round(costDerived).toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <Layers3 className="size-4" />
                    Similar listings
                  </div>
                  <p className="mt-2 text-2xl font-bold">{comparables?.length ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Projected Demand in your Region</CardTitle>
              <CardDescription>Mocked utilization curve driven by the current recommendation gap.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <AreaChart data={chartData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="demand"
                    stroke="var(--color-demand)"
                    fill="var(--color-demand)"
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Similar assets currently listed in your area</CardTitle>
              <CardDescription>Live marketplace snapshot for the selected category.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Daily Rate</TableHead>
                    <TableHead>Signal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(comparables ?? []).slice(0, 6).map((item) => (
                    <TableRow key={String(item._id)}>
                      <TableCell className="font-medium">{item.title ?? item.assetCategory}</TableCell>
                      <TableCell>{item.location}</TableCell>
                      <TableCell>₹{Math.round(item.pricePerDay).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-primary">
                        <span className="inline-flex items-center gap-1">
                          Watch
                          <ArrowUpRight className="size-3.5" />
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
