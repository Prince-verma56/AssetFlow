import { sendBuyerReceiptEmail } from "@/lib/mails/mails";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = await sendBuyerReceiptEmail(body);

    return Response.json(result);
  } catch (error) {
    console.error("[TestEmailAPI] Buyer email error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
