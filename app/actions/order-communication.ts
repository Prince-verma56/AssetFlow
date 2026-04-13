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
  unitLabel,
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
  unitLabel?: string;
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
    console.log(`[OrderCommunication] Sending emails for order ${orderId}`);
    const invoiceDate = new Date().toISOString();
    const resolvedProductImage = productImageUrl || getCropImage(assetCategory);

    const buyerResult = await sendBuyerReceiptEmail({
      buyerName: renterName,
      buyerEmail: renterEmail,
      crop: assetCategory,
      amount,
      quantity,
      unitPricePerKg,
      unitLabel,
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

    const farmerResult = await sendFarmerSaleAlert({
      farmerEmail: ownerEmail,
      buyerName: renterName,
      farmerName: ownerName,
      crop: assetCategory,
      amount,
      orderId,
      sourceLocation,
    });

    console.log("[OrderCommunication] Buyer receipt email:", buyerResult);
    console.log("[OrderCommunication] Farmer alert email:", farmerResult);

    return {
      success: buyerResult.success && farmerResult.success,
      buyerEmail: buyerResult,
      farmerEmail: farmerResult,
    };
  } catch (error) {
    console.error(`[OrderCommunication] Failed for order ${orderId}:`, error);
    return { success: false, error };
  }
}
