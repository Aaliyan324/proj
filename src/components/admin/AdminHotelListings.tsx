import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  HotelListing,
  HotelImage,
  HotelPayload,
  HotelPagination,
  fetchAdminHotels,
  fetchAdminHotel,
  addHotel,
  updateHotel,
  publishHotel,
  unpublishHotel,
  archiveHotel,
  deleteHotel,
  uploadHotelImage,
  reorderHotelImages,
  deleteHotelImage,
  hotelImageUrl,
} from '../../services/apiService';

const FACILITY_OPTIONS = [
  'Wi-Fi', 'Swimming pool', 'Parking', 'Restaurant', 'Air conditioning',
  'Gym', 'Room service', 'Airport shuttle', 'Family rooms', 'Conference facilities',
];

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  archived: 'bg-amber-100 text-amber-800 border-amber-300',
};

interface FormState {
  name: string;
  shortDescription: string;
  description: string;
  category: string;
  starRating: number;
  country: string;
  city: string;
  area: string;
  address: string;
  latitude: string;
  longitude: string;
  pricePerNight: string;
  currency: string;
  discountPrice: string;
  facilities: string[];
  contactPhone: string;
  contactEmail: string;
  website: string;
}

const EMPTY_FORM: FormState = {
  name: '', shortDescription: '', description: '', category: '', starRating: 0,
  country: '', city: '', area: '', address: '', latitude: '', longitude: '',
  pricePerNight: '', currency: 'PKR', discountPrice: '', facilities: [],
  contactPhone: '', contactEmail: '', website: '',
};

type Toast = { message: string; type: 'success' | 'error' } | null;

