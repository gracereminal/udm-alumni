// Admin dashboard KPI dialogs (reference: "Graduates Traced by Batch", "Employment Overview", "Degree-to-Career
// Alignment"). The traced and alignment dialogs list and tally GET /stats/records rows, which come from the same view
// (v_alumni_current) as every aggregate, so their counts agree with the dashboard; the overview uses /stats/* as is.
import { CATALOG, collegeById, programById } from '../data/colleges';
import { projectEmployment } from './forecast';

const N = (n) => Math.round(n || 0).toLocaleString('en-US');
const P = (x) => (x == null || Number.isNaN(x) ? '—' : `${x.toFixed(1)}%`);
const pv = (n, d) => (d ? (n / d) * 100 : null);
const thisYear = () => new Date().getFullYear();
const WORKING = ['employed', 'self_employed'];

/** Rows of GET /stats/records with their college and program names. */
export function recordRows(data) {
  return (data || []).map((r) => {
    const p = programById(r.programId);
    const c = collegeById(r.collegeId);
    return {
      ...r, college: c ? c.name : 'Unassigned college', program: p ? p.name : 'Unmapped program', abbr: p ? p.abbr : 'Unmapped',
      working: r.traced && WORKING.includes(r.employment),
    };
  });
}

/** College / program selects shared by the dialogs: values are ids, the program select needs a college first. */
function scopeSelects(colVal, courseVal) {
  const cols = CATALOG.colleges.filter((c) => c.programs.length);
  const col = cols.find((c) => String(c.id) === String(colVal)) || null;
  const course = col && col.programs.find((p) => String(p.id) === String(courseVal)) ? String(courseVal) : 'all';
  return {
    col, course,
    colVal: col ? String(col.id) : 'all', colOpts: [{ value: 'all', label: 'All colleges' }, ...cols.map((c) => ({ value: String(c.id), label: c.name, hint: c.code }))],
    courseVal: course, courseOpts: [{ value: 'all', label: col ? 'All programs' : 'Select a college first' }, ...(col ? col.programs : []).map((p) => ({ value: String(p.id), label: p.name }))],
    courseDisabled: !col, courseOpacity: col ? 1 : 0.55,
    inScope: (r) => (!col || r.collegeId === col.id) && (course === 'all' || String(r.programId) === course),
  };
}

const pager = (list, page, size) => {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const pg = Math.min(Math.max(1, page || 1), pages);
  return {
    pg, pages, slice: list.slice((pg - 1) * size, pg * size),
    note: list.length ? `Showing ${(pg - 1) * size + 1}–${Math.min(pg * size, list.length)} of ${N(list.length)}` : 'No matching records',
    prevOp: pg > 1 ? 1 : 0.4, nextOp: pg < pages ? 1 : 0.4,
  };
};

