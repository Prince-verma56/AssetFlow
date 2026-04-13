"use client";
import { motion, useScroll, useSpring } from "framer-motion";

export const ScrollProgress = () => {
  // 1. Hook to track the vertical scroll progress (0 to 1)
  const { scrollYProgress } = useScroll();

  // 2. Add 'Spring' physics to make the bar move smoothly (not robotic)
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 pointer-events-none">
      {/* Background Track (Transparent/Blur) */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />

      {/* The Actual Progress Bar */}
      <motion.div
        className="h-full bg-primary origin-left shadow-[0_0_15px_rgba(var(--primary),0.5)]"
        style={{ scaleX }}
      />
    </div>
  );
};