"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, ChevronLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      {/* 1. Animated Icon / Visual */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative mb-8 flex h-40 w-40 items-center justify-center rounded-full bg-primary/5"
      >
        <Search className="h-20 w-20 text-primary opacity-20" />
        <div className="absolute inset-0 animate-pulse rounded-full border border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.1)]" />
        <h1 className="absolute text-6xl font-black tracking-tighter text-primary">404</h1>
      </motion.div>

      {/* 2. Messaging */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-md space-y-4"
      >
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Lost in the Field?
        </h2>
        <p className="text-muted-foreground">
          The page you&#39;re looking for doesn&#39;t exist or has been moved to another farm. 
          Let&#39;s get you back to the main dashboard.
        </p>
      </motion.div>

      {/* 3. Action Buttons */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
      >
        <Button asChild variant="default" size="lg" className="gap-2 px-8 shadow-lg shadow-primary/20">
          <Link href="/admin">
            <Home className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        
        <Button asChild variant="outline" size="lg" className="gap-2">
          <Link href="/">
            <ChevronLeft className="h-4 w-4" />
            Landing Page
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}