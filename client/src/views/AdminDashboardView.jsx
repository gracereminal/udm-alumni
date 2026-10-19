import React from 'react';
import { hv } from '../lib/stateStyle';
import { selectStyle, selectFx } from '../lib/selectStyle';
import NavSidebar from '../components/NavSidebar';
import SearchPill from '../components/topbar/SearchPill';
import NotificationBell from '../components/topbar/NotificationBell';
import UserChip from '../components/topbar/UserChip';
import { onActivate } from '../lib/a11y';

/* View layer for the "AdminDashboard" screen — converted from "Alumni Tracer Mockups.dc.html". */
export default function AdminDashboardView(v) {
  const {
    activeLabor,
    admFromOpts,
    admFromVal,
    admCollegeOpts,
    admCollegeVal,
    admCourseDisabled,
    admCourseOpacity,
    admCourseOpts,
    admCourseVal,
    admOnFrom,
    admOnTo,
    admOnCollege,
    admOnCourse,
    admOnStatus,
    admScopeLabel,
    admStatusOpts,
    admStatusVal,
    admToOpts,
    admToVal,
    adminAwaiting,
    adminShowFrom,
    adminShowTo,
    adminTotalEntries,
    batchBars,
    batchSub,
    chartsRef,
    donutTotal,
    exportHover,
    filterHover,
    goRecords,
    goReports,
    goReportsIncl,
    inclGroups,
    inclSub,
    hideTip,
    insights,
    kpiHero,
    kpiSide,
    medianMonths,
    miniStats,
    onStatusMove,
    programRates,
    programRatesSub,
    programRatesTitle,
    registrations,
    registrationsEmpty,
    rowHover,
    statusDonut,
    statusMix,
    timeToJob,
    tipShow,
    tipTitle,
    tipValue,
    tipX,
    tipY,
  } = v;
  return (
    <>
      <div
        data-screen-label="Admin Dashboard"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background:
            'radial-gradient(900px 520px at 0% 0%,#FBF1D3 0%,rgba(251,241,211,0) 70%),radial-gradient(800px 500px at 100% 100%,#F8F1DE 0%,rgba(248,241,222,0) 70%),#F7F6F1',
        }}
      >
        <NavSidebar style={{ flex: 'none' }} />
        <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', backgroundColor: 'transparent' }}>
          <div
            data-m="topbar"
            style={{
              background: '#fff',
              border: '1px solid #E7E9ED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px 12px 24px',
              margin: '12px 12px 0',
              borderRadius: '16px',
              boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
              minHeight: '70px',
              boxSizing: 'border-box',
              gap: '16px',
              minWidth: '0',
            }}
          >
            <div style={{ minWidth: '0' }}>
              <div
                style={{
                  fontFamily: 'Inter,sans-serif',
                  fontWeight: '700',
                  fontSize: '26px',
                  lineHeight: '1.15',
                  letterSpacing: '-.6px',
                  color: '#0B1220',
                }}
              >
                Admin Dashboard
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,.45)', fontWeight: '600', letterSpacing: '.3px' }}>
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
              margin: '14px 12px 28px',
              padding: '24px',
              boxSizing: 'border-box',
              minWidth: '0',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              fontFamily: 'Inter,system-ui,sans-serif',
              background: 'rgba(255,255,255,.55)',
              border: '1px solid #E7E9ED',
              borderRadius: '20px',
              boxShadow: '0 1px 2px rgba(16,24,40,.03)',
            }}
          >
            <div
              data-m="ws-head"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '14px',
                flexWrap: 'wrap',
                padding: '0 4px 20px',
                marginBottom: '6px',
                borderBottom: '1px solid #E3E8E5',
              }}
            >
              <div style={{ minWidth: '0' }}>
                <div
                  style={{
                    fontFamily: 'Inter,sans-serif',
                    fontWeight: '700',
                    fontSize: '30px',
                    lineHeight: '1.1',
                    letterSpacing: '-.7px',
                    color: '#0B1220',
                  }}
                >
                  Graduate Outcomes
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '7px', fontSize: '13.5px', color: '#64748B' }}>
                  <span>Survey cycle 2026 · Synced Sep 16</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <select
                  aria-label="Batch from"
                  value={admFromVal}
                  onChange={admOnFrom}
                  style={selectStyle('13px', '140px')}
                  {...selectFx}
                >
                  {(admFromOpts || []).map((o, _i) => (
                    <React.Fragment key={_i}>
                      <option value={o.value}>{o.label}</option>
                    </React.Fragment>
                  ))}
                </select>
                <select
                  aria-label="Batch to"
                  value={admToVal}
                  onChange={admOnTo}
                  style={selectStyle('13px', '140px')}
                  {...selectFx}
                >
                  {(admToOpts || []).map((o, _i) => (
                    <React.Fragment key={_i}>
                      <option value={o.value}>{o.label}</option>
                    </React.Fragment>
                  ))}
                </select>
                <select
                  value={admStatusVal}
                  onChange={admOnStatus}
                  style={selectStyle('13px', '260px')}
                  {...selectFx}
                >
                  {(admStatusOpts || []).map((o, _i) => (
                    <React.Fragment key={_i}>
                      <option value={o.value}>{o.label}</option>
                    </React.Fragment>
                  ))}
                </select>
                <select
                  value={admCollegeVal}
                  onChange={admOnCollege}
                  style={selectStyle('13px', '260px')}
                  {...selectFx}
                >
                  {(admCollegeOpts || []).map((o, _i) => (
                    <React.Fragment key={_i}>
                      <option value={o.value}>{o.label}</option>
                    </React.Fragment>
                  ))}
                </select>
                <select
                  value={admCourseVal}
                  onChange={admOnCourse}
                  disabled={admCourseDisabled}
                  style={selectStyle('13px', '260px', { opacity: admCourseOpacity })}
                  {...selectFx}
                >
                  {(admCourseOpts || []).map((o, _i) => (
                    <React.Fragment key={_i}>
                      <option value={o.value}>{o.label}</option>
                    </React.Fragment>
                  ))}
                </select>
                <div role="button" tabIndex={0} onKeyDown={onActivate(goReports)}
                  onClick={goReports}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#0F3D2E',
                    color: '#fff',
                    borderRadius: '12px',
                    padding: '12px 17px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                  {...hv(exportHover)}
                >
                  <span style={{ fontSize: '12px' }}>↓</span>
                  <span>Export report</span>
                </div>
              </div>
            </div>
            <div data-m="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: '14px' }}>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E7E9ED',
                  borderRadius: '16px',
                  boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                  cursor: 'pointer',
                  transition: 'transform .18s ease,box-shadow .18s ease,border-color .18s ease',
                  minWidth: '0',
                  gridColumn: 'span 2',
                  padding: '22px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
                {...hv(
                  {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 2px 4px rgba(16,24,40,.05),0 14px 28px -12px rgba(16,24,40,.16)',
                    borderColor: '#D3DAD6',
                  },
                  { enter: kpiHero.onEnter, leave: kpiHero.onLeave },
                )}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0B1220' }}>{kpiHero.label}</div>
                  <span
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#0F3D2E',
                      flex: 'none',
                      transition: 'opacity .18s ease,transform .18s ease',
                      opacity: kpiHero.arrowOp,
                      transform: kpiHero.arrowX,
                    }}
                  >
                    →
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <div
                    style={{
                      fontFamily: 'Inter,sans-serif',
                      fontWeight: '700',
                      fontSize: '60px',
                      lineHeight: '.95',
                      letterSpacing: '-2px',
                      color: '#0B1220',
                    }}
                  >
                    {kpiHero.value}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: '#475569' }}>{kpiHero.unit}</div>
                </div>
                <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.5' }}>
                  <span style={{ fontWeight: '700', color: '#0B1220' }}>{kpiHero.subLead}</span> {kpiHero.sub}
                </div>
                <div style={{ height: '8px', borderRadius: '99px', background: '#EEF4F1', overflow: 'hidden', marginTop: 'auto' }}>
                  <div style={{ height: '100%', borderRadius: '99px', background: '#0F6B4F', width: kpiHero.pct }} />
                </div>
                <div
                  style={{
                    alignSelf: 'flex-start',
                    borderRadius: '999px',
                    padding: '4px 10px',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    background: '#E1F3EA',
                    color: '#0F6B4F',
                  }}
                >
                  {kpiHero.context}
                </div>
              </div>
              {(kpiSide || []).map((k, _i) => (
                <React.Fragment key={_i}>
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #E7E9ED',
                      borderRadius: '16px',
                      boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                      cursor: 'pointer',
                      transition: 'transform .18s ease,box-shadow .18s ease,border-color .18s ease',
                      minWidth: '0',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                    {...hv(
                      {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 2px 4px rgba(16,24,40,.05),0 14px 28px -12px rgba(16,24,40,.16)',
                        borderColor: '#D3DAD6',
                      },
                      { enter: k.onEnter, leave: k.onLeave },
                    )}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220', minWidth: '0' }}>{k.label}</div>
                      <span
                        style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#0F3D2E',
                          flex: 'none',
                          transition: 'opacity .18s ease,transform .18s ease',
                          opacity: k.arrowOp,
                          transform: k.arrowX,
                        }}
                      >
                        →
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', minWidth: '0', flexWrap: 'wrap' }}>
                      <div
                        data-m="kpi-val"
                        style={{
                          fontFamily: 'Inter,sans-serif',
                          fontWeight: '700',
                          fontSize: '34px',
                          lineHeight: '1',
                          letterSpacing: '-1px',
                          color: '#0B1220',
                        }}
                      >
                        {k.value}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#475569', whiteSpace: 'nowrap' }}>{k.unit}</div>
                    </div>
                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                      <span style={{ fontWeight: '700', color: '#0B1220' }}>{k.subLead}</span> {k.sub}
                    </div>
                    {k.hasBar ? (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto' }}>
                          <div style={{ height: '6px', borderRadius: '99px', background: '#F5F0DC', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '99px', background: '#F0C428', width: k.pct }} />
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>{k.context}</div>
                        </div>
                      </>
                    ) : null}
                    {k.isDelta ? (
                      <>
                        <div
                          style={{
                            alignSelf: 'flex-start',
                            marginTop: 'auto',
                            borderRadius: '999px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: '700',
                            background: '#E1F3EA',
                            color: '#0F6B4F',
                          }}
                        >
                          {k.context}
                        </div>
                      </>
                    ) : null}
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div data-m="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '14px' }}>
              {(miniStats || []).map((m, _i) => (
                <React.Fragment key={_i}>
                  <div role="button" tabIndex={0} onKeyDown={onActivate(m.onClick)}
                    onClick={m.onClick}
                    style={{
                      background: m.cardBg,
                      border: '1px solid #E7E9ED',
                      borderRadius: '16px',
                      boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                      cursor: 'pointer',
                      transition: 'transform .18s ease,box-shadow .18s ease,border-color .18s ease',
                      minWidth: '0',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      borderColor: m.cardBorder,
                    }}
                    {...hv(
                      {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 2px 4px rgba(16,24,40,.05),0 14px 28px -12px rgba(16,24,40,.16)',
                        borderColor: '#D3DAD6',
                      },
                      { enter: m.onEnter, leave: m.onLeave },
                    )}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '0' }}>
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '8px',
                            flex: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: m.iconBg,
                            color: m.iconColor,
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ width: '15px', height: '15px' }}
                          >
                            <path d={m.icon} />
                          </svg>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0B1220', lineHeight: '1.3' }}>{m.label}</div>
                      </div>
                      <span
                        style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#0F3D2E',
                          flex: 'none',
                          transition: 'opacity .18s ease,transform .18s ease',
                          opacity: m.arrowOp,
                          transform: m.arrowX,
                        }}
                      >
                        →
                      </span>
                    </div>
                    <div
                      data-m="kpi-val"
                      style={{
                        fontFamily: 'Inter,sans-serif',
                        fontWeight: '700',
                        fontSize: '24px',
                        lineHeight: '1.1',
                        letterSpacing: '-.6px',
                        color: '#0B1220',
                        marginTop: '2px',
                      }}
                    >
                      {m.value}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#475569' }}>{m.sub}</div>
                    {m.isLink ? (
                      <>
                        <div
                          style={{
                            alignSelf: 'flex-start',
                            fontSize: '12.5px',
                            fontWeight: '700',
                            color: '#7A4E00',
                            marginTop: '2px',
                            textDecoration: 'underline',
                            textUnderlineOffset: '3px',
                            textDecorationColor: '#E3B455',
                          }}
                        >
                          {m.pill}
                        </div>
                      </>
                    ) : null}
                    {m.isPill ? (
                      <>
                        <div
                          style={{
                            alignSelf: 'flex-start',
                            borderRadius: '999px',
                            padding: '3px 9px',
                            fontSize: '12px',
                            fontWeight: '600',
                            marginTop: '2px',
                            background: m.pillBg,
                            color: m.pillColor,
                          }}
                        >
                          {m.pill}
                        </div>
                      </>
                    ) : null}
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div
              ref={chartsRef}
              style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: '14px' }}
            >
              {tipShow ? (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      left: tipX,
                      top: tipY,
                      transform: 'translate(-50%,calc(-100% - 14px))',
                      pointerEvents: 'none',
                      zIndex: '50',
                      background: '#0B1220',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '7px 11px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 8px 20px -6px rgba(11,18,32,.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#A7B0BC' }}>{tipTitle}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>{tipValue}</div>
                  </div>
                </>
              ) : null}
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E7E9ED',
                  borderRadius: '16px',
                  boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                  padding: '22px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>
                    Graduates traced by batch
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px 14px',
                      flexWrap: 'wrap',
                      fontSize: '11.5px',
                      color: '#475569',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#0F3D2E' }} />
                      <span>At or above target</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#E0A915' }} />
                      <span>Below target</span>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>{batchSub}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '22px' }}>
                  <div style={{ position: 'relative', height: '184px', paddingLeft: '46px' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '0',
                        width: '40px',
                        bottom: '65%',
                        transform: 'translateY(50%)',
                        fontSize: '10.5px',
                        fontWeight: '700',
                        color: '#475569',
                        lineHeight: '1.15',
                        textAlign: 'right',
                      }}
                    >
                      65%
                      <br />
                      target
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        left: '44px',
                        right: '0',
                        bottom: '65%',
                        height: '2px',
                        transform: 'translateY(50%)',
                        background: 'repeating-linear-gradient(90deg,#0B1220 0 6px,#fff 6px 10px)',
                        zIndex: '2',
                        pointerEvents: 'none',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '12px', height: '100%' }}>
                      {(batchBars || []).map((b, _i) => (
                        <React.Fragment key={_i}>
                          <div
                            onMouseMove={b.onTipMove}
                            onMouseLeave={b.onTipLeave}
                            style={{ flex: '1', minWidth: '0', display: 'flex', justifyContent: 'center', height: '100%' }}
                          >
                            <div
                              style={{
                                position: 'relative',
                                width: '100%',
                                maxWidth: '54px',
                                height: '100%',
                                background: '#F4F7F5',
                                borderRadius: '10px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  left: '0',
                                  right: '0',
                                  bottom: '0',
                                  height: b.pct,
                                  background: b.color,
                                  borderRadius: '10px',
                                }}
                              />
                            </div>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', paddingLeft: '46px' }}>
                    {(batchBars || []).map((b, _i) => (
                      <React.Fragment key={_i}>
                        <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <div style={{ fontSize: '12.5px', fontWeight: '700', color: b.pctColor }}>{b.pct}</div>
                          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>{b.label}</div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E7E9ED',
                  borderRadius: '16px',
                  boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                  padding: '22px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>Employment status mix</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '26px', flexWrap: 'wrap', margin: '20px 0 4px', flex: '1' }}>
                  <div
                    onMouseMove={onStatusMove}
                    onMouseLeave={hideTip}
                    style={{
                      position: 'relative',
                      width: '172px',
                      height: '172px',
                      borderRadius: '50%',
                      background: statusDonut,
                      flex: 'none',
                      margin: '0 auto',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: '24px',
                        background: '#fff',
                        borderRadius: '50%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        boxShadow: '0 0 0 1px #EEF0F3',
                      }}
                    >
                      <div style={{ fontWeight: '700', fontSize: '26px', lineHeight: '1', letterSpacing: '-.6px', color: '#0B1220' }}>
                        {donutTotal}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#94A3B8' }}>Respondents</div>
                    </div>
                  </div>
                  <div style={{ flex: '1', minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(statusMix || []).map((s, _i) => (
                      <React.Fragment key={_i}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color, flex: 'none' }} />
                          <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0B1220', lineHeight: '1.3' }}>{s.label}</div>
                            <div style={{ fontSize: '11.5px', color: '#94A3B8' }}>{s.count}</div>
                          </div>
                          <div style={{ fontWeight: '700', fontSize: '13.5px', textAlign: 'right', color: s.pctColor }}>{s.pct}</div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginTop: '18px',
                    paddingTop: '14px',
                    borderTop: '1px solid #EEF0F3',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0B4A36' }}>Overall Active Labor Force: {activeLabor}</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: '14px', alignItems: 'start' }}>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E7E9ED',
                  borderRadius: '16px',
                  boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                  padding: '22px 24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>{programRatesTitle}</div>
                    <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>{programRatesSub}</div>
                  </div>
                  <div role="button" tabIndex={0} onKeyDown={onActivate(goReports)}
                    onClick={goReports}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#0F6B4F',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>Drill down</span>
                    <span style={{ fontSize: '11px' }}>›</span>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    marginTop: '14px',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    color: '#475569',
                  }}
                >
                  <span style={{ width: '2px', height: '12px', background: 'repeating-linear-gradient(180deg,#0B1220 0 3px,transparent 3px 5px)' }} />
                  <span>70% CHED target</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px' }}>
                  {(programRates || []).map((p, _i) => (
                    <React.Fragment key={_i}>
                      <div style={{ display: 'grid', gridTemplateColumns: '136px minmax(40px,1fr) 44px 72px', alignItems: 'center', gap: '10px' }}>
                        <div
                          title={p.full}
                          style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#0B1220',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {p.program}
                        </div>
                        <div
                          onMouseMove={p.onTipMove}
                          onMouseLeave={p.onTipLeave}
                          style={{ position: 'relative', padding: '6px 0', margin: '-6px 0' }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              left: '70%',
                              top: '-8px',
                              bottom: '-8px',
                              width: '2px',
                              transform: 'translateX(-50%)',
                              background: 'repeating-linear-gradient(180deg,#0B1220 0 3px,transparent 3px 5px)',
                              zIndex: '2',
                              pointerEvents: 'none',
                            }}
                          />
                          <div style={{ height: '8px', borderRadius: '99px', background: '#EEF4F1', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '99px', background: '#0F6B4F', width: p.pct }} />
                          </div>
                        </div>
                        <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: '13px', color: '#0B1220', textAlign: 'right' }}>
                          {p.pct}
                        </div>
                        <div
                          style={{
                            justifySelf: 'end',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: p.deltaColor,
                            background: p.deltaBg,
                            padding: '3px 7px',
                            borderRadius: '999px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.arrow} {p.delta}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #E7E9ED',
                    borderRadius: '16px',
                    boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                    padding: '22px 24px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>
                      Months Before First Job
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span
                          style={{
                            fontFamily: 'Inter,sans-serif',
                            fontWeight: '700',
                            fontSize: '44px',
                            lineHeight: '1',
                            letterSpacing: '-1.2px',
                            color: '#0B1220',
                          }}
                        >
                          {medianMonths}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748B' }}>months</span>
                      </div>
                      <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#94A3B8', letterSpacing: '.7px' }}>MEDIAN</div>
                    </div>
                    <div style={{ flex: '1', minWidth: '230px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '2px', height: '30px', borderRadius: '8px', overflow: 'hidden' }}>
                        {(timeToJob || []).map((t, _i) => (
                          <React.Fragment key={_i}>
                            <div
                              onMouseMove={t.onTipMove}
                              onMouseLeave={t.onTipLeave}
                              style={{
                                flex: `${t.grow} 1 0`,
                                minWidth: '0',
                                background: t.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: t.text,
                              }}
                            >
                              {t.pct}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                        {(timeToJob || []).map((t, _i) => (
                          <React.Fragment key={_i}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '7px',
                                fontSize: '12.5px',
                                color: '#334155',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: t.color, flex: 'none' }} />
                              <span>{t.label}</span>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #E7E9ED',
                    borderRadius: '16px',
                    boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                    padding: '22px 24px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F0C428', flex: 'none' }} />
                      <span style={{ fontSize: '12.5px', fontWeight: '700', letterSpacing: '.8px', textTransform: 'uppercase', color: '#0B1220' }}>
                        Signals worth acting on
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(insights || []).map((i, _i) => (
                      <React.Fragment key={_i}>
                        <div
                          style={{
                            display: 'flex',
                            gap: '11px',
                            alignItems: 'flex-start',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            background: i.bg,
                            border: `1px solid ${i.border}`,
                          }}
                        >
                          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: i.color, marginTop: '6px', flex: 'none' }} />
                          <div style={{ fontSize: '13.5px', lineHeight: '1.5', color: '#334155', textWrap: 'pretty' }}>
                            <span style={{ fontWeight: '700', color: i.leadColor }}>{i.lead}</span> {i.text}
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div
              style={{
                background: '#fff',
                border: '1px solid #E7E9ED',
                borderRadius: '16px',
                boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                padding: '22px 24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>Inclusion profile</div>
                  <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>{inclSub}</div>
                </div>
                <div role="button" tabIndex={0} onKeyDown={onActivate(goReportsIncl)}
                  onClick={goReportsIncl}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#0F6B4F', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  <span>Open report</span>
                  <span style={{ fontSize: '11px' }}>›</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: '14px', marginTop: '18px' }}>
                {(inclGroups || []).map((g, _i) => (
                  <React.Fragment key={_i}>
                    <div
                      style={{
                        border: '1px solid #EEF0F3',
                        borderRadius: '14px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        minWidth: '0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220' }}>{g.title}</div>
                        <div style={{ borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: '700', background: '#EEF1F5', color: '#475569' }}>
                          Restricted · aggregated
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: '34px', lineHeight: '1', letterSpacing: '-1px', color: '#0B1220' }}>
                          {g.yes}
                        </div>
                        <div style={{ fontSize: '13px', color: '#475569' }}>
                          answered Yes · <span style={{ fontWeight: '700', color: '#0B1220' }}>{g.yesPct}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', height: '10px', borderRadius: '99px', overflow: 'hidden', background: '#E3E8E5', gap: '2px' }}>
                        <div style={{ width: g.yesPct, minWidth: '4px', background: g.color, borderRadius: '99px' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '8px 18px', flexWrap: 'wrap', fontSize: '12.5px', color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: g.color }} />
                          <span>Yes</span>
                          <span style={{ fontWeight: '700', color: '#0B1220' }}>{g.yes}</span>
                          <span style={{ color: '#94A3B8' }}>{g.yesPct}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#E3E8E5' }} />
                          <span>No</span>
                          <span style={{ fontWeight: '700', color: '#0B1220' }}>{g.no}</span>
                          <span style={{ color: '#94A3B8' }}>{g.noPct}</span>
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid #EEF0F3', paddingTop: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.7px', textTransform: 'uppercase', color: '#94A3B8' }}>
                          {g.rowsTitle}
                        </div>
                        {(g.rows || []).map((r, _j) => (
                          <React.Fragment key={_j}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,140px) minmax(40px,1fr) 36px', gap: '10px', alignItems: 'center' }}>
                              <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#0B1220', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {r.label}
                              </div>
                              <div style={{ height: '7px', borderRadius: '99px', background: '#F1F4F2', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: '99px', width: r.w, background: r.color }} />
                              </div>
                              <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0B1220', textAlign: 'right' }}>{r.n}</div>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div
              style={{
                background: '#fff',
                border: '1px solid #E7E9ED',
                borderRadius: '16px',
                boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                padding: '22px 0 0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', padding: '0 24px 18px' }}>
                <div>
                  <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>
                    Latest survey submissions
                  </div>
                  <div style={{ fontSize: '13px', color: '#8A6D1F', marginTop: '4px', fontWeight: '600' }}>{adminAwaiting}</div>
                </div>
                <div role="button" tabIndex={0} onKeyDown={onActivate(goRecords)}
                  onClick={goRecords}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#0F6B4F',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>View all submissions</span>
                  <span>→</span>
                </div>
              </div>
              <div data-m="tscroll" style={{ overflowX: 'auto' }}>
                <div
                  data-m="trow"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr .8fr .6fr 1.5fr 1fr .8fr .6fr',
                    padding: '12px 24px',
                    margin: '0',
                    background: '#F8FAF9',
                    borderTop: '1px solid #EEF0F3',
                    borderBottom: '1px solid #EEF0F3',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#94A3B8',
                    letterSpacing: '.7px',
                    textTransform: 'uppercase',
                    gap: '10px',
                  }}
                >
                  <div>Name</div>
                  <div>Program</div>
                  <div>Batch</div>
                  <div>Employment status</div>
                  <div>Submitted</div>
                  <div>Status</div>
                  <div style={{ textAlign: 'right' }}>Action</div>
                </div>
                {(registrations || []).map((r, _i) => (
                  <React.Fragment key={_i}>
                    <div
                      data-m="trow"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.5fr .8fr .6fr 1.5fr 1fr .8fr .6fr',
                        padding: '17px 24px',
                        borderBottom: '1px solid #EEF0F3',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                      {...hv(rowHover)}
                    >
                      <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220' }}>{r.name}</div>
                      <div title={r.full} style={{ fontSize: '13px', color: '#475569' }}>
                        {r.program}
                      </div>
                      <div style={{ fontSize: '13px', color: '#475569' }}>{r.batch}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: '#334155', minWidth: '0' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: r.dot, flex: 'none' }} />
                        <span>{r.employment}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>{r.date}</div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: '700',
                          color: r.statusColor,
                          background: r.statusBg,
                          padding: '5px 12px',
                          borderRadius: '99px',
                          width: 'fit-content',
                        }}
                      >
                        {r.status}
                      </div>
                      <div role="button" tabIndex={0} onKeyDown={onActivate(goRecords)}
                        onClick={goRecords}
                        style={{ fontSize: '13px', fontWeight: '600', color: r.actionColor, textAlign: 'right', cursor: 'pointer' }}
                      >
                        {r.action}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
                {registrationsEmpty ? (
                  <>
                    <div style={{ padding: '36px 24px', textAlign: 'center', fontSize: '13px', color: '#64748B' }}>
                      No recent submissions for {admScopeLabel}.
                    </div>
                  </>
                ) : null}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px 24px' }}>
                <div style={{ fontSize: '12.5px', color: '#64748B' }}>
                  Showing <span style={{ fontWeight: '700', color: '#0B1220' }}>{adminShowFrom}</span> to{' '}
                  <span style={{ fontWeight: '700', color: '#0B1220' }}>{adminShowTo}</span> of{' '}
                  <span style={{ fontWeight: '700', color: '#0B1220' }}>{adminTotalEntries}</span> entries
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <div
                    style={{
                      border: '1px solid #E7E9ED',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      color: '#A7B0BC',
                      background: '#FAFBFB',
                    }}
                  >
                    Previous
                  </div>
                  <div
                    style={{
                      border: '1px solid #E2E5EA',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      fontSize: '12.5px',
                      fontWeight: '700',
                      color: '#0B1220',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                    {...hv(filterHover)}
                  >
                    Next
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
