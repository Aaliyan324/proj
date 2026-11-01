import React, { useRef } from 'react';
import { gsap, EASE } from '../../motion/gsap';
import { useScene, themeIn } from '../../motion/scene';
import { AdaptiveImage } from './AdaptiveImage';
import { Lines } from './Lines';

interface Viewpoint { src: string; srcSet?: string; title: string }
const two = (n: string) => ({ src: `/images/hd/scene-${n}.webp`, srcSet: `/images/hd/scene-${n}-1280.webp 1280w, /images/hd/scene-${n}.webp 2560w` });

/**
 * Final visual section. Order is fixed by the owner: the Church Tower at Dusk first (best image), then the supplied
 * reference photographs 1 to 10 in their numbered order. Titles only describe what is visible in each photograph.
 */
const VIEWPOINTS: Viewpoint[] = [
  { src: '/images/murree.webp', title: 'Church Tower at Dusk' },
  { ...two('01'), title: 'Pine Tree and Cloudy Sky' },
  { ...two('02'), title: 'Cable Car Over the Valley' },
  { ...two('03'), title: 'Hillside Village Under the Clouds' },
  { ...two('04'), title: 'Sunset Above the Clouds' },
  { ...two('05'), title: 'Hill Town Lights at Dusk' },
  { ...two('06'), title: 'Valley Road at Blue Hour' },
  { ...two('07'), title: 'Sun Setting Behind the Ridges' },
  { ...two('08'), title: 'Town Lights Through the Trees' },
  { ...two('09'), title: 'Night Over the Valley' },
  { ...two('10'), title: 'Winding Road Through Autumn Pines' },
];

/**
 * Viewpoints: a curtain. Every full-screen photograph is `position: sticky`, so the next one slides up over it (pure CSS
 * layering, so it also works with native mobile scrolling). GSAP adds the opening frame, the settling zoom and the dimming
 * of the photo being covered.
 */
export const ViewpointsScene: React.FC = () => {
  const root = useRef<HTMLElement>(null);

  useScene(root, ({ el }) => {
    themeIn(el, 'mist', 'pine');
    gsap.from(el.querySelectorAll('.vp-intro-line'), { yPercent: 118, duration: 1.6, ease: EASE.reveal, stagger: 0.15, scrollTrigger: { trigger: el, start: 'top 60%', once: true } });
    const nodes = gsap.utils.toArray<HTMLElement>('.vp-panel', el);
    nodes.forEach((p, i) => {
      const st = { trigger: p, start: 'top bottom', end: 'top top', scrub: true };
      gsap.fromTo(p, { clipPath: 'inset(16% 8% 0% 8%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: st });
      gsap.fromTo(p.querySelector('.ai-img'), { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: st });
      if (i > 0) gsap.to(nodes[i - 1].querySelector('.vp-shade'), { opacity: 0.7, ease: 'none', scrollTrigger: st });
      gsap.from(p.querySelectorAll('.vp-cap-in'), { yPercent: 118, duration: 1.3, ease: EASE.reveal, stagger: 0.1, scrollTrigger: { trigger: p, start: 'top 35%', once: true } });
    });
  });

  return (
    <section ref={root} id="viewpoints" data-nav="dark" className="cinema relative bg-pine text-mist" aria-label="Viewpoints">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-end gap-6 px-5 pb-[14vh] sm:px-8">
        <p className="t-small uppercase tracking-[0.18em] opacity-70">Murree</p>
        <h2 className="t-display"><Lines lines={['Viewpoints.']} inner="vp-intro-line" /></h2>
        <p className="t-lead text-fog">Scenes from around Murree.</p>
      </div>
      {VIEWPOINTS.map((v, i) => (
        <div key={v.src} className="vp-panel sticky top-0 h-[100svh] overflow-hidden bg-pine">
          <AdaptiveImage src={v.src} srcSet={v.srcSet} sizes="100vw" alt={v.title} fit="cover" eager={i < 2} className="absolute inset-0 h-full w-full" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-pine/80 via-transparent to-pine/30" />
          <div className="vp-shade pointer-events-none absolute inset-0 bg-pine opacity-0" />
          <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[1600px] flex-col gap-3 px-5 pb-[9vh] sm:px-8">
            <p className="t-small opacity-75">{String(i + 1).padStart(2, '0')} / {String(VIEWPOINTS.length).padStart(2, '0')}</p>
            <h3 className="t-h2"><span className="rr-line"><span className="rr-line-in vp-cap-in">{v.title}</span></span></h3>
          </div>
        </div>
      ))}
    </section>
  );
};
