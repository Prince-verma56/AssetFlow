import { Suspense } from "react";
import { TrackingBoard } from "@/components/tracking/tracking-board";

export default function RenterTrackingPage() {
  return (
    <Suspense fallback={null}>
      <TrackingBoard mode="renter" />
    </Suspense>
  );
}
