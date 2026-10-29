import React, { useEffect } from 'react';
import { hv } from '../lib/stateStyle';
import { selectStyle, selectFx } from '../lib/selectStyle';
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
  borderRadius: '14px',
  boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
  minWidth: '0',
};
const liftHover = { transform: 'translateY(-2px)', boxShadow: '0 2px 4px rgba(16,24,40,.05),0 14px 28px -12px rgba(16,24,40,.16)', borderColor: '#D3DAD6' };
const compactSelect = (extra) => selectStyle('12px', '170px', { minWidth: '0', flex: '1 1 0', minHeight: '38px', padding: '0 28px 0 10px', backgroundPosition: 'right 9px center', ...extra });
const closeBtn = {
  flex: 'none', width: '34px', height: '34px', borderRadius: '50%', border: '1px solid #E7E9ED', background: '#fff', display: 'flex',
  alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', fontSize: '18px', fontFamily: 'inherit',
};
/* Label · bar · count · share row in the population dialog. */
const popRow = (cols) => ({ display: 'grid', gridTemplateColumns: `${cols} minmax(0,1fr) 52px 44px`, gap: '8px', alignItems: 'center', fontSize: '12px' });

/** Centered dialog on a dark backdrop (closes on Esc or a backdrop click). */
function Dialog({ label, onClose, width, bg = '#fff', children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div onClick={onBackdrop(onClose)} role="presentation"
      style={{ position: 'fixed', inset: '0', zIndex: '80', background: 'rgba(11,18,32,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Inter,system-ui,sans-serif', boxSizing: 'border-box' }}
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

/* View layer for the "Admin Dashboard" screen — converted from "UDM Alumni.dc.html". */
export default function AdminDashboardView(v) {
  const {
    activeLabor, admFromOpts, admFromVal, admCollegeOpts, admCollegeVal, admCourseDisabled, admCourseOpacity, admCourseOpts, admCourseVal,
    admOnFrom, admOnTo, admOnCollege, admOnCourse, admOnStatus, admScopeLabel, admStatusOpts, admStatusVal, admToOpts, admToVal, rangeError,
    adDetBarTitle, adDetBars, adDetBig, adDetChips, adDetClose, adDetGo, adDetHasBars, adDetHasRing, adDetOpen, adDetRingBg, adDetRingLabel,
    adDetRingText, adDetRows, adDetSub, adDetTitle, avgMonths, batchBars, batchSub, chartsRef, closeForecast, donutTotal, exportHover,
    forecast, forecastOpen, goReports, goReportsIncl, hideTip, inclGroups, insCount, insOpen, insTop, kpiCards, onStatusMove,
    popBatch, popClose, popCol, popHeat, popLoading, popMean, popOpen, popProg, popThin, popTotal, popTraced, popVer, popYears,
    programRates, programRatesSub, programRatesTitle, statusDonut, statusMix, statusOpen, timeToJob, tipShow, tipTitle, tipValue, tipX, tipY,
  } = v;
  return (
    <>
      <div
        data-screen-label="Admin Dashboard"
        style={{
          display: 'flex',
          height: '100vh',
          overflow: 'hidden',
          background:
            'radial-gradient(900px 520px at 0% 0%,#FBF1D3 0%,rgba(251,241,211,0) 70%),radial-gradient(800px 500px at 100% 100%,#F8F1DE 0%,rgba(248,241,222,0) 70%),#F7F6F1',
        }}
      >
        <NavSidebar style={{ flex: 'none' }} />
        <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', backgroundColor: 'transparent' }}>
          <div
            data-m="topbar"
            style={{
              background: '#fff', border: '1px solid #E7E9ED', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 16px 8px 24px', margin: '12px 12px 0', borderRadius: '16px',
              boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)', flex: 'none', minHeight: '60px',
              boxSizing: 'border-box', gap: '16px', minWidth: '0',
            }}
          >
            <div style={{ minWidth: '0' }}>
              <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: '26px', lineHeight: '1.15', letterSpacing: '-.6px', color: '#0B1220' }}>
                Admin Dashboard
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,.45)', fontWeight: '600', letterSpacing: '.3px', marginTop: '4px' }}>
                UDM ALUMNI RELATIONS OFFICE · ADMIN
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <SearchPill />
              <NotificationBell />
              <UserChip />
            </div>
          </div>
          <div
            data-m="ws"
            style={{
              flex: '1', minHeight: '0', margin: '12px', padding: '16px', boxSizing: 'border-box', minWidth: '0', display: 'flex', flexDirection: 'column',
              gap: '12px', overflow: 'hidden', fontFamily: 'Inter,system-ui,sans-serif', background: 'rgba(255,255,255,.55)', border: '1px solid #E7E9ED',
              borderRadius: '20px', boxShadow: '0 1px 2px rgba(16,24,40,.03)',
            }}
          >
            <div
              data-m="ws-head"
              style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'nowrap', padding: '0 0 12px', borderBottom: '1px solid #E3E8E5' }}
            >
              <div style={{ minWidth: '0', flex: 'none' }}>
                <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: '22px', lineHeight: '1.1', letterSpacing: '-.5px', color: '#0B1220' }}>
                  Graduate Outcomes
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '12.5px', color: '#64748B' }}>
                  <span>Survey cycle 2026 · Synced Sep 16</span>
                </div>
              </div>
              <div style={{ flex: '1', minWidth: '0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'nowrap' }}>
                <select aria-label="Batch from" value={admFromVal} onChange={admOnFrom} style={compactSelect({ maxWidth: '120px' })} {...selectFx}>
                  {(admFromOpts || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select aria-label="Batch to" value={admToVal} onChange={admOnTo} style={compactSelect({ maxWidth: '120px' })} {...selectFx}>
                  {(admToOpts || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select aria-label="Record status" value={admStatusVal} onChange={admOnStatus} style={compactSelect()} {...selectFx}>
                  {(admStatusOpts || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select aria-label="College" value={admCollegeVal} onChange={admOnCollege} style={compactSelect()} {...selectFx}>
                  {(admCollegeOpts || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select aria-label="Course" value={admCourseVal} onChange={admOnCourse} disabled={admCourseDisabled} style={compactSelect({ opacity: admCourseOpacity })} {...selectFx}>
                  {(admCourseOpts || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div role="button" tabIndex={0} onKeyDown={onActivate(goReports)} onClick={goReports}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0F3D2E', color: '#fff', borderRadius: '12px', padding: '0 20px', minHeight: '38px', boxSizing: 'border-box', fontSize: '13px', fontWeight: '700', cursor: 'pointer', flex: 'none', whiteSpace: 'nowrap' }}
                  {...hv(exportHover)}
                >
                  <span style={{ fontSize: '12px' }}>↓</span>
                  <span>Export report</span>
                </div>
              </div>
            </div>
            <RangeError message={rangeError} />

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

            <div data-m="kpi-grid" data-m2="ad-kpi" style={{ flex: 'none', display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: '10px' }}>
              {(kpiCards || []).map((k) => (
                <div key={k.id} role="button" tabIndex={0} onKeyDown={onActivate(k.onClick)} onClick={k.onClick} onMouseEnter={k.onEnter} onMouseLeave={k.onLeave}
                  style={{
                    border: `1px solid ${k.border}`, borderRadius: '16px', boxShadow: '0 1px 2px rgba(16,24,40,.04),0 10px 26px -14px rgba(16,24,40,.14)',
                    cursor: 'pointer', transition: 'transform .18s,box-shadow .18s', minWidth: '0', padding: '12px 14px 13px', display: 'flex',
                    flexDirection: 'column', gap: '7px', background: k.bg,
                  }}
                  {...hv({ transform: 'translateY(-3px)', boxShadow: '0 2px 4px rgba(16,24,40,.05),0 18px 30px -12px rgba(16,24,40,.22)' })}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <div aria-hidden="true" style={{ width: '30px', height: '30px', borderRadius: '10px', background: k.chip, color: k.acc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700', flex: 'none' }}>{k.ico}</div>
                    <span aria-hidden="true" style={{ fontSize: '14px', fontWeight: '600', color: k.acc, flex: 'none', transition: 'opacity .18s,transform .18s', opacity: k.arrowOp, transform: k.arrowX }}>→</span>
                  </div>
                  <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#475569', lineHeight: '1.25', letterSpacing: '.2px', textTransform: 'uppercase' }}>{k.label}</div>
                  <div data-m="kpi-val" style={{ fontWeight: '700', fontSize: '30px', lineHeight: '1', letterSpacing: '-1px', color: '#0B1220' }}>{k.value}</div>
                  <div style={{ fontSize: '11.5px', fontWeight: '600', color: k.subColor, lineHeight: '1.3' }}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div ref={chartsRef} style={{ position: 'relative', flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tipShow ? (
                <div
                  style={{
                    position: 'absolute', left: tipX, top: tipY, transform: 'translate(-50%,calc(-100% - 14px))', pointerEvents: 'none', zIndex: '50',
                    background: '#0B1220', color: '#fff', borderRadius: '8px', padding: '7px 11px', whiteSpace: 'nowrap',
                    boxShadow: '0 8px 20px -6px rgba(11,18,32,.35)', display: 'flex', flexDirection: 'column', gap: '2px',
                  }}
                >
                  <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#A7B0BC' }}>{tipTitle}</div>
                  <div style={{ fontSize: '13px', fontWeight: '700' }}>{tipValue}</div>
                </div>
              ) : null}
              <div data-m="ad-charts" style={{ flex: '1', minHeight: '170px', display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr) minmax(0,1.2fr)', gap: '12px' }}>
                <div style={{ ...card, padding: '14px 16px', display: 'flex', flexDirection: 'column', minHeight: '0', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#0B1220' }}>Graduates traced by batch</div>
                    <div style={{ fontSize: '11px', color: '#475569', whiteSpace: 'nowrap' }}>Dashed = 65% target</div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{batchSub}</div>
                  <div style={{ flex: '1', minHeight: '0', display: 'flex', gap: '8px', marginTop: '10px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '0', right: '0', bottom: 'calc(65% * .86 + 22px)', height: '2px', background: 'repeating-linear-gradient(90deg,#0B1220 0 6px,#fff 6px 10px)', zIndex: '2', pointerEvents: 'none' }} />
                    {(batchBars || []).map((b) => (
                      <div key={b.label} role="button" tabIndex={0} aria-label={`Batch ${b.label}: ${b.pct} traced`} onKeyDown={onActivate(b.onClick)} onClick={b.onClick} onMouseMove={b.onTipMove} onMouseLeave={b.onTipLeave}
                        style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'pointer' }}
                      >
                        <div style={{ flex: '1', minHeight: '0', width: '100%', maxWidth: '46px', position: 'relative', background: '#F4F7F5', borderRadius: '8px', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', left: '0', right: '0', bottom: '0', height: b.pct, background: b.color, borderRadius: '8px' }} />
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: b.pctColor }}>{b.pct}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>{b.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ ...card, padding: '14px 16px', display: 'flex', flexDirection: 'column', minHeight: '0', overflow: 'hidden' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#0B1220' }}>Employment status mix</div>
                  <div style={{ flex: '1', minHeight: '0', display: 'flex', alignItems: 'center', gap: '14px', marginTop: '8px' }}>
                    <div role="button" tabIndex={0} aria-label="Employment status mix details" onKeyDown={onActivate(statusOpen)} onClick={statusOpen} onMouseMove={onStatusMove} onMouseLeave={hideTip}
                      style={{ position: 'relative', width: '118px', height: '118px', borderRadius: '50%', background: statusDonut, flex: 'none', cursor: 'pointer' }}
                    >
                      <div style={{ position: 'absolute', inset: '18px', background: '#fff', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', boxShadow: '0 0 0 1px #EEF0F3' }}>
                        <div style={{ fontWeight: '700', fontSize: '18px', lineHeight: '1', letterSpacing: '-.4px', color: '#0B1220' }}>{donutTotal}</div>
                        <div style={{ fontSize: '9.5px', fontWeight: '600', color: '#94A3B8' }}>Respondents</div>
                      </div>
                    </div>
                    <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(statusMix || []).map((s) => (
                        <div key={s.label} role="button" tabIndex={0} onKeyDown={onActivate(s.onClick)} onClick={s.onClick}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}
                          {...hv({ background: '#F4F7F5' })}
                        >
                          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: s.color, flex: 'none' }} />
                          <div title={s.label} style={{ flex: '1', minWidth: '0', fontSize: '12px', fontWeight: '600', color: '#0B1220', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                          <div style={{ fontWeight: '700', fontSize: '12px', color: s.pctColor }}>{s.pct}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#0B4A36', paddingTop: '8px', borderTop: '1px solid #EEF0F3' }}>Overall Active Labor Force: {activeLabor}</div>
                </div>
                <div style={{ ...card, padding: '14px 16px', display: 'flex', flexDirection: 'column', minHeight: '0', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ minWidth: '0' }}>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#0B1220' }}>{programRatesTitle}</div>
                      <div title={programRatesSub} style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{programRatesSub}</div>
                    </div>
                    <div role="button" tabIndex={0} onKeyDown={onActivate(goReports)} onClick={goReports} style={{ fontSize: '12px', fontWeight: '700', color: '#0F6B4F', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Drill down ›
                    </div>
                  </div>
                  <div style={{ flex: '1', minHeight: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', gap: '6px', marginTop: '8px' }}>
                    {!(programRates || []).length ? (
                      <div style={{ fontSize: '12.5px', color: '#94A3B8', textAlign: 'center' }}>No survey responses in this view yet.</div>
                    ) : null}
                    {(programRates || []).map((p) => (
                      <div key={p.full} role="button" tabIndex={0} onKeyDown={onActivate(p.onClick)} onClick={p.onClick} onMouseMove={p.onTipMove} onMouseLeave={p.onTipLeave}
                        style={{ display: 'grid', gridTemplateColumns: '96px minmax(30px,1fr) 40px 64px', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '6px' }}
                        {...hv({ background: '#F4F7F5' })}
                      >
                        <div title={p.full} style={{ fontSize: '12px', fontWeight: '600', color: '#0B1220', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.program}</div>
                        <div style={{ position: 'relative' }}>
                          <div style={{ position: 'absolute', left: '70%', top: '-5px', bottom: '-5px', width: '2px', background: 'repeating-linear-gradient(180deg,#0B1220 0 3px,transparent 3px 5px)', zIndex: '2' }} />
                          <div style={{ height: '7px', borderRadius: '99px', background: '#EEF4F1', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '99px', background: '#0F6B4F', width: p.pct }} />
                          </div>
                        </div>
                        <div style={{ fontWeight: '700', fontSize: '12px', color: '#0B1220', textAlign: 'right' }}>{p.pct}</div>
                        <div style={{ justifySelf: 'end', fontWeight: '700', color: p.deltaColor, background: p.deltaBg, padding: '2px 6px', borderRadius: '999px', whiteSpace: 'nowrap', fontSize: '10.5px' }}>{p.arrow} {p.delta}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div data-m="ad-bottom" style={{ flex: 'none', display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr) minmax(0,1.2fr)', gap: '12px' }}>
                <div style={{ ...card, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#0B1220' }}>Months before first job</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontWeight: '700', fontSize: '20px', letterSpacing: '-.5px', color: '#0B1220' }}>{avgMonths}</span>
                      <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: '600' }}>mo avg</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '2px', height: '24px', borderRadius: '7px', overflow: 'hidden' }}>
                    {(timeToJob || []).map((t) => (
                      <div key={t.label} role="button" tabIndex={0} aria-label={`${t.label}: ${t.pct}`} onKeyDown={onActivate(t.onClick)} onClick={t.onClick} onMouseMove={t.onTipMove} onMouseLeave={t.onTipLeave}
                        style={{ flex: `${t.grow} 1 0`, minWidth: '0', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: t.text, cursor: 'pointer' }}
                      >
                        {t.pct}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px' }}>
                    {(timeToJob || []).map((t) => (
                      <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#334155', whiteSpace: 'nowrap' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: t.color }} />
                        {t.label}
                      </div>
                    ))}
                  </div>
                </div>
                <div role="button" tabIndex={0} onKeyDown={onActivate(insOpen)} onClick={insOpen}
                  style={{ ...card, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px', cursor: 'pointer' }}
                  {...hv(liftHover)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F0C428' }} />
                      <span style={{ fontSize: '11.5px', fontWeight: '700', letterSpacing: '.8px', textTransform: 'uppercase', color: '#0B1220' }}>Signals worth acting on</span>
                    </div>
                    <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#0F6B4F' }}>{insCount} ›</span>
                  </div>
                  <div style={{ fontSize: '12.5px', lineHeight: '1.45', color: '#334155', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    <span style={{ fontWeight: '700', color: '#0B1220' }}>{insTop.lead}</span> {insTop.text}
                  </div>
                </div>
                <div style={{ ...card, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#0B1220' }}>Inclusion profile</div>
                    <div role="button" tabIndex={0} onKeyDown={onActivate(goReportsIncl)} onClick={goReportsIncl} style={{ fontSize: '12px', fontWeight: '700', color: '#0F6B4F', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Open report ›
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {(inclGroups || []).map((g) => (
                      <div key={g.title} role="button" tabIndex={0} onKeyDown={onActivate(g.onClick)} onClick={g.onClick}
                        style={{ border: '1px solid #EEF0F3', borderRadius: '10px', padding: '8px 10px', cursor: 'pointer', minWidth: '0' }}
                        {...hv({ background: '#F4F7F5' })}
                      >
                        <div title={g.title} style={{ fontSize: '11px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '2px 0 5px' }}>
                          <span style={{ fontWeight: '700', fontSize: '20px', letterSpacing: '-.5px', color: '#0B1220' }}>{g.yes}</span>
                          <span style={{ fontSize: '11.5px', color: '#475569' }}>{g.yesPct}</span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '99px', background: '#E3E8E5', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: g.yesPct, minWidth: '3px', background: g.color, borderRadius: '99px' }} />
                        </div>
                      </div>
                    ))}
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
