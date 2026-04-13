"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddListingForm } from "@/components/admin/add-listing-form";

export default function CreateCropPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">List a New Equipment</h1>
      <Card>
        <CardHeader>
          <CardTitle>Equipment Details</CardTitle>
          <CardDescription>Add a high-quality photo of your equipment to attract premium renters.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddListingForm />
        </CardContent>
      </Card>
    </div>
  );
}
