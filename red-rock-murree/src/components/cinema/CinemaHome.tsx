import React, { useEffect, useMemo, useState } from 'react';
import { ScrollTrigger } from '../../motion/gsap';
import { fetchFacilities, fetchRooms, FacilitySection, HotelRoom } from '../../services/apiService';
import { OpeningScene } from './OpeningScene';
import { StoryScene, StoryItem } from './StoryScene';
import { FacilityScene } from './FacilityScene';
import { RoomCategoriesScene } from './RoomCategoriesScene';
import { TOTAL_ROOMS } from '../../data/roomCategories';

/** Cinematic homepage: opening scene + story scene. All data comes from the existing API (no hard-coded availability). */
export const CinemaHome: React.FC = () => {
  const [facilities, setFacilities] = useState<FacilitySection[]>([]);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);

  useEffect(() => {
    let on = true;
    Promise.all([fetchFacilities(), fetchRooms()])
      .then(([f, r]) => { if (on) { setFacilities(f); setRooms(r); } })
      .catch(() => {});
    return () => { on = false; };
  }, []);

  // Fonts and images change layout after first paint: re-measure every pin/trigger once they have settled.
  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener('load', refresh);
    return () => window.removeEventListener('load', refresh);
  }, []);

  const items = useMemo<StoryItem[]>(() => {
    const pick = (type: string, fallback: string) => facilities.find((f) => f.type === type && f.is_published !== 0 && f.is_published !== false)?.image_url || fallback;
    const firstRoom = [...rooms].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0];
    return [
      { key: 'entrance', title: 'The entrance', text: 'Step in through the front entrance of Red Rock Murree.', image: pick('entrance', '/images/00-entrance.jpg'), alt: 'The entrance of Red Rock Murree' },
      { key: 'reception', title: 'Reception', text: 'The reception desk, where your stay begins.', image: pick('reception', '/images/01-reception.jpg'), alt: 'The reception desk at Red Rock Murree' },
      { key: 'rooms', title: '42 rooms', text: 'See which rooms are available, occupied, reserved or in maintenance, then send your inquiry on WhatsApp.', image: firstRoom?.image_url || '/images/02-room-01.jpg', alt: 'A guest room at Red Rock Murree' },
    ];
  }, [facilities, rooms]);

  const published = (type: string) => facilities.find((f) => f.type === type && f.is_published !== 0 && f.is_published !== false);
  const entrance = published('entrance');
  const reception = published('reception');

  return (
    <>
      <OpeningScene roomCount={TOTAL_ROOMS} />
      <StoryScene items={items} />
      <FacilityScene id="entrance" variant="doors" from="mist" kicker="Entrance" lines={['The front', 'door.']}
        text={entrance?.description || 'The front entrance of Red Rock Murree.'} image="/images/hd/entrance-wide.jpg" position="50% 55%"
        alt="The entrance hall of Red Rock Murree with the reception desk and lounge seating" />
      <RoomCategoriesScene />
      <FacilityScene id="reception" variant="wipe" from="mist" kicker="Reception" lines={['The front', 'desk.']}
        text={reception?.description || 'The reception desk at Red Rock Murree.'} image="/images/hd/reception-desk.jpg" position="50% 32%"
        alt="The reception desk at Red Rock Murree" cta={{ label: 'Check availability', target: '#availability' }} />
    </>
  );
};
