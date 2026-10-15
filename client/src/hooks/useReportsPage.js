import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { REPORT_TYPES, exportReport, runsLabel } from '../lib/analytics';
import { CATALOG, collegeById, programById } from '../data/colleges';
import { nowLabel } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { get, post, qs } from '../lib/api';

const SECS = [{ id: 'kpi', label: 'KPIs' }, { id: 'chart', label: 'Chart' }, { id: 'table', label: 'Table' }, { id: 'findings', label: 'Findings' }];
const STATUS = { Submitted: ['#E1F3EA', '#0F6B4F'], Ready: ['#E7F0EE', '#0F3D2E'], Archived: ['#EDEFF2', '#5A6572'] };
const STATUS_LABEL = { ready: 'Ready', submitted: 'Submitted', archived: 'Archived' };
const EMPTY = { kpis: [{ label: '', value: '—', sub: '' }], bars: [['', 0]], cols: [], rows: [], findings: [], records: '0', scope: '', batchLabel: '', unit: '%', target: null, grid: '1fr', chartTitle: '', chartNote: '', tableTitle: '' };
const sizeLabel = (b) => (b == null ? '—' : b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const when = (iso) => `${new Date(iso).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })} PHT`;

/**
 * Reports page state + view-model: choose a report type, scope (college → program), sections and format,
 * preview it, and export (PDF print, Excel, CSV). Data comes from GET /reports/:type; every export is logged
 * (POST /reports/exports). College users are locked to their own college by the API.
 */
export default function useReportsPage(role) {
  const dept = role === 'dept';
  const { user } = useAuth();
  const [college, setCollege] = useState('all');
  const [course, setCourse] = useState('all');
  const { state: navState } = useLocation();
  const [type, setType] = useState(REPORT_TYPES.some((t) => t.id === navState?.repType) ? navState.repType : 'ched');
  const [format, setFormat] = useState('PDF');
  const [secs, setSecs] = useState({ kpi: true, chart: true, table: true, findings: true });
  const [exporting, setExporting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [all, setAll] = useState({});
  const [types, setTypes] = useState([]);
  const [hist, setHist] = useState({ rows: [], total: 0 });
  const [reloadKey, setReloadKey] = useState(0);
  const previewRef = useRef(null);
  const toastT = useRef(null);

  const colId = dept ? user?.collegeId : (collegeById(college) ? Number(college) : null);
  const col = colId ? collegeById(colId) : null;
  const prog = programById(course);
  const progId = prog && col && Number(prog.collegeId) === Number(col.id) ? prog.id : null;
  const scopeKey = `${colId || 'all'}|${progId || 'all'}`;

  const flash = useCallback((t) => { setToastMsg(t); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastMsg(null), 4500); }, []);

  useEffect(() => {
    let live = true;
    const [c, p] = scopeKey.split('|');
    const params = qs({ collegeId: dept ? undefined : c, programId: p });
    Promise.all(REPORT_TYPES.map((t) => get(`/reports/${t.id}${params}`)))
      .then((res) => { if (live) setAll(Object.fromEntries(REPORT_TYPES.map((t, i) => [t.id, res[i]]))); })
      .catch((err) => { if (live) flash(err.message); });
    return () => { live = false; };
  }, [scopeKey, dept, flash]);

  useEffect(() => {
    let live = true;
    Promise.all([get('/reports/types'), get('/reports/exports?limit=4')])
      .then(([t, h]) => { if (live) { setTypes(t); setHist(h); } })
      .catch(() => {});
    return () => { live = false; };
  }, [reloadKey]);

  const fmt = ['PDF', 'Excel', 'CSV'].includes(format) ? format : 'PDF';
  const current = REPORT_TYPES.find((t) => t.id === type) || REPORT_TYPES[0];
  const d = all[current.id] || EMPTY;
  const onCount = SECS.filter((s) => secs[s.id]).length;
  const max = Math.max(1, ...d.bars.map((b) => b[1]), d.target || 0);
  const scale = 85 / max;
  const est = fmt === 'PDF' ? `~${Math.max(1, onCount + (secs.table ? 1 : 0))} pages` : fmt === 'Excel' ? `${onCount} sheet${onCount === 1 ? '' : 's'}` : '1 file · UTF-8';
  const lastRun = (id) => (types.find((t) => t.id === id) || {}).lastRun;

  const doExport = async (typeId, f) => {
    if (exporting) return;
    const t = REPORT_TYPES.find((x) => x.id === typeId) || REPORT_TYPES[0];
    const dd = all[t.id];
    if (!dd) return;
    setExporting(true);
    let out = null;
    try { out = exportReport(t, dd, f, secs, nowLabel()); } catch { out = null; }
    if (out) {
      try {
        await post('/reports/exports', { type: t.id, format: f, collegeId: dept ? undefined : colId || undefined, programId: progId || undefined, sections: SECS.filter((s) => secs[s.id]).map((s) => s.id), fileSize: out.size ?? undefined });
        setReloadKey((k) => k + 1);
      } catch (err) { flash(err.message); }
    }
    setExporting(false);
    flash(out ? `Exported ${out.name}` : 'Export could not start');
  };

  const colleges = CATALOG.colleges.filter((c) => c.programs.length);
  const courses = col ? col.programs : [];
  const vals = {
    repPreviewRef: previewRef,
    repScopeLabel: prog && progId ? prog.name : col ? col.name : 'All colleges',
    repCollegeVal: col ? String(col.id) : 'all',
    repCollegeOpts: dept ? [{ value: String(colId || ''), label: user?.college || '' }] : [{ value: 'all', label: 'All colleges' }, ...colleges.map((c) => ({ value: String(c.id), label: c.name }))],
    repOnCollege: (e) => { setCollege(e.target.value); setCourse('all'); },
    repCourseVal: progId ? String(progId) : 'all',
    repCourseOpts: [{ value: 'all', label: col ? `All courses (${courses.length})` : 'All courses' }, ...courses.map((c) => ({ value: String(c.id), label: c.name }))],
    repOnCourse: (e) => setCourse(e.target.value),
    repCourseDisabled: !col,
    repCourseOpacity: col ? 1 : 0.55,
    repTemplateCount: `${REPORT_TYPES.length} templates`,
    repTemplates: REPORT_TYPES.map((t) => {
      const on = t.id === type;
      const td = all[t.id] || EMPTY;
      const m = Math.max(1, ...td.bars.map((b) => b[1]));
      return {
        ...t, runs: runsLabel(t, lastRun(t.id)), headline: td.kpis[0].value, headlineLabel: td.kpis[0].label.toLowerCase(),
        mini: td.bars.slice(0, 7).map((b) => ({ h: `${Math.max(8, Math.round((b[1] / m) * 100))}%`, c: on ? '#0F3D2E' : '#A9C3B8' })),
        bg: on ? '#F4F8F6' : '#fff', border: on ? '#0F3D2E' : '#E7E9ED', hover: on ? {} : { borderColor: '#B9CCC4' },
        thumbBg: on ? '#fff' : '#F6F8F7', thumbBorder: on ? '#D2E1DD' : '#EEF0F3', tagBg: on ? '#0F3D2E' : '#F1F3F5', tagColor: on ? '#fff' : '#64748B', onClick: () => setType(t.id),
      };
    }),
    repTitle: current.name,
    repDesc: current.desc,
    repRecords: d.records,
    repToday: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'Asia/Manila' }),
    repFormats: ['PDF', 'Excel', 'CSV'].map((f) => ({ label: f, bg: f === fmt ? '#fff' : 'transparent', color: f === fmt ? '#0B1220' : '#64748B', shadow: f === fmt ? '0 1px 2px rgba(16,24,40,.12)' : 'none', onClick: () => setFormat(f) })),
    repExportLabel: exporting ? `Preparing ${fmt}…` : `Export ${fmt}`,
    repExportOpacity: exporting || !onCount ? 0.6 : 1,
    repExportNow: () => { if (onCount) doExport(type, fmt); },
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
    repHistory: hist.rows.map((h) => {
      const status = STATUS_LABEL[h.status] || 'Ready';
      return {
        type: h.type, name: h.name, scope: h.scopeLabel || '', by: h.by, date: when(h.createdAt), fmt: h.fmt, size: sizeLabel(h.fileSize), status,
        statusBg: (STATUS[status] || STATUS.Ready)[0], statusColor: (STATUS[status] || STATUS.Ready)[1],
        onPreview: () => {
          setType(h.type); setFormat(h.fmt);
          const el = previewRef.current;
          if (el) { const r = el.getBoundingClientRect(); window.scrollBy({ top: r.top - 90, behavior: 'smooth' }); }
        },
        onDownload: () => doExport(h.type, h.fmt),
      };
    }),
    repHistoryFoot: `Showing ${hist.rows.length} most recent of ${hist.total} exports · every entry logs the generating account and request time`,
    repViewArchive: () => flash('Older exports are kept in the export log and released on request from the Alumni Office.'),
    repToast: toastMsg || '',
    repToastClose: () => setToastMsg(null),
    recUndoOn: false,
    recUndo: () => {},
  };
  return { vals, toastOn: !!toastMsg };
}
