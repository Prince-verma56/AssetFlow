export type ClerkRole = "owner" | "renter";
export type ConvexRole = "farmer" | "buyer";

export function normalizeRole(value: unknown): ClerkRole | null {
  if (value === "owner" || value === "farmer") return "owner";
  if (value === "renter" || value === "buyer") return "renter";
  return null;
}

export function toConvexRole(role: ClerkRole): ConvexRole {
  return role === "owner" ? "farmer" : "buyer";
}

export function toClerkRole(role: ConvexRole): ClerkRole {
  return role === "farmer" ? "owner" : "renter";
}

export function roleToDashboard(role: ClerkRole): "/admin" | "/marketplace" {
  return role === "owner" ? "/admin" : "/marketplace";
}

export function roleLabel(role: ClerkRole): "Owner" | "Renter" {
  return role === "owner" ? "Owner" : "Renter";
}
