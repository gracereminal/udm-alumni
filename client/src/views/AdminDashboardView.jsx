import React, { useEffect, useRef } from 'react';
import { hv } from '../lib/stateStyle';
import NavSidebar from '../components/NavSidebar';
import SearchPill from '../components/topbar/SearchPill';
import NotificationBell from '../components/topbar/NotificationBell';
import UserChip from '../components/topbar/UserChip';
import { onActivate, onBackdrop } from '../lib/a11y';
import ForecastPanel from '../components/ForecastPanel';
import RangeError from '../components/RangeError';
import { signalPill } from '../lib/signals';

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
const dot = (bg, size = '9px', radius = '50%') => ({ width: size, height: size, borderRadius: radius, background: bg, flex: 'none' });
const legendItem = { display: 'flex', alignItems: 'center', gap: '6px' };
/* The outcomes chart's light callout (as in the reference). */
const ocTip = {
  position: 'absolute', pointerEvents: 'none', zIndex: '3', background: '#fff', border: '1px solid #E7E9ED', borderRadius: '10px',
  boxShadow: '0 8px 22px -8px rgba(16,24,40,.25)', whiteSpace: 'nowrap',
};

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
function OutcomeChart({ c, onHover, onPick }) {
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
        <g onMouseLeave={() => onHover(null)}>
          {c.hits.map((h) => (
            <rect key={h.key} x={h.x} y={h.y} width={h.w} height={h.h} fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => onHover(h.i)} onClick={() => onPick(h.i)}>
              <title>{h.t}</title>
            </rect>
          ))}
        </g>
      </svg>
      {c.tipShow ? (
        <div style={{ ...ocTip, left: c.tipX, top: c.tipY, transform: c.tipTf, padding: '8px 11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B' }}>{c.tipYear}</div>
          <div style={{ fontSize: '12px', color: '#0B1220' }}>
            <span style={{ ...dot('#0F3D2E', '7px'), display: 'inline-block', marginRight: '6px' }} /><b>{c.tipEmp}</b> {c.tipEmpLbl}<span style={{ color: '#64748B' }}>{c.tipEmpN}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#0B1220' }}>
            <span style={{ ...dot('#E3A91B', '7px'), display: 'inline-block', marginRight: '6px' }} /><b>{c.tipResp}</b> {c.tipRespLbl}<span style={{ color: '#64748B' }}>{c.tipRespN}</span>
          </div>
          {c.tipTgt ? <div style={{ fontSize: '12px', fontWeight: '600', color: c.tipTgtC }}>{c.tipTgt}</div> : null}
          <div style={{ fontSize: '11px', color: '#94A3B8', borderTop: '1px solid #F1F2F4', paddingTop: '4px', marginTop: '1px' }}>{c.tipHint}</div>
        </div>
      ) : null}
      {!c.rate ? (
        <div style={{ ...ocTip, left: c.tipCX, top: c.tipCY, transform: c.tipCTf, padding: '7px 11px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#0B1220' }}>{c.tipTot}</div>
          <div style={{ fontSize: '11px', color: '#64748B' }}>{c.tipTotLbl}</div>
          <div style={{ fontSize: '11px', color: '#94A3B8' }}>{c.tipHint}</div>
        </div>
      ) : null}
    </div>
  );
}

const anStat = { fontWeight: '700', fontSize: '26px', letterSpacing: '-.6px', color: '#0B1220' };
const anLabel = { fontSize: '13px', color: '#64748B' };

