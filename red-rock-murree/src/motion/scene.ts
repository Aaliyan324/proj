import { RefObject, useLayoutEffect } from 'react';
import { gsap, ScrollTrigger, EASE, MQ } from './gsap';
import { useMedia } from './useMedia';

/** The two surfaces of the site. Every scene eases from the previous scene's surface to its own while it enters. */
export const THEME = {
  pine: { bg: 'rgb(22,33,29)', ink: 'rgb(230,234,228)' },
  mist: { bg: 'rgb(230,234,228)', ink: 'rgb(22,33,29)' },
} as const;
export type ThemeName = keyof typeof THEME;

/** Background/ink cross-fade as a scene scrolls in, so sections never meet at a hard edge. */
export function themeIn(el: Element, from: ThemeName, to: ThemeName) {
  gsap.fromTo(
    el,
    { backgroundColor: THEME[from].bg, color: THEME[from].ink },
    {
      backgroundColor: THEME[to].bg, color: THEME[to].ink, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 35%', scrub: true },
    }
  );
}

/** Line-by-line heading reveal (masked slide-up), fired once when the heading is on screen. */
export function linesIn(lines: ArrayLike<Element>, trigger: Element, start = 'top 88%') {
  gsap.from(lines, { yPercent: 118, duration: 1.5, ease: EASE.reveal, stagger: 0.13, scrollTrigger: { trigger, start, once: true } });
}

/** Photo opens from an inset frame and settles from a zoom while its block scrolls into view (simple/mobile layouts). */
export function frameOpen(frame: Element, img?: Element | null) {
  gsap.fromTo(frame, { clipPath: 'inset(14% 7% 14% 7%)' }, {
    clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
    scrollTrigger: { trigger: frame, start: 'top 92%', end: 'top 35%', scrub: true },
  });
  if (img) gsap.fromTo(img, { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: frame, start: 'top 92%', end: 'bottom 40%', scrub: true } });
}

/** Fade/slide a block in once. */
export function fadeUpOnce(target: Element | Element[] | NodeListOf<Element>, start = 'top 90%') {
  gsap.from(target, { autoAlpha: 0, y: 34, duration: 1.1, ease: EASE.reveal, stagger: 0.1, scrollTrigger: { trigger: (target as any)[0] ?? target, start, once: true } });
}

/** Pinned timeline whose scroll length = horizontal distance of `track` + extra viewport heights. */
export function pinnedHorizontal(pin: Element, track: HTMLElement, extraVh = 0) {
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const tl = gsap.timeline({
    defaults: { ease: EASE.scrub },
    scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${dist() + window.innerHeight * extraVh}`, scrub: 0.7, pin: true, anticipatePin: 1, invalidateOnRefresh: true },
  });
  return { tl, dist };
}

// Content that arrives after first paint (food, gallery) changes page height. One debounced re-measure keeps every
// later scene's trigger positions correct without a refresh storm at load.
let refreshTimer: number | undefined;
function scheduleRefresh() {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
}

export interface SceneEnv { el: HTMLElement; rich: boolean }

/**
 * One rule-set for every scene: builds inside a gsap.context (clean teardown), never animates under reduced motion,
 * and tells the scene whether to use its rich (desktop, pinned) or simple (mobile / reduced) layout.
 * `build` re-runs when `deps` change, so layout-changing data (e.g. item counts) re-creates the triggers.
 */
export function useScene(root: RefObject<HTMLElement | null>, build: (env: SceneEnv) => void, deps: unknown[] = []) {
  const reduce = useMedia(MQ.reduce);
  const desktop = useMedia(MQ.desktop);
  const rich = desktop && !reduce;
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || reduce) return;
    const ctx = gsap.context(() => build({ el, rich }), el);
    scheduleRefresh();
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce, rich, ...deps]);
  return { rich, reduce };
}
