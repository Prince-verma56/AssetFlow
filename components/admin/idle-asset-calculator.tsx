"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calculator } from "lucide-react";

export function IdleAssetCalculator() {
  const [idleDays, setIdleDays] = React.useState<number[]>([15]); // per month
  const [dailyRate, setDailyRate] = React.useState<number>(1500);

  // Annual calculation: (Idle days per month * 12) * daily rate
  const projectedAnnualRevenue = idleDays[0] * 12 * dailyRate;

  return (
    <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="size-5 text-emerald-600" />
          <CardTitle>Idle Asset ROI Calculator</CardTitle>
        </div>
        <CardDescription>See the immediate financial value of pivoting to the AgriRent model by renting your underutilized equipment.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Idle Days per Month</Label>
                <span className="font-bold text-emerald-700">{idleDays[0]} Days</span>
              </div>
              <Slider 
                value={idleDays} 
                onValueChange={setIdleDays} 
                min={1} 
                max={30} 
                step={1} 
                className="[&>[data-slot=slider-range]]:bg-emerald-500 [&>[data-slot=slider-thumb]]:border-emerald-500" 
              />
            </div>
            
            <div className="space-y-3">
              <Label>Estimated Daily Rental Rate (₹)</Label>
              <Input 
                type="number" 
                value={dailyRate} 
                onChange={(e) => setDailyRate(Number(e.target.value) || 0)}
                className="border-emerald-100 focus-visible:ring-emerald-500 bg-white"
              />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-emerald-100 shadow-sm">
            <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-2">Projected Annual ROI</p>
            <p className="text-5xl font-black text-emerald-600 tracking-tighter">
              ₹{projectedAnnualRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-emerald-700/70 mt-4 text-center font-medium">Extra passive incomer per year by turning static assets into working capital.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
