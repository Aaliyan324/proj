import React from 'react';
import { HOTEL_INFO } from '../data/hotelData';

interface TopbarProps {
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
}

// Public top bar. By design it carries no Admin entry point — the dashboard
// stays reachable only through the /admin route (protected server-side).
export const Topbar: React.FC<TopbarProps> = ({
  selectedLanguage,
  onSelectLanguage
}) => {
  return (
    <div className="container-fluid bg-hotel-primary px-4 lg:px-12 d-none d-lg-block text-white py-2 text-sm border-b border-blue-900/40">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        {/* Left Side: Contact Details */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <span className="flex items-center text-xs text-blue-100 font-medium">
              <i className="fab fa-whatsapp me-2 text-emerald-400"></i>
              WhatsApp Booking Active
            </span>
            <span className="text-blue-300/60">|</span>
            <span className="flex items-center text-xs text-blue-100 font-medium">
              <i className="fa fa-envelope me-2 text-amber-400"></i>
              {HOTEL_INFO.email}
            </span>
          </div>
        </div>

        {/* Right Side: Language */}
        <div className="flex items-center space-x-5">
          <div className="flex items-center space-x-1 text-xs">
            <i className="fa fa-globe text-blue-200 me-1"></i>
            <select 
              value={selectedLanguage}
              onChange={(e) => onSelectLanguage(e.target.value)}
              className="bg-blue-950/80 text-white text-xs py-1 px-2 rounded border border-blue-700/60 focus:outline-none cursor-pointer"
            >
              <option value="English">English</option>
              <option value="Urdu">Urdu</option>
              <option value="Arabic">Arabic</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
