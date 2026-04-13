"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MANDI_MARKET_OPTIONS, MANDI_STATE_OPTIONS, MANDI_COORDINATES } from "@/lib/agmarknet";
import { useUser } from "@clerk/nextjs";
import { ASSET_CATEGORIES } from "@/lib/constants/categories";
import { FileUpload } from "@/components/modules/uploads/FileUploads";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

type ComboboxFieldProps = {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  renderOption?: (option: string) => React.ReactNode;
  renderValue?: (value: string) => React.ReactNode;
};

function ComboboxField({ label, value, options, onSelect, renderOption, renderValue }: ComboboxFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between overflow-hidden h-10 px-3 py-2 bg-transparent text-sm">
            <span className="truncate">{value ? (renderValue ? renderValue(value) : value) : `Select ${label}`}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 flex h-auto max-h-[300px]" align="start">
          <Command className="w-full">
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>No option found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => {
                      onSelect(option);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 size-4", value === option ? "opacity-100" : "opacity-0")} />
                    {renderOption ? renderOption(option) : option}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

const AddListingSchema = z.object({
  imageUrl: z.union([z.literal(""), z.string().url()]).default(""),
  title: z.string().min(2),
  categoryId: z.string().min(1),
  subCategoryId: z.string().min(1),
  pricePerDay: z.number().positive(),
  description: z.string().min(5),
  state: z.string().min(1),
  city: z.string().min(1),
  quantityValue: z.string().min(1),
  quantityUnit: z.string().min(1),
});

type AddListingValues = z.input<typeof AddListingSchema>;

export function AddListingForm({ onSuccess }: { onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const form = useForm<AddListingValues>({
    resolver: zodResolver(AddListingSchema),
    defaultValues: {
      imageUrl: "",
      title: "",
      categoryId: "",
      subCategoryId: "",
      pricePerDay: 0,
      description: "",
      state: "Rajasthan",
      city: "Jaipur",
      quantityValue: "1",
      quantityUnit: "Units",
    },
    mode: "onChange",
  });

  const categoryId = form.watch("categoryId");
  const subCategoryId = form.watch("subCategoryId");
  const state = form.watch("state");
  const city = form.watch("city");
  const imageUrl = form.watch("imageUrl");

  const selectedCategory = useMemo(() => ASSET_CATEGORIES.find((c) => c.id === categoryId), [categoryId]);
  const cityOptions = useMemo(() => MANDI_MARKET_OPTIONS[state] ?? [], [state]);
  const createListing = useMutation(api.listings.createListing);

  useEffect(() => {
    form.setValue("subCategoryId", "", { shouldDirty: true, shouldValidate: true });
  }, [categoryId, form]);

  useEffect(() => {
    if (!selectedCategory) return;
    const subCat = selectedCategory.subCategories.find((s) => s.id === subCategoryId);
    if (!subCat) return;
    form.setValue("pricePerDay", subCat.basePrice, { shouldDirty: true, shouldValidate: true });
  }, [form, selectedCategory, subCategoryId]);

  const handleSubmit = async (values: AddListingValues) => {
    if (!isLoaded || !user?.id) {
      toast.error("You must be logged in to create a listing.");
      return;
    }

    setLoading(true);

    try {
      const categoryName = selectedCategory?.name || "Equipment";
      const subCategoryName = selectedCategory?.subCategories.find((s) => s.id === values.subCategoryId)?.name || "";
      const finalCategoryStr = subCategoryName ? `${categoryName} - ${subCategoryName}` : categoryName;

      const coords = MANDI_COORDINATES[values.city] || MANDI_COORDINATES[values.state] || { lat: 26.9124, lng: 75.7873 };

      await createListing({
        clerkId: user.id,
        title: values.title,
        assetCategory: finalCategoryStr,
        categoryId: values.categoryId,
        subCategoryId: values.subCategoryId,
        quantity: `${values.quantityValue} ${values.quantityUnit}`,
        pricePerDay: values.pricePerDay,
        location: `${values.city}, ${values.state}`,
        description: values.description,
        imageUrl: values.imageUrl || undefined,
        approxLat: coords.lat,
        approxLng: coords.lng,
      });

      toast.success("Equipment listed successfully!");
      onSuccess?.();
      router.refresh();
    } catch (err: unknown) {

      const message = err instanceof Error ? err.message : "Failed to list equipment.";
      toast.error(message);
      console.error(err);
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
      <div className="space-y-2">
        <label className="text-sm font-medium">Equipment Photo (Optional)</label>
        <FileUpload
          value={imageUrl ?? ""}
          onChange={(url) => {
            form.setValue("imageUrl", url, { shouldDirty: true, shouldValidate: true });
          }}
          onRemove={() => form.setValue("imageUrl", "", { shouldDirty: true, shouldValidate: true })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Asset Title</label>
        <Input
          value={form.watch("title")}
          onChange={(e) => form.setValue("title", e.target.value, { shouldDirty: true, shouldValidate: true })}
          placeholder='e.g., "Mahindra 475 DI Tractor"'
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4 col-span-2 sm:col-span-1">
          <div className="space-y-2">
            <label className="text-sm font-medium">Main Category</label>
            <Select
              value={categoryId}
              onValueChange={(val) => form.setValue("categoryId", val, { shouldDirty: true, shouldValidate: true })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {ASSET_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <cat.icon className="h-4 w-4" />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategory && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Sub-Category</label>
              <Select
                value={subCategoryId}
                onValueChange={(val) => form.setValue("subCategoryId", val, { shouldDirty: true, shouldValidate: true })}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select Sub-Category" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCategory.subCategories.map((subCat) => (
                    <SelectItem key={subCat.id} value={subCat.id}>
                      {subCat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Quantity</label>
          <div className="flex gap-2">
            <Input 
              type="number" 
              value={form.watch("quantityValue")}
              onChange={(e) => form.setValue("quantityValue", e.target.value, { shouldDirty: true, shouldValidate: true })}
              required 
              placeholder="1" 
              className="flex-1" 
            />
            <Select
              value={form.watch("quantityUnit")}
              onValueChange={(val) => form.setValue("quantityUnit", val, { shouldDirty: true, shouldValidate: true })}
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Units">Units</SelectItem>
                <SelectItem value="Items">Items</SelectItem>
                <SelectItem value="Sets">Sets</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <ComboboxField
          label="State"
          value={state}
          options={[...MANDI_STATE_OPTIONS]}
          onSelect={(val) => {
            const nextCity = (MANDI_MARKET_OPTIONS[val] ?? [""])[0] || "";
            form.setValue("state", val, { shouldDirty: true, shouldValidate: true });
            form.setValue("city", nextCity, { shouldDirty: true, shouldValidate: true });
          }}
        />

        <ComboboxField
          label="City/Region"
          value={city}
          options={cityOptions}
          onSelect={(val) => form.setValue("city", val, { shouldDirty: true, shouldValidate: true })}
        />

        <div className="space-y-2 col-span-2">
          <label className="text-sm font-medium">Daily Rental Rate (₹/day)</label>
          <Input
            type="number"
            step="1"
            value={Number.isFinite(form.watch("pricePerDay")) ? String(form.watch("pricePerDay")) : ""}
            onChange={(e) => form.setValue("pricePerDay", Number(e.target.value || 0), { shouldDirty: true, shouldValidate: true })}
            required
            placeholder="e.g., 500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Asset Condition & Requirements</label>
        <Textarea
          value={form.watch("description")}
          onChange={(e) => form.setValue("description", e.target.value, { shouldDirty: true, shouldValidate: true })}
          required
          placeholder="e.g., Needs 1L diesel minimum, serviced last month"
        />
      </div>

      <Button type="submit" disabled={loading || !form.formState.isValid} className="w-full bg-emerald-600 hover:bg-emerald-700 h-11">
        {loading ? "Publishing..." : "Publish Listing"}
      </Button>
    </form>
  );
}
