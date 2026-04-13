import { NextResponse } from "next/server";
import { createRazorpayOrder } from "@/lib/payments/server/razorpay";
import type { CreatePaymentOrderInput } from "@/lib/payments/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<CreatePaymentOrderInput>;
    const amountInRupees = body.amountInRupees ?? 0;

    if (!Number.isFinite(amountInRupees) || amountInRupees <= 0) {
      return NextResponse.json(
        { error: "amountInRupees must be a number greater than 0" },
        { status: 400 }
      );
    }

    const order = await createRazorpayOrder({
      amountInRupees,
      currency: body.currency,
      receipt: body.receipt,
      notes: body.notes,
    });

    return NextResponse.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create payment order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
