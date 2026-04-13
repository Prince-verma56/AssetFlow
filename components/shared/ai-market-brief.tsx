"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type AiMarketBriefProps = {
  insight: string;
  variant?: "owner" | "renter";
  className?: string;
};

export function AiMarketBrief({ insight, variant = "owner", className }: AiMarketBriefProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl p-6 backdrop-blur-xl transition-all duration-300",
        variant === "owner"
          ? "border border-amber-200/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20"
          : "border border-emerald-200/30 bg-gradient-to-br from-emerald-50/50 to-green-50/30 shadow-lg shadow-emerald-500/10 hover:emerald-500/20",
        className
      )}
    >
      {/* Glassmorphic glow effect */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100",
          variant === "owner"
            ? "bg-gradient-radial from-amber-400/20 to-transparent"
            : "bg-gradient-radial from-emerald-400/20 to-transparent"
        )}
      />

      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            "mt-1 flex-shrink-0 rounded-full p-2",
            variant === "owner" ? "bg-amber-100/80" : "bg-emerald-100/80"
          )}
        >
          <Sparkles
            className={cn(
              "size-4 animate-pulse",
              variant === "owner" ? "text-amber-600" : "text-emerald-600"
            )}
          />
        </div>
        <div className="flex-1">
          <p
            className={cn(
              "text-xs font-black uppercase tracking-wider mb-2",
              variant === "owner" ? "text-amber-700" : "text-emerald-700"
            )}
          >
            {variant === "owner" ? "Market Intelligence" : "Dynamic Pricing Applied"}
          </p>
          <p
            className={cn(
              "text-sm font-semibold leading-relaxed",
              variant === "owner" ? "text-amber-900/80" : "text-emerald-900/80"
            )}
          >
            {insight}
          </p>
        </div>
      </div>
    </div>
  );
}