/** Stacked bar + legend (employment status, relevance to degree). */
function AnSplit({ title, note, segs }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline' }}>
        <div style={{ fontWeight: '700', fontSize: '15px', color: '#0B1220' }}>{title}</div>
        <div style={{ fontSize: '12.5px', color: '#64748B' }}>{note}</div>
      </div>
      <div style={{ display: 'flex', gap: '3px', height: '12px', borderRadius: '99px', overflow: 'hidden' }}>
        {segs.map((g) => <div key={g.l} title={g.tip} style={{ width: g.w, background: g.c, transition: 'width .35s ease' }} />)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {segs.map((g) => (
          <div key={g.l} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#475569' }}>
            <span style={dot(g.c)} />
            <span style={{ flex: '1', minWidth: '0' }}>{g.l}</span>
            <b style={{ color: '#0B1220' }}>{g.p}</b>
            <span style={{ width: '52px', textAlign: 'right', color: '#94A3B8' }}>{g.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** College / program rows against the target line. */
function AnUnitRows({ rows, cols, side, scroll, target }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', ...(scroll ? { maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' } : {}) }}>
      {rows.map((r) => (
        <div key={r.key} title={r.full} style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: '12px', padding: '5px 8px', borderRadius: '8px', background: r.bg }}>
          <span style={{ fontWeight: r.fw, fontSize: '13.5px', color: '#0B1220', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.code}</span>
          <div style={{ position: 'relative', height: '9px', borderRadius: '99px', background: '#EEF4F1' }}>
            <div style={{ height: '100%', width: r.w, background: r.c, borderRadius: '99px', transition: 'width .35s ease' }} />
            <div style={{ position: 'absolute', left: `${target}%`, top: '-3px', bottom: '-3px', borderLeft: '1.5px dashed #C99A12' }} />
          </div>
          <b style={{ textAlign: 'right', fontSize: '13.5px', color: '#0B1220' }}>{r.v}</b>
          {side === 'tag'
            ? <span style={{ fontSize: '12px', fontWeight: '600', color: r.tc }}>{r.tag}</span>
            : <span style={{ textAlign: 'right', fontSize: '12px', color: '#94A3B8' }}>{r.n}</span>}
        </div>
      ))}
    </div>
  );
}

