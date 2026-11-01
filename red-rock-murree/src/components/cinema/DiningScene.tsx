import React, { useEffect, useRef, useState } from 'react';
import { gsap } from '../../motion/gsap';
import { useScene, themeIn, frameOpen, fadeUpOnce, linesIn, pinnedHorizontal } from '../../motion/scene';
import { FoodItem, fetchFood, fetchSettings, buildFoodWhatsAppLink } from '../../services/apiService';
import { AdaptiveImage } from './AdaptiveImage';
import { Lines } from './Lines';

/**
 * Dining. Same data, polling and WhatsApp inquiry as before; no prices. Rich layout with 2+ dishes: pinned horizontal
 * run with counter-moving photographs. One dish (or mobile): large stacked layout where the photo opens on scroll.
 */
export const DiningScene: React.FC = () => {
  const root = useRef<HTMLElement>(null);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);

  const loadFood = async () => {
    try {
      const [foodData, settingsData] = await Promise.all([fetchFood(), fetchSettings()]);
      setFoods(foodData);
      setWhatsappNumber(settingsData.whatsapp_number);
    } catch (err) {
      console.error('Error loading food:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadFood();
    const interval = setInterval(loadFood, 10000); // real-time menu updates
    return () => clearInterval(interval);
  }, []);

  const handleOrderWhatsApp = (foodName: string) => window.open(buildFoodWhatsAppLink(whatsappNumber, foodName), '_blank');

  const horizontal = foods.length > 1;
  const { rich } = useScene(root, ({ el, rich }) => {
    themeIn(el, 'mist', 'pine');
    if (!el.querySelector('.dn-heading')) return; // loading state: nothing to animate yet
    const lineEls = el.querySelectorAll('.dn-line-in');
    if (rich && horizontal) {
      gsap.set(lineEls, { yPercent: 118 });
      const { tl, dist } = pinnedHorizontal(el.querySelector('.dn-pin')!, el.querySelector('.dn-track') as HTMLElement, 0.6);
      tl.to(lineEls, { yPercent: 0, duration: 1.2, stagger: 0.15, ease: 'power3.out' }, 0)
        .to(el.querySelector('.dn-track'), { x: () => -dist(), duration: 8 }, 0.8)
        .fromTo(el.querySelectorAll('.dn-card .ai-img'), { xPercent: -7 }, { xPercent: 7, duration: 8 }, 0.8);
      return;
    }
    linesIn(lineEls, el.querySelector('.dn-heading')!);
    el.querySelectorAll<HTMLElement>('.dn-frame').forEach((f) => frameOpen(f, f.querySelector('.ai-img')));
    fadeUpOnce(el.querySelectorAll('.dn-fade'));
  }, [foods.length]);

  // A plain render function (not a nested component) so the 10s poll never remounts cards or their animations.
  const renderCard = (food: FoodItem, wide = false) => {
    const isAvailable = Boolean(food.is_available === 1 || food.is_available === true);
    return (
      <article key={food.id} className={`dn-card flex ${wide ? 'h-[62svh] w-[46vw] shrink-0 flex-col gap-5' : 'flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-center lg:gap-14'}`}>
        <div className={`dn-frame overflow-hidden ${wide ? 'min-h-0 flex-1' : ''}`}>
          <AdaptiveImage src={food.thumbnail} alt={food.name} className={wide ? 'h-full w-full [&_.ai-img]:scale-[1.18]' : 'aspect-[4/5] w-full sm:aspect-[4/3]'} />
        </div>
        <div className="dn-fade flex flex-col gap-4">
          <p className={`t-small inline-flex w-fit items-center gap-2 rounded-full border border-current px-3 py-1 ${isAvailable ? '' : 'opacity-60'}`}>
            <span className={`h-2 w-2 rounded-full ${isAvailable ? 'bg-emerald-400' : 'bg-fog'}`} aria-hidden="true" />
            {isAvailable ? 'Available' : 'Not available'}
          </p>
          <h3 className={wide ? 't-h3' : 't-h2'}>{food.name}</h3>
          <p className="t-body opacity-80">Available: {food.available_from} &ndash; {food.available_until}</p>
          <div>
            <button type="button" className={`rr-btn ${isAvailable ? '' : 'rr-btn--ghost'}`} onClick={() => handleOrderWhatsApp(food.name)} title="Contact the kitchen via WhatsApp">
              {isAvailable ? 'Inquire via WhatsApp' : 'Check service status'}
            </button>
          </div>
        </div>
      </article>
    );
  };

  const intro = (
    <div className="flex flex-col gap-6">
      <p className="dn-fade t-small uppercase tracking-[0.18em] opacity-70">Dining</p>
      <h2 className="dn-heading t-h2"><Lines lines={['From our', 'kitchen.']} inner="dn-line-in" /></h2>
      <p className="dn-fade t-body opacity-80">Dishes served at Red Rock Murree, with the hours each one is available.</p>
    </div>
  );

  return (
    <section ref={root} id="dining" data-nav="dark" className="cinema relative bg-pine text-mist" aria-label="Dining">
      {loading ? (
        <p className="px-8 py-40 text-center text-fog">Loading the menu&hellip;</p>
      ) : foods.length === 0 ? (
        <div className="mx-auto max-w-[900px] px-5 py-32">{intro}<p className="mt-10 text-fog">The menu is being updated.</p></div>
      ) : rich && horizontal ? (
        <div className="dn-pin flex h-[100svh] items-center overflow-hidden">
          <div className="dn-track flex w-max items-center gap-16 pl-8 pr-[12vw]">
            <div className="w-[34vw] shrink-0">{intro}</div>
            {foods.map((f) => renderCard(f, true))}
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-[1200px] flex-col gap-20 px-5 py-28 sm:px-8">
          {intro}
          {foods.map((f) => renderCard(f))}
        </div>
      )}
    </section>
  );
};
