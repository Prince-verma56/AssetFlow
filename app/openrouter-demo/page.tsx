"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function OpenRouterDemoPage() {
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => !isSending && prompt.trim().length > 0, [isSending, prompt]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userMessage = prompt.trim();

    if (!userMessage) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: userMessage }];

    try {
      setIsSending(true);
      setError(null);
      setMessages(nextMessages);
      setPrompt("");

      const response = await fetch("/api/openrouter/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: nextMessages,
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok || !data.reply) {
        throw new Error(data.error || "Request failed");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply as string }]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="p-6 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>OpenRouter API Demo</CardTitle>
            <CardDescription>
              Use this page to test your OpenRouter key with a normal chat flow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  placeholder="openai/gpt-4o-mini"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Message</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Type your message here..."
                  rows={4}
                />
              </div>

              <Button type="submit" disabled={!canSend}>
                {isSending ? "Sending..." : "Send"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chat Output</CardTitle>
            <CardDescription>Conversation history from this session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">No messages yet. Send one to test your key.</p>
            )}

            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {message.role}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{message.content}</p>
              </div>
            ))}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
