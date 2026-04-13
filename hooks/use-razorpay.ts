"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { openRazorpayCheckout } from "@/lib/payments/client/razorpay";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type {
  CreatePaymentOrderResult,
  PaymentCustomer,
  PaymentSuccessPayload,
} from "@/lib/payments/types";

type InitPaymentParams = {
  amountInRupees: number;
  description: string;
  customer?: PaymentCustomer;
  notes?: Record<string, string>;
  receipt?: string;
  businessName?: string;
  themeColor?: string;
  showDefaultToasts?: boolean;
  onSuccess?: (payload: PaymentSuccessPayload) => Promise<void> | void;
  onFailure?: (error: Error) => Promise<void> | void;
};

type EscrowCheckoutParams = {
  buyerId: string;
  farmerId: string;
  listingId: Id<"listings">;
  type: "sample" | "bulk";
  quantity: number;
  unit: string;
  totalAmount: number;
  description: string;
  deliveryAddress?: string;
  customer?: PaymentCustomer;
};

export const useRazorpay = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const createOrder = useMutation(api.orders.createOrder);
  const releaseEscrow = useMutation(api.orders.releaseEscrow);

  const initPayment = useCallback(async (params: InitPaymentParams) => {
    setIsProcessing(true);

    try {
      const response = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountInRupees: params.amountInRupees,
          notes: params.notes,
          receipt: params.receipt,
        }),
      });

      const data = (await response.json()) as Partial<CreatePaymentOrderResult> & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create payment order");
      }

      if (!data.keyId || !data.gatewayOrderId || !data.amountInSubunits || !data.currency) {
        throw new Error("Invalid payment order response");
      }

      const success = await openRazorpayCheckout({
        keyId: data.keyId,
        gatewayOrderId: data.gatewayOrderId,
        amountInSubunits: data.amountInSubunits,
        currency: data.currency,
        businessName: params.businessName ?? "Farmer Marketplace",
        description: params.description,
        customer: params.customer,
        themeColor: params.themeColor,
      });

      const verifyRes = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: success.paymentId }),
      });

      const verifyData = (await verifyRes.json()) as {
        ok?: boolean;
        error?: string;
        payment?: { status?: string };
      };

      if (!verifyRes.ok || !verifyData.ok) {
        throw new Error(
          verifyData.error ??
            "Checkout succeeded, but verification failed. Check Razorpay account and API keys."
        );
      }

      await params.onSuccess?.(success);

      if (params.showDefaultToasts !== false) {
        toast.success(`Payment successful (${verifyData.payment?.status ?? "captured"})`);
      }

      return success;
    } catch (error) {
      const resolved = error instanceof Error ? error : new Error("Payment failed");

      await params.onFailure?.(resolved);

      if (params.showDefaultToasts !== false) {
        toast.error(resolved.message);
      }

      throw resolved;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const checkoutWithEscrow = useCallback(
    async (params: EscrowCheckoutParams) => {
      const success = await initPayment({
        amountInRupees: params.totalAmount,
        description: params.description,
        customer: params.customer,
        showDefaultToasts: true,
      });

      const orderId = await createOrder({
        buyerId: params.buyerId,
        farmerId: params.farmerId,
        listingId: params.listingId,
        type: params.type,
        quantity: params.quantity,
        unit: params.unit,
        totalAmount: params.totalAmount,
        paymentId: success.paymentId,
        deliveryAddress: params.deliveryAddress,
      });

      return {
        success: true,
        data: {
          orderId,
          paymentId: success.paymentId,
          escrowReleaseAt: Date.now() + 72 * 60 * 60 * 1000,
        },
      } as const;
    },
    [createOrder, initPayment]
  );

  const confirmReceivedAndRelease = useCallback(
    async (orderId: Id<"orders">) => {
      return await releaseEscrow({ orderId, buyerConfirmed: true });
    },
    [releaseEscrow]
  );

  return { initPayment, isProcessing, checkoutWithEscrow, confirmReceivedAndRelease };
};