/** Saves a text file (CSV, or an HTML table Excel opens). */
function download(name, body, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], { type }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const BOM = String.fromCharCode(0xfeff);
const csvOf = (table) => `${BOM}${table.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')}`;
const xlsOf = (table) => {
  const h = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<html><head><meta charset="utf-8"></head><body><table border="1">${table.map((r, i) => `<tr>${r.map((c) => (i ? `<td>${h(c)}</td>` : `<th>${h(c)}</th>`)).join('')}</tr>`).join('')}</table></body></html>`;
};
const fmtDate = (s) => (s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—');

/**
 * Graduates Traced by Batch: survey completion (traced) against the coverage target per batch, and a batch's alumni.
 * @param rows  recordRows(), null while loading
 * @param s     { from, to, college, course, batch, tab, q, page }
 * @param set   (patch) => void
 */
export function graduatesTraced(rows, s, set, err) {
  const T = CATALOG.targets.coverage;
  const sc = scopeSelects(s.college, s.course);
  const all = rows || [];
  const YS = [...new Set(all.filter((r) => r.batch <= thisYear()).map((r) => r.batch))].sort((a, b) => b - a);
  const lo = YS.length ? Math.min(...YS) : thisYear();
  const hi = YS.length ? Math.max(...YS) : thisYear();
  let from = YS.includes(Number(s.from)) ? Number(s.from) : lo;
  let to = YS.includes(Number(s.to)) ? Number(s.to) : hi;
  if (from > to) [from, to] = [to, from];
  const elig = all.filter((r) => sc.inScope(r) && r.batch >= from && r.batch <= to);
  const tr = elig.filter((r) => r.traced).length;
  const nt = elig.length - tr;
  const cov = pv(tr, elig.length);
  const yrs = YS.filter((y) => y >= from && y <= to);
  const ST = { on: ['Met Target', '#0F6B4F', '#E6F0EB'], below: ['Below Target', '#8A4A0A', '#FFF1DC'], none: ['No records', '#64748B', '#F1F4F2'] };
  const stats = yrs.map((y) => { const e = elig.filter((r) => r.batch === y); const t = e.filter((r) => r.traced).length; return { y, e: e.length, t, c: pv(t, e.length) }; });
  const belowN = stats.filter((b) => b.c != null && b.c < T).length;
  const sel = yrs.includes(s.batch) ? s.batch : null;
  const tab = s.tab === 'untraced' ? 'untraced' : 'traced';
  const rowsOut = stats.map((b) => {
    const k = b.c == null ? 'none' : b.c < T ? 'below' : 'on';
    return {
      key: b.y, batch: `Batch ${b.y}`, ay: `AY ${b.y - 1}–${b.y}`, elig: N(b.e), tr: N(b.t), nt: N(b.e - b.t), pct: P(b.c), w: `${(b.c || 0).toFixed(1)}%`,
      bar: k === 'below' ? '#E0A915' : '#0F3D2E', st: ST[k][0], stC: ST[k][1], stBg: ST[k][2], bg: k === 'below' ? '#FFFCF6' : '#fff', cursor: b.e ? 'pointer' : 'default',
      onClick: b.e ? () => set({ batch: b.y, tab: 'traced', q: '', page: 1 }) : null,
    };
  });
  const be = sel == null ? [] : elig.filter((r) => r.batch === sel);
  const bt = be.filter((r) => r.traced);
  const bu = be.filter((r) => !r.traced);
  const bc = pv(bt.length, be.length);
  const q = (s.q || '').trim().toLowerCase();
  const list = (tab === 'traced' ? bt : bu).filter((r) => !q || `${r.name} ${r.program} ${r.abbr} ${r.college}`.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
  const pg = pager(list, s.page, 10);
  const scope = `${sc.col ? sc.col.name : 'All colleges'}${sc.course !== 'all' ? ` · ${programById(sc.course).abbr}` : ''} · ${from === to ? `Batch ${from}` : `Batches ${from}–${to}`}`;
  const table = () => (sel == null
    ? [['Graduating batch', 'Total alumni records', 'Survey completed', 'Survey not completed', 'Tracer coverage rate', 'Coverage status'],
      ...stats.map((b) => [b.y, b.e, b.t, b.e - b.t, b.c == null ? '' : `${b.c.toFixed(1)}%`, b.c == null ? 'No records' : b.c < T ? 'Below Target' : 'Met Target'])]
    : [['Alumni', 'Program', 'College', 'Batch', 'Survey status', 'Record updated'],
      ...list.map((r) => [r.name, r.program, r.college, r.batch, r.traced ? 'Survey completed' : 'Survey not completed', fmtDate(r.updatedAt)])]);
  const fname = `UDM_Graduates-Traced_${sel != null ? `Batch-${sel}_${tab === 'traced' ? 'Survey-Completed' : 'Survey-Not-Completed'}` : `${from}-${to}`}`;
  const loading = rows == null && !err;
  return {
    target: T, scope, loading, error: !!err, empty: !loading && !err && !elig.length, ready: !loading && !err && elig.length > 0,
    fromVal: String(from), toVal: String(to),
    fromOpts: YS.slice().reverse().map((y) => ({ value: String(y), label: `From Batch ${y}` })), toOpts: YS.map((y) => ({ value: String(y), label: `To Batch ${y}` })),
    onFrom: (e) => set({ from: e.target.value, batch: null, page: 1 }), onTo: (e) => set({ to: e.target.value, batch: null, page: 1 }),
    ...sc, onCol: (e) => set({ college: e.target.value, course: 'all', batch: null, page: 1 }), onCourse: (e) => set({ course: e.target.value, batch: null, page: 1 }),
    filtered: !!sc.col || from !== lo || to !== hi, reset: () => set({ college: 'all', course: 'all', from: null, to: null, batch: null, page: 1 }),
    elig: N(elig.length), tr: N(tr), nt: N(nt), cov: P(cov), covLow: cov != null && cov < T, covOk: cov != null && cov >= T,
    ntPct: `${P(pv(nt, elig.length))} of alumni records`, belowNote: belowN ? `${belowN} of ${stats.length} batches Below Target` : 'All batches Met Target',
    rows: rowsOut, hasSel: sel != null, back: () => set({ batch: null, q: '', page: 1 }),
    selLabel: sel != null ? `Batch ${sel}` : '', selAy: sel != null ? `AY ${sel - 1}–${sel}` : '', selElig: N(be.length), selTr: N(bt.length), selCov: P(bc), selW: `${(bc || 0).toFixed(1)}%`,
    selBar: bc != null && bc < T ? '#E0A915' : '#0F3D2E', selSt: bc == null ? '' : bc < T ? 'Below Target' : 'Met Target', selStC: bc != null && bc < T ? '#8A4A0A' : '#0F6B4F', selStBg: bc != null && bc < T ? '#FFF1DC' : '#E6F0EB',
    tabs: [['traced', 'Survey completed', bt.length], ['untraced', 'Survey not completed', bu.length]].map(([k, l, n]) => ({
      k, label: l, n: N(n), on: tab === k, bg: tab === k ? '#0F3D2E' : '#fff', color: tab === k ? '#fff' : '#334155', border: tab === k ? '#0F3D2E' : '#E7E9ED', nBg: tab === k ? 'rgba(255,255,255,.16)' : '#F1F4F2',
      onClick: () => set({ tab: k, page: 1 }),
    })),
    q: s.q || '', onQ: (e) => set({ q: e.target.value, page: 1 }),
    recs: pg.slice.map((r) => ({ id: r.id, name: r.name, prog: r.abbr, progFull: r.program, col: r.college, st: r.traced ? 'Survey completed' : 'Survey not completed', stC: r.traced ? '#0F6B4F' : '#8A4A0A', stBg: r.traced ? '#E6F0EB' : '#FFF1DC', upd: fmtDate(r.updatedAt) })),
    recsEmpty: sel != null && !list.length,
    recsEmptyText: q ? 'No alumni match your search.' : tab === 'traced' ? 'No alumni in this batch have completed the survey yet.' : 'Every alumni record in this batch has a completed survey.',
    pageNote: pg.note, pageL: `Page ${pg.pg} of ${pg.pages}`, prevOp: pg.prevOp, nextOp: pg.nextOp,
    prev: () => set({ page: Math.max(1, pg.pg - 1) }), next: () => set({ page: Math.min(pg.pages, pg.pg + 1) }),
    exportCsv: () => download(`${fname}.csv`, csvOf(table()), 'text/csv;charset=utf-8'),
    exportXls: () => download(`${fname}.xls`, xlsOf(table()), 'application/vnd.ms-excel'),
  };
}

/**
 * Employment Overview: section A from the dashboard statistics (status mix, rate by college / program), section B the
 * employment rate projection of lib/forecast.js.
 * @param S       GET /stats/summary
 * @param units   GET /stats/by-program rows of the dashboard scope
 * @param byBatch GET /stats/by-batch rows
 * @param o       { scopeLabel, unitLabel: 'college' | 'program', all, toggle, goStatus, goUnit(row) }
 */
export function employmentOverview(S, units, byBatch, o) {
  const DEF = [['Employed', S.wageEmployed, '#0F3D2E'], ['Self-employed', S.selfEmployed, '#F0C428'], ['Further studies', S.furtherStudies, '#2F7FC1'], ['Not yet employed', S.notEmployed, '#D9620B']];
  const known = DEF.reduce((a, d) => a + (d[1] || 0), 0);
  let acc = 0;
  const stops = DEF.map(([, n, c]) => { const a = acc; acc += known ? ((n || 0) / known) * 100 : 0; return `${c} ${a.toFixed(2)}% ${acc.toFixed(2)}%`; });
  const cmp = (units || []).filter((u) => u.laborForce > 0 && u.employmentRate != null).sort((a, b) => b.employmentRate - a.employmentRate)
    .map((u) => ({ key: u.key, name: o.unitLabel === 'batch' ? `Batch ${u.key}` : u.full || u.label, rate: P(u.employmentRate), w: `${u.employmentRate.toFixed(1)}%`, detail: `${N(u.employed)} of ${N(u.laborForce)} in the labour force`, go: () => o.goUnit(u) }));

  // Section B: actual rates (solid) and the next batches (dashed, with the likely range).
  const p = projectEmployment(byBatch, CATALOG.targets);
  const hist = p.hist.slice(-5);
  const pts = [...hist.map(([y, v]) => ({ y, v, fut: false })), ...p.ahead.map((a) => ({ y: a.y, v: a.v, fut: true }))];
  const vals = [...pts.map((x) => x.v), ...p.ahead.map((a) => a.lo), p.target];
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 5) / 10) * 10);
  const X = (i) => 46 + i * (574 / Math.max(1, pts.length - 1));
  const Y = (v) => 18 + ((100 - v) / Math.max(10, 100 - lo)) * 190;
  const pt = (i, v) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`;
  const h = hist.length - 1;
  const grid = []; for (let g = lo; g <= 100; g += 10) grid.push({ y: Y(g).toFixed(1), l: `${g}%` });
  const confC = { High: ['#0F6B4F', '#E6F0EB'], Medium: ['#0F6B4F', '#E6F0EB'], Low: ['#6B5A1E', '#F3EEE0'] }[p.conf];
  const fc = !!p.fit && hist.length > 0;
  return {
    scopeLabel: o.scopeLabel, unitLabel: o.unitLabel, unitPlural: o.unitLabel === 'batch' ? 'batches' : `${o.unitLabel}s`,
    rate: P(S.employmentRate), emp: N(S.employed), known: N(known), traced: N(S.traced), noStatus: N(Math.max(0, (S.traced || 0) - known)),
    donut: known ? `conic-gradient(${stops.join(', ')})` : '#EEF2EF',
    status: DEF.map(([label, n, color]) => ({ label, color, count: N(n), pct: known ? P(((n || 0) / known) * 100) : '—', go: o.goStatus })),
    cmp: o.all ? cmp : cmp.slice(0, 5), hasMore: cmp.length > 5, all: !!o.all, toggle: o.toggle, showN: Math.min(5, cmp.length), totN: cmp.length,
    hi: cmp[0] || null, lo: cmp.length > 1 ? cmp[cmp.length - 1] : null, hasIns: cmp.length > 1, goStatus: o.goStatus,
    fc, fcNone: `Projections appear once at least 3 batches in this view have survey responses.`,
    cards: p.ahead.map((a) => ({ yr: a.y, v: P(a.v), range: `${P(a.lo)} – ${P(a.hi)}`, conf: `${p.conf} confidence`, cc: confC[0], cb: confC[1] })),
    actualL: hist.length ? `Actual (${hist[0][0]}–${hist[h][0]})` : 'Actual', fcL: p.ahead.length ? `Forecast* (${p.ahead[0].y}–${p.ahead[p.ahead.length - 1].y})` : 'Forecast*',
    target: p.target, ty: Y(p.target).toFixed(1), grid,
    zx: fc ? X(h).toFixed(1) : '0', zw: fc ? (X(pts.length - 1) - X(h) + 30).toFixed(1) : '0',
    histLine: hist.map(([, v], i) => pt(i, v)).join(' '),
    projLine: fc ? [pt(h, hist[h][1]), ...p.ahead.map((a, i) => pt(h + 1 + i, a.v))].join(' ') : '',
    band: fc ? [pt(h, hist[h][1]), ...p.ahead.map((a, i) => pt(h + 1 + i, a.hi)), ...p.ahead.map((a, i) => pt(h + 1 + i, a.lo)).reverse()].join(' ') : '',
    dots: pts.map((x, i) => ({ key: x.y, cx: X(i).toFixed(1), cy: Y(x.v).toFixed(1), ly: (Y(x.v) - 10).toFixed(1), fill: x.fut ? '#fff' : '#0F6B4F', stroke: x.fut ? '#B8860B' : '#0F6B4F', yr: x.fut ? `${x.y}*` : String(x.y), v: P(x.v) })),
  };
}

