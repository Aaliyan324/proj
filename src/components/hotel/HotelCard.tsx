import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HotelListing, hotelImageUrl } from '../../services/apiService';
import { formatPrice, Stars } from '../../lib/hotelFormat';

const FACILITY_ICONS: Record<string, string> = {
  'wi-fi': 'fa-wifi',
  'wifi': 'fa-wifi',
  'swimming pool': 'fa-water',
  'pool': 'fa-water',
  'parking': 'fa-square-full',
  'restaurant': 'fa-utensils',
  'air conditioning': 'fa-snowflake',
  'gym': 'fa-dumbbell',
  'room service': 'fa-concierge-bell',
  'airport shuttle': 'fa-plane',
  'family rooms': 'fa-users',
  'conference facilities': 'fa-briefcase',
};

function facilityIcon(name: string): string {
  return FACILITY_ICONS[name.toLowerCase()] || 'fa-check';
}

export const HotelCard: React.FC<{ hotel: HotelListing }> = ({ hotel }) => {
  const navigate = useNavigate();
  const coverSrc = hotelImageUrl(hotel.cover_image_id);
  const shownFacilities = (hotel.facilities || []).slice(0, 4);

  const location = [hotel.city, hotel.country].filter(Boolean).join(', ');

  return (
    <article className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Cover image (private delivery route) */}
      <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={hotel.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <i className="fa fa-hotel text-4xl"></i>
          </div>
        )}
        {hotel.star_rating > 0 && (
          <div className="absolute top-3 right-3 bg-blue-950/85 backdrop-blur px-2.5 py-1 rounded-full border border-amber-400/40">
            <Stars count={hotel.star_rating} />
          </div>
        )}
        {hotel.category && (
          <div className="absolute bottom-3 left-3 bg-amber-400 text-blue-950 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">
            {hotel.category}
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5">
        <h3 className="text-lg font-black text-blue-950 leading-snug line-clamp-1">{hotel.name}</h3>
        {location && (
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
            <i className="fa fa-map-marker-alt text-amber-500"></i>
            <span className="truncate">{location}</span>
          </p>
        )}

        {hotel.short_description && (
          <p className="text-sm text-gray-600 mt-3 line-clamp-2">{hotel.short_description}</p>
        )}

        {shownFacilities.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-xs text-gray-600">
            {shownFacilities.map((f) => (
              <li key={f} className="inline-flex items-center gap-1.5">
                <i className={`fa ${facilityIcon(f)} text-blue-800`}></i>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-5 flex items-end justify-between">
          <div>
            {hotel.discount_price != null && hotel.discount_price > 0 ? (
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-gray-400 line-through">{formatPrice(hotel.price_per_night, hotel.currency)}</span>
                <span className="text-lg font-black text-emerald-600">{formatPrice(hotel.discount_price, hotel.currency)}</span>
              </div>
            ) : (
              <span className="text-lg font-black text-blue-950">{formatPrice(hotel.price_per_night, hotel.currency)}</span>
            )}
            <span className="text-[11px] text-gray-500 block">starting / night</span>
          </div>
          <button
            onClick={() => navigate(`/hotels/${hotel.slug}`)}
            className="bg-blue-950 hover:bg-blue-900 text-white text-sm font-bold px-4 py-2.5 rounded-full transition-all group-hover:bg-amber-400 group-hover:text-blue-950 cursor-pointer whitespace-nowrap"
          >
            View Hotel<i className="fa fa-arrow-right ms-2"></i>
          </button>
        </div>
      </div>
    </article>
  );
};
