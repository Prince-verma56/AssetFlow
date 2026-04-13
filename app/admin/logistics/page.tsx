"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useTheme } from "next-themes";
import { Flame } from "lucide-react";
import Map, {
  FullscreenControl,
  GeolocateControl,
  Layer,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
  Source,
  type LayerProps,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCropImage } from "@/lib/asset-mapping";
import { cn } from "@/lib/utils";

type MapMode = "streets" | "satellite" | "hybrid";

type ActiveOrderPoint = {
  orderId: string;
  listingId: string;
  lat: number;
  lng: number;
  renterName: string;
  renterId: string;
  renterImage?: string;
  assetCategory: string;
  quantityLabel: string;
  status: string;
  imageUrl?: string;
  deliveryAddress?: string;
};

const lineLayer: LayerProps = {
  id: "delivery-route",
  type: "line",
  paint: {
    "line-color": "#16a34a",
    "line-width": 5,
    "line-opacity": 0.95,
  },
};

const buildingsLayer: LayerProps = {
  id: "3d-buildings",
  source: "composite",
  "source-layer": "building",
  filter: ["==", "extrude", "true"],
  type: "fill-extrusion",
  minzoom: 14,
  paint: {
    "fill-extrusion-color": "#94a3b8",
    "fill-extrusion-height": ["get", "height"],
    "fill-extrusion-base": ["get", "min_height"],
    "fill-extrusion-opacity": 0.45,
  },
};

const demandHeatmapLayer: LayerProps = {
  id: "demand-heatmap",
  type: "heatmap",
  paint: {
    "heatmap-weight": ["get", "weight"],
    "heatmap-intensity": 1.2,
    "heatmap-radius": 28,
    "heatmap-opacity": 0.75,
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(255,255,255,0)",
      0.2,
      "#fde68a",
      0.4,
      "#fb923c",
      0.7,
      "#ef4444",
      1,
      "#b91c1c",
    ],
  },
};

function normalizeStatus(status: string) {
  if (status === "placed" || status === "escrow") return "In Transit";
  if (status === "shipped") return "Out for Delivery";
  if (status === "delivered") return "Delivered";
  return status;
}

function AdminLogisticsPageContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const { resolvedTheme } = useTheme();
  const mapRef = useRef<MapRef | null>(null);

  const [selected, setSelected] = useState<ActiveOrderPoint | null>(null);
  const [routeCoords, setRouteCoords] = useState<Array<[number, number]>>([]);
  const [mapMode, setMapMode] = useState<MapMode>("streets");
  const [is3D, setIs3D] = useState(false);

  const logistics = useQuery(api.orders.getActiveFarmerLogistics, user?.id ? { clerkId: user.id } : "skip");
  const demandSignals = useQuery(api.wishlist.getDemandSignals, {});

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
  const hasToken = mapToken.startsWith("pk.") && !mapToken.includes("your_token_here");

  const farmerLat = logistics?.success ? logistics.data.farmer.lat : null;
  const farmerLng = logistics?.success ? logistics.data.farmer.lng : null;
  const activeOrders: ActiveOrderPoint[] = logistics?.success
    ? logistics.data.activeOrders.map((order) => ({
        orderId: String(order.orderId),
        listingId: String(order.listingId),
        lat: order.lat,
        lng: order.lng,
        renterName: order.buyerName,
        renterId: order.buyerId,
        renterImage: order.buyerImage,
        assetCategory: order.cropName,
        quantityLabel: order.quantityLabel,
        status: order.status,
        imageUrl: order.imageUrl,
        deliveryAddress: order.deliveryAddress,
      }))
    : [];

  const selectedOrderId = searchParams.get("orderId");

  const initialCenter = useMemo(() => {
    if (selected) return { lat: selected.lat, lng: selected.lng };
    if (typeof farmerLat === "number" && typeof farmerLng === "number") {
      return { lat: farmerLat, lng: farmerLng };
    }
    if (activeOrders.length > 0) {
      return { lat: activeOrders[0].lat, lng: activeOrders[0].lng };
    }
    return { lat: 22.9734, lng: 78.6569 };
  }, [selected, farmerLat, farmerLng, activeOrders]);

  const routeGeoJson = useMemo(
    () => ({
      type: "FeatureCollection",
      features:
        routeCoords.length > 1
          ? [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: routeCoords,
                },
              },
            ]
          : [],
    }),
    [routeCoords]
  );

  const demandGeoJson = useMemo(
    () => ({
      type: "FeatureCollection",
      features: (demandSignals ?? []).map((point, index) => ({
        type: "Feature",
        id: `${point.source}-${index}`,
        properties: {
          weight: point.weight,
          source: point.source,
          label: point.label,
          renterName: point.renterName,
          assetCategory: point.assetCategory ?? "Equipment",
        },
        geometry: {
          type: "Point",
          coordinates: [point.lng, point.lat],
        },
      })),
    }),
    [demandSignals]
  );

  const mapStyle = useMemo(() => {
    if (mapMode === "satellite") return "mapbox://styles/mapbox/satellite-v9";
    if (mapMode === "hybrid") return "mapbox://styles/mapbox/satellite-streets-v12";
    return resolvedTheme === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/streets-v12";
  }, [mapMode, resolvedTheme]);

  const loadRoute = async (order: ActiveOrderPoint) => {
    setSelected(order);

    if (mapRef.current) {
      mapRef.current.flyTo({ center: [order.lng, order.lat], zoom: 12.5, duration: 900 });
    }

    if (typeof farmerLat !== "number" || typeof farmerLng !== "number") {
      setRouteCoords([[order.lng, order.lat]]);
      return;
    }

    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${farmerLng},${farmerLat};${order.lng},${order.lat}?geometries=geojson&overview=full&access_token=${mapToken}`;
      const res = await fetch(url);
      const json = (await res.json()) as {
        routes?: Array<{ geometry?: { coordinates?: Array<[number, number]> } }>;
      };
      const coordinates = json.routes?.[0]?.geometry?.coordinates;
      if (coordinates && coordinates.length > 1) {
        setRouteCoords(coordinates);
        return;
      }
    } catch {
      // fallback below
    }

    setRouteCoords([
      [farmerLng, farmerLat],
      [order.lng, order.lat],
    ]);
  };

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    if (is3D) {
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.25 });
      map.easeTo({ pitch: 58, bearing: 18, duration: 900 });
      return;
    }
    map.setTerrain(null);
    map.easeTo({ pitch: 0, bearing: 0, duration: 700 });
  }, [is3D, mapMode]);

  if (!logistics) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[65vh] w-full" />
      </div>
    );
  }

  if (!logistics.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Logistics Unavailable</CardTitle>
          <CardDescription>{logistics.error || "Unable to load logistics data."}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-none bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-amber-500/10 shadow-sm">
        <CardHeader>
          <CardTitle>Professional Logistics Tracker</CardTitle>
          <CardDescription>
            Hover or click delivery pins to inspect renter details, open live route guidance, and spot high-demand rental zones.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[70%_30%]">
        <Card className="overflow-hidden border-none shadow-lg">
          <CardContent className="p-0">
            <div className="relative h-[46vh] w-full md:h-[62vh] lg:h-[74vh]">
              {!hasToken ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Add a valid NEXT_PUBLIC_MAPBOX_TOKEN to use logistics tracking.
                </div>
              ) : (
                <Map
                  ref={mapRef}
                  mapboxAccessToken={mapToken}
                  initialViewState={{
                    latitude: initialCenter.lat,
                    longitude: initialCenter.lng,
                    zoom: 8.5,
                  }}
                  mapStyle={mapStyle}
                  style={{ width: "100%", height: "100%" }}
                >
                  <Source
                    id="mapbox-dem"
                    type="raster-dem"
                    url="mapbox://mapbox.mapbox-terrain-dem-v1"
                    tileSize={512}
                    maxzoom={14}
                  />

                  <NavigationControl position="top-right" />
                  <GeolocateControl position="top-right" />
                  <FullscreenControl position="top-right" />
                  <ScaleControl position="bottom-right" />

                  {typeof farmerLat === "number" && typeof farmerLng === "number" ? (
                    <Marker latitude={farmerLat} longitude={farmerLng}>
                      <div className="rounded-full border-2 border-white bg-teal-600 px-2 py-1 text-[10px] font-bold text-white shadow-md">
                        FARM
                      </div>
                    </Marker>
                  ) : null}

                  {activeOrders.map((order) => (
                    <Marker key={order.orderId} latitude={order.lat} longitude={order.lng} anchor="bottom">
                      <button
                        type="button"
                        onMouseEnter={() => setSelected(order)}
                        onClick={() => loadRoute(order)}
                        className={cn(
                          "group relative rounded-full border-2 border-white bg-background p-0.5 shadow-lg transition-all",
                          selected?.orderId === order.orderId ? "scale-110 ring-2 ring-emerald-500" : "hover:scale-110"
                        )}
                        title={`${order.assetCategory} -> ${order.renterName}`}
                      >
                        <div className="relative size-7">
                          <Image
                            src={order.renterImage || "/placeholder-owner.png"}
                            alt={order.renterName}
                            width={30}
                            height={30}
                            className="size-7 rounded-full object-cover"
                          />
                          <Image
                            src={order.imageUrl || getCropImage(order.assetCategory)}
                            alt={order.assetCategory}
                            width={14}
                            height={14}
                            className="absolute -bottom-1 -right-1 size-3.5 rounded-full border border-white object-cover"
                          />
                        </div>
                        <span className="absolute -right-1 -top-1 size-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                      </button>
                    </Marker>
                  ))}

                  {demandSignals && demandSignals.length > 0 ? (
                    <Source id="demand-heatmap-source" type="geojson" data={demandGeoJson as GeoJSON.FeatureCollection}>
                      <Layer {...demandHeatmapLayer} />
                    </Source>
                  ) : null}

                  {selected ? (
                    <Popup
                      latitude={selected.lat}
                      longitude={selected.lng}
                      closeOnClick={false}
                      onClose={() => setSelected(null)}
                      offset={12}
                    >
                      <div className="min-w-[230px] space-y-3 p-1">
                        <div className="flex items-center gap-2">
                          <Image
                            src={selected.renterImage || "/placeholder-owner.png"}
                            alt={selected.renterName}
                            width={34}
                            height={34}
                            className="size-8 rounded-full object-cover"
                          />
                          <div>
                            <p className="text-xs font-semibold">{selected.renterName}</p>
                            <p className="text-[11px] text-muted-foreground">Order #{selected.orderId.slice(-6)}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="rounded-md bg-muted px-2 py-1">
                            <p className="text-muted-foreground">Commodity</p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <Image
                                src={selected.imageUrl || getCropImage(selected.assetCategory)}
                                alt={selected.assetCategory}
                                width={14}
                                height={14}
                                className="size-3.5 rounded-full object-cover"
                              />
                              <p className="font-medium">{selected.assetCategory}</p>
                            </div>
                          </div>
                          <div className="rounded-md bg-muted px-2 py-1">
                            <p className="text-muted-foreground">Quantity</p>
                            <p className="font-medium">{selected.quantityLabel}</p>
                          </div>
                        </div>

                        {selected.deliveryAddress ? (
                          <p className="text-[11px] text-muted-foreground">{selected.deliveryAddress}</p>
                        ) : null}

                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 flex-1 text-[11px]" onClick={() => loadRoute(selected)}>
                            Track Route
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 flex-1 text-[11px]"
                            onClick={() => {
                              mapRef.current?.flyTo({
                                center: [selected.lng, selected.lat],
                                zoom: 14,
                                duration: 700,
                              });
                            }}
                          >
                            Focus Pin
                          </Button>
                        </div>
                      </div>
                    </Popup>
                  ) : null}

                  {is3D && mapMode !== "satellite" ? <Layer {...buildingsLayer} /> : null}

                  {routeCoords.length > 1 ? (
                    <Source id="route" type="geojson" data={routeGeoJson as GeoJSON.FeatureCollection}>
                      <Layer {...lineLayer} />
                    </Source>
                  ) : null}
                </Map>
              )}

              {hasToken ? (
                <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2 rounded-lg border bg-background/90 p-2 backdrop-blur">
                  <Button size="sm" variant={mapMode === "streets" ? "default" : "outline"} onClick={() => setMapMode("streets")}>Streets</Button>
                  <Button size="sm" variant={mapMode === "satellite" ? "default" : "outline"} onClick={() => setMapMode("satellite")}>Satellite</Button>
                  <Button size="sm" variant={mapMode === "hybrid" ? "default" : "outline"} onClick={() => setMapMode("hybrid")}>Hybrid</Button>
                  <Button size="sm" variant={is3D ? "default" : "outline"} onClick={() => setIs3D((v) => !v)}>{is3D ? "2D" : "3D"}</Button>
                </div>
              ) : null}

              <div className="absolute left-3 top-3 z-10 rounded-2xl border border-red-200 bg-white/92 p-3 shadow-lg backdrop-blur dark:border-red-900/40 dark:bg-card/90">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Flame className="size-4 text-red-500" />
                  <span>High Rental Demand Areas</span>
                </div>
                <div className="mt-3 h-2 w-40 rounded-full bg-[linear-gradient(90deg,#fde68a_0%,#fb923c_45%,#ef4444_75%,#b91c1c_100%)]" />
                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                  <span>Warm</span>
                  <span>Hot Zone</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle>Delivery Queue</CardTitle>
            <CardDescription>{activeOrders.length} active pinned destinations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active deliveries with renter map pins yet.</p>
            ) : (
              activeOrders.map((order) => (
                <button
                  type="button"
                  key={order.orderId}
                  onClick={() => loadRoute(order)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all hover:bg-accent",
                    selected?.orderId === order.orderId ? "border-emerald-500 bg-emerald-50/50" : ""
                  )}
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{order.assetCategory}</p>
                    <p className="text-xs text-muted-foreground">Renter: {order.renterName}</p>
                    <p className="text-xs text-muted-foreground">Qty: {order.quantityLabel}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {normalizeStatus(order.status)}
                  </Badge>
                </button>
              ))
            )}

            {selected ? (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => loadRoute(selected)}
              >
                Refresh In-App Route
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminLogisticsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[65vh] w-full" />}>
      <AdminLogisticsPageContent />
    </Suspense>
  );
}
