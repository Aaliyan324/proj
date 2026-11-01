import React, { useRef } from 'react';
import { gsap } from '../../motion/gsap';
import { scrollToTarget } from '../../motion/SmoothScroll';
import { useScene, themeIn, frameOpen, fadeUpOnce, linesIn, pinnedHorizontal } from '../../motion/scene';
import { ROOM_CATEGORIES, TOTAL_ROOMS } from '../../data/roomCategories';
import { AdaptiveImage } from './AdaptiveImage';
import { Lines } from './Lines';

const label = (n: number) => String(n + 1).padStart(2, '0');

/**
 * Rooms: three collections, not 20 cards.
 * Rich: pinned. (1) a photograph opens from a small window to full screen while "Rooms" rises line by line,
 * (2) the intro dissolves, (3) the three collections travel horizontally with counter-moving photographs.
 * Simple: stacked collections with scroll-opened frames.
 */
export const RoomCategoriesScene: React.FC = () => {
  const root = useRef<HTMLElement>(null);

  const { rich } = useScene(root, ({ el, rich }) => {
    themeIn(el, 'pine', 'mist');
    const q = (s: string) => el.querySelector(s) as HTMLElement;
    const lineEls = el.querySelectorAll('.rc-line-in');
    if (!rich) {
      linesIn(lineEls, q('.rc-heading'));
      el.querySelectorAll<HTMLElement>('.rc-frame').forEach((f) => frameOpen(f, f.querySelector('.ai-img')));
      fadeUpOnce(el.querySelectorAll('.rc-fade'));
      return;
    }
    gsap.set(q('.rc-intro-img'), { clipPath: 'inset(34% 36% 34% 36%)' });
    gsap.set(lineEls, { yPercent: 118 });
    gsap.set(q('.rc-trackwrap'), { autoAlpha: 0 });
    const { tl, dist } = pinnedHorizontal(q('.rc-pin'), q('.rc-track'), 2.2);

    tl.to(q('.rc-intro-img'), { clipPath: 'inset(0% 0% 0% 0%)', duration: 3, ease: 'power2.inOut' }, 0)
      .fromTo(q('.rc-intro-img .ai-img'), { scale: 1.4 }, { scale: 1, duration: 3.6 }, 0)
      .to(lineEls, { yPercent: 0, duration: 1.2, stagger: 0.2, ease: 'power3.out' }, 1.8)
      .to(q('.rc-intro'), { autoAlpha: 0, duration: 1, ease: 'power1.in' }, 4.8)
      .to(q('.rc-trackwrap'), { autoAlpha: 1, duration: 0.8 }, 4.6)
      .to(q('.rc-track'), { x: () => -dist(), duration: 6 }, 5.4)
      .fromTo(el.querySelectorAll('.rc-panel .ai-img'), { xPercent: -7 }, { xPercent: 7, duration: 6 }, 5.4);
  });

  return (
    <section ref={root} id="rooms" data-nav="light" className="cinema relative bg-mist text-pine" aria-label="Room categories">
      {rich ? (
        <div className="rc-pin relative h-[100svh] overflow-hidden">
          {/* 1. intro: window opens to a full-screen room photograph */}
          <div className="rc-intro absolute inset-0 z-10 text-mist">
            <div className="rc-intro-img absolute inset-0"><AdaptiveImage src={ROOM_CATEGORIES[0].image} alt={ROOM_CATEGORIES[0].alt} className="h-full w-full" eager /></div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-pine/80 via-pine/20 to-pine/50" />
            <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[1600px] flex-col gap-6 px-8 pb-[12vh]">
              <h2 className="rc-heading t-display"><Lines lines={['Rooms.']} inner="rc-line-in" /></h2>
              <p className="t-lead">{TOTAL_ROOMS} rooms in four categories.</p>
            </div>
          </div>
          {/* 2. the three collections */}
          <div className="rc-trackwrap absolute inset-0 flex flex-col justify-center gap-8 pt-20">
            <p className="px-8 t-small uppercase tracking-[0.18em] opacity-70">Four room categories</p>
            <div className="rc-track flex w-max gap-6 pl-8 pr-[10vw]">
              {ROOM_CATEGORIES.map((c, i) => (
                <article key={c.key} className="rc-panel relative h-[66svh] w-[58vw] shrink-0 overflow-hidden bg-pine-2 text-mist">
                  <AdaptiveImage src={c.image} alt={c.alt} className="h-full w-full [&_.ai-img]:scale-[1.18]" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-pine/85 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-8">
                    <div>
                      <p className="t-small opacity-70">{label(i)}</p>
                      <h3 className="t-h2">{c.name}</h3>
                      <p className="t-lead mt-2">{c.total} rooms</p>
                    </div>
                    <button type="button" className="rr-btn rr-btn--ghost rr-btn--sm" onClick={() => scrollToTarget('#availability')}>See availability</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-[640px] flex-col gap-14 px-5 py-28 sm:px-8">
          <div className="flex flex-col gap-5">
            <p className="rc-fade t-small uppercase tracking-[0.18em] opacity-70">Four room categories</p>
            <h2 className="rc-heading t-display"><Lines lines={['Rooms.']} inner="rc-line-in" /></h2>
            <p className="rc-fade t-body">{TOTAL_ROOMS} rooms in four categories.</p>
          </div>
          {ROOM_CATEGORIES.map((c, i) => (
            <figure key={c.key} className="flex flex-col gap-5">
              <div className="rc-frame overflow-hidden"><AdaptiveImage src={c.image} alt={c.alt} className="aspect-[4/5] w-full sm:aspect-[4/3]" /></div>
              <figcaption className="rc-fade flex items-end justify-between gap-4">
                <div>
                  <p className="t-small opacity-70">{label(i)}</p>
                  <h3 className="t-h3">{c.name}</h3>
                  <p className="t-body">{c.total} rooms</p>
                </div>
                <button type="button" className="rr-btn rr-btn--sm" onClick={() => scrollToTarget('#availability')}>See availability</button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
};
