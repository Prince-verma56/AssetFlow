import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

async function generateOwnerInsight(
  assetName: string,
  rentalCount: number,
  lifetimeEarnings: number,
  recentRentals: Array<{ renterName: string; duration: number }>
): Promise<string> {
  const systemPrompt = `You are AgriRent AI, a market intelligence advisor for agricultural equipment owners. 
Analyze asset rental history and provide actionable, concise insights.
Your response must be exactly 2 sentences, focused on pricing strategy and demand signals.
Be specific with numbers when relevant.`;

  const userPrompt = `Asset: ${assetName}
Rentals: ${rentalCount} times total
Lifetime Revenue: ₹${lifetimeEarnings.toLocaleString("en-IN")}
Recent Activity: ${recentRentals.map((r) => `${r.renterName} (${r.duration} days)`).join(", ") || "No recent rentals"}

Generate a 2-sentence market intelligence insight for the owner about pricing strategy and demand.`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-2-70b-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenRouter API error:", error);
      return `Your ${assetName} has been rented ${rentalCount} times, generating ₹${lifetimeEarnings.toLocaleString("en-IN")} in revenue. Consider optimizing your pricing based on demand trends.`;
    }

    const data: any = await response.json();
    return (
      data.choices?.[0]?.message?.content?.trim() ||
      `Your ${assetName} has been rented ${rentalCount} times, generating ₹${lifetimeEarnings.toLocaleString("en-IN")} in revenue.`
    );
  } catch (error) {
    console.error("Failed to generate AI insight:", error);
    return `Your ${assetName} has been rented ${rentalCount} times, generating ₹${lifetimeEarnings.toLocaleString("en-IN")} in revenue.`;
  }
}

async function generateRenterPricingSummary(
  assetName: string,
  days: number,
  dynamicDiscount: number,
  totalAmount: number,
  tenureDiscount = 0,
  assetAge?: number,
  escrowFee?: number,
): Promise<string> {
  const systemPrompt = `You are AgriRent AI, helping renters understand their dynamic pricing.
Write exactly 2 sentences explaining their booking and discount clearly.
Mention tenure/age discount only if it applies, and mention escrow briefly if present.
Be warm, professional, and clear.`;

  const userPrompt = `Asset: ${assetName}
Rental Duration: ${days} days
Dynamic Discount Applied: ${(dynamicDiscount * 100).toFixed(0)}%
Tenure Discount Applied: ${(tenureDiscount * 100).toFixed(0)}%
Asset Age: ${assetAge ?? 0} years
Escrow Fee: ₹${(escrowFee ?? 0).toLocaleString("en-IN")}
Total Amount: ₹${totalAmount.toLocaleString("en-IN")}

Write a 2-sentence summary about their dynamic pricing discount.`;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-2-70b-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      console.error("OpenRouter API error:", await response.json());
      return `Your ${days}-day booking for ${assetName} has been priced with the best available rental discounts today. The total of ₹${totalAmount.toLocaleString("en-IN")} includes secure escrow protection before the owner is paid.`;
    }

    const data: any = await response.json();
    return (
      data.choices?.[0]?.message?.content?.trim() ||
      `Your ${days}-day booking qualifies for smart pricing on AgriRent. The payment stays protected in escrow until return confirmation.`
    );
  } catch (error) {
    console.error("Failed to generate renter summary:", error);
    return `Your ${days}-day booking for ${assetName} has been priced with the best available rental discounts today. The payment stays protected in escrow until return confirmation.`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, assetName, rentalCount, lifetimeEarnings, recentRentals, days, dynamicDiscount, totalAmount, tenureDiscount, assetAge, escrowFee } = body;

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    let insight: string;

    if (type === "owner") {
      insight = await generateOwnerInsight(
        assetName,
        rentalCount,
        lifetimeEarnings,
        recentRentals || []
      );
    } else if (type === "renter") {
      insight = await generateRenterPricingSummary(
        assetName,
        days,
        dynamicDiscount,
        totalAmount,
        tenureDiscount,
        assetAge,
        escrowFee
      );
    } else {
      return NextResponse.json(
        { error: "Invalid AI type" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, insight });
  } catch (error) {
    console.error("Market intelligence API error:", error);
    return NextResponse.json(
      { error: "Failed to generate insight" },
      { status: 500 }
    );
  }
}
