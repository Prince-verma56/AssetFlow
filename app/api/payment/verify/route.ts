import { NextResponse } from "next/server";
import { fetchRazorpayPayment } from "@/lib/payments/server/razorpay";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { paymentId?: string };

    if (!body.paymentId) {
      return NextResponse.json({ error: "paymentId is required" }, { status: 400 });
    }

    const payment = await fetchRazorpayPayment(body.paymentId);

    return NextResponse.json({ ok: true, payment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment verification failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}