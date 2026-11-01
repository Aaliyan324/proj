import React, { useLayoutEffect, useRef } from 'react';
import { gsap, EASE, MQ } from '../../motion/gsap';
import { useMedia } from '../../motion/useMedia';
import { Lines } from './Lines';
// Reference photo 10: deliberately different from the opening scene's second image, so the two never look identical.
const MERGE_IMG = '/images/hd/scene-10.webp';
const MERGE_SRCSET = '/images/hd/scene-10-1280.webp 1280w, /images/hd/scene-10.webp 2560w';

export interface StoryItem {
  key: string;
  title: string;
  text: string;
  image: string;
  alt: string;
}

const PINE = 'rgb(22,33,29)';
const MIST = 'rgb(230,234,228)';

/**
 * Story scene = reference video 8-14s: the page turns from dark to light, then a pinned image/list scene where
 * scrolling (not time) crossfades the photograph and moves the active item. On mobile / reduced motion it becomes a
 * normal stacked layout with simple scroll reveals, so native scrolling is never fought.
 */
export const StoryScene: React.FC<{ items: StoryItem[] }> = ({ items }) => {
  const root = useRef<HTMLElement>(null);
  const stacked = useMedia(`(max-width: 1023px), ${MQ.reduce}`);
  const reduce = useMedia(MQ.reduce);

  useLayoutEffect(() => {
    const el = root.current!;
    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set(el, { backgroundColor: MIST, color: PINE });
        return;
      }
      // Dark -> light: the page background itself changes as the scene enters.
      gsap.fromTo(el, { backgroundColor: PINE, color: MIST }, {
        backgroundColor: MIST, color: PINE, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 30%', scrub: true },
      });
      // Heading: line-by-line, once (simple layout). The pinned layout reveals it inside its timeline instead.
      if (stacked) {
        gsap.from(el.querySelectorAll('.st-line-in'), {
          yPercent: 118, duration: 1.5, ease: EASE.reveal, stagger: 0.13,
          scrollTrigger: { trigger: el.querySelector('.st-heading'), start: 'top 88%', once: true },
        });
      }

      if (!stacked) {
        const imgs = gsap.utils.toArray<HTMLElement>('.st-img', el);
        const imgInner = gsap.utils.toArray<HTMLElement>('.st-img img', el);
        const rows = gsap.utils.toArray<HTMLElement>('.st-row', el);
        const bodies = gsap.utils.toArray<HTMLElement>('.st-body', el);
        gsap.set(imgs.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' });
        gsap.set(rows.slice(1), { opacity: 0.32 });
        gsap.set(bodies.slice(1), { autoAlpha: 0, y: 24 });
        gsap.set(el.querySelector('.st-progress'), { scaleY: 0, transformOrigin: 'top' });
        gsap.set(el.querySelectorAll('.st-line-in'), { yPercent: 118 });
        const pinEl = el.querySelector('.st-pin') as HTMLElement;
        const frameEl = el.querySelector('.st-framebox') as HTMLElement;
        // Rectangle of the photo frame, expressed as an inset() of the full-screen merge layer.
        const frameInset = () => {
          const p = pinEl.getBoundingClientRect(), f = frameEl.getBoundingClientRect();
          return `inset(${f.top - p.top}px ${p.right - f.right}px ${p.bottom - f.bottom}px ${f.left - p.left}px)`;
        };
        const T0 = 2; // scroll units used by the merge before the photo hand-overs begin

        const tl = gsap.timeline({
          defaults: { ease: EASE.scrub },
          scrollTrigger: { trigger: el.querySelector('.st-pin'), start: 'top top', end: `+=${(items.length + 2) * 110}%`, scrub: 0.6, pin: true, anticipatePin: 1, invalidateOnRefresh: true },
        });
        // MERGE: the last frame of the opening scene shrinks into this scene's photo frame, then dissolves into the entrance photo.
        tl.fromTo('.st-merge', { clipPath: 'inset(0px 0px 0px 0px)' }, { clipPath: frameInset, duration: 2, ease: 'power3.inOut', immediateRender: false }, 0)
          .fromTo('.st-merge img', { scale: 1 }, { scale: 1.12, duration: 2 }, 0)
          .to('.st-merge', { autoAlpha: 0, duration: 0.3 }, 1.7)
          .to(el.querySelectorAll('.st-line-in'), { yPercent: 0, duration: 1, stagger: 0.15, ease: 'power3.out' }, 1.1)
          .to(el.querySelector('.st-progress'), { scaleY: 1, duration: items.length }, T0);
        for (let i = 1; i < items.length; i++) {
          const at = T0 + i - 0.5; // each hand-over takes 1 unit and straddles the midpoint of the previous hold
          tl.to(imgs[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.inOut' }, at)
            .fromTo(imgInner[i], { scale: 1.3 }, { scale: 1, duration: 1, ease: 'power2.out' }, at)
            .to(imgInner[i - 1], { scale: 1.12, duration: 1 }, at)
            .to(rows[i - 1], { opacity: 0.32, duration: 0.6 }, at)
            .to(rows[i], { opacity: 1, duration: 0.6 }, at + 0.2)
            .to(bodies[i - 1], { autoAlpha: 0, y: -24, duration: 0.5 }, at)
            .to(bodies[i], { autoAlpha: 1, y: 0, duration: 0.6 }, at + 0.4);
        }
        tl.to({}, { duration: 0.6 }, T0 + items.length - 0.1); // hold on the last item
      } else {
        // Stacked layout: each photograph opens from an inset frame as it scrolls into view.
        gsap.utils.toArray<HTMLElement>('.st-frame', el).forEach((frame) => {
          const img = frame.querySelector('img');
          gsap.fromTo(frame, { clipPath: 'inset(14% 7% 14% 7%)' }, {
            clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
            scrollTrigger: { trigger: frame, start: 'top 92%', end: 'top 35%', scrub: true },
          });
          gsap.fromTo(img, { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: frame, start: 'top 92%', end: 'bottom 40%', scrub: true } });
        });
        gsap.utils.toArray<HTMLElement>('.st-fig-text', el).forEach((t) =>
          gsap.from(t, { autoAlpha: 0, y: 30, duration: 1, ease: EASE.reveal, scrollTrigger: { trigger: t, start: 'top 90%', once: true } })
        );
      }
    }, root);
    return () => ctx.revert();
  }, [stacked, reduce, items.length]);

  const heading = (
    <h2 className="st-heading t-h2">
      <Lines lines={['From the front door', 'to your room.']} inner="st-line-in" />
    </h2>
  );

  return (
    <section ref={root} id="hotel" data-nav="light" className="cinema relative bg-pine text-mist" aria-label="The hotel">
      {!stacked ? (
        <div className="st-pin relative grid h-[100svh] grid-cols-12 items-center gap-x-8 px-8 pb-10 pt-28">
          <div className="st-merge pointer-events-none absolute inset-0 z-20 overflow-hidden bg-pine" aria-hidden="true">
            <img src={MERGE_IMG} srcSet={MERGE_SRCSET} sizes="100vw" alt="" className="h-full w-full object-cover will-change-transform" />
            <div className="absolute inset-0 bg-gradient-to-t from-pine/85 via-pine/25 to-pine/50" />
          </div>
          <div className="col-span-6 h-full max-h-[78svh] self-center">
            <div className="st-framebox relative h-full w-full overflow-hidden bg-pine-2">
              {items.map((it, i) => (
                <div key={it.key} className="st-img absolute inset-0" style={{ zIndex: i }}>
                  <img src={it.image} alt={it.alt} className="h-full w-full object-cover will-change-transform" loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-5 col-start-8 flex flex-col gap-12">
            {heading}
            <div className="flex gap-7">
              <div className="relative w-px shrink-0 bg-pine/20" aria-hidden="true">
                <div className="st-progress absolute inset-0 bg-rock" />
              </div>
              <div className="flex flex-col gap-9">
                <ul className="flex flex-col gap-3">
                  {items.map((it) => (
                    <li key={it.key} className="st-row t-h3">{it.title}</li>
                  ))}
                </ul>
                <div className="relative min-h-[8.5rem]">
                  {items.map((it) => (
                    <p key={it.key} className="st-body t-body absolute inset-x-0 top-0">{it.text}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-[640px] flex-col gap-16 px-5 pb-24 pt-32 sm:px-8 lg:max-w-[1100px]">
          {heading}
          {items.map((it) => (
            <figure key={it.key} className="flex flex-col gap-6">
              <div className="st-frame aspect-[4/5] w-full overflow-hidden bg-pine-2 sm:aspect-[4/3]">
                <img src={it.image} alt={it.alt} className="h-full w-full object-cover will-change-transform" loading="lazy" decoding="async" />
              </div>
              <figcaption className="st-fig-text flex flex-col gap-3">
                <h3 className="t-h3">{it.title}</h3>
                <p className="t-body">{it.text}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
};
