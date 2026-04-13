import { NextResponse } from "next/server";
import { sendBuyerReceiptEmail, sendFarmerSaleAlert } from "@/lib/mails/mails";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { renterName, renterEmail, equipment, buyerPrice, ownerName } = body;
    const nowIso = new Date().toISOString();

    // Send successful rent receipt via Resend
    if (renterEmail) {
      await sendBuyerReceiptEmail({
        buyerEmail: renterEmail,
        buyerName: renterName || "Renter",
        crop: equipment || "Equipment",
        amount: buyerPrice || 0,
        quantity: "N/A",
        unitPricePerKg: buyerPrice || 0,
        orderId: "manual_order",
        paymentId: "manual_payment",
        gatewayOrderId: "manual_gateway_order",
        farmerName: ownerName || "Owner",
        farmerEmail: "owner@example.com",
        sourceLocation: "Marketplace",
        deliveryAddress: {
          street: "-",
          city: "-",
          state: "-",
          pincode: "-",
        },
        productImageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=equipment&q=80&w=800",
        invoiceDateIso: nowIso,
      });
    }
    
    // Notify the owner that order arrived
    await sendFarmerSaleAlert({
      farmerEmail: "owner@example.com",
      farmerName: ownerName || "Owner",
      crop: equipment || "Equipment",
      amount: buyerPrice || 0,
      buyerName: renterName || "Renter",
      orderId: "manual_order",
      sourceLocation: "Marketplace",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
