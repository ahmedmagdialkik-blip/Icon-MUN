import React, { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Navigation } from './components/Navigation';
import { HeroCanvasScrubber } from './components/HeroCanvasScrubber';
import { AboutSection } from './components/AboutSection';
import { CommitteesSection } from './components/CommitteesSection';
import { ScheduleSection } from './components/ScheduleSection';
import { SecretariatSection } from './components/SecretariatSection';
import { RegistrationSection } from './components/RegistrationSection';
import { FooterSection } from './components/FooterSection';
import { CustomCursor } from './components/CustomCursor';
import { AudioAmbience } from './components/AudioAmbience';
import { GlobalScrollEffects } from './components/GlobalScrollEffects';
import { GoldDustCanvas } from './components/GoldDustCanvas';
import { PerfHUD } from './components/PerfHUD';
import { SiteDataProvider } from './lib/SiteData';

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedCommitteeCode, setSelectedCommitteeCode] = useState<string>('UNSC');
  const [showNavLogo, setShowNavLogo] = useState(false);

  const lenisRef = useRef<Lenis | null>(null);

  // Initialize Lenis and GSAP ScrollTrigger Synchronization
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const lenis = new Lenis({
      duration: prefersReducedMotion ? 0.01 : 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !prefersReducedMotion,
      syncTouch: false,
    });
    lenisRef.current = lenis;

    // Connect Lenis to ScrollTrigger without triggering component state updates
    lenis.on('scroll', () => {
      ScrollTrigger.update();
    });

    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };

    // prioritize=true: Lenis updates the scroll position BEFORE anything else in the frame
    gsap.ticker.add(updateTicker, false, true);
    gsap.ticker.lagSmoothing(500, 33);

    // Refresh ScrollTrigger after fonts settle
    document.fonts.ready.then(() => {
      ScrollTrigger.refresh();
    });

    // Debounced refresh on orientationchange and resize
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleDebouncedRefresh = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 200);
    };

    window.addEventListener('resize', handleDebouncedRefresh);
    window.addEventListener('orientationchange', handleDebouncedRefresh);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleDebouncedRefresh);
      window.removeEventListener('orientationchange', handleDebouncedRefresh);
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  const handleNavigateTo = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;

    if (lenisRef.current) {
      lenisRef.current.scrollTo(el, {
        offset: sectionId === 'hero-scroll-container' ? 0 : -20,
        duration: 1.2,
      });
    } else {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleOpenRegister = useCallback((committeeCode?: string) => {
    if (committeeCode) {
      setSelectedCommitteeCode(committeeCode);
    }
    setIsRegisterOpen(true);
  }, []);

  const handleCloseRegister = useCallback(() => {
    setIsRegisterOpen(false);
  }, []);

  const handleHeroReady = useCallback(() => {
    ScrollTrigger.refresh();
  }, []);

  const handleHeroScrollProgress = useCallback((p: number) => {
    const isPast = p > 0.22;
    setShowNavLogo((prev) => (prev !== isPast ? isPast : prev));
  }, []);

  return (
    <SiteDataProvider>
      <div className="relative min-h-screen bg-[#050505] text-[#E6E1D8] selection:bg-[#D4AF6A]/20 selection:text-[#F3DFA2] overflow-x-hidden">
        {/* 1. Global Floating Gold Dust Particles with Swirl Physics */}
        <GoldDustCanvas />

        {/* 2. Global Scroll Effects: Top Thin Progress Bar, Dot Nav, Faint Rotating UN Globe */}
        <GlobalScrollEffects onNavigateTo={handleNavigateTo} />

        {/* 3. Custom Gold Ring Cursor */}
        <CustomCursor />

        {/* 4. Sound Toggle (Off by default) */}
        <AudioAmbience />

        {/* 5. Top Navigation (Brand logo seamlessly fades in as hero title scrolls away) */}
        <Navigation
          onOpenRegister={handleOpenRegister}
          showBrandLogo={showNavLogo}
          onNavigateTo={handleNavigateTo}
        />

        {/* 6. Primary Hero Section with Direct Bidirectional Frame Scrubbing */}
        <main>
          <HeroCanvasScrubber
            onHeroReady={handleHeroReady}
            onHeroProgressChange={handleHeroScrollProgress}
          />

          {/* 7. Pinned & Scroll-Scrubbed Sections */}
          <AboutSection />
          <CommitteesSection onSelectCommitteeForRegister={handleOpenRegister} />
          <ScheduleSection />
          <SecretariatSection />
          <RegistrationSection
            isOpenModal={isRegisterOpen}
            onCloseModal={handleCloseRegister}
            onOpenModal={handleOpenRegister}
            preselectedCommittee={selectedCommitteeCode}
          />
        </main>

        {/* 8. Scroll-Scrubbed Footer */}
        <FooterSection />

        {/* Dev-only FPS meter: open the site with ?perf */}
        {typeof window !== 'undefined' && window.location.search.includes('perf') && <PerfHUD />}
      </div>
    </SiteDataProvider>
  );
}
