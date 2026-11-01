import React from 'react';

/** Hand-split lines (no text-measuring surprises): each line sits in a mask so it can slide up into view. */
export const Lines: React.FC<{ lines: string[]; inner: string }> = ({ lines, inner }) => (
  <>
    {lines.map((line) => (
      <span key={line} className="rr-line">
        <span className={`rr-line-in ${inner}`}>{line}</span>
      </span>
    ))}
  </>
);
