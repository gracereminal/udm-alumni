import { useEffect } from 'react';
import { hv } from '../lib/stateStyle';
import { onActivate, onBackdrop } from '../lib/a11y';

/* View layer for the Admin Dashboard KPI dialogs — converted from the "Graduates Traced by Batch", "Employment Overview"
   and "Degree-to-Career Alignment" screens of "UDM Alumni.dc.html". Values come from lib/adminDialogs.js. */

const pillSel = { border: '1px solid #E7E9ED', borderRadius: '999px', background: '#fff', padding: '9px 14px', font: 'inherit', fontSize: '13px', fontWeight: '600', color: '#0B1220', maxWidth: '100%' };
const search = { minWidth: '0', border: '1px solid #E7E9ED', borderRadius: '999px', background: '#fff', padding: '9px 14px', font: 'inherit', fontSize: '13px', color: '#0B1220', boxSizing: 'border-box' };
const panel = { background: '#fff', border: '1px solid #E7E9ED', borderRadius: '14px' };
const sectionBox = { ...panel, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '0' };
const thRow = { gap: '12px', padding: '10px 18px', background: '#F8FAF9', fontSize: '11px', fontWeight: '700', letterSpacing: '.5px', textTransform: 'uppercase', color: '#64748B' };
const pageBtn = { border: '1px solid #E7E9ED', background: '#fff', borderRadius: '9px', height: '32px', padding: '0 12px', font: 'inherit', fontSize: '12.5px', fontWeight: '600', color: '#334155', cursor: 'pointer' };
const ghostBtn = { border: '1px solid #E7E9ED', borderRadius: '10px', padding: '0 14px', minHeight: '36px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer', background: '#fff', font: 'inherit' };
const darkBtn = { background: '#0F3D2E', color: '#fff', borderRadius: '10px', padding: '0 14px', minHeight: '36px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', border: '0', font: 'inherit' };
const pill = (c, bg, size = '11.5px') => ({ fontSize: size, fontWeight: '700', padding: '3px 9px', borderRadius: '99px', color: c, background: bg, whiteSpace: 'nowrap' });
const ellipsis = { minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
);
const Arrow = ({ d = 'M3 8h10M9 4l4 4-4 4' }) => (
  <svg aria-hidden="true" width="1em" height="1em" viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: '-0.15em', flex: 'none' }}><path d={d} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/** Full-height dialog on a dark backdrop (closes on Esc or a backdrop click). */
