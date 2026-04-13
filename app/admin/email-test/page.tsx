"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";

export default function EmailTestPage() {
  const [testType, setTestType] = useState<"buyer" | "farmer">("buyer");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [formData, setFormData] = useState({
    email: "test@example.com",
    name: "Test User",
    orderId: "ORD-" + Math.random().toString(36).substring(7).toUpperCase(),
    amount: 5000,
    crop: "Cotton Picker",
    quantity: "7 days",
    sourceLocation: "Jaipur, Rajasthan",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: isNaN(Number(value)) ? value : Number(value),
    }));
  };

  const testBuyerEmail = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/test-email/buyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerEmail: formData.email,
          buyerName: formData.name,
          crop: formData.crop,
          amount: formData.amount,
          quantity: formData.quantity,
          unitPricePerKg: 100,
          orderId: formData.orderId,
          paymentId: "pay_test_" + Math.random().toString(36).substring(7),
          gatewayOrderId: "order_test_" + Math.random().toString(36).substring(7),
          farmerName: "Test Farmer",
          farmerEmail: "farmer@test.com",
          sourceLocation: formData.sourceLocation,
          deliveryAddress: {
            street: "123 Main St",
            city: "Jaipur",
            state: "Rajasthan",
            pincode: "302001",
          },
          productImageUrl: "",
          invoiceDateIso: new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          type: "success",
          message: data.mocked
            ? `✓ Email sent in mock mode (no API key). Check server logs for: [EMAIL_SERVICE] Mock Mode - Buyer Receipt Email`
            : `✓ Buyer receipt email sent successfully to ${formData.email}`,
        });
      } else {
        setResult({
          type: "error",
          message: data.error || "Failed to send buyer email",
        });
      }
    } catch (error) {
      setResult({
        type: "error",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const testFarmerEmail = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/test-email/farmer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerEmail: formData.email,
          farmerName: formData.name,
          crop: formData.crop,
          amount: formData.amount,
          buyerName: "Test Buyer",
          orderId: formData.orderId,
          sourceLocation: formData.sourceLocation,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          type: "success",
          message: data.mocked
            ? `✓ Email sent in mock mode (no API key). Check server logs for: [EMAIL_SERVICE] Mock Mode - Farmer Sale Alert`
            : `✓ Farmer alert email sent successfully to ${formData.email}`,
        });
      } else {
        setResult({
          type: "error",
          message: data.error || "Failed to send farmer email",
        });
      }
    } catch (error) {
      setResult({
        type: "error",
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="w-8 h-8 text-emerald-600" />
            Email System Test
          </h1>
          <p className="text-zinc-600">Test email delivery after payment configuration</p>
        </div>

        {/* Status Card */}
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Configuration Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-900">
                <strong>Setup Required:</strong> Add your Resend API key to <code className="bg-white px-2 py-1 rounded font-mono text-xs">.env.local</code>
                <br />
                See <code className="bg-white px-2 py-1 rounded font-mono text-xs">EMAIL_SETUP.md</code> for instructions
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-zinc-500 font-medium">API Key Status</div>
                <div className="font-mono text-xs py-1">
                  {process.env.NEXT_PUBLIC_RESEND_API_KEY ? "✓ Configured" : "⚠ Not set"}
                </div>
              </div>
              <div>
                <div className="text-zinc-500 font-medium">Sender Email</div>
                <div className="font-mono text-xs py-1">
                  {process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Form */}
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>Test Email Parameters</CardTitle>
            <CardDescription>Fill in test data to simulate a real order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Type Selection */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setTestType("buyer")}
                variant={testType === "buyer" ? "default" : "outline"}
                className={testType === "buyer" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                Buyer Receipt Email
              </Button>
              <Button
                onClick={() => setTestType("farmer")}
                variant={testType === "farmer" ? "default" : "outline"}
                className={testType === "farmer" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                Farmer Alert Email
              </Button>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Recipient Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="test@example.com"
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  {testType === "buyer" ? "Buyer Name" : "Farmer Name"}
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Test User"
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orderId" className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Order ID
                </Label>
                <Input
                  id="orderId"
                  name="orderId"
                  value={formData.orderId}
                  onChange={handleInputChange}
                  placeholder="ORD-123456"
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="crop" className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Equipment/Crop
                </Label>
                <Input
                  id="crop"
                  name="crop"
                  value={formData.crop}
                  onChange={handleInputChange}
                  placeholder="Cotton Picker"
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Amount (₹)
                </Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="5000"
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Quantity/Duration
                </Label>
                <Input
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="7 days"
                  className="rounded-lg"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="sourceLocation" className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Source Location
                </Label>
                <Input
                  id="sourceLocation"
                  name="sourceLocation"
                  value={formData.sourceLocation}
                  onChange={handleInputChange}
                  placeholder="Jaipur, Rajasthan"
                  className="rounded-lg"
                />
              </div>
            </div>

            {/* Result Message */}
            {result && (
              <div
                className={`p-4 rounded-lg flex items-start gap-3 ${
                  result.type === "success"
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                {result.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <p
                  className={`text-sm ${
                    result.type === "success" ? "text-emerald-900" : "text-red-900"
                  }`}
                >
                  {result.message}
                </p>
              </div>
            )}

            {/* Send Button */}
            <Button
              onClick={testType === "buyer" ? testBuyerEmail : testFarmerEmail}
              disabled={loading || !formData.email}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-12 rounded-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send {testType === "buyer" ? "Buyer Receipt" : "Farmer Alert"} Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-zinc-200 bg-zinc-50">
          <CardHeader>
            <CardTitle className="text-sm">How to Enable Real Email Sending</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-700">
            <ol className="list-decimal list-inside space-y-2">
              <li>Sign up at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">resend.com</a></li>
              <li>Get your API key from the Resend dashboard</li>
              <li>Update <code className="bg-white px-2 py-1 rounded font-mono text-xs">.env.local</code> with your API key</li>
              <li>Restart your development server</li>
              <li>Test emails will now send for real</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
