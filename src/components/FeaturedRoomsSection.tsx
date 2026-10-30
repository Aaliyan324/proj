import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RoomListing,
  fetchRoomCatalog,
  resolveRoomImageSrc,
} from '../services/apiService';
import { Reveal } from '../lib/Reveal';
import { formatPrice } from '../lib/hotelFormat';

// Featured Rooms — home section, strictly DB-driven and PUBLISHED-only.
// Drafts are never requested here (the public /api/rooms endpoint already
// excludes them server-side). If no published rooms exist the whole section
// renders nothing, rather than falling back to hardcoded/demo content.
const MAX_FEATURED = 6;

export const FeaturedRoomsSection: React.FC = () => {
  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchRoomCatalog({ sort: 'featured' });
        if (!alive) return;
        // Defensive: only ever show published rooms on the public home page.
        setRooms(data.filter((r) => r.publish_status === 'published').slice(0, MAX_FEATURED));
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <section id="featured" className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h5 className="text-sm lg:text-base font-bold text-hotel-primary uppercase tracking-widest">
              Handpicked For You
            </h5>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-blue-950 mt-3 mb-4">
              Featured Rooms &amp; Suites
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: MAX_FEATURED }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-gray-50 animate-pulse">
                <div className="h-52 w-full bg-gray-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-2/3 bg-gray-200 rounded" />
                  <div className="h-3 w-full bg-gray-200 rounded" />
                  <div className="h-3 w-4/5 bg-gray-200 rounded" />
                  <div className="h-8 w-1/2 bg-gray-200 rounded-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Nothing published (or a load error with no cached data): render no section.
  if (error || rooms.length === 0) return null;

  return (
    <section id="featured" className="py-20 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 lg:px-12">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h5 className="text-sm lg:text-base font-bold text-hotel-primary uppercase tracking-widest">
              Handpicked For You
            </h5>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-blue-950 mt-3 mb-4">
              Featured Rooms &amp; Suites
            </h2>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              A selection of the rooms and suites at Red Rock Hotel. Browse every
              available option, view photos and details, then enquire directly to
              confirm your stay.
            </p>
          </div>
        </Reveal>

        <Reveal stagger={0.08} as="div" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <article
              key={room.id}
              className="card-hover-elevate bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl duration-300 border border-gray-100 flex flex-col group"
            >
              <Link
                to={`/rooms/${encodeURIComponent(room.slug || room.room_number)}`}
                className="block h-52 w-full relative overflow-hidden bg-gray-100"
                aria-label={`View details for ${room.title || room.room_number}`}
              >
                <img
                  src={resolveRoomImageSrc(room.image_url) || '/images/room_suite_king.jpg'}
                  alt={room.title || `${room.room_number} — ${room.room_type || 'Room'}`}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e: any) => {
                    e.currentTarget.src = '/images/room_suite_king.jpg';
                  }}
                />
                {room.room_type ? (
                  <span className="absolute top-3 left-3 bg-blue-950/90 backdrop-blur-sm text-white font-semibold text-[11px] px-3 py-1 rounded-full shadow border border-white/20 uppercase tracking-wider">
                    {room.room_type}
                  </span>
                ) : null}
              </Link>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-hotel-primary transition-colors mb-1">
                    {room.title || room.room_number}
                  </h3>
                  {room.short_description ? (
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-3">
                      {room.short_description}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-600">
                    {room.max_guests > 0 ? (
                      <span className="inline-flex items-center space-x-1.5">
                        <i className="fa fa-user-friends text-hotel-primary" aria-hidden="true"></i>
                        <span>Sleeps {room.max_guests}</span>
                      </span>
                    ) : null}
                    {room.bed_type ? (
                      <span className="inline-flex items-center space-x-1.5">
                        <i className="fa fa-bed text-hotel-primary" aria-hidden="true"></i>
                        <span className="truncate">{room.bed_type}</span>
                      </span>
                    ) : null}
                    {room.amenities && room.amenities.length > 0 ? (
                      <span className="inline-flex items-center space-x-1.5">
                        <i className="fa fa-check-circle text-emerald-600" aria-hidden="true"></i>
                        <span>{room.amenities.length} amenities</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-sm">
                    {room.price_per_night > 0 ? (
                      <>
                        <span className="font-extrabold text-blue-950 text-lg">
                          {formatPrice(room.price_per_night, room.currency || 'PKR')}
                        </span>
                        <span className="text-gray-500 text-xs"> / night</span>
                      </>
                    ) : (
                      <span className="text-gray-500 text-xs font-medium">Rate on enquiry</span>
                    )}
                  </div>
                  <Link
                    to={`/rooms/${encodeURIComponent(room.slug || room.room_number)}`}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-hotel-primary hover:text-blue-900 transition-colors"
                  >
                    <span>View Details</span>
                    <i className="fa fa-arrow-right" aria-hidden="true"></i>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </Reveal>

        <div className="text-center mt-12">
          <Link
            to="/rooms"
            className="inline-flex items-center space-x-2 bg-hotel-primary hover:bg-blue-900 text-white font-bold text-sm px-8 py-3.5 rounded-full shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            <i className="fa fa-th-large" aria-hidden="true"></i>
            <span>View All Rooms &amp; Suites</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
