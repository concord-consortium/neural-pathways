import React from "react";

/**
 * One drawing per alien attribute, from the prototype's "A1 Full Figure" icon plate: the same
 * species drawn the same way everywhere, in a small scene that says what the observer saw. Each is
 * built from primitives on a 32 × 32 grid with a 1.7 stroke. The stroke is currentColor, so the
 * mark takes its parent's color. The drawings hold at 24 px and blur below about 14 px. A Map, so a
 * key only finds a drawing put here, never something on Object.prototype.
 */
const DRAWINGS = new Map<string, React.ReactNode>(Object.entries({
  voices_raised: (
    <>
      <ellipse cx="10" cy="10.6" rx="4.4" ry="5.3" />
      <path d="M7.5 6.2 5.6 2.8" />
      <path d="M12.5 6.2 14.4 2.8" />
      <circle cx="5.6" cy="2.8" r="1.1" />
      <circle cx="14.4" cy="2.8" r="1.1" />
      <path d="M10 15.9V21.7" />
      <path d="M10 17.8 6.3 20.1" />
      <path d="M10 17.8 13.7 20.1" />
      <path d="M10 21.7 7.3 27" />
      <path d="M10 21.7 12.7 27" />
      <ellipse cx="10" cy="12.6" rx="1.7" ry="1.2" />
      <path d="M19.5 11a6.8 6.8 0 0 1 0 7.4" />
      <path d="M23.2 8.6a11 11 0 0 1 0 12.2" />
      <path d="M26.9 6.2a15.2 15.2 0 0 1 0 17" />
      <path d="M2.5 27h27" />
    </>
  ),
  engaged_in_task: (
    <>
      <ellipse cx="7.5" cy="9" rx="3.6" ry="4.4" />
      <path d="M5.5 5.4 3.8 2.4" />
      <path d="M9.5 5.4 11.2 2.4" />
      <circle cx="3.8" cy="2.4" r="1.1" />
      <circle cx="11.2" cy="2.4" r="1.1" />
      <path d="M7.5 13.4v6" />
      <path d="M7.5 15.2 12.8 19.4" />
      <ellipse cx="24.5" cy="9" rx="3.6" ry="4.4" />
      <path d="M22.5 5.4 20.8 2.4" />
      <path d="M26.5 5.4 28.2 2.4" />
      <circle cx="20.8" cy="2.4" r="1.1" />
      <circle cx="28.2" cy="2.4" r="1.1" />
      <path d="M24.5 13.4v6" />
      <path d="M24.5 15.2 19.2 19.4" />
      <rect x="12.5" y="19.4" width="7" height="5.6" rx="1.2" />
      <path d="M2.5 27h27" />
    </>
  ),
  group_size: (
    <>
      <ellipse cx="6" cy="11.6" rx="3.1" ry="3.8" />
      <path d="M4.2 8.5 2.8 5.9" />
      <path d="M7.8 8.5 9.2 5.9" />
      <circle cx="2.8" cy="5.9" r="1.1" />
      <circle cx="9.2" cy="5.9" r="1.1" />
      <path d="M6 15.4V21.2" />
      <path d="M6 17.3 3.4 19.6" />
      <path d="M6 17.3 8.6 19.6" />
      <path d="M6 21.2 3.3 26.5" />
      <path d="M6 21.2 8.7 26.5" />
      <ellipse cx="13" cy="9.4" rx="3.1" ry="3.8" />
      <path d="M11.2 6.3 9.8 3.7" />
      <path d="M14.8 6.3 16.2 3.7" />
      <circle cx="9.8" cy="3.7" r="1.1" />
      <circle cx="16.2" cy="3.7" r="1.1" />
      <path d="M13 13.2V20.1" />
      <path d="M13 15.1 10.4 17.4" />
      <path d="M13 15.1 15.6 17.4" />
      <path d="M13 20.1 10.3 26.5" />
      <path d="M13 20.1 15.7 26.5" />
      <ellipse cx="20" cy="10.6" rx="3.1" ry="3.8" />
      <path d="M18.2 7.5 16.8 4.9" />
      <path d="M21.8 7.5 23.2 4.9" />
      <circle cx="16.8" cy="4.9" r="1.1" />
      <circle cx="23.2" cy="4.9" r="1.1" />
      <path d="M20 14.4V20.7" />
      <path d="M20 16.3 17.4 18.6" />
      <path d="M20 16.3 22.6 18.6" />
      <path d="M20 20.7 17.3 26.5" />
      <path d="M20 20.7 22.7 26.5" />
      <ellipse cx="27" cy="12.6" rx="3.1" ry="3.8" />
      <path d="M25.2 9.5 23.8 6.9" />
      <path d="M28.8 9.5 30.2 6.9" />
      <circle cx="23.8" cy="6.9" r="1.1" />
      <circle cx="30.2" cy="6.9" r="1.1" />
      <path d="M27 16.4V21.7" />
      <path d="M27 18.3 24.4 20.6" />
      <path d="M27 18.3 29.6 20.6" />
      <path d="M27 21.7 24.3 26.5" />
      <path d="M27 21.7 29.7 26.5" />
      <path d="M2 26.5h28" />
    </>
  ),
  near_water: (
    <>
      <ellipse cx="9.6" cy="9.2" rx="4.4" ry="5.3" />
      <path d="M7.1 4.8 5.4 1.6" />
      <path d="M12.1 4.8 13.8 1.6" />
      <circle cx="5.4" cy="1.6" r="1.1" />
      <circle cx="13.8" cy="1.6" r="1.1" />
      <path d="M9.6 14.5V21" />
      <path d="M9.6 16.4 5.9 18.7" />
      <path d="M9.6 16.4 13.3 18.7" />
      <path d="M9.6 21 6.9 27" />
      <path d="M9.6 21 12.3 27" />
      <path d="M17.5 20.5q2.2-2.5 4.4 0t4.4 0 4.4 0" />
      <path d="M17.5 25.5q2.2-2.5 4.4 0t4.4 0 4.4 0" />
    </>
  ),
  food_present: (
    <>
      <ellipse cx="8.6" cy="9.2" rx="4.4" ry="5.3" />
      <path d="M6.1 4.8 4.4 1.6" />
      <path d="M11.1 4.8 12.8 1.6" />
      <circle cx="4.4" cy="1.6" r="1.1" />
      <circle cx="12.8" cy="1.6" r="1.1" />
      <path d="M8.6 14.5V21" />
      <path d="M8.6 16.4 4.9 18.7" />
      <path d="M8.6 16.4 12.3 18.7" />
      <path d="M8.6 21 5.9 27" />
      <path d="M8.6 21 11.3 27" />
      <circle cx="19.4" cy="23.2" r="2.6" />
      <circle cx="26" cy="23.2" r="2.6" />
      <circle cx="22.7" cy="18.2" r="2.6" />
      <path d="M15 27h14" />
    </>
  ),
  resource_stressed: (
    <>
      <ellipse cx="8.6" cy="9.2" rx="4.4" ry="5.3" />
      <path d="M6.1 4.8 4.4 1.6" />
      <path d="M11.1 4.8 12.8 1.6" />
      <circle cx="4.4" cy="1.6" r="1.1" />
      <circle cx="12.8" cy="1.6" r="1.1" />
      <path d="M8.6 14.5V21" />
      <path d="M8.6 16.4 4.9 18.7" />
      <path d="M8.6 16.4 12.3 18.7" />
      <path d="M8.6 21 5.9 27" />
      <path d="M8.6 21 11.3 27" />
      <path d="M23 27V12" />
      <path d="M23 17.6 18.4 13" />
      <path d="M23 20.4 27.6 15.8" />
      <path d="M15 27h14" strokeDasharray="3 3.4" />
    </>
  ),
  gestures_repeated: (
    <>
      <ellipse cx="11" cy="10.4" rx="4.4" ry="5.3" />
      <path d="M8.5 6 6.8 2.8" />
      <path d="M13.5 6 15.2 2.8" />
      <circle cx="6.8" cy="2.8" r="1.1" />
      <circle cx="15.2" cy="2.8" r="1.1" />
      <path d="M11 15.7V21.6" />
      <path d="M11 17.6 7.3 19.9" />
      <path d="M11 17.6 14.7 19.9" />
      <path d="M11 21.6 8.3 27" />
      <path d="M11 21.6 13.7 27" />
      <path d="M11 17.8 16.8 13" />
      <path d="M20.2 11.4a6 6 0 0 1 1.8 4.4" />
      <path d="M23.6 8.6a10.4 10.4 0 0 1 3 7.4" />
      <path d="M2.5 27h27" />
    </>
  ),
  young_present: (
    <>
      <ellipse cx="9.5" cy="8.6" rx="4.2" ry="5.1" />
      <path d="M7.1 4.4 5.4 1.2" />
      <path d="M11.9 4.4 13.6 1.2" />
      <circle cx="5.4" cy="1.2" r="1.1" />
      <circle cx="13.6" cy="1.2" r="1.1" />
      <path d="M9.5 13.7V20.4" />
      <path d="M9.5 15.6 5.9 17.9" />
      <path d="M9.5 15.6 13.1 17.9" />
      <path d="M9.5 20.4 6.8 26.6" />
      <path d="M9.5 20.4 12.2 26.6" />
      <path d="M9.5 16 13.6 18.6" />
      <ellipse cx="22.5" cy="15.6" rx="2.9" ry="3.5" />
      <path d="M20.9 12.7 19.7 10.5" />
      <path d="M24.1 12.7 25.3 10.5" />
      <circle cx="19.7" cy="10.5" r="1.1" />
      <circle cx="25.3" cy="10.5" r="1.1" />
      <path d="M22.5 19.1V23" />
      <path d="M22.5 21 20 23.3" />
      <path d="M22.5 21 25 23.3" />
      <path d="M22.5 23 19.8 26.6" />
      <path d="M22.5 23 25.2 26.6" />
      <path d="M22.5 18.6 18.6 18.6" />
      <path d="M3 26.6h26" />
    </>
  ),
  carrying_burden: (
    <>
      <ellipse cx="11.6" cy="9.8" rx="4.4" ry="5.3" />
      <path d="M9.1 5.4 7.4 2.2" />
      <path d="M14.1 5.4 15.8 2.2" />
      <circle cx="7.4" cy="2.2" r="1.1" />
      <circle cx="15.8" cy="2.2" r="1.1" />
      <path d="M11.6 15.1 14.2 22.2" />
      <path d="M14.2 22.2 10.9 27.4" />
      <path d="M14.2 22.2 18 27.4" />
      <rect x="17" y="11.4" width="10" height="9" rx="1.6" />
      <path d="M12.9 14.4 17.4 12.7" />
    </>
  ),
}));

interface AlienMarkProps {
  attributeKey: string;
  /** Width and height, in pixels. */
  size: number;
}

/** The drawing for an attribute, or nothing for an attribute without one. Decorative. */
export const AlienMark: React.FC<AlienMarkProps> = ({ attributeKey, size }) => {
  const drawing = DRAWINGS.get(attributeKey);
  if (!drawing) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {drawing}
    </svg>
  );
};
