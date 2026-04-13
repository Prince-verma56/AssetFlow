"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  Fullscreen,
  LocateFixed,
  MapPinned,
  Mountain,
  Minus,
  Navigation,
  Plus,
  Radar,
  Satellite,
  Sparkles,
  Truck,
} from "lucide-react";
import Map, {
  Layer,
  Marker,
  Popup,
  Source,
  type LayerProps,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MapMode = "streets" | "satellite" | "hybrid";
type RouteMode = "driving" | "cycling";

const renterHeatmapLayer: LayerProps = {
  id: "available-equipment-heatmap",
  type: "heatmap",
  paint: {
    "heatmap-weight": 1,
    "heatmap-intensity": 1,
    "heatmap-radius": 24,
    "heatmap-opacity": 0.62,
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(255,255,255,0)",
      0.25,
      "#c7f9cc",
      0.5,
      "#74c69d",
      0.75,
      "#2d6a4f",
      1,
      "#1b4332",
    ],
  },
};

const ownerDemandLayer: LayerProps = {
  id: "owner-demand-heatmap",
  type: "heatmap",
  paint: {
    "heatmap-weight": ["get", "weight"],
    "heatmap-intensity": 1,
    "heatmap-radius": 28,
    "heatmap-opacity": 0.58,
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(255,255,255,0)",
      0.25,
      "#fef08a",
      0.5,
      "#fb923c",
      0.75,
      "#ef4444",
      1,
      "#991b1b",
    ],
  },
};

const routeLayer: LayerProps = {
  id: "journey-route",
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
  minzoom: 13,
  paint: {
    "fill-extrusion-color": "#94a3b8",
    "fill-extrusion-height": ["get", "height"],
    "fill-extrusion-base": ["get", "min_height"],
    "fill-extrusion-opacity": 0.42,
  },
};

type RouteSnapshot = {
  coordinates: Array<[number, number]>;
  distanceKm: number;
  etaMinutes: number;
};

function interpolatePoint(points: Array<[number, number]>, progress: number) {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0];
  const scaled = progress * (points.length - 1);
  const lower = Math.floor(scaled);
  const upper = Math.min(points.length - 1, lower + 1);
  const mix = scaled - lower;
  const start = points[lower];
  const end = points[upper];
  return [
    start[0] + (end[0] - start[0]) * mix,
    start[1] + (end[1] - start[1]) * mix,
  ] as [number, number];
}

