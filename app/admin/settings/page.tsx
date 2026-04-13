import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <Card className="bg-card/50 backdrop-blur-md border border-primary/10">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>
          Settings workspace is active. Connect this page to Convex data next for full owner and renter workflows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">This route is now wired and ready for feature implementation.</p>
      </CardContent>
    </Card>
  );
}
