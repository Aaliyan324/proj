import React, { useEffect, useState } from 'react';
import {
  PublishedWalkthrough,
  WalkthroughSection as WTSection,
  fetchPublishedWalkthrough,
  resolveRoomImageSrc,
} from '../services/apiService';
import { Reveal } from '../lib/Reveal';

// Public Website Walkthrough — content is written and published from the admin
// dashboard and stored in Neon. When nothing is published this section renders
// NOTHING (it never falls back to any legacy/hardcoded walkthrough).
function isSafeVideoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' &&
      (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com' ||
        u.hostname === 'www.youtube-nocookie.com' || u.hostname === 'player.vimeo.com' ||
        u.hostname === 'vimeo.com');
  } catch {
    return false;
  }
}

const SectionBlock: React.FC<{ section: WalkthroughSectionType; index: number }> = ({ section, index }) => {
  const flip = index % 2 === 1;
  const image = resolveRoomImageSrc(section.image_ref);
  const hasMedia = Boolean(image) || Boolean(section.video_url && isSafeVideoUrl(section.video_url));

  return (
    <Reveal>
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center ${flip ? 'lg:[&>div:first-child]:order-2' : ''}`}>
        {/* Media */}
        <div className={`${hasMedia ? '' : 'hidden'}`}>
          {section.video_url && isSafeVideoUrl(section.video_url) ? (
            <div className="rounded-2xl overflow-hidden shadow-lg aspect-video bg-black">
              <iframe
                src={section.video_url}
                title={section.heading || 'Property walkthrough video'}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          ) : image ? (
            <figure className="rounded-2xl overflow-hidden shadow-lg bg-gray-100">
              <img
                src={image}
                alt={section.caption || section.heading || `Walkthrough ${index + 1}`}
                loading="lazy"
                className="w-full h-64 sm:h-80 lg:h-96 object-cover"
                onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
              />
              {section.caption ? (
                <figcaption className="px-4 py-3 text-xs text-gray-500 bg-white border-t border-gray-100">
                  {section.caption}
                </figcaption>
              ) : null}
            </figure>
          ) : null}
        </div>

        {/* Text */}
        <div>
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-hotel-primary text-white text-sm font-extrabold mb-4">
            {index + 1}
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-blue-950 mb-3">
            {section.heading}
          </h3>
          {section.body ? (
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{section.body}</p>
          ) : null}
        </div>
      </div>
    </Reveal>
  );
};

// Local alias so the block prop reads clearly without importing the type twice.
type WalkthroughSectionType = WTSection;

export const WalkthroughSection: React.FC = () => {
  const [data, setData] = useState<PublishedWalkthrough | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const result = await fetchPublishedWalkthrough();
      if (alive) {
        setData(result);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <section id="walkthrough" className="py-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-12">
          <div className="mx-auto h-40 bg-gray-200 rounded-2xl animate-pulse max-w-2xl" />
        </div>
      </section>
    );
  }

  // No published walkthrough: render nothing at all.
  if (!data || !data.walkthrough || data.sections.length === 0) return null;

  return (
    <section id="walkthrough" className="py-20 bg-gray-50 border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 lg:px-12">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h5 className="text-sm lg:text-base font-bold text-hotel-primary uppercase tracking-widest">
              Take A Look Around
            </h5>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-blue-950 mt-3 mb-4">
              {data.walkthrough.title || 'Property Walkthrough'}
            </h2>
            {data.walkthrough.intro ? (
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {data.walkthrough.intro}
              </p>
            ) : null}
          </div>
        </Reveal>

        <div className="space-y-16 lg:space-y-24">
          {data.sections.map((section, i) => (
            <SectionBlock key={section.id} section={section} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};
