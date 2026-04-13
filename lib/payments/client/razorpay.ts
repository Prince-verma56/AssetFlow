"use client";

import type { PaymentCurrency, PaymentCustomer, PaymentSuccessPayload } from "@/lib/payments/types";

const RAZORPAY_SCRIPT_ID = "razorpay-checkout-sdk";
const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

type RazorpayCheckoutRequest = {
  keyId: string;
  amountInSubunits: number;
  currency: PaymentCurrency;
  gatewayOrderId: string;
  businessName: string;
  description: string;
  customer?: PaymentCustomer;
  themeColor?: string;
};

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error?: {
    description?: string;
    reason?: string;
    source?: string;
    step?: string;
    code?: string;
    metadata?: Record<string, string>;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (payload: RazorpayFailureResponse) => void) => void;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill?: PaymentCustomer;
  theme?: { color: string };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: RazorpaySuccessResponse) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let loaderPromise: Promise<void> | null = null;

export async function ensureRazorpayLoaded() {
  if (typeof window === "undefined") {
    throw new Error("Razorpay checkout can only run in browser");
  }

  if (window.Razorpay) return;
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(RAZORPAY_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay SDK")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = RAZORPAY_SCRIPT_ID;
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(script);
  });

  return loaderPromise;
}

export async function openRazorpayCheckout(
  input: RazorpayCheckoutRequest
): Promise<PaymentSuccessPayload> {
  await ensureRazorpayLoaded();

  const RazorpayCtor = window.Razorpay;
  if (!RazorpayCtor) {
    throw new Error("Razorpay SDK unavailable");
  }

  return new Promise<PaymentSuccessPayload>((resolve, reject) => {
    const instance = new RazorpayCtor({
      key: input.keyId,
      amount: input.amountInSubunits,
      currency: input.currency,
      order_id: input.gatewayOrderId,
      name: input.businessName,
      description: input.description,
      prefill: input.customer,
      theme: { color: input.themeColor ?? "#10b981" },
      modal: {
        ondismiss: () => reject(new Error("Payment popup closed")),
      },
      handler: (response) => {
        resolve({
          paymentId: response.razorpay_payment_id,
          gatewayOrderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
        });
      },
    });

    instance.on("payment.failed", (payload) => {
      const msg = payload.error?.description ?? "Payment failed";
      reject(new Error(msg));
    });

    instance.open();
  });
}
