// Alumni-tracer analytics: deterministic demo statistics per course & batch, plus the aggregations
// used by the Admin dashboard, College dashboard and Reports (ported from the prototype).
import { COLLEGES } from '../data/colleges';
import { progCode, progCollege } from './colleges';

export const colleges = () => COLLEGES;
export const collegeNames = () => Object.keys(COLLEGES).filter((k) => COLLEGES[k].length);

export function repAbbr(s) {
  if (progCollege(s)) return progCode(s);
  if (s === 'Juris Doctor') return 'JD';
  const par = s.match(/\(([A-Za-z]+)\)/);
  if (par) return par[1];
  const gm = s.match(/^(PhD|MAEd|MS) in (.+)$/);
  if (gm) return `${gm[1]}-${gm[2].split(' ').filter((x) => !['of', 'in', 'and'].includes(x)).map((x) => x[0]).join('')}`;
  const ini = (w) => w.split(' ').filter((x) => !['of', 'in', 'and'].includes(x)).map((x) => x[0]).join('');
  const [main, major] = s.split(' Major in ');
  return ini(main) + (major ? `-${ini(major)}` : '');
}

/** Deterministic pseudo-random statistics for a course + graduating year. */
export function repStat(course, y) {
  let h = 2166136261;
  const k = `${course}|${y}`;
  for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619);
  const r = () => { h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return ((h >>> 0) % 10000) / 10000; };
  const age = 2026 - y;
  const g = 36 + Math.round(r() * 104);
  const t = Math.round(g * Math.min(0.82, 0.46 + age * 0.055 + r() * 0.08));
  const e = Math.round(t * Math.min(0.96, 0.64 + age * 0.045 + r() * 0.14));
  const rl = Math.round(e * (0.55 + r() * 0.36));
  const m = 1.6 + r() * 3;
  return { g, t, e, rl, m };
}

export function repSum(pairs) {
  const o = { g: 0, t: 0, e: 0, rl: 0, mw: 0 };
  pairs.forEach(([c, y]) => { const s = repStat(c, y); o.g += s.g; o.t += s.t; o.e += s.e; o.rl += s.rl; o.mw += s.m * s.e; });
  o.emp = o.t ? (o.e / o.t) * 100 : 0;
  o.rel = o.e ? (o.rl / o.e) * 100 : 0;
  o.cov = o.g ? (o.t / o.g) * 100 : 0;
  o.m = o.e ? o.mw / o.e : 0;
  return o;
}

export function repSectorProfile(c) {
  const P = [
    [/Information Technology|Computer/, 'IT-BPM', 'Banking & finance'], [/Nursing|Physical Therapy/, 'Healthcare', 'Government'], [/Criminology|Juris/, 'Legal & public safety', 'Government'],
    [/Education/, 'Education', 'Government'], [/Public Administration/, 'Government', 'Banking & finance'], [/Hospitality|Marketing/, 'Retail & services', 'IT-BPM'],
    [/Business/, 'Banking & finance', 'IT-BPM'], [/Communication/, 'Media & services', 'IT-BPM'], [/Political|Social Work/, 'Government', 'Education'], [/Psychology/, 'Healthcare', 'IT-BPM'],
  ];
  const m = P.find((x) => x[0].test(c)) || [null, 'Retail & services', 'Government'];
  return { [m[1]]: 0.56, [m[2]]: 0.22, Others: 0.22 };
}

/** Resolve a college/course selection into a scope object. */
export function resolveScope(college, course) {
  const cols = COLLEGES;
  const names = collegeNames();
  const col = names.includes(college) ? college : 'all';
  const courses = col === 'all' ? [] : cols[col];
  const crs = courses.includes(course) ? course : 'all';
  const label = crs !== 'all' ? crs : col !== 'all' ? col : 'All colleges';
  return { cols, names, college: col, course: crs, courses, label };
}

