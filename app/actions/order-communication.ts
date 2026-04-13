"use server";

import { getCropImage } from "@/lib/asset-mapping";
import { sendBuyerReceiptEmail, sendFarmerSaleAlert } from "@/lib/mails/mails";

export async function processOrderCommunication({
  renterEmail,
  renterName,
  ownerEmail,
  ownerName,
  assetCategory,
  amount,
  orderId,
  paymentId,
  gatewayOrderId,
  quantity,
  unitPricePerKg,
  sourceLocation,
  deliveryAddress,
  productImageUrl,
}: {
  renterEmail: string;
  renterName: string;
  ownerEmail: string;
  ownerName: string;
  assetCategory: string;
  amount: number;
  orderId: string;
  paymentId: string;
  gatewayOrderId: string;
  quantity: string;
  unitPricePerKg: number;
  sourceLocation: string;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  productImageUrl?: string;
}) {
  try {
    const invoiceDate = new Date().toISOString();
    const resolvedProductImage = productImageUrl || getCropImage(assetCategory);

    await sendBuyerReceiptEmail({
      buyerName: renterName,
      buyerEmail: renterEmail,
      crop: assetCategory,
      amount,
      quantity,
      unitPricePerKg,
      orderId,
      paymentId,
      gatewayOrderId,
      farmerName: ownerName,
      farmerEmail: ownerEmail,
      sourceLocation,
      deliveryAddress,
      productImageUrl: resolvedProductImage,
      invoiceDateIso: invoiceDate,
    });

    await sendFarmerSaleAlert({
      farmerEmail: ownerEmail,
      buyerName: renterName,
      farmerName: ownerName,
      crop: assetCategory,
      amount,
      orderId,
      sourceLocation,
    });

    return { success: true };
  } catch (error) {
    console.error(`[OrderCommunication] Failed:`, error);
    return { success: false, error };
  }
}
