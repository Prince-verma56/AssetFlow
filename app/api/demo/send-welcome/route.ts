import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/mails/mails";

type Payload = {
  email?: string;
  name?: string;
  role?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const email = body.email?.trim();
    const name = body.name?.trim() || "Demo User";
    const role = body.role?.trim() || "Buyer";

    if (!email) {
      return NextResponse.json({ success: false, message: "Email is required." }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { success: false, message: "RESEND_API_KEY is missing in environment variables." },
        { status: 500 },
      );
    }

    const result = await sendWelcomeEmail(email, name, role);
    if (!result.success) {
      const errorMessage =
        typeof result.error === "object" && result.error !== null && "message" in result.error
          ? String((result.error as { message?: unknown }).message ?? "Failed to send email.")
          : String(result.error);

      return NextResponse.json(
        { success: false, message: errorMessage, error: result.error },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, message: `Welcome email sent to ${email}.` });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body or server error." },
      { status: 400 },
    );
  }
}
