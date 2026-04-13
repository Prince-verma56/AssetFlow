"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { motion } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Sparkles, Workflow } from "lucide-react";
import { SlideTextButton } from "@/components/ui/SlideTextButton";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const HeroModelCanvas = dynamic(
  () => import("@/components/three/HeroModelCanvas").then((mod) => mod.HeroModelCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] w-full animate-pulse rounded-[2rem] border border-white/50 bg-white/60 lg:h-[560px]" />
    ),
  }
);

const headingWords = "Web Projects Built for Students, by a Student".split(" ");

export function HeroSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useGSAP(
    () => {
      if (!sectionRef.current || !videoRef.current || !headingRef.current) return;

      const words = headingRef.current.querySelectorAll("[data-hero-word]");

      gsap.set(words, {
        opacity: 0,
        filter: "blur(10px)",
        y: 36,
      });

      gsap.to(words, {
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        duration: 0.85,
        stagger: 0.08,
        ease: "power3.out",
      });

      gsap.fromTo(
        videoRef.current,
        {
          clipPath: "inset(0% 0% 0% 0% round 2rem)",
          borderRadius: "2rem",
        },
        {
          clipPath: "inset(9% 8% 11% 10% round 38% 62% 44% 56% / 42% 39% 61% 58%)",
          borderRadius: "4rem",
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen items-center overflow-hidden bg-[#F2F5FE] pt-28"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover opacity-45"
          src="/videos/TechStackAnimation.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-linear-to-br from-[#F2F5FE]/95 via-[#F2F5FE]/84 to-[#dde7ff]/88" />
        <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-white/75 to-transparent" />
      </div>

      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 gap-14 px-6 pb-16 lg:grid-cols-2 lg:px-10">
        <div className="flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 shadow-sm backdrop-blur-sm"
          >
            <Sparkles className="size-3.5 text-cyan-600" />
            Premium Student Build Lab
          </motion.div>

          <h1
            ref={headingRef}
            className="max-w-xl text-5xl font-black leading-[0.95] tracking-[-0.05em] text-slate-950 md:text-6xl xl:text-7xl"
          >
            {headingWords.map((word, index) => (
              <span key={`${word}-${index}`} data-hero-word className="mr-[0.28em] inline-block will-change-transform">
                {word}
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.18 }}
            className="mt-8 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl"
          >
            A modular launchpad for polished student portfolios, client-ready websites, and ambitious interactive
            builds with motion, 3D, and crisp product storytelling.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.28 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <SlideTextButton href="#provide" label="Request a Project" />
            <SlideTextButton href="#community" label="Connect Now" variant="secondary" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.38 }}
            className="mt-10 grid max-w-xl gap-3 sm:grid-cols-2"
          >
            <div className="rounded-3xl border border-white/70 bg-white/70 p-4 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)] backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Shipping Style</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">Motion-rich, modular, and launch-ready.</p>
            </div>
            <div className="rounded-3xl border border-white/70 bg-slate-950 p-4 text-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.65)]">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                <Workflow className="size-4 text-cyan-300" />
                Build Flow
              </div>
              <p className="mt-2 text-lg font-semibold">Reusable sections first, page assembly second.</p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.18 }}
          className="relative flex items-center justify-center"
        >
          <div className="absolute -left-8 top-10 hidden h-28 w-28 rounded-full bg-cyan-300/35 blur-3xl lg:block" />
          <div className="absolute -bottom-2 right-0 hidden h-36 w-36 rounded-full bg-indigo-300/35 blur-3xl lg:block" />
          <HeroModelCanvas />
        </motion.div>
      </div>
    </section>
  );
}
