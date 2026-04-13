"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClientAnimationWrapper } from "@/components/ui/preloader/ClientAnimationWrapper";
import { SmartPreloader } from "@/components/ui/preloader/SmartPreloader";
import { usePreloader } from "@/lib/use-preloader";
import { roleToDashboard, type ClerkRole } from "@/lib/roles";
import { ArrowRight, Leaf, ShieldCheck, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const { startLoading, runId } = usePreloader();
  const [switchingRole, setSwitchingRole] = useState(false);

  useLayoutEffect(() => {
    const preloaderKey = "home-preloader-seen";
    const hasSeenPreloader = window.sessionStorage.getItem(preloaderKey);
    if (!hasSeenPreloader) {
      startLoading();
      window.sessionStorage.setItem(preloaderKey, "true");
    }
  }, [startLoading]);

  const selectRole = async (role: ClerkRole) => {
    if (!isSignedIn) {
      // Allow sign-in logic to trigger naturally from Clerk components
      return; 
    }
    
    setSwitchingRole(true);
    try {
      const response = await fetch("/api/me/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error("Role update failed");

      await new Promise((resolve) => setTimeout(resolve, 800));
      router.push(roleToDashboard(role));
      router.refresh();
    } catch (e) {
      console.error(e);
      setSwitchingRole(false);
    }
  };

  return (
    <>
      <SmartPreloader key={runId} type="ui" />
      <ClientAnimationWrapper>
        <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Background Decorators */}
          <div className="absolute top-[-10%] left-[-10%] size-[40rem] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] size-[40rem] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-5xl mx-auto px-6 py-20 text-center relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center mb-8"
            >
              <div className="size-20 bg-emerald-100 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-200">
                <span className="text-4xl font-black text-emerald-600">P</span>
              </div>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-6 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900"
            >
              Rent smarter with <span className="text-emerald-600">AgriRent</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl md:text-2xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              Connect equipment owners and renters in one trusted marketplace with live availability, smarter pricing, and secure escrow-backed checkout.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto"
            >
              {!isLoaded ? (
                <div className="col-span-2 h-40 animate-pulse bg-slate-200 rounded-2xl" />
              ) : !isSignedIn ? (
                <Card className="col-span-2 p-8 border-none shadow-xl bg-white/80 backdrop-blur-md">
                   <CardContent className="space-y-6 pt-6">
                      <h2 className="text-2xl font-bold">Join the Movement</h2>
                      <p className="text-slate-500">Sign in to choose your workspace and enter AgriRent.</p>
                      <SignInButton mode="modal" fallbackRedirectUrl="/onboarding">
                         <Button size="lg" className="h-14 w-full text-lg bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg transition-transform active:scale-95">
                           Get Started Securely <ArrowRight className="ml-2 size-5" />
                         </Button>
                      </SignInButton>
                   </CardContent>
                </Card>
              ) : (
                <>
                  <Button 
                    onClick={() => selectRole("owner")}
                    disabled={switchingRole}
                    className="h-auto p-8 flex flex-col items-center gap-4 bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-1 text-white rounded-3xl shadow-xl shadow-emerald-600/20 transition-all border border-emerald-500"
                  >
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <TrendingUp className="size-8" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-2xl font-bold mb-1">I am an Owner</h3>
                      <p className="text-emerald-100 text-sm font-medium">List equipment, manage rentals, and track earnings</p>
                    </div>
                  </Button>
                  
                  <Button 
                    onClick={() => selectRole("renter")}
                    disabled={switchingRole}
                    className="h-auto p-8 flex flex-col items-center gap-4 bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-1 text-white rounded-3xl shadow-xl shadow-indigo-600/20 transition-all border border-indigo-500"
                  >
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                      <ShieldCheck className="size-8" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-2xl font-bold mb-1">I am a Renter</h3>
                      <p className="text-indigo-100 text-sm font-medium">Find nearby equipment and book it with confidence</p>
                    </div>
                  </Button>
                </>
              )}
            </motion.div>

            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.6 }}
               className="mt-20 flex flex-wrap justify-center gap-8 text-slate-400 font-medium text-sm"
            >
              <span className="flex items-center gap-2"><Leaf className="size-4" /> Equipment Shared Locally</span>
              <span className="flex items-center gap-2"><ShieldCheck className="size-4" /> Secure Razorpay Escrow</span>
              <span className="flex items-center gap-2"><TrendingUp className="size-4" /> AI Rental Pricing</span>
            </motion.div>
          </div>
        </main>
      </ClientAnimationWrapper>
    </>
  );
}
