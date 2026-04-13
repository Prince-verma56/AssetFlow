import { LandingNavbar } from "@/components/navigation/LandingNavbar";
import { HeroSection } from "@/components/sections/HeroSection";

const placeholderClassName =
  "flex min-h-screen items-center justify-center px-6 py-24 text-center text-3xl font-black tracking-tight text-slate-300";

export default function HomePage() {
  return (
    <main className="relative w-full overflow-x-hidden">
      <LandingNavbar />

      <section id="hero">
        <HeroSection />
      </section>

      <section id="provide" className={placeholderClassName}>
        <div>{/* <WhatWeProvideSection /> */}What We Provide</div>
      </section>

      <section id="how-it-works" className={`${placeholderClassName} bg-muted/30`}>
        <div>{/* <HowItWorksSection /> */}How It Works</div>
      </section>

      <section id="map" className={placeholderClassName}>
        <div>{/* <MapSection /> */}Live Map</div>
      </section>

      <section id="community" className={`${placeholderClassName} bg-muted/30`}>
        <div>{/* <CommunitySection /> */}Community</div>
      </section>

      <section id="blog" className={placeholderClassName}>
        <div>{/* <BlogTipsSection /> */}Blog &amp; Tips</div>
      </section>
    </main>
  );
}
