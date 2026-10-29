import React, { useState } from 'react';

const PARKING_IMAGES = [
  {
    src: '/images/multi-storey-car-park-1271919_1280.jpg',
    title: 'Main Parking Area',
    caption: 'Spacious main parking lot with easy access to the hotel entrance — accommodates cars and larger vehicles.',
  },
  {
    src: '/images/360_F_330787755_RSUhTI7LvN3UUvGWus7t90Sh8yACJ8Lb.jpg',
    title: 'Covered Parking Zone',
    caption: 'Covered parking bays providing shelter from weather conditions, available 24/7 for all guests.',
  },
  {
    src: '/images/360_F_45379214_E6PlG0YCUvxFeRYpZcBVSiRksPhQulgy.jpg',
    title: 'Guest Parking Facility',
    caption: 'Designated guest parking with clear markings and security, complimentary for all staying guests.',
  },
];

const PARKING_FEATURES = [
  { icon: 'fa-shield-alt', label: 'Secure & Monitored', desc: 'CCTV-monitored, safe parking for all guests' },
  { icon: 'fa-clock', label: '24/7 Access', desc: 'Park and retrieve your vehicle at any hour' },
  { icon: 'fa-car', label: 'All Vehicle Types', desc: 'Cars, SUVs, and larger vehicles accommodated' },
  { icon: 'fa-gift', label: 'Complimentary', desc: 'Free parking for all hotel guests' },
];

export const ParkingSection: React.FC = () => {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightbox((prev) => (prev !== null ? (prev - 1 + PARKING_IMAGES.length) % PARKING_IMAGES.length : 0));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightbox((prev) => (prev !== null ? (prev + 1) % PARKING_IMAGES.length : 0));
  };

  return (
    <section id="parking" className="py-20 bg-blue-950 text-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-12">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-amber-400 bg-white/10 px-3.5 py-1.5 rounded-full mb-3">
            <i className="fa fa-parking"></i>
            <span>On-Site Parking • Complimentary for Guests</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mt-1 mb-3">
            Parking <span className="text-amber-400">Available</span>
          </h2>
          <p className="text-blue-200 text-sm sm:text-base leading-relaxed">
            Grand Travela offers secure, spacious on-site parking for all hotel guests — complimentary and accessible 24/7.
            Whether you arrive by car or SUV, our dedicated parking facility ensures a hassle-free stay.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {PARKING_FEATURES.map((f) => (
            <div key={f.label} className="bg-white/10 border border-white/20 rounded-2xl p-5 text-center hover:bg-white/15 transition-all">
              <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-3">
                <i className={`fa ${f.icon} text-amber-400 text-xl`}></i>
              </div>
              <h4 className="font-bold text-white text-sm mb-1">{f.label}</h4>
              <p className="text-blue-300 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Parking Photo Gallery */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PARKING_IMAGES.map((img, idx) => (
            <div
              key={idx}
              onClick={() => setLightbox(idx)}
              className="group relative rounded-2xl overflow-hidden shadow-lg cursor-pointer border border-white/10 hover:border-amber-400/50 transition-all duration-300"
            >
              <div className="h-60 w-full bg-gray-800 overflow-hidden">
                <img
                  src={img.src}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e: any) => { e.target.src = '/images/room_suite_king.jpg'; }}
                />
              </div>
              {/* Overlay */}
              <div className="absolute inset-0 bg-blue-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-amber-400 text-blue-950 flex items-center justify-center shadow-lg">
                  <i className="fa fa-expand-alt text-base"></i>
                </div>
              </div>
              {/* Badge */}
              <div className="absolute top-3 left-3">
                <span className="bg-amber-400 text-blue-950 font-bold text-xs px-2.5 py-1 rounded-full">
                  <i className="fa fa-parking mr-1"></i>Parking
                </span>
              </div>
              {/* Caption */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-950/90 to-transparent px-4 py-4">
                <h4 className="text-white font-bold text-sm">{img.title}</h4>
                <p className="text-blue-200 text-xs leading-snug mt-0.5 line-clamp-2">{img.caption}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Notice */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center space-x-2 bg-emerald-900/50 border border-emerald-400/40 text-emerald-300 text-xs px-5 py-2.5 rounded-full font-medium">
            <i className="fa fa-check-circle text-emerald-400"></i>
            <span>Complimentary parking is included for all staying hotel guests. Please inform reception upon arrival.</span>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-900 rounded-3xl overflow-hidden max-w-3xl w-full shadow-2xl border border-gray-800 relative"
          >
            {/* Top Bar */}
            <div className="px-5 py-4 bg-gray-900 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center space-x-2">
                <span className="bg-amber-400 text-blue-950 text-xs font-black px-2.5 py-0.5 rounded-full">
                  <i className="fa fa-parking mr-1"></i>Parking
                </span>
                <h3 className="text-white font-bold text-base">{PARKING_IMAGES[lightbox].title}</h3>
              </div>
              <button
                onClick={() => setLightbox(null)}
                className="bg-gray-800 hover:bg-gray-700 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer"
              >
                <i className="fa fa-times"></i>
              </button>
            </div>
            {/* Image */}
            <div className="relative bg-black flex items-center justify-center" style={{ minHeight: '320px', maxHeight: '60vh' }}>
              <img
                src={PARKING_IMAGES[lightbox].src}
                alt={PARKING_IMAGES[lightbox].title}
                className="w-full h-auto max-h-[60vh] object-contain"
                onError={(e: any) => { e.target.src = '/images/room_suite_king.jpg'; }}
              />
              <button
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-amber-400 text-white hover:text-blue-950 w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg"
              >
                <i className="fa fa-chevron-left text-sm"></i>
              </button>
              <button
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-amber-400 text-white hover:text-blue-950 w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg"
              >
                <i className="fa fa-chevron-right text-sm"></i>
              </button>
            </div>
            {/* Footer */}
            <div className="px-5 py-4 bg-gray-900 border-t border-gray-800 flex items-center justify-between">
              <p className="text-gray-400 text-xs flex-1">{PARKING_IMAGES[lightbox].caption}</p>
              <span className="text-gray-500 text-xs font-mono ml-4 shrink-0">{lightbox + 1} / {PARKING_IMAGES.length}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

