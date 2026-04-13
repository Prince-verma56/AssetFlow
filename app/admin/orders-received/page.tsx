"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Truck, 
  MapPin, 
  ExternalLink, 
  User, 
  Phone, 
  Mail, 
  Calendar,
  Box
} from "lucide-react";
import { DashboardSkeleton } from "@/components/sidebar/dashboard-skeleton";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false }) as any;
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false }) as any;
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false }) as any;

import "leaflet/dist/leaflet.css";

export default function OrdersReceivedPage() {
  const { user, isLoaded } = useUser();
  const [markerIcon, setMarkerIcon] = React.useState<unknown>(null);
  const orders = useQuery(api.orders.getFarmerOrders, 
    isLoaded && user?.id ? { clerkId: user.id } : "skip"
  );

  React.useEffect(() => {
    let cancelled = false;

    import("leaflet").then((leaflet) => {
      if (cancelled) return;
      setMarkerIcon(
        leaflet.icon({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        })
      );
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isLoaded || orders === undefined) return <DashboardSkeleton />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 p-4 sm:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tight text-zinc-900">Orders Received</h1>
        <p className="text-zinc-500 font-medium text-lg">Manage incoming acquisitions and prioritize delivery logistics.</p>
      </div>

      <div className="grid gap-6">
        <Card className="border-none shadow-2xl shadow-zinc-200/50 rounded-[2.5rem] bg-white/70 backdrop-blur-md overflow-hidden">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="hover:bg-transparent border-zinc-100">
                <TableHead className="font-black uppercase tracking-widest text-[10px] py-6 px-8">Acquisition / Date</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-[10px]">Acquirer (Buyer)</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-[10px]">Impact Value</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-[10px]">Logistics Status</TableHead>
                <TableHead className="text-right font-black uppercase tracking-widest text-[10px] py-6 px-8">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: any) => (
                <TableRow key={order._id} className="hover:bg-zinc-50/30 transition-colors border-zinc-100">
                  <TableCell className="py-6 px-8">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-zinc-900">{order.cropName}</span>
                      <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
                        <Calendar className="size-3" />
                        {new Date(order._creationTime).toLocaleDateString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center font-black text-emerald-700 text-[10px]">
                        {order.buyerName.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                         <span className="font-bold text-sm text-zinc-900">{order.buyerName}</span>
                         <span className="text-[10px] text-zinc-400 font-medium">{order.buyerEmail}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-black text-lg text-zinc-950">₹{(order.totalAmount / 100).toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-tighter border-none",
                      order.orderStatus === "placed" ? "bg-amber-100 text-amber-700" :
                      order.orderStatus === "delivered" ? "bg-emerald-100 text-emerald-700" :
                      "bg-blue-100 text-blue-700"
                    )}>
                      {order.orderStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right py-6 px-8">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold gap-2">
                           <Truck className="size-4" />
                           Delivery Sheet
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
                        <div className="flex flex-col">
                           <div className="p-8 bg-zinc-50/50 border-b border-zinc-100 space-y-8">
                              <div className="flex justify-between items-start">
                                 <div className="space-y-1">
                                    <h2 className="text-2xl font-black tracking-tight">Delivery Manifest</h2>
                                    <p className="text-zinc-500 font-medium">Order ID: <span className="font-app-mono text-zinc-900 font-black">{order._id.slice(-8)}</span></p>
                                 </div>
                                 <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 font-black text-[10px] uppercase tracking-widest px-4 py-1.5">Verified Acquisition</Badge>
                              </div>

                              <div className="flex items-center gap-6 p-6 rounded-[2rem] bg-white border border-zinc-100 shadow-sm relative overflow-hidden group">
                                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <User className="size-20 text-zinc-900" />
                                 </div>
                                 <div className="size-20 rounded-2xl bg-emerald-50 border border-emerald-100 overflow-hidden shrink-0">
                                    {order.buyerImage ? (
                                      <img src={order.buyerImage} className="size-full object-cover" alt={order.buyerName} />
                                    ) : (
                                      <div className="size-full flex items-center justify-center font-black text-emerald-600 text-2xl uppercase">
                                         {order.buyerName.charAt(0)}
                                      </div>
                                    )}
                                 </div>
                                 <div className="flex-1 space-y-2">
                                    <div className="flex flex-col">
                                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/60">Acquirer Profile</p>
                                       <h3 className="text-xl font-black text-zinc-900 leading-tight">{order.buyerName}</h3>
                                    </div>
                                    <div className="flex gap-4">
                                       <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-100">
                                          <Mail className="size-3 text-zinc-400" />
                                          {order.buyerEmail}
                                       </div>
                                       <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-100">
                                          <Phone className="size-3 text-zinc-400" />
                                          {order.buyerPhone}
                                       </div>
                                    </div>
                                 </div>
                              </div>

                              <div className="grid grid-cols-2 gap-6">
                                 <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Destination Point</p>
                                    <div className="p-5 rounded-[2rem] bg-white border border-zinc-100 shadow-sm flex items-start gap-3">
                                       <MapPin className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                                       <p className="text-sm font-bold text-zinc-700 leading-relaxed">
                                          {order.deliveryAddress?.street},<br/>
                                          {order.deliveryAddress?.city}, {order.deliveryAddress?.state} - <span className="font-app-mono">{order.deliveryAddress?.pincode}</span>
                                       </p>
                                    </div>
                                 </div>
                                 <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Acquisition Metrics</p>
                                    <div className="p-5 rounded-[2rem] bg-zinc-950 text-white shadow-xl flex items-center justify-between overflow-hidden relative">
                                       <div className="absolute bottom-0 right-0 opacity-10 blur-xl size-20 bg-emerald-400 rounded-full" />
                                       <div className="space-y-0.5 relative z-10">
                                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">{order.cropName}</p>
                                          <p className="text-2xl font-black tracking-tight">₹{(order.totalAmount / 100).toLocaleString()}</p>
                                       </div>
                                       <Badge className="bg-emerald-500 text-white border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 relative z-10">
                                          Paid
                                       </Badge>
                                    </div>
                                 </div>
                              </div>
                           </div>
                           
                           <div className="p-8 space-y-6">
                              <div className="relative h-[300px] w-full rounded-[2.5rem] overflow-hidden border-2 border-zinc-50 shadow-2xl z-0">
                                 {/* @ts-ignore */}
                                 <MapContainer 
                                    center={[order.latitude || 26.9124, order.longitude || 75.7873]} 
                                    zoom={15} 
                                    className="size-full z-0"
                                    style={{ height: '300px', width: '100%' }}
                                 >
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    {order.latitude && order.longitude && (
                                       /* @ts-ignore */
                                       <Marker position={[order.latitude, order.longitude] as any} icon={markerIcon} />
                                    )}
                                 </MapContainer>
                              </div>

                              <div className="flex gap-4">
                                 <Button asChild className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-xl transition-all gap-2">
                                    <a 
                                      href={`https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`} 
                                      target="_blank" 
                                      rel="noreferrer"
                                    >
                                       <ExternalLink className="size-4" />
                                       Open In Google Maps
                                    </a>
                                 </Button>
                                 <Button variant="outline" className="h-14 rounded-2xl px-6 border-zinc-200 text-zinc-500 font-bold">
                                    Download PDF Sheet
                                 </Button>
                              </div>
                           </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                       <div className="size-16 bg-zinc-50 rounded-full flex items-center justify-center">
                          <Box className="size-8 text-zinc-300" />
                       </div>
                       <div className="space-y-1">
                          <p className="text-lg font-bold text-zinc-900">No Orders Processed</p>
                          <p className="text-zinc-500 text-sm font-medium">Acquisitions from the marketplace will appear here automatically.</p>
                       </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

