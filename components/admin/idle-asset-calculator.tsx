"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calculator, TrendingUp, DollarSign, Calendar } from "lucide-react";

export function IdleAssetCalculator() {
  const [idleDays, setIdleDays] = React.useState<number[]>([15]); // per month
  const [dailyRate, setDailyRate] = React.useState<number>(1500);

  // Annual calculation: (Idle days per month * 12) * daily rate
  const projectedAnnualRevenue = idleDays[0] * 12 * dailyRate;
  const monthlyRevenue = idleDays[0] * dailyRate;
  const utilizationRate = Math.round(((30 - idleDays[0]) / 30) * 100);

  return (
    <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-emerald-500/2 shadow-md w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-600/10 p-2">
              <Calculator className="size-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle>Idle Asset ROI Calculator</CardTitle>
              <CardDescription className="text-xs mt-1">See the immediate financial value of pivoting to the AssetFlow model by renting your underutilized equipment.</CardDescription>
            </div>
          </div>
          <TrendingUp className="size-8 text-emerald-600/50 flex-shrink-0" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Input Section */}
          <div className="space-y-6 lg:col-span-1">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Idle Days per Month</Label>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full text-sm">{idleDays[0]} Days</span>
              </div>
              <Slider
                value={idleDays}
                onValueChange={setIdleDays}
                min={1}
                max={30}
                step={1}
                className="[&>[data-slot=slider-range]]:bg-emerald-500 [&>[data-slot=slider-thumb]]:border-emerald-500"
              />
              <p className="text-xs text-muted-foreground">Adjust days available for rent</p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Daily Rental Rate (₹)</Label>
              <Input
                type="number"
                value={dailyRate}
                onChange={(e) => setDailyRate(Number(e.target.value) || 0)}
                className="border-emerald-100 focus-visible:ring-emerald-500 bg-white font-semibold"
              />
              <p className="text-xs text-muted-foreground">Per day rental pricing</p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid gap-3 lg:col-span-2 grid-cols-2 md:grid-cols-3">
            {/* Monthly Revenue */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-emerald-600" />
                <p className="text-xs font-semibold text-emerald-600 uppercase">Monthly</p>
              </div>
              <p className="text-2xl font-black text-emerald-700">
                ₹{monthlyRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">per month</p>
            </div>

            {/* Annual Revenue */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 space-y-2 md:col-span-2">
              <div className="flex items-center gap-2">
                <DollarSign className="size-4 text-emerald-600" />
                <p className="text-xs font-semibold text-emerald-600 uppercase">Projected Annual ROI</p>
              </div>
              <p className="text-3xl font-black text-emerald-600 tracking-tight">
                ₹{projectedAnnualRevenue.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-emerald-700/70">Extra passive income per year</p>
            </div>

            {/* Utilization Rate */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-600" />
                <p className="text-xs font-semibold text-emerald-600 uppercase">Utilization</p>
              </div>
              <p className="text-2xl font-black text-emerald-700">
                {utilizationRate}%
              </p>
              <p className="text-xs text-muted-foreground">potential usage</p>
            </div>

            {/* Break-even info */}
            <div className="rounded-2xl border border-emerald-100 bg-white p-4 space-y-2 md:col-span-2">
              <p className="text-xs font-semibold text-emerald-600 uppercase">Break-even Analysis</p>
              <p className="text-xs text-muted-foreground">
                At ₹{dailyRate}/day with {idleDays[0]} idle days/month, you'll earn <span className="font-semibold text-emerald-700">₹{monthlyRevenue.toLocaleString()}</span> monthly
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
