"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const quickReplies = ["Is this organic?", "Bulk discount?", "When harvested?", "Delivery time?"];

export type ChatDrawerProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  listingId: Id<"listings">;
  listingName: string;
  ownerName: string;
  senderId: string;
  receiverId: string;
};

export function ChatDrawer({
  open,
  onOpenChange,
  listingId,
  listingName,
  ownerName,
  senderId,
  receiverId,
}: ChatDrawerProps) {
  const messagesResult = useQuery(api.messages.getMessages, { listingId });
  const sendMessage = useMutation(api.messages.sendMessage);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  const messages = useMemo(() => (messagesResult?.success ? messagesResult.data : []), [messagesResult]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const onSend = async (value: string) => {
    const content = value.trim();
    if (!content) return;
    const result = await sendMessage({ listingId, senderId, receiverId, text: content });
    if (result.success) {
      setText("");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <span>{ownerName}</span>
            <Badge variant="outline" className="text-[10px]">
              Online
            </Badge>
          </SheetTitle>
          <SheetDescription>{listingName}</SheetDescription>
        </SheetHeader>

        <div className="flex h-[calc(100%-180px)] flex-col overflow-y-auto p-4">
          <div className="space-y-2">
            {messages.map((message) => {
              const mine = message.senderId === senderId;
              return (
                <div key={message._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        </div>

        <div className="border-t p-4">
          <div className="mb-2 flex flex-wrap gap-2">
            {quickReplies.map((reply) => (
              <Button key={reply} variant="outline" size="sm" onClick={() => onSend(reply)}>
                {reply}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your message..."
              rows={3}
            />
            <Button className="w-full" onClick={() => onSend(text)}>
              Send Message
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

