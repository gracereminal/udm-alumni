import React from 'react';
import { hv } from '../lib/stateStyle';
import { selectStyle, selectFx } from '../lib/selectStyle';
import NavSidebar from '../components/NavSidebar';
import RangeError from '../components/RangeError';
import SearchPill from '../components/topbar/SearchPill';
import NotificationBell from '../components/topbar/NotificationBell';
import UserChip from '../components/topbar/UserChip';
import { onActivate } from '../lib/a11y';

/* View layer for the "Reports" screen — converted from "Alumni Tracer Mockups.dc.html". */
export default function ReportsView(v) {
  const {
    exportHover,
    filterHover,
    goRecords,
    repBarGap,
    repBars,
    repChartNote,
    repChartTitle,
    repCollegeOpts,
    repCollegeVal,
    repCourseDisabled,
    repCourseOpacity,
    repCourseOpts,
    repCourseVal,
    repDesc,
    repExportLabel,
    repExportNow,
    repExportOpacity,
    repFindings,
    repFormats,
    repHasTarget,
    repHistory,
    repHistoryFoot,
    repKpis,
    repNoSections,
    repFromOpts,
    repFromVal,
    repOnCollege,
    repOnCourse,
    repOnFrom,
    repOnTo,
    repToOpts,
    repToVal,
    repOutputMeta,
    repPreviewRef,
    repRecords,
    repScopeLabel,
    repSectionRows,
    repShowChart,
    repShowFindings,
    repShowKpi,
    repShowTable,
    repTableGrid,
    repTableHead,
    repTableRows,
    repTableTitle,
    repTargetLabel,
    repTargetPct,
    repTemplateCount,
    repTemplates,
    repTitle,
    repViewArchive,
    repYearsLabel,
    repToday,
    rangeError,
    rowHover,
  } = v;
  return (
    <>
      <div
        data-screen-label="Reports"
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
                Reports
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,.45)', fontWeight: '600', letterSpacing: '.3px' }}>UDM ALUMNI</div>
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
                  Reports & Submissions
                </div>
                <div style={{ fontSize: '13.5px', color: '#64748B', marginTop: '7px', textWrap: 'pretty' }}>
                  Preview the analytics behind each report, then export it as PDF, Excel or CSV. College and course scope follow the alumni
                  registration records.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '11px', flexWrap: 'wrap' }}>
                  <div
                    style={{
                      background: '#E7F0EE',
                      color: '#0F3D2E',
                      borderRadius: '99px',
                      padding: '5px 11px',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      letterSpacing: '.6px',
                    }}
                  >
                    SURVEY COVERAGE: {String(repYearsLabel || '').toUpperCase()}
                  </div>
                  <div
                    style={{
                      background: '#EEF1F5',
                      color: '#475569',
                      borderRadius: '99px',
                      padding: '5px 11px',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      letterSpacing: '.6px',
                    }}
                  >
                    AGGREGATED OUTPUTS · RA 10173 COMPLIANT
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <select
                  value={repCollegeVal}
                  onChange={repOnCollege}
                  aria-label="Filter by college"
                  style={selectStyle('12.5px', '280px')}
                  {...selectFx}
                >
                  {(repCollegeOpts || []).map((o, _i) => (
                    <React.Fragment key={_i}>
                      <option value={o.value}>{o.label}</option>
                    </React.Fragment>
                  ))}
                </select>
                <select
                  value={repCourseVal}
                  onChange={repOnCourse}
                  aria-label="Filter by program"
                  disabled={repCourseDisabled}
                  style={selectStyle('12.5px', '280px', { opacity: repCourseOpacity })}
                  {...selectFx}
                >
                  {(repCourseOpts || []).map((o, _i) => (
                    <React.Fragment key={_i}>
                      <option value={o.value}>{o.label}</option>
                    </React.Fragment>
                  ))}
                </select>
                <select
                  aria-label="Batch from"
                  value={repFromVal}
                  onChange={repOnFrom}
                  style={selectStyle('12.5px', '140px')}
                  {...selectFx}
                >
                  {(repFromOpts || []).map((o, _i) => (
                    <React.Fragment key={_i}>
                      <option value={o.value}>{o.label}</option>
                    </React.Fragment>
                  ))}
                </select>
                <select
                  aria-label="Batch to"
                  value={repToVal}
                  onChange={repOnTo}
                  style={selectStyle('12.5px', '140px')}
                  {...selectFx}
                >
                  {(repToOpts || []).map((o, _i) => (
                    <React.Fragment key={_i}>
                      <option value={o.value}>{o.label}</option>
                    </React.Fragment>
                  ))}
                </select>
                <div role="button" tabIndex={0} onKeyDown={onActivate(goRecords)}
                  onClick={goRecords}
                  style={{
                    background: '#fff',
                    border: '1px solid #E2E5EA',
                    borderRadius: '12px',
                    padding: '11px 15px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#0F172A',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(16,24,40,.04)',
                  }}
                  {...hv(filterHover)}
                >
                  Manage records
                </div>
              </div>
            </div>
            <RangeError message={rangeError} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-start' }}>
              <div
                style={{
                  flex: '1 1 300px',
                  maxWidth: '100%',
                  minWidth: '0',
                  background: '#fff',
                  border: '1px solid #E7E9ED',
                  borderRadius: '16px',
                  boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                  padding: '20px 18px 18px',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', padding: '0 4px' }}>
                  <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>Report library</div>
                  <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#94A3B8' }}>{repTemplateCount}</div>
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748B', margin: '4px 4px 16px', textWrap: 'pretty' }}>
                  Each card shows a snapshot for {repScopeLabel}. Select one to open the full preview.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(repTemplates || []).map((t, _i) => (
                    <React.Fragment key={_i}>
                      <div role="button" tabIndex={0} onKeyDown={onActivate(t.onClick)}
                        onClick={t.onClick}
                        style={{
                          border: `1px solid ${t.border}`,
                          background: t.bg,
                          borderRadius: '14px',
                          padding: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: '13px',
                          alignItems: 'stretch',
                          transition: 'border-color .15s',
                        }}
                        {...hv(t.hover)}
                      >
                        <div
                          style={{
                            width: '78px',
                            flex: 'none',
                            borderRadius: '10px',
                            background: t.thumbBg,
                            border: `1px solid ${t.thumbBorder}`,
                            padding: '9px 8px 0',
                            boxSizing: 'border-box',
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: '3px',
                            minHeight: '68px',
                          }}
                        >
                          {(t.mini || []).map((b, _i) => (
                            <React.Fragment key={_i}>
                              <div style={{ flex: '1', height: b.h, background: b.c, borderRadius: '2px 2px 0 0' }} />
                            </React.Fragment>
                          ))}
                        </div>
                        <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0B1220', lineHeight: '1.3', textWrap: 'pretty' }}>
                              {t.name}
                            </div>
                            <div
                              style={{
                                background: t.tagBg,
                                color: t.tagColor,
                                borderRadius: '7px',
                                padding: '3px 7px',
                                fontSize: '9.5px',
                                fontWeight: '700',
                                letterSpacing: '.5px',
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                                flex: 'none',
                              }}
                            >
                              {t.cadence}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '17px', fontWeight: '700', color: '#0F3D2E', letterSpacing: '-.3px' }}>{t.headline}</span>
                            <span style={{ fontSize: '11.5px', color: '#64748B' }}>{t.headlineLabel}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#94A3B8' }}>{t.runs}</div>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div
                ref={repPreviewRef}
                style={{
                  flex: '999 1 560px',
                  minWidth: '0',
                  maxWidth: '100%',
                  background: '#fff',
                  border: '1px solid #E7E9ED',
                  borderRadius: '16px',
                  boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                    padding: '20px 22px 16px',
                  }}
                >
                  <div style={{ minWidth: '0', flex: '1 1 260px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        fontSize: '10.5px',
                        fontWeight: '700',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        color: '#0F6B4F',
                      }}
                    >
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#1F9D6B' }} />
                      <span>Live preview</span>
                      <span style={{ color: '#94A3B8', fontWeight: '600', letterSpacing: '.4px', textTransform: 'none' }}>· {repScopeLabel}</span>
                    </div>
                    <div
                      style={{
                        fontFamily: 'Inter,sans-serif',
                        fontWeight: '700',
                        fontSize: '20px',
                        lineHeight: '1.25',
                        color: '#0B1220',
                        marginTop: '6px',
                        textWrap: 'pretty',
                      }}
                    >
                      {repTitle}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px', lineHeight: '1.5', textWrap: 'pretty' }}>{repDesc}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', background: '#F1F3F5', borderRadius: '11px', padding: '3px', gap: '2px' }}>
                      {(repFormats || []).map((f, _i) => (
                        <React.Fragment key={_i}>
                          <div role="button" tabIndex={0} onKeyDown={onActivate(f.onClick)}
                            onClick={f.onClick}
                            style={{
                              background: f.bg,
                              color: f.color,
                              boxShadow: f.shadow,
                              borderRadius: '8px',
                              padding: '8px 14px',
                              fontSize: '12.5px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            {f.label}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                    <div role="button" tabIndex={0} onKeyDown={onActivate(repExportNow)}
                      onClick={repExportNow}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#0F3D2E',
                        color: '#fff',
                        borderRadius: '12px',
                        padding: '11px 18px',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        opacity: repExportOpacity,
                      }}
                      {...hv(exportHover)}
                    >
                      <span style={{ fontSize: '12px' }}>↓</span>
                      <span>{repExportLabel}</span>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                    padding: '12px 22px',
                    borderTop: '1px solid #EEF0F3',
                    borderBottom: '1px solid #EEF0F3',
                    background: '#FBFBFA',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                    <div
                      style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        letterSpacing: '.8px',
                        textTransform: 'uppercase',
                        color: '#94A3B8',
                        marginRight: '3px',
                      }}
                    >
                      Include
                    </div>
                    {(repSectionRows || []).map((s, _i) => (
                      <React.Fragment key={_i}>
                        <div role="button" tabIndex={0} onKeyDown={onActivate(s.onClick)}
                          onClick={s.onClick}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            border: `1px solid ${s.border}`,
                            background: s.bg,
                            color: s.color,
                            borderRadius: '99px',
                            padding: '5px 11px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ fontSize: '10px', width: '10px' }}>{s.mark}</span>
                          <span>{s.label}</span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{repOutputMeta}</div>
                </div>
                <div style={{ background: '#EFF0EC', padding: '22px' }}>
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #E2E4DF',
                      borderRadius: '6px',
                      boxShadow: '0 10px 30px -14px rgba(16,24,40,.25)',
                      padding: '28px 30px',
                      maxWidth: '860px',
                      margin: '0 auto',
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '24px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '14px',
                        flexWrap: 'wrap',
                        paddingBottom: '16px',
                        borderBottom: '2px solid #0F3D2E',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '0' }}>
                        <img
                          src="/alumni-logo.png"
                          alt="UDM"
                          style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', flex: 'none' }}
                        />
                        <div style={{ minWidth: '0' }}>
                          <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.8px', textTransform: 'uppercase', color: '#64748B' }}>
                            UDM Alumni Relations Office
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#0B1220', marginTop: '3px', textWrap: 'pretty' }}>
                            {repTitle}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748B', lineHeight: '1.6' }}>
                        <div>{repScopeLabel}</div>
                        <div>{repYearsLabel} · {repRecords} verified records</div>
                        <div>Preview · {repToday}</div>
                      </div>
                    </div>
                    {repNoSections ? (
                      <>
                        <div style={{ padding: '40px 10px', textAlign: 'center', fontSize: '13px', color: '#94A3B8' }}>
                          No sections selected — turn on at least one section above to preview and export.
                        </div>
                      </>
                    ) : null}
                    {repShowKpi ? (
                      <>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,150px),1fr))',
                            gap: '0',
                            border: '1px solid #E7E9ED',
                            borderRadius: '10px',
                            overflow: 'hidden',
                          }}
                        >
                          {(repKpis || []).map((k, _i) => (
                            <React.Fragment key={_i}>
                              <div style={{ padding: '14px 16px', borderRight: '1px solid #EEF0F3', minWidth: '0' }}>
                                <div
                                  style={{
                                    fontSize: '10.5px',
                                    fontWeight: '700',
                                    letterSpacing: '.5px',
                                    textTransform: 'uppercase',
                                    color: '#94A3B8',
                                  }}
                                >
                                  {k.label}
                                </div>
                                <div style={{ fontSize: '23px', fontWeight: '700', letterSpacing: '-.5px', color: '#0B1220', marginTop: '5px' }}>
                                  {k.value}
                                </div>
                                <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>{k.sub}</div>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </>
                    ) : null}
                    {repShowChart ? (
                      <>
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'baseline',
                              justifyContent: 'space-between',
                              gap: '10px',
                              flexWrap: 'wrap',
                              marginBottom: '14px',
                            }}
                          >
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0B1220' }}>{repChartTitle}</div>
                            <div style={{ fontSize: '11.5px', color: '#64748B' }}>{repChartNote}</div>
                          </div>
                          <div
                            style={{
                              position: 'relative',
                              height: '200px',
                              display: 'flex',
                              alignItems: 'flex-end',
                              gap: repBarGap,
                              padding: '0 4px',
                              borderBottom: '1px solid #CFD6D3',
                            }}
                          >
                            {repHasTarget ? (
                              <>
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: '0',
                                    right: '0',
                                    bottom: repTargetPct,
                                    borderTop: '1.5px dashed #C9A21E',
                                    pointerEvents: 'none',
                                    zIndex: '1',
                                  }}
                                >
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: '0',
                                      top: '-19px',
                                      fontSize: '10.5px',
                                      fontWeight: '700',
                                      color: '#8A6D1F',
                                      background: '#fff',
                                      padding: '0 4px',
                                    }}
                                  >
                                    {repTargetLabel}
                                  </div>
                                </div>
                              </>
                            ) : null}
                            {(repBars || []).map((b, _i) => (
                              <React.Fragment key={_i}>
                                <div
                                  title={b.tip}
                                  style={{
                                    flex: '1',
                                    minWidth: '0',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'flex-end',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0B1220', whiteSpace: 'nowrap' }}>{b.display}</div>
                                  <div style={{ width: '100%', maxWidth: '58px', height: b.pct, background: b.color, borderRadius: '6px 6px 0 0' }} />
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: repBarGap, padding: '8px 4px 0' }}>
                            {(repBars || []).map((b, _i) => (
                              <React.Fragment key={_i}>
                                <div
                                  title={b.tip}
                                  style={{
                                    flex: '1',
                                    minWidth: '0',
                                    textAlign: 'center',
                                    fontSize: '11px',
                                    color: '#64748B',
                                    fontWeight: '600',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {b.label}
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : null}
                    {repShowTable ? (
                      <>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0B1220', marginBottom: '10px' }}>{repTableTitle}</div>
                          <div style={{ overflowX: 'auto' }}>
                            <div style={{ minWidth: '520px' }}>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: repTableGrid,
                                  gap: '10px',
                                  padding: '9px 10px',
                                  background: '#F4F8F6',
                                  borderRadius: '8px',
                                  fontSize: '10.5px',
                                  fontWeight: '700',
                                  letterSpacing: '.5px',
                                  textTransform: 'uppercase',
                                  color: '#475569',
                                }}
                              >
                                {(repTableHead || []).map((c, _i) => (
                                  <React.Fragment key={_i}>
                                    <div style={{ textAlign: c.align }}>{c.v}</div>
                                  </React.Fragment>
                                ))}
                              </div>
                              {(repTableRows || []).map((r, _i) => (
                                <React.Fragment key={_i}>
                                  <div
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: repTableGrid,
                                      gap: '10px',
                                      padding: '10px',
                                      borderBottom: '1px solid #EEF0F3',
                                      fontSize: '12.5px',
                                      color: '#334155',
                                    }}
                                  >
                                    {(r.cells || []).map((c, _i) => (
                                      <React.Fragment key={_i}>
                                        <div style={{ textAlign: c.align, fontWeight: c.weight, color: c.color }}>{c.v}</div>
                                      </React.Fragment>
                                    ))}
                                  </div>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : null}
                    {repShowFindings ? (
                      <>
                        <div style={{ background: '#F7F6F1', borderRadius: '10px', padding: '16px 18px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0B1220', marginBottom: '10px' }}>Key findings</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(repFindings || []).map((f, _i) => (
                              <React.Fragment key={_i}>
                                <div
                                  style={{ display: 'flex', gap: '10px', fontSize: '13px', lineHeight: '1.55', color: '#334155', textWrap: 'pretty' }}
                                >
                                  <span
                                    style={{
                                      width: '6px',
                                      height: '6px',
                                      borderRadius: '50%',
                                      background: '#C9A21E',
                                      flex: 'none',
                                      marginTop: '8px',
                                    }}
                                  />
                                  <span>{f.text}</span>
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : null}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '10px',
                        flexWrap: 'wrap',
                        paddingTop: '12px',
                        borderTop: '1px solid #EEF0F3',
                        fontSize: '10.5px',
                        color: '#94A3B8',
                      }}
                    >
                      <span>Aggregated institutional metrics only — no names, Membership IDs or contact details (RA 10173).</span>
                      <span>{repOutputMeta}</span>
                    </div>
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
                padding: '22px 0 0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '0 24px 18px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>Generated reports</div>
                  <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                    Audit log of exports — retained seven years per CHED record-keeping policy. Timestamps in PHT (UTC+8).
                  </div>
                </div>
                <div onKeyDown={onActivate(repViewArchive)} role="button" tabIndex={0} onClick={repViewArchive} style={{ fontSize: '13px', fontWeight: '600', color: '#0F6B4F', cursor: 'pointer', whiteSpace: 'nowrap' }}>View archive →</div>
              </div>
              <div data-m="tscroll" style={{ overflowX: 'auto' }}>
                <div
                  data-m="trow"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1.1fr .6fr .6fr .7fr 1fr',
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
                    minWidth: '820px',
                  }}
                >
                  <div>Report</div>
                  <div>Generated by</div>
                  <div>Date</div>
                  <div>Format</div>
                  <div>Size</div>
                  <div>Status</div>
                  <div style={{ textAlign: 'right' }}>Actions</div>
                </div>
                {(repHistory || []).map((h, _i) => (
                  <React.Fragment key={_i}>
                    <div
                      data-m="trow"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1.1fr .6fr .6fr .7fr 1fr',
                        padding: '15px 24px',
                        borderBottom: '1px solid #EEF0F3',
                        alignItems: 'center',
                        gap: '10px',
                        minWidth: '820px',
                      }}
                      {...hv(rowHover)}
                    >
                      <div style={{ minWidth: '0' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220', textWrap: 'pretty' }}>{h.name}</div>
                        <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '2px' }}>{h.scope}</div>
                      </div>
                      <div style={{ fontSize: '13px', color: '#475569' }}>{h.by}</div>
                      <div style={{ fontSize: '12.5px', color: '#64748B' }}>{h.date}</div>
                      <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0B1220' }}>{h.fmt}</div>
                      <div style={{ fontSize: '12.5px', color: '#64748B' }}>{h.size}</div>
                      <div
                        style={{
                          fontSize: '11.5px',
                          fontWeight: '700',
                          color: h.statusColor,
                          background: h.statusBg,
                          padding: '5px 11px',
                          borderRadius: '99px',
                          width: 'fit-content',
                        }}
                      >
                        {h.status}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                        <div role="button" tabIndex={0} onKeyDown={onActivate(h.onPreview)}
                          onClick={h.onPreview}
                          style={{
                            fontSize: '12.5px',
                            fontWeight: '700',
                            color: '#0F3D2E',
                            border: '1px solid #D7E3DE',
                            borderRadius: '9px',
                            padding: '6px 11px',
                            cursor: 'pointer',
                          }}
                          {...hv(filterHover)}
                        >
                          Preview
                        </div>
                        <div role="button" tabIndex={0} onKeyDown={onActivate(h.onDownload)}
                          onClick={h.onDownload}
                          style={{
                            fontSize: '12.5px',
                            fontWeight: '700',
                            color: '#fff',
                            background: '#0F3D2E',
                            borderRadius: '9px',
                            padding: '7px 11px',
                            cursor: 'pointer',
                          }}
                          {...hv(exportHover)}
                        >
                          ↓
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <div style={{ padding: '16px 24px', fontSize: '12.5px', color: '#64748B' }}>{repHistoryFoot}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