export const AdminHotelListings: React.FC = () => {
  // ---- list state ----
  const [hotels, setHotels] = useState<HotelListing[]>([]);
  const [pagination, setPagination] = useState<HotelPagination>({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [listLoading, setListLoading] = useState(true);
  const [listQ, setListQ] = useState('');
  const [listStatus, setListStatus] = useState('');
  const [listSort, setListSort] = useState('newest');
  const [page, setPage] = useState(1);

  // ---- view: list vs form ----
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // ---- images ----
  const [images, setImages] = useState<HotelImage[]>([]);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<Toast>(null);
  const [confirmDelete, setConfirmDelete] = useState<HotelListing | null>(null);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  };

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetchAdminHotels({ q: listQ, status: listStatus, sort: listSort, page, pageSize: 20 });
      setHotels(res.hotels);
      setPagination(res.pagination);
    } catch {
      notify('Failed to load hotel listings.', 'error');
    } finally {
      setListLoading(false);
    }
  }, [listQ, listStatus, listSort, page]);

  useEffect(() => { loadList(); }, [loadList]);

  // ---------- form helpers ----------
  const openAdd = () => {
    setForm(EMPTY_FORM); setErrors({}); setImages([]);
    setEditingId(null); setView('form');
  };

  const openEdit = async (id: string) => {
    const detail = await fetchAdminHotel(id);
    if (!detail) { notify('Could not load this hotel.', 'error'); return; }
    const h = detail.hotel;
    setForm({
      name: h.name || '', shortDescription: h.short_description || '', description: h.description || '',
      category: h.category || '', starRating: h.star_rating || 0, country: h.country || '', city: h.city || '',
      area: h.area || '', address: h.address || '', latitude: h.latitude != null ? String(h.latitude) : '',
      longitude: h.longitude != null ? String(h.longitude) : '', pricePerNight: String(h.price_per_night ?? ''),
      currency: h.currency || 'PKR', discountPrice: h.discount_price != null ? String(h.discount_price) : '',
      facilities: h.facilities || [], contactPhone: h.contact_phone || '', contactEmail: h.contact_email || '', website: h.website || '',
    });
    setImages(detail.images);
    setErrors({}); setEditingId(id); setView('form');
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleFacility = (fac: string) =>
    setForm((f) => ({ ...f, facilities: f.facilities.includes(fac) ? f.facilities.filter((x) => x !== fac) : [...f.facilities, fac] }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Hotel name is required.';
    if (!form.country.trim()) e.country = 'Country is required.';
    if (!form.city.trim()) e.city = 'City is required.';
    const price = Number(form.pricePerNight);
    if (form.pricePerNight === '' || !Number.isFinite(price) || price < 0) e.pricePerNight = 'Enter a valid, non-negative price.';
    if (form.discountPrice !== '') {
      const d = Number(form.discountPrice);
      if (!Number.isFinite(d) || d < 0) e.discountPrice = 'Discount must be a valid non-negative number.';
    }
    if (form.latitude !== '' && (Number.isNaN(Number(form.latitude)) || Number(form.latitude) < -90 || Number(form.latitude) > 90)) e.latitude = 'Latitude must be -90..90.';
    if (form.longitude !== '' && (Number.isNaN(Number(form.longitude)) || Number(form.longitude) < -180 || Number(form.longitude) > 180)) e.longitude = 'Longitude must be -180..180.';
    if (form.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.contactEmail)) e.contactEmail = 'Enter a valid email.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = (): HotelPayload => ({
    name: form.name.trim(),
    shortDescription: form.shortDescription.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    starRating: Number(form.starRating) || 0,
    country: form.country.trim(),
    city: form.city.trim(),
    area: form.area.trim(),
    address: form.address.trim(),
    latitude: form.latitude === '' ? null : Number(form.latitude),
    longitude: form.longitude === '' ? null : Number(form.longitude),
    pricePerNight: Number(form.pricePerNight),
    currency: form.currency.trim() || 'PKR',
    discountPrice: form.discountPrice === '' ? null : Number(form.discountPrice),
    facilities: form.facilities,
    contactPhone: form.contactPhone.trim(),
    contactEmail: form.contactEmail.trim(),
    website: form.website.trim(),
  });

  const handleSave = async () => {
    if (!validate()) { notify('Please fix the highlighted fields.', 'error'); return; }
    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateHotel(editingId, buildPayload());
        setEditingId(updated.id);
        notify('Hotel saved.');
      } else {
        const created = await addHotel(buildPayload());
        setEditingId(created.id);
        notify('Hotel created as Draft. Now you can upload images and publish.');
      }
    } catch (err: any) {
      notify(err?.message || 'Failed to save hotel.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ---------- image ops ----------
  const handleUpload = async (file: File, role: 'cover' | 'gallery') => {
    if (!editingId) { notify('Save the listing before uploading images.', 'error'); return; }
    if (!/^image\/(jpeg|jpg|png|webp|avif)$/.test(file.type)) { notify('Only JPEG, PNG, WebP or AVIF images are allowed.', 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { notify('Image exceeds the 10MB limit.', 'error'); return; }
    setUploading(true); setUploadPct(0);
    try {
      const img = await uploadHotelImage(editingId, file, role, (pct) => setUploadPct(pct));
      const detail = await fetchAdminHotel(editingId);
      setImages(detail?.images || []);
      notify(role === 'cover' ? 'Cover image updated.' : 'Gallery image added.');
      void img;
    } catch (err: any) {
      notify(err?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false); setUploadPct(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!editingId) return;
    const ok = await deleteHotelImage(imageId);
    if (ok) {
      const detail = await fetchAdminHotel(editingId);
      setImages(detail?.images || []);
      notify('Image removed.');
    } else notify('Failed to remove image.', 'error');
  };

  const moveImage = async (index: number, dir: -1 | 1) => {
    if (!editingId) return;
    const next = [...images];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setImages(next);
    const saved = await reorderHotelImages(editingId, next.map((i) => i.id));
    if (saved.length) setImages(saved);
  };

  // ---------- status actions ----------
  const doPublish = async (id: string) => {
    const r = await publishHotel(id);
    notify(r.message || (r.success ? 'Hotel published.' : 'Publish failed.'), r.success ? 'success' : 'error');
    if (r.success) loadList();
  };
  const doUnpublish = async (id: string) => { const r = await unpublishHotel(id); notify(r.message || 'Moved to draft.', r.success ? 'success' : 'error'); if (r.success) loadList(); };
  const doArchive = async (id: string) => { const r = await archiveHotel(id); notify(r.message || 'Hotel archived.', r.success ? 'success' : 'error'); if (r.success) loadList(); };
  const doDelete = async (hotel: HotelListing) => {
    const ok = await deleteHotel(hotel.id);
    notify(ok ? 'Hotel deleted.' : 'Delete failed.', ok ? 'success' : 'error');
    setConfirmDelete(null);
    if (ok) loadList();
  };

  // =============================================================
  // RENDER: LIST VIEW
  // =============================================================
  const renderList = () => (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-black text-blue-950">Hotel Listings</h2>
          <p className="text-xs text-gray-500">Create, manage and publish hotel listings in the public directory.</p>
        </div>
        <button onClick={openAdd} className="bg-amber-400 hover:bg-amber-300 text-blue-950 font-bold text-sm px-4 py-2.5 rounded-full cursor-pointer shadow">
          <i className="fa fa-plus me-1.5"></i>New Hotel
        </button>
      </div>

      {/* filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <i className="fa fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          <input value={listQ} onChange={(e) => { setListQ(e.target.value); setPage(1); }} placeholder="Search name, city or slug" className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-amber-400" />
        </div>
        <select value={listStatus} onChange={(e) => { setListStatus(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select value={listSort} onChange={(e) => { setListSort(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white">
          <option value="newest">Newest</option>
          <option value="name_asc">Name A-Z</option>
          <option value="price_asc">Price low-high</option>
          <option value="updated">Recently updated</option>
        </select>
      </div>

      {/* table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-blue-950 text-white text-left">
            <tr>
              <th className="px-3 py-2.5 font-bold">Hotel</th>
              <th className="px-3 py-2.5 font-bold">Location</th>
              <th className="px-3 py-2.5 font-bold">Price/night</th>
              <th className="px-3 py-2.5 font-bold">Status</th>
              <th className="px-3 py-2.5 font-bold">Updated</th>
              <th className="px-3 py-2.5 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listLoading ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-gray-400"><i className="fa fa-spinner fa-spin me-2"></i>Loading listings...</td></tr>
            ) : hotels.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-gray-400">No hotels found.</td></tr>
            ) : hotels.map((h) => (
              <tr key={h.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                      {h.cover_image_id ? <img src={hotelImageUrl(h.cover_image_id)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><i className="fa fa-hotel"></i></div>}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-blue-950 truncate">{h.name}</div>
                      <div className="text-[11px] text-gray-400 truncate">/{h.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-gray-600">{[h.city, h.country].filter(Boolean).join(', ') || '-'}</td>
                <td className="px-3 py-2.5 text-gray-700">{h.currency} {Number(h.price_per_night).toLocaleString()}</td>
                <td className="px-3 py-2.5">
                  <span className={`inline-block text-[11px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLES[h.status] || STATUS_STYLES.draft}`}>{h.status}</span>
                </td>
                <td className="px-3 py-2.5 text-gray-500 text-xs">{h.updated_at ? new Date(h.updated_at).toLocaleDateString() : '-'}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    <button onClick={() => openEdit(h.id)} title="Edit" className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 text-xs font-bold cursor-pointer"><i className="fa fa-pen"></i></button>
                    <a href={`/hotels/${h.slug}`} target="_blank" rel="noopener noreferrer" title="Preview" className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold"><i className="fa fa-eye"></i></a>
                    {h.status === 'published' ? (
                      <button onClick={() => doUnpublish(h.id)} title="Unpublish" className="px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 text-xs font-bold cursor-pointer"><i className="fa fa-eye-slash"></i></button>
                    ) : (
                      <button onClick={() => doPublish(h.id)} title="Publish" className="px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-xs font-bold cursor-pointer"><i className="fa fa-upload"></i></button>
                    )}
                    <button onClick={() => doArchive(h.id)} title="Archive" className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs font-bold cursor-pointer"><i className="fa fa-box-archive"></i></button>
                    <button onClick={() => setConfirmDelete(h)} title="Delete" className="px-2.5 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold cursor-pointer"><i className="fa fa-trash"></i></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pagination.page <= 1} className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold disabled:opacity-40 cursor-pointer">Prev</button>
          <span className="text-xs text-gray-600">Page {pagination.page} / {pagination.totalPages} ({pagination.total} total)</span>
          <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={pagination.page >= pagination.totalPages} className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold disabled:opacity-40 cursor-pointer">Next</button>
        </div>
      )}
    </div>
  );

  // =============================================================
  // RENDER: FORM VIEW
  // =============================================================
  const inputCls = (err?: string) => `w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-amber-400 ${err ? 'border-red-400' : 'border-gray-300'}`;
  const labelCls = 'block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1';

  const renderForm = () => (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => { setView('list'); loadList(); }} className="text-sm font-bold text-blue-900 hover:text-amber-600 cursor-pointer">
          <i className="fa fa-arrow-left me-1.5"></i>Back to listings
        </button>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full border ${STATUS_STYLES.draft}`}>{editingId ? 'Editing' : 'New draft'}</span>
          <button onClick={handleSave} disabled={saving} className="bg-blue-950 hover:bg-blue-900 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full cursor-pointer">
            {saving ? <><i className="fa fa-spinner fa-spin me-1.5"></i>Saving...</> : <><i className="fa fa-floppy-disk me-1.5"></i>Save</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic */}
          <fieldset className="bg-white border border-gray-200 rounded-xl p-4">
            <legend className="px-2 text-sm font-black text-blue-950">Basic Information</legend>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Hotel name *</label>
                <input value={form.name} onChange={(e) => setField('name', e.target.value)} className={inputCls(errors.name)} placeholder="e.g. Pearl Continental Lahore" />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                {editingId && <p className="text-[11px] text-gray-400 mt-1">Slug is generated from the name and kept unique automatically.</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Category</label>
                  <input value={form.category} onChange={(e) => setField('category', e.target.value)} className={inputCls()} placeholder="e.g. Boutique, Resort" />
                </div>
                <div>
                  <label className={labelCls}>Star rating</label>
                  <select value={form.starRating} onChange={(e) => setField('starRating', Number(e.target.value))} className={inputCls()}>
                    {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 0 ? 'Not rated' : `${n} star`}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Short description</label>
                <input value={form.shortDescription} onChange={(e) => setField('shortDescription', e.target.value)} className={inputCls()} maxLength={200} placeholder="A one-line summary shown on the card." />
              </div>
              <div>
                <label className={labelCls}>Full description</label>
                <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={5} className={inputCls()} placeholder="Detailed overview of the property." />
              </div>
            </div>
          </fieldset>

          {/* Location */}
          <fieldset className="bg-white border border-gray-200 rounded-xl p-4">
            <legend className="px-2 text-sm font-black text-blue-950">Location</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Country *</label><input value={form.country} onChange={(e) => setField('country', e.target.value)} className={inputCls(errors.country)} /><p className="text-xs text-red-600 mt-1">{errors.country}</p></div>
              <div><label className={labelCls}>City *</label><input value={form.city} onChange={(e) => setField('city', e.target.value)} className={inputCls(errors.city)} /><p className="text-xs text-red-600 mt-1">{errors.city}</p></div>
              <div><label className={labelCls}>Area / neighborhood</label><input value={form.area} onChange={(e) => setField('area', e.target.value)} className={inputCls()} /></div>
              <div><label className={labelCls}>Full address</label><input value={form.address} onChange={(e) => setField('address', e.target.value)} className={inputCls()} /></div>
              <div><label className={labelCls}>Latitude (optional)</label><input value={form.latitude} onChange={(e) => setField('latitude', e.target.value)} className={inputCls(errors.latitude)} placeholder="-90 to 90" /><p className="text-xs text-red-600 mt-1">{errors.latitude}</p></div>
              <div><label className={labelCls}>Longitude (optional)</label><input value={form.longitude} onChange={(e) => setField('longitude', e.target.value)} className={inputCls(errors.longitude)} placeholder="-180 to 180" /><p className="text-xs text-red-600 mt-1">{errors.longitude}</p></div>
            </div>
          </fieldset>

          {/* Pricing */}
          <fieldset className="bg-white border border-gray-200 rounded-xl p-4">
            <legend className="px-2 text-sm font-black text-blue-950">Pricing</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className={labelCls}>Starting price / night *</label><input type="number" min="0" step="1" value={form.pricePerNight} onChange={(e) => setField('pricePerNight', e.target.value)} className={inputCls(errors.pricePerNight)} /><p className="text-xs text-red-600 mt-1">{errors.pricePerNight}</p></div>
              <div><label className={labelCls}>Currency</label><input value={form.currency} onChange={(e) => setField('currency', e.target.value)} maxLength={3} className={inputCls()} placeholder="PKR" /></div>
              <div><label className={labelCls}>Discount price (optional)</label><input type="number" min="0" step="1" value={form.discountPrice} onChange={(e) => setField('discountPrice', e.target.value)} className={inputCls(errors.discountPrice)} /><p className="text-xs text-red-600 mt-1">{errors.discountPrice}</p></div>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">All monetary values are re-validated on the server. Client values are never trusted.</p>
          </fieldset>

          {/* Facilities */}
          <fieldset className="bg-white border border-gray-200 rounded-xl p-4">
            <legend className="px-2 text-sm font-black text-blue-950">Facilities</legend>
            <div className="flex flex-wrap gap-2">
              {FACILITY_OPTIONS.map((fac) => (
                <button key={fac} type="button" onClick={() => toggleFacility(fac)} className={`text-xs px-3 py-1.5 rounded-full border font-semibold cursor-pointer transition-colors ${form.facilities.includes(fac) ? 'bg-blue-950 text-white border-blue-950' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                  {form.facilities.includes(fac) && <i className="fa fa-check me-1"></i>}{fac}
                </button>
              ))}
            </div>
            <AddFacility onAdd={(v) => { if (!form.facilities.includes(v)) setForm((f) => ({ ...f, facilities: [...f.facilities, v] })); }} />
          </fieldset>

          {/* Contact */}
          <fieldset className="bg-white border border-gray-200 rounded-xl p-4">
            <legend className="px-2 text-sm font-black text-blue-950">Contact</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className={labelCls}>Phone</label><input value={form.contactPhone} onChange={(e) => setField('contactPhone', e.target.value)} className={inputCls()} /></div>
              <div><label className={labelCls}>Email</label><input value={form.contactEmail} onChange={(e) => setField('contactEmail', e.target.value)} className={inputCls(errors.contactEmail)} /><p className="text-xs text-red-600 mt-1">{errors.contactEmail}</p></div>
              <div><label className={labelCls}>Website</label><input value={form.website} onChange={(e) => setField('website', e.target.value)} className={inputCls()} placeholder="https://" /></div>
            </div>
          </fieldset>
        </div>

        {/* Sidebar: images + publish */}
        <div className="lg:col-span-1 space-y-6">
          <fieldset className="bg-white border border-gray-200 rounded-xl p-4">
            <legend className="px-2 text-sm font-black text-blue-950">Images</legend>
            {!editingId ? (
              <div className="text-sm text-gray-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <i className="fa fa-circle-info text-amber-600 me-1.5"></i>Save the listing first, then cover and gallery images can be uploaded to private storage.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex-1 bg-blue-950 text-white text-xs font-bold px-3 py-2 rounded-lg cursor-pointer disabled:opacity-50">
                    <i className="fa fa-image me-1.5"></i>Add gallery image
                  </button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex-1 bg-amber-400 text-blue-950 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer disabled:opacity-50">
                    <i className="fa fa-star me-1.5"></i>Set new cover
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    // If no cover exists yet, first upload becomes cover; else treat the star button target as cover.
                    const hasCover = images.some((i) => i.role === 'cover');
                    const role: 'cover' | 'gallery' = !hasCover ? 'cover' : 'gallery';
                    handleUpload(file, role);
                  }}
                />
                {uploading && (
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 transition-all" style={{ width: `${uploadPct || 0}%` }} />
                  </div>
                )}

                {images.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No images yet.</p>
                ) : (
                  <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {images.map((img, i) => (
                      <li key={img.id} className="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 shrink-0">
                          <img src={hotelImageUrl(img.id)} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-gray-700 truncate">{img.content_type}</div>
                          {img.role === 'cover' ? <span className="text-[10px] font-bold uppercase text-amber-600">Cover</span> : <span className="text-[10px] uppercase text-gray-400">Gallery</span>}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <button type="button" onClick={() => moveImage(i, -1)} className="text-gray-500 hover:text-blue-900 cursor-pointer px-1"><i className="fa fa-arrow-up text-xs"></i></button>
                          <button type="button" onClick={() => moveImage(i, 1)} className="text-gray-500 hover:text-blue-900 cursor-pointer px-1"><i className="fa fa-arrow-down text-xs"></i></button>
                        </div>
                        <button type="button" onClick={() => handleDeleteImage(img.id)} className="text-red-500 hover:text-red-700 cursor-pointer px-1.5"><i className="fa fa-trash text-xs"></i></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </fieldset>

          <PublishPanel editingId={editingId} hotel={hotels.find((h) => h.id === editingId) || null} onPublish={doPublish} onUnpublish={doUnpublish} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-[120] px-4 py-3 rounded-lg shadow-lg text-sm font-semibold text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {toast.message}
        </div>
      )}

      {view === 'list' ? renderList() : renderForm()}

      {confirmDelete && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-blue-950">Delete "{confirmDelete.name}"?</h3>
            <p className="text-sm text-gray-600 mt-2">
              This permanently removes the listing and any images used only by it. This action cannot be undone.
              Consider <strong>Archiving</strong> instead to preserve history.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-bold text-gray-600 cursor-pointer hover:bg-gray-50">Cancel</button>
              <button onClick={() => doDelete(confirmDelete)} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold cursor-pointer hover:bg-red-700">Delete permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Inline helper: add a custom facility not in the preset list.
const AddFacility: React.FC<{ onAdd: (v: string) => void }> = ({ onAdd }) => {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2 mt-3">
      <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Add a custom facility" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-amber-400" />
      <button type="button" onClick={() => { const v = val.trim(); if (v) { onAdd(v); setVal(''); } }} className="px-3 py-2 rounded-lg bg-blue-950 text-white text-sm font-bold cursor-pointer hover:bg-blue-900">Add</button>
    </div>
  );
};

const PublishPanel: React.FC<{
  editingId: string | null;
  hotel: HotelListing | null;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
}> = ({ editingId, hotel, onPublish, onUnpublish }) => {
  if (!editingId) return null;
  const status = hotel?.status || 'draft';
  return (
    <fieldset className="bg-white border border-gray-200 rounded-xl p-4">
      <legend className="px-2 text-sm font-black text-blue-950">Publication</legend>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-gray-600">Current status:</span>
        <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full border ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}>{status}</span>
      </div>
      {status === 'published' ? (
        <button onClick={() => onUnpublish(editingId)} className="w-full bg-amber-400 text-blue-950 font-bold text-sm px-4 py-2.5 rounded-lg cursor-pointer hover:bg-amber-300">
          <i className="fa fa-eye-slash me-1.5"></i>Unpublish
        </button>
      ) : (
        <>
          <button onClick={() => onPublish(editingId)} className="w-full bg-emerald-600 text-white font-bold text-sm px-4 py-2.5 rounded-lg cursor-pointer hover:bg-emerald-500">
            <i className="fa fa-upload me-1.5"></i>Publish
          </button>
          <p className="text-[11px] text-gray-400 mt-2">Publishing requires name, country, city, a valid price and a cover image. Save unsaved edits first.</p>
        </>
      )}
    </fieldset>
  );
};
