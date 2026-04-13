"use client";

import React, { useState } from "react";
import {
  MapContainer as RLMapContainer,
  TileLayer as RLTileLayer,
  Marker as RLMarker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MapContainer = RLMapContainer as unknown as React.ComponentType<{
  center: [number, number];
  zoom: number;
  scrollWheelZoom?: boolean;
  className?: string;
  children?: React.ReactNode;
}>;

const TileLayer = RLTileLayer as unknown as React.ComponentType<{
  url: string;
  attribution?: string;
}>;

const Marker = RLMarker as unknown as React.ComponentType<{
  position: [number, number];
  icon?: unknown;
}>;

// Fix Leaflet marker icon issue in Next.js
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialPos?: { lat: number; lng: number };
}

function MapEvents({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: { latlng: { lat: number; lng: number } }) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({ onLocationSelect, initialPos }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number]>(
    initialPos ? [initialPos.lat, initialPos.lng] : [26.9124, 75.7873]
  );

  const handleSelect = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onLocationSelect(lat, lng);
  };

  return (
    <div className="size-full rounded-[2rem] overflow-hidden border-2 border-emerald-50/50 shadow-inner group relative">
      <MapContainer
        center={position}
        zoom={13}
        scrollWheelZoom={false}
        className="size-full z-0 h-48 md:h-64"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={markerIcon} />
        <MapEvents onLocationSelect={handleSelect} />
      </MapContainer>
      <div className="absolute top-3 right-3 z-40 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-100 pointer-events-none">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Click to set Pin</p>
      </div>
    </div>
  );
}