function Shell({ label, onClose, width, pad = '22px', children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div data-screen-label={label} onClick={onBackdrop(onClose)} role="presentation"
      style={{ position: 'fixed', inset: '0', zIndex: '85', background: 'rgba(11,18,32,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'var(--udm-sans)', boxSizing: 'border-box' }}
    >
      <div role="dialog" aria-modal="true" aria-label={label}
        style={{ width: '100%', maxWidth: width, maxHeight: '100%', overflow: 'auto', overscrollBehavior: 'contain', background: '#F7F8F7', borderRadius: '16px', boxShadow: '0 24px 60px -12px rgba(0,20,16,.35)', padding: pad, display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}
      >
        {children}
      </div>
    </div>
  );
}

const BackBtn = ({ onClick }) => (
  <button type="button" onClick={onClick}
    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'fit-content', height: '38px', padding: '0 18px', borderRadius: '999px', background: '#1d3f35', color: '#fff', border: '0', fontFamily: 'var(--udm-sans)', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 6px rgba(15,61,46,.25)', transition: 'background .18s ease,box-shadow .18s ease,transform .18s ease' }}
    {...hv({ background: '#2a5648', boxShadow: '0 5px 14px rgba(15,61,46,.32)', transform: 'translateY(-1px)' })}
  >
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
    Back to Dashboard
  </button>
);
const CloseBtn = ({ onClick }) => (
  <button type="button" onClick={onClick} aria-label="Close" title="Close"
    style={{ flex: 'none', width: '34px', height: '34px', borderRadius: '50%', border: '1px solid #E7E9ED', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', fontSize: '18px', padding: '0', fontFamily: 'inherit' }}
    {...hv({ background: '#F1F4F3' })}
  >
    ×
  </button>
);
const Select = ({ label, value, onChange, opts, disabled, style }) => (
  <select aria-label={label} value={value} onChange={onChange} disabled={disabled} style={{ ...pillSel, ...style }}>
    {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);
const ResetLink = ({ onClick }) => (
  <button type="button" onClick={onClick} style={{ font: 'inherit', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer', padding: '6px 8px', border: '0', background: 'transparent' }} {...hv({ color: '#0F3D2E' })}>Reset filters</button>
);
function Pager({ note, label, prev, next, prevOp, nextOp }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', padding: '12px 18px', borderTop: '1px solid #EEF0F3' }}>
      <div style={{ fontSize: '12.5px', color: '#64748B' }}>{note}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button type="button" onClick={prev} aria-label="Previous page" style={{ ...pageBtn, opacity: prevOp }}>Prev</button>
        <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0B1220' }}>{label}</span>
        <button type="button" onClick={next} aria-label="Next page" style={{ ...pageBtn, opacity: nextOp }}>Next</button>
      </div>
    </div>
  );
}
/** Coverage bar with the target tick. */
const CovBar = ({ w, color, target, min = '60px' }) => (
  <span style={{ position: 'relative', flex: '1', minWidth: min, height: '8px', borderRadius: '6px', background: '#EEF4F1' }}>
    <span style={{ position: 'absolute', left: '0', top: '0', bottom: '0', width: w, background: color, borderRadius: '6px' }} />
    <span style={{ position: 'absolute', left: `${target}%`, top: '-3px', bottom: '-3px', width: '2px', background: '#94A3B8', borderRadius: '1px' }} />
  </span>
);
const Stat = ({ label, value, sub, color = '#0B1220', box }) => (
  <div style={{ ...panel, padding: '16px 18px', ...box }}>
    <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#475569' }}>{label}</div>
    <div style={{ fontWeight: '700', fontSize: '32px', letterSpacing: '-1px', color, marginTop: '4px', lineHeight: '1.1' }}>{value}</div>
    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>{sub}</div>
  </div>
);
const Exports = ({ csv, xls }) => (
  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
    <button type="button" onClick={csv} style={ghostBtn} {...hv({ background: '#F1F4F3' })}><DownloadIcon /><span>CSV</span></button>
    <button type="button" onClick={xls} style={darkBtn} {...hv({ background: '#1d5a45' })}><DownloadIcon /><span>Export Excel</span></button>
  </div>
);

const GT_COLS = 'minmax(0,1.1fr) minmax(0,.8fr) minmax(0,.8fr) minmax(0,.8fr) minmax(0,1.6fr) minmax(0,.9fr)';
const GT_REC = '1.4fr .7fr 1.6fr 1fr .9fr';

/** Graduates Traced by Batch (Alumni Traced card). */
export function GraduatesTracedDialog({ g, onClose }) {
  return (
    <Shell label="Graduates Traced by Batch" onClose={onClose} width="1040px">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '0' }}>
          <BackBtn onClick={onClose} />
          <div>
            <div style={{ fontWeight: '700', fontSize: '22px', letterSpacing: '-.5px', color: '#0B1220' }}>Graduates Traced by Batch</div>
            <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '3px' }}>{g.scope} · alumni records</div>
          </div>
        </div>
        <CloseBtn onClick={onClose} />
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Select label="Batch range start" value={g.fromVal} onChange={g.onFrom} opts={g.fromOpts} />
        <Select label="Batch range end" value={g.toVal} onChange={g.onTo} opts={g.toOpts} />
        <Select label="College" value={g.colVal} onChange={g.onCol} opts={g.colOpts} />
        <Select label="Program" value={g.courseVal} onChange={g.onCourse} opts={g.courseOpts} disabled={g.courseDisabled} style={{ maxWidth: 'min(100%,280px)', opacity: g.courseOpacity }} />
        {g.filtered ? <ResetLink onClick={g.reset} /> : null}
      </div>
      {g.loading ? (
        <div role="status" aria-label="Loading tracer coverage" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: '12px' }}>
            {[0, 1, 2, 3].map((i) => <div key={i} style={{ height: '104px', borderRadius: '14px', background: '#EAEFEC' }} />)}
          </div>
          <div style={{ height: '320px', borderRadius: '14px', background: '#EAEFEC' }} />
        </div>
      ) : null}
      {g.error ? (
        <div role="alert" style={{ ...panel, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
          <div style={{ fontWeight: '700', fontSize: '16px', color: '#0B1220' }}>Couldn’t load tracer coverage</div>
          <div style={{ fontSize: '13px', color: '#64748B', maxWidth: '420px', textWrap: 'pretty' }}>The alumni records service didn’t respond. Your filters are kept — try again in a moment.</div>
          <button type="button" onClick={g.retry} style={darkBtn} {...hv({ background: '#1d5a45' })}>Retry</button>
        </div>
      ) : null}
      {g.empty ? (
        <div style={{ ...panel, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
          <div style={{ fontWeight: '700', fontSize: '16px', color: '#0B1220' }}>No alumni records</div>
          <div style={{ fontSize: '13px', color: '#64748B', maxWidth: '420px', textWrap: 'pretty' }}>There are no active alumni records for the selected batches, college or program.</div>
          {g.filtered ? <button type="button" onClick={g.reset} style={ghostBtn} {...hv({ background: '#F1F4F3' })}>Reset filters</button> : null}
        </div>
      ) : null}
      {g.ready ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: '12px' }}>
            <Stat label="Total alumni records" value={g.elig} sub="Active alumni records in scope" />
            <Stat label="Survey completed" value={g.tr} sub="Completed the tracer survey" color="#0F3D2E" />
            <Stat label="Survey not completed" value={g.nt} sub={g.ntPct} />
            {g.covLow
              ? <Stat label="Tracer coverage rate" value={g.cov} sub={`Below the ${g.target}% target · ${g.belowNote}`} color="#B4500A" box={{ background: '#FFF6EC', border: '1px solid #F3D3B0' }} />
              : <Stat label="Tracer coverage rate" value={g.cov} sub={`Target ${g.target}% · ${g.belowNote}`} color="#0F3D2E" />}
          </div>
          <div style={{ ...panel, overflow: 'hidden', flex: 'none' }}>
            {!g.hasSel ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '14px 18px', borderBottom: '1px solid #EEF0F3' }}>
                  <div style={{ minWidth: '0' }}>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#0B1220' }}>Batch coverage breakdown</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Select a batch to inspect alumni who completed or have not completed the survey</div>
                  </div>
                  <Exports csv={g.exportCsv} xls={g.exportXls} />
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: '720px' }}>
                    <div style={{ ...thRow, display: 'grid', gridTemplateColumns: GT_COLS }}>
                      <div>Graduating batch</div><div style={{ textAlign: 'right' }}>Alumni records</div><div style={{ textAlign: 'right' }}>Survey completed</div><div style={{ textAlign: 'right' }}>Survey not completed</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Tracer coverage rate
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600', letterSpacing: '0', textTransform: 'none', color: '#94A3B8' }}><span style={{ width: '2px', height: '10px', background: '#94A3B8', borderRadius: '1px' }} />{g.target}% target</span>
                      </div>
                      <div>Status</div>
                    </div>
                    {g.rows.map((r) => (
                      <div key={r.key} role="button" tabIndex={r.onClick ? 0 : -1} onKeyDown={r.onClick ? onActivate(r.onClick) : undefined} onClick={r.onClick || undefined}
                        style={{ display: 'grid', gridTemplateColumns: GT_COLS, gap: '12px', padding: '11px 18px', borderTop: '1px solid #F1F2F4', fontSize: '13px', color: '#334155', alignItems: 'center', background: r.bg, cursor: r.cursor }}
                        {...hv({ background: '#F4F8F6' })}
                      >
                        <div style={{ minWidth: '0' }}><div style={{ fontWeight: '700', color: '#0B1220' }}>{r.batch}</div><div style={{ fontSize: '11.5px', color: '#64748B' }}>{r.ay}</div></div>
                        <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.elig}</div>
                        <div style={{ textAlign: 'right', fontWeight: '600', color: '#0B1220', fontVariantNumeric: 'tabular-nums' }}>{r.tr}</div>
                        <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.nt}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '0' }}>
                          <CovBar w={r.w} color={r.bar} target={g.target} />
                          <span style={{ flex: 'none', width: '48px', textAlign: 'right', fontWeight: '700', color: '#0B1220', fontVariantNumeric: 'tabular-nums' }}>{r.pct}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <span style={pill(r.stC, r.stBg)}>{r.st}</span>
                          <span style={{ color: '#94A3B8', fontSize: '14px' }}><Arrow d="M6 4l4 4-4 4" /></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '14px 18px', borderBottom: '1px solid #EEF0F3' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', minWidth: '0' }}>
                    <button type="button" onClick={g.back} style={ghostBtn} {...hv({ background: '#F1F4F3' })}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
                      <span>All batches</span>
                    </button>
                    <div style={{ minWidth: '0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '16px', color: '#0B1220' }}>{g.selLabel}<span style={pill(g.selStC, g.selStBg)}>{g.selSt}</span></div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{g.selAy} · {g.selTr} of {g.selElig} alumni records · survey completed</div>
                    </div>
                  </div>
                  <Exports csv={g.exportCsv} xls={g.exportXls} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', borderBottom: '1px solid #F1F2F4' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#475569', flex: 'none' }}>Tracer coverage</span>
                  <CovBar w={g.selW} color={g.selBar} target={g.target} min="0" />
                  <span style={{ flex: 'none', fontWeight: '700', fontSize: '14px', color: '#0B1220', fontVariantNumeric: 'tabular-nums' }}>{g.selCov}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #F1F2F4' }}>
                  <div role="tablist" aria-label="Tracer status" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {g.tabs.map((t) => (
                      <div key={t.k} role="tab" aria-selected={t.on} tabIndex={0} onKeyDown={onActivate(t.onClick)} onClick={t.onClick}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', border: `1px solid ${t.border}`, background: t.bg, color: t.color, borderRadius: '999px', padding: '0 14px', minHeight: '38px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {t.label}<span style={{ fontSize: '11.5px', padding: '2px 8px', borderRadius: '99px', background: t.nBg, fontVariantNumeric: 'tabular-nums' }}>{t.n}</span>
                      </div>
                    ))}
                  </div>
                  <input type="search" value={g.q} onChange={g.onQ} placeholder="Search name, program or college" aria-label="Search alumni in batch" style={{ ...search, flex: '1 1 220px' }} />
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: '680px' }}>
                    <div style={{ ...thRow, display: 'grid', gridTemplateColumns: GT_REC }}><div>Alumni</div><div>Program</div><div>College</div><div>Survey status</div><div>Updated</div></div>
                    {g.recs.map((r) => (
                      <div key={r.id} style={{ display: 'grid', gridTemplateColumns: GT_REC, gap: '12px', padding: '11px 18px', borderTop: '1px solid #F1F2F4', fontSize: '13px', color: '#334155', alignItems: 'center' }}>
                        <div style={{ fontWeight: '600', color: '#0B1220' }}>{r.name}</div>
                        <div title={r.progFull} style={{ cursor: 'help' }}>{r.prog}</div>
                        <div title={r.col} style={ellipsis}>{r.col}</div>
                        <div><span style={pill(r.stC, r.stBg)}>{r.st}</span></div>
                        <div style={{ fontVariantNumeric: 'tabular-nums' }}>{r.upd}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {g.recsEmpty ? <div style={{ padding: '22px 18px', fontSize: '13px', color: '#64748B', textAlign: 'center', borderTop: '1px solid #F1F2F4' }}>{g.recsEmptyText}</div> : null}
                <Pager note={g.pageNote} label={g.pageL} prev={g.prev} next={g.next} prevOp={g.prevOp} nextOp={g.nextOp} />
              </>
            )}
          </div>
        </>
      ) : null}
    </Shell>
  );
}

