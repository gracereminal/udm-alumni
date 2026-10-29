import React from 'react';
import Pager from '../components/Pager';
import { hv } from '../lib/stateStyle';
import NavSidebar from '../components/NavSidebar';
import SearchPill from '../components/topbar/SearchPill';
import NotificationBell from '../components/topbar/NotificationBell';
import UserChip from '../components/topbar/UserChip';
import { onActivate } from '../lib/a11y';
import JobComposerDialog from '../components/JobComposerDialog';

/* View layer for the "Jobs" screen — converted from "Alumni Tracer Mockups.dc.html". */
export default function JobsView(v) {
  const {
    bookmarkHover,
    filtersActive,
    goldHover,
    jobComposer,
    jobFilters,
    jobFormButtonLabel,
    jobQuery,
    jobSelects,
    jobStats,
    jobsCountLabel,
    jobsList,
    jobPage,
    jobPages,
    setJobPage,
    resetFilters,
    resetHover,
    savedCount,
    savedFilterBg,
    savedFilterBorder,
    savedFilterFill,
    setJobQuery,
    toggleJobForm,
    toggleSavedOnly,
  } = v;
  return (
    <>
      <div
        data-screen-label="Job Board"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background:
            'radial-gradient(900px 520px at 0% 0%,#E3F1EA 0%,rgba(227,241,234,0) 70%),radial-gradient(800px 500px at 100% 100%,#EAF2EE 0%,rgba(234,242,238,0) 70%),#F3F6F4',
        }}
      >
        <NavSidebar style={{ flex: 'none' }} />
        <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column' }}>
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
                Jobs
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '600', letterSpacing: '.3px' }}>UDM ALUMNI · JOB BOARD</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <SearchPill />
              <NotificationBell />
              <UserChip />
            </div>
          </div>
          <div style={{ padding: '14px 12px 28px', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter,system-ui,sans-serif' }}>
            <div
              data-m="jb-page"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(255,255,255,.55)',
                border: '1px solid #E7E9ED',
                borderRadius: '20px',
                boxShadow: '0 1px 2px rgba(16,24,40,.03)',
                padding: '24px',
              }}
            >
              <div
                data-m="jb-page-head"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '14px',
                  flexWrap: 'wrap',
                  marginBottom: '20px',
                  padding: '0 4px 20px',
                  borderBottom: '1px solid #E3E8E5',
                }}
              >
                <div style={{ minWidth: '0', flex: '1 1 320px' }}>
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
                    Job Board
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#64748B', marginTop: '4px' }}>
                    Exclusive career opportunities and direct referrals from fellow Merlions & partner employers.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 'none' }}>
                  <div role="button" tabIndex={0} onKeyDown={onActivate(toggleSavedOnly)}
                    onClick={toggleSavedOnly}
                    title="Show only saved jobs"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderRadius: '10px',
                      padding: '11px 16px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#0B1220',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      background: savedFilterBg,
                      border: `1px solid ${savedFilterBorder}`,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      stroke="#0F3D2E"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      fill={savedFilterFill}
                    >
                      <path d="M6 3h12v18l-6-4-6 4z" />
                    </svg>
                    <span>Saved Jobs</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '20px',
                        height: '20px',
                        padding: '0 6px',
                        boxSizing: 'border-box',
                        borderRadius: '999px',
                        background: '#E6F0EB',
                        color: '#0F3D2E',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        lineHeight: '1',
                      }}
                    >
                      {savedCount}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleJobForm}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#0F3D2E',
                      color: '#fff',
                      fontFamily: 'inherit',
                      fontWeight: '700',
                      fontSize: '13.5px',
                      letterSpacing: '.2px',
                      padding: '12px 20px',
                      border: '1px solid #0F3D2E',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      minHeight: '42px',
                    }}
                    {...hv(goldHover)}
                  >
                    <span style={{ fontSize: '16px', lineHeight: '1', fontWeight: '700' }}>+</span>
                    {jobFormButtonLabel}{' '}
                  </button>
                </div>
              </div>
              {jobComposer ? <JobComposerDialog {...jobComposer} /> : null}
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E7E9ED',
                  borderRadius: '16px',
                  boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                  padding: '16px 22px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,180px),1fr))',
                  gap: '18px',
                  marginBottom: '16px',
                }}
              >
                {(jobStats || []).map((st, _i) => (
                  <React.Fragment key={_i}>
                    <div
                      onMouseEnter={st.onEnter}
                      onMouseLeave={st.onLeave}
                      aria-describedby={st.hint ? `job-stat-hint-${_i}` : undefined}
                      style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '0', cursor: st.hint ? 'help' : 'default' }}
                    >
                      {st.hint ? (
                        <div
                          id={`job-stat-hint-${_i}`}
                          role="tooltip"
                          style={{
                            display: st.showHint ? 'block' : 'none',
                            position: 'absolute', left: '0', bottom: 'calc(100% + 10px)', zIndex: '20', width: '240px', background: '#0B1220', color: '#fff',
                            fontSize: '12px', lineHeight: '1.5', fontWeight: '500', padding: '10px 12px', borderRadius: '10px', boxShadow: '0 8px 24px rgba(16,24,40,.25)', pointerEvents: 'none',
                          }}
                        >
                          {st.hint}
                        </div>
                      ) : null}
                      <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '.5px', textTransform: 'uppercase', color: '#94A3B8' }}>
                        {st.label}
                      </div>
                      <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '17px', color: '#0B1220' }}>{st.value}</div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #E7E9ED',
                  borderRadius: '16px',
                  boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                  marginBottom: '18px',
                }}
              >
                <div
                  style={{
                    flex: '1',
                    minWidth: '240px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    border: '1px solid #E2E5EA',
                    borderRadius: '10px',
                    padding: '11px 14px',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,.4)" strokeWidth="2" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-4-4" />
                  </svg>
                  <input
                    value={jobQuery}
                    onChange={setJobQuery}
                    placeholder="Search job titles, tech stack, company, or keywords…"
                    style={{
                      flex: '1',
                      minWidth: '0',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontFamily: 'inherit',
                      fontSize: '13px',
                      color: '#0B1220',
                    }}
                  />
                </div>
                {(jobSelects || []).map((sel) => (
                  <label
                    key={sel.label}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      minWidth: '172px',
                      boxSizing: 'border-box',
                      border: '1px solid #E2E5EA',
                      borderRadius: '10px',
                      padding: '0 16px',
                      background: '#fff',
                    }}
                  >
                    <select
                      aria-label={sel.label}
                      value={sel.value}
                      onChange={sel.onChange}
                      style={{
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        font: 'inherit',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#0B1220',
                        padding: '11px 22px 11px 0',
                        width: '100%',
                        cursor: 'pointer',
                      }}
                    >
                      {sel.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="rgba(0,0,0,.45)"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      aria-hidden="true"
                      style={{ position: 'absolute', right: '14px', pointerEvents: 'none' }}
                    >
                      <path d="M5 9l7 7 7-7" />
                    </svg>
                  </label>
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                  marginBottom: '18px',
                }}
              >
                <div
                  data-m="seg"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px',
                    background: '#F1F5F3',
                    border: '1px solid #E7E9ED',
                    borderRadius: '999px',
                    flexWrap: 'nowrap',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    minWidth: '0',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  {(jobFilters || []).map((f, _i) => (
                    <React.Fragment key={_i}>
                      <div role="button" tabIndex={0} onKeyDown={onActivate(f.onClick)}
                        onClick={f.onClick}
                        style={{
                          borderRadius: '999px',
                          padding: '8px 16px',
                          fontSize: '12.5px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          cursor: 'pointer',
                          background: f.bg,
                          color: f.color,
                        }}
                      >
                        {f.label}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12.5px', color: '#64748B' }}>{jobsCountLabel}</span>
                  {filtersActive ? (
                    <>
                      <button
                        type="button"
                        onClick={resetFilters}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px 2px',
                          fontFamily: 'inherit',
                          fontSize: '12.5px',
                          fontWeight: '700',
                          color: '#0F3D2E',
                          textDecoration: 'underline',
                          textUnderlineOffset: '3px',
                          cursor: 'pointer',
                        }}
                        {...hv(resetHover)}
                      >
                        Reset filters
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(jobsList || []).map((job, _i) => (
                  <React.Fragment key={_i}>
                    <div
                      style={{
                        background: '#fff',
                        border: '1px solid #E7E9ED',
                        borderRadius: '16px',
                        boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                        padding: '20px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '24px',
                      }}
                    >
                      <div
                        style={{
                          flex: 'none',
                          width: '104px',
                          height: '78px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          position: 'relative',
                          background: job.photoCss,
                          border: '1px solid #E7E9ED',
                        }}
                      >
                        {job.noPhoto ? (
                          <>
                            <div
                              style={{
                                position: 'absolute',
                                inset: '0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
                                fontSize: '9px',
                                color: '#94A3B8',
                                textAlign: 'center',
                                padding: '6px',
                              }}
                            >
                              company photo
                            </div>
                          </>
                        ) : null}
                      </div>
                      <div style={{ minWidth: '0', flex: '1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={job.openDetails}
                            style={{
                              fontSize: '15px',
                              fontWeight: '700',
                              color: '#0B1220',
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                            {...hv({ color: '#0F6B4F' })}
                          >
                            {job.title}
                          </button>
                          <div
                            style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              color: '#0F3D2E',
                              background: '#E6F0EB',
                              padding: '3px 9px',
                              borderRadius: '8px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {job.type}
                          </div>
                          {job.closes ? (
                            <div style={{ fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '8px', whiteSpace: 'nowrap', color: job.closes.color, background: job.closes.bg }}>
                              {job.closes.label}
                            </div>
                          ) : null}
                          {job.isUrgent ? (
                            <div
                              style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                padding: '3px 9px',
                                borderRadius: '8px',
                                whiteSpace: 'nowrap',
                                color: job.badgeColor,
                                background: job.badgeBg,
                                border: `1px solid ${job.badgeBorder}`,
                              }}
                            >
                              {job.badge}
                            </div>
                          ) : null}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '10px' }}>
                          {job.company} · {job.location} · {job.posted}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {(job.tags || []).map((tag, _i) => (
                            <React.Fragment key={_i}>
                              <div
                                style={{
                                  fontSize: '11.5px',
                                  fontWeight: '600',
                                  color: '#64748B',
                                  background: '#F1F5F9',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                }}
                              >
                                {tag}
                              </div>
                            </React.Fragment>
                          ))}
                          {job.note ? (
                            <>
                              <span style={{ fontSize: '12px', fontWeight: '600', color: '#0F3D2E' }}>{job.note}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0B1220', whiteSpace: 'nowrap' }}>{job.salary}</div>
                          <div style={{ fontSize: '11.5px', color: '#64748B' }}>{job.salaryNote}</div>
                          {job.appStatus ? (
                            <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#0F6B4F', marginTop: '4px' }}>{job.appStatus}</div>
                          ) : null}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={job.openDetails}
                            style={{
                              background: '#fff',
                              border: '1px solid #E2E5EA',
                              color: '#0B1220',
                              borderRadius: '10px',
                              height: '42px',
                              padding: '0 14px',
                              fontFamily: 'inherit',
                              fontWeight: '600',
                              fontSize: '12.5px',
                              cursor: 'pointer',
                            }}
                            {...hv({ background: '#F1F5F9' })}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={job.toggleSave}
                            aria-label={job.bookmarkLabel}
                            aria-pressed={job.saved}
                            title={job.bookmarkLabel}
                            style={{
                              width: '42px',
                              height: '42px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              flex: 'none',
                              padding: '0',
                              background: job.bookmarkBg,
                              border: `1px solid ${job.bookmarkBorder}`,
                            }}
                            {...hv(bookmarkHover)}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              strokeWidth="2"
                              strokeLinejoin="round"
                              fill={job.bookmarkFill}
                              stroke={job.bookmarkStroke}
                              aria-hidden="true"
                            >
                              <path d="M6 3h12v18l-6-4-6 4z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={job.toggleApply}
                            style={{
                              fontFamily: 'inherit',
                              fontWeight: '700',
                              fontSize: '13px',
                              padding: '0 22px',
                              height: '42px',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              flex: 'none',
                              background: job.applyBg,
                              color: job.applyColor,
                              border: `1px solid ${job.applyBorder}`,
                            }}
                          >
                            {job.applyLabel}
                          </button>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '16px',
                  flexWrap: 'wrap',
                  marginTop: '22px',
                  paddingTop: '18px',
                  borderTop: '1px solid #E7E9ED',
                }}
              >
                <Pager page={jobPage} pages={jobPages} onPage={setJobPage} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
