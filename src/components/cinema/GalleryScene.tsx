import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { gsap } from '../../motion/gsap';
import { setScrollLocked } from '../../motion/SmoothScroll';
import { useScene, themeIn, linesIn, pinnedHorizontal } from '../../motion/scene';
import { DynamicGalleryItem } from '../../services/apiService';
import { useGallery } from './useGallery';
import { AdaptiveImage } from './AdaptiveImage';
import { Lines } from './Lines';

const TABS = [
  { id: 'all', label: 'All photos' },
  { id: 'parking', label: 'Parking' },
  { id: 'scenery', label: 'Scenery' },
  { id: 'night', label: 'Evening & night' },
];
const EASE = [0.19, 1, 0.22, 1] as const;

const Lightbox: React.FC<{ items: DynamicGalleryItem[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }> = ({ items, index, onClose, onIndex }) => {
  const open = index !== null && !!items[index];
  useEffect(() => {
    if (!open) return;
    setScrollLocked(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex((index! + 1) % items.length);
      if (e.key === 'ArrowLeft') onIndex((index! - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); setScrollLocked(false); };
  }, [open, index, items.length, onClose, onIndex]);
  const item = open ? items[index!] : null;
  return (
    <AnimatePresence>
      {item && (
        <motion.div className="cinema fixed inset-0 z-[80] flex flex-col bg-pine/95 text-mist" role="dialog" aria-modal="true" aria-label={item.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} onClick={onClose}>
          <div className="flex items-center justify-between px-5 py-4 sm:px-8" onClick={(e) => e.stopPropagation()}>
            <p className="t-small opacity-80">{String(index! + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</p>
            <button type="button" className="rr-btn rr-btn--ghost rr-btn--sm" onClick={onClose}>Close</button>
          </div>
          <div className="relative min-h-0 flex-1 px-5 sm:px-16">
            <motion.img key={item.id} src={item.image_url} alt={item.title} className="mx-auto h-full max-w-full object-contain" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: EASE }} onClick={(e) => e.stopPropagation()} />
            <button type="button" aria-label="Previous photo" className="absolute left-1 top-1/2 -translate-y-1/2 p-3 text-3xl sm:left-5" onClick={(e) => { e.stopPropagation(); onIndex((index! - 1 + items.length) % items.length); }}>&larr;</button>
            <button type="button" aria-label="Next photo" className="absolute right-1 top-1/2 -translate-y-1/2 p-3 text-3xl sm:right-5" onClick={(e) => { e.stopPropagation(); onIndex((index! + 1) % items.length); }}>&rarr;</button>
          </div>
          <p className="px-5 py-5 text-center t-lead mx-auto" onClick={(e) => e.stopPropagation()}>{item.title}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/** Gallery: all photographs in their stored order. Rich: pinned horizontal run, counter-moving images. Mobile: native swipe strip. Tap/click opens a full-screen viewer. */
export const GalleryScene: React.FC = () => {
  const root = useRef<HTMLElement>(null);
  const all = useGallery();
  const [tab, setTab] = useState('all');
  const [lb, setLb] = useState<number | null>(null);
  const items = all.filter((i) => tab === 'all' || i.category === tab);
  const horizontal = items.length > 3;

  const { rich } = useScene(root, ({ el, rich }) => {
    themeIn(el, 'pine', 'mist');
    const lineEls = el.querySelectorAll('.gl-line-in');
    if (rich && horizontal) {
      gsap.set(lineEls, { yPercent: 118 });
      const { tl, dist } = pinnedHorizontal(el.querySelector('.gl-pin')!, el.querySelector('.gl-track') as HTMLElement, 0.4);
      tl.to(lineEls, { yPercent: 0, duration: 1, stagger: 0.15, ease: 'power3.out' }, 0)
        .to(el.querySelector('.gl-track'), { x: () => -dist(), duration: 10 }, 0.6)
        .fromTo(el.querySelectorAll('.gl-item .ai-img'), { xPercent: -6 }, { xPercent: 6, duration: 10 }, 0.6);
    } else {
      linesIn(lineEls, el.querySelector('.gl-heading')!);
    }
  }, [items.length, tab]);

  const header = (
    <div className="flex flex-col gap-6 px-5 sm:px-8">
      <p className="t-small uppercase tracking-[0.18em] opacity-70">Gallery</p>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 className="gl-heading t-h2"><Lines lines={['The hotel in photographs.']} inner="gl-line-in" /></h2>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Gallery categories">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`rr-btn rr-btn--sm ${tab === t.id ? '' : 'rr-btn--ghost'}`}>{t.label}</button>
          ))}
        </div>
      </div>
    </div>
  );

  const tile = (g: DynamicGalleryItem, i: number, cls: string) => (
    <figure key={g.id} className={`gl-item group shrink-0 ${cls}`}>
      <button type="button" className="block h-[56svh] w-full overflow-hidden text-left lg:h-[54svh]" onClick={() => setLb(i)} aria-label={`Open photo: ${g.title}`}>
        <AdaptiveImage src={g.image_url} alt={g.title} className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.02] [&_.ai-img]:scale-[1.14]" />
      </button>
      <figcaption className="mt-4 flex gap-3 t-small"><span className="opacity-60">{String(i + 1).padStart(2, '0')}</span><span>{g.title}</span></figcaption>
    </figure>
  );

  return (
    <section ref={root} id="gallery" data-nav="light" className="cinema relative bg-mist text-pine" aria-label="Gallery">
      {rich && horizontal ? (
        <div className="gl-pin flex h-[100svh] flex-col justify-center gap-10 overflow-hidden pt-20">
          {header}
          <div className="gl-track flex w-max gap-6 pl-8 pr-[12vw]">{items.map((g, i) => tile(g, i, 'w-[34vw]'))}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-10 py-28">
          {header}
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:px-8">{items.map((g, i) => tile(g, i, 'w-[78vw] snap-center sm:w-[46vw]'))}</div>
        </div>
      )}
      <Lightbox items={items} index={lb} onClose={() => setLb(null)} onIndex={setLb} />
    </section>
  );
};