export function MapboxHub() {
  const { user } = useUser();
  const mapRef = React.useRef<MapRef | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const profile = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip");
  const role = profile?.data?.role ?? "buyer";
  const listings = useQuery(api.listings.getAvailableMapListings, role !== "farmer" ? { limit: 120 } : "skip");
  const logistics = useQuery(api.orders.getActiveFarmerLogistics, role === "farmer" && user?.id ? { clerkId: user.id } : "skip");
  const demandSignals = useQuery(api.wishlist.getDemandSignals, role === "farmer" ? {} : "skip");

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [mapMode, setMapMode] = React.useState<MapMode>("streets");
  const [routeMode, setRouteMode] = React.useState<RouteMode>("driving");
  const [isTerrain, setIsTerrain] = React.useState(false);
  const [route, setRoute] = React.useState<RouteSnapshot | null>(null);
  const [vehicleProgress, setVehicleProgress] = React.useState(0);
  const [isJourneyRunning, setIsJourneyRunning] = React.useState(false);

  const mapToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
  const hasToken = mapToken.startsWith("pk.");

  const renterPins = listings ?? [];
  const ownerPins =
    logistics?.success
      ? logistics.data.activeOrders.map((order) => ({
          id: String(order.orderId),
          lat: order.lat,
          lng: order.lng,
          title: order.cropName,
          renterName: order.buyerName,
          status: order.status,
          quantityLabel: order.quantityLabel,
          imageUrl: order.imageUrl,
        }))
      : [];

  const renterHeatmapData = React.useMemo(
    () =>
      ({
        type: "FeatureCollection",
        features: renterPins.map((pin, index) => ({
          type: "Feature",
          id: `available-${index}`,
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [pin.lng, pin.lat],
          },
        })),
      }) as GeoJSON.FeatureCollection,
    [renterPins]
  );

  const ownerDemandData = React.useMemo(
    () =>
      ({
        type: "FeatureCollection",
        features: (demandSignals ?? []).map((point, index) => ({
          type: "Feature",
          id: `${point.source}-${index}`,
          properties: { weight: point.weight },
          geometry: {
            type: "Point",
            coordinates: [point.lng, point.lat],
          },
        })),
      }) as GeoJSON.FeatureCollection,
    [demandSignals]
  );

  const routeData = React.useMemo(
    () =>
      ({
        type: "FeatureCollection",
        features:
          route && route.coordinates.length > 1
            ? [
                {
                  type: "Feature",
                  properties: {},
                  geometry: {
                    type: "LineString",
                    coordinates: route.coordinates,
                  },
                },
              ]
            : [],
      }) as GeoJSON.FeatureCollection,
    [route]
  );

  const selectedRenterPin = renterPins.find((pin) => pin.id === selectedId) ?? null;
  const selectedOwnerPin = ownerPins.find((pin) => pin.id === selectedId) ?? null;

  const initialCenter =
    role === "farmer" && logistics?.success && logistics.data.activeOrders[0]
      ? { latitude: logistics.data.activeOrders[0].lat, longitude: logistics.data.activeOrders[0].lng, zoom: 5.6 }
      : renterPins[0]
        ? { latitude: renterPins[0].lat, longitude: renterPins[0].lng, zoom: 4.8 }
        : { latitude: 22.9734, longitude: 78.6569, zoom: 4.6 };

  const mapStyle = React.useMemo(() => {
    if (mapMode === "satellite") return "mapbox://styles/mapbox/satellite-v9";
    if (mapMode === "hybrid") return "mapbox://styles/mapbox/satellite-streets-v12";
    return "mapbox://styles/mapbox/streets-v12";
  }, [mapMode]);

  React.useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (isTerrain) {
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.22 });
      map.easeTo({ pitch: 60, bearing: 16, duration: 800 });
    } else {
      map.setTerrain(null);
      map.easeTo({ pitch: 0, bearing: 0, duration: 700 });
    }
  }, [isTerrain, mapMode]);

  React.useEffect(() => {
    if (!isJourneyRunning || !route) return;
    const timer = window.setInterval(() => {
      setVehicleProgress((current) => {
        const next = current + 0.03;
        if (next >= 1) {
          window.clearInterval(timer);
          setIsJourneyRunning(false);
          return 1;
        }
        return next;
      });
    }, 350);

    return () => window.clearInterval(timer);
  }, [isJourneyRunning, route]);

  const ownerOrigin =
    logistics?.success && logistics.data.farmer.lat !== null && logistics.data.farmer.lng !== null
      ? [logistics.data.farmer.lng, logistics.data.farmer.lat] as [number, number]
      : null;

  const fetchRoute = React.useCallback(
    async (target: { lng: number; lat: number }) => {
      if (!ownerOrigin || !hasToken) return;

      const url = `https://api.mapbox.com/directions/v5/mapbox/${routeMode}/${ownerOrigin[0]},${ownerOrigin[1]};${target.lng},${target.lat}?geometries=geojson&overview=full&steps=true&access_token=${mapToken}`;
      const response = await fetch(url);
      const data = (await response.json()) as {
        routes?: Array<{
          distance?: number;
          duration?: number;
          geometry?: { coordinates?: Array<[number, number]> };
        }>;
      };
      const firstRoute = data.routes?.[0];
      const coords = firstRoute?.geometry?.coordinates ?? [];
      if (coords.length < 2) return;

      setRoute({
        coordinates: coords,
        distanceKm: Number(((firstRoute?.distance ?? 0) / 1000).toFixed(1)),
        etaMinutes: Math.max(1, Math.round((firstRoute?.duration ?? 0) / 60)),
      });
      setVehicleProgress(0);
      setIsJourneyRunning(false);
    },
    [hasToken, mapToken, ownerOrigin, routeMode]
  );

  React.useEffect(() => {
    if (role === "farmer" && selectedOwnerPin) {
      void fetchRoute(selectedOwnerPin);
    }
  }, [fetchRoute, role, selectedOwnerPin]);

  const vehiclePosition = route ? interpolatePoint(route.coordinates, vehicleProgress) : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Map Hub</p>
        <h1 className="text-4xl font-black tracking-tight">Mapbox logistics engine</h1>
        <p className="font-medium text-muted-foreground">
          {role === "farmer"
            ? "Track pickup and delivery journeys with route intelligence and demand overlays."
            : "Discover where equipment stock is concentrated and book directly from the map."}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div ref={containerRef} className="relative h-[72vh] min-h-[500px] w-full">
              {!hasToken ? (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  Add a valid `NEXT_PUBLIC_MAPBOX_TOKEN` to enable the live map hub.
                </div>
              ) : (
                <Map
                  ref={mapRef}
                  initialViewState={initialCenter}
                  mapboxAccessToken={mapToken}
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

                  {role !== "farmer" && !selectedRenterPin && renterPins.length > 0 ? (
                    <Source id="available-equipment-heatmap" type="geojson" data={renterHeatmapData}>
                      <Layer {...renterHeatmapLayer} />
                    </Source>
                  ) : null}

                  {role === "farmer" && demandSignals && demandSignals.length > 0 ? (
                    <Source id="owner-demand" type="geojson" data={ownerDemandData}>
                      <Layer {...ownerDemandLayer} />
                    </Source>
                  ) : null}

                  {route ? (
                    <Source id="journey-route" type="geojson" data={routeData}>
                      <Layer {...routeLayer} />
                    </Source>
                  ) : null}

                  {isTerrain && mapMode !== "satellite" ? <Layer {...buildingsLayer} /> : null}

                  {role === "farmer" && ownerOrigin ? (
                    <Marker latitude={ownerOrigin[1]} longitude={ownerOrigin[0]}>
                      <div className="rounded-full border-2 border-white bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground shadow-lg">
                        OWNER
                      </div>
                    </Marker>
                  ) : null}

                  {role === "farmer"
                    ? ownerPins.map((pin) => (
                        <Marker key={pin.id} latitude={pin.lat} longitude={pin.lng} anchor="bottom">
                          <button type="button" onClick={() => setSelectedId(pin.id)} className="relative" aria-label={pin.title}>
                            <span className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-primary/25" />
                            <span className="relative inline-flex size-5 rounded-full border-2 border-white bg-primary shadow-lg" />
                          </button>
                        </Marker>
                      ))
                    : renterPins.map((pin) => (
                        <Marker key={pin.id} latitude={pin.lat} longitude={pin.lng} anchor="bottom">
                          <button
                            type="button"
                            onClick={() => setSelectedId(pin.id)}
                            className="inline-flex size-5 rounded-full border-2 border-white bg-primary shadow-lg"
                            aria-label={pin.title}
                          />
                        </Marker>
                      ))}

                  {vehiclePosition ? (
                    <Marker latitude={vehiclePosition[1]} longitude={vehiclePosition[0]} anchor="bottom">
                      <div className="rounded-full bg-foreground p-2 text-background shadow-lg">
                        <Truck className="size-4" />
                      </div>
                    </Marker>
                  ) : null}

                  {selectedRenterPin ? (
                    <Popup latitude={selectedRenterPin.lat} longitude={selectedRenterPin.lng} onClose={() => setSelectedId(null)} offset={12}>
                      <div className="min-w-[220px] space-y-3 p-1">
                        {selectedRenterPin.imageUrl ? (
                          <div className="relative h-28 overflow-hidden rounded-xl">
                            <Image src={selectedRenterPin.imageUrl} alt={selectedRenterPin.title} fill className="object-cover" />
                          </div>
                        ) : null}
                        <div>
                          <p className="font-semibold">{selectedRenterPin.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedRenterPin.location} • ₹{Math.round(selectedRenterPin.pricePerDay)}/day
                          </p>
                        </div>
                        <Button asChild size="sm" className="w-full">
                          <Link href="/marketplace">Book Now</Link>
                        </Button>
                      </div>
                    </Popup>
                  ) : null}

                  {selectedOwnerPin ? (
                    <Popup latitude={selectedOwnerPin.lat} longitude={selectedOwnerPin.lng} onClose={() => setSelectedId(null)} offset={12}>
                      <div className="space-y-2 p-1">
                        <p className="font-semibold">{selectedOwnerPin.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedOwnerPin.renterName} • {selectedOwnerPin.quantityLabel}
                        </p>
                        <Badge variant="outline">{selectedOwnerPin.status}</Badge>
                      </div>
                    </Popup>
                  ) : null}
                </Map>
              )}

              {hasToken ? (
                <>
                  <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2 rounded-2xl border bg-background/85 p-2 shadow-sm backdrop-blur">
                    <Button size="sm" variant={mapMode === "streets" ? "default" : "outline"} onClick={() => setMapMode("streets")}>Streets</Button>
                    <Button size="sm" variant={mapMode === "satellite" ? "default" : "outline"} onClick={() => setMapMode("satellite")}>
                      <Satellite className="mr-1 size-3.5" />
                      Satellite
                    </Button>
                    <Button size="sm" variant={mapMode === "hybrid" ? "default" : "outline"} onClick={() => setMapMode("hybrid")}>Hybrid</Button>
                    <Button size="sm" variant={isTerrain ? "default" : "outline"} onClick={() => setIsTerrain((current) => !current)}>
                      <Mountain className="mr-1 size-3.5" />
                      3D Terrain
                    </Button>
                  </div>

                  <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-2 rounded-2xl border bg-background/85 p-2 shadow-sm backdrop-blur">
                    <Button size="icon-sm" variant="outline" onClick={() => mapRef.current?.zoomIn()}>
                      <Plus className="size-4" />
                    </Button>
                    <Button size="icon-sm" variant="outline" onClick={() => mapRef.current?.zoomOut()}>
                      <Minus className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={() => {
                        if (!containerRef.current) return;
                        void containerRef.current.requestFullscreen?.();
                      }}
                    >
                      <Fullscreen className="size-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={() => {
                        navigator.geolocation?.getCurrentPosition((position) => {
                          mapRef.current?.flyTo({
                            center: [position.coords.longitude, position.coords.latitude],
                            zoom: 11,
                            duration: 700,
                          });
                        });
                      }}
                    >
                      <LocateFixed className="size-4" />
                    </Button>
                  </div>
                </>
              ) : null}

              {role === "farmer" && route ? (
                <div className="absolute left-3 bottom-3 z-10 max-w-sm rounded-[1.75rem] border border-white/20 bg-background/65 p-4 shadow-xl backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Journey HUD</p>
                      <p className="mt-1 text-lg font-bold">Live route guidance</p>
                    </div>
                    <Navigation className="size-5 text-primary" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Mode</p>
                      <p className="font-semibold capitalize">{routeMode}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">ETA</p>
                      <p className="font-semibold">{route.etaMinutes} mins</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Distance</p>
                      <p className="font-semibold">{route.distanceKm} km</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant={routeMode === "driving" ? "default" : "outline"} onClick={() => setRouteMode("driving")}>
                      Driving
                    </Button>
                    <Button size="sm" variant={routeMode === "cycling" ? "default" : "outline"} onClick={() => setRouteMode("cycling")}>
                      Cycling
                    </Button>
                    <Button size="sm" className="ml-auto" onClick={() => { setVehicleProgress(0); setIsJourneyRunning(true); }}>
                      Start Journey
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {role === "farmer" ? <Sparkles className="size-4 text-primary" /> : <MapPinned className="size-4 text-primary" />}
                {role === "farmer" ? "Track Mode" : "Find Mode"}
              </CardTitle>
              <CardDescription>
                {role === "farmer"
                  ? "Route from your pickup base to the active renter in real time."
                  : "Explore equipment clusters and jump into booking from the map."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {role === "farmer" ? (
                <>
                  <p>{ownerPins.length} active logistics pins detected.</p>
                  <p>{(demandSignals ?? []).length} demand signals are informing the owner heat layer.</p>
                </>
              ) : (
                <>
                  <p>{renterPins.length} available assets are currently plotted.</p>
                  <p>The green heatmap appears when you are browsing stock density without a selected asset.</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radar className="size-4 text-primary" />
                Live feed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(role === "farmer" ? ownerPins : renterPins).slice(0, 6).map((pin) => (
                <button
                  key={pin.id}
                  type="button"
                  onClick={() => setSelectedId(pin.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-colors hover:bg-muted/50",
                    selectedId === pin.id ? "border-primary/40 bg-primary/5" : ""
                  )}
                >
                  <div>
                    <p className="font-medium">{pin.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {"renterName" in pin ? pin.renterName : pin.location}
                    </p>
                  </div>
                  <Badge variant="outline">{role === "farmer" ? "Track" : "View"}</Badge>
                </button>
              ))}

              {(role === "farmer" ? ownerPins : renterPins).length === 0 ? (
                <div className="rounded-3xl border border-dashed p-6 text-center">
                  <p className="font-semibold">No live map data yet</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The map will populate as soon as assets or active rentals have location data attached.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
