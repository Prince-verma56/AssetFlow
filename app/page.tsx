import { HeroSection } from "@/components/sections/HeroSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import { LandingNavbar } from "@/components/navigation/LandingNavbar";
import WhatWeProvideSection from "@/components/sections/WhatWeProvideSection";

export default function HomePage() {
  return (
    <main className="relative w-full overflow-x-hidden">
      <LandingNavbar />

      <section id="hero">
        <HeroSection />
      </section>

      <section id="provide">
        <WhatWeProvideSection />
      </section>

      <section id="how-it-works">
        <HowItWorksSection />
      </section>

      <section id="map" className="flex min-h-[70vh] items-center justify-center px-6 py-24 text-center">
        <div className="max-w-3xl rounded-[2rem] border border-border/70 bg-background/80 p-10 shadow-[0_24px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur-sm">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Live Operations</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-foreground">Map-based tracking already exists in the app.</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            When you are ready, we can turn this placeholder into a full landing preview for route visibility, delivery
            coordination, and location-aware discovery.
          </p>
        </div>
      </section>

      <section id="community" className="bg-muted/30 px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Community</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-foreground">Trust, ratings, saved owners, and repeat rentals.</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            This block is ready to become your community proof section later, grounded in the renter and owner flows
            that already exist.
          </p>
        </div>
      </section>

      <section id="blog" className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Blog &amp; Tips</p>
          <h2 className="mt-4 text-4xl font-black tracking-tight text-foreground">Educational content can slot in here without changing the shell.</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            The landing page now has a stable modular structure, so later content additions can drop in as focused
            sections instead of rewriting the root page.
          </p>
        </div>
      </section>
    </main>
  );
}
