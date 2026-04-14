"use client";

import { motion, type Variants } from "framer-motion";
import { ShieldCheck, Truck, BarChart3, Users, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Features data with premium Unsplash placeholder images and dynamic routing
const features = [
  {
    icon: ShieldCheck,
    title: "Escrow-Backed Security",
    description: "Your funds are locked safely in escrow. Payments are released only when equipment is verified.",
    image: "https://images.unsplash.com/photo-1605622754683-9b7642ea8ff0?auto=format&fit=crop&q=80&w=800", // Tractor/Farm
    href: "/marketplace",
    actionText: "Browse Safely",
  },
  {
    icon: Truck,
    title: "Live Logistics Tracking",
    description: "Never guess where your rental is. Monitor delivery and pickup routes in real-time.",
    image: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&q=80&w=800", // Logistics/Map vibe
    href: "/renter/rentals",
    actionText: "Track Orders",
  },
  {
    icon: BarChart3,
    title: "AI Dynamic Pricing",
    description: "Our AI adjusts prices based on demand and tenure to ensure high ROI for equipment owners.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800", // Data/Analytics
    href: "/admin",
    actionText: "Owner Dashboard",
  },
  {
    icon: Users,
    title: "Verified Community",
    description: "Build relationships. Every user goes through a strict KYC process and transparent rating system.",
    image: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=800", // Handshake/Community
    href: "/marketplace",
    actionText: "Join Community",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50, damping: 15 } },
};

export default function WhatWeProvideSection() {
  return (
    <section id="provide" className="relative w-full py-32 bg-background overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-50" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-foreground shadow-sm"
          >
            Core Infrastructure
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-6"
          >
            Everything you need to rent with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">Confidence.</span>
          </motion.h2>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants} className="group relative flex flex-col bg-card rounded-[2rem] border border-border hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 overflow-hidden h-[450px]">
              
              {/* Image Section */}
              <div className="relative h-[55%] w-full overflow-hidden">
                <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-transparent transition-colors duration-500 z-10" />
                <Image 
                  src={feature.image} 
                  alt={feature.title} 
                  fill 
                  className="object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" 
                />
                {/* Floating Icon */}
                <div className="absolute top-4 left-4 z-20 w-12 h-12 rounded-xl flex items-center justify-center bg-white/90 backdrop-blur-sm text-slate-900 shadow-lg">
                  <feature.icon className="w-6 h-6 stroke-[1.5px]" />
                </div>
              </div>

              {/* Content Section */}
              <div className="p-8 flex flex-col flex-grow justify-between bg-card z-20">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground font-medium">
                    {feature.description}
                  </p>
                </div>

                {/* Routing Link / Arrow */}
                <Link href={feature.href} className="inline-flex items-center gap-2 text-sm font-bold text-foreground group/link mt-4 w-fit">
                  {feature.actionText}
                  <div className="bg-muted group-hover/link:bg-blue-500 group-hover/link:text-white rounded-full p-1.5 transition-colors duration-300">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
