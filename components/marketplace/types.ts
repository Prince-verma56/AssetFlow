export type MarketplaceProduct = {
  id: string;
  crop: string;
  location: string;
  farmerName?: string;
  farmerImage?: string;
  quantity: string;
  buyerPricePerKg: number;
  localMandiPricePerKg: number;
  trustGaugeText: string;
  insight: string;
  mandiModalPrice: string;
};
