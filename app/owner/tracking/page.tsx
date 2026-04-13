import { Suspense } from "react";
import { TrackingBoard } from "@/components/tracking/tracking-board";

export default function OwnerTrackingPage() {
  return (
    <Suspense fallback={null}>
      <TrackingBoard mode="owner" />
    </Suspense>
  );
}
