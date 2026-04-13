"use client";
import { motion } from "framer-motion";
import { usePreloader } from "@/lib/use-preloader";
import { ScrollProgress } from "./ScrollProgress";

export const ClientAnimationWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isLoading } = usePreloader();

  return (
    <>
      {/* Show the Scroll Bar only when the app is loaded */}
      {!isLoading && <ScrollProgress />}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={!isLoading ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        {children}
      </motion.div>
    </>
  );
};