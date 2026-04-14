export type DynamicPriceBreakdown = {
  days: number;
  baseAmount: number;
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
): DynamicPriceBreakdown {
  const safeDays = Math.max(1, days);
  const baseAmount = safeDays * Math.max(0, basePricePerDay);
  const tenureDiscountRate = assetAge && assetAge > 3 ? 0.05 : 0;
  const durationDiscountRate = safeDays > 7 ? 0.1 : 0;
  const loyaltyDiscountRate = completedRentals >= 3 ? 0.03 : 0;

  const durationDiscount = baseAmount * durationDiscountRate;
  const tenureDiscount = baseAmount * tenureDiscountRate;
  const loyaltyDiscount = baseAmount * loyaltyDiscountRate;
  const totalDiscount = durationDiscount + tenureDiscount + loyaltyDiscount;
  const finalTotal = Math.max(0, baseAmount - totalDiscount);

  return {
    days: safeDays,
    baseAmount,
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
