import React, { useEffect } from 'react';
import { hv } from '../lib/stateStyle';
import NavSidebar from '../components/NavSidebar';
import SearchPill from '../components/topbar/SearchPill';
import NotificationBell from '../components/topbar/NotificationBell';
import UserChip from '../components/topbar/UserChip';
import { onActivate, onBackdrop } from '../lib/a11y';
import ForecastPanel from '../components/ForecastPanel';
import RangeError from '../components/RangeError';

const card = {
  background: '#fff',
  border: '1px solid #E7E9ED',
  borderRadius: '16px',
  boxShadow: '0 1px 2px rgba(16,24,40,.04),0 10px 26px -14px rgba(16,24,40,.14)',
  padding: '16px 18px',
  boxSizing: 'border-box',
  minWidth: '0',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};
const cardTitle = { fontWeight: '700', fontSize: '19px', letterSpacing: '-.3px', color: '#0B1220' };
const link = { fontSize: '14px', fontWeight: '700', color: '#0F6B4F', cursor: 'pointer', whiteSpace: 'nowrap' };
const linkHover = { textDecoration: 'underline' };
/* Pill select in the chart header. */
const pillSelect = {
  border: '1px solid #E7E9ED', borderRadius: '999px', background: '#fff', padding: '9px 30px 9px 14px', fontFamily: 'inherit', fontSize: '14px', fontWeight: '700',
  color: '#0B1220', cursor: 'pointer', outline: 'none', maxWidth: '190px', textOverflow: 'ellipsis',
};
const bareSelect = { border: '0', outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', color: '#0B1220', cursor: 'pointer', minWidth: '0' };
const closeBtn = {
  flex: 'none', width: '34px', height: '34px', borderRadius: '50%', border: '1px solid #E7E9ED', background: '#fff', display: 'flex',
  alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', fontSize: '18px', fontFamily: 'inherit',
};
/* Label · bar · count · share row in the population dialog. */
const popRow = (cols) => ({ display: 'grid', gridTemplateColumns: `${cols} minmax(0,1fr) 52px 44px`, gap: '8px', alignItems: 'center', fontSize: '12px' });
/* The one hover tooltip used across the dashboard: dark box, grey heading, bold white value. */
const tipBox = {
  position: 'absolute', pointerEvents: 'none', zIndex: '50', background: '#0B1220', color: '#fff', borderRadius: '8px', padding: '7px 11px',
  whiteSpace: 'nowrap', boxShadow: '0 8px 20px -6px rgba(11,18,32,.35)', display: 'flex', flexDirection: 'column', gap: '2px', fontFamily: 'inherit',
};
const tipHead = { fontSize: '11.5px', fontWeight: '600', color: '#A7B0BC' };
const tipVal = { fontSize: '13px', fontWeight: '700', color: '#fff' };
const tipNote = { fontWeight: '500', color: '#A7B0BC' };
const dot = (bg, size = '9px', radius = '50%') => ({ width: size, height: size, borderRadius: radius, background: bg, flex: 'none' });
const legendItem = { display: 'flex', alignItems: 'center', gap: '6px' };

/** Centered dialog on a dark backdrop (closes on Esc or a backdrop click). */
function Dialog({ label, onClose, width, bg = '#fff', children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div onClick={onBackdrop(onClose)} role="presentation"
      style={{ position: 'fixed', inset: '0', zIndex: '80', background: 'rgba(11,18,32,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'var(--udm-sans)', boxSizing: 'border-box' }}
    >
      <div role="dialog" aria-modal="true" aria-label={label}
        style={{ width: '100%', maxWidth: width, maxHeight: '100%', overflow: 'auto', background: bg, borderRadius: '16px', boxShadow: '0 24px 60px -12px rgba(0,20,16,.35)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}
      >
        {children}
      </div>
    </div>
  );
}

function PopBars({ title, rows, cols = '90px' }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E7E9ED', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontWeight: '600', fontSize: '13.5px', color: '#0B1220' }}>{title}</div>
      {rows.map((r) => (
        <div key={r.label} title={r.full} style={popRow(cols)}>
          <span style={{ fontWeight: '600', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
          <div style={{ height: '7px', borderRadius: '99px', background: '#EEF4F1', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: r.w, background: r.color, borderRadius: '99px' }} />
          </div>
          <span style={{ fontWeight: '700', textAlign: 'right', color: '#0B1220' }}>{r.n}</span>
          <span style={{ color: '#94A3B8', textAlign: 'right' }}>{r.pct}</span>
        </div>
      ))}
    </div>
  );
}

/** Card header: title on the left, an optional "View all →"-style link on the right. */
function CardHead({ title, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
      <div style={cardTitle}>{title}</div>
      {action ? <div role="link" tabIndex={0} onKeyDown={onActivate(onAction)} onClick={onAction} style={link} {...hv(linkHover)}>{action}</div> : null}
    </div>
  );
}

const Empty = ({ children }) => <div style={{ flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px 0', fontSize: '12.5px', color: '#94A3B8', textAlign: 'center' }}>{children}</div>;

/** "Employability Rate by Batch" / "Total Registered Alumni" chart (geometry from lib/adminOverview.js). */
function OutcomeChart({ c, onHover }) {
  return (
    <div data-m="ov-svg" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <svg viewBox={c.vb} role="img" aria-label={c.title} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id="ocArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0F3D2E" stopOpacity=".22" />
            <stop offset="1" stopColor="#0F3D2E" stopOpacity="0" />
          </linearGradient>
        </defs>
        {c.rate ? (
          <g>
            {c.gridA.map((g) => (
              <g key={g.l}>
                <line x1={c.L} x2={c.x2} y1={g.y} y2={g.y} stroke="#EEF0F3" />
                <text x={c.L - 12} y={g.y} textAnchor="end" dominantBaseline="middle" fontSize={c.fs} fontWeight="500" fill="#334155">{g.l}</text>
              </g>
            ))}
            <rect x={c.fx} y={c.T} width={c.fw} height={c.ph} rx="8" fill="#F4F7F5" stroke="#E3EAE6" strokeDasharray="4 4" />
            <text x={c.flx} y={c.fly} textAnchor="middle" fontSize={c.fsS} fontWeight="600" fill="#64748B">{c.fyLabel}</text>
            <line x1={c.L} x2={c.x2} y1={c.targetY} y2={c.targetY} stroke="#C99A12" strokeWidth="1.4" strokeDasharray="6 5" />
            <text x={c.L + 8} y={c.targetLabelY} textAnchor="start" fontSize={c.fsS} fontWeight="700" fill="#8A6D1F">Target: {c.target}%</text>
            <line x1={c.vx} x2={c.vx} y1={c.T} y2={c.vb2} stroke="#D5DBE0" strokeDasharray="3 3" />
            <path d={c.fcR} fill="none" stroke="#E3A91B" strokeWidth="2.2" strokeDasharray="5 4" strokeLinecap="round" />
            <path d={c.fcE} fill="none" stroke="#0F3D2E" strokeWidth="2.2" strokeDasharray="5 4" strokeLinecap="round" />
            <path d={c.lineR} fill="none" stroke="#E3A91B" strokeWidth="2.5" strokeLinecap="round" />
            <path d={c.lineE} fill="none" stroke="#0F3D2E" strokeWidth="2.5" strokeLinecap="round" />
            {c.dotsR.map((d) => <circle key={`r${d.cx}`} cx={d.cx} cy={d.cy} r={d.r} fill={d.f} stroke={d.s} strokeWidth="2" />)}
            {c.dotsE.map((d) => <circle key={`e${d.cx}`} cx={d.cx} cy={d.cy} r={d.r} fill={d.f} stroke={d.s} strokeWidth="2" />)}
          </g>
        ) : (
          <g>
            {c.gridB.map((g) => (
              <g key={g.l}>
                <line x1={c.L} x2={c.x2} y1={g.y} y2={g.y} stroke="#EEF0F3" />
                <text x={c.L - 12} y={g.y} textAnchor="end" dominantBaseline="middle" fontSize={c.fs} fontWeight="500" fill="#334155">{g.l}</text>
              </g>
            ))}
            <path d={c.areaC} fill="url(#ocArea)" />
            <path d={c.fcC} fill="none" stroke="#0F3D2E" strokeWidth="2.2" strokeDasharray="5 4" strokeLinecap="round" />
            <path d={c.lineC} fill="none" stroke="#0F3D2E" strokeWidth="2.5" strokeLinecap="round" />
            {c.dotsC.map((d) => <circle key={d.cx} cx={d.cx} cy={d.cy} r={d.r} fill={d.f} stroke={d.s} strokeWidth="2" />)}
          </g>
        )}
        <line x1={c.L} x2={c.x2} y1={c.bot} y2={c.bot} stroke="#94A3B8" strokeWidth="1.2" />
        <line x1={c.L} x2={c.L} y1={c.T} y2={c.bot} stroke="#94A3B8" strokeWidth="1.2" />
        <text x={c.yTx} y={c.T + c.ph / 2} textAnchor="middle" fontSize={c.fsT} fontWeight="600" fill="#334155" transform={`rotate(-90 ${c.yTx} ${c.T + c.ph / 2})`}>{c.yTitle}</text>
        {c.showXTitle ? <text x={c.L + c.pw / 2} y={c.H - 8} textAnchor="middle" fontSize={c.fsT} fontWeight="600" fill="#334155">Graduation Year</text> : null}
        {c.xs.map((x) => <text key={x.t} x={x.x} y={x.y} textAnchor="middle" fontSize={c.fs} fontWeight={x.w} fill={x.c}>{x.t}</text>)}
        {c.rate ? (
          <g onMouseLeave={() => onHover(null)}>
            {c.hits.map((h) => <rect key={h.key} x={h.x} y={h.y} width={h.w} height={h.h} fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => onHover(h.i)} />)}
          </g>
        ) : null}
      </svg>
      {c.tipShow ? (
        <div style={{ ...tipBox, left: c.tipX, top: c.tipY, transform: c.tipTf }}>
          <div style={tipHead}>{c.tipYear}</div>
          <div style={tipVal}>
            <span style={{ ...dot('#5FC08F', '7px'), display: 'inline-block', marginRight: '6px' }} />{c.tipEmp} {c.tipEmpLbl}<span style={tipNote}>{c.tipEmpN}</span>
          </div>
          <div style={tipVal}>
            <span style={{ ...dot('#E3A91B', '7px'), display: 'inline-block', marginRight: '6px' }} />{c.tipResp} {c.tipRespLbl}<span style={tipNote}>{c.tipRespN}</span>
          </div>
        </div>
      ) : null}
      {!c.rate ? (
        <div style={{ ...tipBox, left: c.tipCX, top: c.tipCY, transform: 'translate(-100%,calc(-100% - 12px))' }}>
          <div style={tipHead}>Registered alumni</div>
          <div style={tipVal}>{c.tipTot}</div>
        </div>
      ) : null}
    </div>
  );
}

/* View layer for the "Admin Dashboard" screen — converted from the "Admin Dashboard Overview" screen of "UDM Alumni.dc.html". */
export default function AdminDashboardView(v) {
  const {
    admFromOpts, admFromVal, admCollegeOpts, admCollegeVal, admCourseDisabled, admCourseOpacity, admCourseOpts, admCourseVal,
    admFiltered, admOnFrom, admOnTo, admOnCollege, admOnCourse, admOnReset, admOnStatus, admScopeLabel, admStatusOpts, admStatusVal, admToOpts, admToVal, rangeError,
    adDetBarTitle, adDetBars, adDetBig, adDetChips, adDetClose, adDetGo, adDetHasBars, adDetHasRing, adDetOpen, adDetRingBg, adDetRingLabel,
    adDetRingText, adDetRows, adDetSub, adDetTitle, avgMonths, chart, chartTab, chartsRef, closeForecast, engagement, exportHover,
    forecast, forecastOpen, goEvents, goRecords, goReports, insCount, insOpen, insTop, insights, kpiCards,
    onChartHover, onChartTab, popBatch, popClose, popCol, popHeat, popLoading, popMean, popOpen, popProg, popThin, popTotal,
    popTraced, popVer, popYears, programRates, programRatesSub, programRatesTitle, regs, activeCols,
    timeToJob, tipShow, tipTf, tipTitle, tipValue, tipX, tipY, ttjHas, ttjWithin6, upcoming,
  } = v;
  const tab = (id, label) => {
    const on = chartTab === id;
    return (
      <div role="tab" tabIndex={0} aria-selected={on} onKeyDown={onActivate(() => onChartTab(id))} onClick={() => onChartTab(id)}
        style={{ padding: '7px 16px', borderRadius: '99px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', background: on ? '#fff' : 'transparent', color: on ? '#0B1220' : '#64748B', boxShadow: on ? '0 1px 3px rgba(16,24,40,.12)' : 'none' }}
      >
        {label}
      </div>
    );
  };
  return (
    <>
      <div
        data-screen-label="Admin Dashboard"
        style={{
          display: 'flex',
          height: '100vh',
          overflow: 'hidden',
          fontFamily: 'var(--udm-sans)',
          background:
            'radial-gradient(900px 520px at 0% 0%,#FBF1D3 0%,rgba(251,241,211,0) 70%),radial-gradient(800px 500px at 100% 100%,#F8F1DE 0%,rgba(248,241,222,0) 70%),#F7F6F1',
        }}
      >
        <NavSidebar style={{ flex: 'none' }} />
        <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div
            data-m="topbar"
            style={{
              background: '#fff', border: '1px solid #E7E9ED', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 16px 8px 30px', margin: '12px 12px 0', borderRadius: '16px',
              boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)', flex: 'none', minHeight: '70px',
              boxSizing: 'border-box', gap: '16px', minWidth: '0',
            }}
          >
            <div style={{ minWidth: '0', flex: 'none', whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: '700', fontSize: '26px', lineHeight: '1.1', letterSpacing: '-.8px', color: '#0B1220' }}>Admin Dashboard</div>
              <div style={{ fontSize: '13px', color: 'rgba(0,0,0,.45)', fontWeight: '600', letterSpacing: '.3px', marginTop: '4px' }}>UDM Alumni Relations Office</div>
            </div>
            <div data-m="ov-tools" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '40px', padding: '0 16px 0 14px', borderRadius: '999px', border: '1px solid #E7E9ED', background: '#fff', fontSize: '13px', color: '#64748B', flex: 'none', boxSizing: 'border-box' }}>
                <span>Batch</span>
                <select aria-label="Batch from" value={admFromVal} onChange={admOnFrom} style={bareSelect}>
                  {(admFromOpts || []).map((o) => <option key={o.value} value={o.value}>{o.value}</option>)}
                </select>
                <span>–</span>
                <select aria-label="Batch to" value={admToVal} onChange={admOnTo} style={bareSelect}>
                  {(admToOpts || []).map((o) => <option key={o.value} value={o.value}>{o.value}</option>)}
                </select>
                <span style={{ width: '1px', height: '22px', background: '#E7E9ED' }} />
                <select aria-label="Record status" value={admStatusVal} onChange={admOnStatus} style={bareSelect}>
                  {(admStatusOpts || []).map((o) => <option key={o.value} value={o.value}>{o.label.replace(/^Status: /, '')}</option>)}
                </select>
                {admFiltered ? (
                  <>
                    <span style={{ width: '1px', height: '18px', background: '#E7E9ED', margin: '0 4px' }} />
                    <button type="button" onClick={admOnReset} title="Clear the college, course, batch and status filters"
                      style={{ border: 'none', background: 'transparent', padding: '0 2px', font: 'inherit', fontSize: '12.5px', fontWeight: '700', color: '#0F6B4F', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      ↺ Reset
                    </button>
                  </>
                ) : null}
              </div>
              <SearchPill />
              <NotificationBell />
              <UserChip compact />
            </div>
          </div>
          {rangeError ? <div style={{ margin: '8px 12px 0' }}><RangeError message={rangeError} /></div> : null}

          {forecastOpen && forecast ? (
            <Dialog label="Employability forecast" onClose={closeForecast} width="860px">
              <ForecastPanel forecast={forecast} scopeLabel={admScopeLabel} onClose={closeForecast} />
            </Dialog>
          ) : null}

          {adDetOpen ? (
            <Dialog label={adDetTitle} onClose={adDetClose} width="520px">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ minWidth: '0' }}>
                  <div style={{ fontWeight: '700', fontSize: '18px', letterSpacing: '-.3px', color: '#0B1220' }}>{adDetTitle}</div>
                  <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px' }}>{adDetSub}</div>
                </div>
                <button type="button" aria-label="Close" title="Close" onClick={adDetClose} style={closeBtn} {...hv({ background: '#F1F4F3' })}>×</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
                {adDetHasRing ? (
                  <div style={{ flex: 'none', width: '92px', height: '92px', borderRadius: '50%', background: adDetRingBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontWeight: '700', fontSize: '17px', letterSpacing: '-.4px', color: '#0B1220', lineHeight: '1' }}>{adDetRingText}</div>
                      <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748B', marginTop: '3px' }}>{adDetRingLabel}</div>
                    </div>
                  </div>
                ) : null}
                <div style={{ fontWeight: '700', fontSize: '44px', lineHeight: '1', letterSpacing: '-1.4px', color: '#0B1220', flex: '1', minWidth: '0' }}>{adDetBig}</div>
              </div>
              {adDetHasBars ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '8px' }}>
                    {adDetChips.map((c) => (
                      <div key={c.k} style={{ background: '#F6F8F7', border: '1px solid #EEF0F3', borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '0' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.5px', textTransform: 'uppercase', color: '#64748B' }}>{c.k}</div>
                        <div style={{ fontWeight: '700', fontSize: '18px', letterSpacing: '-.4px', color: c.c, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.v}</div>
                        <div style={{ fontSize: '11.5px', color: '#475569' }}>{c.s}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ border: '1px solid #EEF0F3', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.6px', textTransform: 'uppercase', color: '#64748B' }}>{adDetBarTitle}</div>
                    {adDetBars.map((b) => (
                      <div key={b.full} title={b.full} style={{ display: 'grid', gridTemplateColumns: '52px minmax(0,1fr) 54px', alignItems: 'center', gap: '10px', fontSize: '12.5px' }}>
                        <span style={{ fontWeight: '700', color: '#0B1220', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.code}</span>
                        <span style={{ height: '12px', borderRadius: '6px', background: '#EEF4F1', overflow: 'hidden' }}>
                          <span style={{ display: 'block', height: '100%', width: b.w, background: b.color, borderRadius: '6px' }} />
                        </span>
                        <span style={{ fontWeight: '700', color: '#0B1220', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{b.val}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
              <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #EEF0F3', borderRadius: '12px', overflow: 'hidden' }}>
                {adDetRows.map((r) => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '11px 14px', borderBottom: '1px solid #F1F2F4', fontSize: '13px', color: '#334155', background: r.bg, fontWeight: r.w }}>
                    <span>{r.label}</span>
                    <span style={{ color: '#0B1220', fontWeight: '700', textAlign: 'right' }}>{r.value}</span>
                  </div>
                ))}
              </div>
              <div role="button" tabIndex={0} onKeyDown={onActivate(adDetGo)} onClick={adDetGo}
                style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '8px', background: '#0F3D2E', color: '#fff', borderRadius: '12px', padding: '0 18px', minHeight: '40px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                {...hv(exportHover)}
              >
                <span>Open full report</span>
                <span>→</span>
              </div>
            </Dialog>
          ) : null}

          {popOpen ? (
            <Dialog label="Alumni population" onClose={popClose} width="1120px" bg="#F7F8F7">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ minWidth: '0' }}>
                  <div style={{ fontWeight: '700', fontSize: '20px', letterSpacing: '-.4px', color: '#0B1220' }}>Alumni population</div>
                  <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '3px' }}>
                    <b style={{ color: '#0B1220' }}>{popTotal}</b> total · {popTraced} traced · {popVer} verified · {admScopeLabel}
                  </div>
                </div>
                <button type="button" aria-label="Close" title="Close" onClick={popClose} style={closeBtn} {...hv({ background: '#F1F4F3' })}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: '12px' }}>
                <PopBars title="By graduation year (batch)" rows={popBatch} />
                <PopBars title="By department / college" rows={popCol} cols="170px" />
                <PopBars title="By program / course (top 8)" rows={popProg} />
              </div>
              <div style={{ background: '#fff', border: '1px solid #E7E9ED', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', overflowX: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: '600', fontSize: '13.5px', color: '#0B1220' }}>
                    Batch × program heatmap <span style={{ fontWeight: '500', color: '#64748B' }}>· alumni per cohort</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px', color: '#475569', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#0F3D2E' }} />Well represented</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#FBF0D8', border: '1px solid #E3C97E' }} />
                      Thin (under 55% of the {popMean} average) · {popThin}
                    </span>
                  </div>
                </div>
                {popLoading ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '13px', color: '#64748B' }}>Loading…</div>
                ) : !popHeat.length ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '13px', color: '#64748B' }}>No alumni records in this view.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: `90px repeat(${popYears.length},minmax(44px,1fr)) 64px`, gap: '4px', alignItems: 'center', fontSize: '11.5px', minWidth: '520px' }}>
                    <span />
                    {popYears.map((y) => <span key={y} style={{ textAlign: 'center', fontWeight: '700', color: '#64748B' }}>{y}</span>)}
                    <span style={{ textAlign: 'right', fontWeight: '700', color: '#64748B' }}>Total</span>
                    {popHeat.map((h) => (
                      <React.Fragment key={h.full}>
                        <span title={h.full} style={{ fontWeight: '600', color: '#0B1220', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.label}</span>
                        {h.cells.map((c, i) => (
                          <div key={popYears[i]} style={{ height: '30px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', background: c.bg, color: c.color, border: c.ring, boxSizing: 'border-box' }}>{c.n}</div>
                        ))}
                        <span style={{ textAlign: 'right', fontWeight: '700', color: '#0B1220' }}>{h.total}</span>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </Dialog>
          ) : null}

          <div data-m="ov-body" style={{ flex: '1', minHeight: '0', overflowY: 'auto', padding: '10px 12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div data-m="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '16px' }}>
              {(kpiCards || []).map((k) => (
                <div key={k.id} role="button" tabIndex={0} aria-label={`${k.label}: ${k.value}. ${k.delta} ${k.note}`} onKeyDown={onActivate(k.onClick)} onClick={k.onClick}
                  style={{ ...card, flexDirection: 'row', alignItems: 'center', gap: '14px', padding: '10px 16px', cursor: 'pointer', transition: 'box-shadow .18s,border-color .18s' }}
                  {...hv({ boxShadow: '0 2px 4px rgba(16,24,40,.06),0 14px 30px -12px rgba(15,61,46,.28)', borderColor: '#0F3D2E' })}
                >
                  <div aria-hidden="true" style={{ width: '44px', height: '44px', borderRadius: '14px', flex: 'none', background: k.chip, color: k.acc, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}><path d={k.icon} /></svg>
                  </div>
                  <div style={{ minWidth: '0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontSize: '15px', color: '#0B1220', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</div>
                    <div data-m="kpi-val" style={{ fontWeight: '700', fontSize: '28px', lineHeight: '1.1', letterSpacing: '-.8px', color: '#0B1220' }}>{k.value}</div>
                    <div style={{ fontSize: '13px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {k.delta ? <span style={{ color: k.deltaColor, fontWeight: '700' }}>{k.delta}</span> : null}{k.delta ? ' ' : ''}{k.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* The dark chart tooltip (Engagement Trend, Active Colleges, Employability by unit) is placed over this box. */}
            <div ref={chartsRef} style={{ position: 'relative' }}>
            {tipShow ? (
              <div style={{ ...tipBox, left: tipX, top: tipY, transform: tipTf }}>
                <div style={tipHead}>{tipTitle}</div>
                <div style={tipVal}>{tipValue}</div>
              </div>
            ) : null}
            <div data-m="ad-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12,minmax(0,1fr))', gap: '20px', alignItems: 'start', width: '100%' }}>
              <div data-m="ad-main" style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '0' }}>
                <div style={{ ...card, padding: '18px 18px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: '0', flex: '1' }}>
                      <div style={{ fontWeight: '700', fontSize: '21px', letterSpacing: '-.4px', color: '#0B1220' }}>{chart.title}</div>
                      <div style={{ fontSize: '14px', color: '#64748B', marginTop: '6px' }}>{chart.sub}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 'none', flexWrap: 'wrap' }}>
                      <select aria-label="College" value={admCollegeVal} onChange={admOnCollege} style={pillSelect}>
                        {(admCollegeOpts || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <select aria-label="Course" value={admCourseVal} onChange={admOnCourse} disabled={admCourseDisabled} style={{ ...pillSelect, opacity: admCourseOpacity, cursor: admCourseDisabled ? 'default' : 'pointer' }}>
                        {(admCourseOpts || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <div role="tablist" aria-label="Chart" style={{ display: 'flex', gap: '2px', padding: '4px', background: '#F1F4F2', borderRadius: '99px' }}>
                        {tab('rate', 'Employment Rate')}
                        {tab('total', 'Total Alumni')}
                      </div>
                    </div>
                  </div>
                  {chart.rate ? (
                    <div style={{ display: 'flex', gap: '18px', fontSize: '13.5px', color: '#475569', fontWeight: '600', flexWrap: 'wrap' }}>
                      <span style={legendItem}><span style={dot('#0F3D2E', '10px')} />Employment Rate</span>
                      <span style={legendItem}><span style={dot('#E3A91B', '10px')} />Tracer Response Rate</span>
                      <span style={{ ...legendItem, fontWeight: '400', color: '#94A3B8' }}><span style={{ width: '16px', borderTop: '2px dashed #C99A12' }} />Target {chart.target}%</span>
                      <span style={{ ...legendItem, fontWeight: '400', color: '#94A3B8' }}><span style={{ width: '16px', borderTop: '2px dashed #64748B' }} />Dashed = forecast*</span>
                    </div>
                  ) : null}
                  <OutcomeChart c={chart} onHover={onChartHover} />
                  <div style={{ borderTop: '1px solid #EEF0F3', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', minWidth: '0', flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: '700', fontSize: '16px', color: '#0B1220', whiteSpace: 'nowrap' }}>Time to First Job</div>
                        <div style={{ fontSize: '13px', color: '#64748B' }}>
                          {ttjHas ? `${ttjWithin6} of employed graduates land a job within 6 months` : 'No survey answers on time to first job yet'}
                        </div>
                      </div>
                      <div style={{ flex: 'none', background: '#E8F1EC', color: '#0F3D2E', fontWeight: '700', fontSize: '14px', padding: '6px 14px', borderRadius: '99px', whiteSpace: 'nowrap' }}>Average: ~{avgMonths} Months</div>
                    </div>
                    <div style={{ display: 'flex', gap: '3px', height: '13px', borderRadius: '99px', overflow: 'hidden', background: ttjHas ? 'transparent' : '#EEF0F3' }}>
                      {ttjHas ? (timeToJob || []).map((t) => (
                        <div key={t.label} role="button" tabIndex={0} aria-label={`${t.label}: ${t.pct}`} onKeyDown={onActivate(t.onClick)} onClick={t.onClick} onMouseMove={t.onTipMove} onMouseLeave={t.onTipLeave}
                          style={{ flex: `${t.grow} 1 0`, background: t.color, cursor: 'pointer' }}
                        />
                      )) : null}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', fontSize: '13.5px', color: '#475569' }}>
                      {(timeToJob || []).map((t) => (
                        <span key={t.label} style={legendItem}><span style={dot(t.color, '10px')} />{t.label} <b style={{ color: '#0B1220' }}>({t.pct})</b></span>
                      ))}
                    </div>
                  </div>
                </div>

                <div data-m="ad-pair" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '16px', alignItems: 'stretch' }}>
                  <div style={card}>
                    <CardHead title="Alumni Engagement Trend" action="View analytics →" onAction={goReports} />
                    <div style={{ display: 'flex', gap: '10px', height: '100px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '12px', lineHeight: '14px', color: '#94A3B8', minWidth: '18px', marginTop: '-6px', textAlign: 'right' }}>
                        {engagement.ticks.map((t, i) => <span key={`${t}-${i}`}>{t}</span>)}
                      </div>
                      <div style={{ flex: '1', minWidth: '0', borderBottom: '1px solid #D9DEDB', background: 'linear-gradient(#EEF1EF,#EEF1EF) 0 0/100% 1px no-repeat,linear-gradient(#EEF1EF,#EEF1EF) 0 25%/100% 1px no-repeat,linear-gradient(#EEF1EF,#EEF1EF) 0 50%/100% 1px no-repeat,linear-gradient(#EEF1EF,#EEF1EF) 0 75%/100% 1px no-repeat', display: 'flex', alignItems: 'flex-end', gap: '6px', padding: '0 2px', boxSizing: 'border-box' }}>
                        {engagement.bars.map((b) => (
                          <div key={b.key} aria-label={`${b.title}: ${b.val}`} onMouseMove={b.onTipMove} onMouseLeave={b.onTipLeave}
                            style={{ flex: '1', minWidth: '0', height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', borderRadius: '6px', cursor: 'pointer' }}
                            {...hv({ background: '#F4F7F5' })}
                          >
                            <div style={{ width: '100%', maxWidth: '14px', height: b.h, borderRadius: '6px 6px 2px 2px', background: '#0F6B4F' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', paddingLeft: '30px', paddingRight: '2px', fontSize: '12px', color: '#64748B' }}>
                      {engagement.bars.map((b) => <span key={b.key} style={{ flex: '1', minWidth: '0', textAlign: 'center' }}>{b.m}</span>)}
                    </div>
                    <div style={{ borderTop: '1px solid #EEF0F3', marginTop: '6px', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ minWidth: '0' }}>
                          <div style={{ fontWeight: '700', fontSize: '16px', color: '#0B1220' }}>Active Colleges</div>
                          <div style={{ fontSize: '13.5px', color: '#64748B', marginTop: '3px' }}>College accounts signed in within {activeCols.days} days</div>
                        </div>
                        <div style={{ flex: 'none', background: '#E8F1EC', color: '#0F3D2E', fontWeight: '700', fontSize: '14px', padding: '6px 14px', borderRadius: '99px', whiteSpace: 'nowrap' }}>
                          {activeCols.active} of {activeCols.total} active
                        </div>
                      </div>
                      {!activeCols.rows.length ? (
                        <div style={{ fontSize: '13px', color: '#94A3B8' }}>No college accounts yet.</div>
                      ) : (
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                          {activeCols.rows.map((c) => (
                            <span key={c.key} aria-label={`${c.name}: ${c.seen}`} onMouseMove={c.onTipMove} onMouseLeave={c.onTipLeave}
                              style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 14px', borderRadius: '999px', fontSize: '14px', fontWeight: '700', cursor: 'default', background: c.active ? '#E6F0EB' : '#F1F4F2', color: c.active ? '#0F3D2E' : '#94A3B8' }}
                            >
                              <span style={dot(c.active ? '#0F6B4F' : '#CBD5D1', '7px')} />{c.code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={card}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ minWidth: '0' }}>
                        <div style={cardTitle}>{programRatesTitle}</div>
                        <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>{programRatesSub}</div>
                      </div>
                      <div role="link" tabIndex={0} onKeyDown={onActivate(goReports)} onClick={goReports} style={link} {...hv(linkHover)}>Drill down ›</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', overflowX: 'hidden', maxHeight: '230px', padding: '0 6px' }}>
                      {!(programRates || []).length ? <Empty>No survey responses in this view yet.</Empty> : null}
                      {(programRates || []).map((p) => (
                        <div key={p.full} role="button" tabIndex={0} onKeyDown={onActivate(p.onClick)} onClick={p.onClick} onMouseMove={p.onTipMove} onMouseLeave={p.onTipLeave}
                          style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '6px', margin: '0 -6px', borderRadius: '8px', cursor: 'pointer' }}
                          {...hv({ background: '#F5F9F7' })}
                        >
                          <div style={{ width: '52px', flex: 'none', fontWeight: '600', fontSize: '15px', color: '#0B1220', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.program}</div>
                          <div style={{ flex: '1', height: '7px', borderRadius: '99px', background: '#EEF4F1', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '99px', background: '#0F6B4F', width: p.pct }} />
                          </div>
                          <div style={{ width: '52px', flex: 'none', textAlign: 'right', fontWeight: '600', fontSize: '14px', color: '#0B1220' }}>{p.pct}</div>
                          <div style={{ width: '62px', flex: 'none', textAlign: 'center', fontSize: '12.5px', fontWeight: '700', color: p.deltaColor, background: p.deltaBg, borderRadius: '99px', padding: '3px 0', whiteSpace: 'nowrap' }}>{p.arrow} {p.delta}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div data-m="ad-side" style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '0' }}>
                <div style={{ ...card, gap: '6px' }}>
                  <CardHead title="Recent Alumni Registrations" action="View all →" onAction={goRecords} />
                  {!regs.length ? <Empty>No alumni records yet.</Empty> : (
                    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '290px', overflowY: 'auto' }}>
                      {regs.map((r) => (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', flex: 'none', borderBottom: '1px solid #F1F2F4' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', flex: 'none', background: r.bg, color: '#0F3D2E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '15px' }}>{r.ini}</div>
                          <div style={{ flex: '1', minWidth: '0' }}>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#0B1220', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                            <div style={{ fontSize: '13px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.prog}</div>
                          </div>
                          <div style={{ fontSize: '13px', color: '#94A3B8', whiteSpace: 'nowrap' }}>{r.date}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={card}>
                  <CardHead title="Upcoming Events" action="View all →" onAction={goEvents} />
                  {!upcoming.length ? <Empty>No upcoming events.</Empty> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '134px' }}>
                      {upcoming.map((e) => (
                        <div key={e.id} style={{ border: '1px solid #E7E9ED', borderRadius: '12px', padding: '12px 14px', background: '#FBFCFB', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '0', flex: 'none' }}>
                          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                            <div style={{ flex: 'none', width: '52px', borderRadius: '10px', background: '#FDF6DD', border: '1px solid #EFDFA6', textAlign: 'center', padding: '6px 0', color: '#5C4A12' }}>
                              <div style={{ fontWeight: '700', fontSize: '22px', lineHeight: '1' }}>{e.d}</div>
                              <div style={{ fontSize: '11.5px', fontWeight: '700', letterSpacing: '.6px', marginTop: '3px' }}>{e.m}</div>
                            </div>
                            <div style={{ minWidth: '0' }}>
                              <div style={{ fontSize: '16px', fontWeight: '700', color: '#0B1220', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                              <div style={{ fontSize: '14px', color: '#64748B', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.type}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#475569', minWidth: '0' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '0' }}>
                              <span style={{ color: '#E0463A', flex: 'none' }}>●</span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.where}</span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#94A3B8' }}>◷</span>{e.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '0' }}>
                      <span style={dot('#F16C1A', '10px')} />
                      <div role="link" tabIndex={0} onKeyDown={onActivate(insOpen)} onClick={insOpen} style={{ ...cardTitle, cursor: 'pointer' }}>Signals Worth Acting On</div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748B', whiteSpace: 'nowrap' }}>{insCount}</div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B', marginTop: '-4px' }}>Ranked by priority · open a signal for evidence and next steps</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(insights && insights.length ? insights : [insTop]).map((s) => (
                      <button key={s.lead} type="button" onClick={s.onClick || insOpen} aria-haspopup="dialog" aria-label={`${s.pl || ''} ${s.lead}`.trim()}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', fontFamily: 'inherit', background: '#fff', border: '1px solid #E7E9ED', borderRadius: '12px', padding: '11px 12px', cursor: 'pointer', transition: 'background .15s ease,border-color .15s ease' }}
                        {...hv({ background: '#F7FAF8', borderColor: '#CFE3DA' })}
                      >
                        <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {s.pl ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '2px 9px', borderRadius: '99px', color: s.pc, background: s.pbg, border: `1px solid ${s.pbd}` }}>{s.pl}</span>
                              <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B' }}>{s.cat}</span>
                            </div>
                          ) : null}
                          <div style={{ fontSize: '15px', fontWeight: '700', color: '#0B1220', lineHeight: '1.3', textWrap: 'pretty' }}>{s.lead}</div>
                          <div style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.4', textWrap: 'pretty' }}>{String(s.text || '').replace(/^— /, '')}</div>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: '18px', height: '18px', flex: 'none' }}><path d="M9 6l6 6-6 6" /></svg>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
