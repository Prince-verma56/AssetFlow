"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/sidebar/dashboard-skeleton";
import { motion } from "framer-motion";
import { Sparkles, Package, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { ClientAnimationWrapper } from "@/components/ui/preloader/ClientAnimationWrapper";
import { AddAssetModal } from "@/components/admin/add-asset-modal";
import { ListingMedia } from "@/components/listings/listing-media";

type EditingListing = {
  _id: Id<"listings">;
  assetCategory: string;
  description: string;
  pricePerDay: string;
  quantity: string;
};

export default function InventoryPage() {
  const { user, isLoaded } = useUser();

  const listingsResponse = useQuery(api.listings.getListingsByFarmer, user?.id ? { clerkId: user.id } : "skip");
  const listings = listingsResponse?.success ? listingsResponse.data : [];

  const updateListing = useMutation(api.listings.updateListing);
  const deleteListing = useMutation(api.listings.deleteListing);
  const [editingListing, setEditingListing] = React.useState<EditingListing | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);

  const handleDelete = async (id: Id<"listings">) => {
    if (confirm("Are you sure you want to delete this listing?")) {
      try {
        await deleteListing({ listingId: id });
        toast.success("Listing deleted successfully");
      } catch {
        toast.error("Failed to delete listing");
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;

    try {
      await updateListing({
        listingId: editingListing._id,
        description: editingListing.description,
        pricePerDay: Number(editingListing.pricePerDay),
        quantity: editingListing.quantity,
      });
      toast.success("Listing updated successfully");
      setEditingListing(null);
    } catch {
      toast.error("Failed to update listing");
    }
  };

  if (!isLoaded || listingsResponse === undefined) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <Dialog open={!!editingListing} onOpenChange={() => setEditingListing(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>Edit {editingListing?.assetCategory}</DialogTitle>
            <DialogDescription>Update your listing details here.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price per day (₹)</Label>
              <Input
                id="price"
                type="number"
                value={editingListing?.pricePerDay || ""}
                onChange={(e) =>
                  setEditingListing((prev) => (prev ? { ...prev, pricePerDay: e.target.value } : prev))
                }
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (e.g. 100 kg)</Label>
              <Input
                id="quantity"
                value={editingListing?.quantity || ""}
                onChange={(e) =>
                  setEditingListing((prev) => (prev ? { ...prev, quantity: e.target.value } : prev))
                }
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                value={editingListing?.description || ""}
                onChange={(e) =>
                  setEditingListing((prev) => (prev ? { ...prev, description: e.target.value } : prev))
                }
                className="rounded-xl min-h-[100px]"
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl h-11">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AddAssetModal open={addOpen} onOpenChange={setAddOpen} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Equipment</h1>
          <p className="text-muted-foreground">Manage your listed equipment and rental pricing.</p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 font-bold ml-auto shrink-0 shadow-sm transition-all focus:ring-2 focus:ring-emerald-500"
          onClick={() => setAddOpen(true)}
        >
          + Add New Equipment
        </Button>
      </div>

      <ClientAnimationWrapper>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => (
            <motion.div
              key={listing._id}
              layoutId={listing._id}
              className="group"
            >
              <Card className="overflow-hidden border border-zinc-200/70 bg-white shadow-sm transition-all hover:border-emerald-200 hover:shadow-lg dark:border-border dark:bg-card">
                <div className="aspect-[16/9] overflow-hidden relative">
                  <ListingMedia
                    imageUrl={listing.imageUrl}
                    alt={listing.title || listing.assetCategory}
                    title={listing.title || listing.assetCategory}
                    subtitle={listing.location}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-2 right-2 flex flex-col items-end gap-2">
                    <div className="absolute top-2 left-2 flex flex-col gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="size-8 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 border-none shadow-sm h-12 w-12 ml-auto">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem
                            onClick={() =>
                              setEditingListing({
                                _id: listing._id,
                                assetCategory: listing.assetCategory,
                                description: listing.description,
                                pricePerDay: String(listing.pricePerDay ?? ""),
                                quantity: listing.quantity,
                              })
                            }
                            className="gap-2 cursor-pointer"
                          >
                            <Pencil className="size-4" /> Edit Listing
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(listing._id)} className="gap-2 text-red-600 focus:text-red-600 cursor-pointer">
                            <Trash2 className="size-4" /> Delete Listing
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <Badge variant={listing.status === "available" ? "default" : "secondary"} className="shadow-md">
                      {listing.status === "available" ? "In Stock" : "Sold Out"}
                    </Badge>
                    {listing.aiRecommendation && (
                      <Badge className="bg-emerald-500/90 text-white border-none shadow-md backdrop-blur-md gap-1">
                        <Sparkles className="size-3" />
                         AI: {listing.aiRecommendation.replace("_", " ").toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {listing.title || listing.assetCategory}
                    <div className="text-right">
                      {listing.aiSuggestedPrice && (
                        <p className="text-xs text-muted-foreground line-through decoration-emerald-500/50">₹{(listing.aiSuggestedPrice * 1.1).toFixed(2)}</p>
                      )}
                      <span className="text-emerald-600 font-black">₹{listing.pricePerDay}/day</span>
                    </div>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Package className="size-3" />
                    {listing.quantity} available
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 text-sm text-muted-foreground line-clamp-2 h-10">
                  {listing.description}
                </CardContent>
                <CardFooter className="p-4 pt-0 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 font-bold transition-all"
                    onClick={() => toast.info("Price Oracle sync is available from the Dashboard.")}
                  >
                    <Sparkles className="size-3.5 fill-emerald-500 text-emerald-500" />
                    Price Advisor
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
          
          {listings.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <Package className="size-12 mx-auto text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-medium">No equipment listed yet</h3>
              <p className="text-muted-foreground">Add your first asset to start earning from idle equipment.</p>
              <div className="mt-6 flex justify-center">
                <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold h-11 px-6" onClick={() => setAddOpen(true)}>
                  + Add New Equipment
                </Button>
              </div>
            </div>
          )}
        </div>
      </ClientAnimationWrapper>
    </div>
  );
}
