"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BuyerOrdersPage() {
  const { user } = useUser();
  const orders = useQuery(api.orders.getOrdersByBuyer, user?.id ? { buyerId: user.id } : "skip");

  const data = orders?.success ? orders.data : [];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-black">Buyer Orders</h1>
      <div className="grid gap-4">
        {data.map((order) => (
          <Card key={order._id}>
            <CardHeader>
              <CardTitle className="text-base">Order #{String(order._id).slice(-8)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p>Status: {order.status || order.orderStatus}</p>
              <p>Total: ₹{order.totalAmount.toFixed(2)}</p>
              <p>Type: {order.type || "bulk"}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
