import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const from = process.env.RESEND_FROM_EMAIL || "AssetFlow <onboarding@resend.dev>";

function renderInvoiceHtml({
  orderId,
  itemName,
  rentalStart,
  rentalEnd,
  totalAmount,
}: {
  orderId: string;
  itemName: string;
  rentalStart: string;
  rentalEnd: string;
  totalAmount: number;
}) {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; background: #f8fafc; color: #111827; padding: 24px;">
        <div style="max-width: 640px; margin: 0 auto; background: white; border-radius: 20px; padding: 32px; border: 1px solid #e5e7eb;">
          <p style="font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #059669; font-weight: 700;">AssetFlow Invoice</p>
          <h1 style="margin: 8px 0 20px; font-size: 28px;">Rental Confirmation</h1>
          <div style="display: grid; gap: 12px; margin-bottom: 24px;">
            <div><strong>Order ID:</strong> ${orderId}</div>
            <div><strong>Item:</strong> ${itemName}</div>
            <div><strong>Rental Dates:</strong> ${new Date(rentalStart).toLocaleDateString()} to ${new Date(rentalEnd).toLocaleDateString()}</div>
            <div><strong>Total Paid:</strong> ₹${totalAmount.toFixed(2)}</div>
          </div>
          <div style="padding: 16px; border-radius: 16px; background: #ecfdf5; color: #065f46; font-weight: 600;">
            Your funds are securely held in Escrow until you confirm the return.
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    orderId: string;
    invoiceUrl: string;
    renterEmail: string;
    renterName: string;
    itemName: string;
    rentalStart: string;
    rentalEnd: string;
    totalAmount: number;
  };

  const invoiceDetails = {
    orderId: body.orderId,
    invoiceUrl: body.invoiceUrl,
    renterEmail: body.renterEmail,
    renterName: body.renterName,
    itemName: body.itemName,
    rentalStart: body.rentalStart,
    rentalEnd: body.rentalEnd,
    totalAmount: body.totalAmount,
  };

  if (!resend) {
    console.log("Email Sent to...", invoiceDetails);
    return NextResponse.json({ success: true, mocked: true });
  }

  const html = renderInvoiceHtml(invoiceDetails);
  const result = await resend.emails.send({
    from,
    to: [body.renterEmail],
    subject: `AssetFlow Invoice ${body.orderId.slice(-8).toUpperCase()}`,
    html,
  });

  console.log("Email Sent to...", invoiceDetails);

  return NextResponse.json({ success: true, data: result });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId") || "unknown";
  const itemName = searchParams.get("itemName") || "Equipment Rental";
  const rentalStart = searchParams.get("rentalStart") || new Date().toISOString();
  const rentalEnd = searchParams.get("rentalEnd") || new Date().toISOString();
  const totalAmount = Number(searchParams.get("totalAmount") || "0");

  const html = renderInvoiceHtml({
    orderId,
    itemName,
    rentalStart,
    rentalEnd,
    totalAmount,
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="AssetFlow-invoice-${orderId.slice(-8)}.html"`,
    },
  });
}
