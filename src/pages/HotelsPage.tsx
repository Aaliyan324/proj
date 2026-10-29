import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HotelShell } from '../components/hotel/HotelShell';
import { HotelCard } from '../components/hotel/HotelCard';
import { Reveal } from '../lib/Reveal';
import {
  HotelListing,
  HotelPagination,
  fetchHotels,
  fetchHotelFacets,
} from '../services/apiService';
import { applySeo, resetSeoToDefault } from '../lib/seo';

const FACILITY_OPTIONS = [
  'Wi-Fi', 'Swimming pool', 'Parking', 'Restaurant', 'Air conditioning',
  'Gym', 'Room service', 'Airport shuttle', 'Family rooms', 'Conference facilities',
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name: A to Z' },
];

const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
    <div className="aspect-[16/10] bg-gray-200 animate-pulse" />
    <div className="p-5 space-y-3">
      <div className="h-5 w-2/3 bg-gray-200 rounded animate-pulse" />
      <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
      <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
      <div className="flex justify-between items-end pt-4">
        <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-9 w-28 bg-gray-200 rounded-full animate-pulse" />
      </div>
    </div>
  </div>
);

export const HotelsPage: React.FC = () => {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [facility, setFacility] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const [hotels, setHotels] = useState<HotelListing[]>([]);
  const [pagination, setPagination] = useState<HotelPagination>({ page: 1, pageSize: 12, total: 0, totalPages: 1 });
  const [facets, setFacets] = useState<{ cities: string[]; categories: string[] }>({ cities: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  // Debounce the free-text search.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    applySeo({
      title: 'Hotels & Resorts — Grand Travela',
      description: 'Browse verified hotel listings: compare locations, facilities and starting nightly prices, then open any hotel for full details and photos.',
      canonicalPath: '/hotels',
    });
    return () => resetSeoToDefault('Grand Travela — Hotel & Resort');
  }, []);

  useEffect(() => {
    fetchHotelFacets().then((f) => setFacets({ cities: f.cities, categories: f.categories })).catch(() => {});
  }, []);

  // Any filter change resets to page 1.
  const filtersChanged = useRef(false);
  useEffect(() => {
    if (filtersChanged.current) setPage(1);
    filtersChanged.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, city, category, facility, minPrice, maxPrice, sort]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchHotels({ q: debouncedQ, city, category, facility, minPrice, maxPrice, sort, page, pageSize: 12 });
      setHotels(res.hotels);
      setPagination(res.pagination);
    } catch {
      setError('We could not load hotels right now. Please try again.');
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, city, category, facility, minPrice, maxPrice, sort, page]);

  useEffect(() => { load(); }, [load]);

  const resetFilters = () => {
    setQ(''); setDebouncedQ(''); setCity(''); setCategory(''); setFacility('');
    setMinPrice(''); setMaxPrice(''); setSort('newest'); setPage(1);
  };

  const goToPage = (p: number) => {
    setPage(Math.min(Math.max(p, 1), pagination.totalPages));
    if (gridRef.current) gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const hasActiveFilters = Boolean(debouncedQ || city || category || facility || minPrice || maxPrice);

  return (
    <HotelShell>
      {/* Page header */}
      <section className="bg-blue-950 text-white py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <Reveal y={20}>
            <p className="text-amber-400 uppercase tracking-widest text-xs font-bold mb-2">Hotel Directory</p>
            <h1 className="text-3xl lg:text-5xl font-black tracking-tight">Find Your Next Stay</h1>
            <p className="text-blue-200 mt-3 max-w-2xl text-sm lg:text-base">
              Explore published hotel listings. Compare locations, facilities and starting nightly prices, then open any hotel for photos and full details.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Filter panel */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 -mt-6">
        <Reveal y={16} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 lg:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Search</label>
              <div className="relative">
                <i className="fa fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Hotel name, city or area"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">City</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 outline-none text-sm bg-white">
                <option value="">All cities</option>
                {facets.cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 outline-none text-sm bg-white">
                <option value="">All categories</option>
                {facets.categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Facility</label>
              <select value={facility} onChange={(e) => setFacility(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-amber-400 outline-none text-sm bg-white">
                <option value="">Any facility</option>
                {FACILITY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
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
          {hasActiveFilters && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">{pagination.total} result{pagination.total === 1 ? '' : 's'}</span>
              <button onClick={resetFilters} className="text-sm font-bold text-blue-900 hover:text-amber-600 cursor-pointer">
                <i className="fa fa-rotate-left me-1.5"></i>Clear filters
              </button>
            </div>
          )}
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
        ) : hotels.length === 0 ? (
          <div className="text-center py-20">
            <i className="fa fa-bed text-5xl text-gray-300 mb-4"></i>
            <h2 className="text-xl font-black text-blue-950">No hotels match your search</h2>
            <p className="text-gray-500 mt-2 text-sm">Try adjusting or clearing your filters.</p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="mt-5 bg-amber-400 text-blue-950 px-5 py-2.5 rounded-full text-sm font-bold cursor-pointer hover:bg-amber-300">Clear filters</button>
            )}
          </div>
        ) : (
          <>
            <Reveal stagger={0.08} y={24}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {hotels.map((h) => <HotelCard key={h.id} hotel={h} />)}
              </div>
            </Reveal>

            {pagination.totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <button
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-4 py-2 rounded-full border border-gray-300 text-sm font-bold text-blue-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-50 cursor-pointer"
                >
                  <i className="fa fa-arrow-left me-1.5"></i>Prev
                </button>
                <span className="px-4 py-2 text-sm text-gray-600 font-semibold">Page {pagination.page} of {pagination.totalPages}</span>
                <button
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-4 py-2 rounded-full border border-gray-300 text-sm font-bold text-blue-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-50 cursor-pointer"
                >
                  Next<i className="fa fa-arrow-right ms-1.5"></i>
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </HotelShell>
  );
};
