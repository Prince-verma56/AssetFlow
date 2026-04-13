"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export type QualityChecklistValue = {
  harvestDate: string;
  storageCondition: string;
  pesticideUsed: boolean;
  irrigationType: string;
  visualQuality: string;
};

export type QualityChecklistResult = {
  score: "A" | "B" | "C";
  reason: string;
  checklist: QualityChecklistValue;
};

export type QualityChecklistProps = {
  onComputed?: (result: QualityChecklistResult) => void;
};

export function QualityChecklist({ onComputed }: QualityChecklistProps) {
  const [form, setForm] = useState<QualityChecklistValue>({
    harvestDate: "",
    storageCondition: "Open Air",
    pesticideUsed: false,
    irrigationType: "Rain-fed",
    visualQuality: "Good",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QualityChecklistResult | null>(null);

  const compute = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/openrouter/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [
            {
              role: "system",
              content:
                "Given these farming conditions, rate crop quality as A, B, or C. Return only JSON: { score: 'A'|'B'|'C', reason: string }",
            },
            { role: "user", content: JSON.stringify(form) },
          ],
        }),
      });

      const data = (await response.json()) as { reply?: string };
      const parsed = data.reply ? (JSON.parse(data.reply) as { score: "A" | "B" | "C"; reason: string }) : null;
      if (parsed) {
        const payload: QualityChecklistResult = { score: parsed.score, reason: parsed.reason, checklist: form };
        setResult(payload);
        onComputed?.(payload);
      }
    } catch {
      const payload: QualityChecklistResult = {
        score: form.visualQuality === "Excellent" ? "A" : form.visualQuality === "Good" ? "B" : "C",
        reason: "Fallback scoring based on visual quality and selected farming inputs.",
        checklist: form,
      };
      setResult(payload);
      onComputed?.(payload);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quality Checklist</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label>Harvest Date</Label>
          <Input type="date" value={form.harvestDate} onChange={(e) => setForm((p) => ({ ...p, harvestDate: e.target.value }))} />
        </div>

        <div className="space-y-1">
          <Label>Storage Condition</Label>
          <Select value={form.storageCondition} onValueChange={(value) => setForm((p) => ({ ...p, storageCondition: value }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Open Air">Open Air</SelectItem>
              <SelectItem value="Covered Storage">Covered Storage</SelectItem>
              <SelectItem value="Cold Storage">Cold Storage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label>Pesticide Used</Label>
          <Switch checked={form.pesticideUsed} onCheckedChange={(checked) => setForm((p) => ({ ...p, pesticideUsed: checked }))} />
        </div>

        <div className="space-y-1">
          <Label>Irrigation Type</Label>
          <Select value={form.irrigationType} onValueChange={(value) => setForm((p) => ({ ...p, irrigationType: value }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Rain-fed">Rain-fed</SelectItem>
              <SelectItem value="Canal">Canal</SelectItem>
              <SelectItem value="Drip">Drip</SelectItem>
              <SelectItem value="Sprinkler">Sprinkler</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>Visual Quality</Label>
          <Select value={form.visualQuality} onValueChange={(value) => setForm((p) => ({ ...p, visualQuality: value }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Excellent">Excellent</SelectItem>
              <SelectItem value="Good">Good</SelectItem>
              <SelectItem value="Average">Average</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={compute} disabled={loading} className="w-full">
          {loading ? "Computing..." : "Compute Quality Score"}
        </Button>

        {result ? (
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-semibold">Quality Score: {result.score}</p>
            <p className="text-muted-foreground">{result.reason}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
