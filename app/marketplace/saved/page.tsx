import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SavedPage() {
  return (
    <Card className="border border-emerald-900/20 bg-gradient-to-b from-emerald-50 to-amber-50">
      <CardHeader>
        <CardTitle>Saved</CardTitle>
        <CardDescription>
          Saved route is active for buyer workflows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-emerald-900/80">Wire this page to Convex reads/writes for purchasing lifecycle next.</p>
      </CardContent>
    </Card>
  );
}
