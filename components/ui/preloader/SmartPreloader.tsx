"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePreloader } from "@/lib/use-preloader";

interface SmartPreloaderProps {
  type: "ui" | "video";
  src?: string; // Video URL
}

export const SmartPreloader = ({ type, src }: SmartPreloaderProps) => {
  const { isLoading, finishLoading } = usePreloader();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (type !== "ui" || !isLoading) {
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 1;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(finishLoading, 500); // Small delay after 100%
          return 100;
        }
        return next;
      });
    }, 30); // Speed of the 0-100 counter

    return () => clearInterval(interval);
  }, [type, isLoading, finishLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ y: 0 }}
          exit={{ y: "-100%" }} // The "Shutter Up" Animation
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black text-white"
        >
          {type === "ui" ? (
            <div className="text-center">
              <motion.h1 className="text-8xl font-bold tracking-tighter">
                {progress}%
              </motion.h1>
              <p className="text-sm uppercase tracking-widest text-zinc-500 mt-4">
                Loading AgriRent Engine
              </p>
            </div>
          ) : (
            <video
              src={src}
              autoPlay
              muted
              playsInline
              onEnded={finishLoading} // Unlocks when video finishes
              className="w-full h-full object-cover"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
