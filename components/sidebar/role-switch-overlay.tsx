"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { toClerkRole, type ConvexRole } from "@/lib/roles";

interface RoleSwitchOverlayProps {
  isSwitching: boolean;
  targetRole: ConvexRole;
}

export function RoleSwitchOverlay({ isSwitching, targetRole }: RoleSwitchOverlayProps) {
  const roleLabel = toClerkRole(targetRole) === "owner" ? "Owner Console" : "Equipment Marketplace";

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isSwitching ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-background/80 backdrop-blur-2xl"
        >
          <motion.div
            layout
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="mx-4 flex w-full max-w-lg flex-col items-center space-y-8 rounded-[2rem] border border-white/20 bg-white/10 p-10 text-center shadow-2xl"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="size-20 rounded-full border-t-2 border-primary"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="size-8 animate-pulse text-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-black tracking-tight"
              >
                Switching to {roleLabel}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="font-medium text-muted-foreground"
              >
                Syncing workspace...
              </motion.p>
            </div>

            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    opacity: [0.2, 1, 0.2],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="size-1.5 rounded-full bg-primary"
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
