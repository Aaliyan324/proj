import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Topbar } from './components/Topbar';
import { Navbar } from './components/Navbar';
import { HeroCarousel } from './components/HeroCarousel';
import { AboutSection } from './components/AboutSection';
import { FeaturedRoomsSection } from './components/FeaturedRoomsSection';
import { WalkthroughSection } from './components/WalkthroughSection';
import { ServicesSection } from './components/ServicesSection';
import { DiningSection } from './components/DiningSection';
import { GallerySection } from './components/GallerySection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';

import { EntranceSection } from './components/EntranceSection';
import { ReceptionSection } from './components/ReceptionSection';
import { RoomAvailabilitySection } from './components/RoomAvailabilitySection';
import { ParkingSection } from './components/ParkingSection';

import { RoomDetailModal } from './components/RoomDetailModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';

import { HotelRoom, isAdminAuthenticated, adminLogout } from './services/apiService';
import { initSmoothScroll, scrollToTarget } from './lib/motion';
import { RoomsPage } from './pages/RoomsPage';
import { RoomDetailPage } from './pages/RoomDetailPage';

function Home() {
  const navigate = useNavigate();

  // Admin Authentication State
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminDashboardOpen, setAdminDashboardOpen] = useState(false);

  // Language State
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [activeSection, setActiveSection] = useState<string>('home');

  // Modal States
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<HotelRoom | null>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Public-site smooth scrolling (Lenis + GSAP ticker integration).
  // Scoped here on purpose: modals and the admin dashboard keep native scrolling.
  useEffect(() => initSmoothScroll(), []);

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

  // Update active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'entrance', 'reception', 'availability', 'rooms', 'dining', 'services', 'parking', 'gallery', 'about', 'contact'];
      const scrollPosition = window.scrollY + 250;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // When returning to Home from another route with a pending section target
  // (stored by Navbar before navigating home), scroll to it once sections mount.
  useEffect(() => {
    const target = sessionStorage.getItem('scrollTo');
    if (target) {
      sessionStorage.removeItem('scrollTo');
      requestAnimationFrame(() => scrollToTarget(target, { offset: -16 }));
    }
  }, []);

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
    navigate('/rooms');
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-blue-950 text-white px-6 py-3 rounded-full shadow-2xl border border-amber-400/60 text-xs sm:text-sm font-semibold flex items-center space-x-2">
          <i className="fa fa-bell text-amber-400"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Topbar: Clean, No Pricing or Currency Dropdowns */}
      <Topbar
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
      />

      {/* Navigation Header */}
      <Navbar
        onOpenBooking={handleScrollToRooms}
        activeSection={activeSection}
      />

      {/* 1. Home / Hero Experience */}
      <HeroCarousel
        onSearch={handleSearch}
        onQuickBook={handleScrollToRooms}
      />

      {/* 2. Entrance: Arrival & Glass Doorway Architecture */}
      <EntranceSection onExploreRooms={handleScrollToRooms} />

      {/* Website Walkthrough: admin-written content from the database (hidden when none is published) */}
      <WalkthroughSection />

      {/* 3. Reception: 24/7 Front Desk, Check-In & Inquiries */}
      <ReceptionSection />

      {/* 4. Live Room Availability: Real-Time Persistent Room Matrix */}
      <RoomAvailabilitySection onViewRoomDetails={handleViewRoomDetails} />

      {/* 5. Featured Rooms & Suites: published rooms from the database */}
      <FeaturedRoomsSection />

      {/* Kitchen & Dining: Dynamic Food Items from Database with Availability Times */}
      <DiningSection />

      {/* Hotel Amenities & Services */}
      <ServicesSection />

      {/* On-Site Parking Section */}
      <ParkingSection />

      {/* Photo Gallery: Authentic User-Provided Hotel Room Photos */}
      <GallerySection />

      {/* About Section: 20 Rooms, Hospitality, & Mission */}
      <AboutSection
        onExploreRooms={handleScrollToRooms}
        onOpenBooking={handleScrollToRooms}
      />

      {/* Contact Section: Official WhatsApp Booking Channel & Cash Payment Policy */}
      <ContactSection />

      {/* Footer: Quick Links, WhatsApp Contact, Staff Login */}
      <Footer
        onOpenBooking={handleScrollToRooms}
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/rooms/:slug" element={<RoomDetailPage />} />
        {/* Home also serves /, /admin/* and any legacy path so the existing
            History-API-driven admin modal flow keeps working unchanged. */}
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
