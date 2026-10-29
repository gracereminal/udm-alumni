// Reports: template metadata and the client-side export builders (CSV / Excel / PDF print).
// The report data itself — KPIs, bars, table rows, findings — comes from GET /reports/:type (SQL views).

const thisYear = new Date().getFullYear();
/** Graduating batches covered by the reports, oldest first (registration accepts 1999 to the current year). */
export const BATCH_YEARS = (() => { const ys = []; for (let y = 1999; y <= thisYear; y++) ys.push(y); return ys; })();
/** Default report window, the same as the API's: the last five graduating batches. */
export const DEFAULT_BATCH_RANGE = { from: thisYear - 4, to: thisYear };

/**
 * Resolve a report batch range. `from` and `to` are years in either order (e.g. 2026 → 2022);
 * a missing or unknown year falls back to the default window. Returns the years (ascending),
 * a display label and the file-name suffix.
 */
export function resolveBatch(from, to) {
  const ok = (y) => BATCH_YEARS.includes(+y);
  const f = ok(from) ? +from : DEFAULT_BATCH_RANGE.from;
  const t = ok(to) ? +to : ok(from) ? +from : DEFAULT_BATCH_RANGE.to;
  const lo = Math.min(f, t); const hi = Math.max(f, t);
  const years = [];
  for (let y = lo; y <= hi; y++) years.push(y);
  const one = lo === hi;
  return { from: f, to: t, years, label: one ? `Batch ${lo}` : `Batches ${lo}–${hi}`, file: one ? String(lo) : `${lo}-${hi}` };
}

export const REPORT_TYPES = [
  { id: 'ched', name: 'UDM Alumni Survey — Form A', desc: 'Mandated institutional submission covering employment status, relevance of degree and months before first job, for the last five graduating batches.', cadence: 'Annual', due: 'Due Nov 30' },
  { id: 'employability', name: 'Employability by Program', desc: 'Per-program employment rate against the university target, with batch-on-batch movement.', cadence: 'Quarterly' },
  { id: 'coverage', name: 'Batch Coverage Audit', desc: 'Traced versus total graduates for each batch, with unreached counts for follow-up.', cadence: 'Monthly' },
  { id: 'employer', name: 'Employer & Industry Distribution', desc: 'Where graduates are absorbed, by industry sector — employer counts only, no named alumni.', cadence: 'On demand' },
  { id: 'inclusion', name: 'Inclusion Profile — IP & PWD', desc: 'Indigenous Peoples and Persons with Disability (Yes / No) among respondents, with employment outcomes per group. Aggregated counts only.', cadence: 'Annual' },
];

/** "Due Nov 30 · last run Aug 28, 2026" from the latest REPORT_EXPORT row of that type. */
export function runsLabel(t, lastRun) {
  const last = lastRun ? `last run ${new Date(lastRun).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'Asia/Manila' })}` : 'not exported yet';
  return t.due ? `${t.due} · ${last}` : last.replace(/^./, (c) => c.toUpperCase());
}

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** HTML body of an exported report (PDF print / Excel). */
export function repDocHtml(t, d, secs, nowLabel) {
  const max = Math.max(1, ...d.bars.map((b) => b[1]));
  let h = `<div style="border-bottom:2px solid #0F3D2E;padding-bottom:10px;margin-bottom:18px"><div style="font-size:9pt;color:#64748B;text-transform:uppercase;letter-spacing:.06em">UDM Alumni Relations Office</div><h1 style="font-size:18pt;margin:4px 0">${esc(t.name)}</h1><div style="font-size:9.5pt;color:#64748B">${esc(d.scope)} · ${esc(d.batchLabel)} · ${d.records} records · generated ${esc(nowLabel)}</div></div>`;
  if (secs.kpi) h += `<table style="margin-bottom:18px"><tr>${d.kpis.map((k) => `<td style="vertical-align:top;border:1px solid #E2E5EA"><div style="font-size:8.5pt;color:#64748B;text-transform:uppercase">${esc(k.label)}</div><div style="font-size:16pt;font-weight:700">${esc(k.value)}</div><div style="font-size:8.5pt;color:#64748B">${esc(k.sub)}</div></td>`).join('')}</tr></table>`;
  if (secs.chart) h += `<h3>${esc(d.chartTitle)}</h3><table style="margin-bottom:18px">${d.bars.map((b) => `<tr><td style="width:22%">${esc(b[0])}</td><td><div style="height:12px;background:#0F3D2E;width:${((b[1] / max) * 100).toFixed(1)}%"></div></td><td style="width:12%;text-align:right;font-weight:700">${b[1].toFixed(1)}${d.unit}</td></tr>`).join('')}</table>`;
  if (secs.table) h += `<h3>${esc(d.tableTitle)}</h3><table style="margin-bottom:18px"><tr>${d.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${d.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
  if (secs.findings) h += `<h3>Key findings</h3><ul>${d.findings.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`;
  h += '<p style="font-size:8.5pt;color:#94A3B8;margin-top:24px">Aggregated institutional metrics only — no names, Membership IDs or contact details (RA 10173).</p>';
  return h;
}

const PRINT_CSS = '@page{size:A4;margin:16mm}body{font-family:Inter,system-ui,sans-serif;color:#0B1220;font-size:10.5pt}h3{font-size:12pt;margin:0 0 8px}table{border-collapse:collapse;width:100%}th,td{padding:6px 8px;border-bottom:1px solid #E2E5EA;text-align:left}th{font-size:8.5pt;text-transform:uppercase;color:#64748B;background:#F4F8F6}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}';

/** Download (CSV / Excel) or print (PDF) a report from its data. Returns { name, size } (size in bytes, PDF: null). */
export function exportReport(t, d, fmt, secs, nowLabel) {
  const ext = fmt === 'PDF' ? 'pdf' : fmt === 'Excel' ? 'xls' : 'csv';
  const name = `${d.file}_${d.batchRange}.${ext}`;
  const dl = (blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  if (fmt === 'CSV') {
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const L = [[t.name], ['UDM Alumni Relations Office'], ['Scope', `${d.scope} · ${d.batchLabel} · ${d.records} records · aggregated`], []];
    if (secs.kpi) { L.push(['Indicator', 'Value', 'Note']); d.kpis.forEach((k) => L.push([k.label, k.value, k.sub])); L.push([]); }
    if (secs.chart) { L.push([d.chartTitle, `Value (${d.unit})`]); d.bars.forEach((b) => L.push([b[0], b[1]])); L.push([]); }
    if (secs.table) { L.push(d.cols); d.rows.forEach((r) => L.push(r)); L.push([]); }
    if (secs.findings) { L.push(['Key findings']); d.findings.forEach((f) => L.push([f])); }
    const blob = new Blob([`\uFEFF${L.map((r) => r.map(q).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    dl(blob);
    return { name, size: blob.size };
  }
  const body = repDocHtml(t, d, secs, nowLabel);
  if (fmt === 'Excel') {
    const blob = new Blob([`\uFEFF<html><head><meta charset="utf-8"></head><body>${body}</body></html>`], { type: 'application/vnd.ms-excel' });
    dl(blob);
    return { name, size: blob.size };
  }
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(f);
  const doc = f.contentWindow.document;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${name.replace('.pdf', '')}</title><style>${PRINT_CSS}</style></head><body>${body}</body></html>`);
  doc.close();
  setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch { /* print blocked */ } setTimeout(() => f.remove(), 60000); }, 300);
  return { name, size: null };
}
