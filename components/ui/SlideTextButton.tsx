"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLenisScroll } from "@/components/providers/lenis-provider";

type SlideTextButtonProps = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
  className?: string;
};

export function SlideTextButton({
  href,
  label,
  variant = "primary",
  className,
}: SlideTextButtonProps) {
  const { scrollTo } = useLenisScroll();
  const isHashLink = href.startsWith("#");

  return (
    <Link
      href={href}
      onClick={
        isHashLink
          ? (event) => {
              event.preventDefault();
              scrollTo(href, -72);
            }
          : undefined
      }
      className={cn(
        "group relative inline-flex h-14 items-center overflow-hidden rounded-full border px-6 text-sm font-semibold transition-transform duration-300 hover:-translate-y-0.5",
        variant === "primary"
          ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_40px_-18px_rgba(15,23,42,0.6)]"
          : "border-slate-200 bg-white/85 text-slate-900 backdrop-blur-sm",
        className
      )}
    >
      <span className="absolute inset-0 bg-linear-to-r from-cyan-300/20 via-white/10 to-indigo-300/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="relative flex h-full items-center overflow-hidden">
        <span className="transition-transform duration-300 group-hover:-translate-y-[160%]">{label}</span>
        <span className="absolute translate-y-[160%] transition-transform duration-300 group-hover:translate-y-0">
          {label}
        </span>
      </span>
      <ArrowUpRight className="relative ml-3 size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}
