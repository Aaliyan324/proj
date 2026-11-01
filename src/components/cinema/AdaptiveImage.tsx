import React, { useState } from 'react';

/**
 * Photo that always looks right. Large, well-matched photos fill the frame (cover). Small or oddly shaped photos are
 * shown whole (contain) on a soft blurred copy of themselves instead of being stretched. Broken files fall back to a
 * plain surface rather than a broken-image icon.
 */
interface Props {
  src: string; alt: string; className?: string; eager?: boolean;
  /** Responsive candidates, e.g. "/a-1280.webp 1280w, /a.webp 2560w". */
  srcSet?: string; sizes?: string;
  /** 'cover' always fills the frame (full-screen scenes). Default 'auto' shows small/odd photos whole instead of stretching them. */
  fit?: 'auto' | 'cover';
  /** Focal point for cover crops, e.g. "50% 35%". */
  position?: string;
}

export const AdaptiveImage: React.FC<Props> = ({ src, alt, className = '', eager = false, srcSet, sizes, fit = 'auto', position }) => {
  const [mode, setMode] = useState<'cover' | 'contain' | 'error'>('cover');
  const pos = /\b(absolute|fixed|sticky)\b/.test(className) ? '' : 'relative'; // never emit two competing position utilities
  return (
    <div className={`${pos} overflow-hidden bg-pine-2 ${className}`}>
      {mode === 'contain' && <img src={src} srcSet={srcSet} sizes={sizes} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-2xl" />}
      {mode !== 'error' ? (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          style={position ? { objectPosition: position } : undefined}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className={`ai-img relative h-full w-full will-change-transform ${mode === 'contain' ? 'object-contain' : 'object-cover'}`}
          onError={() => setMode('error')}
          onLoad={(e) => {
            if (fit === 'cover') return;
            const i = e.currentTarget;
            const box = i.parentElement;
            if (!box || !i.naturalWidth || !box.clientWidth || !box.clientHeight) return;
            const mismatch = Math.abs(Math.log(i.naturalWidth / i.naturalHeight / (box.clientWidth / box.clientHeight)));
            if (mismatch > 0.55 || i.naturalWidth < box.clientWidth * 0.6) setMode('contain');
          }}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-sm text-fog">Photo unavailable</div>
      )}
    </div>
  );
};
