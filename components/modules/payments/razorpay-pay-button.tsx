"use client";

import { LoadingButton } from "@/components/LoadingButton";
import { useRazorpay } from "@/hooks/use-razorpay";
import type { PaymentCustomer, PaymentSuccessPayload } from "@/lib/payments/types";

type RazorpayPayButtonProps = {
  amountInRupees: number;
  description: string;
  customer?: PaymentCustomer;
  notes?: Record<string, string>;
  receipt?: string;
  businessName?: string;
  themeColor?: string;
  successMessage?: string;
  onSuccess?: (payload: PaymentSuccessPayload) => Promise<void> | void;
  onFailure?: (error: Error) => Promise<void> | void;
  className?: string; // Add className
  children: React.ReactNode;
};

export function RazorpayPayButton({
  amountInRupees,
  description,
  customer,
  notes,
  receipt,
  businessName,
  themeColor,
  successMessage = "Payment completed successfully",
  onSuccess,
  onFailure,
  className,
  children,
}: RazorpayPayButtonProps) {
  const { initPayment, isProcessing } = useRazorpay();

  return (
    <LoadingButton
      action={async () => {
        await initPayment({
          amountInRupees,
          description,
          customer,
          notes,
          receipt,
          businessName,
          themeColor,
          showDefaultToasts: true,
          onSuccess,
          onFailure,
        });
      }}
      className={className}
      loadingText="Opening checkout..."
      showSuccessToast
      successMessage={successMessage}
      showErrorToast={false}
      disabled={isProcessing}
    >
      {children}
    </LoadingButton>
  );
}
