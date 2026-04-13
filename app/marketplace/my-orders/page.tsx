import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <Card className="border border-emerald-900/20 bg-gradient-to-b from-emerald-50 to-amber-50">
      <CardHeader>
        <CardTitle>My Orders</CardTitle>
        <CardDescription>My Orders module is ready for renter operations.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-emerald-900/80">This route is active and accessible from the Renter sidebar.</p>
      </CardContent>
    </Card>
  );
}
