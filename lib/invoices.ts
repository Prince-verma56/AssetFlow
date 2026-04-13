export type InvoiceDetails = {
  orderId: string;
  itemName: string;
  rentalStart: string;
  rentalEnd: string;
  totalAmount: number;
};

export function buildInvoiceUrl(details: InvoiceDetails) {
  const params = new URLSearchParams({
    orderId: details.orderId,
    itemName: details.itemName,
    rentalStart: details.rentalStart,
    rentalEnd: details.rentalEnd,
    totalAmount: String(details.totalAmount),
  });

  return `/api/send-invoice?${params.toString()}`;
}
