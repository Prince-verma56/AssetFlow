export type StatCard = {
  id: string;
  title: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "neutral";
  subtitle?: string;
  asOfLabel?: string;
  livePulse?: boolean;
  icon: string;
};

export const defaultStats: StatCard[] = [
  {
    id: "total-listings",
    title: "Active Listings",
    value: "1,248",
    delta: "+12.4%",
    trend: "up",
    subtitle: "vs last month",
    icon: "Leaf",
  },
  {
    id: "active-buyers",
    title: "Active Renters",
    value: "326",
    delta: "+5.7%",
    trend: "up",
    subtitle: "last 30 days",
    icon: "Users",
  },
  {
    id: "orders",
    title: "Orders",
    value: "89",
    delta: "-2.1%",
    trend: "down",
    subtitle: "this week",
    icon: "ShoppingCart",
  },
  {
    id: "revenue",
    title: "Rental Revenue",
    value: "₹4.82L",
    delta: "+18.9%",
    trend: "up",
    subtitle: "gross volume",
    icon: "CreditCard",
  },
];
