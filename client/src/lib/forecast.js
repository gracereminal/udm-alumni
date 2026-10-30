// Admin dashboard forecast: projects the per-batch results (GET /stats/by-batch) a few batches ahead with a
// least-squares linear trend. Only the batches that have data are fitted; nothing here is sent back to the server.

const thisYear = () => new Date().getFullYear();
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const N = (n) => Math.round(n || 0).toLocaleString('en-US');

/** Least-squares line through [x, y] points: slope, intercept, r² and the residual standard error. */
export function linearFit(pts) {
  const n = pts.length;
  if (n < 2) return null;
  const mx = pts.reduce((a, [x]) => a + x, 0) / n;
  const my = pts.reduce((a, [, y]) => a + y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  pts.forEach(([x, y]) => { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); syy += (y - my) ** 2; });
  if (!sxx) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const sse = pts.reduce((a, [x, y]) => a + (y - (intercept + slope * x)) ** 2, 0);
  return {
    slope, intercept, n,
    r2: syy ? 1 - sse / syy : 1,
    se: n > 2 ? Math.sqrt(sse / (n - 2)) : 0,
    at: (x) => intercept + slope * x,
  };
}

/** High / Medium / Low, from how many batches were fitted and how well the line fits them. */
export function confidence(fit) {
  if (!fit || fit.n < 3) return 'Low';
  if (fit.n >= 6 && fit.r2 >= 0.6) return 'High';
  if (fit.n >= 4 && fit.r2 >= 0.3) return 'Medium';
  return 'Low';
}

/** Least batches with data before a metric is projected. */
export const MIN_BATCHES = 3;
/** Batches ahead that are projected. */
export const HORIZON = 3;
/** Latest batches with data that the trend is fitted to. */
const WINDOW = 8;

const METRICS = [
  { id: 'emp', label: 'Employment rate', unit: '%', rate: true, target: 'employment', value: (r) => (r.laborForce > 0 ? r.employmentRate : null) },
  { id: 'cov', label: 'Survey coverage', unit: '%', rate: true, target: 'coverage', value: (r) => (r.total > 0 ? r.coverage : null) },
  { id: 'aligned', label: 'Degree-aligned jobs', unit: '%', rate: true, value: (r) => (r.employed > 0 ? r.alignedRate : null) },
  { id: 'records', label: 'Alumni records per batch', unit: '', rate: false, value: (r) => (r.total > 0 ? r.total : null) },
];

/** One metric's history (latest WINDOW batches with data), its fit and the next HORIZON batches. */
function project(m, rows, targets) {
  const hist = rows
    .map((r) => [r.key, m.value(r)])
    .filter(([y, v]) => y != null && y <= thisYear() && v != null)
    .sort((a, b) => a[0] - b[0])
    .slice(-WINDOW);
  const fit = hist.length >= MIN_BATCHES ? linearFit(hist) : null;
  const last = hist.length ? hist[hist.length - 1][0] : thisYear();
  const lim = (v) => (m.rate ? clamp(v, 0, 100) : Math.max(0, v));
  const ahead = fit
    ? Array.from({ length: HORIZON }, (_, i) => {
      const y = last + i + 1;
      const v = fit.at(y);
      // A rough 80% band: ±1.28 residual standard errors.
      return { y, v: lim(v), lo: lim(v - 1.28 * fit.se), hi: lim(v + 1.28 * fit.se) };
    })
    : [];
  const target = m.target ? targets[m.target] : null;
  return { ...m, hist, fit, ahead, target, conf: confidence(fit) };
}

/** The first future batch where the trend crosses the target, or null when it doesn't within 10 batches. */
function crossing(p) {
  if (!p.fit || p.target == null || !p.fit.slope) return null;
  const [lastY] = p.hist[p.hist.length - 1];
  const now = p.fit.at(lastY);
  const up = p.fit.slope > 0;
  if (up ? now >= p.target : now < p.target) return null;
  const y = Math.ceil((p.target - p.fit.intercept) / p.fit.slope);
  return y > lastY && y <= lastY + 10 ? { y, up } : null;
}

const fmt = (p, v) => (p.rate ? `${v.toFixed(1)}%` : N(v));
const trendText = (p) => {
  const s = p.fit.slope;
  const a = Math.abs(s);
  if (a < (p.rate ? 0.1 : 0.5)) return 'Flat';
  return `${s > 0 ? '↑' : '↓'} ${p.rate ? `${a.toFixed(1)} pts` : N(a)} / batch`;
};

/** The employment rate projection alone (history, fit, next batches), for the Employment Overview dialog. */
export const projectEmployment = (rows, targets) => project(METRICS[0], rows || [], targets);

/**
 * The props the forecast panel renders, from the by-batch rows.
 * @param rows     GET /stats/by-batch `data` (one row per batch, keyed by batch year)
 * @param targets  CATALOG.targets ({ employment, coverage })
 */
