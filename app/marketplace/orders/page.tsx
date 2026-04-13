"use client";

import React from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { type MarketplaceProduct } from "@/components/marketplace/types";
import { RazorpayPayButton } from "@/components/modules/payments/razorpay-pay-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCropImage } from "@/lib/asset-mapping";
import { DashboardSkeleton } from "@/components/sidebar/dashboard-skeleton";
import { motion } from "framer-motion";
import { Truck, Calendar, ArrowRight, Trash2, Package, Clock, XCircle, ShoppingCart, CheckCircle2, User, Phone } from "lucide-react";
import { ClientAnimationWrapper } from "@/components/ui/preloader/ClientAnimationWrapper";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function BuyerOrdersPage() {
  const { user, isLoaded } = useUser();
  
  const orders = useQuery(api.orders.getBuyerOrders, 
    isLoaded && user?.id ? { clerkId: user.id } : "skip"
  );
  const deleteOrder = useMutation(api.orders.deleteOrder);
  const clearHistory = useMutation(api.orders.clearOrderHistory);

  if (!isLoaded || orders === undefined) {
    return <DashboardSkeleton />;
  }

  const handleDelete = async (e: React.MouseEvent, orderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteOrder({ orderId: orderId as Id<"orders"> });
      toast.success("Record removed from history");
    } catch (error) {
      toast.error("Failed to remove record");
    }
  };

  const handleClearAll = async () => {
    if (!user?.id) return;
    try {
      await clearHistory({ clerkId: user.id });
      toast.success("Rental history cleared");
    } catch (error) {
      toast.error("Failed to clear history");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered": return <CheckCircle2 className="size-4 text-emerald-500" />;
      case "cancelled": return <XCircle className="size-4 text-red-500" />;
      case "shipped": return <Package className="size-4 text-blue-500" />;
      default: return <Clock className="size-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-emerald-100/50 pb-8">
        <div className="space-y-2">
          <Badge variant="outline" className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 font-bold mb-2 uppercase tracking-tighter text-[10px]">Ledger v2.0</Badge>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white">My Rentals</h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium tracking-tight text-lg">Manage and track your booked equipment rentals.</p>
        </div>
        
        {orders.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="rounded-2xl border-red-100 bg-red-50/50 text-red-600 hover:bg-red-100 hover:text-red-700 font-bold transition-all gap-2 px-6">
                <Trash2 className="size-4" />
                Clear Rental History
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-black">Purge Ledger?</AlertDialogTitle>
                <AlertDialogDescription className="font-medium text-zinc-500">
                  This will permanently remove all rental records from your view. This action is irreversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6 gap-3">
                <AlertDialogCancel className="rounded-xl font-bold border-zinc-100 h-12 text-zinc-500">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll} className="rounded-xl font-black bg-red-500 hover:bg-red-600 text-white border-none h-12 shadow-lg shadow-red-200">
                  Yes, Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <ClientAnimationWrapper>
        <div className="space-y-10">
          {orders.map((order, index: number) => (
            <Link href={`/marketplace/orders?orderId=${order._id}`} key={order._id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative cursor-pointer"
              >
                <Card className="border border-zinc-200 dark:border-zinc-800 bg-card shadow-2xl shadow-emerald-900/5 rounded-[2rem] overflow-hidden hover:shadow-emerald-900/10 transition-all duration-500 hover:bg-card/80 group/card">
                  <div className="flex flex-col md:flex-row w-full relative">
                    <div className="md:w-80 h-56 md:h-64 relative overflow-hidden shrink-0 border-r border-zinc-100 dark:border-zinc-800/50">
                       <img 
                          src={getCropImage(order.assetCategory)} 
                          className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-700 opacity-95 group-hover/card:opacity-100" 
                          alt={order.assetCategory} 
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>
                    
                    <div className="flex-1 p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-20">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black uppercase tracking-widest text-emerald-600/60 bg-emerald-50 px-2 py-1 rounded-md">Order #{order._id.slice(-6)}</span>
                          <Badge variant="outline" className="capitalize flex items-center gap-1.5 py-0.5 border-emerald-200 text-emerald-800 bg-emerald-50 font-bold">
                            {getStatusIcon(order.orderStatus)}
                            {order.orderStatus}
                          </Badge>
                        </div>
                        <h3 className="text-2xl font-black text-zinc-900">{order.assetCategory}</h3>
                        
                        {/* Owner Contact Exchange */}
                        <div className="flex flex-wrap gap-4 pt-2 border-t border-zinc-100 mt-4">
                           <div className="flex items-center gap-2 group/contact">
                              <div className="size-8 rounded-lg bg-zinc-50 flex items-center justify-center border border-zinc-100 group-hover/contact:bg-emerald-50 transition-colors">
                                 <User className="size-4 text-emerald-600" />
                              </div>
                              <div className="flex flex-col">
                                 <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Verified Owner</p>
                                 <p className="text-xs font-bold text-zinc-700">{order.farmerName}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-2 group/contact">
                              <div className="size-8 rounded-lg bg-zinc-50 flex items-center justify-center border border-zinc-100 group-hover/contact:bg-emerald-50 transition-colors">
                                 <Phone className="size-4 text-emerald-600" />
                              </div>
                              <div className="flex flex-col">
                                 <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Direct Line</p>
                                 <p className="text-xs font-bold text-zinc-700">{order.farmerPhone}</p>
                              </div>
                           </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-none border-zinc-100 dark:border-zinc-800 mt-2 sm:mt-0">
                        <div className="text-left sm:text-right shrink-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">Impact Paid</p>
                          <p className="text-2xl font-black text-zinc-950 dark:text-white">₹{(order.totalAmount / 100).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2 items-center">
                           <div className="size-12 rounded-2xl bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-xl shadow-zinc-200 dark:shadow-none">
                             <ArrowRight className="size-6" />
                           </div>
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             onClick={(e) => handleDelete(e, order._id)}
                             className="rounded-xl hover:bg-red-50 hover:text-red-500 text-zinc-300 dark:text-zinc-600 dark:hover:bg-red-500/10 transition-colors"
                           >
                             <Trash2 className="size-5" />
                           </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </Link>
          ))}
          
          {orders.length === 0 && (
            <div className="py-24 text-center bg-emerald-50/40 rounded-[3rem] border border-dashed border-emerald-200/60 mt-4 relative overflow-hidden">
               <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98110_1px,transparent_1px),linear-gradient(to_bottom,#10b98110_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
              <div className="size-24 bg-white shadow-xl shadow-emerald-900/5 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 border border-emerald-100">
                <ShoppingCart className="size-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black text-emerald-950 relative z-10">No rentals yet</h3>
              <p className="text-emerald-700/70 text-lg font-medium mb-4 relative z-10 max-w-sm mx-auto">Your booked equipment rentals will appear here.</p>
              <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 relative z-10">
                <Link href="/marketplace">Explore Equipment</Link>
              </Button>
            </div>
          )}
        </div>
      </ClientAnimationWrapper>
    </div>
  );
}
