// Hover / focus style helpers (replacement for the prototype's `style-hover` / `style-focus` attributes).
// They temporarily apply extra inline styles to the element and restore the previous values afterwards.

const toCamel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

function normalize(style) {
  if (!style) return null;
  if (typeof style !== 'string') return Object.keys(style).length ? style : null;
  const out = {};
  style.split(';').forEach((d) => {
    const i = d.indexOf(':');
    if (i < 0) return;
    const k = d.slice(0, i).trim();
    const v = d.slice(i + 1).trim();
    if (k && v) out[toCamel(k)] = v;
  });
  return Object.keys(out).length ? out : null;
}

function apply(el, key, style) {
  const saved = {};
  Object.keys(style).forEach((k) => { saved[k] = el.style[k]; });
  el[key] = saved;
  Object.assign(el.style, style);
}

function restore(el, key) {
  if (el[key]) { Object.assign(el.style, el[key]); el[key] = null; }
}

export function hv(style, extra) {
  const s = normalize(style);
  if (!s && !extra) return {};
  return {
    onMouseEnter: (e) => { if (s) apply(e.currentTarget, '__hover', s); if (extra && extra.enter) extra.enter(e); },
    onMouseLeave: (e) => { if (s) restore(e.currentTarget, '__hover'); if (extra && extra.leave) extra.leave(e); },
  };
}

export function fv(style) {
  const s = normalize(style);
  if (!s) return {};
  return {
    onFocus: (e) => apply(e.currentTarget, '__focus', s),
    onBlur: (e) => restore(e.currentTarget, '__focus'),
  };
}
