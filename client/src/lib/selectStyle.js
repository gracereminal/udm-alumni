const CHEVRON = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5 6 8l3.5-3.5' fill='none' stroke='%2364748B' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

/** Filter dropdown from the redesigned Admin Dashboard / Reports headers (custom chevron, 44px tall, green focus ring). */
export function selectStyle(fontSize, maxWidth, extra) {
  return {
    fontSize, fontWeight: '600', color: '#0F172A', maxWidth, appearance: 'none', WebkitAppearance: 'none', minHeight: '44px', padding: '0 40px 0 14px',
    borderRadius: '10px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#D5DBE3', backgroundColor: '#fff', backgroundImage: CHEVRON,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '12px 12px', fontFamily: 'inherit', lineHeight: '1.3',
    textOverflow: 'ellipsis', cursor: 'pointer', outline: 'none', boxShadow: '0 1px 2px rgba(16,24,40,.04)', transition: 'border-color .15s, box-shadow .15s', ...extra,
  };
}

const BORDER = '#D5DBE3';
const SHADOW = '0 1px 2px rgba(16,24,40,.04)';
const focused = (e) => document.activeElement === e.currentTarget;

/** Hover / focus behaviour for the select (the prototype's style-hover / style-focus). Spread onto the <select>. */
export const selectFx = {
  onMouseEnter: (e) => { if (!focused(e)) e.currentTarget.style.borderColor = '#9AA6B5'; },
  onMouseLeave: (e) => { if (!focused(e)) e.currentTarget.style.borderColor = BORDER; },
  onFocus: (e) => { e.currentTarget.style.borderColor = '#0F3D2E'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,61,46,.15)'; },
  onBlur: (e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = SHADOW; },
};
