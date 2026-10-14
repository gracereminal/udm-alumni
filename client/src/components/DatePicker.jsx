import { useEffect, useRef, useState } from 'react';

const G = '#0F3D2E';
const INK = '#0A0A0A';
const MUT = '#6B7280';
const LINE = 'rgba(0,0,0,.14)';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n) => String(n).padStart(2, '0');
const toIso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parseIso = (s) => {
  const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return r ? { y: +r[1], m: +r[2] - 1, d: +r[3] } : null;
};
const isoToText = (s) => {
  const p = parseIso(s);
  return p ? `${pad(p.m + 1)}/${pad(p.d)}/${p.y}` : '';
};
const valid = (y, m, d) => {
  const dt = new Date(y, m, d);
  return y >= 1900 && y <= 2100 && dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
};
const fmtDigits = (dg) => (dg.length <= 2 ? dg : dg.length <= 4 ? `${dg.slice(0, 2)}/${dg.slice(2)}` : `${dg.slice(0, 2)}/${dg.slice(2, 4)}/${dg.slice(4, 8)}`);

const navBtn = { width: 32, height: 32, border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 18, color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' };
const pill = { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: INK, padding: '6px 8px', borderRadius: 8, fontFamily: 'inherit' };
const cellBase = { border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 10, fontSize: 13 };

/* Typed (MM/DD/YYYY) + calendar date picker used by the registration and profile forms. */
export default function DatePicker({ value, onChange, invalid = false }) {
  const today = new Date();
  const sel = parseIso(value);
  const [text, setText] = useState(isoToText(value));
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('days');
  const [view, setView] = useState({ y: sel ? sel.y : today.getFullYear(), m: sel ? sel.m : today.getMonth() });
  const [yearText, setYearText] = useState(String(view.y));
  const [hover, setHover] = useState('');
  const wrap = useRef(null);
  const [pos, setPos] = useState({ side: 'left', w: 300 });

  useEffect(() => {
    if (isoToText(value) !== text && (value || text.replace(/\D/g, '').length === 8)) setText(isoToText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  useEffect(() => { setYearText(String(view.y)); }, [view.y]);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', off);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [open]);

  const measure = () => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let L = 0;
    let R = window.innerWidth;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowX + cs.overflow)) {
        const ar = a.getBoundingClientRect();
        L = Math.max(L, ar.left);
        R = Math.min(R, ar.right);
      }
    }
    const roomRight = R - r.left - 8;
    const roomLeft = r.right - L - 8;
    const side = roomRight >= 300 || roomRight >= roomLeft ? 'left' : 'right';
    setPos({ side, w: Math.max(240, Math.min(300, side === 'left' ? roomRight : roomLeft)) });
  };
  const openCal = () => {
    measure();
    const p = parseIso(value);
    setView(p ? { y: p.y, m: p.m } : { y: today.getFullYear(), m: today.getMonth() });
    setMode('days');
    setOpen(true);
  };
  const onType = (e) => {
    const dg = e.target.value.replace(/\D/g, '').slice(0, 8);
    setText(fmtDigits(dg));
    if (!dg.length) { setErr(''); onChange(''); return; }
    if (dg.length === 8) {
      const m = +dg.slice(0, 2) - 1;
      const d = +dg.slice(2, 4);
      const y = +dg.slice(4, 8);
      if (valid(y, m, d)) { setErr(''); onChange(toIso(y, m, d)); setView({ y, m }); } else setErr('Enter a valid date (MM/DD/YYYY)');
    } else setErr('');
  };
  const pick = (y, m, d) => { setText(`${pad(m + 1)}/${pad(d)}/${y}`); setErr(''); onChange(toIso(y, m, d)); setOpen(false); };
  const shift = (n) => {
    if (mode === 'days') { const dt = new Date(view.y, view.m + n, 1); setView({ y: dt.getFullYear(), m: dt.getMonth() }); }
    else if (mode === 'months') setView({ y: Math.min(2100, Math.max(1900, view.y + n)), m: view.m });
    else setView({ y: Math.min(2100, Math.max(1900, view.y + n * 12)), m: view.m });
  };
  const onYear = (e) => {
    const dg = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYearText(dg);
    if (dg.length === 4 && +dg >= 1900 && +dg <= 2100) setView({ y: +dg, m: view.m });
  };

  let body;
  if (mode === 'days') {
    const first = new Date(view.y, view.m, 1).getDay();
    const dim = new Date(view.y, view.m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const dt = new Date(view.y, view.m, i - first + 1);
      const y = dt.getFullYear();
      const m = dt.getMonth();
      const d = dt.getDate();
      const inMonth = m === view.m;
      const isSel = sel && sel.y === y && sel.m === m && sel.d === d;
      const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
      const k = `${y}-${m}-${d}`;
      cells.push(
        <button
          key={k} type="button" onClick={() => pick(y, m, d)} onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover('')}
          style={{
            ...cellBase, aspectRatio: '1', width: '100%', minHeight: 34, padding: 0, fontWeight: isSel || isToday ? 700 : 500,
            background: isSel ? G : hover === k ? 'rgba(15,61,46,.08)' : 'transparent', color: isSel ? '#fff' : inMonth ? INK : '#B4B8BF',
            boxShadow: isToday && !isSel ? `inset 0 0 0 1.5px ${G}` : 'none',
          }}
        >
          {d}
        </button>,
      );
      if (i >= 34 && i - first + 1 > dim) break;
    }
    body = (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 2, marginBottom: 4 }}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w) => (
            <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: MUT, padding: '4px 0' }}>{w}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 2 }}>{cells}</div>
      </div>
    );
  } else if (mode === 'months') {
    body = (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
        {MONTHS.map((mn, i) => {
          const on = i === view.m;
          return (
            <button key={mn} type="button" onClick={() => { setView({ y: view.y, m: i }); setMode('days'); }}
              style={{ ...cellBase, padding: '12px 4px', fontWeight: on ? 700 : 500, background: on ? G : 'rgba(0,0,0,.035)', color: on ? '#fff' : INK }}>
              {mn.slice(0, 3)}
            </button>
          );
        })}
      </div>
    );
  } else {
    const start = Math.floor(view.y / 12) * 12;
    const ys = [];
    for (let y = start; y < start + 12; y++) if (y >= 1900 && y <= 2100) ys.push(y);
    body = (
      <div>
        <input
          value={yearText} onChange={onYear} inputMode="numeric" maxLength={4} placeholder="YYYY" aria-label="Type year"
          style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${LINE}`, borderRadius: 10, padding: '9px 12px', fontSize: 13.5, fontFamily: 'inherit', marginBottom: 8, outline: 'none', background: '#FBFAF8', color: INK, letterSpacing: '.08em' }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
          {ys.map((y) => {
            const on = y === view.y;
            return (
              <button key={y} type="button" onClick={() => { setView({ y, m: view.m }); setMode('months'); }}
                style={{ ...cellBase, padding: '12px 4px', fontWeight: on ? 700 : 500, background: on ? G : 'rgba(0,0,0,.035)', color: on ? '#fff' : INK }}>
                {y}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  const label = mode === 'years' ? `${Math.floor(view.y / 12) * 12} – ${Math.floor(view.y / 12) * 12 + 11}` : null;

  return (
    <div ref={wrap} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text" value={text} onChange={onType} inputMode="numeric" maxLength={10} placeholder="MM/DD/YYYY"
          onKeyDown={(e) => { if (e.key === 'ArrowDown' && e.altKey) openCal(); }}
          style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${err || invalid ? '#DC2626' : LINE}`, borderRadius: 12, padding: '12px 46px 12px 14px', fontSize: 13.5, background: '#FBFAF8', color: INK, fontFamily: 'inherit', outline: 'none' }}
        />
        <button
          type="button" aria-label="Open calendar" onClick={() => (open ? setOpen(false) : openCal())}
          style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 34, height: 34, border: 'none', borderRadius: 9, cursor: 'pointer', background: open ? G : 'transparent', color: open ? '#fff' : G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        </button>
      </div>
      {err ? <div style={{ fontSize: 11.5, color: '#DC2626', marginTop: 5 }}>{err}</div> : null}
      {open ? (
        <div
          role="dialog"
          style={{ position: 'absolute', top: 'calc(100% + 6px)', left: pos.side === 'left' ? 0 : 'auto', right: pos.side === 'right' ? 0 : 'auto', zIndex: 60, width: pos.w, maxWidth: 'calc(100vw - 16px)', boxSizing: 'border-box', background: '#fff', border: '1px solid rgba(0,0,0,.1)', borderRadius: 16, boxShadow: '0 18px 40px -12px rgba(15,23,42,.28)', padding: 12, fontFamily: 'inherit' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginBottom: 8 }}>
            <button type="button" aria-label="Previous" onClick={() => shift(-1)} style={navBtn}>‹</button>
            {label ? (
              <button type="button" onClick={() => setMode('days')} style={pill}>{label}</button>
            ) : (
              <div style={{ display: 'flex', gap: 2 }}>
                <button type="button" onClick={() => setMode(mode === 'months' ? 'days' : 'months')} style={{ ...pill, background: mode === 'months' ? 'rgba(15,61,46,.08)' : 'transparent' }}>{MONTHS[view.m]} ▾</button>
                <button type="button" onClick={() => setMode('years')} style={pill}>{view.y} ▾</button>
              </div>
            )}
            <button type="button" aria-label="Next" onClick={() => shift(1)} style={navBtn}>›</button>
          </div>
          {body}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,.07)' }}>
            <button type="button" onClick={() => { setText(''); setErr(''); onChange(''); setOpen(false); }} style={{ ...pill, color: MUT, fontWeight: 600, fontSize: 13 }}>Clear</button>
            <button type="button" onClick={() => pick(today.getFullYear(), today.getMonth(), today.getDate())} style={{ ...pill, color: G, fontSize: 13 }}>Today</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

