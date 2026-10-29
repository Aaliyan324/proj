import React, { useState, useEffect } from 'react';
import { HotelRoom, fetchSettings, buildWhatsAppLink } from '../services/apiService';
import { HOTEL_INFO } from '../data/hotelData';

interface RoomDetailModalProps {
  room: HotelRoom;
  onClose: () => void;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({ room, onClose }) => {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const isAvailable = Boolean(room.is_available === 1 || room.is_available === true);

  useEffect(() => {
    fetchSettings().then(s => setWhatsappNumber(s.whatsapp_number));
  }, []);

  const galleryImages = [
    room.image_url,
    room.image_url.includes('double') ? '/images/room_suite_king.jpg' : '/images/room_suite_double.jpg',
    '/images/room_suite_lounge.jpg',
    '/images/room_suite_entry.jpg'
  ];

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const handleWhatsAppBooking = () => {
    const link = buildWhatsAppLink(whatsappNumber, room.room_number, isAvailable);
    window.open(link, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl border border-gray-100 my-8 relative flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-hotel-primary text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <span className="bg-amber-400 text-blue-950 text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full">
              {room.room_number}
            </span>
            <h3 className="text-xl font-bold">{room.room_number} &bull; {room.room_type || 'Guest Suite'}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <i className="fa fa-times"></i>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Main Gallery Display */}
          <div>
            <div className="h-80 sm:h-96 w-full rounded-2xl overflow-hidden relative shadow-md bg-gray-100">
              <img
                src={galleryImages[activeImageIndex]}
                alt={room.room_number}
                className="w-full h-full object-cover"
                onError={(e: any) => { e.target.src = '/images/room_suite_king.jpg'; }}
              />
              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
                Photo {activeImageIndex + 1} of {galleryImages.length}
              </div>

              {/* Status pill overlay */}
              <div className="absolute top-4 left-4">
                {(() => {
                  const status = room.status || (isAvailable ? 'Available' : 'Occupied');
                  if (status === 'Available') {
                    return (
                      <span className="bg-emerald-600 text-white font-bold text-xs px-3 py-1 rounded-full shadow flex items-center space-x-1.5 border border-emerald-400/30">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                        <span>Available For Booking</span>
                      </span>
                    );
                  } else if (status === 'Reserved') {
                    return (
                      <span className="bg-blue-600 text-white font-bold text-xs px-3 py-1 rounded-full shadow flex items-center space-x-1.5 border border-blue-400/30">
                        <i className="fa fa-calendar-check text-[10px]"></i>
                        <span>Currently Reserved</span>
                      </span>
                    );
                  } else if (status === 'Maintenance') {
                    return (
                      <span className="bg-gray-600 text-white font-bold text-xs px-3 py-1 rounded-full shadow flex items-center space-x-1.5 border border-gray-400/30">
                        <i className="fa fa-tools text-[10px]"></i>
                        <span>Under Maintenance</span>
                      </span>
                    );
                  } else {
                    return (
                      <span className="bg-amber-600 text-white font-bold text-xs px-3 py-1 rounded-full shadow flex items-center space-x-1.5 border border-amber-400/30">
                        <i className="fa fa-user-check text-[10px]"></i>
                        <span>Currently Occupied</span>
                      </span>
                    );
                  }
                })()}
              </div>
            </div>

            {/* Thumbnail Row */}
            <div className="flex space-x-3 mt-3 overflow-x-auto pb-1">
              {galleryImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImageIndex(i)}
                  className={`h-16 w-24 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                    activeImageIndex === i ? 'border-amber-400 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Key Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-xs">
            <div>
              <span className="text-gray-500 block uppercase tracking-wider text-[10px]">Room Number</span>
              <strong className="text-gray-900 text-sm">{room.room_number}</strong>
            </div>
            <div>
              <span className="text-gray-500 block uppercase tracking-wider text-[10px]">Room Category</span>
              <strong className="text-gray-900 text-sm">{room.room_type || 'Deluxe Suite'}</strong>
            </div>
            <div>
              <span className="text-gray-500 block uppercase tracking-wider text-[10px]">Bed Type</span>
              <strong className="text-gray-900 text-sm">{room.room_type?.includes('Twin') ? 'Twin Bedding' : 'King Bed'}</strong>
            </div>
            <div>
              <span className="text-gray-500 block uppercase tracking-wider text-[10px]">Availability</span>
              <strong className={isAvailable ? "text-emerald-700 text-sm" : "text-amber-700 text-sm"}>
                {isAvailable ? "Available" : "Not Available"}
              </strong>
            </div>
          </div>

          {/* Room Description */}
          <div>
            <h4 className="text-base font-bold text-gray-900 mb-2">Room Overview</h4>
            <p className="text-gray-600 text-sm leading-relaxed">
              Designed for optimal rest and convenience, {room.room_number} features contemporary interior finishes, premium bedding, private ensuite bathroom with hot shower, air conditioning, and high-speed Wi-Fi.
            </p>
          </div>

          {/* Room Amenities */}
          <div>
            <h4 className="text-base font-bold text-gray-900 mb-3">Room Amenities Included</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
              <div className="flex items-center space-x-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <i className="fa fa-wifi text-hotel-primary"></i>
                <span className="font-medium">Free High-Speed Wi-Fi</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <i className="fa fa-snowflake text-hotel-primary"></i>
                <span className="font-medium">Individual Climate Control &amp; AC</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <i className="fa fa-bath text-hotel-primary"></i>
                <span className="font-medium">Private Ensuite Bathroom</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <i className="fa fa-tv text-hotel-primary"></i>
                <span className="font-medium">Flat Screen HD Television</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <i className="fa fa-broom text-hotel-primary"></i>
                <span className="font-medium">Daily Housekeeping Service</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <i className="fa fa-bolt text-hotel-primary"></i>
                <span className="font-medium">24/7 Power Generator Backup</span>
              </div>
            </div>
          </div>

          {/* Payment & Booking Policy */}
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-xs space-y-1 text-emerald-900">
            <h5 className="font-bold uppercase tracking-wider text-[11px] mb-1 flex items-center space-x-1.5">
              <i className="fa fa-money-bill-wave text-emerald-600"></i>
              <span>Payment Policy: Pay in CASH at Reception</span>
            </h5>
            <p>• <strong>Payment Method:</strong> Cash payment settled at check-in. No online transactions or card details needed.</p>
            <p>• <strong>Confirmation:</strong> Directly coordinated and confirmed via WhatsApp with hotel staff.</p>
            <p>• <strong>Check-In:</strong> {HOTEL_INFO.checkInTime} &bull; <strong>Check-Out:</strong> {HOTEL_INFO.checkOutTime}</p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 p-5 border-t border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <i className="fab fa-whatsapp text-emerald-600 text-base"></i>
            <span>Inquire directly for instant reservation</span>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-200 cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleWhatsAppBooking}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-7 py-2.5 rounded-full text-xs uppercase tracking-wider shadow-md hover:shadow-lg flex items-center space-x-2 cursor-pointer"
            >
              <i className="fab fa-whatsapp text-sm"></i>
              <span>Book via WhatsApp</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
