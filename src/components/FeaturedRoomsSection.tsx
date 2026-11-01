import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RoomListing,
  fetchRoomCatalog,
  resolveRoomImageSrc,
} from '../services/apiService';
import { formatPrice } from '../lib/hotelFormat';
import { useScene, linesIn, fadeUpOnce } from '../motion/scene';
import { Lines } from './cinema/Lines';

// Featured Rooms — home scene, strictly DB-driven and PUBLISHED-only.
// Drafts are never requested here (the public /api/rooms endpoint already
// excludes them server-side). If no published rooms exist the whole scene
// renders nothing, rather than falling back to hardcoded/demo content.
// Presentation follows the cinema scene language; the data logic is unchanged.
const MAX_FEATURED = 6;

export const FeaturedRoomsSection: React.FC = () => {
  const root = useRef<HTMLElement>(null);
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

  // Scene motion: masked line reveal for the heading, one-time fades for the
  // intro and cards. Skipped entirely under reduced motion (useScene guard).
  useScene(root, ({ el }) => {
    linesIn(el.querySelectorAll('.fr-line-in'), el.querySelector('.fr-heading')!);
    fadeUpOnce(el.querySelectorAll('.fr-fade'));
    fadeUpOnce(el.querySelectorAll('.fr-card'), 'top 88%');
  }, [rooms.length]);

  if (loading) {
    return (
      <section id="featured" className="cinema bg-mist text-pine">
        <div className="mx-auto max-w-[1400px] px-5 py-28 sm:px-8">
          <div className="mb-14 max-w-3xl">
            <p className="t-small uppercase tracking-[0.18em] opacity-70">Handpicked For You</p>
            <h2 className="t-h2 mt-3">Featured Rooms &amp; Suites</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: MAX_FEATURED }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-pine/10 bg-pine/5 p-5">
                <div className="mb-4 h-52 w-full rounded-xl bg-pine/10" />
                <div className="h-4 w-2/3 rounded bg-pine/10" />
                <div className="mt-3 h-3 w-full rounded bg-pine/10" />
                <div className="mt-3 h-3 w-4/5 rounded bg-pine/10" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Nothing published (or a load error with no cached data): render no scene.
  if (error || rooms.length === 0) return null;

  return (
    <section
      ref={root}
      id="featured"
      data-nav="light"
      className="cinema bg-mist text-pine"
      aria-label="Featured rooms and suites"
    >
      <div className="mx-auto max-w-[1400px] px-5 pb-28 sm:px-8">
        {/* Scene top overlaps the availability scene above it (both sit on mist). */}
        <div className="fr-fade mb-14 max-w-3xl">
          <p className="t-small uppercase tracking-[0.18em] opacity-70">Handpicked For You</p>
          <h2 className="fr-heading t-h2 mt-3">
            <Lines lines={['Featured Rooms', '& Suites']} inner="fr-line-in" />
          </h2>
          <p className="t-lead mt-5 opacity-80">
            A selection of the rooms and suites at Red Rock Hotel. Browse every
            available option, view photos and details, then enquire directly to
            confirm your stay.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <article
              key={room.id}
              className="fr-card flex flex-col overflow-hidden rounded-2xl bg-white shadow-md"
            >
              <Link
                to={`/rooms/${encodeURIComponent(room.slug || room.room_number)}`}
                className="relative block h-52 w-full overflow-hidden bg-gray-100"
                aria-label={`View details for ${room.title || room.room_number}`}
              >
                <img
                  src={resolveRoomImageSrc(room.image_url) || '/images/room_suite_king.jpg'}
                  alt={room.title || `${room.room_number} — ${room.room_type || 'Room'}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] hover:scale-[1.03]"
                  onError={(e: any) => {
                    e.currentTarget.src = '/images/room_suite_king.jpg';
                  }}
                />
                {room.room_type ? (
                  <span className="absolute left-3 top-3 rounded-full bg-pine/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-mist shadow border border-white/20 backdrop-blur-sm">
                    {room.room_type}
                  </span>
                ) : null}
              </Link>

              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <h3 className="mb-1 text-lg font-bold text-pine">
                    {room.title || room.room_number}
                  </h3>
                  {room.short_description ? (
                    <p className="mb-3 text-sm leading-relaxed text-pine/70 line-clamp-2">
                      {room.short_description}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-pine/70">
                    {room.max_guests > 0 ? (
                      <span className="inline-flex items-center space-x-1.5">
                        <i className="fa fa-user-friends text-rock" aria-hidden="true"></i>
                        <span>Sleeps {room.max_guests}</span>
                      </span>
                    ) : null}
                    {room.bed_type ? (
                      <span className="inline-flex items-center space-x-1.5">
                        <i className="fa fa-bed text-rock" aria-hidden="true"></i>
                        <span className="truncate">{room.bed_type}</span>
                      </span>
                    ) : null}
                    {room.amenities && room.amenities.length > 0 ? (
                      <span className="inline-flex items-center space-x-1.5">
                        <i className="fa fa-check-circle text-pine/70" aria-hidden="true"></i>
                        <span>{room.amenities.length} amenities</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-pine/10 pt-4 text-sm">
                  <div>
                    {room.price_per_night > 0 ? (
                      <>
                        <span className="text-lg font-bold text-pine">
                          {formatPrice(room.price_per_night, room.currency || 'PKR')}
                        </span>
                        <span className="text-xs text-pine/60"> / night</span>
                      </>
                    ) : (
                      <span className="text-xs font-medium text-pine/60">Rate on enquiry</span>
                    )}
                  </div>
                  <Link
                    to={`/rooms/${encodeURIComponent(room.slug || room.room_number)}`}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-rock underline-offset-4 hover:underline"
                  >
                    <span>View Details</span>
                    <i className="fa fa-arrow-right" aria-hidden="true"></i>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="fr-fade mt-12 text-center">
          <Link to="/rooms" className="rr-btn">
            <i className="fa fa-th-large" aria-hidden="true"></i>
            <span>View All Rooms &amp; Suites</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
