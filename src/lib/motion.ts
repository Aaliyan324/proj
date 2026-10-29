/**
 * Motion system — Lenis smooth scrolling + GSAP ScrollTrigger integration.
 *
 * Design rules:
 *  - Smooth scrolling applies to the public-facing document scroll only.
 *    Modals / dashboards use their own inner scroll containers, which Lenis
 *    never touches (it only intercepts page-level wheel/touch events).
 *  - `prefers-reduced-motion` fully disables Lenis and is honored by the
 *    Reveal component (content renders visible without any animation).
 *  - One global Lenis instance, created once, cleaned up on unmount, and
 *    Strict-Mode safe (module-level guard prevents double initialization).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

let lenisInstance: Lenis | null = null;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function getLenis(): Lenis | null {
  return lenisInstance;
}

/**
 * Programmatic smooth scroll to an element id or "#anchor" href.
 * Falls back to native smooth scrolling when Lenis is off.
 */
export function scrollToTarget(target: string | HTMLElement, options?: { offset?: number }) {
  const el = typeof target === 'string'
    ? document.querySelector(target.startsWith('#') ? target : `#${target}`)
    : target;
  if (!el) return;

  if (lenisInstance) {
    lenisInstance.scrollTo(el, { offset: options?.offset ?? -90, duration: 1.1 });
    return;
  }
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

/**
 * Initialize Lenis and drive it from GSAP's ticker so ScrollTrigger and
 * Lenis share one animation loop (recommended integration).
 * Returns a cleanup function. Safe under React Strict Mode.
 */
export function initSmoothScroll(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (prefersReducedMotion()) return () => {};
  if (lenisInstance) return () => destroySmoothScroll(); // already running (Strict Mode remount)

  lenisInstance = new Lenis({
    duration: 1.15,
    smoothWheel: true,
    // Touch devices keep native scrolling (smooth: false behavior on touch),
    // avoiding the jittery experience on low-powered mobile browsers.
    touchMultiplier: 1.4,
    syncing: false,
  } as any);

  const onRaf = (time: number) => lenisInstance?.raf(time * 1000);
  gsap.ticker.add(onRaf);
  gsap.ticker.lagSmoothing(0);

  // Keep ScrollTrigger in sync with Lenis' scroll events.
  lenisInstance.on('scroll', () => ScrollTrigger.update());

  // Route in-page anchor clicks through Lenis so navigation matches the
  // smooth-scroll feel and lands with the correct header offset.
  const onDocClick = (e: MouseEvent) => {
    const anchor = (e.target as HTMLElement | null)?.closest?.('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    if (!href.startsWith('#') || href.length < 2) return;
    let target: Element | null = null;
    try {
      target = document.querySelector(href);
    } catch {
      return; // invalid selector — let the browser handle it
    }
    if (!target) return;
    e.preventDefault();
    scrollToTarget(target as HTMLElement);
  };
  document.addEventListener('click', onDocClick);

  ScrollTrigger.refresh();

  return () => {
    document.removeEventListener('click', onDocClick);
    gsap.ticker.remove(onRaf);
    destroySmoothScroll();
  };
}

function destroySmoothScroll() {
  if (lenisInstance) {
    lenisInstance.destroy();
    lenisInstance = null;
  }
}