/**
 * Degree-to-Career Alignment: course relevance of employed (traced) alumni by program, occupation and industry.
 * @param rows  recordRows(), null while loading
 * @param s     { batch, college, course, sel, allProg, selExp, selQ, selAl, selPage, q, tAl, tProg, page }
 * @param set   (patch) => void
 */
export function degreeAlignment(rows, s, set) {
  const sc = scopeSelects(s.college, s.course);
  const base = (rows || []).filter((r) => r.working && sc.inScope(r))
    .map((r) => ({ ...r, rel: r.relevance === 'related' ? 'Yes' : r.relevance === 'not_related' ? 'No' : null, job: r.job || 'Not given', ind: r.industry || 'Not given' }));
  const YS = [...new Set((rows || []).filter((r) => r.working).map((r) => r.batch))].sort((a, b) => b - a);
  const batch = YS.includes(Number(s.batch)) ? Number(s.batch) : 'all';
  const emp = base.filter((r) => batch === 'all' || r.batch === batch);
  const valid = emp.filter((r) => r.rel);
  const al = valid.filter((r) => r.rel === 'Yes').length;
  const V = valid.length;
  const na = V - al;
  const miss = emp.length - V;
  const AC = '#0F3D2E';
  const SMALL = 10;
  const top = (list, key, k) => { const m = {}; list.forEach((r) => { m[r[key]] = (m[r[key]] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, k); };

  // Programs
  const pm = {};
  valid.forEach((r) => { const o = pm[r.program] || (pm[r.program] = { p: r.program, abbr: r.abbr, c: r.college, n: 0, a: 0 }); o.n += 1; if (r.rel === 'Yes') o.a += 1; });
  const progs = Object.values(pm).map((o) => ({ ...o, v: (o.a / o.n) * 100 })).sort((a, b) => b.v - a.v || b.n - a.n);
  const selP = progs.find((o) => o.p === s.sel) || null;
  const progRows = (s.allProg ? progs : progs.slice(0, 8)).map((o) => {
    const on = !!selP && selP.p === o.p;
    return {
      key: o.p, code: o.abbr, full: o.p, pct: P(o.v), w: `${o.v.toFixed(1)}%`, color: on ? AC : '#4FA383', bg: on ? '#EEF6F2' : 'transparent', border: on ? AC : 'transparent', pressed: on,
      onClick: () => set({ sel: on ? null : o.p, selExp: false, selQ: '', selAl: 'all', selPage: 1 }),
    };
  });
  let sel = null;
  if (selP) {
    const pe = emp.filter((r) => r.program === selP.p);
    sel = {
      full: selP.p, college: selP.c, aN: N(selP.a), nN: N(selP.n - selP.a), aW: `${selP.v.toFixed(1)}%`, nW: `${(100 - selP.v).toFixed(1)}%`, aP: P(selP.v), nP: P(100 - selP.v),
      jobs: top(pe, 'job', 3).map(([t, n]) => ({ t, n: N(n) })), inds: top(pe, 'ind', 3).map(([t, n]) => ({ t, n: N(n) })),
    };
  }
  const CLS = { Yes: ['Aligned', '#0F6B4F', '#E6F0EB'], No: ['Not aligned', '#7A6328', '#F6F0E1'] };
  const exp = !!(sel && s.selExp);
  const sq = (s.selQ || '').trim().toLowerCase();
  const sAl = ['Yes', 'No'].includes(s.selAl) ? s.selAl : 'all';
  const selList = exp ? valid.filter((r) => r.program === selP.p && (sAl === 'all' || r.rel === sAl) && (!sq || `${r.name} ${r.job} ${r.ind} ${r.batch}`.toLowerCase().includes(sq)))
    .sort((a, b) => b.batch - a.batch || a.name.localeCompare(b.name)) : [];
  const sp = pager(selList, s.selPage, 8);

  // Occupations & industries
  const occ = top(emp, 'job', 8);
  const oMax = occ.length ? occ[0][1] : 1;
  const occRows = occ.map(([t, n], i) => {
    const rs = emp.filter((r) => r.job === t && r.rel);
    const a = rs.filter((r) => r.rel === 'Yes').length;
    return { rank: String(i + 1), t, n: N(n), w: `${((n / oMax) * 100).toFixed(1)}%`, rankBg: i < 3 ? AC : '#F1F4F2', rankC: i < 3 ? '#fff' : '#475569', aln: rs.length ? `${Math.round((a / rs.length) * 100)}% aligned` : '' };
  });
  const indAll = top(emp, 'ind', 999);
  const indRest = indAll.slice(7).reduce((a, x) => a + x[1], 0);
  const indList = indRest ? [...indAll.slice(0, 7), [`Other industries (${indAll.length - 7})`, indRest]] : indAll;
  const iMax = Math.max(1, ...indList.map((x) => x[1]));
  const indRows = indList.map(([t, n], i) => ({ t, n: N(n), pct: P(pv(n, emp.length)), w: `${((n / iMax) * 100).toFixed(1)}%`, color: i === 0 ? AC : '#4FA383' }));

  // Key insights: rule-based, only when the sample supports them.
  const ins = [];
  const rate = pv(al, V);
  const big = progs.filter((o) => o.n >= SMALL);
  if (V < 20) ins.push({ lead: 'Not enough responses for patterns.', text: `Only ${V} employed respondents answered course relevance in this scope. Widen the filters to see reliable comparisons.`, tone: 'n' });
  else {
    if (big.length >= 2) {
      const h = big[0];
      const l = big[big.length - 1];
      ins.push({ lead: `${h.abbr} leads on alignment.`, text: `${P(h.v)} of employed respondents work in a related field, versus ${P(rate)} overall.`, tone: 'g' });
      if (rate - l.v >= 10) ins.push({ lead: `${l.abbr} may need attention.`, text: `Alignment is ${P(l.v)}, ${(rate - l.v).toFixed(1)} pts below the scope average.`, tone: 'a' });
    }
    const recent = YS.slice().reverse().map((y) => { const v = base.filter((r) => r.batch === y && r.rel); return { y, v: v.length >= 5 ? pv(v.filter((r) => r.rel === 'Yes').length, v.length) : null }; })
      .filter((t) => t.v != null).slice(-3);
    if (recent.length >= 3) {
      const [a, , b] = recent;
      const d = b.v - a.v;
      ins.push(Math.abs(d) >= 3
        ? { lead: `Alignment ${d > 0 ? 'rose' : 'fell'} across recent batches.`, text: `From ${P(a.v)} (Batch ${a.y}) to ${P(b.v)} (Batch ${b.y}), ${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} pts.`, tone: d > 0 ? 'g' : 'a' }
        : { lead: 'Alignment is steady.', text: `Batches ${a.y}–${b.y} stay within 3 pts of each other.`, tone: 'n' });
    }
    const nRows = valid.filter((r) => r.rel === 'No');
    if (nRows.length >= 10) { const [t, n] = top(nRows, 'job', 1)[0]; ins.push({ lead: `${t} is the top non-aligned role.`, text: `${N(n)} of ${N(nRows.length)} graduates outside their field (${P((n / nRows.length) * 100)}) hold this job title.`, tone: 'n' }); }
    if (emp.length && V / emp.length < 0.9) ins.push({ lead: 'Relevance data is incomplete.', text: `${N(miss)} employed respondents skipped the course-relevance question; rates may shift as records are updated.`, tone: 'a' });
  }
  const TONE = { g: ['#0F6B4F', '#fff', '#E7E9ED', '#0F6B4F'], a: ['#8A4A0A', '#FFFAF1', '#F0D9A0', '#B4500A'], n: ['#334155', '#fff', '#E7E9ED', '#94A3B8'] };

  // Detailed breakdown
  const q = (s.q || '').trim().toLowerCase();
  const tAl = ['Yes', 'No'].includes(s.tAl) ? s.tAl : 'all';
  const tProgs = [...new Set(valid.map((r) => r.program))].sort();
  const tProg = tProgs.includes(s.tProg) ? s.tProg : 'all';
  const tRows = valid.filter((r) => (tAl === 'all' || r.rel === tAl) && (tProg === 'all' || r.program === tProg) && (!q || `${r.name} ${r.program} ${r.abbr} ${r.job} ${r.ind}`.toLowerCase().includes(q)))
    .sort((a, b) => b.batch - a.batch || a.name.localeCompare(b.name));
  const tp = pager(tRows, s.page, 10);
  const abbrOf = (p) => (valid.find((r) => r.program === p) || {}).abbr || p;
  return {
    loading: rows == null,
    chips: [sc.col ? sc.col.name : 'All colleges', sc.course !== 'all' ? programById(sc.course).abbr : 'All programs', batch !== 'all' ? `Batch ${batch}` : 'All batches'],
    filtered: !!sc.col || batch !== 'all',
    reset: () => set({ college: 'all', course: 'all', batch: 'all', sel: null, tProg: 'all', page: 1 }),
    ...sc, onCol: (e) => set({ college: e.target.value, course: 'all', sel: null, tProg: 'all', page: 1 }), onCourse: (e) => set({ course: e.target.value, sel: null, tProg: 'all', page: 1 }),
    batchVal: String(batch), batchOpts: [{ value: 'all', label: 'All batches' }, ...YS.map((y) => ({ value: String(y), label: `Batch ${y}` }))], onBatch: (e) => set({ batch: e.target.value, page: 1 }),
    alP: P(pv(al, V)), alS: `${N(al)} of ${N(V)} employed respondents`, naP: P(pv(na, V)), naS: `${N(na)} of ${N(V)} employed respondents`,
    covP: P(pv(V, emp.length)), covS: `${N(V)} of ${N(emp.length)} employed alumni answered`, hasData: V > 0,
    seg: [
      { label: 'Aligned', ans: 'Answered “Yes”', n: N(al), pct: P(pv(al, V)), w: `${(pv(al, V) || 0).toFixed(2)}%`, color: AC },
      { label: 'Not aligned', ans: 'Answered “No”', n: N(na), pct: P(pv(na, V)), w: `${(pv(na, V) || 0).toFixed(2)}%`, color: '#D4B25A' },
    ],
    miss: N(miss), v: N(V),
    progs: progRows, progMore: progs.length > 8, progToggle: () => set({ allProg: !s.allProg }), progToggleL: s.allProg ? 'Show top 8' : `Show all ${progs.length} programs`, progCount: `${progs.length} programs`,
    sel, selClose: () => set({ sel: null, selExp: false }), selToTable: () => set({ selExp: !s.selExp, selQ: '', selAl: 'all', selPage: 1 }),
    selExp: exp, selBtn: exp ? 'Show less ↑' : 'Show in detailed breakdown ↓', selQ: s.selQ || '', selOnQ: (e) => set({ selQ: e.target.value, selPage: 1 }),
    selAlVal: sAl, selOnAl: (e) => set({ selAl: e.target.value, selPage: 1 }),
    selRows: sp.slice.map((r) => ({ id: r.id, name: r.name, batch: String(r.batch), job: r.job, ind: r.ind, cls: CLS[r.rel][0], clsC: CLS[r.rel][1], clsBg: CLS[r.rel][2] })),
    selEmpty: exp && !selList.length, selPaged: sp.pages > 1, selNote: selList.length ? `${sp.note} alumni` : 'No matching alumni', selPageL: `${sp.pg} / ${sp.pages}`,
    selPrev: () => set({ selPage: Math.max(1, sp.pg - 1) }), selNext: () => set({ selPage: Math.min(sp.pages, sp.pg + 1) }), selPrevOp: sp.prevOp, selNextOp: sp.nextOp,
    occ: occRows, ind: indRows, empN: N(emp.length),
    ins: ins.map((i) => ({ lead: i.lead, text: i.text, color: TONE[i.tone][0], bg: TONE[i.tone][1], border: TONE[i.tone][2], dot: TONE[i.tone][3] })),
    insBasis: `Based on ${N(V)} recorded course-relevance responses`,
    q: s.q || '', onQ: (e) => set({ q: e.target.value, page: 1 }),
    tAlVal: tAl, onTAl: (e) => set({ tAl: e.target.value, page: 1 }),
    tProgVal: tProg, tProgOpts: [{ value: 'all', label: 'All programs in scope' }, ...tProgs.map((p) => ({ value: p, label: `${abbrOf(p)} — ${p}` }))], onTProg: (e) => set({ tProg: e.target.value, page: 1 }),
    rows: tp.slice.map((r) => ({ id: r.id, name: r.name, prog: r.abbr, progFull: r.program, batch: String(r.batch), job: r.job, ind: r.ind, cls: CLS[r.rel][0], clsC: CLS[r.rel][1], clsBg: CLS[r.rel][2] })),
    rowsEmpty: !tRows.length, pageNote: tp.note, pageL: `Page ${tp.pg} of ${tp.pages}`,
    prev: () => set({ page: Math.max(1, tp.pg - 1) }), next: () => set({ page: Math.min(tp.pages, tp.pg + 1) }), prevOp: tp.prevOp, nextOp: tp.nextOp,
    exportCsv: () => download('UDM_Degree-Alignment.csv', csvOf([
      ['Alumni', 'Program', 'College', 'Batch', 'Occupation', 'Industry', 'Job related to course', 'Alignment'],
      ...tRows.map((r) => [r.name, r.program, r.college, r.batch, r.job, r.ind, r.rel, CLS[r.rel][0]]),
    ]), 'text/csv;charset=utf-8'),
  };
}
