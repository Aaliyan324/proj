import React, { useLayoutEffect, useRef } from 'react';
import { gsap, EASE, DUR, MQ } from '../../motion/gsap';
import { scrollToTarget } from '../../motion/SmoothScroll';
import { Lines } from './Lines';

// Photographs come from the project's own gallery (Murree scenery). Swap for a hotel-exterior photo when supplied.
const HERO_IMG = '/images/murree.webp';
export const LAYER_IMG = '/images/featured-image.webp';

/**
 * Opening scene = the reference video's first 9 seconds:
 *  1. timed intro: veil lifts, image settles from a slow zoom, headline rises line by line
 *  2. scroll (pinned): hero keeps zooming while a second image rises as a thin band, then opens to full screen
 *  3. a numeral rolls up to the real room count
 */
export const OpeningScene: React.FC<{ roomCount: number }> = ({ roomCount }) => {
  const root = useRef<HTMLElement>(null);
  const digits = String(roomCount).split('').map(Number);

  // ---- 1. Intro (time-based, runs once) ----
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (window.matchMedia(MQ.reduce).matches) {
        gsap.set('.hero-veil', { autoAlpha: 0 });
        return;
      }
      gsap.set('.hero-line-in', { yPercent: 118 });
      gsap.set('.hero-fade', { autoAlpha: 0, y: 26 });
      gsap
        .timeline({ defaults: { ease: EASE.reveal } })
        .fromTo('.hero-zoom', { scale: 1.34 }, { scale: 1.1, duration: DUR.hero, ease: EASE.soft }, 0)
        .to('.hero-veil', { autoAlpha: 0, duration: 1.5, ease: 'power2.inOut' }, 0)
        .to('.hero-line-in', { yPercent: 0, duration: 1.6, stagger: 0.15 }, 0.9)
        .to('.hero-fade', { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.12 }, 1.9);
    }, root);
    return () => ctx.revert();
  }, []);

  // ---- 2. Scroll scene (scrubbed + pinned) ----
  useLayoutEffect(() => {
    const el = root.current!;
    const mm = gsap.matchMedia();
    const ctx = gsap.context(() => {
      const q = (s: string) => el.querySelector(s) as HTMLElement;

      mm.add(MQ.reduce, () => {
        // Reduced motion: no pin, no scrub. The second image simply follows the hero as a normal block.
        gsap.set(q('.op-stage'), { height: 'auto' });
        gsap.set(q('.hero-block'), { position: 'relative', height: '100svh' });
        gsap.set(q('.op-layer'), { position: 'relative', clipPath: 'none', height: '100svh' });
        gsap.set(el.querySelectorAll('.roll'), { yPercent: (_i: number, t: Element) => -(10 + Number((t as HTMLElement).dataset.d)) * 5 });
      });

      mm.add({ motion: MQ.motion, desktop: MQ.desktop }, (c) => {
        if (!c.conditions?.motion) return; // matchMedia also fires for the desktop query alone; never animate under reduced motion
        const desktop = !!c.conditions?.desktop;
        const rolls = Array.from(el.querySelectorAll<HTMLElement>('.roll'));
        gsap.set(q('.op-layer'), { clipPath: 'inset(100% 0% 0% 0%)' });
        gsap.set(rolls, { yPercent: 0 });
        gsap.set(q('.op-layer-copy'), { autoAlpha: 0, y: 60 });

        const tl = gsap.timeline({
          defaults: { ease: EASE.scrub },
          scrollTrigger: {
            trigger: q('.op-stage'),
            start: 'top top',
            end: desktop ? '+=260%' : '+=190%',
            scrub: desktop ? 0.6 : true,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        tl.to(q('.hero-media'), { scale: 1.28, duration: 7 }, 0) // hero keeps drifting inward
          .to(q('.hero-copy'), { yPercent: -16, autoAlpha: 0, duration: 3.4, ease: 'power1.in' }, 0)
          .to(q('.hero-cue'), { autoAlpha: 0, duration: 0.6 }, 0)
          .to(q('.hero-shade'), { opacity: 0.55, duration: 5 }, 1)
          // the next photograph peeks up as a band ...
          .to(q('.op-layer'), { clipPath: 'inset(86% 0% 0% 0%)', duration: 2, ease: 'power1.out' }, 0.4)
          // ... then opens to full screen while its image settles from a deeper zoom
          .fromTo(q('.op-layer'), { clipPath: 'inset(86% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 4.2, ease: 'power2.inOut', immediateRender: false }, 2.4)
          .fromTo(q('.op-layer-img'), { scale: 1.38, yPercent: -8 }, { scale: 1, yPercent: 0, duration: 6.2 }, 0.4)
          // content of the second layer
          .to(q('.op-layer-copy'), { autoAlpha: 1, y: 0, duration: 1.6, ease: 'power2.out' }, 6.1)
          .to(rolls, { yPercent: (_i: number, t: Element) => -(10 + Number((t as HTMLElement).dataset.d)) * 5, duration: 2.6, ease: 'power3.out', stagger: 0.25 }, 6.3)
          .to({}, { duration: 1.2 }, 8.9); // hold on the finished frame
      });
    }, root);
    return () => {
      mm.revert();
      ctx.revert();
    };
  }, [roomCount]);

  return (
    <section ref={root} id="home" data-nav="dark" className="cinema relative bg-pine text-mist" aria-label="Welcome to Red Rock Murree">
      <div className="op-stage relative h-[100svh] overflow-hidden">
        {/* HERO */}
        <div className="hero-block absolute inset-0">
          <div className="hero-media absolute inset-0 will-change-transform">
            <img
              src={HERO_IMG}
              alt="Murree hills at dusk"
              className="hero-zoom absolute inset-0 h-full w-full object-cover will-change-transform"
              fetchPriority="high"
              decoding="async"
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-pine/80 via-pine/15 to-pine/45" />
          <div className="hero-shade pointer-events-none absolute inset-0 bg-pine opacity-0" />

          <div className="hero-copy absolute inset-x-0 bottom-0 mx-auto flex max-w-[1600px] flex-col gap-8 px-5 pb-[13vh] sm:px-8">
            <h1 className="t-display max-w-[14ch]">
              <Lines lines={['The hills of Murree,', '42 rooms.']} inner="hero-line-in" />
            </h1>
            <div className="hero-fade flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
              <p className="t-lead text-fog">Red Rock Murree is a 42-room hotel in Murree. See which rooms are free right now and send your inquiry on WhatsApp.</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="rr-btn" onClick={() => scrollToTarget('#availability')}>Check availability</button>
                <button type="button" className="rr-btn rr-btn--ghost" onClick={() => scrollToTarget('#hotel')}>Explore the hotel</button>
              </div>
            </div>
          </div>

          <div className="hero-cue absolute bottom-6 left-1/2 -translate-x-1/2" aria-hidden="true">
            <div className="hero-fade rr-cue" />
          </div>
          <div className="hero-veil pointer-events-none absolute inset-0 bg-pine" />
        </div>

        {/* SECOND LAYER: rises over the hero */}
        <div className="op-layer absolute inset-0 overflow-hidden bg-pine">
          <img src={LAYER_IMG} alt="Green hills near Murree" className="op-layer-img absolute inset-0 h-full w-full object-cover will-change-transform" loading="eager" decoding="async" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-pine/85 via-pine/25 to-pine/50" />
          <div className="op-layer-copy absolute inset-x-0 bottom-0 mx-auto flex max-w-[1600px] flex-col justify-between gap-8 px-5 pb-[9vh] sm:px-8 md:flex-row md:items-end">
            <div className="flex items-end gap-[0.04em] font-[family-name:var(--font-display)] text-[clamp(8rem,26vw,22rem)] leading-[0.8] tracking-[-0.04em]" role="img" aria-label={`${roomCount} rooms`}>
              {digits.map((d, i) => (
                <span key={i} className="rr-roll-wrap" aria-hidden="true">
                  <span className="rr-roll roll" data-d={d}>
                    {Array.from({ length: 20 }, (_, n) => (
                      <span key={n}>{n % 10}</span>
                    ))}
                  </span>
                </span>
              ))}
            </div>
            <div className="flex max-w-[30ch] flex-col gap-5 pb-2">
              <p className="t-lead">rooms. Each one is shown live as available, occupied, reserved or under maintenance.</p>
              <div>
                <button type="button" className="rr-btn rr-btn--ghost" onClick={() => scrollToTarget('#availability')}>See every room</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
