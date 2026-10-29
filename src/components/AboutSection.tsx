import React, { useState, useEffect } from 'react';
import { HOTEL_INFO } from '../data/hotelData';
import { fetchSettings, buildWhatsAppLink } from '../services/apiService';

interface AboutSectionProps {
  onExploreRooms: () => void;
  onOpenBooking: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ onExploreRooms }) => {
  const [whatsappNumber, setWhatsappNumber] = useState('');

  useEffect(() => {
    fetchSettings().then(s => setWhatsappNumber(s.whatsapp_number));
  }, []);

  const handleWhatsAppClick = () => {
    const link = buildWhatsAppLink(whatsappNumber);
    window.open(link, '_blank');
  };

  return (
    <section id="about" className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Authentic Hotel Room Image */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div 
                className="relative rounded-2xl overflow-hidden shadow-2xl p-2 bg-white"
                style={{
                  border: '24px solid',
                  borderColor: 'transparent #13357B transparent #13357B',
                }}
              >
                <img
                  src="/images/room_suite_king.jpg"
                  alt="Grand Travela Executive Bedroom Suite"
                  className="w-full h-[450px] object-cover rounded-xl transition-transform duration-700 hover:scale-105"
                  onError={(e: any) => { e.target.src = '/images/room_suite_double.jpg'; }}
                />
              </div>

              {/* Floating Badge */}
              <div className="absolute -bottom-6 -right-4 bg-amber-400 text-blue-950 p-4 rounded-2xl shadow-xl border-2 border-white flex items-center space-x-3">
                <i className="fa fa-door-open text-3xl"></i>
                <div>
                  <div className="font-extrabold text-sm uppercase tracking-wider">20 Guest Rooms</div>
                  <div className="text-xs font-semibold">Live Availability Managed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Hotel Story & Hospitality Values */}
          <div className="lg:col-span-7">
            <div className="mb-3">
              <h5 className="section-title text-sm lg:text-base font-bold text-hotel-primary uppercase tracking-widest">
                About Grand Travela
              </h5>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-blue-950 mb-5 leading-tight">
              Comfort, Tranquility &amp; <span className="text-hotel-primary">Personalized Care</span>
            </h2>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3 flex-1 min-w-[180px]">
                <div className="flex items-center space-x-2 text-hotel-primary font-bold text-xs uppercase tracking-wider mb-1">
                  <i className="fa fa-bed text-amber-500"></i>
                  <span>20 Modern Rooms</span>
                </div>
                <p className="text-gray-600 text-xs leading-relaxed">
                  Carefully maintained guest accommodations equipped with air conditioning, plush bedding, and ensuite bathrooms.
                </p>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex-1 min-w-[180px]">
                <div className="flex items-center space-x-2 text-emerald-950 font-bold text-xs uppercase tracking-wider mb-1">
                  <i className="fab fa-whatsapp text-emerald-600"></i>
                  <span>WhatsApp Inquiries</span>
                </div>
                <p className="text-gray-600 text-xs leading-relaxed">
                  Real-time direct communication with front desk staff for instantaneous booking confirmation and requests.
                </p>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex-1 min-w-[180px]">
                <div className="flex items-center space-x-2 text-blue-950 font-bold text-xs uppercase tracking-wider mb-1">
                  <i className="fa fa-money-bill-wave text-amber-500"></i>
                  <span>Cash on Arrival</span>
                </div>
                <p className="text-gray-600 text-xs leading-relaxed">
                  Convenient and transparent cash payment upon arrival at reception. No complicated online checkout.
                </p>
              </div>
            </div>

            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Grand Travela Hotel &amp; Resort offers a welcoming haven for travelers, business guests, and families. With 20 modern rooms managed with precision through our digital reception dashboard, we guarantee verified room availability and dedicated service around the clock.
            </p>

            {/* Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 mb-8">
              <div className="flex items-center space-x-3">
                <i className="fa fa-check-circle text-hotel-primary text-sm"></i>
                <span className="text-gray-800 font-semibold text-sm">24-Hour Front Desk Support</span>
              </div>
              <div className="flex items-center space-x-3">
                <i className="fa fa-check-circle text-hotel-primary text-sm"></i>
                <span className="text-gray-800 font-semibold text-sm">High-Speed Wi-Fi in All Rooms</span>
              </div>
              <div className="flex items-center space-x-3">
                <i className="fa fa-check-circle text-hotel-primary text-sm"></i>
                <span className="text-gray-800 font-semibold text-sm">Fresh In-House Kitchen Menu</span>
              </div>
              <div className="flex items-center space-x-3">
                <i className="fa fa-check-circle text-hotel-primary text-sm"></i>
                <span className="text-gray-800 font-semibold text-sm">Uninterrupted Power Backup</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleWhatsAppClick}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-8 rounded-full shadow-md hover:shadow-xl transition-all text-sm uppercase tracking-wider flex items-center space-x-2 cursor-pointer"
              >
                <i className="fab fa-whatsapp text-lg"></i>
                <span>Contact on WhatsApp</span>
              </button>

              <button
                onClick={onExploreRooms}
                className="btn-hotel-outline font-bold py-3.5 px-7 rounded-full text-sm uppercase tracking-wider flex items-center cursor-pointer"
              >
                <i className="fa fa-door-open mr-2 text-hotel-primary"></i>
                <span>Check 20 Rooms</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
