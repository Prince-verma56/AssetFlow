import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingPage() {
  return (
    <Card className="border border-emerald-900/20 bg-gradient-to-b from-emerald-50 to-amber-50">
      <CardHeader>
        <CardTitle>Billing</CardTitle>
        <CardDescription>
          Billing route is active for renter workflows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-emerald-900/80">Wire this page to Convex reads/writes for renting lifecycle next.</p>
      </CardContent>
    </Card>
  );
}