export function buildForecast(rows, targets) {
  const ps = METRICS.map((m) => project(m, rows || [], targets));
  const tone = { r: ['#E5484D', '#C2344F', '#FDF2F4', '#F8DFE4'], y: ['#F0C428', '#8A6D1F', '#FDF9EE', '#F5E9CE'], g: ['#12A36F', '#0F6B4F', '#F0FAF4', '#D8EFE1'] };

  const tiles = ps.map((p) => {
    if (!p.fit) return { id: p.id, label: p.label, value: '—', sub: `Needs ${MIN_BATCHES} batches with data (has ${p.hist.length})`, trend: '', trendColor: '#94A3B8', trendBg: '#F1F5F9', conf: '', ready: false };
    const next = p.ahead[0];
    const s = p.fit.slope;
    const good = s >= 0;
    const flat = trendText(p) === 'Flat';
    return {
      id: p.id, label: p.label, ready: true,
      value: fmt(p, next.v),
      sub: `Batch ${next.y} · range ${fmt(p, next.lo)} – ${fmt(p, next.hi)}`,
      trend: trendText(p),
      trendColor: flat ? '#475569' : good ? '#0F6B4F' : '#B3213C',
      trendBg: flat ? '#F1F5F9' : good ? '#E1F3EA' : '#FDE7EC',
      conf: `${p.conf} confidence · ${p.hist.length} batches`,
    };
  });

  const ins = [];
  ps.filter((p) => p.fit && p.target != null).forEach((p) => {
    const c = crossing(p);
    const end = p.ahead[p.ahead.length - 1];
    if (c && c.up) ins.push([`${p.label} on track to reach the ${p.target}% target`, `by about batch ${c.y}, rising ${Math.abs(p.fit.slope).toFixed(1)} pts a batch.`, 'g']);
    else if (c) ins.push([`${p.label} may fall below the ${p.target}% target`, `around batch ${c.y} if the current decline of ${Math.abs(p.fit.slope).toFixed(1)} pts a batch continues.`, 'r']);
    else if (end.v < p.target) ins.push([`${p.label} stays below the ${p.target}% target`, `through batch ${end.y} (projected ${end.v.toFixed(1)}%) at the current trend.`, p.fit.slope > 0 ? 'y' : 'r']);
    else ins.push([`${p.label} holds above the ${p.target}% target`, `through batch ${end.y} (projected ${end.v.toFixed(1)}%).`, 'g']);
  });
  const rec = ps.find((p) => p.id === 'records');
  if (rec.fit) {
    const next = rec.ahead[0];
    ins.push([`About ${N(next.v)} alumni records expected for batch ${next.y}`, `— plan survey outreach for roughly ${N(next.v * (targets.coverage / 100))} responses to meet the ${targets.coverage}% coverage target.`, 'y']);
  }
  if (!ins.length) ins.push(['Not enough history to forecast yet.', `Projections appear once at least ${MIN_BATCHES} batches in this view have survey responses.`, 'y']);

  return {
    tiles,
    chart: chartOf(ps.find((p) => p.id === 'emp')),
    insights: ins.slice(0, 4).map(([lead, text, k]) => ({ lead, text, color: tone[k][0], leadColor: tone[k][1], bg: tone[k][2], border: tone[k][3] })),
    ready: ps.some((p) => p.fit),
  };
}

/** SVG geometry for the employment rate chart: history (solid), projection (dashed), its band and the target line. */
function chartOf(p) {
  if (!p.fit) return null;
  const W = 640;
  const H = 220;
  const pad = { l: 40, r: 16, t: 14, b: 28 };
  const all = [...p.hist.map(([y]) => y), ...p.ahead.map((a) => a.y)];
  const x0 = all[0];
  const x1 = all[all.length - 1];
  const vals = [...p.hist.map(([, v]) => v), ...p.ahead.flatMap((a) => [a.lo, a.hi]), p.target];
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 5) / 10) * 10);
  const hi = Math.min(100, Math.ceil((Math.max(...vals) + 5) / 10) * 10);
  const X = (y) => pad.l + ((y - x0) / Math.max(1, x1 - x0)) * (W - pad.l - pad.r);
  const Y = (v) => pad.t + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - pad.t - pad.b);
  const line = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
  const lastH = p.hist[p.hist.length - 1];
  const band = [[lastH[0], lastH[1], lastH[1]], ...p.ahead.map((a) => [a.y, a.lo, a.hi])];
  return {
    W, H,
    hist: line(p.hist),
    proj: line([lastH, ...p.ahead.map((a) => [a.y, a.v])]),
    band: `${band.map(([x, , h], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(h).toFixed(1)}`).join(' ')} ${band.slice().reverse().map(([x, l]) => `L${X(x).toFixed(1)},${Y(l).toFixed(1)}`).join(' ')} Z`,
    targetY: Y(p.target), target: p.target,
    grid: [lo, (lo + hi) / 2, hi].map((v) => ({ y: Y(v), label: `${Math.round(v)}%` })),
    points: [
      ...p.hist.map(([y, v]) => ({ x: X(y), y: Y(v), proj: false, title: `Batch ${y}`, value: `${v.toFixed(1)}% employed (actual)` })),
      ...p.ahead.map((a) => ({ x: X(a.y), y: Y(a.v), proj: true, title: `Batch ${a.y} (forecast)`, value: `${a.v.toFixed(1)}% · range ${a.lo.toFixed(1)}–${a.hi.toFixed(1)}%` })),
    ],
    xLabels: all.filter((_, i) => all.length <= 8 || i % 2 === 0 || i === all.length - 1).map((y) => ({ x: X(y), label: String(y), proj: y > lastH[0] })),
    splitX: X(lastH[0]),
  };
}
