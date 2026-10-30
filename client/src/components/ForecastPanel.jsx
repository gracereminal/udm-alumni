import React from 'react';
import useChartTip from '../hooks/useChartTip';

/** Admin dashboard forecast dialog body (lib/forecast.js): projected tiles, the employment rate trend chart and forward-looking signals. */
export default function ForecastPanel({ forecast, scopeLabel, onClose }) {
  const { tipH, vals: { chartsRef, hideTip, tipShow, tipTitle, tipValue, tipX, tipY } } = useChartTip();
  const { tiles, chart, insights } = forecast;

  return (
    <section aria-label="Forecast" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--udm-sans)', fontWeight: '700', fontSize: '20px', letterSpacing: '-.4px', color: '#0B1220' }}>Employability forecast</span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#3E5C7A', background: '#E8EEF5', borderRadius: '999px', padding: '3px 8px' }}>Next 3 batches</span>
          </div>
          <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Linear trend of each batch&rsquo;s results · {scopeLabel}
          </div>
        </div>
        <button type="button" aria-label="Close forecast" title="Close" onClick={onClose}
          style={{ flex: 'none', width: '34px', height: '34px', borderRadius: '50%', border: '1px solid #E7E9ED', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', fontSize: '18px', fontFamily: 'inherit' }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: '12px' }}>
        {tiles.map((t) => (
          <div key={t.id} style={{ border: '1px solid #EEF0F3', borderRadius: '14px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '0' }}>
            <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#475569' }}>{t.label}</div>
            <div style={{ fontWeight: '700', fontSize: '26px', letterSpacing: '-.6px', color: t.ready ? '#0B1220' : '#94A3B8', lineHeight: '1.1' }}>{t.value}</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>{t.sub}</div>
            {t.ready ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: t.trendColor, background: t.trendBg, padding: '3px 7px', borderRadius: '999px', whiteSpace: 'nowrap' }}>{t.trend}</span>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>{t.conf}</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: '14px', alignItems: 'start' }}>
        <div ref={chartsRef} style={{ position: 'relative', border: '1px solid #EEF0F3', borderRadius: '14px', padding: '16px 18px', minWidth: '0' }}>
          <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220' }}>Employment rate by batch</div>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11.5px', color: '#475569', fontWeight: '600', margin: '8px 0 6px' }}>
            <span><span style={{ display: 'inline-block', width: '14px', height: '2px', background: '#0F6B4F', verticalAlign: 'middle', marginRight: '6px' }} />Actual</span>
            <span><span style={{ display: 'inline-block', width: '14px', height: '0', borderTop: '2px dashed #2F7FC1', verticalAlign: 'middle', marginRight: '6px' }} />Forecast (shaded: likely range)</span>
            {chart ? <span><span style={{ display: 'inline-block', width: '14px', height: '0', borderTop: '2px dotted #0B1220', verticalAlign: 'middle', marginRight: '6px' }} />{chart.target}% target</span> : null}
          </div>
          {chart ? (
            <svg viewBox={`0 0 ${chart.W} ${chart.H}`} role="img" aria-label="Employment rate by batch, actual and forecast" style={{ width: '100%', height: 'auto', display: 'block' }}>
              {chart.grid.map((g) => (
                <g key={g.label}>
                  <line x1="40" x2={chart.W - 16} y1={g.y} y2={g.y} stroke="#EEF0F3" />
                  <text x="34" y={g.y + 4} textAnchor="end" fontSize="11" fill="#94A3B8">{g.label}</text>
                </g>
              ))}
              <rect x={chart.splitX} y="14" width={chart.W - 16 - chart.splitX} height={chart.H - 42} fill="#F5F8FC" />
              <path d={chart.band} fill="#2F7FC1" opacity=".14" />
              <line x1="40" x2={chart.W - 16} y1={chart.targetY} y2={chart.targetY} stroke="#0B1220" strokeWidth="1.5" strokeDasharray="2 4" />
              <path d={chart.hist} fill="none" stroke="#0F6B4F" strokeWidth="2.5" strokeLinejoin="round" />
              <path d={chart.proj} fill="none" stroke="#2F7FC1" strokeWidth="2.5" strokeDasharray="6 5" />
              {chart.points.map((pt, i) => (
                <circle key={i} cx={pt.x} cy={pt.y} r="5" fill={pt.proj ? '#fff' : '#0F6B4F'} stroke={pt.proj ? '#2F7FC1' : '#fff'} strokeWidth="2"
                  onMouseMove={(e) => tipH(pt.title, pt.value).onTipMove(e)} onMouseLeave={hideTip}
                />
              ))}
              {chart.xLabels.map((l) => (
                <text key={l.label} x={l.x} y={chart.H - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill={l.proj ? '#2F7FC1' : '#64748B'}>{l.label}</text>
              ))}
            </svg>
          ) : (
            <div style={{ fontSize: '13px', color: '#94A3B8', padding: '36px 0', textAlign: 'center' }}>Not enough batches with employment data to chart a trend.</div>
          )}
          {tipShow ? (
            <div style={{ position: 'absolute', left: tipX, top: tipY, transform: 'translate(-50%,calc(-100% - 14px))', background: '#0B1220', color: '#fff', borderRadius: '10px', padding: '8px 11px', fontSize: '12px', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: '5' }}>
              <div style={{ fontWeight: '700' }}>{tipTitle}</div>
              <div style={{ opacity: '.8', marginTop: '2px' }}>{tipValue}</div>
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2F7FC1', flex: 'none' }} />
            <span style={{ fontSize: '12.5px', fontWeight: '700', letterSpacing: '.8px', textTransform: 'uppercase', color: '#0B1220' }}>Future insights</span>
          </div>
          {insights.map((i, _i) => (
            <React.Fragment key={_i}>
              <div style={{ display: 'flex', gap: '11px', alignItems: 'flex-start', borderRadius: '12px', padding: '14px 16px', background: i.bg, border: `1px solid ${i.border}` }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: i.color, marginTop: '6px', flex: 'none' }} />
                <div style={{ fontSize: '13.5px', lineHeight: '1.5', color: '#334155', textWrap: 'pretty' }}>
                  <span style={{ fontWeight: '700', color: i.leadColor }}>{i.lead}</span> {i.text}
                </div>
              </div>
            </React.Fragment>
          ))}
          <div style={{ fontSize: '11.5px', color: '#94A3B8', lineHeight: '1.5' }}>
            Fitted to the latest batches with data under the current college, course and status filters (the batch range doesn&rsquo;t apply).
            Recent batches have fewer survey responses, so treat these as estimates, not targets.
          </div>
        </div>
      </div>
    </section>
  );
}
