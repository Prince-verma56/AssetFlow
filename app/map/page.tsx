import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapboxHub } from "@/components/map/mapbox-hub";

export default function MapPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-start px-4 pt-4">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
      </div>
      <MapboxHub />
    </div>
  );
}
