import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { REPORT_TYPES, exportReport, repData, resolveScope, collegeNames } from '../lib/analytics';
import { nowLabel } from '../lib/format';
import { DEPT_COLLEGE } from '../lib/collegeDash';

const SECS = [{ id: 'kpi', label: 'KPIs' }, { id: 'chart', label: 'Chart' }, { id: 'table', label: 'Table' }, { id: 'findings', label: 'Findings' }];
const STATUS = { Submitted: ['#E1F3EA', '#0F6B4F'], Ready: ['#E7F0EE', '#0F3D2E'], Archived: ['#EDEFF2', '#5A6572'] };
const BASE_HISTORY = [
  { type: 'ched', name: 'UDM Alumni Survey — Form A', scope: 'Batches 2022–2026 · 1,986 records', by: 'Alumni Office Admin', date: 'Aug 28, 2026 · 03:14 PM PHT', fmt: 'PDF', size: '4.2 MB', status: 'Submitted' },
  { type: 'coverage', name: 'Batch Coverage Audit', scope: 'Batches 2022–2026 · 1,986 records', by: 'Alumni Office Admin', date: 'Sep 14, 2026 · 09:02 AM PHT', fmt: 'Excel', size: '880 KB', status: 'Ready' },
  { type: 'employability', name: 'Employability by Program', scope: 'Batches 2022–2026 · 1,986 records', by: 'Alumni Office Admin', date: 'Sep 01, 2026 · 05:40 PM PHT', fmt: 'PDF', size: '1.6 MB', status: 'Ready' },
  { type: 'employer', name: 'Employer & Industry Distribution', scope: 'Batches 2022–2026 · 1,672 records', by: 'System Administrator', date: 'Jul 22, 2026 · 11:20 AM PHT', fmt: 'CSV', size: '310 KB', status: 'Archived' },
];

/**
 * Reports page state + view-model: choose a report type, scope (college → program), sections and format,
 * preview it, and export (PDF print, Excel, CSV). College users are locked to their own college.
 */
