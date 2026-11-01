import React, { useEffect, useRef, useState } from 'react';
import {
  PublishedWalkthrough,
  WalkthroughSection as WTSection,
  fetchPublishedWalkthrough,
  resolveRoomImageSrc,
} from '../services/apiService';
import { useScene, linesIn, fadeUpOnce, frameOpen } from '../motion/scene';
import { Lines } from './cinema/Lines';

// Public Website Walkthrough — content is written and published from the admin
// dashboard and stored in Neon. When nothing is published this scene renders
// NOTHING (it never falls back to any legacy/hardcoded walkthrough).
// Presentation follows the cinema scene language; the data logic is unchanged.
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
    <div className={`wt-block grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12 ${flip ? 'lg:[&>div:first-child]:order-2' : ''}`}>
      {/* Media */}
      <div className={`${hasMedia ? 'wt-media overflow-hidden rounded-2xl border border-mist/15' : 'hidden'}`}>
        {section.video_url && isSafeVideoUrl(section.video_url) ? (
          <div className="aspect-video w-full bg-black">
            <iframe
              src={section.video_url}
              title={section.heading || 'Property walkthrough video'}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : image ? (
          <figure>
            <img
              src={image}
              alt={section.caption || section.heading || `Walkthrough ${index + 1}`}
              loading="lazy"
              className="h-64 w-full object-cover sm:h-80 lg:h-96"
              onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
            />
            {section.caption ? (
              <figcaption className="t-small border-t border-mist/15 px-4 py-3 opacity-70">
                {section.caption}
              </figcaption>
            ) : null}
          </figure>
        ) : null}
      </div>

      {/* Text */}
      <div>
        <span className="t-small mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-rock text-mist">
          {index + 1}
        </span>
        <h3 className="t-h3">{section.heading}</h3>
        {section.body ? (
          <p className="t-body mt-3 whitespace-pre-line opacity-80">{section.body}</p>
        ) : null}
      </div>
    </div>
  );
};

// Local alias so the block prop reads clearly without importing the type twice.
type WalkthroughSectionType = WTSection;

export const WalkthroughSection: React.FC = () => {
  const root = useRef<HTMLElement>(null);
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

  // Scene motion: heading line reveal, block fades and photo frame opens.
  useScene(root, ({ el }) => {
    linesIn(el.querySelectorAll('.wt-line-in'), el.querySelector('.wt-heading')!);
    fadeUpOnce(el.querySelectorAll('.wt-fade'));
    el.querySelectorAll<HTMLElement>('.wt-block').forEach((block) => {
      fadeUpOnce(block, 'top 85%');
      const frame = block.querySelector('.wt-media') as HTMLElement;
      if (frame && frame.querySelector('img')) frameOpen(frame, frame.querySelector('img'));
    });
  }, [data]);

  if (loading) {
    return (
      <section id="walkthrough" className="cinema bg-pine text-mist">
        <div className="mx-auto max-w-[1400px] px-5 py-28 sm:px-8">
          <div className="mx-auto h-40 max-w-2xl animate-pulse rounded-2xl bg-mist/10" />
        </div>
      </section>
    );
  }

  // No published walkthrough: render nothing at all.
  if (!data || !data.walkthrough || data.sections.length === 0) return null;

  return (
    <section
      ref={root}
      id="walkthrough"
      data-nav="dark"
      className="cinema bg-pine text-mist"
      aria-label="Property walkthrough"
    >
      <div className="mx-auto max-w-[1400px] px-5 pb-28 pt-28 sm:px-8">
        <div className="wt-fade mx-auto mb-16 max-w-3xl text-center">
          <p className="t-small uppercase tracking-[0.18em] opacity-70">Take A Look Around</p>
          <h2 className="wt-heading t-h2 mt-3">
            <Lines lines={[data.walkthrough.title || 'Property Walkthrough']} inner="wt-line-in" />
          </h2>
          {data.walkthrough.intro ? (
            <p className="t-lead mx-auto mt-5 whitespace-pre-line opacity-80">{data.walkthrough.intro}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-16 lg:gap-24">
          {data.sections.map((section, i) => (
            <SectionBlock key={section.id} section={section} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};