export const REPORT_TYPES = [
  { id: 'ched', name: 'UDM Alumni Survey — Form A', desc: 'Mandated institutional submission covering employment status, relevance of degree and months before first job, batches 2022–2026.', cadence: 'Annual', runs: 'Due Nov 30 · last run Aug 28, 2026' },
  { id: 'employability', name: 'Employability by Program', desc: 'Per-program employment rate against the university target, with batch-on-batch movement.', cadence: 'Quarterly', runs: 'Last run Sep 01, 2026' },
  { id: 'coverage', name: 'Batch Coverage Audit', desc: 'Traced versus total graduates for each batch, with unreached counts for follow-up.', cadence: 'Monthly', runs: 'Last run Sep 14, 2026' },
  { id: 'employer', name: 'Employer & Industry Distribution', desc: 'Where graduates are absorbed, by industry sector — employer counts only, no named alumni.', cadence: 'On demand', runs: 'Last run Jul 22, 2026' },
  { id: 'inclusion', name: 'Inclusion Profile — IP & PWD', desc: 'Indigenous Peoples and Persons with Disability (Yes / No) among respondents, with employment outcomes per group. Aggregated counts only.', cadence: 'Annual', runs: 'Last run Sep 20, 2026' },
];

/** Data for one report template within a scope (KPIs, chart bars, table, findings). */
export function repData(id, sc) {
  const YRS = [2022, 2023, 2024, 2025, 2026];
  const allCourses = sc.course !== 'all' ? [sc.course] : sc.college !== 'all' ? sc.courses : sc.names.flatMap((n) => sc.cols[n]);
  const pairs = (cs, ys) => cs.flatMap((c) => (ys || YRS).map((y) => [c, y]));
  const tot = repSum(pairs(allCourses));
  const level = sc.course !== 'all' ? 'batch' : sc.college !== 'all' ? 'course' : 'college';
  const units = level === 'college' ? sc.names.map((n) => ({ label: repAbbr(n), full: n, s: repSum(pairs(sc.cols[n])) }))
    : level === 'course' ? sc.courses.map((c) => ({ label: repAbbr(c), full: c, s: repSum(pairs([c])) }))
      : YRS.map((y) => ({ label: String(y), full: `Batch ${y}`, s: repSum(pairs(allCourses, [y])) }));
  const byBatch = YRS.map((y) => ({ label: String(y), s: repSum(pairs(allCourses, [y])) }));
  const unitHead = level === 'college' ? 'College' : level === 'course' ? 'Program' : 'Batch';
  const N = (n) => Math.round(n).toLocaleString('en-US');
  const P = (n) => `${n.toFixed(1)}%`;
  const best = (arr, f) => arr.reduce((a, b) => (f(b) > f(a) ? b : a));
  const worst = (arr, f) => arr.reduce((a, b) => (f(b) < f(a) ? b : a));
  const fileScope = sc.course !== 'all' ? repAbbr(sc.course) : sc.college !== 'all' ? repAbbr(sc.college) : 'All';
  const base = { records: N(tot.t), unitHead, scope: sc.label };
  const plural = unitHead.toLowerCase() + (level === 'batch' ? 'es' : 's');
  if (id === 'employability') {
    const above = units.filter((u) => u.s.emp >= 80);
    const b = best(units, (u) => u.s.emp);
    const w = worst(units, (u) => u.s.emp);
    return {
      ...base, file: `UDM_Employability_${fileScope}`,
      kpis: [{ label: 'Employment rate', value: P(tot.emp), sub: 'target 80%' }, { label: 'Above target', value: `${above.length} of ${units.length}`, sub: plural }, { label: 'Highest', value: P(b.s.emp), sub: b.label }, { label: 'Lowest', value: P(w.s.emp), sub: w.label }],
      chartTitle: `Employment rate by ${unitHead.toLowerCase()}`, chartNote: level === 'batch' ? sc.label : 'Batches 2022–2026 combined', unit: '%', target: 80,
      bars: units.map((u) => [u.label, u.s.emp]),
      tableTitle: `Employability by ${unitHead.toLowerCase()}`, grid: '1.4fr 1fr 1fr 1fr 1fr',
      cols: [unitHead, 'Traced', 'Employed', 'Unemployed', 'Rate'],
      rows: units.map((u) => [u.label, N(u.s.t), N(u.s.e), N(u.s.t - u.s.e), P(u.s.emp)]),
      findings: [`${above.length} of ${units.length} ${plural} meet the 80% employment target.`, `${b.full} has the highest employment rate at ${P(b.s.emp)}.`, `${w.full} trails at ${P(w.s.emp)}${w.s.emp < 80 ? ' — below target and a candidate for placement support.' : '.'}`],
    };
  }
  if (id === 'coverage') {
    const b = best(byBatch, (u) => u.s.cov);
    const w = worst(byBatch, (u) => u.s.cov);
    const lowU = worst(units, (u) => u.s.cov);
    return {
      ...base, file: `UDM_Batch-Coverage_${fileScope}`,
      kpis: [{ label: 'Overall coverage', value: P(tot.cov), sub: `${N(tot.t)} of ${N(tot.g)} graduates` }, { label: 'Unreached', value: N(tot.g - tot.t), sub: 'need follow-up' }, { label: 'Highest', value: P(b.s.cov), sub: `Batch ${b.label}` }, { label: 'Lowest', value: P(w.s.cov), sub: `Batch ${w.label}` }],
      chartTitle: 'Survey coverage by batch', chartNote: 'Traced ÷ total graduates', unit: '%', target: 60,
      bars: byBatch.map((u) => [u.label, u.s.cov]),
      tableTitle: 'Coverage by batch', grid: '1fr 1fr 1fr 1fr 1fr',
      cols: ['Batch', 'Graduates', 'Traced', 'Coverage', 'Unreached'],
      rows: [...byBatch.map((u) => [u.label, N(u.s.g), N(u.s.t), P(u.s.cov), N(u.s.g - u.s.t)]), ['Total', N(tot.g), N(tot.t), P(tot.cov), N(tot.g - tot.t)]],
      findings: [`${byBatch.filter((u) => u.s.cov < 60).length} of 5 batches sit below the 60% working coverage threshold.`, `Batch ${w.label} has the most room to improve, with ${N(w.s.g - w.s.t)} graduates unreached.`, level === 'batch' ? 'Prioritise survey reminders for recent batches before the Nov 30 Form A deadline.' : `${lowU.full} has the lowest coverage (${P(lowU.s.cov)}) — prioritise reminders there.`],
    };
  }
  if (id === 'employer') {
    const sec = {};
    const top = {};
    allCourses.forEach((c) => {
      const e = repSum(pairs([c])).e;
      const pr = repSectorProfile(c);
      Object.keys(pr).forEach((k) => { sec[k] = (sec[k] || 0) + e * pr[k]; (top[k] = top[k] || []).push([c, e * pr[k]]); });
    });
    const list = Object.keys(sec).map((k) => ({ k, n: sec[k], share: (sec[k] / tot.e) * 100 })).sort((a, b) => (a.k === 'Others') - (b.k === 'Others') || b.n - a.n);
    const lead = list[0];
    return {
      ...base, records: N(tot.e), file: `UDM_Employer-Industry_${fileScope}`,
      kpis: [{ label: 'Employed respondents', value: N(tot.e), sub: 'batches 2022–2026' }, { label: 'Distinct employers', value: N(tot.e * 0.26), sub: 'self-reported' }, { label: 'Top sector', value: P(lead.share), sub: lead.k }, { label: 'Sectors', value: String(list.length), sub: 'represented' }],
      chartTitle: 'Share of employed alumni by sector', chartNote: 'Percent of employed respondents', unit: '%', target: null,
      bars: list.map((s) => [s.k, s.share]),
      tableTitle: 'Sector detail', grid: '1.4fr .9fr .8fr 1.3fr',
      cols: ['Sector', 'Alumni', 'Share', 'Top programs'],
      rows: list.map((s) => [s.k, N(s.n), P(s.share), top[s.k].sort((a, b) => b[1] - a[1]).slice(0, 2).map((x) => repAbbr(x[0])).join(', ')]),
      findings: [`${lead.k} is the largest absorber of graduates in this scope at ${P(lead.share)}.`, 'Sector mix is derived from the industry declared in each alumni record.', 'Counts are aggregated by sector; no employer or alumni names are exported.'],
    };
  }
  if (id === 'inclusion') {
    const inc = (u) => {
      const k = u.full || u.label;
      let h = 7;
      for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
      return { ip: Math.round(u.s.t * (0.025 + ((h % 100) / 100) * 0.035)), pwd: Math.round(u.s.t * (0.012 + (((h >>> 8) % 100) / 100) * 0.022)) };
    };
    const ur = units.map((u) => ({ ...u, ...inc(u) }));
    const t = Math.max(1, tot.t);
    const ip = ur.reduce((a, u) => a + u.ip, 0);
    const pwd = ur.reduce((a, u) => a + u.pwd, 0);
    const ipEmp = Math.max(40, tot.emp - 6.4);
    const pwdEmp = Math.max(35, tot.emp - 11.8);
    const nonEmp = (n, r) => (t - n ? ((tot.e - (n * r) / 100) / (t - n)) * 100 : 0);
    const topIp = best(ur, (u) => u.ip / Math.max(1, u.s.t));
    const topPwd = best(ur, (u) => u.pwd / Math.max(1, u.s.t));
    const pc = (n) => P((n / t) * 100);
    return {
      ...base, file: `UDM_Inclusion-IP-PWD_${fileScope}`,
      kpis: [{ label: 'Indigenous — Yes', value: N(ip), sub: `${pc(ip)} of respondents` }, { label: 'Indigenous — No', value: N(t - ip), sub: `${pc(t - ip)} of respondents` }, { label: 'PWD — Yes', value: N(pwd), sub: `${pc(pwd)} of respondents` }, { label: 'PWD — No', value: N(t - pwd), sub: `${pc(t - pwd)} of respondents` }],
      chartTitle: 'Employment rate by inclusion group', chartNote: 'Share of respondents employed', unit: '%', target: 80,
      bars: [['IP — Yes', ipEmp], ['IP — No', nonEmp(ip, ipEmp)], ['PWD — Yes', pwdEmp], ['PWD — No', nonEmp(pwd, pwdEmp)], ['All', tot.emp]],
      tableTitle: `IP & PWD respondents by ${unitHead.toLowerCase()}`, grid: '1.4fr 1fr .8fr .8fr .8fr .8fr',
      cols: [unitHead, 'Respondents', 'IP Yes', 'IP No', 'PWD Yes', 'PWD No'],
      rows: [...ur.map((u) => [u.label, N(u.s.t), N(u.ip), N(u.s.t - u.ip), N(u.pwd), N(u.s.t - u.pwd)]), ['Total', N(tot.t), N(ip), N(tot.t - ip), N(pwd), N(tot.t - pwd)]],
      findings: [`${pc(ip)} of respondents identify as members of an Indigenous People group; ${pc(pwd)} are Persons with Disability.`,
        `PWD respondents trail non-PWD peers on employment by ${(nonEmp(pwd, pwdEmp) - pwdEmp).toFixed(1)} pts — a candidate for targeted placement and accommodation support.`,
        `${topIp.full} has the highest IP share (${P((topIp.ip / Math.max(1, topIp.s.t)) * 100)}); ${topPwd.full} has the highest PWD share (${P((topPwd.pwd / Math.max(1, topPwd.s.t)) * 100)}).`],
    };
  }
  const meet = byBatch.filter((u) => u.s.emp >= 80).length;
  const b = best(units, (u) => u.s.emp);
  const lr = worst(units, (u) => u.s.rel);
  return {
    ...base, file: `UDM_Form-A_${fileScope}`,
    kpis: [{ label: 'Employment rate', value: P(tot.emp), sub: 'of traced respondents' }, { label: 'Degree-relevant', value: P(tot.rel), sub: 'of employed respondents' }, { label: 'Months Before First Job', value: `${tot.m.toFixed(1)} mo`, sub: 'average, from graduation' }, { label: 'Respondents', value: N(tot.t), sub: `${Math.round(tot.cov)}% response rate` }],
    chartTitle: 'Employment rate by graduating batch', chartNote: 'Share of respondents employed', unit: '%', target: 80,
    bars: byBatch.map((u) => [u.label, u.s.emp]),
    tableTitle: `${unitHead} breakdown`, grid: '1.4fr 1fr 1fr 1fr 1fr',
    cols: [unitHead, 'Respondents', 'Employed', 'Degree-relevant', 'Time to 1st job'],
    rows: units.map((u) => [u.label, N(u.s.t), P(u.s.emp), P(u.s.rel), `${u.s.m.toFixed(1)} mo`]),
    findings: [`${meet} of 5 batches meet the 80% employment target; Batch 2026 is still within its first year after graduation.`, `${b.full} leads on employment at ${P(b.s.emp)}.`, `${lr.full} has the lowest degree-relevant rate (${P(lr.s.rel)}) — a candidate for curriculum and placement review.`],
  };
}

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** HTML body of an exported report (PDF print / Excel). */
export function repDocHtml(t, d, secs, nowLabel) {
  const max = Math.max(...d.bars.map((b) => b[1]));
  let h = `<div style="border-bottom:2px solid #0F3D2E;padding-bottom:10px;margin-bottom:18px"><div style="font-size:9pt;color:#64748B;text-transform:uppercase;letter-spacing:.06em">UDM Alumni Relations Office</div><h1 style="font-size:18pt;margin:4px 0">${esc(t.name)}</h1><div style="font-size:9.5pt;color:#64748B">${esc(d.scope)} · Batches 2022–2026 · ${d.records} verified records · generated ${esc(nowLabel)}</div></div>`;
  if (secs.kpi) h += `<table style="margin-bottom:18px"><tr>${d.kpis.map((k) => `<td style="vertical-align:top;border:1px solid #E2E5EA"><div style="font-size:8.5pt;color:#64748B;text-transform:uppercase">${esc(k.label)}</div><div style="font-size:16pt;font-weight:700">${esc(k.value)}</div><div style="font-size:8.5pt;color:#64748B">${esc(k.sub)}</div></td>`).join('')}</tr></table>`;
  if (secs.chart) h += `<h3>${esc(d.chartTitle)}</h3><table style="margin-bottom:18px">${d.bars.map((b) => `<tr><td style="width:22%">${esc(b[0])}</td><td><div style="height:12px;background:#0F3D2E;width:${((b[1] / max) * 100).toFixed(1)}%"></div></td><td style="width:12%;text-align:right;font-weight:700">${b[1].toFixed(1)}${d.unit}</td></tr>`).join('')}</table>`;
  if (secs.table) h += `<h3>${esc(d.tableTitle)}</h3><table style="margin-bottom:18px"><tr>${d.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${d.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
  if (secs.findings) h += `<h3>Key findings</h3><ul>${d.findings.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`;
  h += '<p style="font-size:8.5pt;color:#94A3B8;margin-top:24px">Aggregated institutional metrics only — no names, Membership IDs or contact details (RA 10173).</p>';
  return h;
}

const PRINT_CSS = '@page{size:A4;margin:16mm}body{font-family:Inter,system-ui,sans-serif;color:#0B1220;font-size:10.5pt}h3{font-size:12pt;margin:0 0 8px}table{border-collapse:collapse;width:100%}th,td{padding:6px 8px;border-bottom:1px solid #E2E5EA;text-align:left}th{font-size:8.5pt;text-transform:uppercase;color:#64748B;background:#F4F8F6}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}';

/** Download (CSV / Excel) or print (PDF) a report. Returns the file name. */
export function exportReport(typeId, fmt, sc, secs, nowLabel) {
  const t = REPORT_TYPES.find((x) => x.id === typeId) || REPORT_TYPES[0];
  const d = repData(t.id, sc);
  const ext = fmt === 'PDF' ? 'pdf' : fmt === 'Excel' ? 'xls' : 'csv';
  const name = `${d.file}_2022-2026.${ext}`;
  const dl = (blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  if (fmt === 'CSV') {
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const L = [[t.name], ['UDM Alumni Relations Office'], ['Scope', `${d.scope} · Batches 2022–2026 · ${d.records} verified records · aggregated`], []];
    if (secs.kpi) { L.push(['Indicator', 'Value', 'Note']); d.kpis.forEach((k) => L.push([k.label, k.value, k.sub])); L.push([]); }
    if (secs.chart) { L.push([d.chartTitle, `Value (${d.unit})`]); d.bars.forEach((b) => L.push([b[0], b[1]])); L.push([]); }
    if (secs.table) { L.push(d.cols); d.rows.forEach((r) => L.push(r)); L.push([]); }
    if (secs.findings) { L.push(['Key findings']); d.findings.forEach((f) => L.push([f])); }
    dl(new Blob([`\uFEFF${L.map((r) => r.map(q).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' }));
    return name;
  }
  const body = repDocHtml(t, d, secs, nowLabel);
  if (fmt === 'Excel') { dl(new Blob([`\uFEFF<html><head><meta charset="utf-8"></head><body>${body}</body></html>`], { type: 'application/vnd.ms-excel' })); return name; }
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  const doc = f.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${name.replace('.pdf', '')}</title><style>${PRINT_CSS}</style></head><body>${body}</body></html>`);
  doc.close();
  setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch { /* print blocked */ } setTimeout(() => f.remove(), 60000); }, 300);
  return name;
}

export const STATUS_FILTER_LABELS = { all: 'All statuses', verified: 'Verified only', pending: 'Pending review', flagged: 'Flagged' };
