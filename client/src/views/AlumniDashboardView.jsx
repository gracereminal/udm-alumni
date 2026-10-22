import React from 'react';
import { hv } from '../lib/stateStyle';
import NavSidebar from '../components/NavSidebar';
import SearchPill from '../components/topbar/SearchPill';
import NotificationBell from '../components/topbar/NotificationBell';
import UserChip from '../components/topbar/UserChip';
import { onActivate } from '../lib/a11y';

/* View layer for the "AlumniDashboard" screen — converted from "Alumni Tracer Mockups.dc.html". */
export default function AlumniDashboardView(v) {
  const {
    alumniName,
    annFeed,
    annFeedEmpty,
    annFeedEmptyText,
    annShowFooter,
    annTabs,
    announceOrder,
    avatarCss,
    avatarInitials,
    dashBatch,
    dashJobs,
    dashJobsOpen,
    dashJobsBrowseLabel,
    dashMetrics,
    dashStatus,
    dashSubline,
    dashSurveyPct,
    dashSurveyRemainingLabel,
    dismissSurveyBanner,
    goEvents,
    goJobs,
    goProfile,
    goSurvey,
    hasAvatar,
    jobsCardShadow,
    jobsOrder,
    jobsTitleSize,
    noAvatar,
    showSurveyBanner,
    showSurveyGhostCta,
    surveyComplete,
    surveyGhostCtaLabel,
    surveyIncomplete,
  } = v;
  return (
    <>
      <div
        data-screen-label="Alumni Dashboard"
        style={{
          minHeight: '100vh',
          background:
            'radial-gradient(900px 520px at 0% 0%,#E3F1EA 0%,rgba(227,241,234,0) 70%),radial-gradient(800px 500px at 100% 100%,#EAF2EE 0%,rgba(234,242,238,0) 70%),#F3F6F4',
          display: 'flex',
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
                Dashboard
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,.45)', fontWeight: '600', letterSpacing: '.3px' }}>
                UDM ALUMNI RELATIONS OFFICE · ALUMNI
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <SearchPill />
              <NotificationBell />
              <UserChip />
            </div>
          </div>
          <div style={{ padding: '14px 12px 28px', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter,system-ui,sans-serif' }}>
            <div
              style={{
                background: '#fff',
                border: '1px solid #E7E9ED',
                borderRadius: '16px',
                boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                padding: '24px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                marginBottom: '14px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                <div role="button" tabIndex={0} onKeyDown={onActivate(goProfile)} onClick={goProfile} title="Edit profile" style={{ flex: 'none', cursor: 'pointer' }}>
                  {hasAvatar ? (
                    <>
                      <div
                        role="img"
                        aria-label="Profile photo"
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          border: '2px solid #F0C428',
                          boxSizing: 'border-box',
                          background: avatarCss,
                        }}
                      />
                    </>
                  ) : null}
                  {noAvatar ? (
                    <>
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          background: '#EEF2F6',
                          border: '2px dashed #CBD5E1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'Inter,sans-serif',
                          fontWeight: '700',
                          fontSize: '19px',
                          color: '#94A3B8',
                        }}
                      >
                        {avatarInitials}
                      </div>
                    </>
                  ) : null}
                </div>
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    {dashStatus ? (
                    <div
                      style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        color: dashStatus.color,
                        background: dashStatus.bg,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        letterSpacing: '.3px',
                      }}
                    >
                      {dashStatus.label}
                    </div>
                    ) : null}
                    {dashBatch ? (
                    <div
                      style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        color: '#0F3D2E',
                        background: '#E6F0EB',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        letterSpacing: '.3px',
                      }}
                    >
                      {dashBatch}
                    </div>
                    ) : null}
                  </div>
                  <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: '30px', letterSpacing: '-.7px', color: '#0B1220' }}>
                    Welcome, {alumniName}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B', marginTop: '5px' }}>{dashSubline}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flex: 'none' }}>
                {showSurveyGhostCta ? (
                  <>
                    <div role="button" tabIndex={0} onKeyDown={onActivate(goSurvey)}
                      onClick={goSurvey}
                      style={{
                        border: '1px solid #0F3D2E',
                        background: '#E6F0EB',
                        color: '#0F3D2E',
                        fontWeight: '700',
                        fontSize: '13px',
                        padding: '12px 18px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {surveyGhostCtaLabel}
                    </div>
                  </>
                ) : null}
                <div role="button" tabIndex={0} onKeyDown={onActivate(goProfile)}
                  onClick={goProfile}
                  style={{
                    border: '1px solid #0F3D2E',
                    background: '#0F3D2E',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '13px',
                    padding: '12px 18px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Edit Profile
                </div>
              </div>
            </div>
            {showSurveyBanner ? (
              <>
                <div
                  style={{
                    position: 'relative',
                    background: '#FBF0D8',
                    border: '1px solid #F0E2BD',
                    borderRadius: '18px',
                    padding: '24px 28px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '24px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div role="button" tabIndex={0} onKeyDown={onActivate(dismissSurveyBanner)}
                    onClick={dismissSurveyBanner}
                    title="Remind me later"
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '14px',
                      width: '26px',
                      height: '26px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: 'rgba(61,47,8,.5)',
                      cursor: 'pointer',
                    }}
                    {...hv({ background: 'rgba(138,109,31,.14)' })}
                  >
                    ×
                  </div>
                  <div style={{ minWidth: '240px', flex: '1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div
                        style={{
                          fontSize: '10.5px',
                          fontWeight: '700',
                          letterSpacing: '.6px',
                          color: '#8A6D1F',
                          background: '#fff',
                          padding: '4px 10px',
                          borderRadius: '8px',
                        }}
                      >
                        ACTION REQUIRED
                      </div>
                      <div style={{ fontSize: '11.5px', fontWeight: '700', color: '#8A6D1F' }}>{dashSurveyPct} complete</div>
                    </div>
                    <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: '19px', color: '#3D2F08', marginBottom: '6px' }}>
                      Your alumni profile is unfinished
                    </div>
                    <div style={{ fontSize: '13px', color: '#5A4712', lineHeight: '1.55', maxWidth: '560px' }}>{dashSurveyRemainingLabel}</div>
                    <div
                      style={{
                        height: '8px',
                        borderRadius: '999px',
                        background: 'rgba(138,109,31,.2)',
                        overflow: 'hidden',
                        marginTop: '14px',
                        maxWidth: '420px',
                      }}
                    >
                      <div style={{ height: '100%', background: '#8A6D1F', width: dashSurveyPct }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 'none' }}>
                    <div role="button" tabIndex={0} onKeyDown={onActivate(dismissSurveyBanner)}
                      onClick={dismissSurveyBanner}
                      style={{ fontSize: '12.5px', fontWeight: '700', color: '#8A6D1F', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Remind me later
                    </div>
                    <div role="button" tabIndex={0} onKeyDown={onActivate(goSurvey)}
                      onClick={goSurvey}
                      style={{
                        background: '#0F3D2E',
                        color: '#fff',
                        fontWeight: '700',
                        fontSize: '14px',
                        padding: '15px 24px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Complete My Profile →
                    </div>
                  </div>
                </div>
              </>
            ) : null}
            <div
              data-m="kpi-grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: '14px', marginBottom: '14px' }}
            >
              {(dashMetrics || []).map((m, _i) => (
                <React.Fragment key={_i}>
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #E7E9ED',
                      borderRadius: '16px',
                      boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                      padding: '24px',
                      minWidth: '0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220' }}>{m.label}</div>
                      <div
                        title="More options"
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94A3B8',
                          cursor: 'pointer',
                          flex: 'none',
                          fontSize: '17px',
                          lineHeight: '1',
                          fontWeight: '700',
                        }}
                        {...hv({ background: '#F1F5F3', color: '#0B1220' })}
                      >
                        ⋮
                      </div>
                    </div>
                    <div
                      data-m="kpi-val"
                      style={{
                        fontFamily: 'Inter,sans-serif',
                        fontWeight: '700',
                        fontSize: '24px',
                        lineHeight: '1.15',
                        letterSpacing: '-.5px',
                        color: m.valueColor,
                        marginBottom: '4px',
                      }}
                    >
                      {m.value}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px' }}>{m.sub}</div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        color: m.tagColor,
                        background: m.tagBg,
                        padding: '4px 10px',
                        borderRadius: '999px',
                        width: 'fit-content',
                      }}
                    >
                      {m.tag}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,320px),1fr))', gap: '14px', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '0', order: announceOrder }}>
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #E7E9ED',
                    borderRadius: '16px',
                    boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                    padding: '24px',
                  }}
                >
                  <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: '15px', color: '#0B1220', marginBottom: '10px' }}>
                    Announcements & Events
                  </div>
                  <div
                    role="tablist"
                    aria-label="Filter announcements and events"
                    style={{
                      display: 'flex',
                      gap: '20px',
                      borderBottom: '1px solid #E7E9ED',
                      marginBottom: '14px',
                      overflowX: 'auto',
                      overflowY: 'hidden',
                    }}
                  >
                    {(annTabs || []).map((t, _i) => (
                      <React.Fragment key={_i}>
                        <button
                          role="tab"
                          aria-selected={t.selected}
                          onClick={t.onClick}
                          style={{
                            appearance: 'none',
                            background: 'none',
                            border: '0',
                            borderBottom: `2px solid ${t.line}`,
                            marginBottom: '-1px',
                            padding: '0 0 10px',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            fontFamily: 'inherit',
                            fontSize: '13px',
                            fontWeight: t.weight,
                            color: t.color,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'color .15s',
                          }}
                          {...hv({ color: '#0B1220' })}
                        >
                          <span>{t.label}</span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              color: t.countColor,
                              background: t.countBg,
                              padding: '1px 7px',
                              borderRadius: '99px',
                              minWidth: '8px',
                              textAlign: 'center',
                            }}
                          >
                            {t.count}
                          </span>
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                  <div role="tabpanel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {annFeedEmpty ? (
                      <>
                        <div style={{ padding: '28px 0 18px', textAlign: 'center', fontSize: '13px', color: '#64748B' }}>{annFeedEmptyText}</div>
                      </>
                    ) : null}
                    {(annFeed || []).map((an, _i) => (
                      <React.Fragment key={_i}>
                        <div role="button" tabIndex={0} onKeyDown={onActivate(an.onOpen)}
                          onClick={an.onOpen}
                          style={{
                            background: '#F7FAF8',
                            border: '1px solid #EDF2EF',
                            borderRadius: '14px',
                            padding: '14px 16px',
                            display: 'flex',
                            gap: '14px',
                            alignItems: 'flex-start',
                            cursor: an.cursor,
                            transition: 'border-color .15s',
                          }}
                          {...hv(an.hover)}
                        >
                          <div
                            style={{
                              flex: 'none',
                              width: '52px',
                              height: '56px',
                              borderRadius: '11px',
                              background: '#fff',
                              border: '1px solid #E3ECE7',
                              boxSizing: 'border-box',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '1px',
                            }}
                          >
                            <div
                              style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '.8px' }}
                            >
                              {an.month}
                            </div>
                            <div style={{ fontFamily: 'Inter,sans-serif', fontSize: '21px', fontWeight: '700', color: '#0F3D2E', lineHeight: '1' }}>
                              {an.day}
                            </div>
                          </div>
                          <div style={{ minWidth: '0', flex: '1' }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '5px',
                                fontSize: '10.5px',
                                fontWeight: '700',
                                letterSpacing: '.5px',
                                textTransform: 'uppercase',
                                color: an.typeColor,
                              }}
                            >
                              {an.isEvent ? (
                                <>
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ flex: 'none' }}>
                                    <rect x="1" y="2" width="10" height="9" rx="2" stroke="currentColor" strokeWidth="1.4" />
                                    <line x1="1" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="1.4" />
                                  </svg>
                                </>
                              ) : null}
                              {an.isNotice ? (
                                <>
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ flex: 'none' }}>
                                    <circle cx="6" cy="6" r="4.8" stroke="currentColor" strokeWidth="1.4" />
                                    <line x1="6" y1="5.2" x2="6" y2="8.6" stroke="currentColor" strokeWidth="1.4" />
                                    <circle cx="6" cy="3.4" r=".8" fill="currentColor" />
                                  </svg>
                                </>
                              ) : null}
                              <span>{an.typeLabel}</span>
                              <span style={{ color: '#94A3B8', fontWeight: '600' }}>{an.subLabel}</span>
                            </div>
                            <div
                              style={{
                                fontSize: '14px',
                                fontWeight: '700',
                                color: '#0B1220',
                                lineHeight: '1.35',
                                textWrap: 'pretty',
                                textDecoration: an.titleDecor,
                              }}
                            >
                              {an.title}
                            </div>
                            {an.isEvent ? (
                              <>
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    marginTop: '5px',
                                    fontSize: '12.5px',
                                    color: '#475569',
                                    lineHeight: '1.45',
                                  }}
                                >
                                  <div>{an.when}</div>
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{an.venue}</div>
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px 12px',
                                    flexWrap: 'wrap',
                                    marginTop: '10px',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      color: an.statusFg,
                                      background: an.statusBg,
                                      padding: '4px 9px',
                                      borderRadius: '99px',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: an.statusDot }} />
                                    <span>{an.statusLabel}</span>
                                  </div>
                                  <div
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      fontSize: '12.5px',
                                      fontWeight: '700',
                                      color: '#0F3D2E',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    <span>{an.cta}</span>
                                    <span aria-hidden="true">→</span>
                                  </div>
                                </div>
                              </>
                            ) : null}
                            {an.isNotice ? (
                              <>
                                <div style={{ fontSize: '12.5px', color: '#64748B', lineHeight: '1.55', marginTop: '4px', textWrap: 'pretty' }}>
                                  {an.body}
                                </div>
                                <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '6px' }}>{an.meta}</div>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  {annShowFooter ? (
                    <>
                      <div role="button" tabIndex={0} onKeyDown={onActivate(goEvents)}
                        onClick={goEvents}
                        style={{
                          borderTop: '1px solid #E7E9ED',
                          marginTop: '16px',
                          paddingTop: '12px',
                          fontSize: '12.5px',
                          fontWeight: '700',
                          color: '#0F3D2E',
                          cursor: 'pointer',
                        }}
                      >
                        View all events →
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '0', order: jobsOrder }}>
                <div style={{ background: '#fff', border: '1px solid #E7E9ED', borderRadius: '16px', boxShadow: jobsCardShadow, padding: '24px' }}>
                  {surveyComplete ? (
                    <>
                      <div
                        style={{
                          fontSize: '10.5px',
                          fontWeight: '700',
                          letterSpacing: '.6px',
                          color: '#0F3D2E',
                          background: '#E6F0EB',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          width: 'fit-content',
                          marginBottom: '12px',
                        }}
                      >
                        MATCHED FOR YOU
                      </div>
                    </>
                  ) : null}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
                    <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: jobsTitleSize, color: '#0B1220' }}>Job Board</div>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        color: '#0F3D2E',
                        background: '#E6F0EB',
                        padding: '4px 9px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {dashJobsOpen} OPEN
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                    {!(dashJobs || []).length ? (
                      <div style={{ background: '#F7FAF8', border: '1px dashed #DCE5E0', borderRadius: '14px', padding: '16px 14px', fontSize: '12.5px', color: '#64748B', textAlign: 'center' }}>
                        No open job postings right now.
                      </div>
                    ) : null}
                    {(dashJobs || []).map((job, _i) => (
                      <React.Fragment key={_i}>
                        <div
                          style={{
                            background: '#F7FAF8',
                            border: '1px solid #EDF2EF',
                            borderRadius: '14px',
                            padding: '13px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '0' }}>
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: '#E6F0EB',
                                color: '#0F3D2E',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flex: 'none',
                              }}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ width: '18px', height: '18px' }}
                              >
                                <rect x="3" y="7" width="18" height="13" rx="2" />
                                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </div>
                            <div style={{ minWidth: '0' }}>
                              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0B1220', marginBottom: '3px' }}>{job.title}</div>
                              <div style={{ fontSize: '12px', color: '#64748B' }}>
                                {job.company} · {job.location}
                              </div>
                              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>{job.posted}</div>
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              color: '#0F3D2E',
                              background: '#E6F0EB',
                              padding: '4px 9px',
                              borderRadius: '8px',
                              flex: 'none',
                            }}
                          >
                            {job.type}
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  {surveyIncomplete ? (
                    <>
                      <div role="button" tabIndex={0} onKeyDown={onActivate(goJobs)}
                        onClick={goJobs}
                        style={{
                          borderTop: '1px solid #E7E9ED',
                          paddingTop: '12px',
                          fontSize: '12.5px',
                          fontWeight: '700',
                          color: '#0F3D2E',
                          cursor: 'pointer',
                        }}
                      >
                        {dashJobsBrowseLabel}
                      </div>
                    </>
                  ) : null}
                  {surveyComplete ? (
                    <>
                      <div role="button" tabIndex={0} onKeyDown={onActivate(goJobs)}
                        onClick={goJobs}
                        style={{
                          textAlign: 'center',
                          background: '#0F3D2E',
                          color: '#fff',
                          borderRadius: '12px',
                          padding: '13px',
                          fontWeight: '700',
                          fontSize: '13.5px',
                          cursor: 'pointer',
                        }}
                      >
                        {dashJobsBrowseLabel}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
