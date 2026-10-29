import React, { useState, useEffect } from 'react';
import { DynamicGalleryItem, fetchGallery } from '../services/apiService';
import { GALLERY_ITEMS } from '../data/hotelData';
import { Reveal } from '../lib/Reveal';

export const GallerySection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [galleryItems, setGalleryItems] = useState<DynamicGalleryItem[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const items = await fetchGallery();
      if (items && items.length > 0) {
        setGalleryItems(items);
      } else {
        // Fallback to initial seed items
        setGalleryItems(
          GALLERY_ITEMS.map((g) => ({
            id: g.id,
            category: g.category,
            title: g.title,
            room_number: null,
            description: g.caption,
            image_url: g.image,
            display_order: g.stepNumber,
            is_published: 1,
          }))
        );
      }
    } catch (err) {
      console.error('Failed fetching gallery items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll every 10 seconds for real-time administrator updates
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'all', label: 'All Photos' },
    { id: 'parking', label: 'Parking' },
    { id: 'scenery', label: 'Scenery' },
    { id: 'night', label: 'Evening & Night' },
  ];

  const categoryLabels: Record<string, string> = {
    parking: 'Parking',
    scenery: 'Scenery',
    night: 'Evening & Night',
  };

  const filteredItems = galleryItems.filter((item) => activeTab === 'all' || item.category === activeTab);

  // Handle keyboard navigation in Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev !== null ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev !== null ? (prev - 1 + filteredItems.length) % filteredItems.length : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, filteredItems.length]);

  const currentItem: DynamicGalleryItem | null =
    lightboxIndex !== null && filteredItems[lightboxIndex] ? filteredItems[lightboxIndex] : null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + filteredItems.length) % filteredItems.length);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % filteredItems.length);
    }
  };

  return (
    <section id="gallery" className="py-20 bg-white border-t border-gray-100">
      <Reveal>
      <div className="max-w-7xl mx-auto px-4 lg:px-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-hotel-primary bg-blue-50 px-3.5 py-1.5 rounded-full mb-3">
            <i className="fa fa-images text-amber-500"></i>
            <span>Photo Gallery &bull; Parking, Scenery &amp; Night Views</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-blue-950 mt-1 mb-3">
            Hotel Photo Gallery &amp; Walkthrough
          </h2>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            Browse our photo collection: parking facilities and the scenery and evening views of the surrounding hills. Select any photo to open it in the viewer and move through the gallery with the arrow buttons or keyboard.
          </p>

          {/* Sequential Route Banner */}
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 bg-blue-50/80 border border-blue-200/80 px-4 py-2 rounded-full text-xs font-semibold text-blue-950 shadow-xs">
            <span className="flex items-center space-x-1 text-hotel-primary font-bold">
              <i className="fa fa-walking"></i>
              <span>Gallery Order:</span>
            </span>
            <span className="text-blue-900 font-bold">Parking</span>
            <span className="text-amber-500 font-black">&rarr;</span>
            <span className="text-blue-900 font-bold">Scenery</span>
            <span className="text-amber-500 font-black">&rarr;</span>
            <span className="text-blue-900 font-bold">Evening &amp; Night</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setLightboxIndex(null);
              }}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-hotel-primary text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sequential Photo Grid */}
        {loading && galleryItems.length === 0 ? (
          <div className="text-center py-16">
            <i className="fa fa-spinner fa-spin text-3xl text-hotel-primary mb-3"></i>
            <p className="text-sm text-gray-500">Loading gallery...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-12">No photos in this category yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item, index) => {
              const isEntrance = item.category === 'entrance' || item.title === 'Entrance';
              const isReception = item.category === 'reception' || item.title === 'Reception';
              const isAvail = item.category === 'availability';

              return (
                <div
                  key={item.id}
                  onClick={() => setLightboxIndex(index)}
                  className="card-hover-elevate group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl duration-300 border border-gray-100 flex flex-col cursor-pointer"
                >
                  {/* Photo Container */}
                  <div className="relative h-60 w-full overflow-hidden bg-gray-100">
                    <img
                      src={item.image_url}
                      alt={`${item.title}: ${item.description}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e: any) => {
                        e.target.style.visibility = 'hidden';
                      }}
                    />

                    {/* Sequence Badge (Top-Left) */}
                    <div className="absolute top-3 left-3 z-10">
                      <span
                        className={`text-xs font-black px-3 py-1 rounded-full shadow backdrop-blur-sm border ${
                          isEntrance || isReception
                            ? 'bg-blue-950/95 text-amber-300 border-amber-400/40'
                            : isAvail
                            ? 'bg-emerald-950/95 text-emerald-300 border-emerald-400/40'
                            : 'bg-blue-950/90 text-white border-white/20'
                        }`}
                      >
                        #{item.display_order.toString().padStart(2, '0')} &bull; {item.title}
                      </span>
                    </div>

                    {/* Real Photo Verified Badge (Top-Right) */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="bg-emerald-600/95 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow flex items-center space-x-1 border border-emerald-400/30">
                        <i className="fa fa-camera text-[10px]"></i>
                        <span>Real Photo</span>
                      </span>
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-blue-950/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-amber-400 text-blue-950 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <i className="fa fa-expand-alt text-base"></i>
                      </div>
                    </div>
                  </div>

                  {/* Card Information */}
                  <div className="p-4 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="text-base font-extrabold text-blue-950 group-hover:text-hotel-primary transition-colors">
                          {item.title}
                        </h4>
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                          {categoryLabels[item.category] || 'Gallery'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs text-hotel-primary font-bold">
                      <span>Photo {index + 1} of {filteredItems.length}</span>
                      <span className="group-hover:translate-x-1 transition-transform inline-flex items-center space-x-1">
                        <span>View Photo</span>
                        <i className="fa fa-arrow-right text-[10px]"></i>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Lightbox Modal with Sequential Walkthrough Navigation */}
        {currentItem && lightboxIndex !== null && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
            onClick={() => setLightboxIndex(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl border border-gray-800 relative flex flex-col max-h-[92vh]"
            >
              {/* Modal Top Bar */}
              <div className="p-4 sm:p-5 bg-gray-900 text-white flex items-center justify-between border-b border-gray-800 shrink-0">
                <div className="flex items-center space-x-3">
                  <span className="bg-amber-400 text-blue-950 text-xs font-black uppercase px-2.5 py-0.5 rounded-full">
                    Photo {lightboxIndex + 1} of {filteredItems.length}
                  </span>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      {currentItem.title}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Gallery &bull; {categoryLabels[currentItem.category] || currentItem.category}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setLightboxIndex(null)}
                  className="bg-gray-800 hover:bg-gray-700 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                  title="Close viewer (Esc)"
                >
                  <i className="fa fa-times text-base"></i>
                </button>
              </div>

              {/* Photo Display with Navigation Arrows */}
              <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[300px] max-h-[62vh]">
                <img
                  src={currentItem.image_url}
                  alt={currentItem.title}
                  className="w-full h-auto max-h-[62vh] object-contain select-none"
                  onError={(e: any) => {
                    e.target.style.visibility = 'hidden';
                  }}
                />

                {/* Prev Button */}
                <button
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-amber-400 text-white hover:text-blue-950 w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg z-10"
                  title="Previous photo (Left Arrow)" aria-label="Previous photo"
                >
                  <i className="fa fa-chevron-left text-sm"></i>
                </button>

                {/* Next Button */}
                <button
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-amber-400 text-white hover:text-blue-950 w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg z-10"
                  title="Next photo (Right Arrow)" aria-label="Next photo"
                >
                  <i className="fa fa-chevron-right text-sm"></i>
                </button>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 bg-gray-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-800 shrink-0">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    {currentItem.description}
                  </p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={handlePrev}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 transition-colors"
                  >
                    &larr; Prev
                  </button>
                  <span className="text-xs text-gray-400 font-mono">
                    {lightboxIndex + 1} / {filteredItems.length}
                  </span>
                  <button
                    onClick={handleNext}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 transition-colors"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </Reveal>
    </section>
  );
};


