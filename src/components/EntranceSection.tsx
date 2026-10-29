import React, { useState, useEffect } from 'react';
import { FacilitySection, fetchFacilities } from '../services/apiService';

interface EntranceSectionProps {
  onExploreRooms?: () => void;
}

export const EntranceSection: React.FC<EntranceSectionProps> = ({ onExploreRooms }) => {
  const [entrance, setEntrance] = useState<FacilitySection | null>(null);

  useEffect(() => {
    fetchFacilities().then((facs) => {
      const found = facs.find((f) => f.type === 'entrance' || f.id === 'entrance');
      if (found) setEntrance(found);
    });
  }, []);

  const title = entrance?.title || 'Grand Hotel Entrance';
  const description =
    entrance?.description ||
    'Authentic front entrance view through modern glass doorways, featuring an entryway foyer, polished marble flooring, 24/7 surveillance, and a warm welcoming arrival atmosphere.';
  const image = entrance?.image_url || '/images/00-entrance.jpg';

  const handleScrollToReception = () => {
    document.getElementById('reception')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="entrance" className="py-20 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Real Entrance Photograph */}
          <div className="lg:col-span-6">
            <div className="relative group overflow-hidden rounded-3xl shadow-xl border border-gray-100 bg-gray-900">
              <div className="h-80 sm:h-96 md:h-[420px] w-full overflow-hidden">
                <img
                  src={image}
                  alt={title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  onError={(e: any) => {
                    e.target.src = '/images/00-entrance.jpg';
                  }}
                />
              </div>

              {/* Sequence Badge (Top Left) */}
              <div className="absolute top-4 left-4 z-10">
                <span className="bg-blue-950/95 text-amber-300 font-extrabold text-xs px-3.5 py-1.5 rounded-full shadow-md backdrop-blur-sm border border-amber-400/40 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Sequence #01 &bull; Entrance</span>
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
                <p className="text-xs text-blue-100">
                  Step 1 of Facility Walkthrough &bull; Welcoming glass portico and entry foyer
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Entrance Information & Walkthrough Transition */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-hotel-primary bg-blue-50 px-3 py-1 rounded-full mb-3">
                <i className="fa fa-door-open text-amber-500"></i>
                <span>Step 1 &bull; Arrival &amp; Entrance</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-blue-950 leading-tight">
                {title}
              </h2>
            </div>

            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              {description}
            </p>

            {/* Feature Badges */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-hotel-primary flex items-center justify-center shrink-0">
                  <i className="fa fa-shield-alt text-sm"></i>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">24/7 Security</h4>
                  <p className="text-[11px] text-gray-500">Secure monitored entryway</p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <i className="fa fa-car text-sm"></i>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Easy Access</h4>
                  <p className="text-[11px] text-gray-500">Street-level arrival portico</p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <i className="fa fa-luggage-cart text-sm"></i>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Luggage Support</h4>
                  <p className="text-[11px] text-gray-500">Assistance upon arrival</p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <i className="fa fa-walking text-sm"></i>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">Next: Reception</h4>
                  <p className="text-[11px] text-gray-500">Steps away from front desk</p>
                </div>
              </div>
            </div>

            {/* Walkthrough CTA Button to Reception */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={handleScrollToReception}
                className="px-6 py-3 rounded-full bg-hotel-primary hover:bg-blue-900 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer"
              >
                <span>Proceed to Reception (Step 2)</span>
                <i className="fa fa-arrow-down text-xs"></i>
              </button>

              <span className="text-xs text-gray-500 font-medium">
                Natural visiting sequence: Entrance &rarr; Reception &rarr; Availability &rarr; Rooms
              </span>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
