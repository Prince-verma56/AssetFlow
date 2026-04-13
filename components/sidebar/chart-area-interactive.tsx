"use client";

import * as React from "react";
import { Dot, BarChart3 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDateShort } from "@/lib/time-anchor";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type OracleChartPoint = {
  date: string;
  historicalPrice?: number;
  forecastPrice?: number;
};

type ChartAreaInteractiveProps = {
  data: OracleChartPoint[];
  anchorDate: string;
};

const chartConfig: ChartConfig = {
  historicalPrice: {
    label: "Market rental rate",
    color: "var(--chart-1)",
  },
  forecastPrice: {
    label: "Advisor forecast",
    color: "var(--chart-2)",
  },
};

export function ChartAreaInteractive({ data, anchorDate }: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile();
  const [range, setRange] = React.useState("30d");

  React.useEffect(() => {
    if (isMobile) setRange("7d");
  }, [isMobile]);

  const filteredData = React.useMemo(() => {
    const anchor = new Date(`${anchorDate}T00:00:00.000Z`);
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const start = new Date(anchor);
    const end = new Date(anchor);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    end.setUTCDate(end.getUTCDate() + 14);

    return data.filter((item) => {
      const itemDate = new Date(`${item.date}T00:00:00.000Z`);
      return itemDate >= start && itemDate <= end;
    });
  }, [anchorDate, data, range]);

  return (
    <Card className="border-border bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Rental Demand Trend
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--success-soft)] bg-[var(--success-soft)] px-2 py-0.5 text-xs text-[var(--success)]">
            <Dot className="size-4 animate-pulse" />
            Live
          </span>
        </CardTitle>
        <CardDescription>
          Live market rental context to the anchor date with advisor guidance from the next day onward.
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(value) => value && setRange(value)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 90 days</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36 @[767px]/card:hidden" size="sm" aria-label="Select time range">
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 90 days
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {filteredData.length === 0 ? (
            <div className="h-[280px] w-full animate-in fade-in duration-500 flex flex-col items-center justify-center space-y-3 rounded-[2rem] border border-dashed border-border bg-muted/30">
               <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                  <BarChart3 className="size-6 animate-pulse text-muted-foreground" />
               </div>
               <div className="text-center">
                  <p className="text-sm font-black text-foreground">Scanning regional rental demand...</p>
                  <p className="text-[10px] font-medium text-muted-foreground">Retrieving market context for the last {range === "7d" ? "7 days" : range === "30d" ? "30 days" : "90 days"}</p>
               </div>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <AreaChart data={filteredData}>
                <defs>
                  <linearGradient id="fillHistoricalPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-historicalPrice)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-historicalPrice)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="fillForecastPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-forecastPrice)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-forecastPrice)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  minTickGap={32}
                  tickFormatter={(value) => formatDateShort(String(value))}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: 700 }}
                />
                <ChartTooltip
                  cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                  content={
                    <ChartTooltipContent 
                      indicator="dashed" 
                      labelFormatter={(value) => formatDateShort(String(value))}
                      className="rounded-2xl border-border bg-card text-card-foreground shadow-none"
                    />
                  }
                />
                <ReferenceLine 
                  x={anchorDate} 
                  stroke="var(--muted-foreground)" 
                  strokeDasharray="4 4" 
                  label={{ 
                    position: 'top', 
                    value: 'Today', 
                    className: 'fill-muted-foreground text-[9px] font-black uppercase tracking-widest' 
                  }} 
                />
                <Area
                  type="monotone"
                  dataKey="historicalPrice"
                  stroke="var(--color-historicalPrice)"
                  fill="url(#fillHistoricalPrice)"
                  strokeWidth={2.5}
                  connectNulls={true}
                  dot={{ r: 4, fill: "var(--color-historicalPrice)", strokeWidth: 2, stroke: "var(--card)" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey="forecastPrice"
                  stroke="var(--color-forecastPrice)"
                  fill="url(#fillForecastPrice)"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  connectNulls={true}
                  style={{ filter: "drop-shadow(0px 0px 8px var(--color-forecastPrice))" }}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
