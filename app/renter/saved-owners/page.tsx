"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function SavedOwnersPage() {
  const { user } = useUser();
  const savedOwners = useQuery(api.savedOwners.listByRenter, user?.id ? { renterId: user.id } : "skip");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Saved Owners</p>
        <h1 className="text-4xl font-black tracking-tight">Trusted owners shortlist</h1>
        <p className="font-medium text-muted-foreground">
          Keep your favorite equipment owners handy and jump back into their listings faster.
        </p>
      </div>

      {!savedOwners ? null : savedOwners.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <p className="text-lg font-semibold">No owners saved yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Use the bookmark next to an owner name in the marketplace to save them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {savedOwners.map((entry) => (
            <Card key={String(entry._id)} className="border-border/70 shadow-sm">
              <CardHeader className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar size="lg">
                    <AvatarImage src={entry.owner.avatarUrl ?? undefined} alt={entry.owner.name} />
                    <AvatarFallback>{initials(entry.owner.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl">{entry.owner.name}</CardTitle>
                    <CardDescription>{entry.owner.email}</CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    <ShieldCheck className="mr-1 size-3.5" />
                    Trust {entry.owner.trustScore}/100
                  </Badge>
                  <Badge variant="secondary">{entry.owner.listingCount} active listings</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{entry.owner.bio}</p>
                <Button asChild className="w-full">
                  <Link href={`/marketplace/owner/${entry.owner.id}`}>
                    View All Listings by Owner
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
