"use client";

import Image from "next/image";
import { Camera, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type ListingMediaProps = {
  imageUrl?: string | null;
  alt: string;
  title: string;
  subtitle?: string;
  sizes?: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
};

export function ListingMedia({
  imageUrl,
  alt,
  title,
  subtitle = "Photo optional",
  sizes = "100vw",
  className,
  imageClassName,
  fallbackClassName,
}: ListingMediaProps) {
  if (imageUrl) {
    return (
      <div className={cn("relative h-full w-full overflow-hidden", className)}>
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes={sizes}
          className={cn("object-cover", imageClassName)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col justify-between bg-[linear-gradient(135deg,rgba(250,250,249,1),rgba(236,253,245,1))] p-5 text-zinc-900",
        className,
        fallbackClassName,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 shadow-sm">
          <ImageOff className="size-3.5" />
          No image
        </div>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-white/80 text-emerald-700 shadow-sm ring-1 ring-black/5">
          <Camera className="size-5" />
        </div>
      </div>

      <div className="space-y-2">
        <p className="line-clamp-2 text-lg font-black tracking-tight">{title}</p>
        <p className="text-sm font-medium text-zinc-600">{subtitle}</p>
      </div>
    </div>
  );
}
