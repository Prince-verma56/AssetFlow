import Link from "next/link";
import ThemeToggleButton from "@/components/ui/theme-toggle-button";
import { RoleSwitcher } from "@/components/navigation/role-switcher";

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <header className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-2 border-b bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin" className="text-sm">Dashboard</Link>
          <Link href="/admin/inventory" className="text-sm">Inventory</Link>
          <Link href="/admin/orders" className="text-sm">Orders</Link>
          <Link href="/admin/ai-oracle" className="text-sm">AI Oracle</Link>
          <Link href="/admin/analytics" className="text-sm">Analytics</Link>
        </div>
        <div className="flex items-center gap-2">
          <RoleSwitcher role="owner" />
          <ThemeToggleButton variant="circle-blur" start="top-right" />
        </div>
      </header>
      {children}
    </div>
  );
}
