import React from 'react';

/** Format a monetary value defensively (never crash on bad input). */
export function formatPrice(value: number, currency = 'PKR'): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${currency} ${num.toLocaleString()}`;
  }
}

/** Static star rating row (1-5). Renders nothing for 0. */
export const Stars: React.FC<{ count: number; className?: string }> = ({ count, className = '' }) => {
  const n = Math.min(Math.max(Math.round(Number(count) || 0), 0), 5);
  if (n === 0) return null;
  return (
    <span className={`inline-flex items-center text-amber-400 ${className}`} aria-label={`${n} star rating`} title={`${n} star`}>
      {Array.from({ length: n }).map((_, i) => (
        <i key={i} className="fa fa-star text-xs sm:text-sm" aria-hidden="true"></i>
      ))}
    </span>
  );
};