/** Employment Analysis of the clicked batch, under the outcomes chart (the reference's "Employment Analysis" screen). */
function EmploymentAnalysis({ a }) {
  const target = a.target;
  const pending = a.unitsLoading ? <Empty>Loading…</Empty> : null;
  return (
    <div data-screen-label="Employment Analysis" style={{ borderTop: '1px solid #EEF0F3', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: '0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: '700', fontSize: '18px', letterSpacing: '-.3px', color: '#0B1220' }}>Employment Analysis · {a.batch}</div>
            <span style={{ fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '99px', background: a.kindBg, color: a.kindC }}>{a.kind}</span>
          </div>
          <div style={{ fontSize: '13.5px', color: '#64748B', marginTop: '4px' }}>{a.scope}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {!a.fc ? (
            <div role="tablist" aria-label="Employment analysis" style={{ display: 'flex', gap: '2px', padding: '4px', background: '#F1F4F2', borderRadius: '99px', flexWrap: 'wrap' }}>
              {a.tabs.map((t) => (
                <div key={t.k} role="tab" tabIndex={0} aria-selected={t.on} onKeyDown={onActivate(() => a.onTab(t.k))} onClick={() => a.onTab(t.k)}
                  style={{ padding: '6px 14px', borderRadius: '99px', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', background: t.on ? '#fff' : 'transparent', color: t.on ? '#0B1220' : '#64748B', boxShadow: t.on ? '0 1px 3px rgba(16,24,40,.12)' : 'none', transition: 'background .15s ease' }}
                >
                  {t.l}
                </div>
              ))}
            </div>
          ) : null}
          <button type="button" aria-label="Close analysis" title="Close analysis" onClick={a.onClose} style={sxRound} {...hv({ background: '#F1F4F2' })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ width: '15px', height: '15px' }}><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>
      {a.fc ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#F7F9F8', borderRadius: '12px', padding: '16px 18px' }}>
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            <div>
              <div style={anLabel}>Projected employment rate</div>
              <div style={anStat}>{a.fcEmp}</div>
              <div style={{ fontSize: '12.5px', fontWeight: '600', color: a.vsTC }}>{a.vsT}</div>
            </div>
            <div>
              <div style={anLabel}>Projected tracer response</div>
              <div style={anStat}>{a.fcResp}</div>
            </div>
          </div>
          <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.5', textWrap: 'pretty', maxWidth: '640px' }}>{a.fcNote}</div>
        </div>
      ) : null}
      {!a.fc && a.tab === 'ov' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '12px 24px' }}>
            <div>
              <div style={anLabel}>Employment rate</div>
              <div style={anStat}>{a.rate}</div>
              <div style={{ fontSize: '12.5px', fontWeight: '600', color: a.vsTC }}>{a.vsT}</div>
            </div>
            <div>
              <div style={anLabel}>Tracer response rate</div>
              <div style={anStat}>{a.resp}</div>
              <div style={{ fontSize: '12.5px', color: '#64748B' }}>{a.respSub}</div>
            </div>
            <div>
              <div style={anLabel}>Degree-related jobs</div>
              <div style={anStat}>{a.rel}</div>
              <div style={{ fontSize: '12.5px', color: '#64748B' }}>of employed respondents</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '20px 32px' }}>
            <AnSplit title="Employment status" note={`${a.traced} traced`} segs={a.status} />
            <AnSplit title="Relevance to degree" note={`${a.employed} employed`} segs={a.deg} />
          </div>
        </div>
      ) : null}
      {!a.fc && a.tab === 'fj' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '14px', color: '#475569' }}><b style={{ color: '#0B1220' }}>{a.fj6}</b> of employed graduates found their first job within 6 months</div>
            <div style={{ flex: 'none', background: '#E8F1EC', color: '#0F3D2E', fontWeight: '700', fontSize: '13.5px', padding: '5px 12px', borderRadius: '99px' }}>Average: {a.fjAvg} months</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {a.fj.map((b) => (
              <div key={b.l} style={{ display: 'grid', gridTemplateColumns: 'minmax(96px,120px) minmax(0,1fr) 54px 54px', alignItems: 'center', gap: '12px', fontSize: '13.5px' }}>
                <span style={{ color: '#334155', fontWeight: '500' }}>{b.l}</span>
                <div style={{ height: '9px', borderRadius: '99px', background: '#EEF4F1', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: b.w, background: b.c, borderRadius: '99px', transition: 'width .35s ease' }} />
                </div>
                <b style={{ textAlign: 'right', color: '#0B1220' }}>{b.p}</b>
                <span style={{ textAlign: 'right', color: '#94A3B8' }}>{b.n}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '12.5px', color: '#64748B' }}>Share of {a.fjN} employed respondents who answered · months between graduation and first job</div>
        </div>
      ) : null}
      {!a.fc && a.tab === 'col' ? pending || (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '14px', color: '#475569' }}><b style={{ color: '#0B1220' }}>{a.colAbove}</b> at or above the {target}% target · {a.colNote}</div>
          <AnUnitRows rows={a.cols} cols="64px minmax(0,1fr) 56px 92px" side="tag" target={target} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: '#94A3B8' }}><span style={{ width: '14px', borderTop: '1.5px dashed #C99A12' }} />Target {target}%</div>
        </div>
      ) : null}
      {!a.fc && a.tab === 'pr' ? pending || (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '8px 24px', fontSize: '13.5px', color: '#475569' }}>
            <div>Highest · <b style={{ color: '#0F6B4F' }}>{a.prHi}</b></div>
            <div>Lowest · <b style={{ color: '#8A6D1F' }}>{a.prLo}</b></div>
          </div>
          <AnUnitRows rows={a.progs} cols="minmax(72px,110px) minmax(0,1fr) 56px 76px" side="n" scroll target={target} />
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>{a.prNote}</div>
        </div>
      ) : null}
      <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.5' }}>Self-reported employment data from the UDM Graduate Tracer Survey · rates use the same calculation as Reports (employed ÷ traced graduates in the labour force).</div>
    </div>
  );
}

