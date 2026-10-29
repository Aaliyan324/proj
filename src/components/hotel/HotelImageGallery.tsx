import React, { useState, useEffect, useCallback } from 'react';
import { HotelImage, hotelImageUrl } from '../../services/apiService';

interface GalleryProps {
  images: HotelImage[];
  hotelName: string;
}

/**
 * Hotel photo gallery with a full-screen, keyboard-accessible lightbox.
 * All <img> sources use the authorized /api/hotel-image/:id delivery route,
 * so original private Blob URLs are never referenced by the browser.
 */
export const HotelImageGallery: React.FC<GalleryProps> = ({ images, hotelName }) => {
  const [active, setActive] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  const close = useCallback(() => setActive(null), []);
  const show = useCallback((dir: -1 | 1) => {
    setActive((cur) => {
      if (cur === null || images.length === 0) return cur;
      return (cur + dir + images.length) % images.length;
    });
  }, [images.length]);

  // Keyboard controls + body scroll lock while the lightbox is open.
  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(1);
      else if (e.key === 'ArrowLeft') show(-1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [active, close, show]);

  if (!images || images.length === 0) {
    return (
      <div className="rounded-2xl bg-gray-50 border border-dashed border-gray-200 p-10 text-center text-gray-400">
        <i className="fa fa-images text-3xl mb-2"></i>
        <p className="text-sm">No photos available yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setActive(i)}
            className={`relative overflow-hidden rounded-xl bg-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer ${
              i === 0 ? 'col-span-2 row-span-2 aspect-square sm:aspect-auto' : 'aspect-[4/3]'
            }`}
            aria-label={`View photo ${i + 1} of ${hotelName}`}
          >
            {!loaded[img.id] && <span className="absolute inset-0 animate-pulse bg-gray-200" />}
            <img
              src={hotelImageUrl(img.id)}
              alt={`${hotelName} photo ${i + 1}`}
              loading="lazy"
              onLoad={() => setLoaded((s) => ({ ...s, [img.id]: true }))}
              className={`w-full h-full object-cover transition-transform duration-500 hover:scale-105 ${loaded[img.id] ? 'opacity-100' : 'opacity-0'}`}
            />
          </button>
        ))}
      </div>

      {active !== null && images[active] && (
        <div className="fixed inset-0 z-[90] bg-black/90 flex flex-col" role="dialog" aria-modal="true" aria-label="Image gallery">
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm font-semibold">{hotelName} — {active + 1} / {images.length}</span>
            <button onClick={close} aria-label="Close gallery" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer">
              <i className="fa fa-xmark text-xl"></i>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4 pb-4 relative">
            <button
              onClick={() => show(-1)}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
            >
              <i className="fa fa-chevron-left"></i>
            </button>
            <img
              src={hotelImageUrl(images[active].id)}
              alt={`${hotelName} photo ${active + 1}`}
              className="max-w-full max-h-[80vh] rounded-lg object-contain shadow-2xl"
            />
            <button
              onClick={() => show(1)}
              aria-label="Next image"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
            >
              <i className="fa fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