const ovStat = { background: '#F7F8F7', borderRadius: '12px', padding: '14px' };
const ovLabel = { fontSize: '12.5px', color: '#64748B', fontWeight: '600' };
const ovBig = { fontWeight: '700', fontSize: '28px', letterSpacing: '-.8px', color: '#0B1220', marginTop: '2px' };
const ovSec = { background: '#fff', border: '1px solid #E3E8E5', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '0' };

/** Employment Overview (Alumni Employed card). */
export function EmploymentOverviewDialog({ m, onClose }) {
  const unitTitle = `Open breakdown for this ${m.unitLabel}`;
  return (
    <Shell label="Employment Overview" onClose={onClose} width="1040px">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <div style={{ fontWeight: '700', fontSize: '22px', letterSpacing: '-.5px', color: '#0B1220' }}>Employment Overview</div>
          <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '3px' }}>{m.scopeLabel} · actual tracer results and projected employment, shown separately</div>
        </div>
        <CloseBtn onClick={onClose} />
      </div>
      <section aria-label="Actual Employment Analytics" style={ovSec}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#fff', background: '#0F3D2E', borderRadius: '6px', padding: '4px 8px' }}>A</span>
            <span style={{ fontWeight: '700', fontSize: '17px', color: '#0B1220' }}>Actual Employment Analytics</span>
            <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#0F6B4F', background: '#E6F0EB', borderRadius: '99px', padding: '4px 10px' }}>Tracer survey · actual</span>
          </div>
          <button type="button" onClick={m.goStatus}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 18px', borderRadius: '999px', background: '#0F3D2E', color: '#fff', border: '0', fontFamily: 'var(--udm-sans)', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 6px rgba(15,61,46,.25)' }}
            {...hv({ background: '#165843' })}
          >
            View Employment Status Breakdown<Arrow />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '12px' }}>
          <div style={ovStat}><div style={ovLabel}>Employment rate</div><div style={{ ...ovBig, color: '#0F6B4F' }}>{m.rate}</div><div style={{ fontSize: '12px', color: '#64748B' }}>of traced alumni in the labour force</div></div>
          <div style={ovStat}><div style={ovLabel}>Employed</div><div style={ovBig}>{m.emp}</div><div style={{ fontSize: '12px', color: '#64748B' }}>employed and self-employed</div></div>
          <div style={ovStat}><div style={ovLabel}>Alumni with Employment Status</div><div style={ovBig}>{m.known}</div><div style={{ fontSize: '12px', color: '#64748B' }}>of {m.traced} traced alumni</div></div>
          <div style={ovStat}><div style={ovLabel}>No status given</div><div style={ovBig}>{m.noStatus}</div><div style={{ fontSize: '12px', color: '#64748B' }}>not counted as unemployed</div></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,400px),1fr))', gap: '20px' }}>
          <div style={{ minWidth: '0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontWeight: '700', fontSize: '14px', color: '#0B1220' }}>Employment status distribution</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
              <div role="img" aria-label="Employment status donut chart"
                style={{ flex: 'none', width: '140px', height: '140px', borderRadius: '50%', background: m.donut, WebkitMask: 'radial-gradient(circle,transparent 0 40px,#000 41px)', mask: 'radial-gradient(circle,transparent 0 40px,#000 41px)' }}
              />
              <div style={{ flex: '1', minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {m.status.map((s) => (
                  <div key={s.label} role="button" tabIndex={0} onKeyDown={onActivate(s.go)} onClick={s.go} title={`View ${s.label} alumni in Reports`}
                    style={{ display: 'grid', gridTemplateColumns: '10px 1fr auto auto', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                    {...hv({ background: '#F1F6F3' })}
                  >
                    <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: s.color }} />
                    <span style={{ color: '#0B1220', fontWeight: '600' }}>{s.label}</span>
                    <span style={{ color: '#64748B' }}>{s.count}</span>
                    <span style={{ fontWeight: '700', color: '#0B1220', minWidth: '46px', textAlign: 'right' }}>{s.pct}</span>
                  </div>
                ))}
              </div>
            </div>
            {m.hasIns ? (
              <div style={{ marginTop: 'auto', background: '#F7F8F7', border: '1px solid #E3E8E5', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.8px', color: '#64748B' }}>EMPLOYMENT INSIGHTS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '8px' }}>
                  {[[m.hi, '▲ Highest', '#0F6B4F', '#E6F0EB', '#F1F6F3'], [m.lo, '▼ Lowest', '#8A6D0B', '#F3E6B5', '#FFFCF2']].map(([u, l, c, bd, hover]) => (
                    <div key={l} role="button" tabIndex={0} onKeyDown={onActivate(u.go)} onClick={u.go} title={unitTitle}
                      style={{ background: '#fff', borderRadius: '10px', padding: '10px', cursor: 'pointer', border: `1px solid ${bd}`, minWidth: '0' }}
                      {...hv({ background: hover })}
                    >
                      <div style={{ fontSize: '11.5px', fontWeight: '700', color: c }}>{l}</div>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: '#0B1220', marginTop: '2px' }}>{u.name}</div>
                      <div style={{ fontWeight: '700', fontSize: '18px', color: c, letterSpacing: '-.4px' }}>{u.rate}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div style={{ minWidth: '0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontWeight: '700', fontSize: '14px', color: '#0B1220' }}>Employment rate by {m.unitLabel} <span style={{ fontWeight: '500', color: '#64748B', fontSize: '12px' }}>· survey respondents</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {m.cmp.map((c) => (
                <div key={c.key} role="button" tabIndex={0} onKeyDown={onActivate(c.go)} onClick={c.go} title={unitTitle}
                  style={{ display: 'grid', gap: '4px', padding: '4px 6px', borderRadius: '8px', cursor: 'pointer' }}
                  {...hv({ background: '#F1F6F3' })}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '13px' }}>
                    <span style={{ fontWeight: '600', color: '#0B1220', minWidth: '0' }}>{c.name}</span>
                    <span style={{ fontWeight: '700', color: '#0F6B4F', flex: 'none' }}>{c.rate}</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '99px', background: '#EEF2EF', overflow: 'hidden' }}><div style={{ height: '100%', width: c.w, background: '#0F6B4F', borderRadius: '99px' }} /></div>
                  <div style={{ fontSize: '11.5px', color: '#64748B' }}>{c.detail}</div>
                </div>
              ))}
              {!m.cmp.length ? <div style={{ fontSize: '13px', color: '#64748B', padding: '12px 6px' }}>No survey respondents in the labour force yet.</div> : null}
            </div>
            {m.hasMore ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', borderTop: '1px solid #E3E8E5', paddingTop: '10px', marginTop: 'auto' }}>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Showing {m.all ? m.totN : m.showN} of {m.totN} {m.unitPlural} · ranked by rate</span>
                <button type="button" onClick={m.toggle} aria-expanded={m.all}
                  style={{ font: 'inherit', fontSize: '13px', fontWeight: '700', color: '#0F6B4F', cursor: 'pointer', whiteSpace: 'nowrap', border: '0', background: 'transparent', padding: '0' }}
                  {...hv({ textDecoration: 'underline' })}
                >
                  {m.all ? 'Show top 5' : `View all ${m.unitPlural}`}
                  <span style={{ marginLeft: '.3em' }}><Arrow d={m.all ? 'M8 13V3M4 7l4-4 4 4' : 'M8 3v10M4 9l4 4 4-4'} /></span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
      <section aria-label="Employment Forecast" style={ovSec}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '1px', color: '#154737', borderRadius: '6px', padding: '4px 8px', backgroundColor: '#F6C95DE3' }}>B</span>
          <span style={{ fontWeight: '700', fontSize: '17px', color: '#0B1220' }}>Employment Forecast</span>
          <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#4F6B5F', background: '#EEF3F0', borderRadius: '99px', padding: '4px 10px' }}>Projected · not actual results</span>
        </div>
        {m.fc ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '12px' }}>
              {m.cards.map((f) => (
                <div key={f.yr} style={{ background: '#FFFFFF', border: '1px solid #E1E8E4', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: '600' }}>Batch {f.yr}</span>
                    <span style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.6px', color: '#7A8F85' }}>PROJECTED</span>
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '28px', letterSpacing: '-.8px', color: '#124B38', marginTop: '2px' }}>{f.v}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Likely range {f.range}</div>
                  <div style={{ marginTop: '8px', display: 'inline-block', fontSize: '11.5px', fontWeight: '700', color: f.cc, background: f.cb, borderRadius: '99px', padding: '3px 9px' }}>{f.conf}</div>
                </div>
              ))}
            </div>
            <div style={{ minWidth: '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#475569', flexWrap: 'wrap', marginBottom: '6px' }}>
                <span style={{ fontWeight: '700', color: '#0B1220', fontSize: '14px', marginRight: '6px' }}>Employment rate by batch</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '18px', borderTop: '2.5px solid #0F6B4F' }} />{m.actualL}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '18px', borderTop: '2.5px dashed #B8860B' }} />{m.fcL}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '18px', height: '10px', background: 'rgba(15,61,46,.08)' }} />Likely range</span>
              </div>
              <svg viewBox="0 0 640 250" role="img" aria-label="Actual versus forecast employment rate by batch" style={{ width: '100%', height: 'auto', display: 'block' }}>
                <rect x={m.zx} y="10" width={m.zw} height="200" fill="#F7F9F8" />
                {m.grid.map((g) => (
                  <g key={g.l}>
                    <line x1="46" x2="620" y1={g.y} y2={g.y} stroke="#EEF0F3" />
                    <text x="38" y={g.y} textAnchor="end" dy="4" fontSize="11" fill="#94A3B8">{g.l}</text>
                  </g>
                ))}
                <line x1="46" x2="620" y1={m.ty} y2={m.ty} stroke="#C99A12" strokeWidth="1.2" strokeDasharray="3 4" />
                <text x="52" y={m.ty} dy="-5" fontSize="11" fontWeight="700" fill="#8A6D1F">Target {m.target}%</text>
                <polygon points={m.band} fill="rgba(15,61,46,.09)" />
                <polyline points={m.histLine} fill="none" stroke="#0F6B4F" strokeWidth="2.6" strokeLinejoin="round" />
                <polyline points={m.projLine} fill="none" stroke="#B8860B" strokeWidth="2.4" strokeDasharray="6 5" />
                {m.dots.map((d) => (
                  <g key={d.key}>
                    <circle cx={d.cx} cy={d.cy} r="4.5" fill={d.fill} stroke={d.stroke} strokeWidth="2" />
                    <text x={d.cx} y={d.ly} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0B1220">{d.v}</text>
                    <text x={d.cx} y="236" textAnchor="middle" fontSize="11.5" fill="#64748B">{d.yr}</text>
                  </g>
                ))}
              </svg>
            </div>
          </>
        ) : <div style={{ fontSize: '13px', color: '#64748B', padding: '8px 0' }}>{m.fcNone}</div>}
        <div style={{ fontSize: '12px', lineHeight: '1.55', color: '#64748B', textWrap: 'pretty' }}>* Forecast values are linear-trend estimates fitted to the latest batches with survey data. Actual batch rates and survey percentages in Section A are measured separately and are not combined with these projections.</div>
      </section>
    </Shell>
  );
}

