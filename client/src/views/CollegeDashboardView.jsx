import React from 'react';
import { hv } from '../lib/stateStyle';
import NavSidebar from '../components/NavSidebar';
import RangeError from '../components/RangeError';
import SearchPill from '../components/topbar/SearchPill';
import NotificationBell from '../components/topbar/NotificationBell';
import { onActivate } from '../lib/a11y';

/* View layer for the "CollegeDashboard" screen — converted from "Alumni Tracer Mockups.dc.html". */
export default function CollegeDashboardView(v) {
  const {
    chartsRef,
    deptBatch,
    deptBatchNote,
    deptCompare,
    deptFromOpts,
    deptFromVal,
    deptToOpts,
    deptToVal,
    deptCourseOpts,
    deptCourseSelVal,
    deptDonut,
    deptEmp,
    deptEmpDelta,
    deptEmpW,
    deptHero,
    deptHeroEmployed,
    deptInsights,
    deptJobs,
    deptJobsNote,
    deptOutShown,
    deptOutTotal,
    deptOutcome,
    deptOutreach,
    deptOutreachNote,
    deptReachNote,
    deptScopeLabel,
    deptSide,
    deptStatus,
    deptThisLabel,
    deptTitle,
    deptViewLabel,
    pageTitle,
    rangeError,
    showKpis,
    showInsights,
    showOutreach,
    exportHover,
    goRecords,
    goReports,
    hideTip,
    onDeptCourseChange,
    onDeptFromChange,
    onDeptToChange,
    onDeptStatusMove,
    rowHover,
    tipShow,
    tipTitle,
    tipValue,
    tipX,
    tipY,
  } = v;
  return (
    <>
      <div
        data-screen-label="College Dashboard"
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
                {pageTitle}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,.45)', fontWeight: '600', letterSpacing: '.3px' }}>
                UDM ALUMNI RELATIONS OFFICE · COLLEGE
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <SearchPill />
              <NotificationBell />
              <div
                title="Data scoped to College of Computing Studies"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: 'none',
                  border: '1px solid #CFE3DA',
                  background: '#F1F8F4',
                  borderRadius: '999px',
                  padding: '5px 12px 5px 5px',
                }}
              >
                <span
                  style={{
                    background: '#0F3D2E',
                    color: '#fff',
                    fontSize: '10.5px',
                    fontWeight: '700',
                    letterSpacing: '.6px',
                    borderRadius: '999px',
                    padding: '4px 8px',
                  }}
                >
                  CCS
                </span>
                <span data-m="tb-user" style={{ fontSize: '12.5px', fontWeight: '600', color: '#0B3A2B', whiteSpace: 'nowrap' }}>
                  {deptScopeLabel}
                </span>
              </div>
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
                    textWrap: 'pretty',
                  }}
                >
                  {deptTitle}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '7px', fontSize: '13.5px', color: '#64748B' }}>
                  <span>{deptViewLabel}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <select
                    aria-label="Batch from"
                    value={deptFromVal}
                    onChange={onDeptFromChange}
                    style={{
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      background: '#fff',
                      border: '1px solid #E2E5EA',
                      borderRadius: '12px',
                      padding: '11px 32px 11px 13px',
                      fontFamily: 'Inter,system-ui,sans-serif',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#0F172A',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(16,24,40,.04)',
                    }}
                  >
                    {(deptFromOpts || []).map((o, _i) => (
                      <React.Fragment key={_i}>
                        <option value={o.value}>{o.label}</option>
                      </React.Fragment>
                    ))}
                  </select>
                  <span
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '9px',
                      color: '#64748B',
                      pointerEvents: 'none',
                    }}
                  >
                    ▾
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <select
                    aria-label="Batch to"
                    value={deptToVal}
                    onChange={onDeptToChange}
                    style={{
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      background: '#fff',
                      border: '1px solid #E2E5EA',
                      borderRadius: '12px',
                      padding: '11px 32px 11px 13px',
                      fontFamily: 'Inter,system-ui,sans-serif',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#0F172A',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(16,24,40,.04)',
                    }}
                  >
                    {(deptToOpts || []).map((o, _i) => (
                      <React.Fragment key={_i}>
                        <option value={o.value}>{o.label}</option>
                      </React.Fragment>
                    ))}
                  </select>
                  <span
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '9px',
                      color: '#64748B',
                      pointerEvents: 'none',
                    }}
                  >
                    ▾
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <select
                    value={deptCourseSelVal}
                    onChange={onDeptCourseChange}
                    style={{
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      background: '#fff',
                      border: '1px solid #E2E5EA',
                      borderRadius: '12px',
                      padding: '11px 32px 11px 13px',
                      fontFamily: 'Inter,system-ui,sans-serif',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#0F172A',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(16,24,40,.04)',
                    }}
                  >
                    {(deptCourseOpts || []).map((c, _i) => (
                      <React.Fragment key={_i}>
                        <option value={c.key}>Course: {c.label}</option>
                      </React.Fragment>
                    ))}
                  </select>
                  <span
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '9px',
                      color: '#64748B',
                      pointerEvents: 'none',
                    }}
                  >
                    ▾
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#fff',
                    border: '1px solid #E2E5EA',
                    borderRadius: '12px',
                    padding: '11px 13px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#0F172A',
                    boxShadow: '0 1px 2px rgba(16,24,40,.04)',
                  }}
                >
                  Status: Verified only
                </div>
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
            <RangeError message={rangeError} />
            {showKpis ? (
              <>
                <div data-m="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '14px' }}>
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
                      { enter: deptHero.onEnter, leave: deptHero.onLeave },
                    )}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#0B1220' }}>Employability rate</div>
                      <span
                        style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#0F3D2E',
                          flex: 'none',
                          transition: 'opacity .18s ease,transform .18s ease',
                          opacity: deptHero.arrowOp,
                          transform: deptHero.arrowX,
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
                        {deptEmp}
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '600', color: '#475569' }}>%</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto' }}>
                      <div style={{ position: 'relative', height: '8px', borderRadius: '99px', background: '#EEF4F1' }}>
                        <div style={{ height: '100%', borderRadius: '99px', background: '#0F6B4F', width: deptEmpW }} />
                        <div
                          style={{
                            position: 'absolute',
                            left: '70%',
                            top: '-5px',
                            bottom: '-5px',
                            width: '2px',
                            transform: 'translateX(-50%)',
                            background: '#0B1220',
                          }}
                        />
                      </div>
                      <div style={{ position: 'relative', height: '16px' }}>
                        <div
                          style={{
                            position: 'absolute',
                            left: '70%',
                            transform: 'translateX(-50%)',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            color: '#475569',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          CHED 70% target
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div
                        style={{
                          borderRadius: '999px',
                          padding: '4px 10px',
                          fontSize: '12.5px',
                          fontWeight: '700',
                          background: '#E1F3EA',
                          color: '#0F6B4F',
                        }}
                      >
                        {deptEmpDelta}
                      </div>
                      <div style={{ fontSize: '13px', color: '#475569' }}>
                        <span style={{ fontWeight: '700', color: '#0B1220', fontVariantNumeric: 'tabular-nums' }}>{deptHeroEmployed}</span> employed
                      </div>
                    </div>
                  </div>
                  {(deptSide || []).map((k, _i) => (
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
                        {k.isText ? (
                          <>
                            <div style={{ marginTop: 'auto', fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>{k.context}</div>
                          </>
                        ) : null}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </>
            ) : null}
            {showInsights ? (
              <>
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #E7E9ED',
                    borderRadius: '16px',
                    boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                    padding: '22px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: '0' }}>
                      <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>Outcomes by batch</div>
                      <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>{deptBatchNote}</div>
                    </div>
                  </div>
                  <div data-m="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '12px' }}>
                    {(deptOutcome || []).map((o, _i) => (
                      <React.Fragment key={_i}>
                        <div
                          style={{
                            border: '1px solid #E7E9ED',
                            borderRadius: '14px',
                            padding: '16px 18px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            minWidth: '0',
                            background: o.bg,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '9px', height: '9px', borderRadius: '50%', flex: 'none', background: o.color }} />
                            <span
                              style={{
                                fontSize: '13.5px',
                                fontWeight: '600',
                                color: '#0B1220',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                minWidth: '0',
                              }}
                            >
                              {o.label}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                            <div
                              data-m="kpi-val"
                              style={{
                                fontFamily: 'Inter,sans-serif',
                                fontWeight: '700',
                                fontSize: '34px',
                                lineHeight: '1',
                                letterSpacing: '-1px',
                                color: '#0B1220',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {o.value}
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: o.pctColor }}>{o.pct}</div>
                          </div>
                          <div style={{ height: '6px', borderRadius: '99px', background: '#EEF1EF', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '99px', background: o.color, width: o.w }} />
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.4' }}>{o.desc}</div>
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
                    padding: '22px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: '0' }}>
                      <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>
                        Top 10 jobs of employed graduates
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>{deptJobsNote}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gridTemplateRows: 'repeat(5,auto)', gridAutoFlow: 'column', gap: '4px 32px' }}>
                    {(deptJobs || []).map((j, _i) => (
                      <React.Fragment key={_i}>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '26px minmax(0,1fr) 44px 52px',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 0',
                            borderBottom: '1px solid #EEF0F3',
                          }}
                        >
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: '700',
                              background: j.rankBg,
                              color: j.rankColor,
                            }}
                          >
                            {j.rank}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '0' }}>
                            <div
                              style={{
                                fontSize: '13.5px',
                                fontWeight: '600',
                                color: '#0B1220',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {j.title}
                            </div>
                            <div style={{ height: '5px', borderRadius: '99px', background: '#F1F4F2', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: '99px', background: '#0F6B4F', width: j.w }} />
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: '13.5px',
                              fontWeight: '700',
                              color: '#0B1220',
                              textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {j.count}
                          </div>
                          <div
                            style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                          >
                            {j.pct}
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div ref={chartsRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: '14px' }}>
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
                      <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>{deptReachNote}</div>
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
                            {(deptBatch || []).map((b, _i) => (
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
                          {(deptBatch || []).map((b, _i) => (
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
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>
                          Employment status mix
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '26px', flexWrap: 'wrap', margin: '20px 0 4px', flex: '1' }}>
                        <div
                          onMouseMove={onDeptStatusMove}
                          onMouseLeave={hideTip}
                          style={{
                            position: 'relative',
                            width: '172px',
                            height: '172px',
                            borderRadius: '50%',
                            background: deptDonut,
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
                          />
                        </div>
                        <div
                          style={{
                            flex: '1',
                            minWidth: '220px',
                            display: 'grid',
                            gridTemplateColumns: '10px minmax(0,1fr) auto auto',
                            alignItems: 'center',
                            gap: '12px 11px',
                          }}
                        >
                          {(deptStatus || []).map((s, _i) => (
                            <React.Fragment key={_i}>
                              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color }} />
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0B1220', lineHeight: '1.3' }}>{s.label}</div>
                              <div style={{ fontSize: '12px', color: '#64748B', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                {s.count}
                              </div>
                              <div
                                style={{
                                  fontWeight: '700',
                                  fontSize: '13.5px',
                                  textAlign: 'right',
                                  minWidth: '46px',
                                  fontVariantNumeric: 'tabular-nums',
                                  color: s.pctColor,
                                }}
                              >
                                {s.pct}
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: '14px', alignItems: 'start' }}
                  >
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
                      <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>
                        Compare with university average
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '14px', fontSize: '11.5px', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#0F3D2E' }} />
                          <span>{deptThisLabel}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#94A3B8' }} />
                          <span>University overall</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '18px' }}>
                        {(deptCompare || []).map((c, _i) => (
                          <React.Fragment key={_i}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0B1220' }}>{c.label}</div>
                                <div
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: '#0F6B4F',
                                    background: '#E1F3EA',
                                    padding: '3px 7px',
                                    borderRadius: '999px',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {c.diff}
                                </div>
                              </div>
                              <div
                                onMouseMove={c.onTipMove}
                                onMouseLeave={c.onTipLeave}
                                style={{ display: 'grid', gridTemplateColumns: 'minmax(40px,1fr) 64px', alignItems: 'center', gap: '6px 10px' }}
                              >
                                <div style={{ height: '10px', borderRadius: '99px', background: '#F4F7F5', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', borderRadius: '99px', background: '#0F3D2E', width: c.cw }} />
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0B1220', textAlign: 'right' }}>{c.col}</div>
                                <div style={{ height: '10px', borderRadius: '99px', background: '#F4F7F5', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', borderRadius: '99px', background: '#94A3B8', width: c.uw }} />
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#475569', textAlign: 'right' }}>{c.uni}</div>
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
                        padding: '22px 24px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#F0C428', flex: 'none' }} />
                          <span
                            style={{ fontSize: '12.5px', fontWeight: '700', letterSpacing: '.8px', textTransform: 'uppercase', color: '#0B1220' }}
                          >
                            Department insights
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(deptInsights || []).map((i, _i) => (
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
                              <div
                                style={{ width: '7px', height: '7px', borderRadius: '50%', background: i.color, marginTop: '6px', flex: 'none' }}
                              />
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
              </>
            ) : null}
            {showOutreach ? (
              <>
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
                        Alumni needing outreach
                      </div>
                      <div style={{ fontSize: '13px', color: '#8A6D1F', marginTop: '4px', fontWeight: '600' }}>{deptOutreachNote}</div>
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
                      <span>View all</span>
                      <span>→</span>
                    </div>
                  </div>
                  <div data-m="tscroll" style={{ overflowX: 'auto' }}>
                    <div
                      data-m="trow"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.5fr .6fr 1fr 1.1fr 1fr .8fr',
                        padding: '12px 24px',
                        background: '#F8FAF9',
                        borderTop: '1px solid #EEF0F3',
                        borderBottom: '1px solid #EEF0F3',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#64748B',
                        letterSpacing: '.7px',
                        textTransform: 'uppercase',
                        gap: '10px',
                      }}
                    >
                      <div>Name</div>
                      <div>Batch</div>
                      <div>Program</div>
                      <div>Status</div>
                      <div>Last contacted</div>
                      <div style={{ textAlign: 'right' }}>Action</div>
                    </div>
                    {(deptOutreach || []).map((r, _i) => (
                      <React.Fragment key={_i}>
                        <div
                          data-m="trow"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1.5fr .6fr 1fr 1.1fr 1fr .8fr',
                            padding: '14px 24px',
                            borderBottom: '1px solid #EEF0F3',
                            alignItems: 'center',
                            gap: '10px',
                          }}
                          {...hv(rowHover)}
                        >
                          <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220' }}>{r.name}</div>
                          <div style={{ fontSize: '13px', color: '#475569' }}>{r.batch}</div>
                          <div style={{ fontSize: '13px', color: '#475569' }}>{r.program}</div>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: '700',
                              color: r.statusColor,
                              background: r.statusBg,
                              padding: '5px 12px',
                              borderRadius: '99px',
                              width: 'fit-content',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {r.status}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748B' }}>{r.last}</div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <div role="button" tabIndex={0} onKeyDown={onActivate(r.onContact)}
                              onClick={r.onContact}
                              style={{
                                fontSize: '12.5px',
                                fontWeight: '700',
                                color: r.btnColor,
                                background: r.btnBg,
                                border: `1px solid ${r.btnBorder}`,
                                borderRadius: '10px',
                                padding: '7px 12px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {r.btnLabel}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  <div style={{ padding: '16px 24px', fontSize: '12.5px', color: '#64748B' }}>
                    Showing <span style={{ fontWeight: '700', color: '#0B1220' }}>{deptOutShown}</span> of{' '}
                    <span style={{ fontWeight: '700', color: '#0B1220' }}>{deptOutTotal}</span> alumni
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

