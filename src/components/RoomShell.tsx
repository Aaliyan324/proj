import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface RoomShellProps {
  children: React.ReactNode;
}

// Shared chrome for the public room pages. It reuses the exact same Topbar,
// Navbar and Footer as the home page for full branding/navigation consistency,
// and — like the home navigation — carries no Admin entry point. The "Book a
// Room" CTA routes to the rooms catalogue.
export const RoomShell: React.FC<RoomShellProps> = ({ children }) => {
  const navigate = useNavigate();
  const goRooms = () => navigate('/rooms');

  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col font-sans">
      <Topbar selectedLanguage="English" onSelectLanguage={() => {}} />
      <Navbar onOpenBooking={goRooms} activeSection="rooms" />
      <main className="flex-1">{children}</main>
      <Footer
        onOpenBooking={goRooms}
        selectedLanguage="English"
        onSelectLanguage={() => {}}
      />
    </div>
  );
};
