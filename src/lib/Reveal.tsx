/**
 * Reveal — the project's single scroll-triggered entrance primitive.
 *
 * Wraps children and fades/slides them in once when scrolled into view.
 *  - Honors prefers-reduced-motion: children render fully visible, no tween.
 *  - If GSAP/ScrollTrigger ever fail, content is still visible (animations are
 *    applied via gsap.fromTo at runtime, never via CSS that hides by default).
 *  - Uses transforms + opacity only (GPU friendly, no layout thrash).
 */
import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { prefersReducedMotion } from './motion';

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface RevealProps {
  children: React.ReactNode;
  /** Set to a child selector (e.g. "> div") to stagger direct children. */
  stagger?: number;
  /** Vertical travel distance in px. */
  y?: number;
  /** Seconds. */
  duration?: number;
  /** Render element; div by default. */
  as?: 'div' | 'section' | 'ul' | 'li' | 'header';
  className?: string;
  id?: string;
  /** Trigger slightly before the element enters, for a calmer pace. */
  start?: string;
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  stagger = 0,
  y = 28,
  duration = 0.7,
  as: Tag = 'div',
  className,
  id,
  start = 'top 88%',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return; // content stays visible, untouched
      const el = containerRef.current;
      if (!el) return;

      const targets = stagger > 0 ? Array.from(el.children) : el;

      gsap.fromTo(
        targets,
        { autoAlpha: 0, y },
        {
          autoAlpha: 1,
          y: 0,
          duration,
          ease: 'power2.out',
          stagger,
          clearProps: 'transform',
          scrollTrigger: { trigger: el, start, once: true },
        }
      );
    },
    { scope: containerRef }
  );

  return (
    <Tag ref={containerRef as any} id={id} className={className}>
      {children}
    </Tag>
  );
};
