import React, { useRef } from 'react';
import { gsap } from '../../motion/gsap';
import { useScene, themeIn, linesIn, frameOpen } from '../../motion/scene';
import { AdaptiveImage } from './AdaptiveImage';
import { Lines } from './Lines';

// Only facts the owner has given: a hotel in Murree, 42 rooms, WhatsApp inquiries, cash payment at the hotel.
const STATEMENT = 'Red Rock Murree is a hotel in Murree with 42 rooms. See which rooms are free, send your booking inquiry on WhatsApp, and pay in cash at the hotel.';

/** About: one large statement whose words light up as you read (scrubbed), with a slow parallax photograph. */
export const AboutScene: React.FC = () => {
  const root = useRef<HTMLElement>(null);
  useScene(root, ({ el, rich }) => {
    themeIn(el, 'mist', 'pine');
    linesIn(el.querySelectorAll('.ab-line-in'), el.querySelector('.ab-heading')!);
    gsap.fromTo(el.querySelectorAll('.ab-word'), { opacity: 0.16 }, {
      opacity: 1, ease: 'none', stagger: 0.12,
      scrollTrigger: { trigger: el.querySelector('.ab-statement'), start: 'top 78%', end: 'bottom 55%', scrub: true },
    });
    const frame = el.querySelector('.ab-frame') as HTMLElement;
    frameOpen(frame, null);
    gsap.fromTo(frame.querySelector('.ai-img'), { yPercent: rich ? -12 : -6, scale: 1.2 }, { yPercent: rich ? 12 : 6, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  return (
    <section ref={root} id="about" data-nav="dark" className="cinema relative bg-pine text-mist" aria-label="About Red Rock Murree">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-16 px-5 py-28 sm:px-8 lg:py-40">
        <div className="flex flex-col gap-6">
          <p className="t-small uppercase tracking-[0.18em] opacity-70">About</p>
          <h2 className="ab-heading t-h2"><Lines lines={['A hotel in Murree.']} inner="ab-line-in" /></h2>
        </div>
        <p className="ab-statement t-h3 max-w-[26ch] !leading-[1.18] lg:text-[clamp(2rem,3.6vw,3.6rem)]" aria-label={STATEMENT}>
          {STATEMENT.split(' ').map((w, i) => (<span key={i} className="ab-word inline-block pr-[0.28em]" aria-hidden="true">{w}</span>))}
        </p>
        <div className="ab-frame aspect-[16/9] w-full overflow-hidden lg:aspect-[21/9]">
          <AdaptiveImage src="/images/Murree-Pakistan-Height-from-Sea-Level-.webp" alt="Mountains around Murree" className="h-full w-full" />
        </div>
      </div>
    </section>
  );
};
