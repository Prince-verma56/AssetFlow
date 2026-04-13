import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 }
    );
  }

  const { prompt, systemRole = "You are a helpful assistant" } = await req.json();
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: systemRole },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }, // Forces structured data for the UI
  });

  return NextResponse.json(JSON.parse(response.choices[0].message.content!));
}