export default function useReportsPage(role) {
  const dept = role === 'dept';
  const [college, setCollege] = useState('all');
  const [course, setCourse] = useState('all');
  const { state: navState } = useLocation();
  const [type, setType] = useState(REPORT_TYPES.some((t) => t.id === navState?.repType) ? navState.repType : 'ched');
  const [format, setFormat] = useState('PDF');
  const [secs, setSecs] = useState({ kpi: true, chart: true, table: true, findings: true });
  const [exporting, setExporting] = useState(false);
  const [extra, setExtra] = useState([]);
  const [toastMsg, setToastMsg] = useState(null);
  const previewRef = useRef(null);
  const toastT = useRef(null);

  const sc = resolveScope(dept ? DEPT_COLLEGE : college, course);
  const fmt = ['PDF', 'Excel', 'CSV'].includes(format) ? format : 'PDF';
  const current = REPORT_TYPES.find((t) => t.id === type) || REPORT_TYPES[0];
  const d = repData(current.id, sc);
  const onCount = SECS.filter((s) => secs[s.id]).length;
  const max = Math.max(...d.bars.map((b) => b[1]), d.target || 0);
  const scale = 85 / max;
  const hist = [...extra, ...BASE_HISTORY];
  const est = fmt === 'PDF' ? `~${Math.max(1, onCount + (secs.table ? 1 : 0))} pages` : fmt === 'Excel' ? `${onCount} sheet${onCount === 1 ? '' : 's'}` : '1 file · UTF-8';

  const flash = (t) => { setToastMsg(t); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastMsg(null), 4500); };
  const doExport = (typeId, f, log) => {
    if (exporting) return;
    setExporting(true);
    setTimeout(() => {
      let name = null;
      try { name = exportReport(typeId, f, sc, secs, nowLabel()); } catch { name = null; }
      const t = REPORT_TYPES.find((x) => x.id === typeId) || REPORT_TYPES[0];
      const dd = repData(t.id, sc);
      const entry = { type: t.id, name: t.name, scope: `${dd.scope} · ${dd.records} records`, by: 'You', date: nowLabel(), fmt: f, size: f === 'PDF' ? '1.8 MB' : f === 'Excel' ? '240 KB' : '18 KB', status: 'Ready' };
      setExporting(false);
      flash(name ? `Exported ${name}` : 'Export could not start');
      if (log && name) setExtra((s) => [entry, ...s]);
    }, 650);
  };

  const vals = {
    repPreviewRef: previewRef,
    repScopeLabel: sc.label,
    repCollegeVal: sc.college,
    repCollegeOpts: dept ? [{ value: DEPT_COLLEGE, label: DEPT_COLLEGE }] : [{ value: 'all', label: 'All colleges' }, ...collegeNames().map((n) => ({ value: n, label: n }))],
    repOnCollege: (e) => { setCollege(e.target.value); setCourse('all'); },
    repCourseVal: sc.course,
    repCourseOpts: [{ value: 'all', label: sc.college === 'all' ? 'All courses' : `All courses (${sc.courses.length})` }, ...sc.courses.map((c) => ({ value: c, label: c }))],
    repOnCourse: (e) => setCourse(e.target.value),
    repCourseDisabled: sc.college === 'all',
    repCourseOpacity: sc.college === 'all' ? 0.55 : 1,
    repTemplateCount: `${REPORT_TYPES.length} templates`,
    repTemplates: REPORT_TYPES.map((t) => {
      const on = t.id === type;
      const td = repData(t.id, sc);
      const m = Math.max(...td.bars.map((b) => b[1]));
      return {
        ...t, headline: td.kpis[0].value, headlineLabel: td.kpis[0].label.toLowerCase(),
        mini: td.bars.slice(0, 7).map((b) => ({ h: `${Math.max(8, Math.round((b[1] / m) * 100))}%`, c: on ? '#0F3D2E' : '#A9C3B8' })),
        bg: on ? '#F4F8F6' : '#fff', border: on ? '#0F3D2E' : '#E7E9ED', hover: on ? {} : { borderColor: '#B9CCC4' },
        thumbBg: on ? '#fff' : '#F6F8F7', thumbBorder: on ? '#D2E1DD' : '#EEF0F3', tagBg: on ? '#0F3D2E' : '#F1F3F5', tagColor: on ? '#fff' : '#64748B', onClick: () => setType(t.id),
      };
    }),
    repTitle: current.name,
    repDesc: current.desc,
    repRecords: d.records,
    repToday: 'Oct 02, 2026',
    repFormats: ['PDF', 'Excel', 'CSV'].map((f) => ({ label: f, bg: f === fmt ? '#fff' : 'transparent', color: f === fmt ? '#0B1220' : '#64748B', shadow: f === fmt ? '0 1px 2px rgba(16,24,40,.12)' : 'none', onClick: () => setFormat(f) })),
    repExportLabel: exporting ? `Preparing ${fmt}…` : `Export ${fmt}`,
    repExportOpacity: exporting || !onCount ? 0.6 : 1,
    repExportNow: () => { if (onCount) doExport(type, fmt, true); },
    repSectionRows: SECS.map((s) => {
      const on = !!secs[s.id];
      return { label: s.label, mark: on ? '✓' : '+', bg: on ? '#0F3D2E' : '#fff', color: on ? '#fff' : '#475569', border: on ? '#0F3D2E' : '#E2E5EA', onClick: () => setSecs((x) => ({ ...x, [s.id]: !on })) };
    }),
    repOutputMeta: `${fmt} · ${est}`,
    repNoSections: onCount === 0,
    repShowKpi: !!secs.kpi, repShowChart: !!secs.chart, repShowTable: !!secs.table, repShowFindings: !!secs.findings,
    repKpis: d.kpis,
    repChartTitle: d.chartTitle,
    repChartNote: d.chartNote,
    repHasTarget: d.target != null,
    repTargetPct: d.target != null ? `${(d.target * scale).toFixed(1)}%` : '0%',
    repTargetLabel: d.target != null ? `Target ${d.target}${d.unit}` : '',
    repBars: d.bars.map((b) => ({ label: b[0], display: `${b[1].toFixed(1)}${d.unit}`, pct: `${(b[1] * scale).toFixed(1)}%`, color: d.target != null && b[1] < d.target ? '#A9C3B8' : '#0F3D2E' })),
    repTableTitle: d.tableTitle,
    repTableGrid: d.grid,
    repTableHead: d.cols.map((c, i) => ({ v: c, align: i ? 'right' : 'left' })),
    repTableRows: d.rows.map((r) => {
      const total = r[0] === 'Total';
      return { cells: r.map((v, i) => ({ v, align: i ? 'right' : 'left', weight: !i || total ? 700 : 500, color: v === 'Below target' || String(v).startsWith('−') ? '#B3213C' : v === 'Above target' ? '#0F6B4F' : (!i ? '#0B1220' : '#334155') })) };
    }),
    repFindings: d.findings.map((text) => ({ text })),
    repHistory: hist.map((h) => ({
      ...h, statusBg: (STATUS[h.status] || STATUS.Ready)[0], statusColor: (STATUS[h.status] || STATUS.Ready)[1],
      onPreview: () => {
        setType(h.type); setFormat(h.fmt);
        const el = previewRef.current;
        if (el) { const r = el.getBoundingClientRect(); window.scrollBy({ top: r.top - 90, behavior: 'smooth' }); }
      },
      onDownload: () => doExport(h.type, h.fmt, false),
    })),
    repHistoryFoot: `Showing ${hist.length} most recent of ${18 + extra.length} exports · every entry logs the generating account and request time`,
    repViewArchive: () => flash('Exports older than the latest four are archived for seven years and released on request from the Alumni Office.'),
    repToast: toastMsg || '',
    repToastClose: () => setToastMsg(null),
    recUndoOn: false,
    recUndo: () => {},
  };
  return { vals, toastOn: !!toastMsg };
}

