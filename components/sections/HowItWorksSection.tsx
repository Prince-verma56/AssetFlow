"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Clock3, MapPinned, ShieldCheck, Sparkles, WalletCards } from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Search by need, location, and timing",
    description:
      "Jump into the marketplace, compare equipment nearby, and narrow choices using pricing, distance, availability, and trust signals.",
    details:
      "Designed for fast decision-making, so renters can move from browsing to booking without digging through cluttered listings.",
    image: "/globe.svg",
    href: "/marketplace",
    buttonLabel: "Explore Marketplace",
    icon: Sparkles,
  },
  {
    step: "02",
    title: "Track routes, handoffs, and delivery clarity",
    description:
      "Use the live map and tracking flows to keep pickups, drop-offs, and active rentals visible for both the renter and the owner.",
    details:
      "This reduces the usual back-and-forth around logistics and gives the platform a much more operational feel than a generic listing app.",
    image: "/window.svg",
    href: "/map",
    buttonLabel: "Open Live Map",
    icon: MapPinned,
  },
  {
    step: "03",
    title: "Close the loop with secure payments and owner tools",
    description:
      "Owners can manage listings, pricing, and activity from the admin side while renters move into bookings, tracking, and payment follow-through.",
    details:
      "The result is a tighter full-cycle flow: discovery, coordination, trust, and revenue management all in one connected product surface.",
    image: "/file.svg",
    href: "/admin/listings",
    buttonLabel: "View Owner Console",
    icon: WalletCards,
  },
];

const badges = [
  { label: "Escrow-ready flow", icon: ShieldCheck },
  { label: "Live logistics", icon: Clock3 },
  { label: "Owner + renter paths", icon: MapPinned },
];

export default function HowItWorksSection() {
  return (
    <section className="relative w-full overflow-hidden bg-muted/30 py-32">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.16),transparent_28%)]" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-foreground"
          >
            How It Works
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-4xl font-black tracking-tight text-foreground md:text-5xl"
          >
            A clearer renter-to-owner workflow, built around the routes your app already supports.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.08 }}
            className="mt-6 text-base leading-7 text-muted-foreground md:text-lg"
          >
            This section is ready for your final images later. For now, the cards use local placeholder paths from
            `public/` so the layout stays stable while you refine content and assets.
          </motion.p>
        </div>

        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {badges.map((badge) => (
            <div
              key={badge.label}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/85 px-4 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm"
            >
              <badge.icon className="size-4 text-cyan-600" />
              <span>{badge.label}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {steps.map((step, index) => (
            <motion.article
              key={step.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="group flex h-full flex-col overflow-hidden rounded-[2rem] border border-border/70 bg-background/88 shadow-[0_24px_60px_-35px_rgba(15,23,42,0.45)] backdrop-blur-sm"
            >
              <div className="relative h-56 overflow-hidden border-b border-border/60 bg-linear-to-br from-slate-100 to-cyan-50">
                <div className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold tracking-[0.22em] text-white">
                  <span>{step.step}</span>
                </div>
                <div className="absolute right-5 top-5 z-10 rounded-2xl bg-white/90 p-3 shadow-sm">
                  <step.icon className="size-5 text-slate-900" />
                </div>
                <Image
                  src={step.image}
                  alt={step.title}
                  fill
                  className="object-contain p-10 transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="flex flex-1 flex-col p-7">
                <h3 className="text-2xl font-black tracking-tight text-foreground">{step.title}</h3>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{step.description}</p>
                <p className="mt-4 text-sm leading-7 text-muted-foreground/90">{step.details}</p>

                <div className="mt-6 grid gap-2 rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">Why this matters</p>
                  <p>
                    Each card maps directly to an existing route, so the landing experience now reflects the app you
                    actually have instead of generic placeholder navigation.
                  </p>
                </div>

                <Link
                  href={step.href}
                  className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  <span>{step.buttonLabel}</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
