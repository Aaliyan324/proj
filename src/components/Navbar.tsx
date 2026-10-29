import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HOTEL_INFO } from '../data/hotelData';
import { fetchSettings, buildWhatsAppLink } from '../services/apiService';
import { scrollToTarget } from '../lib/motion';

interface NavbarProps {
  onOpenBooking: () => void;
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  onOpenAdminDashboard: () => void;
  activeSection: string;
}

const NAV_ITEMS = [
  { label: 'Home', href: '#home', id: 'home' },
  { label: 'Entrance', href: '#entrance', id: 'entrance' },
  { label: 'Reception', href: '#reception', id: 'reception' },
  { label: 'Availability', href: '#availability', id: 'availability' },
  { label: 'Rooms', href: '#rooms', id: 'rooms' },
  { label: 'Dining', href: '#dining', id: 'dining' },
  { label: 'Amenities', href: '#services', id: 'services' },
  { label: 'Parking', href: '#parking', id: 'parking' },
  { label: 'Gallery', href: '#gallery', id: 'gallery' },
  { label: 'About', href: '#about', id: 'about' },
  { label: 'Contact', href: '#contact', id: 'contact' },
];

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const HamburgerIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({
  onOpenBooking,
  isAdmin,
  onOpenAdminLogin,
  onOpenAdminDashboard,
  activeSection,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState('');

  const navRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    fetchSettings().then((s) => setWhatsappNumber(s.whatsapp_number)).catch(() => {});
  }, []);

  // The top bar is NOT sticky: it scrolls away with the page. A small floating
  // hamburger appears only while the top bar is out of view.
  useEffect(() => {
    const el = navRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setNavVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Body scroll lock + Escape + focus management while the panel is open.
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Wait one tick: the panel's `visibility` is still transitioning on the first frame.
    const focusTimer = window.setTimeout(() => closeBtnRef.current?.focus(), 30);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMenu();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen, closeMenu]);

  // Close on route/hash changes (browser back/forward, admin routes).
  useEffect(() => {
    const onRouteChange = () => setMenuOpen(false);
    window.addEventListener('popstate', onRouteChange);
    window.addEventListener('hashchange', onRouteChange);
    return () => {
      window.removeEventListener('popstate', onRouteChange);
      window.removeEventListener('hashchange', onRouteChange);
    };
  }, []);

  // Return focus to the hamburger button that opened the panel.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !menuOpen) openerRef.current?.focus({ preventScroll: true });
    wasOpen.current = menuOpen;
  }, [menuOpen]);

  const handleNavClick = (href: string) => {
    setMenuOpen(false);
    // Release the scroll lock synchronously so smooth scrolling can run.
    document.body.style.overflow = '';
    // Lenis-aware scroll (falls back to native smooth scroll when reduced motion is on).
    requestAnimationFrame(() => scrollToTarget(href, { offset: -16 }));
  };

  const handleWhatsAppDirect = () => {
    window.open(buildWhatsAppLink(whatsappNumber), '_blank', 'noopener,noreferrer');
  };

  const renderLogo = (onDark: boolean, inPanel: boolean) => (
    <a
      href="#home"
      onClick={(e) => {
        e.preventDefault();
        handleNavClick('#home');
      }}
      className="flex items-center space-x-3 group shrink-0"
    >
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden shadow-md transition-transform group-hover:scale-105 border-2 border-amber-400/60 bg-white flex-shrink-0">
        <img src="/images/hotel-red-rock-logo.jpg" alt="Hotel Red Rock Logo" className="w-full h-full object-cover" />
      </div>
      <div>
        <div className={`text-lg sm:text-xl lg:text-2xl font-black tracking-wider leading-none flex items-center whitespace-nowrap ${onDark ? 'text-white' : 'text-blue-950'}`}>
          GRAND TRAVELA
          <span className={`${inPanel ? 'hidden sm:inline-block' : 'hidden 2xl:inline-block'} whitespace-nowrap text-amber-400 text-xs uppercase ml-2 px-1.5 py-0.5 rounded bg-blue-900/30 border border-amber-400/40 font-semibold tracking-widest`}>
            HOTEL &amp; RESORT
          </span>
        </div>
        <p className={`${inPanel ? 'hidden sm:block' : 'hidden 2xl:block'} whitespace-nowrap text-[10px] uppercase tracking-widest font-medium mt-0.5 ${onDark ? 'text-blue-200' : 'text-gray-500'}`}>
          {HOTEL_INFO.brandSubtitle}
        </p>
      </div>
    </a>
  );

  return (
    <>
      {/* Top navigation: sits in normal page flow and scrolls away (not sticky/fixed). */}
      <nav ref={navRef} aria-label="Main navigation" className="relative w-full z-30 bg-hotel-primary text-white py-3 lg:py-4 border-t border-blue-900/50">
        <div className="max-w-[90rem] mx-auto px-4 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <button
                            type="button"
              onClick={(e) => {
                openerRef.current = e.currentTarget;
                setMenuOpen((open) => !open);
              }}
              aria-label="Open navigation menu"
              aria-expanded={menuOpen}
              aria-controls="side-menu-panel"
              className="p-2 rounded-lg border border-white/30 text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <HamburgerIcon />
            </button>
            {renderLogo(true, false)}
          </div>

          {/* Desktop links (xl+; below that the hamburger panel holds every destination) */}
          <div className="hidden xl:flex items-center space-x-0.5 2xl:space-x-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.href);
                  }}
                  aria-current={isActive ? 'true' : undefined}
                  className={`px-2 2xl:px-3 py-1.5 text-sm font-medium transition-colors relative whitespace-nowrap group ${
                    isActive ? 'text-amber-300 font-bold' : 'text-white/90 hover:text-white'
                  }`}
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-amber-400 transition-transform duration-300 origin-center ${
                      isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'
                    }`}
                  />
                </a>
              );
            })}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center space-x-3 shrink-0">
            <button
              onClick={handleWhatsAppDirect}
              className="hidden 2xl:flex text-xs px-3.5 py-2 rounded-full whitespace-nowrap border border-emerald-400/80 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all flex items-center space-x-1.5 font-bold cursor-pointer"
              title="Chat directly on WhatsApp"
            >
              <i className="fab fa-whatsapp text-sm text-emerald-400"></i>
              <span>WhatsApp Booking</span>
            </button>
            <button
              onClick={isAdmin ? onOpenAdminDashboard : onOpenAdminLogin}
              className={`hidden 2xl:flex text-xs px-3 py-2 rounded-full whitespace-nowrap border transition-all items-center space-x-1 font-bold cursor-pointer ${
                isAdmin
                  ? 'border-amber-400/80 bg-amber-400/20 text-amber-300 hover:bg-amber-400/30'
                  : 'border-white/40 text-white hover:bg-white/10'
              }`}
              title={isAdmin ? 'Open Admin Management Dashboard' : 'Authorized Admin Login'}
            >
              <i className="fa fa-shield-alt text-amber-400"></i>
              <span>{isAdmin ? 'Admin Dashboard' : 'Admin'}</span>
            </button>
            <button
              onClick={onOpenBooking}
              className="bg-amber-400 hover:bg-amber-300 text-blue-950 font-bold text-sm px-5 py-2 rounded-full whitespace-nowrap shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center cursor-pointer"
            >
              <i className="fa fa-bed me-2"></i>
              Check Availability
            </button>
          </div>

          {/* Mobile quick WhatsApp */}
          <button
            onClick={handleWhatsAppDirect}
            aria-label="Contact on WhatsApp"
            className="lg:hidden bg-emerald-600 text-white font-bold text-xs px-3 py-2.5 rounded-full flex items-center space-x-1 shrink-0"
          >
            <i className="fab fa-whatsapp"></i>
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
      </nav>

      {/* Floating hamburger: only while the top bar has scrolled out of view. */}
      <button
        type="button"
        onClick={(e) => {
                openerRef.current = e.currentTarget;
                setMenuOpen((open) => !open);
              }}
        aria-label="Open navigation menu"
        aria-expanded={menuOpen}
        aria-controls="side-menu-panel"
        tabIndex={!navVisible && !menuOpen ? 0 : -1}
        className={`fixed top-3 left-3 z-40 p-2.5 rounded-full bg-blue-950 text-white shadow-lg border border-amber-400/50 hover:bg-blue-900 transition-all duration-300 cursor-pointer ${
          !navVisible && !menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <HamburgerIcon />
      </button>

      {/* Backdrop */}
      <div
        onClick={closeMenu}
        aria-hidden="true"
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Side navigation panel (~50% width on desktop, adapts on small screens) */}
      <aside
        id="side-menu-panel"
        ref={panelRef as React.RefObject<HTMLElement>}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={`fixed inset-y-0 left-0 z-[70] w-[min(92vw,max(50vw,20rem))] bg-blue-950 text-white shadow-2xl flex flex-col duration-300 ease-out ${
          // Opening: visible immediately (so focus can move in). Closing: stay visible until the slide-out ends.
          menuOpen ? 'translate-x-0 visible transition-transform' : '-translate-x-full invisible transition-[translate,visibility]'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          {renderLogo(true, true)}
          <button
            ref={closeBtnRef}
            type="button"
            onClick={closeMenu}
            aria-label="Close navigation menu"
            title="Close (Esc)"
            className="ml-3 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </div>

        <nav aria-label="Site sections" className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(item.href);
                    }}
                    aria-current={isActive ? 'true' : undefined}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-base font-semibold transition-colors ${
                      isActive ? 'bg-amber-400/15 text-amber-300' : 'text-gray-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && <span className="w-2 h-2 rounded-full bg-amber-400" aria-hidden="true" />}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-5 py-4 border-t border-white/10 flex flex-col gap-2 shrink-0">
          <button
            onClick={() => {
              closeMenu();
              handleWhatsAppDirect();
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-emerald-300 hover:bg-white/10 rounded-xl flex items-center space-x-2 font-bold cursor-pointer"
          >
            <i className="fab fa-whatsapp text-emerald-400 text-base"></i>
            <span>Contact on WhatsApp</span>
          </button>
          <button
            onClick={() => {
              closeMenu();
              if (isAdmin) onOpenAdminDashboard();
              else onOpenAdminLogin();
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-amber-300 hover:bg-white/10 rounded-xl flex items-center space-x-2 cursor-pointer"
          >
            <i className="fa fa-shield-alt text-amber-400"></i>
            <span>{isAdmin ? 'Admin Dashboard' : 'Admin Login'}</span>
          </button>
          <button
            onClick={() => {
              closeMenu();
              onOpenBooking();
            }}
            className="w-full bg-amber-400 hover:bg-amber-300 text-blue-950 font-bold text-sm py-3 rounded-full text-center cursor-pointer transition-colors"
          >
            View 20 Rooms
          </button>
        </div>
      </aside>
    </>
  );
};
