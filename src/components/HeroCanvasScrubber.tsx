import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface HeroCanvasScrubberProps {
  onHeroReady?: () => void;
  onHeroProgressChange?: (progress: number) => void;
}

const TOTAL_FRAMES = 96;

export const HeroCanvasScrubber: React.FC<HeroCanvasScrubberProps> = ({
  onHeroReady,
  onHeroProgressChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const videoFallbackRef = useRef<HTMLVideoElement | null>(null);

  // Captions and scroll prompt refs
  const caption1Ref = useRef<HTMLParagraphElement | null>(null);
  const caption2Ref = useRef<HTMLParagraphElement | null>(null);
  const caption3Ref = useRef<HTMLParagraphElement | null>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement | null>(null);

  const [useVideoFallback, setUseVideoFallback] = useState(false);

  // Preloaded + pre-decoded frame images
  const framesRef = useRef<HTMLImageElement[]>([]);
  const readyRef = useRef<Uint8Array>(new Uint8Array(TOTAL_FRAMES));
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const currentRenderFrameRef = useRef(0);
  const drawnSourceRef = useRef(-1); // frame index actually painted last
  const viewDirtyRef = useRef(true); // true after resize -> force a repaint
  const isFirstFrameLoadedRef = useRef(false);
  const nativeSizeRef = useRef({ w: 0, h: 0 });

  // Cached viewport sizes to avoid DOM reading during draw
  const viewportSizeRef = useRef({ width: 0, height: 0, dpr: 1 });

  // Update canvas dimensions cache.
  // The backing store is capped to the source frame's native resolution: drawing a
  // 1280px frame into a 2880px retina canvas burns GPU time for no extra detail.
  const updateViewportSize = useCallback(() => {
    if (typeof window === 'undefined') return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const { w: iw, h: ih } = nativeSizeRef.current;
    if (iw > 0 && ih > 0) {
      const cover = Math.max(w / iw, h / ih); // css px per source px
      dpr = Math.max(0.5, Math.min(dpr, 1 / cover));
    }

    viewportSizeRef.current = { width: w, height: h, dpr };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      viewDirtyRef.current = true;
    }
  }, []);

  // Nearest frame that is fully loaded + decoded (so a not-yet-loaded frame never
  // makes the hero freeze or flash; it shows the closest available one instead).
  const pickReadyFrame = useCallback((idx: number) => {
    const ready = readyRef.current;
    if (ready[idx]) return idx;
    for (let d = 1; d < TOTAL_FRAMES; d++) {
      if (idx - d >= 0 && ready[idx - d]) return idx - d;
      if (idx + d < TOTAL_FRAMES && ready[idx + d]) return idx + d;
    }
    return -1;
  }, []);

  // Render a specific frame onto the canvas with centered cover fit
  const drawFrame = useCallback(
    (frameIdx: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const src = pickReadyFrame(frameIdx);
      if (src < 0) return;
      // Nothing new to paint
      if (src === drawnSourceRef.current && !viewDirtyRef.current) return;

      const img = framesRef.current[src];
      if (!img || img.naturalWidth === 0) return;

      if (!ctxRef.current) {
        ctxRef.current = canvas.getContext('2d', { alpha: false });
      }
      const ctx = ctxRef.current;
      if (!ctx) return;

      const { width: targetW, height: targetH, dpr } = viewportSizeRef.current;
      if (targetW === 0 || targetH === 0) return;

      drawnSourceRef.current = src;
      viewDirtyRef.current = false;

      // Object-fit cover logic centered directly on the mannequin
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const r = Math.max(targetW / iw, targetH / ih);
      const nw = iw * r;
      const nh = ih * r;
      const ox = (targetW - nw) / 2;
      const oy = (targetH - nh) / 2;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(img, ox, oy, nw, nh);
    },
    [pickReadyFrame]
  );

  // Lightweight frame refresh check on ticker only when view is marked dirty (e.g. after resize)
  useEffect(() => {
    const tick = () => {
      if (viewDirtyRef.current && isFirstFrameLoadedRef.current) {
        drawFrame(currentRenderFrameRef.current);
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [drawFrame]);

  // Frame loading: frame 1 first for an instant paint, then the rest through a small
  // download pool. Every frame is decoded before it counts as ready.
  useEffect(() => {
    updateViewportSize();

    let cancelled = false;
    const isMobile = window.innerWidth <= 768;
    const preferredFolder = isMobile ? '/assets/frames-mobile' : '/assets/frames';
    const fallbackFolder = '/assets/frames';

    const images: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    framesRef.current = images;
    readyRef.current = new Uint8Array(TOTAL_FRAMES);
    drawnSourceRef.current = -1;
    viewDirtyRef.current = true;

    const frameUrl = (folder: string, n: number) =>
      `${folder}/frame_${String(n).padStart(3, '0')}.jpg`;

    const loadImage = (n: number, folder: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          if (typeof img.decode === 'function') {
            img.decode().then(
              () => resolve(img),
              () => resolve(img)
            );
          } else {
            resolve(img);
          }
        };
        img.onerror = () => reject(new Error(`frame ${n} failed`));
        img.src = frameUrl(folder, n);
      });

    const loadWithFallback = async (n: number) => {
      try {
        return await loadImage(n, preferredFolder);
      } catch (e) {
        if (preferredFolder === fallbackFolder) throw e;
        return await loadImage(n, fallbackFolder);
      }
    };

    const startRemaining = () => {
      const queue: number[] = [];
      for (let n = 2; n <= TOTAL_FRAMES; n++) queue.push(n);
      const MAX_PARALLEL = isMobile ? 4 : 6;
      let active = 0;
      let finished = 0;

      const pump = () => {
        while (!cancelled && active < MAX_PARALLEL && queue.length) {
          const n = queue.shift()!;
          active++;
          loadWithFallback(n)
            .then((img) => {
              if (cancelled) return;
              images[n - 1] = img;
              readyRef.current[n - 1] = 1;
            })
            .catch(() => {
              /* missing frame skipped; nearest ready frame shown */
            })
            .finally(() => {
              active--;
              finished++;
              if (finished === TOTAL_FRAMES - 1 && !cancelled) ScrollTrigger.refresh();
              pump();
            });
        }
      };
      pump();
    };

    loadWithFallback(1)
      .then((img) => {
        if (cancelled) return;
        images[0] = img;
        readyRef.current[0] = 1;
        nativeSizeRef.current = { w: img.naturalWidth, h: img.naturalHeight };
        isFirstFrameLoadedRef.current = true;
        updateViewportSize();
        drawFrame(0);
        if (onHeroReady) onHeroReady();
        startRemaining();
      })
      .catch(() => {
        if (cancelled) return;
        setUseVideoFallback(true);
        if (onHeroReady) onHeroReady();
      });

    const handleResize = () => {
      updateViewportSize();
      viewDirtyRef.current = true;
      drawFrame(currentRenderFrameRef.current);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [drawFrame, onHeroReady, updateViewportSize]);

  // Master ScrollTrigger Timeline for Hero
  // Adjusted scroll length (160vh mobile, 200vh desktop) for intentional, responsive pacing.
  // scrub: true locks frame rendering and captions directly to the Lenis-smoothed scroll,
  // eliminating competing lerp loops and input lag.
  useEffect(() => {
    const container = containerRef.current;
    const sticky = stickyRef.current;
    if (!container || !sticky) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top top',
          end: 'bottom bottom',
          pin: sticky,
          pinSpacing: true,
          scrub: prefersReducedMotion ? false : true,
          onUpdate: (self) => {
            const p = self.progress;
            const targetFrame = Math.min(
              Math.max(Math.round(p * (TOTAL_FRAMES - 1)), 0),
              TOTAL_FRAMES - 1
            );
            currentRenderFrameRef.current = targetFrame;
            drawFrame(targetFrame);

            if (onHeroProgressChange) {
              onHeroProgressChange(p);
            }

            // Video fallback seeking if active
            if (useVideoFallback && videoFallbackRef.current?.duration) {
              videoFallbackRef.current.currentTime = p * videoFallbackRef.current.duration;
            }
          },
        },
      });

      // 1. Subtle, grounded scale on canvas (Visual stays 100% visible: NO fade to black)
      if (canvasWrapRef.current && !prefersReducedMotion) {
        tl.fromTo(
          canvasWrapRef.current,
          { scale: 1 },
          { scale: 1.03, ease: 'none', duration: 1 },
          0
        );
      }

      // 2. Radial gold glow overlay breathing
      if (glowRef.current && !prefersReducedMotion) {
        tl.fromTo(
          glowRef.current,
          { opacity: 0.1, scale: 0.9 },
          { opacity: 0.5, scale: 1.1, ease: 'none', duration: 0.8 },
          0
        );
      }

      // 3. Top Heading ("ICON MUN"):
      // Fully visible at start (0 - 0.16), then smoothly ascends and clears out (0.16 - 0.26)
      // just as the navbar takes over the brand logo at 0.22, keeping the mannequin as the pure visual focus.
      if (headerRef.current) {
        tl.fromTo(
          headerRef.current,
          { opacity: 1, y: 0 },
          {
            opacity: 0,
            y: prefersReducedMotion ? 0 : -20,
            ease: 'power1.in',
            duration: 0.1,
          },
          0.16
        );
      }

      // 4. "Scroll To Reveal" indicator: fades out early (0.10 - 0.18) so it doesn't distract
      if (scrollIndicatorRef.current) {
        tl.fromTo(
          scrollIndicatorRef.current,
          { opacity: 1 },
          { opacity: 0, ease: 'power1.in', duration: 0.08 },
          0.1
        );
      }

      // 5. Captions sequence: strictly non-overlapping, deliberate timing
      // Caption 1: "Every nation has a face." (Visible 0 - 0.18, exits 0.18 - 0.26)
      if (caption1Ref.current) {
        tl.fromTo(
          caption1Ref.current,
          { opacity: 1, y: 0 },
          {
            opacity: 0,
            y: prefersReducedMotion ? 0 : -14,
            ease: 'power1.inOut',
            duration: 0.08,
          },
          0.18
        );
      }

      // Window 0.26 - 0.32: Clean silence & focus on mannequin as mask starts to lift

      // Caption 2: "But behind every mask…" (Enters 0.32 - 0.40, holds 0.40 - 0.58, exits 0.58 - 0.66)
      if (caption2Ref.current) {
        tl.fromTo(
          caption2Ref.current,
          { opacity: 0, y: prefersReducedMotion ? 0 : 14 },
          {
            opacity: 1,
            y: 0,
            ease: 'power1.inOut',
            duration: 0.08,
          },
          0.32
        );
        tl.to(
          caption2Ref.current,
          {
            opacity: 0,
            y: prefersReducedMotion ? 0 : -14,
            ease: 'power1.inOut',
            duration: 0.08,
          },
          0.58
        );
      }

      // Window 0.66 - 0.72: Clean silence & focus on mannequin as mask is lifted

      // Caption 3: "…is a delegate ready to lead." (Enters 0.72 - 0.80, holds in gold shimmer 0.80 - 0.94, soft ease 0.94 - 1.00)
      if (caption3Ref.current) {
        tl.fromTo(
          caption3Ref.current,
          { opacity: 0, y: prefersReducedMotion ? 0 : 14 },
          {
            opacity: 1,
            y: 0,
            ease: 'power1.inOut',
            duration: 0.08,
          },
          0.72
        );
        tl.to(
          caption3Ref.current,
          {
            opacity: 0,
            y: prefersReducedMotion ? 0 : -10,
            ease: 'power1.inOut',
            duration: 0.06,
          },
          0.94
        );
      }
    }, container);

    return () => ctx.revert();
  }, [drawFrame, onHeroProgressChange, useVideoFallback]);

  return (
    <div
      ref={containerRef}
      id="hero-scroll-container"
      className="relative w-full bg-[#050505] h-[160vh] md:h-[200vh]"
    >
      {/* Pinned Viewport Hero Section with 100dvh fallback */}
      <div
        ref={stickyRef}
        className="h-screen-dvh w-full overflow-hidden bg-[#050505] flex flex-col justify-between relative"
      >
        {/* Visual Media Layer: Canvas Frame Sequence */}
        <div
          ref={canvasWrapRef}
          className="absolute inset-0 w-full h-full will-change-transform"
        >
          {/* Canvas Frame Sequence */}
          <canvas
            ref={canvasRef}
            className="w-full h-full object-cover select-none block"
          />

          {/* Fallback MP4 Video */}
          {useVideoFallback && (
            <video
              ref={videoFallbackRef}
              src="/assets/mask-video.mp4"
              playsInline
              webkit-playsinline="true"
              muted
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover select-none"
            />
          )}
        </div>

        {/* Top Scrim Gradient for Guaranteed Text Readability */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-44 z-15"
          style={{
            background:
              'linear-gradient(to bottom, rgba(5,5,5,0.85) 0%, rgba(5,5,5,0.45) 60%, transparent 100%)',
          }}
        />

        {/* Radial Gold Glow Overlay */}
        <div
          ref={glowRef}
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[320px] sm:h-[480px] w-[320px] sm:w-[480px] rounded-full z-10 will-change-transform opacity-10"
          style={{
            background:
              'radial-gradient(circle, rgba(212,175,106,0.25) 0%, rgba(90,15,30,0.15) 45%, transparent 70%)',
          }}
        />

        {/* Center Vignette Overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-15"
          style={{
            background:
              'radial-gradient(circle at center, transparent 35%, rgba(5,5,5,0.55) 80%, #050505 100%)',
          }}
        />

        {/* Bottom Scrim Gradient for Deliberate, Grounded Transition into About Section */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48 z-15"
          style={{
            background:
              'linear-gradient(to top, #050505 0%, rgba(5,5,5,0.85) 40%, rgba(5,5,5,0.25) 75%, transparent 100%)',
          }}
        />

        {/* ================================================================= */}
        {/* SAFE ZONE 1 (TOP): ICON MUN HEADING                               */}
        {/* ================================================================= */}
        <div
          ref={headerRef}
          className="relative z-20 px-4 sm:px-6 flex flex-col items-center justify-center text-center pointer-events-none select-none will-change-transform"
          style={{
            paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))',
          }}
        >
          <div className="inline-flex items-center gap-1.5 sm:gap-2 text-[clamp(0.6rem,2vw,0.75rem)] font-semibold uppercase tracking-[0.22em] sm:tracking-[0.35em] text-[#D4AF6A] mb-1 opacity-90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            <span>The Premier Model United Nations</span>
            <span aria-hidden="true" className="text-[#8C6221]">·</span>
            <span>2027 Edition · Details TBA</span>
          </div>

          <h1
            className="font-cinzel text-[clamp(1.85rem,7.5vw,5rem)] font-black uppercase tracking-[0.16em] sm:tracking-[0.24em] md:tracking-[0.32em] text-gold-shimmer filter drop-shadow-[0_4px_25px_rgba(0,0,0,0.95)] whitespace-nowrap"
            style={{
              textShadow: '0 0 35px rgba(212, 175, 106, 0.4), 0 0 70px rgba(90, 15, 30, 0.25)',
            }}
          >
            ICON MUN
          </h1>

          <p className="mt-1 text-[clamp(0.65rem,2.2vw,0.875rem)] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[#E6E1D8]/80 font-light max-w-md text-balance drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] hidden sm:block">
            Official Conference Information To Be Announced (TBA)
          </p>
        </div>

        {/* SAFE ZONE 2 (MIDDLE): CLEAR VISUAL FOCUS ON MANNEQUIN */}
        <div className="flex-1 pointer-events-none" />

        {/* ================================================================= */}
        {/* SAFE ZONE 3 (BOTTOM): SWAPPING SCROLL-SCRUBBED CAPTIONS           */}
        {/* ================================================================= */}
        <div
          className="relative z-20 px-4 sm:px-6 flex flex-col items-center justify-center text-center pointer-events-none select-none"
          style={{
            paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
          }}
        >
          {/* Caption Box with guaranteed height & centering */}
          <div className="relative min-h-[3.5rem] sm:min-h-[4.5rem] flex items-center justify-center w-full max-w-xl">
            {/* Caption 1: 0–26% */}
            <p
              ref={caption1Ref}
              className="absolute font-cinzel text-[clamp(0.85rem,3.2vw,1.4rem)] uppercase tracking-[0.14em] sm:tracking-[0.2em] text-[#FFF3D6] font-medium leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] will-change-transform"
            >
              Every nation has a face.
            </p>

            {/* Caption 2: 32–66% */}
            <p
              ref={caption2Ref}
              className="absolute font-cinzel text-[clamp(0.85rem,3.2vw,1.4rem)] uppercase tracking-[0.14em] sm:tracking-[0.2em] text-[#F3DFA2] font-medium leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] opacity-0 will-change-transform"
            >
              But behind every mask…
            </p>

            {/* Caption 3: 72–100% */}
            <p
              ref={caption3Ref}
              className="absolute font-cinzel text-[clamp(0.85rem,3.2vw,1.4rem)] uppercase tracking-[0.14em] sm:tracking-[0.2em] text-gold-shimmer font-semibold leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] opacity-0 will-change-transform"
            >
              …is a delegate ready to lead.
            </p>
          </div>

          {/* Scroll Down Indicator */}
          <div
            ref={scrollIndicatorRef}
            className="mt-2 sm:mt-3 flex flex-col items-center gap-1 text-[#D4AF6A]/80 text-[9px] sm:text-[10px] uppercase tracking-[0.3em] font-mono will-change-transform"
          >
            <span className="hidden sm:inline">Scroll To Reveal</span>
            <ChevronDown className="h-4 w-4 animate-bounce text-[#D4AF6A]" />
          </div>
        </div>
      </div>
    </div>
  );
};
