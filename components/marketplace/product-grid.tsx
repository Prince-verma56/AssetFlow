"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCropImage } from "@/lib/asset-mapping";
import { MapPin, Gauge, ShoppingCart, Clock } from "lucide-react";
import { CheckoutModal } from "./checkout-modal";
import { type MarketplaceProduct } from "./types";
import Image from "next/image";
import { format } from "date-fns";

type ProductGridProps = {
  products: MarketplaceProduct[];
};

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <Card className="border border-emerald-900/20 bg-emerald-50/60">
        <CardContent className="py-12 text-center">
          <p className="text-lg font-medium text-emerald-900">No matching products available right now.</p>
          <p className="text-sm text-emerald-900/70">Try searching for a different equipment or mandi city.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
      {products.map((product, index) => {
        // PHASE 5: Check if asset is currently rented
        const nextAvailableDate = (product as any).nextAvailableDate;
        const isRented = nextAvailableDate && nextAvailableDate > Date.now();
        const availableDate = isRented ? new Date(nextAvailableDate) : null;

        return (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="break-inside-avoid"
          >
            <Card className="group overflow-hidden border-none bg-white/70 backdrop-blur-md shadow-sm hover:shadow-xl transition-all duration-300">
              <div className={`relative aspect-4/3 overflow-hidden ${isRented ? "grayscale opacity-75" : ""}`}>
                <Image 
                  src={getCropImage(product.equipment)} 
                  alt={product.equipment}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-3 left-3">
                  <Badge className="bg-emerald-500/90 hover:bg-emerald-600 text-white border-none backdrop-blur-md">
                    {product.trustGaugeText}
                  </Badge>
                </div>
              </div>
              
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-bold text-zinc-900">{product.equipment}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      {product.ownerImage ? (
                        <img src={product.ownerImage} alt={product.ownerName} className="size-4 rounded-full object-cover" />
                      ) : (
                        <div className="size-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[8px] uppercase">
                          {product.ownerName?.charAt(0) || "F"}
                        </div>
                      )}
                      <span className="font-medium text-zinc-700">{product.ownerName}</span>
                      <span className="text-zinc-300 mx-1">•</span>
                      <MapPin className="size-3" />
                      {product.location}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-emerald-600">₹{product.pricePerDay.toFixed(2)}<span className="text-xs font-normal text-zinc-500">/day</span></p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-0 space-y-4">
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Gauge className="size-3.5 text-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Renter Trust Gauge</span>
                  </div>
                  <p className="text-sm text-zinc-600 leading-relaxed italic">
                    &ldquo;{product.insight}&rdquo;
                  </p>
                </div>
                
                <div className="flex items-center justify-between text-xs text-zinc-500 font-medium px-1">
                  <span>Stock: {product.quantity}</span>
                  <span>Mandi: {product.mandiModalPrice}</span>
                </div>
              </CardContent>

              <CardFooter className="p-4 pt-0">
                {isRented && availableDate ? (
                  <Button
                    disabled
                    className="w-full bg-amber-500/20 text-amber-700 border border-amber-300 hover:bg-amber-500/20 font-bold py-6 rounded-2xl gap-2 cursor-not-allowed"
                  >
                    <Clock className="size-4" />
                    ⏱️ Rented until {format(availableDate, "MMM dd")}
                  </Button>
                ) : (
                  <CheckoutModal product={product}>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] gap-2">
                      <ShoppingCart className="size-4" />
                      Request to Rent
                    </Button>
                  </CheckoutModal>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        );
      })}
    </section>
  );
}
