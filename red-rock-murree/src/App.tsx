import React, { useState, useEffect } from 'react';
import { SmoothScroll, scrollToTarget, setScrollLocked } from './motion/SmoothScroll';
import { CinemaNav } from './components/cinema/CinemaNav';
import { CinemaHome } from './components/cinema/CinemaHome';
import { AvailabilityScene } from './components/cinema/AvailabilityScene';
import { DiningScene } from './components/cinema/DiningScene';
import { ParkingScene } from './components/cinema/ParkingScene';
import { ViewpointsScene } from './components/cinema/ViewpointsScene';
import { GalleryScene } from './components/cinema/GalleryScene';
import { AboutScene } from './components/cinema/AboutScene';
import { CinemaFooter } from './components/cinema/CinemaFooter';
import { ContactSection } from './components/ContactSection'; // Direct Booking: original logic, cinematic presentation

import { RoomDetailModal } from './components/RoomDetailModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';

import { HotelRoom, isAdminAuthenticated, adminLogout } from './services/apiService';

export default function App() {
  // Admin Authentication State
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminDashboardOpen, setAdminDashboardOpen] = useState(false);

  // Language State
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');

  // Modal States
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<HotelRoom | null>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // URL Path Detection & Route Protection
  useEffect(() => {
    const authenticated = isAdminAuthenticated();
    setIsAdmin(authenticated);

    const path = window.location.pathname.toLowerCase();
    if (path === '/admin/login') {
      if (authenticated) {
        window.history.replaceState(null, '', '/admin/dashboard');
        setAdminDashboardOpen(true);
      } else {
        setAdminLoginOpen(true);
      }
    } else if (path === '/admin/dashboard' || path === '/admin') {
      if (authenticated) {
        setAdminDashboardOpen(true);
      } else {
        // Protected admin route: unauthorized visitor redirected to login
        window.history.replaceState(null, '', '/admin/login');
        setAdminLoginOpen(true);
        showToast('Please sign in to access the Admin Management Dashboard.');
      }
    }

    const handlePopState = () => {
      const currentPath = window.location.pathname.toLowerCase();
      const isAuth = isAdminAuthenticated();
      setIsAdmin(isAuth);
      if (currentPath === '/admin/login') {
        setAdminDashboardOpen(false);
        setAdminLoginOpen(true);
      } else if (currentPath === '/admin/dashboard') {
        if (isAuth) {
          setAdminLoginOpen(false);
          setAdminDashboardOpen(true);
        } else {
          window.history.replaceState(null, '', '/admin/login');
          setAdminLoginOpen(true);
        }
      } else {
        setAdminLoginOpen(false);
        setAdminDashboardOpen(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Freeze page scrolling while a modal is open (the modals scroll internally).
  useEffect(() => {
    setScrollLocked(adminLoginOpen || adminDashboardOpen || detailModalOpen);
    return () => setScrollLocked(false);
  }, [adminLoginOpen, adminDashboardOpen, detailModalOpen]);

  // Handlers for Admin
  const handleOpenAdminLogin = () => {
    window.history.pushState(null, '', '/admin/login');
    setAdminLoginOpen(true);
  };

  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    setAdminLoginOpen(false);
    window.history.pushState(null, '', '/admin/dashboard');
    setAdminDashboardOpen(true);
    showToast('Administrator authenticated successfully. Welcome to Reception Console.');
  };

  const handleAdminLogout = () => {
    adminLogout();
    setIsAdmin(false);
    setAdminDashboardOpen(false);
    if (window.location.pathname.includes('/admin')) {
      window.history.pushState(null, '', '/');
    }
    showToast('Signed out of Administrator Console.');
  };

  const handleCloseAdminLogin = () => {
    setAdminLoginOpen(false);
    if (window.location.pathname === '/admin/login') {
      window.history.pushState(null, '', '/');
    }
  };

  const handleCloseAdminDashboard = () => {
    setAdminDashboardOpen(false);
    if (window.location.pathname === '/admin/dashboard' || window.location.pathname === '/admin') {
      window.history.pushState(null, '', '/');
    }
  };

  const handleViewRoomDetails = (room: HotelRoom) => {
    setSelectedRoom(room);
    setDetailModalOpen(true);
  };

  const handleSearch = (criteria: {
    checkIn: string;
    checkOut: string;
    category: string;
    guests: number;
  }) => {
    showToast(`Showing accommodations available for ${criteria.guests} guests from ${criteria.checkIn} to ${criteria.checkOut}`);
  };

  const handleScrollToRooms = () => {
    // '#rooms' is disabled in this layout (see below); availability is the live room section.
    scrollToTarget(document.getElementById('rooms') ? '#rooms' : '#availability');
  };

  return (
    <div className="min-h-screen bg-[#16211d] text-gray-800 flex flex-col font-sans">
      <SmoothScroll />
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-blue-950 text-white px-6 py-3 rounded-full shadow-2xl border border-amber-400/60 text-xs sm:text-sm font-semibold flex items-center space-x-2">
          <i className="fa fa-bell text-amber-400"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation: minimal bar + full-screen menu (admin access lives in the menu) */}
      <CinemaNav
        isAdmin={isAdmin}
        onOpenAdminLogin={handleOpenAdminLogin}
        onOpenAdminDashboard={() => {
          window.history.pushState(null, '', '/admin/dashboard');
          setAdminDashboardOpen(true);
        }}
      />

      {/* Cinematic homepage (Stage 3): opening scene + pinned story scene */}
      <CinemaHome />

      {/* Remaining scenes: each has its own motion, all share one scroll system and one visual language */}
      <AvailabilityScene onViewRoomDetails={handleViewRoomDetails} /> {/* Active Booking: original availability board + WhatsApp booking */}
      <DiningScene />
      <ParkingScene />
      <ViewpointsScene />
      <GalleryScene />
      <AboutScene />
      <ContactSection /> {/* Direct Booking */}
      <CinemaFooter
        onOpenBooking={handleScrollToRooms}
        onOpenAdminLogin={handleOpenAdminLogin}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
      />

      {/* Room Detail Modal (Strictly Zero Pricing) */}
      {detailModalOpen && selectedRoom && (
        <RoomDetailModal
          room={selectedRoom}
          onClose={() => setDetailModalOpen(false)}
        />
      )}

      {/* Admin Login Modal & Route Handler (/admin/login) */}
      <AdminLoginModal
        isOpen={adminLoginOpen}
        onClose={handleCloseAdminLogin}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Admin Management Dashboard & Route Handler (/admin/dashboard) */}
      <AdminDashboardModal
        isOpen={adminDashboardOpen}
        onClose={handleCloseAdminDashboard}
        onLogout={handleAdminLogout}
      />
    </div>
  );
}
