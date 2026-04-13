import { Resend } from "resend";
import { WelcomeEmail } from "@/app/features/emails/components/WelcomeEmail";
import { FarmerSaleEmail } from "@/app/features/emails/components/FarmerSaleEmail";
import { BuyerReceiptEmail } from "@/app/features/emails/components/BuyerReceiptEmail";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const defaultFrom = process.env.RESEND_FROM_EMAIL || "AssetFlow <onboarding@resend.dev>";
const recipientOverride = process.env.RESEND_EMAIL_OVERRIDE;

const resolveRecipients = (email: string) => {
  if (recipientOverride) return [recipientOverride];
  return [email];
};

type BuyerReceiptInput = {
  buyerEmail: string;
  buyerName: string;
  crop: string;
  amount: number;
  quantity: string;
  unitPricePerKg: number;
  unitLabel?: string;
  orderId: string;
  paymentId: string;
  gatewayOrderId: string;
  farmerName: string;
  farmerEmail: string;
  sourceLocation: string;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  productImageUrl: string;
  invoiceDateIso: string;
};

type FarmerAlertInput = {
  farmerEmail: string;
  farmerName: string;
  crop: string;
  amount: number;
  buyerName: string;
  orderId: string;
  sourceLocation: string;
};

export const sendWelcomeEmail = async (email: string, name: string, role: string) => {
  if (!resend) {
    console.log("[EMAIL_SERVICE] Mock Mode - Welcome Email:", { email, name, role });
    return { success: true, mocked: true };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: defaultFrom,
      to: resolveRecipients(email),
      subject: `Welcome to the Marketplace, ${name}!`,
      react: WelcomeEmail({ name, role }),
    });
    if (error || !data?.id) return { success: false, error };
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
};

export const sendFarmerSaleAlert = async ({
  farmerEmail,
  farmerName,
  crop,
  amount,
  buyerName,
  orderId,
  sourceLocation,
}: FarmerAlertInput) => {
  if (!resend) {
    console.log("[EMAIL_SERVICE] Mock Mode - Farmer Sale Alert:", {
      farmerEmail,
      farmerName,
      crop,
      amount,
      buyerName,
      orderId,
      sourceLocation,
    });
    return { success: true, mocked: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: defaultFrom,
      to: resolveRecipients(farmerEmail),
      subject: `New order received: ${crop} (#${orderId.slice(-8)})`,
      react: FarmerSaleEmail({
        ownerName: farmerName,
        equipment: crop,
        amount,
        renterName: buyerName,
        orderId,
        sourceLocation,
      }),
    });
    return { success: !error, data, error };
  } catch (e) {
    return { success: false, error: e };
  }
};

export const sendBuyerReceiptEmail = async ({
  buyerEmail,
  buyerName,
  crop,
  amount,
  quantity,
  unitPricePerKg,
  unitLabel,
  orderId,
  paymentId,
  gatewayOrderId,
  farmerName,
  farmerEmail,
  sourceLocation,
  deliveryAddress,
  productImageUrl,
  invoiceDateIso,
}: BuyerReceiptInput) => {
  if (!resend) {
    console.log("[EMAIL_SERVICE] Mock Mode - Buyer Receipt Email:", {
      buyerEmail,
      buyerName,
      crop,
      amount,
      quantity,
      orderId,
      invoiceDateIso,
    });
    return { success: true, mocked: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: defaultFrom,
      to: resolveRecipients(buyerEmail),
      subject: `Invoice ${orderId.slice(-8).toUpperCase()} • ${crop} purchase`,
      react: BuyerReceiptEmail({
        renterName: buyerName,
        equipment: crop,
        amount,
        quantity,
        unitPricePerKg,
        unitLabel,
        orderId,
        paymentId,
        gatewayOrderId,
        ownerName: farmerName,
        ownerEmail: farmerEmail,
        sourceLocation,
        deliveryAddress,
        productImageUrl,
        invoiceDateIso,
      }),
    });
    return { success: !error, data, error };
  } catch (e) {
    return { success: false, error: e };
  }
};