/* View layer for the "Admin Dashboard" screen — converted from the "Admin Dashboard Overview" screen of "UDM Alumni.dc.html". */
/** Numbered section of the insight drawer. */
function SxSection({ n, title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E7E9ED', borderRadius: '14px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#0F3D2E', color: '#fff', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{n}</span>
        <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '.7px', textTransform: 'uppercase', color: '#475569' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

const sxRound = { width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #E7E9ED', background: '#fff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0' };
const texts = (a) => (a || []).filter(Boolean);

/** Insight Details: the selected signal's finding, evidence, interpretation, actions, priority and owners (side drawer). */
function InsightDrawer({ sx }) {
  const i = sx.cur;
  const p = signalPill(i);
  const closeRef = useRef(null);
  useEffect(() => { if (closeRef.current) closeRef.current.focus(); }, [i.id]);
  // Esc closes; the arrow keys step through the signals.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') sx.close();
      else if (e.key === 'ArrowRight') sx.next();
      else if (e.key === 'ArrowLeft') sx.prev();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sx]);
  const pill = (size, pad) => ({ fontSize: size, fontWeight: '700', padding: pad, borderRadius: '99px', color: p.pc, background: p.pbg, border: `1px solid ${p.pbd}` });
  return (
    <div data-screen-label="Insight Details" onClick={onBackdrop(sx.close)} role="presentation"
      style={{ position: 'fixed', inset: '0', zIndex: '86', background: 'rgba(11,18,32,.38)', display: 'flex', justifyContent: 'flex-end', fontFamily: 'var(--udm-sans)' }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="sx-title"
        style={{ width: 'min(620px,100%)', height: '100%', background: '#F7F8F7', boxShadow: '-24px 0 60px -20px rgba(0,20,16,.35)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}
      >
        <div style={{ background: '#fff', borderBottom: '1px solid #E7E9ED', padding: '16px 20px 14px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={pill('12px', '3px 10px')}>{p.pl}</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748B' }}>{i.cat}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12.5px', color: '#64748B', marginRight: '4px' }}>{sx.pos}</span>
              <button type="button" onClick={sx.prev} aria-label="Previous insight" style={sxRound} {...hv({ background: '#F1F4F2' })}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '15px', height: '15px' }}><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <button type="button" onClick={sx.next} aria-label="Next insight" style={sxRound} {...hv({ background: '#F1F4F2' })}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '15px', height: '15px' }}><path d="M9 6l6 6-6 6" /></svg>
              </button>
              <button type="button" ref={closeRef} onClick={sx.close} aria-label="Close insight" style={{ ...sxRound, marginLeft: '4px' }} {...hv({ background: '#F1F4F2' })}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ width: '14px', height: '14px' }}><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          </div>
          <div>
            <h2 id="sx-title" style={{ margin: '0', fontWeight: '700', fontSize: '22px', letterSpacing: '-.4px', lineHeight: '1.25', color: '#0B1220', textWrap: 'pretty' }}>{i.title}</h2>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>{i.scope}</div>
          </div>
        </div>
        <div style={{ flex: '1', minHeight: '0', overflowY: 'auto', overscrollBehavior: 'contain', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {i.low ? (
            <SxSection n="!" title="Not enough data">
              <div style={{ fontSize: '14.5px', color: '#334155', lineHeight: '1.55', textWrap: 'pretty' }}>{i.low}</div>
              <div style={{ fontSize: '13.5px', color: '#64748B', lineHeight: '1.5' }}>No finding is generated for this signal until the minimum sample is reached, to avoid misleading conclusions. Widen the dashboard filters or collect more tracer responses.</div>
            </SxSection>
          ) : (
            <>
              <SxSection n="1" title="Finding">
                <div style={{ fontSize: '15.5px', color: '#0B1220', lineHeight: '1.55', textWrap: 'pretty' }}>{i.finding}</div>
              </SxSection>
              <SxSection n="2" title="Evidence">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '10px 18px' }}>
                  {i.stats.map((s) => (
                    <div key={s.l}>
                      <div style={{ fontWeight: '700', fontSize: '24px', letterSpacing: '-.6px', color: '#0B1220', fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                      <div style={{ fontSize: '12.5px', color: '#64748B', lineHeight: '1.35' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {i.rows.length ? (
                  <div style={{ borderTop: '1px solid #EEF0F3', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>{i.bTitle}</div>
                    {i.rows.map((r) => (
                      <div key={r.l} title={r.full || r.l} style={{ display: 'grid', gridTemplateColumns: 'minmax(70px,1.1fr) minmax(0,1.4fr) auto', alignItems: 'center', gap: '12px', fontSize: '13.5px' }}>
                        <span style={{ fontWeight: '600', color: '#0B1220', lineHeight: '1.3' }}>{r.l}</span>
                        <span style={{ height: '8px', borderRadius: '99px', background: '#EEF4F1', overflow: 'hidden' }}>
                          <span style={{ display: 'block', height: '100%', width: r.w, background: r.c || '#0F6B4F', borderRadius: '99px' }} />
                        </span>
                        <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <b style={{ color: '#0B1220', fontVariantNumeric: 'tabular-nums' }}>{r.v}</b>
                          <span style={{ color: '#94A3B8', fontSize: '12.5px' }}> · {r.note}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </SxSection>
              <SxSection n="3" title="Interpretation">
                <div style={{ fontSize: '14.5px', color: '#334155', lineHeight: '1.55', textWrap: 'pretty' }}>{i.means}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#0F6B4F' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ width: '13px', height: '13px' }}><path d="M20 6L9 17l-5-5" /></svg>
                    Verified from tracer records
                  </div>
                  {texts(i.facts).map((t) => <div key={t} style={{ fontSize: '13.5px', color: '#334155', lineHeight: '1.5', paddingLeft: '19px', textWrap: 'pretty' }}>{t}</div>)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#FBF8EE', border: '1px solid #EFE3BD', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#7A5E0E' }}>Possible explanations · not verified</div>
                  {texts(i.maybes).map((t) => <div key={t} style={{ fontSize: '13.5px', color: '#5C4A12', lineHeight: '1.5', textWrap: 'pretty' }}>{t}</div>)}
                </div>
              </SxSection>
              <SxSection n="4" title="Recommended actions">
                <ol style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {texts(i.actions).map((t) => <li key={t} style={{ fontSize: '14px', color: '#0B1220', lineHeight: '1.5', textWrap: 'pretty' }}>{t}</li>)}
                </ol>
              </SxSection>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '12px' }}>
                <SxSection n="5" title="Priority">
                  <span style={{ ...pill('13px', '3px 11px'), alignSelf: 'flex-start' }}>{p.pl}</span>
                  <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', textWrap: 'pretty' }}>{i.criteria}</div>
                </SxSection>
                <SxSection n="6" title="Responsible">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {texts(i.roles).map((t) => <div key={t} style={{ fontSize: '14px', fontWeight: '600', color: '#0B1220' }}>{t}</div>)}
                  </div>
                </SxSection>
              </div>
              <SxSection n="7" title="Related actions">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {i.links.map((a, k) => (
                    <button key={a.l} type="button" onClick={sx.go(a.go)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontFamily: 'inherit', fontSize: '13.5px', fontWeight: '700', padding: '9px 15px', borderRadius: '99px', cursor: 'pointer', color: k ? '#0F3D2E' : '#fff', background: k ? '#fff' : '#0F3D2E', border: `1px solid ${k ? '#CFE0D7' : '#0F3D2E'}` }}
                      {...hv({ filter: 'brightness(.96)' })}
                    >
                      {a.l}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: '13px', height: '13px' }}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', borderTop: '1px solid #EEF0F3', paddingTop: '10px' }}><b style={{ color: '#0B1220' }}>Monitor:</b> {i.monitor}</div>
                {i.gap ? (
                  <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', background: '#F4F6F8', border: '1px dashed #CBD5E1', borderRadius: '10px', padding: '10px 12px', textWrap: 'pretty' }}><b style={{ color: '#334155' }}>Workflow gap:</b> {i.gap}</div>
                ) : null}
              </SxSection>
            </>
          )}
          <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.5' }}>{i.basis}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardView(v) {
  const {
    admFromOpts, admFromVal, admCollegeOpts, admCollegeVal, admCourseDisabled, admCourseOpacity, admCourseOpts, admCourseVal,
    admFiltered, admOnFrom, admOnTo, admOnCollege, admOnCourse, admOnReset, admOnStatus, admScopeLabel, admStatusOpts, admStatusVal, admToOpts, admToVal, rangeError,
    adDetBarTitle, adDetBars, adDetBig, adDetChips, adDetClose, adDetGo, adDetHasBars, adDetHasRing, adDetOpen, adDetRingBg, adDetRingLabel,
    adDetRingText, adDetRows, adDetSub, adDetTitle, avgMonths, chart, chartTab, chartsRef, closeForecast, engagement, exportHover,
    forecast, forecastOpen, goEvents, goRecords, goReports, kpiCards,
    analysis, colMetric, onChartHover, onChartPick, onChartTab, onColMetric, popBatch, popClose, popCol, popHeat, popLoading, popMean, popOpen, popProg, popThin, popTotal,
    popTraced, popVer, popYears, programRates, programRatesSub, programRatesTitle, regs, activeCols, sx,
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
                  <OutcomeChart c={chart} onHover={onChartHover} onPick={onChartPick} />
                  {analysis.open ? <EmploymentAnalysis a={analysis} /> : null}
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

                  <div style={{ ...card, gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ minWidth: '0' }}>
                        <div style={cardTitle}>{programRatesTitle}</div>
                        <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>{programRatesSub}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <div role="tablist" aria-label="Metric" style={{ display: 'flex', gap: '2px', padding: '3px', background: '#F1F4F2', borderRadius: '99px' }}>
                          {[['rate', 'Employment Rate'], ['align', 'Course-to-Job Alignment']].map(([id, label]) => {
                            const on = colMetric === id;
                            return (
                              <div key={id} role="tab" tabIndex={0} aria-selected={on} onKeyDown={onActivate(() => onColMetric(id))} onClick={() => onColMetric(id)}
                                style={{ padding: '6px 12px', borderRadius: '99px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', background: on ? '#fff' : 'transparent', color: on ? '#0B1220' : '#64748B', boxShadow: on ? '0 1px 3px rgba(16,24,40,.12)' : 'none' }}
                              >
                                {label}
                              </div>
                            );
                          })}
                        </div>
                        <div role="button" tabIndex={0} onKeyDown={onActivate(goReports)} onClick={goReports} style={link} {...hv(linkHover)}>
                          Drill down
                          <svg aria-hidden="true" width="1em" height="1em" viewBox="0 0 16 16" fill="none" style={{ display: 'inline-block', verticalAlign: '-0.15em', flex: 'none', marginLeft: '.3em' }}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                      </div>
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
                      <div style={cardTitle}>Signals Worth Acting On</div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748B', whiteSpace: 'nowrap' }}>{sx.count}</div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B', marginTop: '-4px' }}>Ranked by priority · open a signal for evidence and next steps</div>
                  {sx.mode === 'loading' ? (
                    <div aria-busy="true" aria-label="Loading insights" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {['#F1F4F2', '#F4F6F5', '#F7F8F7'].map((bg) => <div key={bg} style={{ height: '74px', borderRadius: '12px', background: bg }} />)}
                    </div>
                  ) : null}
                  {sx.mode === 'error' ? (
                    <div role="alert" style={{ border: '1px solid #F3C9C6', background: '#FDF1F0', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#7A271A', lineHeight: '1.45' }}>
                      <b style={{ color: '#B42318' }}>Insights couldn’t be loaded.</b>
                      <span>The tracer statistics service did not respond. No figures are shown to avoid displaying stale data.</span>
                      <button type="button" onClick={sx.retry} style={{ alignSelf: 'flex-start', fontFamily: 'inherit', fontSize: '13px', fontWeight: '700', color: '#B42318', background: '#fff', border: '1px solid #F3C9C6', borderRadius: '99px', padding: '6px 14px', cursor: 'pointer' }}>Try again</button>
                    </div>
                  ) : null}
                  {sx.mode === 'no-records' ? (
                    <div style={{ border: '1px dashed #D5DCD8', borderRadius: '12px', padding: '18px 14px', textAlign: 'center', fontSize: '14px', color: '#64748B', lineHeight: '1.45' }}>No verified alumni records yet. Insights appear once tracer responses are recorded.</div>
                  ) : null}
                  {sx.mode === 'ready' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {sx.list.map((s) => {
                        const p = signalPill(s);
                        return (
                          <button key={s.id} type="button" onClick={() => sx.open(s.id)} aria-haspopup="dialog" aria-label={`${s.title}, ${p.pl}. Open details.`}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left', fontFamily: 'inherit', background: '#fff', border: '1px solid #E7E9ED', borderRadius: '12px', padding: '11px 12px', cursor: 'pointer', transition: 'background .15s ease,border-color .15s ease' }}
                            {...hv({ background: '#F7FAF8', borderColor: '#CFE3DA' })}
                          >
                            <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '11.5px', fontWeight: '700', padding: '2px 9px', borderRadius: '99px', color: p.pc, background: p.pbg, border: `1px solid ${p.pbd}` }}>{p.pl}</span>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748B' }}>{s.cat}</span>
                              </div>
                              <div style={{ fontSize: '15px', fontWeight: '700', color: '#0B1220', lineHeight: '1.3', textWrap: 'pretty' }}>{s.title}</div>
                              <div style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.4', textWrap: 'pretty' }}>{s.low || s.summary}</div>
                            </div>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: '16px', height: '16px', flex: 'none' }}><path d="M9 6l6 6-6 6" /></svg>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
      {sx.cur ? <InsightDrawer sx={sx} /> : null}
    </>
  );
}
