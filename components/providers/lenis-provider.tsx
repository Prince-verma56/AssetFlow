"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type LenisContextValue = {
  scrollTo: (target: string | HTMLElement, offset?: number) => void;
};

const LenisContext = createContext<LenisContextValue>({
  scrollTo: () => {},
});

export function LenisProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.085,
      duration: 1.1,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 0.95,
      touchMultiplier: 1,
    });

    lenisRef.current = lenis;

    const updateScrollTrigger = () => ScrollTrigger.update();
    lenis.on("scroll", updateScrollTrigger);

    let frameId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frameId = window.requestAnimationFrame(raf);
    };

    frameId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(frameId);
      lenis.off("scroll", updateScrollTrigger);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/") {
      lenisRef.current?.scrollTo(0, { immediate: true });
    }
  }, [pathname]);

  const scrollTo = useCallback((target: string | HTMLElement, offset = 0) => {
    lenisRef.current?.scrollTo(target, {
      offset,
      duration: 1.15,
      lerp: 0.085,
    });
  }, []);

  const value = useMemo(() => ({ scrollTo }), [scrollTo]);

  return <LenisContext.Provider value={value}>{children}</LenisContext.Provider>;
}

export function useLenisScroll() {
  return useContext(LenisContext);
}
