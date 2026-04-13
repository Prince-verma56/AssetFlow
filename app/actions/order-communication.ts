"use server";

import { getCropImage } from "@/lib/asset-mapping";
import { sendBuyerReceiptEmail, sendFarmerSaleAlert } from "@/lib/mails/mails";

export async function processOrderCommunication({
  buyerEmail,
  buyerName,
  farmerEmail,
  farmerName,
  cropName,
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
  buyerEmail: string;
  buyerName: string;
  farmerEmail: string;
  farmerName: string;
  cropName: string;
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
    const resolvedProductImage = productImageUrl || getCropImage(cropName);

    await sendBuyerReceiptEmail({
      buyerName,
      buyerEmail,
      crop: cropName,
      amount,
      quantity,
      unitPricePerKg,
      orderId,
      paymentId,
      gatewayOrderId,
      farmerName,
      farmerEmail,
      sourceLocation,
      deliveryAddress,
      productImageUrl: resolvedProductImage,
      invoiceDateIso: invoiceDate,
    });

    await sendFarmerSaleAlert({
      farmerEmail,
      buyerName,
      farmerName,
      crop: cropName,
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
