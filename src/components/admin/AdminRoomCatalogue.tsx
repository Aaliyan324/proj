import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RoomListing,
  RoomImageMeta,
  RoomPayload,
  fetchAdminRoomCatalog,
  fetchAdminRoom,
  addRoomCatalog,
  updateRoomCatalog,
  deleteRoom,
  uploadRoomImage,
  manageRoomImages,
  deleteRoomImage,
  setupRoomCatalog,
  attachBundledRoomImage,
  resolveRoomImageSrc,
} from '../../services/apiService';

// Admin Room Catalogue manager: create/edit published catalogue fields and
// manage the private-Blob image gallery (upload / set primary / reorder /
// delete). Publication status is kept separate from live availability.
interface FormState {
  room_number: string;
  title: string;
  slug: string;
  roomType: string;
  shortDescription: string;
  description: string;
  pricePerNight: string;
  currency: string;
  maxGuests: string;
  bedType: string;
  roomSize: string;
  amenitiesText: string;
  status: string;
  publishStatus: string;
  display_order: string;
}

const EMPTY_FORM: FormState = {
  room_number: '', title: '', slug: '', roomType: '', shortDescription: '', description: '',
  pricePerNight: '', currency: 'PKR', maxGuests: '', bedType: '', roomSize: '', amenitiesText: '',
  status: 'Available', publishStatus: 'draft', display_order: '',
};

const PUBLISH_OPTIONS = [
  { value: 'draft', label: 'Draft (hidden from public)' },
  { value: 'published', label: 'Published' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'unavailable', label: 'Unavailable' },
];

const AVAILABILITY_OPTIONS = ['Available', 'Occupied', 'Reserved', 'Maintenance'];

const field = 'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none';
const label = 'block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1';

