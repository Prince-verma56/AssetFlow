"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Truck, BarChart3, Users, ArrowRight } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Escrow-Backed Security",
    description: "Your funds are locked safely in escrow. Payments are only released when the equipment is successfully delivered and verified by you.",
  },
  {
    icon: Truck,
    title: "Live Logistics Tracking",
    description: "Never guess where your rental is. Monitor delivery and pickup routes in real-time with our integrated mapping engine.",
  },
  {
    icon: BarChart3,
    title: "AI Dynamic Pricing",
    description: "Our AI adjusts prices based on demand, duration, and asset tenure to ensure fair rates for renters and high ROI for owners.",
  },
  {
    icon: Users,
    title: "Verified Community",
    description: "Build long-term relationships. Every owner and renter goes through a KYC process, complete with transparent rating systems.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50, damping: 15 } },
};

export default function WhatWeProvideSection() {
  return (
    <section id="provide" className="relative w-full py-32 bg-white overflow-hidden">
      {/* Premium Subtle Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-50" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-slate-800 shadow-sm"
          >
            Core Infrastructure
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl font-black tracking-tight text-slate-950 mb-6"
          >
            Everything you need to rent with <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-500 to-slate-800">Confidence.</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-slate-600 font-medium max-w-2xl"
          >
            We provide a full-stack logistical and financial safety net for high-value heavy machinery, ensuring peace of mind for both parties.
          </motion.p>
        </div>

        {/* Bento/Shadcn Feature Cards */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative flex flex-col p-8 md:p-10 bg-white rounded-[2rem] border border-slate-200 hover:border-slate-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-500 overflow-hidden"
            >
              {/* Shining Glass Glow on Hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                {/* Sleek Dark Icon Container */}
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 bg-slate-950 text-white shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
                  <feature.icon className="w-6 h-6 stroke-[1.5px]" />
                </div>
                
                <h3 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">
                  {feature.title}
                </h3>
                
                <p className="text-base leading-relaxed text-slate-600 font-medium">
                  {feature.description}
                </p>
              </div>

              {/* Minimalist Interactive Arrow */}
              <div className="absolute bottom-10 right-10 translate-x-4 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 z-10 hidden sm:block">
                 <ArrowRight className="h-6 w-6 text-slate-300" />
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}