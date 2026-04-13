export const CROP_IMAGES: Record<string, string> = {
  Wheat: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=800",
  Mustard: "https://images.unsplash.com/photo-1596434449176-324021200230?auto=format&fit=crop&q=80&w=800",
  Rice: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800",
  Paddy: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800",
  Cotton: "https://images.unsplash.com/photo-1594904351111-a072f80b1a71?auto=format&fit=crop&q=80&w=800",
  Soybean: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=800",
  Onion: "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=800",
  Tomato: "https://images.unsplash.com/photo-1518977676601-b53f02bad67b?auto=format&fit=crop&q=80&w=800",
  Potato: "https://images.unsplash.com/photo-1518977676601-b53f02bad67b?auto=format&fit=crop&q=80&w=800",
  Default: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800",
};

export function getCropImage(cropName: string): string {
  const normalized = Object.keys(CROP_IMAGES).find(k => cropName.toLowerCase().includes(k.toLowerCase()));
  return normalized ? CROP_IMAGES[normalized] : CROP_IMAGES.Default;
}