const DA_SEL = '1.4fr .55fr 1.4fr 1.5fr .95fr';
const DA_ROW = '1.4fr .7fr .6fr 1.5fr 1.6fr 1fr';
const daStat = (dotC, label, value, sub, color = '#0B1220') => (
  <div style={{ ...panel, padding: '16px 18px', boxShadow: '0 1px 2px rgba(16,24,40,.04)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: '600', color: '#475569' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotC }} />{label}</div>
    <div style={{ fontWeight: '700', fontSize: '30px', letterSpacing: '-1px', color, marginTop: '6px', lineHeight: '1.1', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>{sub}</div>
  </div>
);
const SecHead = ({ title, sub, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'baseline' }}>
    <div><div style={{ fontWeight: '700', fontSize: '15px', color: '#0B1220' }}>{title}</div><div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{sub}</div></div>
    {right ? <div style={{ fontSize: '12px', color: '#64748B' }}>{right}</div> : null}
  </div>
);
const TopList = ({ title, items }) => (
  <div>
    <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.5px', textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>{title}</div>
    {items.map((j) => <div key={j.t} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12.5px', color: '#0B1220', padding: '3px 0' }}><span style={{ minWidth: '0' }}>{j.t}</span><span style={{ fontWeight: '700', fontVariantNumeric: 'tabular-nums' }}>{j.n}</span></div>)}
  </div>
);

/** Degree-to-Career Alignment (Degree-aligned Jobs card). */
export function DegreeAlignmentDialog({ a, onClose }) {
  const s = a.sel;
  return (
    <Shell label="Degree-to-Career Alignment" onClose={onClose} width="1120px" pad="0 22px 22px">
      <div style={{ position: 'sticky', top: '0', zIndex: '3', background: '#F7F8F7', margin: '0 -22px', padding: '20px 22px 14px', borderBottom: '1px solid #E7E9ED', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '0' }}>
            <BackBtn onClick={onClose} />
            <div>
              <div style={{ fontWeight: '700', fontSize: '22px', letterSpacing: '-.5px', color: '#0B1220' }}>Degree-to-Career Alignment</div>
              <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '3px', textWrap: 'pretty' }}>Analyze how graduates’ current occupations relate to their academic programs.</div>
            </div>
          </div>
          <CloseBtn onClick={onClose} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Select label="Graduating batch" value={a.batchVal} onChange={a.onBatch} opts={a.batchOpts} />
        <Select label="College" value={a.colVal} onChange={a.onCol} opts={a.colOpts} />
        <Select label="Program" value={a.courseVal} onChange={a.onCourse} opts={a.courseOpts} disabled={a.courseDisabled} style={{ opacity: a.courseOpacity }} />
        {a.filtered ? <ResetLink onClick={a.reset} /> : null}
      </div>
      {a.loading ? (
        <div role="status" aria-label="Loading alignment" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: '12px' }}>{[0, 1, 2].map((i) => <div key={i} style={{ height: '104px', borderRadius: '14px', background: '#EAEFEC' }} />)}</div>
          <div style={{ height: '320px', borderRadius: '14px', background: '#EAEFEC' }} />
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: '12px' }}>
            {daStat('#0F6B4F', 'Degree-aligned employment', a.alP, a.alS, '#0F3D2E')}
            {daStat('#D4B25A', 'Not aligned', a.naP, a.naS)}
            {daStat('#B9C2CC', 'Employment data coverage', a.covP, a.covS)}
          </div>
          {!a.hasData ? <div style={{ ...panel, padding: '36px 20px', textAlign: 'center', fontSize: '13.5px', color: '#64748B' }}>No employed alumni with a course-relevance response match these filters.</div> : (
            <>
              <section aria-label="Employment Alignment Distribution" style={sectionBox}>
                <SecHead title="Employment alignment distribution" sub="Survey question: “Is your job related to the course you took up in college?”" right={`${a.v} alumni responded`} />
                <div role="img" aria-label={`Aligned ${a.alP}, not aligned ${a.naP}`} style={{ display: 'flex', height: '22px', borderRadius: '7px', overflow: 'hidden', background: '#EEF2EF', gap: '2px' }}>
                  {a.seg.map((g) => <div key={g.label} style={{ width: g.w, background: g.color, minWidth: '2px' }} />)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: '10px' }}>
                  {a.seg.map((g) => (
                    <div key={g.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: '1px solid #EEF0F3', borderRadius: '12px' }}>
                      <span style={{ flex: 'none', width: '10px', height: '10px', borderRadius: '3px', background: g.color }} />
                      <div style={{ flex: '1', minWidth: '0' }}><div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220' }}>{g.label}</div><div style={{ fontSize: '11.5px', color: '#64748B' }}>{g.ans}</div></div>
                      <div style={{ textAlign: 'right' }}><div style={{ fontWeight: '700', fontSize: '15px', color: '#0B1220', fontVariantNumeric: 'tabular-nums' }}>{g.pct}</div><div style={{ fontSize: '11.5px', color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>{g.n} alumni</div></div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>{a.miss} employed alumni left this question blank and are excluded from the percentages.</div>
              </section>

              <section aria-label="Alignment by Academic Program" style={sectionBox}>
                <SecHead title="Alignment by academic program" sub="Share of employed graduates in a related job · select a program to inspect its breakdown" right={a.progCount} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: '18px', alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {a.progs.map((p) => (
                      <div key={p.key} role="button" tabIndex={0} aria-pressed={p.pressed} title={p.full} onKeyDown={onActivate(p.onClick)} onClick={p.onClick}
                        style={{ display: 'grid', gridTemplateColumns: 'minmax(0,96px) minmax(0,1fr) 56px', gap: '10px', alignItems: 'center', padding: '7px 10px', borderRadius: '10px', border: `1px solid ${p.border}`, background: p.bg, cursor: 'pointer' }}
                        {...hv({ background: '#F3F7F5' })}
                      >
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#0B1220', ...ellipsis }}>{p.code}</span>
                        <span style={{ height: '10px', borderRadius: '6px', background: '#EEF4F1', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: p.w, background: p.color, borderRadius: '6px' }} /></span>
                        <span style={{ fontWeight: '700', fontSize: '13px', color: '#0B1220', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.pct}</span>
                      </div>
                    ))}
                    {a.progMore ? (
                      <button type="button" onClick={a.progToggle} style={{ alignSelf: 'flex-start', marginTop: '6px', font: 'inherit', fontSize: '12.5px', fontWeight: '700', color: '#0F3D2E', cursor: 'pointer', padding: '4px 10px', border: '0', background: 'transparent' }} {...hv({ textDecoration: 'underline' })}>{a.progToggleL}</button>
                    ) : null}
                  </div>
                  {!s ? (
                    <div style={{ minHeight: '160px', border: '1px dashed #D5DCD8', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center', fontSize: '13px', color: '#64748B' }}>Select a program bar to see its aligned / not-aligned split, top occupations and industries.</div>
                  ) : (
                    <div style={{ border: '1px solid #E3E8E5', background: '#F8FAF9', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '0', gridColumn: a.selExp ? '1 / -1' : 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: '0' }}><div style={{ fontWeight: '700', fontSize: '14.5px', color: '#0B1220', textWrap: 'pretty' }}>{s.full}</div><div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{s.college}</div></div>
                        <button type="button" onClick={a.selClose} aria-label="Clear program selection" style={{ flex: 'none', width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #E7E9ED', background: '#fff', cursor: 'pointer', color: '#475569', fontSize: '15px', padding: '0', fontFamily: 'inherit' }}>×</button>
                      </div>
                      <div style={{ display: 'flex', height: '14px', borderRadius: '5px', overflow: 'hidden', gap: '2px' }}><div style={{ width: s.aW, background: '#0F3D2E' }} /><div style={{ width: s.nW, background: '#D4B25A' }} /></div>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12.5px', color: '#334155' }}>
                        <span><b style={{ color: '#0F3D2E' }}>{s.aP}</b> aligned · {s.aN}</span>
                        <span><b style={{ color: '#7A6328' }}>{s.nP}</b> not aligned · {s.nN}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,180px),1fr))', gap: '12px' }}>
                        <TopList title="Top occupations" items={s.jobs} />
                        <TopList title="Top industries" items={s.inds} />
                      </div>
                      <button type="button" onClick={a.selToTable} aria-expanded={a.selExp}
                        style={{ alignSelf: 'flex-start', font: 'inherit', fontSize: '12.5px', fontWeight: '700', color: '#0F3D2E', cursor: 'pointer', border: '1px solid #CFE0D7', background: '#fff', borderRadius: '10px', padding: '7px 12px' }}
                        {...hv({ background: '#EEF6F2' })}
                      >
                        {a.selBtn}
                      </button>
                      {a.selExp ? (
                        <div style={{ background: '#fff', border: '1px solid #E7E9ED', borderRadius: '12px', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '10px 12px', borderBottom: '1px solid #F1F2F4' }}>
                            <input type="search" value={a.selQ} onChange={a.selOnQ} placeholder="Search alumni, occupation or industry" aria-label="Search program alumni" style={{ ...search, flex: '1 1 180px', padding: '7px 12px', fontSize: '12.5px' }} />
                            <select value={a.selAlVal} onChange={a.selOnAl} aria-label="Classification" style={{ ...pillSel, padding: '7px 12px', fontSize: '12.5px' }}>
                              <option value="all">All</option><option value="Yes">Aligned</option><option value="No">Not aligned</option>
                            </select>
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <div style={{ minWidth: '560px' }}>
                              <div style={{ ...thRow, display: 'grid', gridTemplateColumns: DA_SEL, gap: '10px', padding: '8px 12px', fontSize: '10.5px' }}><div>Alumni</div><div>Batch</div><div>Occupation</div><div>Industry</div><div>Classification</div></div>
                              {a.selRows.map((r) => (
                                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: DA_SEL, gap: '10px', padding: '9px 12px', borderTop: '1px solid #F1F2F4', fontSize: '12.5px', color: '#334155', alignItems: 'center' }}>
                                  <div style={{ fontWeight: '600', color: '#0B1220' }}>{r.name}</div><div>{r.batch}</div><div>{r.job}</div>
                                  <div title={r.ind} style={ellipsis}>{r.ind}</div>
                                  <div><span style={{ ...pill(r.clsC, r.clsBg, '11px'), padding: '3px 8px' }}>{r.cls}</span></div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {a.selEmpty ? <div style={{ padding: '16px 12px', fontSize: '12.5px', color: '#64748B', textAlign: 'center', borderTop: '1px solid #F1F2F4' }}>No alumni match the search or filter.</div> : null}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', padding: '9px 12px', borderTop: '1px solid #EEF0F3' }}>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>{a.selNote}</div>
                            {a.selPaged ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button type="button" onClick={a.selPrev} aria-label="Previous page" style={{ ...pageBtn, borderRadius: '8px', height: '28px', padding: '0 10px', fontSize: '12px', opacity: a.selPrevOp }}>Prev</button>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#0B1220' }}>{a.selPageL}</span>
                                <button type="button" onClick={a.selNext} aria-label="Next page" style={{ ...pageBtn, borderRadius: '8px', height: '28px', padding: '0 10px', fontSize: '12px', opacity: a.selNextOp }}>Next</button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </section>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,440px),1fr))', gap: '16px' }}>
                <section aria-label="Common Graduate Occupations" style={{ ...sectionBox, gap: '12px' }}>
                  <SecHead title="Common graduate occupations" sub={`Reported job titles · ${a.empN} employed alumni`} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {a.occ.map((o) => (
                      <div key={o.t} style={{ display: 'grid', gridTemplateColumns: '24px minmax(0,1fr) 44px', gap: '10px', alignItems: 'center' }}>
                        <span style={{ width: '24px', height: '24px', borderRadius: '7px', background: o.rankBg, color: o.rankC, fontSize: '11.5px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{o.rank}</span>
                        <div style={{ minWidth: '0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '13px' }}><span style={{ fontWeight: '600', color: '#0B1220', ...ellipsis }}>{o.t}</span><span style={{ flex: 'none', fontSize: '11.5px', color: '#64748B' }}>{o.aln}</span></div>
                          <span style={{ height: '6px', borderRadius: '4px', background: '#EEF4F1', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: o.w, background: '#4FA383', borderRadius: '4px' }} /></span>
                        </div>
                        <span style={{ fontWeight: '700', fontSize: '13.5px', color: '#0B1220', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{o.n}</span>
                      </div>
                    ))}
                  </div>
                </section>
                <section aria-label="Industry Distribution" style={{ ...sectionBox, gap: '12px' }}>
                  <SecHead title="Industry distribution" sub="Employer's major line of business · share of employed alumni" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    {a.ind.map((i) => (
                      <div key={i.t} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '13px' }}>
                          <span style={{ color: '#0B1220', fontWeight: '500', minWidth: '0', textWrap: 'pretty' }}>{i.t}</span>
                          <span style={{ flex: 'none', fontVariantNumeric: 'tabular-nums' }}><b style={{ color: '#0B1220' }}>{i.n}</b><span style={{ color: '#64748B' }}> · {i.pct}</span></span>
                        </div>
                        <span style={{ height: '8px', borderRadius: '5px', background: '#EEF4F1', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: i.w, background: i.color, borderRadius: '5px' }} /></span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section aria-label="Key Insights" style={{ ...sectionBox, gap: '12px' }}>
                <SecHead title="Key insights" sub={a.insBasis} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {a.ins.map((i) => (
                    <div key={i.lead} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '11px 12px', border: `1px solid ${i.border}`, background: i.bg, borderRadius: '12px' }}>
                      <span style={{ flex: 'none', width: '8px', height: '8px', borderRadius: '50%', background: i.dot, marginTop: '6px' }} />
                      <div style={{ fontSize: '13px', lineHeight: '1.45', color: '#334155', textWrap: 'pretty' }}><b style={{ color: i.color }}>{i.lead}</b> {i.text}</div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <section aria-label="Detailed Breakdown" style={{ ...panel, overflow: 'hidden', flex: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '14px 18px', borderBottom: '1px solid #EEF0F3' }}>
              <div><div style={{ fontWeight: '700', fontSize: '15px', color: '#0B1220' }}>Detailed breakdown</div><div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Employed alumni with a recorded course-relevance answer, latest batch first</div></div>
              <button type="button" onClick={a.exportCsv} style={darkBtn} {...hv({ background: '#1d5a45' })}><DownloadIcon /><span>Export CSV</span></button>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '12px 18px', borderBottom: '1px solid #F1F2F4' }}>
              <input type="search" value={a.q} onChange={a.onQ} placeholder="Search name, program or occupation" aria-label="Search detailed breakdown" style={{ ...search, flex: '1 1 240px' }} />
              <select value={a.tAlVal} onChange={a.onTAl} aria-label="Alignment classification" style={pillSel}>
                <option value="all">All classifications</option><option value="Yes">Aligned</option><option value="No">Not aligned</option>
              </select>
              <Select label="Program" value={a.tProgVal} onChange={a.onTProg} opts={a.tProgOpts} style={{ maxWidth: 'min(100%,280px)' }} />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: '720px' }}>
                <div style={{ ...thRow, display: 'grid', gridTemplateColumns: DA_ROW }}><div>Alumni</div><div>Program</div><div>Batch</div><div>Occupation</div><div>Industry</div><div>Classification</div></div>
                {a.rows.map((r) => (
                  <div key={r.id} style={{ display: 'grid', gridTemplateColumns: DA_ROW, gap: '12px', padding: '11px 18px', borderTop: '1px solid #F1F2F4', fontSize: '13px', color: '#334155', alignItems: 'center' }}>
                    <div style={{ fontWeight: '600', color: '#0B1220' }}>{r.name}</div>
                    <div title={r.progFull} style={{ cursor: 'help' }}>{r.prog}</div>
                    <div>{r.batch}</div><div>{r.job}</div>
                    <div title={r.ind} style={ellipsis}>{r.ind}</div>
                    <div><span style={pill(r.clsC, r.clsBg)}>{r.cls}</span></div>
                  </div>
                ))}
              </div>
            </div>
            {a.rowsEmpty ? <div style={{ padding: '22px 18px', fontSize: '13px', color: '#64748B', textAlign: 'center', borderTop: '1px solid #F1F2F4' }}>No records match the search or filters.</div> : null}
            <Pager note={a.pageNote} label={a.pageL} prev={a.prev} next={a.next} prevOp={a.prevOp} nextOp={a.nextOp} />
          </section>
        </>
      )}
    </Shell>
  );
}
