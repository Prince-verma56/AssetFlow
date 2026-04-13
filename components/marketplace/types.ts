export type MarketplaceProduct = {
  id: string;
  equipment: string;
  location: string;
  ownerName?: string;
  ownerImage?: string;
  ownerEmail?: string;
  quantity: string;
  pricePerDay: number;
  buyerPricePerKg: number;
  localMandiPricePerDay: number;
  trustGaugeText: string;
  insight: string;
  mandiModalPrice: string;
};
