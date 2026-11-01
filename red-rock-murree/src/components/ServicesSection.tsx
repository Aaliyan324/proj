import React, { useState } from 'react';
import { RESORT_AMENITIES, AmenityService } from '../data/hotelData';

export const ServicesSection: React.FC = () => {
  const [selectedService, setSelectedService] = useState<AmenityService | null>(null);

  const leftServices = RESORT_AMENITIES.slice(0, 4);
  const rightServices = RESORT_AMENITIES.slice(4);

  return (
    <section id="services" className="py-20 bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 lg:px-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h5 className="section-title text-sm lg:text-base font-bold text-hotel-primary uppercase tracking-widest">
            Hotel Services &amp; Facilities
          </h5>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-blue-950 mt-3 mb-4">
            Guest Amenities &amp; Comforts
          </h2>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            We are dedicated to providing a comfortable, secure, and relaxing stay with modern in-room amenities, 24/7 reception, high-speed internet, and daily housekeeping.
          </p>
        </div>

        {/* Symmetrical Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {leftServices.map((service) => (
              <div
                key={service.id}
                onClick={() => setSelectedService(service)}
                className="service-content-inner cursor-pointer flex items-center justify-between bg-white border border-blue-900/10 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 group"
              >
                <div className="text-right pr-4 flex-1">
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-hotel-primary transition-colors mb-2">
                    {service.title}
                  </h4>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-2">
                    {service.shortDesc}
                  </p>
                  <span className="inline-block text-amber-600 font-semibold text-xs tracking-wider uppercase">
                    <i className="fa fa-clock me-1"></i> {service.schedule}
                  </span>
                </div>

                <div className="service-icon p-4 rounded-2xl bg-blue-50 group-hover:bg-hotel-primary transition-colors flex items-center justify-center min-w-[70px] h-[70px]">
                  <i className={`fa ${service.iconClass} text-2xl sm:text-3xl text-hotel-primary group-hover:text-white transition-colors`}></i>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {rightServices.map((service) => (
              <div
                key={service.id}
                onClick={() => setSelectedService(service)}
                className="service-content-inner cursor-pointer flex items-center bg-white border border-blue-900/10 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 group"
              >
                <div className="service-icon p-4 rounded-2xl bg-blue-50 group-hover:bg-hotel-primary transition-colors flex items-center justify-center min-w-[70px] h-[70px] mr-4">
                  <i className={`fa ${service.iconClass} text-2xl sm:text-3xl text-hotel-primary group-hover:text-white transition-colors`}></i>
                </div>

                <div className="text-left flex-1">
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-hotel-primary transition-colors mb-2">
                    {service.title}
                  </h4>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-2">
                    {service.shortDesc}
                  </p>
                  <span className="inline-block text-amber-600 font-semibold text-xs tracking-wider uppercase">
                    <i className="fa fa-clock me-1"></i> {service.schedule}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Modal for Service */}
        {selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade">
            <div className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl border border-gray-100 relative">
              <div className="relative h-52 w-full">
                <img
                  src={selectedService.image}
                  alt={selectedService.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <button
                  onClick={() => setSelectedService(null)}
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                >
                  <i className="fa fa-times"></i>
                </button>

                <div className="absolute bottom-4 left-6 text-white">
                  <span className="bg-amber-400 text-blue-950 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full mb-1 inline-block">
                    Hotel Facility
                  </span>
                  <h3 className="text-xl font-bold">{selectedService.title}</h3>
                </div>
              </div>

              <div className="p-6">
                <p className="text-gray-700 text-sm leading-relaxed mb-4">
                  {selectedService.fullDesc}
                </p>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-950 flex items-center justify-between mb-6">
                  <span className="font-semibold">
                    <i className="fa fa-clock text-hotel-primary me-2"></i>
                    Schedule:
                  </span>
                  <span className="font-bold text-hotel-primary">{selectedService.schedule}</span>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    onClick={() => setSelectedService(null)}
                    className="bg-hotel-primary hover:bg-blue-900 text-white font-bold text-xs uppercase px-6 py-2.5 rounded-full transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
