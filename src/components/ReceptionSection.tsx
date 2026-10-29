import React, { useState, useEffect } from 'react';
import { FacilitySection, fetchFacilities, fetchSettings, buildWhatsAppLink } from '../services/apiService';
import { Reveal } from '../lib/Reveal';

export const ReceptionSection: React.FC = () => {
  const [reception, setReception] = useState<FacilitySection | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');

  useEffect(() => {
    fetchFacilities().then((facs) => {
      const found = facs.find((f) => f.type === 'reception' || f.id === 'reception');
      if (found) setReception(found);
    });
    fetchSettings().then((s) => setWhatsappNumber(s.whatsapp_number));
  }, []);

  const title = reception?.title || 'Front Desk Reception & Concierge';
  const description =
    reception?.description ||
    'Authentic 24/7 reception desk featuring Hotel Red Rock handcrafted wood counter, illuminated logo wall, concierge check-in station, and guest waiting lounge.';
  const image = reception?.image_url || '/images/01-reception.jpg';

  const handleScrollToAvailability = () => {
    document.getElementById('availability')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleWhatsAppContact = () => {
    const link = buildWhatsAppLink(whatsappNumber);
    window.open(link, '_blank');
  };

  return (
    <section id="reception" className="py-20 bg-gray-50 border-t border-gray-100">
      <Reveal>
      <div className="max-w-7xl mx-auto px-4 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Information & Policies */}
          <div className="lg:col-span-6 space-y-5 order-2 lg:order-1">
            <div>
              <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-hotel-primary bg-amber-50 border border-amber-200/60 px-3 py-1 rounded-full mb-3">
                <i className="fa fa-concierge-bell text-amber-500"></i>
                <span>Step 2 &bull; Reception Desk &amp; Concierge</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-blue-950 leading-tight">
                {title}
              </h2>
            </div>

            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              {description}
            </p>

            {/* Hotel Policy Pills */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center space-x-3 bg-white p-3 rounded-2xl border border-gray-200/80 shadow-xs">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-hotel-primary flex items-center justify-center shrink-0">
                  <i className="fa fa-clock text-xs"></i>
                </div>
                <div className="text-xs">
                  <span className="font-bold text-gray-900">Check-in: 2:00 PM &bull; Check-out: 12:00 Noon</span>
                  <span className="text-gray-500 block">24/7 front desk staff available for early or late arrivals</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 bg-white p-3 rounded-2xl border border-gray-200/80 shadow-xs">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <i className="fa fa-users text-xs"></i>
                </div>
                <div className="text-xs">
                  <span className="font-bold text-gray-900">Family-Friendly Accommodations</span>
                  <span className="text-gray-500 block">Respectful, safe, and family-oriented hospitality standards</span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Next Step (Availability) & WhatsApp */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={handleScrollToAvailability}
                className="px-6 py-3 rounded-full bg-hotel-primary hover:bg-blue-900 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer"
              >
                <span>Check Room Availability (Step 3)</span>
                <i className="fa fa-arrow-down text-xs"></i>
              </button>

              <button
                onClick={handleWhatsAppContact}
                className="px-5 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center space-x-2 cursor-pointer"
              >
                <i className="fab fa-whatsapp text-sm"></i>
                <span>Direct Reception WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Right Column: Real Reception Photograph */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <div className="relative group overflow-hidden rounded-3xl shadow-xl border border-gray-200 bg-gray-900">
              <div className="h-80 sm:h-96 md:h-[420px] w-full overflow-hidden">
                <img
                  src={image}
                  alt={title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  onError={(e: any) => {
                    e.target.src = '/images/01-reception.jpg';
                  }}
                />
              </div>

              {/* Sequence Badge (Top Left) */}
              <div className="absolute top-4 left-4 z-10">
                <span className="bg-blue-950/95 text-amber-300 font-extrabold text-xs px-3.5 py-1.5 rounded-full shadow-md backdrop-blur-sm border border-amber-400/40 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Sequence #02 &bull; Reception</span>
                </span>
              </div>

              {/* Real Photo Verified Badge (Top Right) */}
              <div className="absolute top-4 right-4 z-10">
                <span className="bg-emerald-600/95 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md backdrop-blur-sm flex items-center space-x-1.5 border border-emerald-400/30">
                  <i className="fa fa-camera text-[10px]"></i>
                  <span>Real Facility Photo</span>
                </span>
              </div>

              {/* Caption Overlay at Bottom */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-blue-950/90 via-blue-950/50 to-transparent p-5 text-white">
                <p className="text-xs text-blue-100 font-medium">
                  Hotel Red Rock reception counter &bull; 24-hour guest assistance &amp; check-in
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
      </Reveal>
    </section>
  );
};
