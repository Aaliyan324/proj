import React, { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger, EASE } from '../../motion/gsap';
import { useScene, themeIn, linesIn, fadeUpOnce, frameOpen } from '../../motion/scene';
import { RoomAvailabilitySection } from '../RoomAvailabilitySection';
import { HotelRoom } from '../../services/apiService';
import { ROOM_CATEGORIES, TOTAL_ROOMS } from '../../data/roomCategories';
import { useRoomCategories, CategoryStat } from './useRoomCategories';
import { AdaptiveImage } from './AdaptiveImage';
import { Lines } from './Lines';

const STATUSES = [
  { key: 'available', label: 'Available', dot: '#3f8f6b' },
  { key: 'occupied', label: 'Occupied', dot: '#a8372a' },
  { key: 'reserved', label: 'Reserved', dot: '#b8892b' },
  { key: 'maintenance', label: 'Under maintenance', dot: '#5c6a64' },
] as const;
type StatusKey = (typeof STATUSES)[number]['key'];

/** Number that counts up once when it scrolls into view, then follows live changes directly. React owns the text node. */
const CountUp: React.FC<{ value: number }> = ({ value }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  const done = useRef(false); // true once the first count-up has finished (or motion is reduced)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (done.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { done.current = true; setShown(value); return; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const o = { n: 0 };
      gsap.to(o, { n: value, duration: 1.4, ease: EASE.soft, onUpdate: () => setShown(Math.round(o.n)), onComplete: () => { done.current = true; setShown(value); } });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  return <span ref={ref}>{shown}</span>;
};

const sum = (stats: CategoryStat[], k: StatusKey) => stats.reduce((n, c) => n + c[k], 0);

const StatusBar: React.FC<{ values: Record<StatusKey, number>; total: number; live: boolean }> = ({ values, total, live }) => (
  <div className="av-bar flex h-2 w-full overflow-hidden rounded-full bg-pine/10" role="img" aria-label={live ? STATUSES.map((s) => `${values[s.key]} ${s.label}`).join(', ') : 'Live numbers not confirmed yet'}>
    {live && STATUSES.map((s) => (<span key={s.key} style={{ width: `${(values[s.key] / total) * 100}%`, background: s.dot }} className="av-seg block h-full origin-left" />))}
  </div>
);

/**
 * "Which Rooms Are Free?": overview of all 42 rooms, then one block per category in this order:
 * title -> photograph -> availability statistics. Numbers come from the server (editable by the admin, always summing
 * to each category's total). The original per-room WhatsApp booking board is kept below, unchanged, in an expandable panel.
 */
