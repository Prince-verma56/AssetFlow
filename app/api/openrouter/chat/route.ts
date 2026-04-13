import { NextResponse } from "next/server";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  messages?: ChatMessage[];
  model?: string;
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Missing OPENROUTER_API_KEY. Add it to .env.local and restart dev server.",
      },
      { status: 500 },
    );
  }

  const body = (await request.json()) as ChatRequestBody;
  const inputMessages = body.messages ?? [];
  const model = body.model || DEFAULT_MODEL;

  if (!Array.isArray(inputMessages) || inputMessages.length === 0) {
    return NextResponse.json({ error: "Please provide at least one message." }, { status: 400 });
  }

  const messages = inputMessages
    .filter((message) => Boolean(message?.content?.trim()))
    .map((message) => ({ role: message.role, content: message.content.trim() }));

  if (messages.length === 0) {
    return NextResponse.json({ error: "Message content cannot be empty." }, { status: 400 });
  }

  const upstreamResponse = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "OpenRouter Local Demo",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  const data = (await upstreamResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (!upstreamResponse.ok) {
    const errorMessage = data.error?.message || "OpenRouter request failed";
    return NextResponse.json({ error: errorMessage }, { status: upstreamResponse.status });
  }

  const reply = data.choices?.[0]?.message?.content;

  if (!reply) {
    return NextResponse.json({ error: "No reply returned from OpenRouter." }, { status: 502 });
  }

  return NextResponse.json({ reply });
}
