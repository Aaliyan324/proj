import React, { useRef } from 'react';
import { gsap, EASE } from '../../motion/gsap';
import { scrollToTarget } from '../../motion/SmoothScroll';
import { useScene, themeIn, fadeUpOnce, linesIn, ThemeName } from '../../motion/scene';
import { AdaptiveImage } from './AdaptiveImage';
import { Lines } from './Lines';

interface Props {
  id: string;
  variant: 'doors' | 'wipe';
  from: ThemeName;
  kicker: string;
  lines: string[];
  text: string;
  image: string;
  alt: string;
  /** Focal point for the full-bleed crop, e.g. "50% 35%". */
  position?: string;
  cta?: { label: string; target: string };
}

/**
 * Full-screen scene: the photograph fills the entire viewport and the text sits directly on it (same language as the hero).
 *  - doors: the photo is split into two doors that slide apart (scroll-controlled) while the view behind settles from a zoom.
 *  - wipe: the photo wipes in from the left with a counter-moving zoom.
 * Pinned on desktop; on phones/reduced motion it is the same full-screen frame with a gentle scroll zoom (no pin).
 */
export const FacilityScene: React.FC<Props> = ({ id, variant, from, kicker, lines, text, image, alt, position, cta }) => {
  const root = useRef<HTMLElement>(null);

  const { rich } = useScene(
    root,
    ({ el, rich }) => {
      themeIn(el, from, 'pine');
      const q = (s: string) => el.querySelector(s) as HTMLElement;
      const lineEls = el.querySelectorAll('.fs-line-in');
      if (!rich) {
        linesIn(lineEls, q('.fs-heading'), 'top 75%');
        fadeUpOnce(el.querySelectorAll('.fs-fade'), 'top 70%');
        gsap.fromTo(q('.fs-wipe .ai-img'), { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
        return;
      }
      gsap.set(lineEls, { yPercent: 118 });
      gsap.set(el.querySelectorAll('.fs-fade'), { autoAlpha: 0, y: 30 });
      const tl = gsap.timeline({
        defaults: { ease: EASE.scrub },
        scrollTrigger: { trigger: q('.fs-pin'), start: 'top top', end: '+=160%', scrub: 0.6, pin: true, anticipatePin: 1, invalidateOnRefresh: true },
      });
      if (variant === 'doors') {
        gsap.set(q('.fs-base .ai-img'), { scale: 1.4 });
        tl.to(q('.fs-door-l'), { xPercent: -101, duration: 3, ease: 'power2.inOut' }, 0.3)
          .to(q('.fs-door-r'), { xPercent: 101, duration: 3, ease: 'power2.inOut' }, 0.3)
          .to(q('.fs-base .ai-img'), { scale: 1, duration: 3.6, ease: 'power2.out' }, 0.3);
      } else {
        gsap.set(q('.fs-wipe'), { clipPath: 'inset(0% 100% 0% 0%)' });
        gsap.set(q('.fs-wipe .ai-img'), { scale: 1.35 });
        tl.to(q('.fs-wipe'), { clipPath: 'inset(0% 0% 0% 0%)', duration: 3, ease: 'power2.inOut' }, 0.2)
          .to(q('.fs-wipe .ai-img'), { scale: 1, duration: 3.6, ease: 'power2.out' }, 0.2);
      }
      tl.to(lineEls, { yPercent: 0, duration: 1.4, stagger: 0.2, ease: 'power3.out' }, 1.8)
        .to(el.querySelectorAll('.fs-fade'), { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.15, ease: 'power2.out' }, 2.8)
        .to({}, { duration: 1 }, 4.6);
    },
    [variant]
  );

  const img = (extra = '', alt_ = alt) => (
    <AdaptiveImage src={image} alt={alt_} fit="cover" position={position} eager className={`absolute inset-0 h-full w-full ${extra}`} />
  );

  return (
    <section ref={root} id={id} data-nav="dark" className="cinema relative bg-pine text-mist" aria-label={kicker}>
      <div className="fs-pin relative h-[100svh] min-h-[540px] overflow-hidden">
        {rich && variant === 'doors' ? (
          <>
            <div className="fs-base absolute inset-0">{img()}</div>
            <div className="fs-door-l absolute inset-0 will-change-transform" style={{ clipPath: 'inset(0 50% 0 0)' }}>{img('', '')}</div>
            <div className="fs-door-r absolute inset-0 will-change-transform" style={{ clipPath: 'inset(0 0 0 50%)' }}>{img('', '')}</div>
          </>
        ) : (
          <div className="fs-wipe absolute inset-0">{img()}</div>
        )}

        {/* Readability: darken only the lower-left where the text sits, so the photograph stays bright everywhere else */}
        <div className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-t from-pine/85 via-pine/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-r from-pine/45 via-transparent to-transparent" />

        <div className="absolute inset-x-0 bottom-0 z-40 mx-auto flex max-w-[1600px] flex-col gap-6 px-5 pb-[11vh] sm:px-8">
          <p className="fs-fade t-small uppercase tracking-[0.18em] opacity-80">{kicker}</p>
          <h2 className="fs-heading t-display max-w-[12ch]"><Lines lines={lines} inner="fs-line-in" /></h2>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <p className="fs-fade t-lead text-mist/90">{text}</p>
            {cta && (
              <div className="fs-fade">
                <button type="button" className="rr-btn rr-btn--ghost" onClick={() => scrollToTarget(cta.target)}>{cta.label}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
