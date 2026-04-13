import React from "react";
import { Check, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type RentalTimelineStep = "placed" | "escrow" | "shipped" | "delivered" | "completed" | "disputed" | "cancelled";

interface TimelineStepConfig {
  step: RentalTimelineStep;
  label: string;
  description?: string;
  icon: React.ReactNode;
  color: string;
}

const TIMELINE_STEPS: Record<RentalTimelineStep, TimelineStepConfig> = {
  placed: {
    step: "placed",
    label: "Order Placed",
    description: "Your rental order has been created",
    icon: "📋",
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  },
  escrow: {
    step: "escrow",
    label: "Payment Confirmed",
    description: "Payment has been secured via Razorpay",
    icon: "✅",
    color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  },
  shipped: {
    step: "shipped",
    label: "Out for Delivery",
    description: "Equipment is on its way to you",
    icon: "🚚",
    color: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300",
  },
  delivered: {
    step: "delivered",
    label: "Delivered",
    description: "Equipment has been delivered",
    icon: "📦",
    color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  },
  completed: {
    step: "completed",
    label: "Rental Completed",
    description: "Equipment has been returned and rented successfully",
    icon: "🎉",
    color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  },
  disputed: {
    step: "disputed",
    label: "Disputed",
    description: "This order has a dispute",
    icon: "⚠️",
    color: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
  },
  cancelled: {
    step: "cancelled",
    label: "Cancelled",
    description: "This order has been cancelled",
    icon: "❌",
    color: "bg-zinc-100 dark:bg-zinc-900/30 text-zinc-700 dark:text-zinc-300",
  },
};

const STEP_ORDER: RentalTimelineStep[] = ["placed", "escrow", "shipped", "delivered", "completed"];

function getStepStatus(
  currentStep: RentalTimelineStep,
  stepToCheck: RentalTimelineStep
): "completed" | "current" | "pending" {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const checkIndex = STEP_ORDER.indexOf(stepToCheck);

  if (checkIndex < currentIndex) return "completed";
  if (checkIndex === currentIndex) return "current";
  return "pending";
}

interface RentalTimelineProps {
  currentStep: RentalTimelineStep;
  showAll?: boolean;
  className?: string;
}

export function RentalTimeline({ currentStep, showAll = true, className }: RentalTimelineProps) {
  const stepsToShow = showAll ? STEP_ORDER : STEP_ORDER.slice(0, STEP_ORDER.indexOf(currentStep) + 2);

  return (
    <div className={cn("space-y-4", className)}>
      {stepsToShow.map((step, idx) => {
        const config = TIMELINE_STEPS[step];
        const status = getStepStatus(currentStep, step);
        const isLast = idx === stepsToShow.length - 1;

        return (
          <div key={step} className="flex gap-4">
            {/* Timeline marker */}
            <div className="flex flex-col items-center pt-1">
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                  status === "completed"
                    ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700"
                    : status === "current"
                      ? `${config.color} border-current`
                      : "bg-muted/50 border-border/40"
                )}
              >
                {status === "completed" ? (
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : status === "current" ? (
                  <Clock className="w-5 h-5 animate-pulse" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-border/60" />
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 h-12 mt-2 transition-colors",
                    status === "completed" ? "bg-emerald-300 dark:bg-emerald-700" : "bg-border/20"
                  )}
                />
              )}
            </div>

            {/* Step content */}
            <div
              className={cn(
                "flex-1 pb-4 pt-1",
                status === "current" && "font-semibold",
                status === "completed" && "opacity-75"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{config.icon}</span>
                <h3 className="text-sm font-semibold">{config.label}</h3>
                {status === "current" && (
                  <Badge variant="default" className="text-xs">
                    In Progress
                  </Badge>
                )}
                {status === "completed" && (
                  <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700">
                    Done
                  </Badge>
                )}
              </div>
              {config.description && (
                <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface RentalTimelineGridProps {
  currentStep: RentalTimelineStep;
  className?: string;
}

/**
 * A vertical card-based timeline display for rental progress
 */
export function RentalTimelineCards({ currentStep, className }: RentalTimelineGridProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {STEP_ORDER.map((step) => {
        const config = TIMELINE_STEPS[step];
        const status = getStepStatus(currentStep, step);

        return (
          <div
            key={step}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
              status === "completed"
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
                : status === "current"
                  ? `${config.color} border-current`
                  : "bg-muted/30 border-border/40"
            )}
          >
            <div className="text-2xl">{config.icon}</div>
            <div className="flex-1">
              <p className={cn("text-sm font-semibold", status === "completed" && "opacity-75")}>
                {config.label}
              </p>
              {config.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
              )}
            </div>
            {status === "completed" ? (
              <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                <Check className="w-3 h-3 mr-1" />
                Done
              </Badge>
            ) : status === "current" ? (
              <Badge variant="default">
                <Clock className="w-3 h-3 mr-1 animate-pulse" />
                Current
              </Badge>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

interface RentalTimelineSimpleProps {
  currentStep: RentalTimelineStep;
  className?: string;
}

/**
 * A minimal horizontal timeline display
 */
export function RentalTimelineSimple({ currentStep, className }: RentalTimelineSimpleProps) {
  const currentIdx = STEP_ORDER.indexOf(currentStep);

  return (
    <div className={cn("", className)}>
      <div className="flex items-center justify-between">
        {STEP_ORDER.map((step, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <React.Fragment key={step}>
              {/* Step indicator */}
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all text-xs font-bold",
                  isCompleted
                    ? "bg-emerald-500 border-emerald-600 text-white"
                    : isCurrent
                      ? "bg-amber-100 border-amber-400 text-amber-900"
                      : "bg-muted border-muted-foreground text-muted-foreground"
                )}
              >
                {isCompleted ? "✓" : idx + 1}
              </div>

              {/* Connector line */}
              {idx < STEP_ORDER.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-1 mx-2 rounded-full transition-colors",
                    isCompleted ? "bg-emerald-500" : "bg-muted"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-3">
        {STEP_ORDER.map((step) => (
          <span key={step} className="text-xs font-medium text-muted-foreground text-center flex-1">
            {TIMELINE_STEPS[step].label.split(" ")[0]}
          </span>
        ))}
      </div>
    </div>
  );
}
