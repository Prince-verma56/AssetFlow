"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSkeleton } from "@/components/sidebar/dashboard-skeleton";
import { ChartAreaInteractive } from "@/components/sidebar/chart-area-interactive";
import { ANCHOR_DATE_ISO } from "@/lib/time-anchor";
import { ClientAnimationWrapper } from "@/components/ui/preloader/ClientAnimationWrapper";
import { Activity, TrendingUp, BarChart3, PieChart } from "lucide-react";

export default function AnalyticsPage() {
  const revenueData = useQuery(api.analytics.aprilRevenueMtd, {});
  const marketTrends = useQuery(api.analytics.getMarketTrends, { commodity: "Wheat" });

  if (revenueData === undefined || marketTrends === undefined) {
    return <DashboardSkeleton />;
  }

  const chartPoints = marketTrends.map(t => ({
    date: t.date,
    historicalPrice: t.modalPrice,
  }));

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
          <Activity className="size-8 text-primary" />
          Market Intelligence
        </h1>
        <p className="text-muted-foreground font-medium">Deep trends and revenue analysis for April 2026</p>
      </div>

      <ClientAnimationWrapper>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-none bg-primary/5 rounded-3xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase tracking-widest">Total Revenue</CardDescription>
              <CardTitle className="text-3xl font-black">₹{revenueData.totalRevenue.toLocaleString("en-IN")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 text-emerald-600 text-sm font-bold">
                <TrendingUp className="size-3.5" />
                +12.5% vs March
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none bg-zinc-100/50 dark:bg-zinc-900/50 text-zinc-950 dark:text-white rounded-3xl transition-all hover:ring-1 hover:ring-zinc-200 dark:hover:ring-zinc-800">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-zinc-400">Total Sales</CardDescription>
              <CardTitle className="text-3xl font-black">{revenueData.paidCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-zinc-500 text-sm font-medium">Verified Transactions</div>
            </CardContent>
          </Card>

          <Card className="border-none bg-emerald-50 rounded-3xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-emerald-600/50">Market Share</CardDescription>
              <CardTitle className="text-3xl font-black text-emerald-900">4.2%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-emerald-600/70 text-sm font-medium">Regional Dominance</div>
            </CardContent>
          </Card>

          <Card className="border-none bg-amber-50 rounded-3xl">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-amber-600/50">Avg. Margin</CardDescription>
              <CardTitle className="text-3xl font-black text-amber-900">₹420/q</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-amber-600/70 text-sm font-medium">Above Mandi Avg</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-3 mt-8">
          <div className="lg:col-span-2">
            <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden bg-white/50 backdrop-blur-md">
              <CardHeader className="p-8 pb-0">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="size-5 text-primary" />
                  Price Volatility Index
                </CardTitle>
                <CardDescription>Regional modal price fluctuations over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4">
                <ChartAreaInteractive data={chartPoints} anchorDate={ANCHOR_DATE_ISO} />
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-zinc-100/50 dark:bg-zinc-900/50 text-zinc-950 dark:text-white p-8 transition-all hover:shadow-xl">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="flex items-center gap-2">
                <PieChart className="size-5 text-emerald-600 dark:text-emerald-400" />
                Commodity Mix
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-6">
              {[
                { name: "Wheat", value: 65, color: "bg-emerald-600" },
                { name: "Mustard", value: 25, color: "bg-emerald-400" },
                { name: "Other", value: 10, color: "bg-zinc-300 dark:bg-zinc-700" }
              ].map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-zinc-600 dark:text-zinc-400">{item.name}</span>
                    <span>{item.value}%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-200 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
              <p className="text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed pt-4 border-t border-zinc-200 dark:border-white/5">
                AI Insight: Wheat remains your strongest asset. Consider diversifying into Mustard for higher Q3 margins.
              </p>
            </CardContent>
          </Card>
        </div>
      </ClientAnimationWrapper>
    </div>
  );
}
