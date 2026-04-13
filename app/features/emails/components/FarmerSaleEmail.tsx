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
  Link,
} from "@react-email/components";

type FarmerSaleEmailProps = {
  farmerName: string;
  crop: string;
  amount: number;
  buyerName: string;
  orderId: string;
  sourceLocation: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

export function FarmerSaleEmail({
  farmerName,
  crop,
  amount,
  buyerName,
  orderId,
  sourceLocation,
}: FarmerSaleEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`New order #${orderId.slice(-8)} for your ${crop}`}</Preview>
      <Body style={{ backgroundColor: "#f3f4f6", margin: 0, padding: "24px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "24px" }}>
          <Section>
            <Heading style={{ margin: "0 0 10px", color: "#14532d" }}>New Order Received</Heading>
            <Text style={{ margin: 0, color: "#111827" }}>Hello {farmerName},</Text>
            <Text style={{ margin: "10px 0 0", color: "#374151", lineHeight: "22px" }}>
              <strong>{buyerName}</strong> has placed a confirmed order for <strong>{crop}</strong>.
            </Text>
          </Section>

          <Section style={{ marginTop: "16px", backgroundColor: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px" }}>
            <Text style={{ margin: 0, color: "#166534", fontWeight: 700 }}>Order Value: {formatCurrency(amount)}</Text>
            <Text style={{ margin: "6px 0 0", color: "#166534" }}>Order ID: {orderId}</Text>
            <Text style={{ margin: "6px 0 0", color: "#166534" }}>Pickup Origin: {sourceLocation}</Text>
          </Section>

          <Hr style={{ borderColor: "#e5e7eb", margin: "18px 0" }} />

          <Text style={{ margin: 0, color: "#374151" }}>
            Open your dashboard to manage packaging and dispatch:
            {" "}
            <Link href="https://farmdirect.com/admin/orders">https://farmdirect.com/admin/orders</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
