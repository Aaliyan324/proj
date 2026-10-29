import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HotelShell } from '../components/hotel/HotelShell';
import { HotelCard } from '../components/hotel/HotelCard';
import { HotelImageGallery } from '../components/hotel/HotelImageGallery';
import { Reveal } from '../lib/Reveal';
import {
  HotelListing,
  HotelImage,
  fetchHotelBySlug,
  fetchRelatedHotels,
  fetchSettings,
  hotelImageUrl,
} from '../services/apiService';
import { formatPrice, Stars } from '../lib/hotelFormat';
import { applySeo, resetSeoToDefault } from '../lib/seo';

const FACILITY_ICONS: Record<string, string> = {
  'wi-fi': 'fa-wifi', wifi: 'fa-wifi', 'swimming pool': 'fa-water', pool: 'fa-water',
  parking: 'fa-square-full', restaurant: 'fa-utensils', 'air conditioning': 'fa-snowflake',
  gym: 'fa-dumbbell', 'room service': 'fa-concierge-bell', 'airport shuttle': 'fa-plane',
  'family rooms': 'fa-users', 'conference facilities': 'fa-briefcase',
};
const facilityIcon = (n: string) => FACILITY_ICONS[n.toLowerCase()] || 'fa-check';

function normalizePhone(p: string): string {
  return String(p || '').replace(/[^0-9]/g, '');
}

