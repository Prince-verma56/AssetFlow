export type DynamicPriceBreakdown = {
  days: number;
  baseAmount: number;
  surgeAmount: number;
  surgeRate: number;
  durationDiscount: number;
  tenureDiscount: number;
  loyaltyDiscount: number;
  totalDiscount: number;
  finalTotal: number;
  durationDiscountRate: number;
  tenureDiscountRate: number;
  loyaltyDiscountRate: number;
};

export function calculateDynamicPrice(
  basePricePerDay: number,
  days: number,
  assetAge: number | null | undefined,
  completedRentals = 0,
  viewCount = 0,
): DynamicPriceBreakdown {
  const safeDays = Math.max(1, days);
  const baseAmount = safeDays * Math.max(0, basePricePerDay);

  // +15% surge if high demand (viewCount > 50)
  const surgeRate = viewCount > 50 ? 0.15 : 0;
  const surgeAmount = baseAmount * surgeRate;

  // Discounts applied to (base + surge) subtotal
  const subtotal = baseAmount + surgeAmount;
  const tenureDiscountRate = assetAge && assetAge > 3 ? 0.05 : 0;
  const durationDiscountRate = safeDays > 7 ? 0.1 : 0;
  const loyaltyDiscountRate = completedRentals >= 3 ? 0.03 : 0;

  const durationDiscount = subtotal * durationDiscountRate;
  const tenureDiscount = subtotal * tenureDiscountRate;
  const loyaltyDiscount = subtotal * loyaltyDiscountRate;
  const totalDiscount = durationDiscount + tenureDiscount + loyaltyDiscount;
  const finalTotal = Math.max(0, subtotal - totalDiscount);

  return {
    days: safeDays,
    baseAmount,
    surgeAmount,
    surgeRate,
    durationDiscount,
    tenureDiscount,
    loyaltyDiscount,
    totalDiscount,
    finalTotal,
    durationDiscountRate,
    tenureDiscountRate,
    loyaltyDiscountRate,
  };
}
