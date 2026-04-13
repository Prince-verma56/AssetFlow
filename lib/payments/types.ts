export type PaymentCurrency = "INR";

export type PaymentGateway = "razorpay";

export type PaymentCustomer = {
  name?: string;
  email?: string;
  contact?: string;
};

export type CreatePaymentOrderInput = {
  amountInRupees: number;
  currency?: PaymentCurrency;
  receipt?: string;
  notes?: Record<string, string>;
};

export type CreatePaymentOrderResult = {
  gateway: PaymentGateway;
  keyId: string;
  gatewayOrderId: string;
  amountInSubunits: number;
  currency: PaymentCurrency;
};

export type PaymentSuccessPayload = {
  paymentId: string;
  gatewayOrderId: string;
  signature: string;
};
