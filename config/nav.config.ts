export type NavItemConfig = {
  title: string;
  href: string;
  icon: string;
  badge?: string;
};

export type NavConfig = {
  appName: string;
  farmerQuickCreateLabel: string;
  buyerQuickCreateLabel: string;
  farmerNav: typeof FARMER_ITEMS;
  buyerNav: typeof BUYER_ITEMS;
  farmerSecondaryNav: NavItemConfig[];
  buyerSecondaryNav: NavItemConfig[];
};

export const FARMER_ITEMS: NavItemConfig[] = [
  { title: "Dashboard", href: "/admin", icon: "LayoutDashboard" },
  { title: "My Equipment", href: "/admin/listings", icon: "Wrench" },
  { title: "Rentals", href: "/admin/orders", icon: "ClipboardList" },
  { title: "Price Advisor", href: "/admin/ai-oracle", icon: "Sparkles" },
  { title: "Analytics", href: "/admin/analytics", icon: "BarChart2" },
];

export const BUYER_ITEMS: NavItemConfig[] = [
  { title: "Marketplace", href: "/marketplace", icon: "LayoutDashboard" },
  { title: "My Rentals", href: "/marketplace/orders", icon: "ClipboardList" },
  { title: "Saved Owners", href: "/marketplace/saved-farmers", icon: "Bookmark" },
  { title: "Tracking", href: "/marketplace/track", icon: "Truck" },
];

export const navConfig: NavConfig = {
  appName: "AgriRent",
  farmerQuickCreateLabel: "List Equipment",
  buyerQuickCreateLabel: "Browse Equipment",
  farmerNav: FARMER_ITEMS,
  buyerNav: BUYER_ITEMS,
  farmerSecondaryNav: [
    { title: "Billing", href: "/admin/billing", icon: "CreditCard" },
    { title: "Settings", href: "/admin/settings", icon: "Settings" },
    { title: "Help", href: "/admin/help", icon: "CircleHelp" },
  ],
  buyerSecondaryNav: [
    { title: "Billing", href: "/marketplace/billing", icon: "CreditCard" },
    { title: "Settings", href: "/marketplace/settings", icon: "Settings" },
    { title: "Help", href: "/marketplace/help", icon: "CircleHelp" },
  ],
};
