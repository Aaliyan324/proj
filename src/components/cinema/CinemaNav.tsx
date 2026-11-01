import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { scrollToTarget, setScrollLocked } from '../../motion/SmoothScroll';

interface Props {
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  onOpenAdminDashboard: () => void;
}

// Every pre-existing section stays reachable.
const LINKS = [
  { label: 'The hotel', id: 'hotel' },
  { label: 'Entrance', id: 'entrance' },
  { label: 'Rooms', id: 'rooms' },
  { label: 'Reception', id: 'reception' },
  { label: 'Availability and booking', id: 'availability' },
  { label: 'Dining', id: 'dining' },
  { label: 'Parking', id: 'parking' },
  { label: 'Viewpoints', id: 'viewpoints' },
  { label: 'Gallery', id: 'gallery' },
  { label: 'About', id: 'about' },
  { label: 'Contact', id: 'contact' },
];

const EASE = [0.19, 1, 0.22, 1] as const;

export const CinemaNav: React.FC<Props> = ({ isAdmin, onOpenAdminLogin, onOpenAdminDashboard }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark'); // 'dark' = sits over dark imagery (light text)
  const [open, setOpen] = useState(false);
  const firstLink = useRef<HTMLButtonElement>(null);

  // Theme follows whichever [data-nav] block is under the top edge of the viewport (one observer, no scroll listener).
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-nav]'));
    if (!els.length) return;
    const active = new Set<HTMLElement>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? active.add(e.target as HTMLElement) : active.delete(e.target as HTMLElement)));
        const last = Array.from(active).sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)).pop();
        if (last) setTheme(last.dataset.nav === 'light' ? 'light' : 'dark');
      },
      { rootMargin: '0px 0px -92% 0px' } // a thin band across the top of the screen
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Menu: lock page scroll, Escape to close, move focus in.
  useEffect(() => {
    setScrollLocked(open);
    if (!open) return;
    const t = window.setTimeout(() => firstLink.current?.focus(), 500);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      setScrollLocked(false);
    };
  }, [open]);

  const go = (id: string) => {
    setOpen(false);
    window.setTimeout(() => scrollToTarget(`#${id}`), 450); // let the menu wipe away first
  };

  const light = theme === 'light' && !open;

  return (
    <>
      <header
        className={`cinema fixed inset-x-0 top-0 z-[60] transition-[background-color,color,backdrop-filter] duration-500 ${
          light ? 'on-light bg-mist/80 text-pine backdrop-blur-md' : 'text-mist'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto grid h-[72px] max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center px-5 sm:px-8">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="rr-menu"
            className="group flex w-fit items-center gap-3 text-[0.95rem] font-medium"
          >
            <span className="relative block h-[10px] w-7" aria-hidden="true">
              <motion.span className="absolute left-0 top-0 block h-px w-full bg-current" animate={open ? { y: 5, rotate: 20 } : { y: 0, rotate: 0 }} transition={{ duration: 0.5, ease: EASE }} />
              <motion.span className="absolute bottom-0 left-0 block h-px w-full bg-current" animate={open ? { y: -4, rotate: -20 } : { y: 0, rotate: 0 }} transition={{ duration: 0.5, ease: EASE }} />
            </span>
            <span>{open ? 'Close' : 'Menu'}</span>
          </button>

          <a
            href="#home"
            onClick={(e) => { e.preventDefault(); setOpen(false); scrollToTarget(0, 2); }}
            className="flex items-center gap-3"
            aria-label="Red Rock Murree, back to top"
          >
            <motion.img
              src="/images/hotel-red-rock-logo.jpg"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 rounded-full bg-white object-cover"
              initial={{ scale: 0.4, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ duration: 1.3, delay: 0.5, ease: EASE }}
            />
            <motion.span
              className="hidden font-[family-name:var(--font-display)] text-[1.7rem] leading-none sm:block"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.9, ease: EASE }}
            >
              Red Rock Murree
            </motion.span>
          </a>

          <div className="flex justify-end">
            <button type="button" onClick={() => scrollToTarget('#availability')} className={`rr-btn rr-btn--sm`}>
              Check availability
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="rr-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="cinema fixed inset-0 z-[55] flex flex-col justify-between bg-pine px-5 pb-8 pt-28 text-mist sm:px-8"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.85, ease: EASE }}
            data-lenis-prevent
          >
            <nav aria-label="Sections" className="mx-auto w-full max-w-[1600px] overflow-y-auto">
              <ul className="grid gap-x-12 gap-y-1 md:grid-cols-2">
                {LINKS.map((l, i) => (
                  <li key={l.id} className="overflow-hidden">
                    <motion.button
                      ref={i === 0 ? firstLink : undefined}
                      type="button"
                      onClick={() => go(l.id)}
                      className="block w-full py-1 text-left font-[family-name:var(--font-display)] text-[clamp(2rem,5.2vw,4.4rem)] leading-[1.05] transition-colors hover:text-fog"
                      initial={{ y: '110%' }}
                      animate={{ y: 0, transition: { duration: 0.9, ease: EASE, delay: 0.25 + i * 0.045 } }}
                      exit={{ y: '110%', transition: { duration: 0.4, ease: EASE } }}
                    >
                      {l.label}
                    </motion.button>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between text-sm text-fog">
              <span>Red Rock Murree</span>
              {isAdmin ? (
                <button type="button" className="underline underline-offset-4" onClick={() => { setOpen(false); onOpenAdminDashboard(); }}>
                  Admin dashboard
                </button>
              ) : (
                <button type="button" className="underline underline-offset-4" onClick={() => { setOpen(false); onOpenAdminLogin(); }}>
                  Staff login
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
