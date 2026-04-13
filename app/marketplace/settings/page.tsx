import { redirect } from "next/navigation";

export default function LegacyMarketplaceSettingsPage() {
  redirect("/renter/settings");
}
