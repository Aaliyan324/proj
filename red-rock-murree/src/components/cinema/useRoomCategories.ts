import { useEffect, useState } from 'react';
import { ROOM_CATEGORIES } from '../../data/roomCategories';

export interface CategoryStat {
  key: string; name: string; total: number;
  available: number; occupied: number; reserved: number; maintenance: number;
  confirmed: boolean;
}

/** Fallback before the API answers (or if it fails): correct totals, no status numbers, marked unconfirmed. */
const FALLBACK: CategoryStat[] = ROOM_CATEGORIES.map((c) => ({ key: c.key, name: c.name, total: c.total, available: 0, occupied: 0, reserved: 0, maintenance: 0, confirmed: false }));

/** Category availability from the server (polled, like the rest of the live data). */
export function useRoomCategories(): CategoryStat[] {
  const [stats, setStats] = useState<CategoryStat[]>(FALLBACK);
  useEffect(() => {
    let on = true;
    const load = async () => {
      try {
        const res = await fetch('/api/room-categories');
        if (!res.ok) return;
        const data = await res.json();
        if (on && Array.isArray(data.categories)) setStats(data.categories.map((c: any) => ({ ...c, confirmed: !!c.confirmed })));
      } catch { /* keep fallback */ }
    };
    load();
    const t = setInterval(load, 15000);
    return () => { on = false; clearInterval(t); };
  }, []);
  return stats;
}
