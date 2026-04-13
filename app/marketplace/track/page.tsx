"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function TrackShipmentsPageContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const orderId = params.get("orderId");
    router.replace(orderId ? `/renter/tracking?orderId=${orderId}` : "/renter/tracking");
  }, [router, params]);

  return null;
}

export default function TrackShipmentsPage() {
  return (
    <Suspense fallback={null}>
      <TrackShipmentsPageContent />
    </Suspense>
  );
}
