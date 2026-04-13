"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function FarmerOraclePage() {
  const { user } = useUser();
  const [equipment, setCrop] = useState("Wheat");
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState("quintal");
  const [district, setDistrict] = useState("Jaipur");
  const [state, setState] = useState("Rajasthan");
  const [result, setResult] = useState<{ fairPrice: number; confidence: number; recommendation: string; reasoning: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const listings = useQuery(api.listings.getListingsByFarmer, user?.id ? { clerkId: user.id } : "skip");

  const history = useMemo(() => {
    const data = listings?.success ? listings.data : [];
    return data
      .filter((item) => typeof item.oraclePrice === "number")
      .map((item) => ({
        id: item._id,
        assetCategory: item.assetCategory,
        fairPrice: item.oraclePrice || 0,
        confidence: item.oracleConfidence || 0,
        recommendation: item.oracleRecommendation || "-",
        date: new Date(item._creationTime).toLocaleDateString(),
      }));
  }, [listings]);

  const runOracle = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/command-center?" + new URLSearchParams({ commodity: equipment, state, city: district, quantity: String(quantity), unit }));
      const json = (await response.json()) as {
        oracle?: { fairPrice: number; confidence: number; recommendation: string; reasoning: string };
      };
      if (json.oracle) {
        setResult(json.oracle);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-black">Owner Oracle</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Oracle Input</CardTitle>
            <CardDescription>Use local context to generate fair pricing guidance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Equipment</Label>
              <Input value={equipment} onChange={(e) => setCrop(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Quantity</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value || 0))} />
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>District</Label>
              <Input value={district} onChange={(e) => setDistrict(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <Button onClick={runOracle} disabled={loading} className="w-full">
              {loading ? "Running..." : "Run Oracle"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Oracle Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {result ? (
              <>
                <p>Fair Price: ₹{result.fairPrice.toFixed(0)}/quintal</p>
                <p>Confidence: {result.confidence.toFixed(0)}%</p>
                <p>Recommendation: {result.recommendation}</p>
                <p className="text-muted-foreground">{result.reasoning}</p>
              </>
            ) : (
              <p className="text-muted-foreground">Run Oracle to see results.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Oracle History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Equipment</th>
                  <th className="py-2">Fair Price</th>
                  <th className="py-2">Confidence</th>
                  <th className="py-2">Recommendation</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={String(row.id)} className="border-b">
                    <td className="py-2">{row.assetCategory}</td>
                    <td className="py-2">₹{row.fairPrice.toFixed(0)}</td>
                    <td className="py-2">{row.confidence.toFixed(0)}%</td>
                    <td className="py-2">{row.recommendation}</td>
                    <td className="py-2">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>When to use Oracle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>1. Before publishing a new listing.</p>
          <p>2. When mandi prices shift sharply in your district.</p>
          <p>3. Before negotiating large bulk orders.</p>
        </CardContent>
      </Card>
    </div>
  );
}
