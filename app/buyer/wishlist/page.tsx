import Link from "next/link";
import { redirect } from "next/navigation";

export default function BuyerWishlistPage() {
  // Redirect to the marketplace wishlist page which now handles role-based views
  redirect("/marketplace/wishlist");
}
