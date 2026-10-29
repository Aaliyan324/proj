import React from 'react';
import { HOTEL_INFO } from '../data/hotelData';

interface FooterProps {
  onOpenBooking: () => void;
  onOpenAdminLogin: () => void;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenBooking,
  onOpenAdminLogin
}) => {
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
                  alt="Hotel Red Rock Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-xl font-black text-white tracking-wider">
                GRAND TRAVELA
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-4">
              Providing comfortable, modern accommodations with 20 guest rooms, verified reception availability, fresh kitchen menu, and dedicated WhatsApp concierge.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 border-b border-blue-900 pb-2">
              Quick Navigation
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <a href="/hotels" className="hover:text-amber-400 transition-colors flex items-center">
                  <i className="fa fa-chevron-right text-[10px] text-amber-400 me-2"></i>
                  Browse Hotels
                </a>
              </li>
              <li>
                <a href="#home" className="hover:text-amber-400 transition-colors flex items-center">
                  <i className="fa fa-chevron-right text-[10px] text-amber-400 me-2"></i>
                  Home
                </a>
              </li>
              <li>
                <a href="#rooms" className="hover:text-amber-400 transition-colors flex items-center">
                  <i className="fa fa-chevron-right text-[10px] text-amber-400 me-2"></i>
                  20 Guest Rooms
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
                <span>Exactly 20 Dedicated Rooms</span>
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

          {/* Admin & Reception Management */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4 border-b border-blue-900 pb-2">
              Reception &amp; Admin
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              Authorized hotel staff can access the central management console to update room availability, manage menu items, and update settings.
            </p>
            <button
              onClick={onOpenAdminLogin}
              className="w-full bg-blue-900 hover:bg-blue-800 text-amber-300 border border-amber-400/40 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <i className="fa fa-lock text-amber-400"></i>
              <span>Staff / Admin Login</span>
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
