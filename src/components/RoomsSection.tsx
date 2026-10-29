import React, { useState, useEffect } from 'react';
import { HotelRoom, fetchRooms, fetchSettings, buildWhatsAppLink } from '../services/apiService';
import { Reveal } from '../lib/Reveal';

interface RoomsSectionProps {
  onViewRoomDetails?: (room: HotelRoom) => void;
}

export const RoomsSection: React.FC<RoomsSectionProps> = ({ onViewRoomDetails }) => {
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [filterAvailability, setFilterAvailability] = useState<'all' | 'available' | 'unavailable'>('all');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [roomsData, settingsData] = await Promise.all([
        fetchRooms(),
        fetchSettings()
      ]);
      setRooms(roomsData);
      setWhatsappNumber(settingsData.whatsapp_number);
    } catch (err) {
      console.error('Failed loading rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll for updates every 10 seconds to ensure real-time reflection of admin changes
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredRooms = rooms.filter(room => {
    const isAvail = Boolean(room.is_available === 1 || room.is_available === true);
    if (filterAvailability === 'available') return isAvail;
    if (filterAvailability === 'unavailable') return !isAvail;
    return true;
  });

  const availableCount = rooms.filter(r => Boolean(r.is_available === 1 || r.is_available === true)).length;

  const handleWhatsAppBooking = (room: HotelRoom) => {
    const isAvail = Boolean(room.is_available === 1 || room.is_available === true);
    const link = buildWhatsAppLink(whatsappNumber, room.room_number, isAvail);
    window.open(link, '_blank');
  };

  return (
    <section id="rooms" className="py-20 bg-gray-50 border-t border-gray-100">
      <Reveal>
      <div className="max-w-7xl mx-auto px-4 lg:px-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h5 className="section-title text-sm lg:text-base font-bold text-hotel-primary uppercase tracking-widest">
            Hotel Accommodations
          </h5>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-blue-950 mt-3 mb-4">
            Guest Rooms &amp; Live Availability
          </h2>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            Browse our collection of 20 modern guest rooms. Room status is updated live by hotel reception. Select your preferred room and contact us directly on WhatsApp for instant confirmation.
          </p>
        </div>

        {/* Filter Controls & Live Count */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10 pb-4 border-b border-gray-200">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setFilterAvailability('all')}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 ${
                filterAvailability === 'all'
                  ? 'bg-hotel-primary text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All Rooms ({rooms.length})
            </button>
            <button
              onClick={() => setFilterAvailability('available')}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center space-x-1.5 ${
                filterAvailability === 'available'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Available Now ({availableCount})</span>
            </button>
            <button
              onClick={() => setFilterAvailability('unavailable')}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 ${
                filterAvailability === 'unavailable'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Reserved / Occupied ({rooms.length - availableCount})
            </button>
          </div>

          <div className="text-xs text-gray-500 font-medium flex items-center space-x-2">
            <i className="fa fa-sync-alt text-hotel-primary"></i>
            <span>Live Reception Status</span>
          </div>
        </div>

        {/* Rooms Grid */}
        {loading && rooms.length === 0 ? (
          <div className="text-center py-20">
            <i className="fa fa-spinner fa-spin text-3xl text-hotel-primary mb-3"></i>
            <p className="text-sm text-gray-500">Loading hotel rooms and live availability...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRooms.map((room) => {
              const isAvailable = Boolean(room.is_available === 1 || room.is_available === true);

              return (
                <div
                  key={room.id}
                  className="card-hover-elevate bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl duration-300 border border-gray-100 flex flex-col group"
                >
                  {/* Image Container with Badges */}
                  <div className="h-52 w-full relative overflow-hidden bg-gray-100">
                    <img
                      src={room.image_url}
                      alt={room.room_number}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e: any) => {
                        e.target.src = '/images/room_suite_king.jpg';
                      }}
                    />

                    {/* Room Number Badge (Top-Left) */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="bg-blue-950/90 backdrop-blur-sm text-white font-extrabold text-xs px-3 py-1 rounded-full shadow border border-white/20">
                        {room.room_number}
                      </span>
                    </div>

                    {/* Live Availability Badge (Top-Right) */}
                    <div className="absolute top-3 right-3 z-10">
                      {(() => {
                        const status = room.status || (isAvailable ? 'Available' : 'Occupied');
                        if (status === 'Available') {
                          return (
                            <span className="bg-emerald-600/95 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center space-x-1.5 border border-emerald-400/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                              <span>Available</span>
                            </span>
                          );
                        } else if (status === 'Reserved') {
                          return (
                            <span className="bg-blue-600/95 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center space-x-1.5 border border-blue-400/40">
                              <i className="fa fa-calendar-check text-[10px]"></i>
                              <span>Reserved</span>
                            </span>
                          );
                        } else if (status === 'Maintenance') {
                          return (
                            <span className="bg-gray-600/95 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center space-x-1.5 border border-gray-400/40">
                              <i className="fa fa-tools text-[10px]"></i>
                              <span>Maintenance</span>
                            </span>
                          );
                        } else {
                          return (
                            <span className="bg-amber-600/95 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center space-x-1.5 border border-amber-400/40">
                              <i className="fa fa-user-check text-[10px]"></i>
                              <span>Occupied</span>
                            </span>
                          );
                        }
                      })()}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-hotel-primary transition-colors">
                          {room.room_number}
                        </h3>
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                          {room.room_type || 'Deluxe Room'}
                        </span>
                      </div>

                      {/* Amenities checklist */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 my-3 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <div className="flex items-center space-x-1.5 truncate">
                          <i className="fa fa-bed text-hotel-primary text-[11px]"></i>
                          <span className="truncate">{room.room_type?.includes('Twin') ? 'Twin Bedding' : 'King Bed'}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 truncate">
                          <i className="fa fa-snowflake text-blue-500 text-[11px]"></i>
                          <span>Air Conditioned</span>
                        </div>
                        <div className="flex items-center space-x-1.5 truncate">
                          <i className="fa fa-bath text-emerald-600 text-[11px]"></i>
                          <span>Private Bath</span>
                        </div>
                        <div className="flex items-center space-x-1.5 truncate">
                          <i className="fa fa-wifi text-amber-500 text-[11px]"></i>
                          <span>Free Wi-Fi</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-gray-100 space-y-2">
                      <button
                        onClick={() => handleWhatsAppBooking(room)}
                        className={`w-full py-2.5 px-4 rounded-full text-xs font-bold transition-all shadow flex items-center justify-center space-x-2 cursor-pointer ${
                          isAvailable
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                        }`}
                        title="Direct Contact via WhatsApp"
                      >
                        <i className="fab fa-whatsapp text-sm"></i>
                        <span>{isAvailable ? 'Book via WhatsApp' : 'Inquire on WhatsApp'}</span>
                      </button>

                      {onViewRoomDetails && (
                        <button
                          onClick={() => onViewRoomDetails(room)}
                          className="w-full text-center text-xs text-gray-600 hover:text-hotel-primary font-semibold py-1 transition-colors"
                        >
                          View Room Details &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </Reveal>
    </section>
  );
};
