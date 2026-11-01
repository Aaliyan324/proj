import { useEffect, useState } from 'react';
import { DynamicGalleryItem, fetchGallery } from '../../services/apiService';
import { GALLERY_ITEMS } from '../../data/hotelData';

/** Gallery items from the existing API (polled like the old gallery), with the original seed list as fallback. Order is kept as stored. */
export function useGallery(): DynamicGalleryItem[] {
  const [items, setItems] = useState<DynamicGalleryItem[]>([]);
  useEffect(() => {
    let on = true;
    const load = async () => {
      try {
        const data = await fetchGallery();
        if (!on) return;
        if (data && data.length) setItems(data);
        else
          setItems(GALLERY_ITEMS.map((g) => ({ id: g.id, category: g.category, title: g.title, room_number: null, description: g.caption, image_url: g.image, display_order: g.stepNumber, is_published: 1 })));
      } catch (e) {
        console.error('Failed fetching gallery items:', e);
      }
    };
    load();
    const t = setInterval(load, 10000);
    return () => { on = false; clearInterval(t); };
  }, []);
  return items
    .filter((i) => i.is_published !== 0 && i.is_published !== false)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
}
