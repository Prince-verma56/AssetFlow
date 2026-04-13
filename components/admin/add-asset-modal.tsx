"use client";

import * as React from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { UploadCloud, Loader2, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { ASSET_CATEGORIES } from "@/lib/constants/categories";
import { MANDI_COORDINATES, MANDI_MARKET_OPTIONS, MANDI_STATE_OPTIONS } from "@/lib/agmarknet";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const ConditionSchema = z.enum(["Like New", "Excellent", "Good", "Fair"]);

const BaseAssetSchema = z.object({
  imageUrl: z.union([z.literal(""), z.string().url()]).default(""),
  title: z.string().min(3),
  categoryId: z.string().min(1),
  subCategoryId: z.string().min(1),
  pricePerDay: z.number().min(50),
  minDays: z.number().min(1).default(1),
  condition: ConditionSchema,
  description: z.string().max(500),
});

const AddAssetSchema = BaseAssetSchema.extend({
  unitsAvailable: z.number().int().min(1),
  purchaseYear: z.number().int().min(1980).max(new Date().getFullYear()).default(new Date().getFullYear()),
  state: z.string().min(1),
  city: z.string().min(1),
});

type AddAssetValues = z.input<typeof AddAssetSchema>;

function formatCategoryLabel(categoryId: string, subCategoryId: string) {
  const category = ASSET_CATEGORIES.find((c) => c.id === categoryId);
  const sub = category?.subCategories.find((s) => s.id === subCategoryId);
  if (!category) return "Equipment";
  if (!sub) return category.name;
  return `${category.name} - ${sub.name}`;
}

export function AddAssetModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { user, isLoaded } = useUser();
  const createListing = useMutation(api.listings.createListing);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [isDragging, setIsDragging] = React.useState(false);
  const dragDepthRef = React.useRef(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = React.useState<string>("");
  const previousPreviewRef = React.useRef<string>("");

  const form = useForm<AddAssetValues>({
    resolver: zodResolver(AddAssetSchema),
    defaultValues: {
      imageUrl: "",
      title: "",
      categoryId: "",
      subCategoryId: "",
      pricePerDay: 500,
      minDays: 1,
      condition: "Good",
      description: "",
      unitsAvailable: 1,
      purchaseYear: new Date().getFullYear(),
      state: "Rajasthan",
      city: "Jaipur",
    },
    mode: "onChange",
  });

  const categoryId = form.watch("categoryId");
  const subCategoryId = form.watch("subCategoryId");
  const state = form.watch("state");
  const city = form.watch("city");
  const imageUrl = form.watch("imageUrl");
  const description = form.watch("description");

  const selectedCategory = React.useMemo(() => ASSET_CATEGORIES.find((c) => c.id === categoryId), [categoryId]);
  const cityOptions = React.useMemo(() => MANDI_MARKET_OPTIONS[state] ?? [], [state]);
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const canUpload = Boolean(cloudName && uploadPreset);

  React.useEffect(() => {
    form.setValue("subCategoryId", "", { shouldDirty: true, shouldValidate: true });
  }, [categoryId, form]);

  React.useEffect(() => {
    if (!selectedCategory) return;
    const sub = selectedCategory.subCategories.find((s) => s.id === subCategoryId);
    if (!sub) return;
    form.setValue("pricePerDay", sub.basePrice, { shouldDirty: true, shouldValidate: true });
  }, [form, selectedCategory, subCategoryId]);

  React.useEffect(() => {
    if (previousPreviewRef.current && previousPreviewRef.current !== localPreviewUrl) {
      URL.revokeObjectURL(previousPreviewRef.current);
    }
    previousPreviewRef.current = localPreviewUrl;
    return () => {
      if (previousPreviewRef.current) URL.revokeObjectURL(previousPreviewRef.current);
      previousPreviewRef.current = "";
    };
  }, [localPreviewUrl]);

  const ensureCloudinaryConfig = () => {
    if (!cloudName) {
      toast.error("Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
      return false;
    }
    if (!uploadPreset) {
      toast.error("Missing NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET");
      return false;
    }
    return true;
  };

  const uploadFileDirectly = async (file: File) => {
    if (!ensureCloudinaryConfig()) return;
    setIsUploading(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(previewUrl);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset!);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { secure_url?: string; error?: { message?: string } };
      if (!response.ok || !data.secure_url) {
        throw new Error(data.error?.message ?? "Cloudinary upload failed");
      }

      form.setValue("imageUrl", data.secure_url, { shouldDirty: true, shouldValidate: true });
      toast.success("Image uploaded");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
      setLocalPreviewUrl("");
    } finally {
      setIsUploading(false);
      setIsDragging(false);
      dragDepthRef.current = 0;
    }
  };

  const onDragEnter: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const onDragLeave: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragging(false);
    }
  };

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await uploadFileDirectly(file);
  };

  const submit = async (values: AddAssetValues) => {
    if (!isLoaded || !user?.id) {
      toast.error("You must be logged in to list an asset.");
      return;
    }
    if (isUploading) {
      toast.error("Please wait for the image upload to finish.");
      return;
    }

    try {
      const coords = MANDI_COORDINATES[values.city] || MANDI_COORDINATES[values.state] || { lat: 26.9124, lng: 75.7873 };
      await createListing({
        clerkId: user.id,
        title: values.title,
        assetCategory: formatCategoryLabel(values.categoryId, values.subCategoryId),
        categoryId: values.categoryId,
        subCategoryId: values.subCategoryId,
        description: values.description,
        pricePerDay: values.pricePerDay,
        quantity: `${values.unitsAvailable} Units`,
        stockQuantity: values.unitsAvailable,
        minimumRentalDays: values.minDays ?? 1,
        purchaseYear: values.purchaseYear,
        condition: values.condition,
        location: `${values.city}, ${values.state}`,
        imageUrl: values.imageUrl ? values.imageUrl : undefined,
        approxLat: coords.lat,
        approxLng: coords.lng,
      });
      toast.success("Asset Listed Successfully!");
      onOpenChange(false);
      form.reset();
      setLocalPreviewUrl("");
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to list asset.";
      toast.error(message);
    }
  };

  const disabled = form.formState.isSubmitting || isUploading;
  const shouldShowError = <K extends keyof AddAssetValues>(key: K) =>
    Boolean(form.formState.errors[key]) && (form.formState.submitCount > 0 || form.formState.touchedFields[key]);
  const effectivePreviewUrl = imageUrl || localPreviewUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/60 backdrop-blur-sm"
        className="w-full max-w-[calc(100%-2rem)] p-0 sm:max-w-2xl overflow-hidden rounded-2xl border-[0.5px] border-border/40 bg-popover text-popover-foreground shadow-2xl"
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl font-black tracking-tight">Add New Equipment</DialogTitle>
          <p className="text-sm text-muted-foreground">Upload media, set pricing, and publish instantly to the marketplace.</p>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(submit)} className="grid gap-6">
          <div className="max-h-[70vh] overflow-y-auto px-6 pb-24">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Equipment Photo (Optional)</Label>
                <div
                  onClick={() => {
                    if (!canUpload) return;
                    fileInputRef.current?.click();
                  }}
                  onDragEnter={onDragEnter}
                  onDragLeave={onDragLeave}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  className={cn(
                    "relative cursor-pointer rounded-2xl border-2 border-dashed p-6 transition-all",
                    dragDepthRef.current > 0 || isDragging
                      ? "border-primary bg-primary/5 shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]"
                      : "border-border/60 bg-muted/30 hover:bg-muted/40",
                    !canUpload ? "opacity-80" : null,
                    isUploading ? "pointer-events-none opacity-80" : null
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!canUpload}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      await uploadFileDirectly(file);
                      e.target.value = "";
                    }}
                  />

                  {effectivePreviewUrl ? (
                    <div className="grid gap-4 sm:grid-cols-[160px_1fr] items-start">
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/50 bg-muted">
                        <Image src={effectivePreviewUrl} alt="Asset preview" fill className="object-cover" sizes="160px" />
                        {isUploading ? (
                          <div className="absolute inset-0 grid place-items-center bg-background/50 backdrop-blur-sm">
                            <Loader2 className="size-6 animate-spin" />
                          </div>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">{imageUrl ? "Photo ready" : "Uploading..."}</p>
                            <p className="text-xs text-muted-foreground">Click to replace the image.</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              form.setValue("imageUrl", "", { shouldDirty: true, shouldValidate: true });
                              setLocalPreviewUrl("");
                            }}
                            disabled={isUploading}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                        {imageUrl ? <p className="text-xs text-muted-foreground break-all">{imageUrl}</p> : null}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-background border border-border/50">
                        {isUploading ? <Loader2 className="size-5 animate-spin" /> : <UploadCloud className="size-5 text-muted-foreground" />}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{isUploading ? "Uploading..." : "Drag & drop a photo here"}</p>
                        <p className="text-xs text-muted-foreground">
                          {canUpload
                            ? "Or click to browse. JPG/PNG recommended."
                            : "Cloudinary is not configured yet. You can still publish this listing without an image."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Title</Label>
                  <Input
                    placeholder='e.g., "Mahindra 475 DI Tractor"'
                    value={form.watch("title")}
                    onChange={(e) => form.setValue("title", e.target.value, { shouldDirty: true, shouldValidate: true })}
                    className="h-11 rounded-xl"
                  />
                  {shouldShowError("title") ? <p className="text-xs text-red-400">{form.formState.errors.title?.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label>Daily Price</Label>
                  <div className="flex items-center rounded-xl border border-border/60 bg-muted/30 px-3">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      min={50}
                      step="1"
                      value={Number.isFinite(form.watch("pricePerDay")) ? String(form.watch("pricePerDay")) : ""}
                      onChange={(e) => form.setValue("pricePerDay", Number(e.target.value || 0), { shouldDirty: true, shouldValidate: true })}
                      className="h-11 border-0 bg-transparent px-2 focus-visible:ring-0"
                    />
                    <span className="text-xs text-muted-foreground">/ day</span>
                  </div>
                  {shouldShowError("pricePerDay") ? <p className="text-xs text-red-400">{form.formState.errors.pricePerDay?.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label>Stock Quantity</Label>
                  <div className="flex items-center rounded-xl border border-border/60 bg-muted/30 px-3">
                    <Input
                      type="number"
                      min={1}
                      step="1"
                      value={String(form.watch("unitsAvailable"))}
                      onChange={(e) =>
                        form.setValue("unitsAvailable", Number(e.target.value || 0), { shouldDirty: true, shouldValidate: true })
                      }
                      className="h-11 border-0 bg-transparent px-0 focus-visible:ring-0"
                    />
                    <span className="text-xs text-muted-foreground">Units</span>
                  </div>
                  {shouldShowError("unitsAvailable") ? (
                    <p className="text-xs text-red-400">{form.formState.errors.unitsAvailable?.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Purchase Year</Label>
                  <Input
                    type="number"
                    min={1980}
                    max={new Date().getFullYear()}
                    value={String(form.watch("purchaseYear"))}
                    onChange={(e) =>
                      form.setValue("purchaseYear", Number(e.target.value || new Date().getFullYear()), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    className="h-11 rounded-xl"
                  />
                  {shouldShowError("purchaseYear") ? (
                    <p className="text-xs text-red-400">{form.formState.errors.purchaseYear?.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={categoryId}
                    onValueChange={(val) => form.setValue("categoryId", val, { shouldDirty: true, shouldValidate: true })}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {shouldShowError("categoryId") ? <p className="text-xs text-red-400">{form.formState.errors.categoryId?.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label>Sub-category</Label>
                  <Select
                    value={subCategoryId}
                    onValueChange={(val) => form.setValue("subCategoryId", val, { shouldDirty: true, shouldValidate: true })}
                    disabled={!selectedCategory}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder={selectedCategory ? "Select sub-category" : "Select category first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCategory?.subCategories.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {shouldShowError("subCategoryId") ? (
                    <p className="text-xs text-red-400">{form.formState.errors.subCategoryId?.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>Condition</Label>
                  <Select
                    value={form.watch("condition")}
                    onValueChange={(val) =>
                      form.setValue("condition", val as AddAssetValues["condition"], { shouldDirty: true, shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {ConditionSchema.options.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {shouldShowError("condition") ? <p className="text-xs text-red-400">{form.formState.errors.condition?.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label>Minimum Days</Label>
                  <Select
                    value={String(form.watch("minDays"))}
                    onValueChange={(val) => form.setValue("minDays", Number(val), { shouldDirty: true, shouldValidate: true })}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Min days" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 14 }, (_, i) => i + 1).map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d} day{d === 1 ? "" : "s"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {shouldShowError("minDays") ? <p className="text-xs text-red-400">{form.formState.errors.minDays?.message}</p> : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select
                    value={state}
                    onValueChange={(val) => {
                      const nextCity = (MANDI_MARKET_OPTIONS[val] ?? [""])[0] || "";
                      form.setValue("state", val, { shouldDirty: true, shouldValidate: true });
                      form.setValue("city", nextCity, { shouldDirty: true, shouldValidate: true });
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {MANDI_STATE_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {shouldShowError("state") ? <p className="text-xs text-red-400">{form.formState.errors.state?.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label>City/Region</Label>
                  <Select value={city} onValueChange={(val) => form.setValue("city", val, { shouldDirty: true, shouldValidate: true })}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cityOptions.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {shouldShowError("city") ? <p className="text-xs text-red-400">{form.formState.errors.city?.message}</p> : null}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Description</Label>
                  <span className={cn("text-xs", description.length > 500 ? "text-red-400" : "text-muted-foreground")}>
                    {description.length}/500
                  </span>
                </div>
                <Textarea
                  placeholder="Rules, requirements, servicing notes, pickup instructions..."
                  value={description}
                  onChange={(e) => form.setValue("description", e.target.value, { shouldDirty: true, shouldValidate: true })}
                  className="min-h-[120px] rounded-xl"
                />
                {shouldShowError("description") ? <p className="text-xs text-red-400">{form.formState.errors.description?.message}</p> : null}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-border/40 bg-popover/90 backdrop-blur px-6 py-4">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => onOpenChange(false)} disabled={disabled}>
                Cancel
              </Button>
              <Button type="submit" className="h-11 rounded-xl font-bold" disabled={disabled || !form.formState.isValid}>
                {disabled ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    {isUploading ? "Uploading..." : "Listing..."}
                  </span>
                ) : (
                  "List Asset for Rent"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
