"use client";

import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type LoadingButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "onError"> & {
  action: () => Promise<unknown> | unknown;
  loadingText?: string;
  successMessage?: string;
  errorMessage?: string;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  onError?: (error: unknown) => void;
};

export function LoadingButton({
  action,
  loadingText = "Please wait...",
  successMessage,
  errorMessage = "Something went wrong",
  showSuccessToast = false,
  showErrorToast = true,
  onError,
  children,
  disabled,
  ...buttonProps
}: LoadingButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (loading || disabled) return;

    setLoading(true);
    try {
      await action();

      if (showSuccessToast && successMessage) {
        toast.success("Success", { description: successMessage });
      }
    } catch (error) {
      if (showErrorToast) {
        toast.error("Error", { description: errorMessage });
      }
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      {...buttonProps}
      onClick={handleAction}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading ? loadingText : children}
    </Button>
  );
}

type ActionButtonProps = {
  onClick: () => Promise<unknown> | unknown;
  children: ComponentProps<typeof Button>["children"];
  successMsg?: string;
} & Omit<ComponentProps<typeof Button>, "onClick" | "onError">;

// Backward-compatible alias for existing usage.
export function ActionButton({ onClick, successMsg, ...props }: ActionButtonProps) {
  return (
    <LoadingButton
      action={onClick}
      successMessage={successMsg}
      showSuccessToast={Boolean(successMsg)}
      {...props}
    />
  );
}
