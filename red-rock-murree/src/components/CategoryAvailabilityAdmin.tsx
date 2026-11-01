import React, { useEffect, useState } from 'react';
import { fetchRoomCategoryStats, saveRoomCategoryStats, RoomCategoryStatRow } from '../services/apiService';

const FIELDS = [
  ['available', 'Available'],
  ['occupied', 'Occupied'],
  ['reserved', 'Reserved'],
  ['maintenance', 'Under maintenance'],
] as const;
type Field = (typeof FIELDS)[number][0];
type Draft = Record<Field, string>;

/**
 * Admin editor for the public "Which Rooms Are Free?" numbers. Totals are fixed (42 rooms); the four counts of each
 * category must add up to that category's total, and the server enforces it as well.
 */
export const CategoryAvailabilityAdmin: React.FC = () => {
  const [rows, setRows] = useState<RoomCategoryStatRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await fetchRoomCategoryStats();
      setRows(data.categories);
      setDrafts(Object.fromEntries(data.categories.map((c) => [c.key, { available: String(c.available), occupied: String(c.occupied), reserved: String(c.reserved), maintenance: String(c.maintenance) }])));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toNum = (v: string) => (v.trim() === '' ? NaN : Number(v));
  const sumOf = (d: Draft) => FIELDS.reduce((n, [k]) => n + (Number.isFinite(toNum(d[k])) ? toNum(d[k]) : 0), 0);

  const save = async (c: RoomCategoryStatRow) => {
    const d = drafts[c.key];
    const vals = Object.fromEntries(FIELDS.map(([k]) => [k, toNum(d[k])])) as Record<Field, number>;
    const res = await saveRoomCategoryStats(c.key, vals);
    setMsg((m) => ({ ...m, [c.key]: { ok: res.success, text: res.success ? 'Saved. The public website now shows these numbers.' : res.message } }));
    if (res.success) load();
  };

  if (loading) return <p className="text-sm text-gray-500">Loading&hellip;</p>;
  const grand = rows.reduce((n, c) => n + c.total, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">Availability by room category</h3>
        <p className="text-sm text-gray-600 mt-1">
          Hotel total: <strong>{grand} rooms</strong>. For each category the four counts must add up to its total. Until you save a category, the public website shows no live numbers for it.
        </p>
      </div>
      {rows.map((c) => {
        const d = drafts[c.key];
        if (!d) return null;
        const s = sumOf(d);
        const ok = s === c.total;
        return (
          <div key={c.key} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h4 className="font-bold text-gray-900">{c.name} <span className="text-gray-500 font-normal">({c.total} rooms)</span></h4>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.confirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{c.confirmed ? 'Shown on website' : 'Not confirmed yet'}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {FIELDS.map(([k, label]) => (
                <label key={k} className="block">
                  <span className="text-xs font-bold text-gray-600">{label}</span>
                  <input type="number" min={0} step={1} inputMode="numeric" value={d[k]}
                    onChange={(e) => setDrafts((all) => ({ ...all, [c.key]: { ...all[c.key], [k]: e.target.value } }))}
                    className="mt-1 w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-hotel-primary" />
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className={`text-sm font-bold ${ok ? 'text-emerald-700' : 'text-red-600'}`}>Sum: {s} / {c.total}{ok ? '' : `  (${s > c.total ? s - c.total + ' too many' : c.total - s + ' missing'})`}</p>
              <button type="button" disabled={!ok} onClick={() => save(c)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-hotel-primary text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">Save {c.name}</button>
            </div>
            {msg[c.key] && <p role="status" className={`mt-3 text-sm ${msg[c.key].ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg[c.key].text}</p>}
          </div>
        );
      })}
    </div>
  );
};
