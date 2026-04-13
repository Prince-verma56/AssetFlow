"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, CheckCircle2, MapPin, Info, ArrowRight, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type MarketplaceProduct } from "@/components/marketplace/types";
import { RazorpayPayButton } from "@/components/modules/payments/razorpay-pay-button";
import dynamic from "next/dynamic";
import Link from "next/link";
import { processOrderCommunication } from "@/app/actions/order-communication";
import { getCropImage } from "@/lib/asset-mapping";

const LocationPicker = dynamic(() => import("@/components/map/location-picker"), {
  ssr: false,
  loading: () => <div className="h-48 w-full bg-zinc-100 animate-pulse rounded-[2rem] flex items-center justify-center text-xs font-bold text-zinc-400 font-app-mono">Initializing GPS...</div>
});

const STATES = [
  "Rajasthan", "Maharashtra", "Punjab", "Gujarat", "Karnataka", "Uttar Pradesh", "Madhya Pradesh"
];

const CITIES: Record<string, string[]> = {
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara"],
  "Karnataka": ["Bangalore", "Mysore", "Hubli"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior"],
};

export function CheckoutModal({ product, children }: { product: MarketplaceProduct; children: React.ReactNode }) {
  const { user } = useUser();
  const [success, setSuccess] = React.useState(false);
  const [step, setStep] = React.useState(0); // 0: Details, 1: Map, 2: Review/Pay
  
  const [address, setAddress] = React.useState({
    street: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [coords, setCoords] = React.useState({ lat: 26.9124, lng: 75.7873 });
  
  const createOrder = useMutation(api.orders.createOrder);

  const handleSuccess = async (payload: any) => {
    try {
      if (!user?.id) throw new Error("Unauthenticated check");

      const orderId = await createOrder({
        clerkId: user.id,
        listingId: product.id as any,
        totalAmount: product.buyerPricePerKg * 100,
        paymentId: payload.paymentId || `pay_${Math.random().toString(36).substring(7)}`, 
        razorpayOrderId: payload.gatewayOrderId || `order_${Math.random().toString(36).substring(7)}`, 
        quantity: "100 kg", 
        deliveryAddress: address,
        latitude: coords.lat,
        longitude: coords.lng,
      });

      await processOrderCommunication({
        buyerEmail: user?.primaryEmailAddress?.emailAddress || "buyer@example.com",
        buyerName: user?.fullName || "Buyer",
        farmerEmail: "farmer@farmdirect.ai",
        farmerName: product.location.split(',')[0], 
        cropName: product.crop,
        amount: product.buyerPricePerKg * 100,
        orderId: String(orderId),
        paymentId: payload.paymentId || "-",
        gatewayOrderId: payload.gatewayOrderId || "-",
        quantity: "100 kg",
        unitPricePerKg: product.buyerPricePerKg,
        sourceLocation: product.location,
        deliveryAddress: address,
        productImageUrl: getCropImage(product.crop),
      });

      setSuccess(true);
    } catch (error) {
      console.error(error);
    }
  };

  const isDetailsValid = address.street && address.city && address.state && address.pincode.length === 6;

  return (
    <Dialog onOpenChange={(open) => !open && !success && setStep(0)}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
        {success ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-6">
            <DialogTitle className="sr-only">Payment Successful</DialogTitle>
            <div className="size-24 bg-emerald-100 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
               <CheckCircle2 className="size-12 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Payment Secured!</h2>
              <p className="text-zinc-500 font-medium leading-relaxed">
                Your order for <span className="text-emerald-600 font-bold">{product.crop}</span> is confirmed. 
                Full logistics coordination is now active.
              </p>
            </div>
            <Button asChild className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl h-14 font-black shadow-xl transition-all">
               <Link href="/marketplace/orders">Track Shipment Progress</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col">
             <DialogTitle className="sr-only">Checkout Process - {product.crop}</DialogTitle>
             {/* Progress Header */}
             <div className="bg-zinc-50/50 p-6 border-b border-zinc-100 relative">
                <div className="flex justify-between items-center mb-6">
                   <div className="space-y-1">
                      <h2 className="text-xl font-black tracking-tight">Logistics Coordinator</h2>
                      <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Step {step + 1} of 3</p>
                   </div>
                   <div className="flex gap-1.5">
                      {[0, 1, 2].map((s) => (
                        <div 
                          key={s} 
                          className={`h-1.5 w-8 rounded-full transition-all duration-500 ${s <= step ? 'bg-emerald-500' : 'bg-zinc-200'}`} 
                        />
                      ))}
                   </div>
                </div>

                {step === 0 && (
                   <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Select State</Label>
                            <Select onValueChange={(v) => setAddress({ ...address, state: v, city: "" })} value={address.state}>
                               <SelectTrigger className="rounded-xl border-zinc-100 h-11 bg-white">
                                  <SelectValue placeholder="State" />
                               </SelectTrigger>
                               <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                                  {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                               </SelectContent>
                            </Select>
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Select City</Label>
                            <Select 
                              disabled={!address.state} 
                              onValueChange={(v) => setAddress({ ...address, city: v })} 
                              value={address.city}
                            >
                               <SelectTrigger className="rounded-xl border-zinc-100 h-11 bg-white">
                                  <SelectValue placeholder="City" />
                               </SelectTrigger>
                               <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                                  {address.state && CITIES[address.state].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                               </SelectContent>
                            </Select>
                         </div>
                      </div>

                      <div className="space-y-2">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Full Street Address</Label>
                         <Textarea 
                           placeholder="House No, Building, Landmark..." 
                           className="rounded-xl border-zinc-100 min-h-24 bg-white resize-none"
                           value={address.street}
                           onChange={(e) => setAddress({ ...address, street: e.target.value })}
                         />
                      </div>

                      <div className="space-y-2">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Pincode</Label>
                         <Input 
                           maxLength={6}
                           placeholder="6-Digit Code"
                           className="rounded-xl border-zinc-100 h-11 bg-white font-app-mono tracking-[0.2em]"
                           value={address.pincode}
                           onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, '') })}
                         />
                      </div>

                      <Button 
                        disabled={!isDetailsValid}
                        onClick={() => setStep(1)}
                        className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-xl shadow-emerald-500/10 transition-all gap-2"
                      >
                         Continue to Map Selection
                         <ArrowRight className="size-4" />
                      </Button>
                   </div>
                )}

                {step === 1 && (
                   <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                      <div className="relative h-[400px] w-full bg-zinc-100 rounded-[2rem] overflow-hidden border-2 border-zinc-50 shadow-inner">
                         <LocationPicker 
                           onLocationSelect={(lat, lng) => setCoords({ lat, lng })}
                           initialPos={coords}
                         />
                      </div>
                      <div className="flex items-start gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                         <MapPin className="size-5 text-emerald-600 mt-0.5" />
                         <div className="space-y-0.5">
                            <p className="text-xs font-black uppercase tracking-tight text-emerald-950">Precision GPS Pinning</p>
                            <p className="text-[10px] font-medium text-emerald-700/70">Click to set the exact vehicle arrival point at your farmgate.</p>
                         </div>
                      </div>

                      <div className="flex gap-4">
                         <Button variant="outline" onClick={() => setStep(0)} className="h-14 rounded-2xl px-6 border-zinc-200">
                            <ArrowLeft className="size-4" />
                         </Button>
                         <Button 
                            onClick={() => setStep(2)}
                            className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-xl transition-all"
                         >
                            Confirm GPS Location
                         </Button>
                      </div>
                   </div>
                )}

                {step === 2 && (
                   <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                      <div className="p-5 rounded-[2rem] bg-white border border-zinc-100 shadow-sm space-y-4">
                         <div className="flex justify-between items-center">
                            <div className="space-y-0.5">
                               <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Grand Total</p>
                               <p className="text-3xl font-black text-zinc-950 tracking-tighter">₹{(product.buyerPricePerKg * 100).toLocaleString()}</p>
                            </div>
                            <div className="size-16 rounded-2xl bg-emerald-50 flex items-center justify-center p-0.5 border border-emerald-100 overflow-hidden">
                               <img src={product.farmerImage || "/placeholder-farmer.png"} className="size-full object-cover rounded-xl" alt="Farmer" />
                            </div>
                         </div>
                         <div className="h-px bg-zinc-50" />
                         <div className="flex items-center gap-4">
                            <div className="size-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
                               <ShoppingCart className="size-5" />
                            </div>
                            <div className="space-y-0.5 truncate">
                               <p className="text-xs font-bold text-zinc-900">{product.crop} (100Kg)</p>
                               <p className="text-[10px] font-medium text-zinc-500 truncate">{address.city}, {address.state}</p>
                            </div>
                         </div>
                      </div>

                      <div className="flex gap-4">
                         <Button variant="outline" onClick={() => setStep(1)} className="h-14 rounded-2xl px-6 border-zinc-200">
                            <ArrowLeft className="size-4" />
                         </Button>
                         <div className="flex-1">
                           <RazorpayPayButton
                             amountInRupees={product.buyerPricePerKg * 100}
                             description={`Purchase of ${product.crop} from ${product.location}`}
                             customer={{ name: user?.fullName || "Buyer", email: user?.primaryEmailAddress?.emailAddress || "buyer@example.com" }}
                             onSuccess={handleSuccess}
                             className="w-full h-14 bg-zinc-900 hover:bg-zinc-800 text-white font-black rounded-2xl shadow-2xl transition-all"
                           >
                             Purchase & Finalize
                           </RazorpayPayButton>
                         </div>
                      </div>
                   </div>
                )}
             </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


