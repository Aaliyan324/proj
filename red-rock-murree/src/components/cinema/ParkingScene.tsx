import React, { useRef } from 'react';
import { gsap } from '../../motion/gsap';
import { useScene, themeIn, frameOpen, fadeUpOnce, linesIn } from '../../motion/scene';
import { AdaptiveImage } from './AdaptiveImage';
import { Lines } from './Lines';

// Titles come from the existing parking section. Captions that claimed "secure" / "24/7" were removed (unverified).
const PARKING = [
  { src: '/images/multi-storey-car-park-1271919_1280.jpg', title: 'Main parking area' },
  { src: '/images/360_F_330787755_RSUhTI7LvN3UUvGWus7t90Sh8yACJ8Lb.jpg', title: 'Covered parking' },
  { src: '/images/360_F_45379214_E6PlG0YCUvxFeRYpZcBVSiRksPhQulgy.jpg', title: 'Guest parking' },
];
const idx = (n: number) => String(n + 1).padStart(2, '0');

/** Parking: pinned. Each photograph wipes up over the last while the title swaps and a progress line fills. */
export const ParkingScene: React.FC = () => {
  const root = useRef<HTMLElement>(null);
  const N = PARKING.length;

  const { rich } = useScene(root, ({ el, rich }) => {
    themeIn(el, 'pine', 'mist');
    const lineEls = el.querySelectorAll('.pk-line-in');
    if (!rich) {
      linesIn(lineEls, el.querySelector('.pk-heading')!);
      el.querySelectorAll<HTMLElement>('.pk-frame').forEach((f) => frameOpen(f, f.querySelector('.ai-img')));
      fadeUpOnce(el.querySelectorAll('.pk-fade'));
      return;
    }
    const imgs = gsap.utils.toArray<HTMLElement>('.pk-img', el);
    const titles = gsap.utils.toArray<HTMLElement>('.pk-title', el);
    gsap.set(imgs.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(titles.slice(1), { autoAlpha: 0, y: 24 });
    gsap.set(lineEls, { yPercent: 118 });
    gsap.set(el.querySelector('.pk-progress'), { scaleX: 0, transformOrigin: 'left' });
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: el.querySelector('.pk-pin'), start: 'top top', end: `+=${N * 100}%`, scrub: 0.6, pin: true, anticipatePin: 1, invalidateOnRefresh: true } });
    tl.to(lineEls, { yPercent: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out' }, 0)
      .to(el.querySelector('.pk-progress'), { scaleX: 1, duration: N }, 0.4);
    for (let i = 1; i < N; i++) {
      const at = i - 0.3;
      tl.to(imgs[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.inOut' }, at)
        .fromTo(imgs[i].querySelector('.ai-img'), { scale: 1.3, yPercent: 6 }, { scale: 1, yPercent: 0, duration: 1.2, ease: 'power2.out' }, at)
        .to(imgs[i - 1].querySelector('.ai-img'), { scale: 1.1, yPercent: -5, duration: 1 }, at)
        .to(titles[i - 1], { autoAlpha: 0, y: -24, duration: 0.5 }, at)
        .to(titles[i], { autoAlpha: 1, y: 0, duration: 0.6 }, at + 0.4);
    }
    tl.to({}, { duration: 0.5 }, N - 0.2);
  });

  const heading = <h2 className="pk-heading t-h2"><Lines lines={['Parking.']} inner="pk-line-in" /></h2>;

  return (
    <section ref={root} id="parking" data-nav="light" className="cinema relative bg-mist text-pine" aria-label="Parking">
      {rich ? (
        <div className="pk-pin grid h-[100svh] grid-cols-12 items-center gap-x-8 px-8 pb-8 pt-24">
          <div className="col-span-4 flex flex-col gap-10">
            <p className="t-small uppercase tracking-[0.18em] opacity-70">On-site</p>
            {heading}
            <div className="relative min-h-[3.2rem]">
              {PARKING.map((p, i) => (
                <p key={p.src} className="pk-title t-h3 absolute inset-x-0 top-0"><span className="t-small mr-3 opacity-60">{idx(i)} / {idx(N - 1)}</span>{p.title}</p>
              ))}
            </div>
            <div className="h-px w-full bg-pine/20" aria-hidden="true"><div className="pk-progress h-full w-full bg-rock" /></div>
          </div>
          <div className="col-span-8 h-full max-h-[78svh]">
            <div className="relative h-full w-full overflow-hidden bg-pine-2">
              {PARKING.map((p, i) => (
                <div key={p.src} className="pk-img absolute inset-0" style={{ zIndex: i }}><AdaptiveImage src={p.src} alt={p.title} className="h-full w-full" eager={i === 0} /></div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-[640px] flex-col gap-12 px-5 py-28 sm:px-8">
          <div className="flex flex-col gap-5"><p className="pk-fade t-small uppercase tracking-[0.18em] opacity-70">On-site</p>{heading}</div>
          {PARKING.map((p, i) => (
            <figure key={p.src} className="flex flex-col gap-4">
              <div className="pk-frame overflow-hidden"><AdaptiveImage src={p.src} alt={p.title} className="aspect-[4/3] w-full" /></div>
              <figcaption className="pk-fade t-h3"><span className="t-small mr-3 opacity-60">{idx(i)}</span>{p.title}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
};
