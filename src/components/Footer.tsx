import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HOTEL_INFO } from '../data/hotelData';

interface FooterProps {
  onOpenBooking: () => void;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenBooking
}) => {
  const navigate = useNavigate();
  return (
    <footer className="bg-blue-950 text-gray-300 pt-16 pb-12 border-t border-blue-900/60">
      <div className="max-w-7xl mx-auto px-4 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand Info */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400/60 bg-white shadow flex-shrink-0">
                <img
                  src="/images/hotel-red-rock-logo.jpg"
                  alt="Red Rock Hotel Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xl font-black text-white tracking-wider">
                RED ROCK HOTEL
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-4">
              Comfortable, modern rooms and suites managed with verified reception availability, a fresh in-house kitchen, and a dedicated WhatsApp concierge.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 border-b border-blue-900 pb-2">
              Quick Navigation
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <button
                  onClick={() => navigate('/rooms')}
                  className="hover:text-amber-400 transition-colors flex items-center text-left"
                >
                  <i className="fa fa-chevron-right text-[10px] text-amber-400 me-2"></i>
                  Rooms &amp; Suites
                </button>
              </li>
              <li>
                <a href="#home" className="hover:text-amber-400 transition-colors flex items-center">
                  <i className="fa fa-chevron-right text-[10px] text-amber-400 me-2"></i>
                  Home
                </a>
              </li>
              <li>
                <a href="#availability" className="hover:text-amber-400 transition-colors flex items-center">
                  <i className="fa fa-chevron-right text-[10px] text-amber-400 me-2"></i>
                  Room Availability
                </a>
              </li>
              <li>
                <a href="#dining" className="hover:text-amber-400 transition-colors flex items-center">
                  <i className="fa fa-chevron-right text-[10px] text-amber-400 me-2"></i>
                  Kitchen &amp; Dining
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-amber-400 transition-colors flex items-center">
                  <i className="fa fa-chevron-right text-[10px] text-amber-400 me-2"></i>
                  Hotel Amenities
                </a>
              </li>
              <li>
                <a href="#gallery" className="hover:text-amber-400 transition-colors flex items-center">
                  <i className="fa fa-chevron-right text-[10px] text-amber-400 me-2"></i>
                  Photo Gallery
                </a>
              </li>
            </ul>
          </div>

          {/* Hotel Features */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 border-b border-blue-900 pb-2">
              Hotel Features
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400">
              <li className="flex items-center space-x-2">
                <i className="fa fa-door-open text-amber-400"></i>
                <span>Rooms &amp; Suites</span>
              </li>
              <li className="flex items-center space-x-2">
                <i className="fab fa-whatsapp text-emerald-400"></i>
                <span>Direct WhatsApp Bookings</span>
              </li>
              <li className="flex items-center space-x-2">
                <i className="fa fa-wifi text-blue-400"></i>
                <span>Free High-Speed Wi-Fi</span>
              </li>
              <li className="flex items-center space-x-2">
                <i className="fa fa-snowflake text-cyan-400"></i>
                <span>Air Conditioned Rooms</span>
              </li>
              <li className="flex items-center space-x-2">
                <i className="fa fa-utensils text-amber-400"></i>
                <span>In-House Food Service</span>
              </li>
            </ul>
          </div>

          {/* Contact & Book */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 border-b border-blue-900 pb-2">
              Reservations
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              Ready to stay? Browse our rooms and suites, then reserve directly with reception on WhatsApp. Cash payment on arrival.
            </p>
            <button
              onClick={onOpenBooking}
              className="w-full bg-amber-400 hover:bg-amber-300 text-blue-950 border border-amber-400/40 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <i className="fa fa-calendar-check text-blue-950"></i>
              <span>Book a Room</span>
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-blue-900/60 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} {HOTEL_INFO.name}. All rights reserved.</p>
          <div className="flex items-center space-x-4 mt-3 sm:mt-0">
            <span className="text-emerald-400 flex items-center">
              <i className="fa fa-circle text-[8px] me-1.5 animate-pulse"></i>
              Direct WhatsApp Reservations
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
