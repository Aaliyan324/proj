import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RoomShell } from '../components/RoomShell';
import { Reveal } from '../lib/Reveal';
import {
  RoomListing,
  RoomImageMeta,
  fetchRoomBySlug,
  fetchSettings,
  buildWhatsAppLink,
  resolveRoomImageSrc,
} from '../services/apiService';
import { formatPrice } from '../lib/hotelFormat';
import { HOTEL_INFO } from '../data/hotelData';
import { applySeo, resetSeoToDefault } from '../lib/seo';

const FALLBACK_IMG = '/images/room_suite_king.jpg';

export const RoomDetailPage: React.FC = () => {
  const { slug = '' } = useParams();
  const [room, setRoom] = useState<RoomListing | null>(null);
  const [images, setImages] = useState<RoomImageMeta[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    (async () => {
      const result = await fetchRoomBySlug(slug);
      if (!alive) return;
      if (result) {
        setRoom(result.room);
        setImages(result.images || []);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    })();
    fetchSettings().then((s) => alive && setWhatsappNumber(s.whatsapp_number)).catch(() => {});
    return () => { alive = false; };
  }, [slug]);

  // Gallery sources: prefer uploaded room_images, then stored gallery refs,
  // then the primary image. All resolved through the authorized delivery route.
  const gallery = useMemo(() => {
    const fromMeta = images.map((img) => resolveRoomImageSrc(`/api/room-image/${img.id}`));
    const fromGallery = (room?.gallery || []).map((g) => resolveRoomImageSrc(g)).filter(Boolean);
    const primary = resolveRoomImageSrc(room?.image_url);
    const list = [...fromMeta];
    for (const u of [...fromGallery, primary]) if (u && !list.includes(u)) list.push(u);
    return list.length ? Array.from(new Set(list)) : [FALLBACK_IMG];
  }, [images, room]);

  const isAvailable = room ? Boolean(room.is_available === 1 || room.is_available === true) : false;

  useEffect(() => {
    if (room) {
      applySeo({
        title: `${room.title || room.room_number} — Red Rock Hotel`,
        description: room.short_description || (room.description || '').slice(0, 160) || undefined,
        canonicalPath: `/rooms/${encodeURIComponent(room.slug || room.room_number)}`,
        imageUrl: gallery[0] && !gallery[0].startsWith('/api/') ? gallery[0] : undefined,
        type: 'article',
      });
    }
    return () => resetSeoToDefault('Red Rock Hotel');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    if (lightbox === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') setLightbox((i) => (i === null ? i : (i + 1) % gallery.length));
      if (e.key === 'ArrowLeft') setLightbox((i) => (i === null ? i : (i - 1 + gallery.length) % gallery.length));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [lightbox, gallery.length, closeLightbox]);

  const handleWhatsApp = () => {
    const link = buildWhatsAppLink(whatsappNumber, room ? room.title || room.room_number : undefined, isAvailable);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <RoomShell>
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-16">
          <div className="h-80 sm:h-96 w-full rounded-2xl bg-gray-200 animate-pulse" />
          <div className="mt-6 space-y-3 max-w-2xl">
            <div className="h-8 w-2/3 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </RoomShell>
    );
  }

  if (notFound || !room) {
    return (
      <RoomShell>
        <section className="max-w-3xl mx-auto px-4 py-28 text-center">
          <i className="fa fa-door-closed text-6xl text-gray-300 mb-6"></i>
          <h1 className="text-3xl font-black text-blue-950 mb-3">Room not found</h1>
          <p className="text-gray-600 mb-8">
            This room may not be published yet, or the link is out of date. Browse the
            full collection of available rooms and suites instead.
          </p>
          <Link
            to="/rooms"
            className="inline-flex items-center space-x-2 bg-hotel-primary hover:bg-blue-900 text-white font-bold text-sm px-7 py-3 rounded-full shadow-md transition-colors"
          >
            <i className="fa fa-th-large"></i>
            <span>View All Rooms</span>
          </Link>
        </section>
      </RoomShell>
    );
  }

  return (
    <RoomShell>
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 lg:py-12">
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 mb-5 flex items-center gap-2">
          <Link to="/" className="hover:text-hotel-primary">Home</Link>
          <i className="fa fa-chevron-right text-[9px]"></i>
          <Link to="/rooms" className="hover:text-hotel-primary">Rooms &amp; Suites</Link>
          <i className="fa fa-chevron-right text-[9px]"></i>
          <span className="text-gray-700 font-semibold">{room.title || room.room_number}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Gallery + description */}
          <div className="lg:col-span-2">
            <Reveal>
              <div className="h-72 sm:h-96 lg:h-[28rem] w-full rounded-2xl overflow-hidden relative shadow-md bg-gray-100 group">
                <img
                  src={gallery[0]}
                  alt={room.title || room.room_number}
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setLightbox(0)}
                  onError={(e: any) => { e.currentTarget.src = FALLBACK_IMG; }}
                />
                {isAvailable ? (
                  <span className="absolute top-4 left-4 bg-emerald-600/95 text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center space-x-1.5 border border-emerald-400/40">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                    <span>Available</span>
                  </span>
                ) : null}
                {gallery.length > 1 ? (
                  <span className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
                    Click to view full screen
                  </span>
                ) : null}
              </div>

              {gallery.length > 1 ? (
                <div className="flex space-x-3 mt-3 overflow-x-auto pb-1">
                  {gallery.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setLightbox(i)}
                      className="h-16 w-24 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer border-transparent opacity-70 hover:opacity-100 hover:border-amber-400"
                    >
                      <img src={img} alt={`View ${i + 1}`} className="w-full h-full object-cover" onError={(e: any) => { e.currentTarget.src = FALLBACK_IMG; }} />
                    </button>
                  ))}
                </div>
              ) : null}
            </Reveal>

            {/* Specs */}
            <Reveal className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-xs mt-8">
              <div>
                <span className="text-gray-500 block uppercase tracking-wider text-[10px]">Category</span>
                <strong className="text-gray-900 text-sm">{room.room_type || 'Guest Room'}</strong>
              </div>
              <div>
                <span className="text-gray-500 block uppercase tracking-wider text-[10px]">Sleeps</span>
                <strong className="text-gray-900 text-sm">{room.max_guests > 0 ? `${room.max_guests} guests` : '—'}</strong>
              </div>
              <div>
                <span className="text-gray-500 block uppercase tracking-wider text-[10px]">Bed Type</span>
                <strong className="text-gray-900 text-sm">{room.bed_type || '—'}</strong>
              </div>
              <div>
                <span className="text-gray-500 block uppercase tracking-wider text-[10px]">Room Size</span>
                <strong className="text-gray-900 text-sm">{room.room_size || '—'}</strong>
              </div>
            </Reveal>

            {/* Description */}
            <Reveal className="mt-8">
              <h2 className="text-2xl font-extrabold text-blue-950 mb-3">About this room</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {room.description || room.short_description || 'A comfortable, modern room at Red Rock Hotel. Contact reception for full details and to arrange your stay.'}
              </p>
            </Reveal>

            {/* Amenities */}
            {room.amenities && room.amenities.length > 0 ? (
              <Reveal className="mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Room amenities</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                  {room.amenities.map((a) => (
                    <div key={a} className="flex items-center space-x-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <i className="fa fa-check-circle text-emerald-600"></i>
                      <span className="font-medium">{a}</span>
                    </div>
                  ))}
                </div>
              </Reveal>
            ) : null}
          </div>

          {/* Booking panel */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-4 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-1">Nightly rate</p>
                {room.price_per_night > 0 ? (
                  <p>
                    <span className="text-3xl font-black text-blue-950">{formatPrice(room.price_per_night, room.currency || 'PKR')}</span>
                    <span className="text-gray-500 text-sm"> / night</span>
                  </p>
                ) : (
                  <p className="text-lg font-bold text-gray-700">Rate on enquiry</p>
                )}
              </div>

              <div className="flex items-center space-x-2 text-sm">
                <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full font-bold text-xs ${isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  <span>{isAvailable ? 'Available now' : 'Currently unavailable'}</span>
                </span>
              </div>

              <div className="border-t border-gray-100 pt-4 text-xs text-gray-600 space-y-1.5">
                <div className="flex justify-between"><span>Check-in</span><strong className="text-gray-900">{HOTEL_INFO.checkInTime}</strong></div>
                <div className="flex justify-between"><span>Check-out</span><strong className="text-gray-900">{HOTEL_INFO.checkOutTime}</strong></div>
                <div className="flex justify-between"><span>Payment</span><strong className="text-gray-900">Cash at reception</strong></div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleWhatsApp}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-full text-sm uppercase tracking-wider shadow-md hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer transition-colors"
                >
                  <i className="fab fa-whatsapp text-base"></i>
                  <span>Enquire to Book</span>
                </button>
                <Link
                  to="/rooms"
                  className="block w-full text-center text-xs text-gray-600 hover:text-hotel-primary font-semibold py-2 transition-colors"
                >
                  &larr; Back to all rooms
                </Link>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                Online booking is handled directly with our reception team. Send an enquiry and we will confirm availability and complete your reservation on WhatsApp.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Full-screen lightbox */}
      {lightbox !== null ? (
        <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4" onClick={closeLightbox} role="dialog" aria-modal="true" aria-label="Room photo viewer">
          <button onClick={closeLightbox} aria-label="Close viewer" className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer">
            <i className="fa fa-times text-xl"></i>
          </button>
          {gallery.length > 1 ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? i : (i - 1 + gallery.length) % gallery.length)); }}
                aria-label="Previous photo"
                className="absolute left-3 sm:left-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <i className="fa fa-chevron-left"></i>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? i : (i + 1) % gallery.length)); }}
                aria-label="Next photo"
                className="absolute right-3 sm:right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <i className="fa fa-chevron-right"></i>
              </button>
            </>
          ) : null}
          <img
            src={gallery[lightbox]}
            alt={`${room.title || room.room_number} — photo ${lightbox + 1} of ${gallery.length}`}
            className="max-w-full max-h-[85vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
            onError={(e: any) => { e.currentTarget.src = FALLBACK_IMG; }}
          />
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">
            {lightbox + 1} / {gallery.length}
          </div>
        </div>
      ) : null}
    </RoomShell>
  );
};
