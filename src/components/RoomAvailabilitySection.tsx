import React, { useState, useEffect } from 'react';
import { HotelRoom, fetchRooms, fetchSettings, buildWhatsAppLink } from '../services/apiService';

interface RoomAvailabilitySectionProps {
  onViewRoomDetails?: (room: HotelRoom) => void;
}

export const RoomAvailabilitySection: React.FC<RoomAvailabilitySectionProps> = ({ onViewRoomDetails }) => {
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [roomsData, settingsData] = await Promise.all([fetchRooms(), fetchSettings()]);
      setRooms(roomsData);
      setWhatsappNumber(settingsData.whatsapp_number);
    } catch (err) {
      console.error('Failed loading room availability:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // 8-second polling for live reception updates
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const getStatus = (room: HotelRoom): string => {
    if (room.status) return room.status;
    return room.is_available === 1 || room.is_available === true ? 'Available' : 'Occupied';
  };

  const filteredRooms = rooms.filter((r) => {
    if (filterStatus === 'all') return true;
    return getStatus(r).toLowerCase() === filterStatus.toLowerCase();
  });

  const availableCount = rooms.filter((r) => getStatus(r) === 'Available').length;
  const occupiedCount = rooms.filter((r) => getStatus(r) === 'Occupied').length;
  const reservedCount = rooms.filter((r) => getStatus(r) === 'Reserved').length;
  const maintenanceCount = rooms.filter((r) => getStatus(r) === 'Maintenance').length;

  const handleWhatsAppBooking = (room: HotelRoom) => {
    const isAvail = getStatus(room) === 'Available';
    const link = buildWhatsAppLink(whatsappNumber, room.room_number, isAvail);
    window.open(link, '_blank');
  };

  const handleScrollToRooms = () => {
    document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return (
          <span className="bg-emerald-600/95 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center space-x-1.5 border border-emerald-400/30">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            <span>Available</span>
          </span>
        );
      case 'Occupied':
        return (
          <span className="bg-amber-600/95 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center space-x-1.5 border border-amber-400/30">
            <i className="fa fa-user text-[10px]"></i>
            <span>Occupied</span>
          </span>
        );
      case 'Reserved':
        return (
          <span className="bg-blue-600/95 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center space-x-1.5 border border-blue-400/30">
            <i className="fa fa-calendar-check text-[10px]"></i>
            <span>Reserved</span>
          </span>
        );
      case 'Maintenance':
        return (
          <span className="bg-gray-600/95 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center space-x-1.5 border border-gray-400/30">
            <i className="fa fa-tools text-[10px]"></i>
            <span>Maintenance</span>
          </span>
        );
      default:
        return (
          <span className="bg-emerald-600/95 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
            {status}
          </span>
        );
    }
  };

  return (
    <section id="availability" className="py-20 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 lg:px-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-hotel-primary bg-blue-50 px-3.5 py-1.5 rounded-full mb-3">
            <i className="fa fa-signal text-emerald-500"></i>
            <span>Step 3 &bull; Live Room Availability</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-blue-950 mt-1 mb-3">
            Live Room Availability Dashboard
          </h2>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            Real-time room occupancy status synchronized directly with our front desk reception console. Select any room to inquire or book directly via WhatsApp.
          </p>
        </div>

        {/* Live Status Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div
            onClick={() => setFilterStatus('available')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              filterStatus === 'available'
                ? 'bg-emerald-600 text-white shadow-lg border-emerald-600'
                : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950 hover:bg-emerald-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">Available Now</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <div className="text-3xl font-black mt-2">{availableCount}</div>
            <p className="text-[11px] opacity-80 mt-0.5">Ready for immediate check-in</p>
          </div>

          <div
            onClick={() => setFilterStatus('occupied')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              filterStatus === 'occupied'
                ? 'bg-amber-600 text-white shadow-lg border-amber-600'
                : 'bg-amber-50/70 border-amber-200/80 text-amber-950 hover:bg-amber-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">Occupied</span>
              <i className="fa fa-user-check text-xs"></i>
            </div>
            <div className="text-3xl font-black mt-2">{occupiedCount}</div>
            <p className="text-[11px] opacity-80 mt-0.5">Currently hosted guests</p>
          </div>

          <div
            onClick={() => setFilterStatus('reserved')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              filterStatus === 'reserved'
                ? 'bg-blue-600 text-white shadow-lg border-blue-600'
                : 'bg-blue-50/70 border-blue-200/80 text-blue-950 hover:bg-blue-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">Reserved</span>
              <i className="fa fa-calendar-check text-xs"></i>
            </div>
            <div className="text-3xl font-black mt-2">{reservedCount}</div>
            <p className="text-[11px] opacity-80 mt-0.5">Confirmed incoming bookings</p>
          </div>

          <div
            onClick={() => setFilterStatus('maintenance')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              filterStatus === 'maintenance'
                ? 'bg-gray-700 text-white shadow-lg border-gray-700'
                : 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider">Maintenance</span>
              <i className="fa fa-broom text-xs"></i>
            </div>
            <div className="text-3xl font-black mt-2">{maintenanceCount}</div>
            <p className="text-[11px] opacity-80 mt-0.5">Deep cleaning or service</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-4 border-b border-gray-200">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-hotel-primary text-white shadow'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Rooms ({rooms.length})
            </button>
            <button
              onClick={() => setFilterStatus('available')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'available'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-gray-100 text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              Available Only ({availableCount})
            </button>
            <button
              onClick={() => setFilterStatus('occupied')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'occupied'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-gray-100 text-amber-800 hover:bg-amber-50'
              }`}
            >
              Occupied ({occupiedCount})
            </button>
            <button
              onClick={() => setFilterStatus('reserved')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'reserved'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-gray-100 text-blue-800 hover:bg-blue-50'
              }`}
            >
              Reserved ({reservedCount})
            </button>
          </div>

          <button
            onClick={handleScrollToRooms}
            className="text-xs font-bold text-hotel-primary hover:text-blue-900 flex items-center space-x-1 cursor-pointer"
          >
            <span>Proceed to Room Showcase (Step 4) &rarr;</span>
          </button>
        </div>

        {/* Live Grid of Rooms */}
        {loading && rooms.length === 0 ? (
          <div className="text-center py-16">
            <i className="fa fa-spinner fa-spin text-3xl text-hotel-primary mb-3"></i>
            <p className="text-sm text-gray-500">Connecting to live front desk room console...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredRooms.map((room) => {
              const status = getStatus(room);
              const isAvail = status === 'Available';

              return (
                <div
                  key={room.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 flex flex-col group"
                >
                  {/* Photo Container */}
                  <div className="h-44 w-full relative overflow-hidden bg-gray-100">
                    <img
                      src={room.image_url}
                      alt={room.room_number}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e: any) => {
                        e.target.src = '/images/room_suite_king.jpg';
                      }}
                    />

                    {/* Room Number Badge */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className="bg-blue-950/90 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow border border-white/20">
                        {room.room_number}
                      </span>
                    </div>

                    {/* Live Availability Status Badge */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      {renderStatusBadge(status)}
                    </div>
                  </div>

                  {/* Room Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-extrabold text-gray-900 group-hover:text-hotel-primary transition-colors text-sm">
                          {room.room_number}
                        </h4>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          {room.room_type || 'Deluxe'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {room.description || `${room.room_number} — ${room.room_type || 'Suite accommodation'} with climate control and ensuite bath.`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 mt-3 border-t border-gray-100 space-y-1.5">
                      <button
                        onClick={() => handleWhatsAppBooking(room)}
                        className={`w-full py-2 px-3 rounded-full text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer ${
                          isAvail
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                        }`}
                      >
                        <i className="fab fa-whatsapp text-xs"></i>
                        <span>{isAvail ? 'Book via WhatsApp' : 'Inquire Status'}</span>
                      </button>

                      {onViewRoomDetails && (
                        <button
                          onClick={() => onViewRoomDetails(room)}
                          className="w-full text-center text-[11px] text-gray-500 hover:text-hotel-primary font-semibold py-0.5 transition-colors cursor-pointer"
                        >
                          View Details &rarr;
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
    </section>
  );
};
