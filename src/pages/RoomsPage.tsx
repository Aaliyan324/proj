import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { RoomShell } from '../components/RoomShell';
import { Reveal } from '../lib/Reveal';
import {
  RoomListing,
  RoomFacets,
  fetchRoomCatalog,
  fetchRoomFacets,
  resolveRoomImageSrc,
} from '../services/apiService';
import { formatPrice } from '../lib/hotelFormat';
import { applySeo, resetSeoToDefault } from '../lib/seo';

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name: A to Z' },
];

const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
    <div className="h-52 bg-gray-200 animate-pulse" />
    <div className="p-5 space-y-3">
      <div className="h-5 w-2/3 bg-gray-200 rounded animate-pulse" />
      <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
      <div className="h-3 w-4/5 bg-gray-100 rounded animate-pulse" />
      <div className="flex justify-between items-center pt-2">
        <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  </div>
);

const RoomCard: React.FC<{ room: RoomListing }> = ({ room }) => {
  const slug = encodeURIComponent(room.slug || room.room_number);
  return (
    <article className="card-hover-elevate bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl duration-300 border border-gray-100 flex flex-col group">
      <Link
        to={`/rooms/${slug}`}
        className="block h-52 w-full relative overflow-hidden bg-gray-100"
        aria-label={`View details for ${room.title || room.room_number}`}
      >
        <img
          src={resolveRoomImageSrc(room.image_url) || '/images/room_suite_king.jpg'}
          alt={room.title || `${room.room_number} — ${room.room_type || 'Room'}`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e: any) => { e.currentTarget.src = '/images/room_suite_king.jpg'; }}
        />
        {room.room_type ? (
          <span className="absolute top-3 left-3 bg-blue-950/90 backdrop-blur-sm text-white font-semibold text-[11px] px-3 py-1 rounded-full shadow border border-white/20 uppercase tracking-wider">
            {room.room_type}
          </span>
        ) : null}
        {room.is_available === 1 || room.is_available === true ? (
          <span className="absolute top-3 right-3 bg-emerald-600/95 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1 rounded-full shadow flex items-center space-x-1.5 border border-emerald-400/40">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            <span>Available</span>
          </span>
        ) : null}
      </Link>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-hotel-primary transition-colors mb-1">
            {room.title || room.room_number}
          </h3>
          {room.short_description ? (
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-3">{room.short_description}</p>
          ) : null}

          {room.amenities && room.amenities.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {room.amenities.slice(0, 4).map((a) => (
                <span key={a} className="text-[11px] bg-gray-50 border border-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {a}
                </span>
              ))}
              {room.amenities.length > 4 ? (
                <span className="text-[11px] text-gray-500 px-1 py-0.5">+{room.amenities.length - 4}</span>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
            {room.max_guests > 0 ? (
              <span className="inline-flex items-center space-x-1.5">
                <i className="fa fa-user-friends text-hotel-primary" aria-hidden="true"></i>
                <span>Sleeps {room.max_guests}</span>
              </span>
            ) : null}
            {room.bed_type ? (
              <span className="inline-flex items-center space-x-1.5">
                <i className="fa fa-bed text-hotel-primary" aria-hidden="true"></i>
                <span>{room.bed_type}</span>
              </span>
            ) : null}
            {room.room_size ? (
              <span className="inline-flex items-center space-x-1.5">
                <i className="fa fa-ruler-combined text-hotel-primary" aria-hidden="true"></i>
                <span>{room.room_size}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-sm">
            {room.price_per_night > 0 ? (
              <>
                <span className="font-extrabold text-blue-950 text-lg">{formatPrice(room.price_per_night, room.currency || 'PKR')}</span>
                <span className="text-gray-500 text-xs"> / night</span>
              </>
            ) : (
              <span className="text-gray-500 text-xs font-medium">Rate on enquiry</span>
            )}
          </div>
          <Link
            to={`/rooms/${slug}`}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-hotel-primary hover:text-blue-900 transition-colors"
          >
            <span>View Details</span>
            <i className="fa fa-arrow-right" aria-hidden="true"></i>
          </Link>
        </div>
      </div>
    </article>
  );
};

export const RoomsPage: React.FC = () => {
  const [facets, setFacets] = useState<RoomFacets>({ categories: [], priceBounds: { min: 0, max: 0 }, maxGuests: 0 });
  const [category, setCategory] = useState('');
  const [guests, setGuests] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState('featured');

  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applySeo({
      title: 'Rooms & Suites — Red Rock Hotel',
      description: 'Browse the rooms and suites at Red Rock Hotel: filter by category, capacity and price, view photos and amenities, then enquire directly to book your stay.',
      canonicalPath: '/rooms',
    });
    return () => resetSeoToDefault('Red Rock Hotel');
  }, []);

  useEffect(() => {
    fetchRoomFacets().then(setFacets).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRoomCatalog({ category, guests, minPrice, maxPrice, availableOnly, sort });
      // Defense in depth: the public endpoint already hides drafts, but never
      // render a non-published room even if an admin session is active.
      setRooms(data.filter((r) => r.publish_status === 'published'));
    } catch {
      setError('We could not load the rooms right now. Please try again.');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [category, guests, minPrice, maxPrice, availableOnly, sort]);

  useEffect(() => { load(); }, [load]);

  const resetFilters = () => {
    setCategory(''); setGuests(''); setMinPrice(''); setMaxPrice(''); setAvailableOnly(false); setSort('featured');
  };

  const hasActiveFilters = Boolean(category || guests || minPrice || maxPrice || availableOnly);

  const guestOptions = Array.from({ length: Math.max(facets.maxGuests, 4) }, (_, i) => i + 1);

  return (
    <RoomShell>
      {/* Page header */}
      <section className="bg-blue-950 text-white py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <Reveal y={20}>
            <p className="text-amber-400 uppercase tracking-widest text-xs font-bold mb-2">Red Rock Hotel</p>
            <h1 className="text-3xl lg:text-5xl font-black tracking-tight">Rooms &amp; Suites</h1>
            <p className="text-blue-200 mt-3 max-w-2xl text-sm lg:text-base">
              Explore every published room at Red Rock Hotel. Filter by category, capacity and price, open any room for photos and full details, then enquire directly with reception to confirm your stay.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Filter panel */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 -mt-6">
        <Reveal y={16} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 lg:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 outline-none text-sm bg-white">
                <option value="">All categories</option>
                {facets.categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Guests</label>
              <select value={guests} onChange={(e) => setGuests(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 outline-none text-sm bg-white">
                <option value="">Any capacity</option>
                {guestOptions.map((g) => <option key={g} value={g}>{g}+ guest{g > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Min price</label>
                <input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 outline-none text-sm" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Max price</label>
                <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Any" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Sort by</label>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 outline-none text-sm bg-white">
                {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center space-x-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-hotel-primary focus:ring-amber-300"
              />
              <span>Show available rooms only</span>
            </label>
            {hasActiveFilters && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">{loading ? 'Filtering…' : `${rooms.length} room${rooms.length === 1 ? '' : 's'}`}</span>
                <button onClick={resetFilters} className="text-sm font-bold text-blue-900 hover:text-amber-600 cursor-pointer">
                  <i className="fa fa-rotate-left me-1.5"></i>Clear filters
                </button>
              </div>
            )}
          </div>
        </Reveal>
      </section>

      {/* Results */}
      <section ref={gridRef} className="max-w-7xl mx-auto px-4 lg:px-8 py-10 lg:py-12">
        {error ? (
          <div className="text-center py-20">
            <i className="fa fa-triangle-exclamation text-4xl text-amber-500 mb-4"></i>
            <p className="text-gray-700 font-semibold">{error}</p>
            <button onClick={load} className="mt-4 bg-blue-950 text-white px-5 py-2.5 rounded-full text-sm font-bold cursor-pointer hover:bg-blue-900">Retry</button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20">
            <i className="fa fa-bed text-5xl text-gray-300 mb-4"></i>
            <h2 className="text-xl font-black text-blue-950">No rooms match your filters</h2>
            <p className="text-gray-500 mt-2 text-sm">Try adjusting or clearing your filters.</p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="mt-5 bg-amber-400 text-blue-950 px-5 py-2.5 rounded-full text-sm font-bold cursor-pointer hover:bg-amber-300">Clear filters</button>
            )}
          </div>
        ) : (
          <Reveal stagger={0.08} y={24} as="div">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => <RoomCard key={room.id} room={room} />)}
            </div>
          </Reveal>
        )}
      </section>
    </RoomShell>
  );
};
