import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Hr,
  Img,
  Link,
  Row,
  Column,
} from "@react-email/components";

type BuyerReceiptEmailProps = {
  renterName: string;
  equipment: string;
  amount: number;
  quantity: string;
  unitPricePerKg: number;
  orderId: string;
  paymentId: string;
  gatewayOrderId: string;
  ownerName: string;
  ownerEmail: string;
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const formatDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function BuyerReceiptEmail({
  renterName,
  equipment,
  amount,
  quantity,
  unitPricePerKg,
  orderId,
  paymentId,
  gatewayOrderId,
  ownerName,
  ownerEmail,
  sourceLocation,
  deliveryAddress,
  productImageUrl,
  invoiceDateIso,
}: BuyerReceiptEmailProps) {
  const invoiceId = `FD-${orderId.slice(-8).toUpperCase()}`;
  const shippingAddress = [
    deliveryAddress.street,
    deliveryAddress.city,
    deliveryAddress.state,
    deliveryAddress.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Html>
      <Head />
      <Preview>{`Invoice ${invoiceId} for your ${equipment} rent`}</Preview>
      <Body style={{ backgroundColor: "#f3f4f6", margin: 0, padding: "24px 0" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            maxWidth: "680px",
            overflow: "hidden",
          }}
        >
          <Section style={{ backgroundColor: "#14532d", padding: "22px 28px" }}>
            <Text style={{ color: "#86efac", margin: 0, fontSize: "12px", letterSpacing: "0.6px" }}>
              FARMDIRECT TAX INVOICE
            </Text>
            <Heading style={{ color: "#ffffff", margin: "8px 0 0", fontSize: "22px" }}>
              Rent Confirmed
            </Heading>
          </Section>

          <Section style={{ padding: "24px 28px 16px" }}>
            <Text style={{ margin: 0, fontSize: "16px", color: "#111827" }}>Hi {renterName},</Text>
            <Text style={{ margin: "8px 0 0", color: "#374151", lineHeight: "22px" }}>
              Thank you for your order. Your payment was captured successfully, and your invoice is ready.
            </Text>
          </Section>

          <Section style={{ padding: "0 28px 18px" }}>
            <Row>
              <Column style={{ width: "65%", verticalAlign: "top", paddingRight: "12px" }}>
                <Section style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" }}>
                  <Text style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Invoice ID</Text>
                  <Text style={{ margin: "4px 0 8px", fontSize: "16px", color: "#111827", fontWeight: 700 }}>
                    {invoiceId}
                  </Text>
                  <Text style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Issued on</Text>
                  <Text style={{ margin: "4px 0 0", color: "#111827" }}>{formatDate(invoiceDateIso)}</Text>
                </Section>
              </Column>
              <Column style={{ width: "35%", verticalAlign: "top" }}>
                <Img
                  src={productImageUrl}
                  alt={equipment}
                  width="180"
                  height="120"
                  style={{
                    width: "100%",
                    height: "120px",
                    borderRadius: "12px",
                    objectFit: "cover",
                    border: "1px solid #e5e7eb",
                  }}
                />
              </Column>
            </Row>
          </Section>

          <Section style={{ padding: "0 28px 4px" }}>
            <Text style={{ margin: 0, color: "#111827", fontSize: "14px", fontWeight: 700 }}>Order Summary</Text>
          </Section>
          <Section style={{ padding: "8px 28px 0" }}>
            <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left" style={{ fontSize: "12px", color: "#6b7280", paddingBottom: "10px" }}>Item</th>
                  <th align="left" style={{ fontSize: "12px", color: "#6b7280", paddingBottom: "10px" }}>Qty</th>
                  <th align="right" style={{ fontSize: "12px", color: "#6b7280", paddingBottom: "10px" }}>Rate</th>
                  <th align="right" style={{ fontSize: "12px", color: "#6b7280", paddingBottom: "10px" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ borderTop: "1px solid #e5e7eb", padding: "12px 0", color: "#111827" }}>{equipment}</td>
                  <td style={{ borderTop: "1px solid #e5e7eb", padding: "12px 0", color: "#111827" }}>{quantity}</td>
                  <td align="right" style={{ borderTop: "1px solid #e5e7eb", padding: "12px 0", color: "#111827" }}>
                    {formatCurrency(unitPricePerKg)}/kg
                  </td>
                  <td align="right" style={{ borderTop: "1px solid #e5e7eb", padding: "12px 0", color: "#111827", fontWeight: 700 }}>
                    {formatCurrency(amount)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} align="right" style={{ borderTop: "1px solid #e5e7eb", padding: "12px 0", color: "#374151" }}>
                    Total Paid
                  </td>
                  <td align="right" style={{ borderTop: "1px solid #e5e7eb", padding: "12px 0", color: "#166534", fontWeight: 800 }}>
                    {formatCurrency(amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={{ padding: "14px 28px 0" }}>
            <Row>
              <Column style={{ width: "50%", verticalAlign: "top", paddingRight: "12px" }}>
                <Text style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>From (Supplier)</Text>
                <Text style={{ margin: "6px 0 0", color: "#111827", fontWeight: 600 }}>{ownerName}</Text>
                <Text style={{ margin: "4px 0 0", color: "#374151" }}>{sourceLocation}</Text>
                <Text style={{ margin: "4px 0 0", color: "#374151" }}>{ownerEmail}</Text>
              </Column>
              <Column style={{ width: "50%", verticalAlign: "top" }}>
                <Text style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Ship To (Renter)</Text>
                <Text style={{ margin: "6px 0 0", color: "#111827", fontWeight: 600 }}>{renterName}</Text>
                <Text style={{ margin: "4px 0 0", color: "#374151", lineHeight: "20px" }}>{shippingAddress}</Text>
              </Column>
            </Row>
          </Section>

          <Section style={{ padding: "16px 28px 0" }}>
            <Text style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Payment Details</Text>
            <Text style={{ margin: "6px 0 0", color: "#111827" }}>Order ID: {orderId}</Text>
            <Text style={{ margin: "4px 0 0", color: "#111827" }}>Payment ID: {paymentId}</Text>
            <Text style={{ margin: "4px 0 0", color: "#111827" }}>Gateway Order ID: {gatewayOrderId}</Text>
            <Text style={{ margin: "4px 0 0", color: "#111827" }}>Payment Method: Razorpay</Text>
          </Section>

          <Hr style={{ borderColor: "#e5e7eb", margin: "18px 28px" }} />

          <Section style={{ padding: "0 28px 26px" }}>
            <Text style={{ margin: 0, color: "#6b7280", fontSize: "12px", lineHeight: "18px" }}>
              Need help with your order? Write to us at <Link href="mailto:support@farmdirect.ai">support@farmdirect.ai</Link>.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
