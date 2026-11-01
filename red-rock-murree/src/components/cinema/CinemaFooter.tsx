import React, { useRef } from 'react';
import { scrollToTarget } from '../../motion/SmoothScroll';
import { useScene, themeIn, linesIn, fadeUpOnce } from '../../motion/scene';
import { HOTEL_INFO } from '../../data/hotelData';
import { Lines } from './Lines';

interface FooterProps {
  onOpenBooking: () => void;
  onOpenAdminLogin: () => void;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
}

const LINKS = [
  ['Rooms', '#rooms'], ['Availability', '#availability'], ['Dining', '#dining'], ['Parking', '#parking'],
  ['Gallery', '#gallery'], ['About', '#about'], ['Contact', '#contact'],
] as const;

/** Closing frame: a large wordmark rising line by line, quick links, and the staff login. Props match the old Footer so it drops in. */
export const CinemaFooter: React.FC<FooterProps> = ({ onOpenAdminLogin }) => {
  const root = useRef<HTMLElement>(null);
  useScene(root, ({ el }) => {
    themeIn(el, 'mist', 'pine');
    linesIn(el.querySelectorAll('.ft-line-in'), el.querySelector('.ft-heading')!, 'top 95%');
    fadeUpOnce(el.querySelectorAll('.ft-fade'), 'top 95%');
  });
  return (
    <footer ref={root} data-nav="dark" className="cinema relative bg-pine text-mist">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-16 px-5 pb-10 pt-28 sm:px-8">
        <h2 className="ft-heading t-display"><Lines lines={['Red Rock', 'Murree.']} inner="ft-line-in" /></h2>
        <div className="ft-fade grid gap-10 border-t border-mist/20 pt-8 md:grid-cols-3">
          <p className="t-body text-fog">{HOTEL_INFO.address}<br />Booking inquiries on WhatsApp. Payment in cash at the hotel.</p>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-2">
            {LINKS.map(([label, target]) => (
              <button key={target} type="button" className="w-fit text-left transition-opacity hover:opacity-70" onClick={() => scrollToTarget(target)}>{label}</button>
            ))}
          </nav>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <button type="button" className="rr-btn rr-btn--ghost rr-btn--sm" onClick={() => scrollToTarget('#contact')}>Book on WhatsApp</button>
            <button type="button" className="t-small text-fog underline underline-offset-4" onClick={onOpenAdminLogin}>Staff login</button>
          </div>
        </div>
        <p className="ft-fade t-small text-fog">&copy; {new Date().getFullYear()} Red Rock Murree</p>
      </div>
    </footer>
  );
};
