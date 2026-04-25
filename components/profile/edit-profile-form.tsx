"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { MapPin, ShieldCheck, UserRound, ArrowRightLeft } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { FileUpload } from "@/components/modules/uploads/FileUploads";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { RoleSelectionModal } from "./role-selection-modal";

const LocationPicker = dynamic(() => import("@/components/map/location-picker"), { ssr: false });

const profileSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name."),
  avatarUrl: z.string().optional(),
  phoneNumber: z.string().optional(),
  cityRegion: z.string().optional(),
  bio: z.string().max(280, "Keep your bio under 280 characters.").optional(),
  address: z.string().optional(),
  primaryUseCase: z.string().optional(),
  businessName: z.string().optional(),
  pickupLat: z.number().nullable(),
  pickupLng: z.number().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type EditProfileFormProps = {
  role: "farmer" | "buyer";
};

export function EditProfileForm({ role }: EditProfileFormProps) {
  const { user } = useUser();
  const profile = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip");
  const updateProfile = useMutation(api.users.updateProfile);
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [roleModalOpen, setRoleModalOpen] = React.useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      avatarUrl: "",
      phoneNumber: "",
      cityRegion: "",
      bio: "",
      address: "",
      primaryUseCase: "",
      businessName: "",
      pickupLat: null,
      pickupLng: null,
    },
  });

  React.useEffect(() => {
    if (!profile?.data) return;
    const nextAvatar = profile.data.avatarUrl ?? "";
    setAvatarUrl(nextAvatar);
    form.reset({
      fullName: profile.data.name ?? "",
      avatarUrl: nextAvatar,
      phoneNumber: profile.data.phoneNumber ?? "",
      cityRegion: profile.data.cityRegion ?? "",
      bio: profile.data.bio ?? "",
      address: profile.data.address ?? "",
      primaryUseCase: profile.data.primaryUseCase ?? "",
      businessName: profile.data.businessName ?? "",
      pickupLat: profile.data.pickupLocation?.lat ?? null,
      pickupLng: profile.data.pickupLocation?.lng ?? null,
    });
  }, [form, profile]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!user?.id) {
      toast.error("Not authenticated. Please sign in.");
      return;
    }

    const result = await updateProfile({
      clerkId: user.id,
      fullName: values.fullName,
      avatarUrl: avatarUrl || undefined,
      phoneNumber: values.phoneNumber || undefined,
      cityRegion: values.cityRegion || undefined,
      bio: values.bio || undefined,
      address: values.address || undefined,
      primaryUseCase: role === "buyer" ? values.primaryUseCase || undefined : undefined,
      businessName: role === "farmer" ? values.businessName || undefined : undefined,
      pickupLocation:
        role === "farmer" && values.pickupLat !== null && values.pickupLng !== null
          ? { lat: values.pickupLat, lng: values.pickupLng }
          : undefined,
    });

    if (!result.success) {
      toast.error(result.error ?? "Could not save profile.");
      return;
    }

    toast.success("Profile updated successfully.");
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
          {role === "farmer" ? "Owner Settings" : "Renter Settings"}
        </p>
        <h1 className="text-4xl font-black tracking-tight">Profile and account details</h1>
        <p className="font-medium text-muted-foreground">
          Keep your public profile current so bookings, pickups, and trust signals stay accurate.
        </p>
      </div>

      <form className="grid gap-6 lg:grid-cols-[340px_1fr]" onSubmit={onSubmit}>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-5 text-primary" />
              Avatar & Trust
            </CardTitle>
            <CardDescription>Upload a clear profile image and review your account status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FileUpload value={avatarUrl} onChange={setAvatarUrl} onRemove={() => setAvatarUrl("")} />

            <div className="rounded-3xl border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4 text-primary" />
                Verification snapshot
              </div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>KYC: {profile?.data?.kycVerified ? "Verified" : "Pending review"}</p>
                <p>Joined: {profile?.data?.joinedAt ? new Date(profile.data.joinedAt).toLocaleDateString() : "Recently"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Editable profile</CardTitle>
            <CardDescription>These details shape how other people see and contact you on AssetFlow.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" {...form.register("fullName")} />
                <p className="text-xs text-destructive">{form.formState.errors.fullName?.message}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input id="phoneNumber" {...form.register("phoneNumber")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cityRegion">City / Region</Label>
                <Input id="cityRegion" {...form.register("cityRegion")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...form.register("address")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Short Bio</Label>
              <Textarea id="bio" rows={4} {...form.register("bio")} />
            </div>

            {role === "buyer" ? (
              <div className="space-y-2">
                <Label htmlFor="primaryUseCase">Primary Use Case</Label>
                <Input id="primaryUseCase" placeholder="Farming, Construction, DIY..." {...form.register("primaryUseCase")} />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input id="businessName" placeholder="Optional" {...form.register("businessName")} />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-primary" />
                    <Label>Pickup Location</Label>
                  </div>
                  <div className="overflow-hidden rounded-3xl border">
                    <LocationPicker
                      initialPos={
                        form.watch("pickupLat") !== null && form.watch("pickupLng") !== null
                          ? { lat: form.watch("pickupLat") as number, lng: form.watch("pickupLng") as number }
                          : undefined
                      }
                      onLocationSelect={(lat, lng) => {
                        form.setValue("pickupLat", lat);
                        form.setValue("pickupLng", lng);
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {form.watch("pickupLat") !== null && form.watch("pickupLng") !== null
                      ? `Pinned at ${form.watch("pickupLat")?.toFixed(4)}, ${form.watch("pickupLng")?.toFixed(4)}`
                      : "Tap the map to pin a pickup point for logistics routing."}
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Role Switching Section */}
      <Card className="border-border/70 bg-gradient-to-br from-emerald-50/50 to-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-5 text-primary" />
            Switch Role
          </CardTitle>
          <CardDescription>
            Change your role anytime to move between owner and renter workspaces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Currently using: <span className="font-semibold text-foreground">{role === "farmer" ? "Farm Owner" : "Equipment Renter"}</span>
          </p>
          <Button
            type="button"
            onClick={() => setRoleModalOpen(true)}
            variant="outline"
            className="border-emerald-200 hover:bg-emerald-100/50 hover:border-emerald-300"
          >
            <ArrowRightLeft className="size-4 mr-2" />
            Change Role
          </Button>
        </CardContent>
      </Card>

      {/* Role Selection Modal */}
      <RoleSelectionModal
        open={roleModalOpen}
        onOpenChange={setRoleModalOpen}
        currentRole={role}
      />
    </div>
  );
}
