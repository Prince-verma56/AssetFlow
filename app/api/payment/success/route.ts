import { NextResponse } from "next/server";
import { sendBuyerReceiptEmail, sendFarmerSaleAlert } from "@/lib/mails/mails";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { buyerName, buyerEmail, crop, buyerPrice, farmerName } = body;
    const nowIso = new Date().toISOString();

    // Send successful purchase receipt via Resend
    if (buyerEmail) {
      await sendBuyerReceiptEmail({
        buyerEmail,
        buyerName: buyerName || "Buyer",
        crop: crop || "Crop",
        amount: buyerPrice || 0,
        quantity: "N/A",
        unitPricePerKg: buyerPrice || 0,
        orderId: "manual_order",
        paymentId: "manual_payment",
        gatewayOrderId: "manual_gateway_order",
        farmerName: farmerName || "Farmer",
        farmerEmail: "farmer@example.com",
        sourceLocation: "Marketplace",
        deliveryAddress: {
          street: "-",
          city: "-",
          state: "-",
          pincode: "-",
        },
        productImageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800",
        invoiceDateIso: nowIso,
      });
    }
    
    // Notify the farmer that order arrived
    await sendFarmerSaleAlert({
      farmerEmail: "farmer@example.com",
      farmerName: farmerName || "Farmer",
      crop: crop || "Crop",
      amount: buyerPrice || 0,
      buyerName: buyerName || "Buyer",
      orderId: "manual_order",
      sourceLocation: "Marketplace",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