export const HotelDetailPage: React.FC = () => {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<HotelListing | null>(null);
  const [images, setImages] = useState<HotelImage[]>([]);
  const [related, setRelated] = useState<HotelListing[]>([]);
  const [globalWhatsapp, setGlobalWhatsapp] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    (async () => {
      try {
        const detail = await fetchHotelBySlug(slug);
        if (!alive) return;
        if (!detail) { setStatus('notfound'); return; }
        setHotel(detail.hotel);
        setImages(detail.images);
        setStatus('ready');
        const [rel, settings] = await Promise.all([fetchRelatedHotels(slug), fetchSettings()]);
        if (!alive) return;
        setRelated(rel);
        setGlobalWhatsapp(settings.whatsapp_number);
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  // Runtime SEO built only from verified fields.
  useEffect(() => {
    if (!hotel) return;
    const coverId = hotel.cover_image_id || images.find((i) => i.role === 'cover')?.id || images[0]?.id;
    const description = hotel.short_description || (hotel.description ? hotel.description.slice(0, 160) : '');
    const structured: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Hotel',
      name: hotel.name,
    };
    if (description) structured.description = description;
    if (hotel.address || hotel.city) {
      structured.address = {
        '@type': 'PostalAddress',
        streetAddress: hotel.address || undefined,
        addressLocality: hotel.city || undefined,
        addressCountry: hotel.country || undefined,
      };
    }
    if (hotel.star_rating > 0) structured.starRating = { '@type': 'Rating', value: hotel.star_rating };
    if (hotel.price_per_night > 0) {
      structured.priceRange = `${hotel.currency} ${hotel.price_per_night}`;
    }
    const phone = normalizePhone(hotel.contact_phone);
    if (phone) structured.telephone = hotel.contact_phone;
    applySeo({
      title: `${hotel.name} — ${[hotel.city, hotel.country].filter(Boolean).join(', ') || 'Hotel Detail'}`,
      description,
      canonicalPath: `/hotels/${hotel.slug}`,
      imageUrl: coverId ? hotelImageUrl(coverId) : undefined,
      type: 'website',
      structuredData: structured,
    });
    return () => resetSeoToDefault('Grand Travela — Hotel & Resort');
  }, [hotel, images]);

  const inquiryLink = useMemo(() => {
    if (!hotel) return '#';
    const msg = encodeURIComponent(`Hello, I would like to inquire about staying at ${hotel.name}. Please share availability and details.`);
    const number = normalizePhone(hotel.contact_phone) || normalizePhone(globalWhatsapp);
    if (number) return `https://wa.me/${number}?text=${msg}`;
    if (hotel.contact_email) return `mailto:${hotel.contact_email}?subject=${encodeURIComponent(`Inquiry: ${hotel.name}`)}`;
    return '#';
  }, [hotel, globalWhatsapp]);

  if (status === 'loading') {
    return (
      <HotelShell>
        <div className="max-w-5xl mx-auto px-4 lg:px-8 py-16 space-y-6">
          <div className="h-72 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-8 w-1/2 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
        </div>
      </HotelShell>
    );
  }

  if (status === 'notfound' || status === 'error' || !hotel) {
    return (
      <HotelShell>
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <i className="fa fa-hotel text-5xl text-gray-300 mb-4"></i>
          <h1 className="text-2xl lg:text-3xl font-black text-blue-950">Hotel not found</h1>
          <p className="text-gray-500 mt-3 text-sm">
            {status === 'error'
              ? 'We could not load this hotel right now. Please try again later.'
              : 'This hotel does not exist or is not currently published.'}
          </p>
          <button onClick={() => navigate('/hotels')} className="mt-6 bg-blue-950 text-white px-5 py-2.5 rounded-full text-sm font-bold cursor-pointer hover:bg-blue-900">
            <i className="fa fa-arrow-left me-1.5"></i>Back to hotels
          </button>
        </div>
      </HotelShell>
    );
  }

  const coverId = hotel.cover_image_id || images.find((i) => i.role === 'cover')?.id || images[0]?.id;
  const location = [hotel.area, hotel.city, hotel.country].filter(Boolean).join(', ');

  return (
    <HotelShell>
      {/* Hero */}
      <section className="relative">
        <div className="relative h-[42vh] min-h-[300px] lg:h-[55vh] bg-blue-950 overflow-hidden">
          {coverId ? (
            <img src={hotelImageUrl(coverId)} alt={hotel.name} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.25'; }} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/30"><i className="fa fa-hotel text-6xl"></i></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="relative h-full max-w-7xl mx-auto px-4 lg:px-8 flex flex-col justify-end pb-8 lg:pb-12">
            <Reveal y={20}>
              <div className="flex items-center gap-2 mb-2">
                {hotel.category && <span className="bg-amber-400 text-blue-950 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">{hotel.category}</span>}
                {hotel.star_rating > 0 && <span className="bg-blue-950/70 border border-amber-400/40 px-2.5 py-1 rounded-full"><Stars count={hotel.star_rating} /></span>}
              </div>
              <h1 className="text-3xl lg:text-5xl font-black text-white tracking-tight">{hotel.name}</h1>
              {location && <p className="text-blue-100 mt-2 text-sm lg:text-base"><i className="fa fa-map-marker-alt text-amber-400 me-2"></i>{location}</p>}
            </Reveal>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Main */}
          <div className="lg:col-span-2 space-y-10">
            <section>
              <h2 className="text-xl font-black text-blue-950 mb-4">Overview</h2>
              {hotel.description ? (
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{hotel.description}</p>
              ) : hotel.short_description ? (
                <p className="text-gray-700 leading-relaxed">{hotel.short_description}</p>
              ) : (
                <p className="text-gray-400 text-sm italic">No description has been provided for this hotel yet.</p>
              )}
            </section>

            <section>
              <h2 className="text-xl font-black text-blue-950 mb-4">Photos</h2>
              <HotelImageGallery images={images} hotelName={hotel.name} />
            </section>

            {hotel.facilities?.length > 0 && (
              <section>
                <h2 className="text-xl font-black text-blue-950 mb-4">Facilities</h2>
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {hotel.facilities.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3.5 py-3 text-sm text-gray-700 border border-gray-100">
                      <i className={`fa ${facilityIcon(f)} text-blue-800`}></i>{f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Contact — only rendered from fields that actually exist. */}
            {(hotel.address || hotel.contact_phone || hotel.contact_email || hotel.website) && (
              <section>
                <h2 className="text-xl font-black text-blue-950 mb-4">Location &amp; Contact</h2>
                <div className="space-y-2.5 text-sm text-gray-700">
                  {hotel.address && <p className="flex gap-2.5"><i className="fa fa-location-dot text-blue-800 mt-0.5"></i><span>{[hotel.address, hotel.area, hotel.city, hotel.country].filter(Boolean).join(', ')}</span></p>}
                  {hotel.latitude != null && hotel.longitude != null && (
                    <p className="flex gap-2.5"><i className="fa fa-crosshairs text-blue-800 mt-0.5"></i><span>{hotel.latitude}, {hotel.longitude}</span></p>
                  )}
                  {hotel.contact_phone && <p className="flex gap-2.5"><i className="fa fa-phone text-blue-800 mt-0.5"></i><a className="hover:text-blue-900" href={`tel:${hotel.contact_phone}`}>{hotel.contact_phone}</a></p>}
                  {hotel.contact_email && <p className="flex gap-2.5"><i className="fa fa-envelope text-blue-800 mt-0.5"></i><a className="hover:text-blue-900 break-all" href={`mailto:${hotel.contact_email}`}>{hotel.contact_email}</a></p>}
                  {hotel.website && <p className="flex gap-2.5"><i className="fa fa-globe text-blue-800 mt-0.5"></i><a className="hover:text-blue-900 break-all" href={hotel.website} target="_blank" rel="noopener noreferrer">{hotel.website}</a></p>}
                </div>
              </section>
            )}
          </div>

          {/* Booking / inquiry panel */}
          <aside className="lg:col-span-1">
            <div className="sticky top-6 bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Starting from</p>
              {hotel.discount_price != null && hotel.discount_price > 0 ? (
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-sm text-gray-400 line-through">{formatPrice(hotel.price_per_night, hotel.currency)}</span>
                  <span className="text-3xl font-black text-emerald-600">{formatPrice(hotel.discount_price, hotel.currency)}</span>
                </div>
              ) : (
                <p className="text-3xl font-black text-blue-950 mt-1">{formatPrice(hotel.price_per_night, hotel.currency)}</p>
              )}
              <p className="text-xs text-gray-500 mb-5">per night (lowest available rate)</p>

              <a
                href={inquiryLink}
                target={inquiryLink.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className="block w-full text-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3 rounded-full transition-colors"
              >
                <i className="fab fa-whatsapp me-2"></i>Inquire about this hotel
              </a>
              <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
                Enquiries are sent directly to the hotel. Availability and final pricing are confirmed by the property.
              </p>
            </div>
          </aside>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-black text-blue-950 mb-6">More hotels to explore</h2>
            <Reveal stagger={0.08} y={24}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {related.map((h) => <HotelCard key={h.id} hotel={h} />)}
              </div>
            </Reveal>
          </section>
        )}
      </div>
    </HotelShell>
  );
};
