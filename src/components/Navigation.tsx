import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

interface NavigationProps {
  onOpenRegister: () => void;
  showBrandLogo: boolean;
  onNavigateTo?: (sectionId: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  onOpenRegister,
  showBrandLogo,
  onNavigateTo,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on Escape key or window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    if (onNavigateTo) {
      onNavigateTo(targetId);
    } else {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 pt-[env(safe-area-inset-top,0px)] ${
          showBrandLogo || isMobileMenuOpen
            ? 'bg-[#050505]/95 border-b border-[#D4AF6A]/20 backdrop-blur-md shadow-lg'
            : 'bg-transparent pointer-events-none'
        }`}
      >
        <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between gap-4 md:gap-8 px-4 sm:px-6 lg:px-12 pointer-events-auto">
          {/* Zone 1: Mask Motif + Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#hero-scroll-container"
              onClick={(e) => handleNavClick(e, 'hero-scroll-container')}
              className={`flex items-center gap-2.5 transition-all duration-400 min-h-[44px] min-w-[44px] ${
                showBrandLogo
                  ? 'opacity-100 translate-x-0 pointer-events-auto cursor-pointer'
                  : 'opacity-0 -translate-x-3 pointer-events-none md:opacity-0'
              }`}
            >
              {/* Logo Mask Motif */}
              <div className="h-8 w-8 rounded-full overflow-hidden border border-[#D4AF6A]/60 shadow-[0_0_10px_rgba(212,175,106,0.3)] bg-black shrink-0">
                <img
                  src="/assets/logo.png"
                  alt="ICON MUN Emblem"
                  className="h-full w-full object-cover scale-125"
                  loading="lazy"
                />
              </div>
              <span className="font-cinzel text-base sm:text-xl font-bold uppercase tracking-[0.22em] text-[#F3DFA2] whitespace-nowrap">
                ICON MUN
              </span>
            </a>
          </div>

          {/* Zone 2: Desktop navigation links with Lenis smooth scroll */}
          <nav
            className={`hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.2em] font-medium transition-all duration-300 ${
              showBrandLogo
                ? 'text-[#C4BAA8]'
                : 'text-[#C4BAA8]/75 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]'
            }`}
          >
            <a
              href="#about"
              onClick={(e) => handleNavClick(e, 'about')}
              className="hover:text-[#F3DFA2] transition-colors whitespace-nowrap shrink-0 py-2 cursor-pointer"
            >
              About
            </a>
            <a
              href="#committees"
              onClick={(e) => handleNavClick(e, 'committees')}
              className="hover:text-[#F3DFA2] transition-colors whitespace-nowrap shrink-0 py-2 cursor-pointer"
            >
              Councils (TBA)
            </a>
            <a
              href="#schedule"
              onClick={(e) => handleNavClick(e, 'schedule')}
              className="hover:text-[#F3DFA2] transition-colors whitespace-nowrap shrink-0 py-2 cursor-pointer"
            >
              Timeline (TBA)
            </a>
            <a
              href="#secretariat"
              onClick={(e) => handleNavClick(e, 'secretariat')}
              className="hover:text-[#F3DFA2] transition-colors whitespace-nowrap shrink-0 py-2 cursor-pointer"
            >
              Secretariat
            </a>
          </nav>

          {/* Zone 3: Desktop Register CTA + Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={onOpenRegister}
              className="hidden sm:inline-flex gold-btn-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] rounded-sm whitespace-nowrap shrink-0 cursor-pointer shadow-md min-h-[44px] items-center justify-center"
            >
              Register (TBA)
            </button>

            {/* Mobile Hamburger Button (at least 44x44px hitbox) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              className="md:hidden flex h-11 w-11 items-center justify-center rounded-lg border border-[#D4AF6A]/30 bg-[#0C0C0C]/80 text-[#F3DFA2] transition-all hover:border-[#D4AF6A] hover:bg-[#141414] active:scale-95 cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Full-Screen Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex flex-col justify-between bg-[#050505]/98 backdrop-blur-2xl text-[#E6E1D8] pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] px-6 overflow-y-auto min-h-screen-dvh"
        >
          {/* Header Row in Mobile Menu */}
          <div className="flex items-center justify-between border-b border-[#D4AF6A]/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full overflow-hidden border border-[#D4AF6A]/60 shadow-[0_0_12px_rgba(212,175,106,0.3)] bg-black shrink-0">
                <img
                  src="/assets/logo.png"
                  alt="ICON MUN Emblem"
                  className="h-full w-full object-cover scale-125"
                />
              </div>
              <span className="font-cinzel text-lg font-bold uppercase tracking-[0.22em] text-[#F3DFA2]">
                ICON MUN
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D4AF6A]/30 bg-[#141414] text-[#F3DFA2] active:scale-95 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links list (48px+ tap height) */}
          <nav className="my-auto py-8 flex flex-col gap-3">
            {[
              { id: 'about', label: '01. About (TBA)' },
              { id: 'committees', label: '02. Councils (TBA)' },
              { id: 'schedule', label: '03. Itinerary (TBA)' },
              { id: 'secretariat', label: '04. High Secretariat' },
              { id: 'registration', label: '05. Registry (TBA)' },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => handleNavClick(e, item.id)}
                className="flex items-center justify-between min-h-[52px] px-4 py-3 rounded-xl border border-white/5 bg-[#0C0C0C]/60 font-cinzel text-lg tracking-[0.15em] text-[#E6E1D8] hover:text-[#F3DFA2] hover:border-[#D4AF6A]/40 active:bg-[#D4AF6A]/10 transition-all cursor-pointer"
              >
                <span>{item.label}</span>
                <span className="text-xs text-[#D4AF6A] font-mono">→</span>
              </a>
            ))}
          </nav>

          {/* Bottom Action Area */}
          <div className="space-y-4 pt-4 border-t border-[#D4AF6A]/20">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenRegister();
              }}
              className="gold-btn-primary w-full py-4 text-xs font-bold uppercase tracking-[0.25em] rounded-xl flex items-center justify-center min-h-[48px] shadow-lg cursor-pointer"
            >
              Register Interest (TBA)
            </button>
            <p className="text-center text-[10px] uppercase tracking-[0.25em] text-[#A89D8A]">
              ICON MUN 2027 · Premier Model UN
            </p>
          </div>
        </div>
      )}
    </>
  );
};
