import Razorpay from "razorpay";
import type {
  CreatePaymentOrderInput,
  CreatePaymentOrderResult,
  PaymentCurrency,
} from "@/lib/payments/types";

const DEFAULT_CURRENCY: PaymentCurrency = "INR";

function getRazorpayServerConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay env keys are missing");
  }

  return { keyId, keySecret };
}

function toSubunits(amountInRupees: number) {
  return Math.round(amountInRupees * 100);
}

function getClient() {
  const { keyId, keySecret } = getRazorpayServerConfig();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

type RazorpayOrderLike = {
  id: string;
  amount: number;
  currency: string;
};

type RazorpayPaymentLike = {
  id: string;
  order_id: string;
  status: string;
  amount: number;
  currency: string;
};

export async function createRazorpayOrder(
  input: CreatePaymentOrderInput
): Promise<CreatePaymentOrderResult> {
  const { keyId } = getRazorpayServerConfig();
  const currency = input.currency ?? DEFAULT_CURRENCY;
  const amountInSubunits = toSubunits(input.amountInRupees);

  if (!Number.isFinite(amountInSubunits) || amountInSubunits <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const receipt = input.receipt ?? `rcpt_${Date.now()}`;
  const notes = input.notes ?? {};

  const order = (await getClient().orders.create({
    amount: amountInSubunits,
    currency,
    receipt,
    notes,
  })) as RazorpayOrderLike;

  return {
    gateway: "razorpay",
    keyId,
    gatewayOrderId: order.id,
    amountInSubunits: order.amount,
    currency: order.currency as PaymentCurrency,
  };
}

export async function fetchRazorpayPayment(paymentId: string) {
  if (!paymentId) {
    throw new Error("paymentId is required");
  }

  const payment = (await getClient().payments.fetch(paymentId)) as RazorpayPaymentLike;

  return {
    paymentId: payment.id,
    gatewayOrderId: payment.order_id,
    status: payment.status,
    amountInSubunits: payment.amount,
    currency: payment.currency as PaymentCurrency,
  };
}