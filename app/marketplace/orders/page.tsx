import { redirect } from "next/navigation";

export default function LegacyMarketplaceOrdersPage() {
  redirect("/renter/rentals");
}
