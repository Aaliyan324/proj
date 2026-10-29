import React from 'react';
import { HOTEL_INFO } from '../data/hotelData';

interface TopbarProps {
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  onOpenAdminDashboard: () => void;
  onAdminLogout: () => void;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  isAdmin,
  onOpenAdminLogin,
  onOpenAdminDashboard,
  onAdminLogout,
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

        {/* Right Side: Language & Secure Admin Access */}
        <div className="flex items-center space-x-5">
          {/* Language Selector */}
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

          {/* Admin Access: Only Admin Login & Dashboard */}
          {isAdmin ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenAdminDashboard}
                className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-blue-950 font-extrabold px-3 py-1 rounded-full text-xs transition-all shadow cursor-pointer"
                title="Open Authorized Admin Dashboard"
              >
                <i className="fa fa-shield-alt text-blue-950"></i>
                <span>Admin Dashboard</span>
              </button>

              <button
                onClick={onAdminLogout}
                className="text-xs text-blue-200 hover:text-white transition-colors"
                title="Logout of Admin Console"
              >
                <i className="fa fa-sign-out-alt"></i>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAdminLogin}
              className="flex items-center space-x-1.5 text-xs text-amber-300 hover:text-white bg-blue-900/60 hover:bg-blue-900 px-3 py-1 rounded-full border border-amber-400/30 transition-all cursor-pointer"
              title="Restricted: Authorized Administrator Login"
            >
              <i className="fa fa-lock text-amber-400 text-xs"></i>
              <span className="font-semibold">Admin Login</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
