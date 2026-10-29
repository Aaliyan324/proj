import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Footer } from '../Footer';
import { HOTEL_INFO } from '../../data/hotelData';

interface HotelShellProps {
  children: React.ReactNode;
}

/**
 * Shared chrome for the public hotel pages. Reuses the site's brand styling and
 * the existing Footer, while providing router-aware navigation (Home / Hotels /
 * Admin). Admin entry routes to /admin/login, which the Home route interprets to
 * open the existing admin modal - so we reuse the current auth UX unchanged.
 */
export const HotelShell: React.FC<HotelShellProps> = ({ children }) => {
  const navigate = useNavigate();

  const goHome = () => navigate('/');
  const goHotels = () => navigate('/hotels');
  const goAdmin = () => navigate('/admin/login');

  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col font-sans">
      {/* Compact brand header */}
      <header className="bg-hotel-primary text-white border-t border-blue-900/50">
        <div className="max-w-[90rem] mx-auto px-4 lg:px-8 flex items-center justify-between gap-4 py-3 lg:py-4">
          <button onClick={goHome} className="flex items-center space-x-3 group shrink-0 cursor-pointer" aria-label="Back to home">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden shadow-md border-2 border-amber-400/60 bg-white flex-shrink-0">
              <img src="/images/hotel-red-rock-logo.jpg" alt="Grand Travela Logo" className="w-full h-full object-cover" />
            </div>
            <div className="text-left">
              <div className="text-lg sm:text-xl lg:text-2xl font-black tracking-wider leading-none text-white flex items-center whitespace-nowrap">
                GRAND TRAVELA
                <span className="hidden 2xl:inline-block whitespace-nowrap text-amber-400 text-xs uppercase ml-2 px-1.5 py-0.5 rounded bg-blue-900/30 border border-amber-400/40 font-semibold tracking-widest">
                  HOTEL &amp; RESORT
                </span>
              </div>
              <p className="hidden 2xl:block text-[10px] uppercase tracking-widest font-medium mt-0.5 text-blue-200">
                {HOTEL_INFO.brandSubtitle}
              </p>
            </div>
          </button>

          <nav className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={goHotels}
              className="text-sm px-3 py-2 rounded-full font-bold text-amber-300 bg-blue-900/40 border border-amber-400/40 cursor-pointer whitespace-nowrap"
            >
              <i className="fa fa-hotel me-1.5"></i>Hotels
            </button>
            <button
              onClick={goHome}
              className="hidden sm:inline-flex text-sm px-3.5 py-2 rounded-full whitespace-nowrap border border-white/40 text-white hover:bg-white/10 transition-all font-bold cursor-pointer"
            >
              <i className="fa fa-home me-1.5"></i>Home
            </button>
            <button
              onClick={goAdmin}
              title="Authorized Admin Login"
              className="text-xs sm:text-sm px-3 py-2 rounded-full whitespace-nowrap border border-white/40 text-white hover:bg-white/10 transition-all font-bold flex items-center space-x-1 cursor-pointer"
            >
              <i className="fa fa-shield-alt text-amber-400"></i>
              <span className="hidden sm:inline">Admin</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <Footer
        onOpenBooking={goHome}
        onOpenAdminLogin={goAdmin}
        selectedLanguage="English"
        onSelectLanguage={() => {}}
      />
    </div>
  );
};