const AdminRoomCatalogue: React.FC = () => {
  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [images, setImages] = useState<RoomImageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text });
    window.setTimeout(() => setMsg(null), 4500);
  };

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      setRooms(await fetchAdminRoomCatalog());
    } catch {
      flash('err', 'Failed to load the room catalogue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  const resetToNew = () => {
    setIsNew(true);
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setImages([]);
  };

  const selectRoom = async (id: string) => {
    setIsNew(false);
    setSelectedId(id);
    const found = rooms.find((r) => r.id === id);
    setForm({
      room_number: found?.room_number ?? '',
      title: found?.title ?? '',
      slug: found?.slug ?? '',
      roomType: found?.room_type ?? '',
      shortDescription: found?.short_description ?? '',
      description: found?.description ?? '',
      pricePerNight: found && found.price_per_night ? String(found.price_per_night) : '',
      currency: found?.currency || 'PKR',
      maxGuests: found && found.max_guests ? String(found.max_guests) : '',
      bedType: found?.bed_type ?? '',
      roomSize: found?.room_size ?? '',
      amenitiesText: (found?.amenities || []).join(', '),
      status: found?.status || 'Available',
      publishStatus: found?.publish_status || 'draft',
      display_order: found ? String(found.display_order ?? '') : '',
    });
    const detail = await fetchAdminRoom(id);
    setImages(detail?.images || []);
  };

  const setField = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const buildPayload = (): RoomPayload => ({
    room_number: form.room_number.trim(),
    title: form.title.trim(),
    slug: form.slug.trim() || undefined,
    roomType: form.roomType.trim(),
    shortDescription: form.shortDescription.trim(),
    description: form.description.trim(),
    pricePerNight: form.pricePerNight === '' ? 0 : Number(form.pricePerNight),
    currency: (form.currency || 'PKR').trim().toUpperCase().slice(0, 3),
    maxGuests: form.maxGuests === '' ? 0 : Number(form.maxGuests),
    bedType: form.bedType.trim(),
    roomSize: form.roomSize.trim(),
    amenities: form.amenitiesText.split(',').map((a) => a.trim()).filter(Boolean),
    status: form.status,
    publishStatus: form.publishStatus as RoomPayload['publishStatus'],
    display_order: form.display_order === '' ? undefined : Number(form.display_order),
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.room_number.trim()) {
      flash('err', 'Room number is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isNew) {
        const created = await addRoomCatalog(payload);
        flash('ok', 'Room created.');
        await loadRooms();
        setIsNew(false);
        setSelectedId(created.id);
        const detail = await fetchAdminRoom(created.id);
        setImages(detail?.images || []);
      } else if (selectedId) {
        await updateRoomCatalog(selectedId, payload);
        flash('ok', 'Room updated.');
        await loadRooms();
      }
    } catch (err: any) {
      flash('err', err?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const removeRoom = async () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this room? Its image records are removed too. Live reservations are not affected.')) return;
    const ok = await deleteRoom(selectedId);
    if (ok) {
      flash('ok', 'Room deleted.');
      setSelectedId(null);
      setIsNew(false);
      setImages([]);
      setForm(EMPTY_FORM);
      loadRooms();
    } else {
      flash('err', 'Delete failed (a room catalogue must keep at least one room).');
    }
  };

  const runSetup = async () => {
    if (!window.confirm('Create the draft room catalogue from the bundled thumbnails? This only runs when no rooms exist and never overwrites existing rooms.')) return;
    try {
      const res = await setupRoomCatalog();
      flash('ok', res.message || `Created ${res.created} draft rooms.`);
      loadRooms();
    } catch (err: any) {
      flash('err', err?.message || 'Setup failed.');
    }
  };

  // ---- Gallery ----
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    setUploading(true);
    setProgress(0);
    try {
      await uploadRoomImage(selectedId, file, setProgress);
      const detail = await fetchAdminRoom(selectedId);
      setImages(detail?.images || []);
      flash('ok', 'Image uploaded to private storage.');
    } catch (err: any) {
      flash('err', err?.message || 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const makePrimary = async (imageId: string) => {
    if (!selectedId) return;
    try {
      const updated = await manageRoomImages(selectedId, { primaryId: imageId });
      setImages(updated);
      flash('ok', 'Cover image updated.');
    } catch (err: any) {
      flash('err', err?.message || 'Failed to set primary.');
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!selectedId) return;
    // Reorder only the non-cover gallery images by display_order.
    const gallery = images.filter((i) => i.role !== 'cover');
    const target = index + dir;
    if (target < 0 || target >= gallery.length) return;
    const reordered = [...gallery];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    try {
      const updated = await manageRoomImages(selectedId, { ids: reordered.map((i) => i.id) });
      setImages(updated);
    } catch (err: any) {
      flash('err', err?.message || 'Reorder failed.');
    }
  };

  const removeImage = async (imageId: string) => {
    if (!selectedId) return;
    if (!window.confirm('Remove this image? The private file is deleted when no longer referenced.')) return;
    const ok = await deleteRoomImage(imageId);
    if (ok) {
      const detail = await fetchAdminRoom(selectedId);
      setImages(detail?.images || []);
      flash('ok', 'Image removed.');
    } else {
      flash('err', 'Failed to remove image.');
    }
  };

  const [bundleNum, setBundleNum] = useState('1');
  const attachBundle = async () => {
    if (!selectedId) return;
    try {
      await attachBundledRoomImage(selectedId, bundleNum);
      const detail = await fetchAdminRoom(selectedId);
      setImages(detail?.images || []);
      setRooms((rs) => rs.map((r) => (r.id === selectedId ? { ...r, image_url: `/images/rooms/hotel_room_${String(bundleNum).padStart(2, '0')}.jpg` } : r)));
      flash('ok', 'Bundled thumbnail attached.');
    } catch (err: any) {
      flash('err', err?.message || 'Attach failed.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          Manage the public room catalogue. Changes here drive the <strong>Featured</strong> section, the
          <strong> /rooms</strong> listing and each room's detail page.
        </p>
        <div className="flex items-center gap-2">
          <button onClick={runSetup} className="text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer">
            <i className="fa fa-wand-magic-sparkles me-1.5 text-hotel-primary"></i>Safe catalogue setup
          </button>
          <button onClick={resetToNew} className="text-xs font-bold px-3 py-2 rounded-lg bg-hotel-primary text-white hover:bg-blue-900 cursor-pointer">
            <i className="fa fa-plus me-1.5"></i>New Room
          </button>
        </div>
      </div>

      {msg && (
        <div className={`text-sm rounded-lg px-4 py-2.5 ${msg.kind === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Room list */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-sm text-gray-500"><i className="fa fa-spinner fa-spin me-2"></i>Loading rooms…</div>
          ) : rooms.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              No rooms yet. Use <strong>Safe catalogue setup</strong> to create drafts from the bundled thumbnails, or <strong>New Room</strong>.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rooms.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => selectRoom(r.id)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-blue-50 transition-colors ${selectedId === r.id && !isNew ? 'bg-blue-50' : ''}`}
                  >
                    <img src={resolveRoomImageSrc(r.image_url) || '/images/room_suite_king.jpg'} alt="" className="w-11 h-11 rounded-lg object-cover bg-gray-100 shrink-0" onError={(e: any) => { e.currentTarget.src = '/images/room_suite_king.jpg'; }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">{r.title || r.room_number}</p>
                      <p className="text-[11px] text-gray-500 truncate">{r.room_type || '—'}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${r.publish_status === 'published' ? 'bg-emerald-100 text-emerald-700' : r.publish_status === 'maintenance' ? 'bg-gray-200 text-gray-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.publish_status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Editor */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 lg:p-5">
          {isNew || selectedId ? (
            <form onSubmit={save} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-blue-950">{isNew ? 'New Room' : `Edit — ${form.room_number || form.title}`}</h3>
                {!isNew && (
                  <button type="button" onClick={removeRoom} className="text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer">
                    <i className="fa fa-trash me-1.5"></i>Delete
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={label}>Room number *</label><input className={field} value={form.room_number} onChange={(e) => setField('room_number', e.target.value)} placeholder="Room 21" /></div>
                <div><label className={label}>Title</label><input className={field} value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Deluxe King Suite" /></div>
                <div><label className={label}>Category / type</label><input className={field} value={form.roomType} onChange={(e) => setField('roomType', e.target.value)} placeholder="Deluxe" /></div>
                <div><label className={label}>Slug</label><input className={field} value={form.slug} onChange={(e) => setField('slug', e.target.value)} placeholder="auto from title" /></div>
                <div><label className={label}>Price / night</label><input type="number" min="0" step="1" className={field} value={form.pricePerNight} onChange={(e) => setField('pricePerNight', e.target.value)} placeholder="0" /></div>
                <div><label className={label}>Currency</label><input className={field} maxLength={3} value={form.currency} onChange={(e) => setField('currency', e.target.value)} placeholder="PKR" /></div>
                <div><label className={label}>Max guests</label><input type="number" min="0" className={field} value={form.maxGuests} onChange={(e) => setField('maxGuests', e.target.value)} placeholder="2" /></div>
                <div><label className={label}>Bed type</label><input className={field} value={form.bedType} onChange={(e) => setField('bedType', e.target.value)} placeholder="1 King Bed" /></div>
                <div><label className={label}>Room size</label><input className={field} value={form.roomSize} onChange={(e) => setField('roomSize', e.target.value)} placeholder="28 m²" /></div>
                <div><label className={label}>Display order</label><input type="number" min="0" className={field} value={form.display_order} onChange={(e) => setField('display_order', e.target.value)} placeholder="99" /></div>
                <div><label className={label}>Availability status</label>
                  <select className={field} value={form.status} onChange={(e) => setField('status', e.target.value)}>
                    {AVAILABILITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div><label className={label}>Publish status</label>
                  <select className={field} value={form.publishStatus} onChange={(e) => setField('publishStatus', e.target.value)}>
                    {PUBLISH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div><label className={label}>Short description</label><textarea rows={2} maxLength={300} className={field} value={form.shortDescription} onChange={(e) => setField('shortDescription', e.target.value)} placeholder="One or two lines for cards." /></div>
              <div><label className={label}>Full description</label><textarea rows={4} className={field} value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Detailed description shown on the room page." /></div>
              <div><label className={label}>Amenities (comma separated)</label><input className={field} value={form.amenitiesText} onChange={(e) => setField('amenitiesText', e.target.value)} placeholder="Free Wi-Fi, Air Conditioning, Private Bath" /></div>

              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={saving} className="bg-hotel-primary hover:bg-blue-900 text-white font-bold text-sm px-6 py-2.5 rounded-full disabled:opacity-60 cursor-pointer">
                  {saving ? 'Saving…' : isNew ? 'Create Room' : 'Save Changes'}
                </button>
                {isNew && (
                  <button type="button" onClick={() => { setIsNew(false); setForm(EMPTY_FORM); }} className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer">Cancel</button>
                )}
              </div>
            </form>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-400 py-16">
              <div className="text-center">
                <i className="fa fa-arrow-left me-1.5"></i>Select a room on the left, or create a new one.
              </div>
            </div>
          )}

          {/* Gallery manager (existing rooms only) */}
          {!isNew && selectedId && (
            <div className="mt-6 border-t border-gray-100 pt-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-black text-blue-950">Photo gallery <span className="text-gray-400 font-normal">({images.length})</span></h4>
                <div className="flex items-center gap-2">
                  <select value={bundleNum} onChange={(e) => setBundleNum(e.target.value)} className="text-xs px-2 py-1.5 rounded-lg border border-gray-300">
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Thumbnail {String(n).padStart(2, '0')}</option>)}
                  </select>
                  <button onClick={attachBundle} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer">Attach bundled</button>
                  <button onClick={() => fileRef.current?.click()} disabled={uploading} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-hotel-primary text-white hover:bg-blue-900 disabled:opacity-60 cursor-pointer">
                    {uploading ? `Uploading ${progress}%` : 'Upload image'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
                </div>
              </div>

              {uploading && (
                <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                  <div className="h-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}

              {images.length === 0 ? (
                <p className="text-xs text-gray-500">No uploaded images yet. Upload photos or attach a bundled thumbnail to build this room's gallery.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {images.map((img, i) => (
                    <div key={img.id} className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                      <img src={resolveRoomImageSrc(`/api/room-image/${img.id}`)} alt="" className="w-full h-24 object-cover" onError={(e: any) => { e.currentTarget.style.opacity = '0.3'; }} />
                      {img.role === 'cover' && <span className="absolute top-1 left-1 bg-amber-400 text-blue-950 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">Cover</span>}
                      <div className="flex items-center justify-between px-1.5 py-1 bg-white border-t border-gray-100">
                        <div className="flex items-center gap-1">
                          <button onClick={() => move(i, -1)} title="Move earlier" className="text-gray-500 hover:text-blue-900 text-[11px] px-1 cursor-pointer"><i className="fa fa-chevron-left"></i></button>
                          <button onClick={() => move(i, 1)} title="Move later" className="text-gray-500 hover:text-blue-900 text-[11px] px-1 cursor-pointer"><i className="fa fa-chevron-right"></i></button>
                        </div>
                        <div className="flex items-center gap-1">
                          {img.role !== 'cover' && <button onClick={() => makePrimary(img.id)} title="Make cover" className="text-amber-600 hover:text-amber-700 text-[11px] px-1 cursor-pointer"><i className="fa fa-star"></i></button>}
                          <button onClick={() => removeImage(img.id)} title="Delete" className="text-red-500 hover:text-red-700 text-[11px] px-1 cursor-pointer"><i className="fa fa-trash"></i></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRoomCatalogue;
