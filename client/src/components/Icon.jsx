/** Stroke icon on a 24×24 grid — the sidebar's icon style. Pass a path `d`, or SVG children. */
export default function Icon({ d, size = 19, children }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }} aria-hidden="true">
      {d ? <path d={d} /> : children}
    </svg>
  );
}
