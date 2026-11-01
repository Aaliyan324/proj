import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger, MQ } from './gsap';

// Single smooth-scroll system for the whole site. GSAP's ticker drives Lenis, and Lenis feeds ScrollTrigger,
// so there is exactly one scroll loop and no competing scroll handlers.
let lenis: Lenis | null = null;

export function scrollToTarget(target: string | number | HTMLElement, duration = 1.6) {
  if (lenis) {
    lenis.scrollTo(target as any, { duration, easing: (t: number) => 1 - Math.pow(1 - t, 4) });
    return;
  }
  if (typeof target === 'string') document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
  else if (typeof target === 'number') window.scrollTo({ top: target, behavior: 'smooth' });
  else target.scrollIntoView({ behavior: 'smooth' });
}

/** Freeze/unfreeze page scrolling (menu overlay, admin modals). Nested scrollers keep working natively. */
export function setScrollLocked(locked: boolean) {
  if (locked) lenis?.stop();
  else lenis?.start();
}

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia(MQ.reduce).matches) return; // native scrolling for reduced motion
    const instance = new Lenis({ lerp: 0.09, smoothWheel: true, syncTouch: false }); // touch stays native
    lenis = instance;
    instance.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      lenis = null;
    };
  }, []);
  return null;
}
