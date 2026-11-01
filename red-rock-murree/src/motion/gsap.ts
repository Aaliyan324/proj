// One place for the animation engine: plugin registration + shared timing standards.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
// Mobile browser bars show/hide and resize the viewport; do not rebuild every pin when that happens.
ScrollTrigger.config({ ignoreMobileResize: true });

/** Easing standards: expo for reveals (fast start, long settle), power3 for travel, none for scrubbed scenes. */
export const EASE = { reveal: 'expo.out', travel: 'power3.inOut', soft: 'power2.out', scrub: 'none' } as const;
/** Duration standards (seconds). */
export const DUR = { fast: 0.5, base: 1, slow: 1.6, hero: 3.2 } as const;
/** Media queries used by every scene so desktop/mobile/reduced-motion decisions stay consistent. */
export const MQ = {
  desktop: '(min-width: 1024px)',
  reduce: '(prefers-reduced-motion: reduce)',
  motion: '(prefers-reduced-motion: no-preference)',
} as const;

export { gsap, ScrollTrigger };