export const AvailabilityScene: React.FC<{ onViewRoomDetails?: (room: HotelRoom) => void }> = ({ onViewRoomDetails }) => {
  const root = useRef<HTMLElement>(null);
  const stats = useRoomCategories();
  const live = stats.every((s) => s.confirmed);
  const overall = Object.fromEntries(STATUSES.map((s) => [s.key, sum(stats, s.key)])) as Record<StatusKey, number>;

  useScene(root, ({ el, rich }) => {
    themeIn(el, 'pine', 'mist');
    linesIn(el.querySelectorAll('.av-line-in'), el.querySelector('.av-heading')!);
    fadeUpOnce(el.querySelectorAll('.av-fade'));
    el.querySelectorAll<HTMLElement>('.av-cat').forEach((cat) => {
      linesIn(cat.querySelectorAll('.av-cat-line-in'), cat.querySelector('.av-cat-title')!, 'top 82%');
      const frame = cat.querySelector('.av-frame') as HTMLElement;
      frameOpen(frame, frame.querySelector('.ai-img'));
      if (rich) gsap.fromTo(frame.querySelector('.ai-img'), { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from(cat.querySelectorAll('.av-stat'), { autoAlpha: 0, y: 36, duration: 1, ease: EASE.reveal, stagger: 0.09, scrollTrigger: { trigger: cat.querySelector('.av-stats'), start: 'top 85%', once: true } });
      gsap.from(cat.querySelectorAll('.av-seg'), { scaleX: 0, duration: 1.3, ease: EASE.reveal, stagger: 0.1, scrollTrigger: { trigger: cat.querySelector('.av-bar'), start: 'top 90%', once: true } });
    });
    gsap.from(el.querySelectorAll('.av-ov-seg'), { scaleX: 0, duration: 1.4, ease: EASE.reveal, stagger: 0.1, scrollTrigger: { trigger: el.querySelector('.av-overview'), start: 'top 85%', once: true } });
  }, [live]);

  return (
    <section ref={root} id="availability" data-nav="light" className="cinema relative bg-mist text-pine" aria-label="Room availability and booking">
      <div className="mx-auto max-w-[1400px] px-5 pb-28 pt-28 sm:px-8">
        {/* Overview */}
        <div className="av-overview mb-24 flex flex-col gap-10">
          <p className="av-fade t-small uppercase tracking-[0.18em] opacity-70">Availability</p>
          <h2 className="av-heading t-h2"><Lines lines={['Which Rooms', 'Are Free?']} inner="av-line-in" /></h2>
          <div className="av-fade grid items-end gap-10 lg:grid-cols-12">
            <div className="flex items-end gap-4 lg:col-span-4">
              <span className="font-[family-name:var(--font-display)] text-[clamp(6rem,15vw,12rem)] leading-[0.8] tracking-[-0.04em]">{TOTAL_ROOMS}</span>
              <span className="t-lead pb-2">rooms in total</span>
            </div>
            <div className="flex flex-col gap-5 lg:col-span-8">
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-pine/10" role="img" aria-label={live ? STATUSES.map((s) => `${overall[s.key]} ${s.label}`).join(', ') : 'Live numbers not confirmed yet'}>
                {live && STATUSES.map((s) => (<span key={s.key} style={{ width: `${(overall[s.key] / TOTAL_ROOMS) * 100}%`, background: s.dot }} className="av-ov-seg block h-full origin-left" />))}
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                {STATUSES.map((s) => (
                  <div key={s.key}>
                    <dt className="t-small flex items-center gap-2 opacity-80"><span className="h-2 w-2 rounded-full" style={{ background: s.dot }} aria-hidden="true" />{s.label}</dt>
                    <dd className="mt-1 font-[family-name:var(--font-display)] text-4xl leading-none">{live ? <CountUp value={overall[s.key]} /> : '\u2014'}</dd>
                  </div>
                ))}
              </dl>
              {!live && <p className="t-small opacity-70">Live numbers appear here as soon as the hotel confirms them. Ask us on WhatsApp for today&rsquo;s availability.</p>}
            </div>
          </div>
        </div>

        {/* One block per category: title -> image -> statistics */}
        <div className="flex flex-col gap-32">
          {ROOM_CATEGORIES.map((c, i) => {
            const s = stats.find((x) => x.key === c.key)!;
            const values = { available: s.available, occupied: s.occupied, reserved: s.reserved, maintenance: s.maintenance };
            return (
              <article key={c.key} className="av-cat flex flex-col gap-10" aria-label={c.name}>
                <header className="flex flex-wrap items-end justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <p className="t-small opacity-70">{String(i + 1).padStart(2, '0')} / {String(ROOM_CATEGORIES.length).padStart(2, '0')}</p>
                    <h3 className="av-cat-title t-h2"><Lines lines={[c.name]} inner="av-cat-line-in" /></h3>
                  </div>
                  <p className="t-lead">{c.total} rooms</p>
                </header>
                <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
                  <div className="av-frame overflow-hidden lg:col-span-7">
                    <AdaptiveImage src={c.image} alt={c.alt} fit="cover" className="aspect-[4/3] w-full [&_.ai-img]:scale-[1.06]" />
                  </div>
                  <div className="av-stats flex flex-col gap-6 lg:col-span-5">
                    <StatusBar values={values} total={s.total} live={s.confirmed} />
                    <dl className="grid grid-cols-2 gap-4">
                      {STATUSES.map((st) => (
                        <div key={st.key} className="av-stat border-t border-pine/20 pt-4">
                          <dt className="t-small flex items-center gap-2 opacity-80"><span className="h-2 w-2 rounded-full" style={{ background: st.dot }} aria-hidden="true" />{st.label}</dt>
                          <dd className="mt-2 font-[family-name:var(--font-display)] text-5xl leading-none">{s.confirmed ? <CountUp value={values[st.key]} /> : '\u2014'}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="t-small opacity-70">Total in this category: {c.total} rooms</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Active Booking: the original per-room board with its WhatsApp booking buttons, unchanged */}
        <details className="av-fade mt-32 border-t border-pine/20 pt-8" onToggle={() => ScrollTrigger.refresh()}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6">
            <span className="t-h3">Book a specific room</span>
            <span className="rr-btn rr-btn--ghost rr-btn--sm pointer-events-none">Show rooms</span>
          </summary>
          <div className="pt-10"><RoomAvailabilitySection onViewRoomDetails={onViewRoomDetails} /></div>
        </details>
        <p className="av-fade t-small mt-8 opacity-70">Payment is in cash at the hotel. Booking inquiries are sent on WhatsApp.</p>
      </div>
    </section>
  );
};
