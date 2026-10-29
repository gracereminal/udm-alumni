import React from 'react';
import { hv, fv } from '../lib/stateStyle';
import NavSidebar from '../components/NavSidebar';
import SearchPill from '../components/topbar/SearchPill';
import NotificationBell from '../components/topbar/NotificationBell';
import UserChip from '../components/topbar/UserChip';
import { onActivate, onBackdrop } from '../lib/a11y';
import JobComposerDialog from '../components/JobComposerDialog';

const jobCard = { background: '#fff', border: '1px solid #E7E9ED', borderRadius: '16px', boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)', minWidth: '0' };
const menuItem = (color) => ({ background: '#fff', border: 'none', borderRadius: '8px', padding: '9px 12px', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '700', textAlign: 'left', cursor: 'pointer', width: '100%', color });

/* View layer for the "AdminPosts" screen — converted from "Alumni Tracer Mockups.dc.html". */
export default function AdminPostsView(v) {
  const {
    addJob,
    adminJobRows,
    adminPostsLabel,
    annCount,
    annEmpty,
    annHasMore,
    annRows,
    annToggle,
    annToggleLabel,
    cfBody,
    cfBusy,
    cfCancel,
    cfCancelLabel,
    cfCancelRef,
    cfDetail,
    cfErr,
    cfHasDetail,
    cfHasErr,
    cfOk,
    cfOkBg,
    cfOkLabel,
    cfOn,
    cfOpacity,
    cfTitle,
    evClearSearch,
    evCreate,
    evEmptyBody,
    evEmptyClear,
    evEmptyCreate,
    evEmptyTitle,
    evFilterOpts,
    evListEmpty,
    evLoading,
    evMenuClose,
    evQ,
    evRows,
    evShowFilter,
    evStatusF,
    evTabs,
    eventFormRef,
    exportHover,
    fd,
    fdClose,
    fdE,
    fdErr,
    fdHasErr,
    fdHasPhoto,
    fdHead,
    fdNoPhoto,
    fdNote,
    fdOn,
    fdPhotoCss,
    fdPhotoFile,
    fdPhotoName,
    fdPhotoRef,
    fdPhotoRemove,
    fdPick,
    fdSubmit,
    fdSubmitLabel,
    inputFocus,
    jobApps,
    jobComposer,
    jobLiveCount,
    jobPendingCount,
    jobQueueRows,
    jq,
    jqApprove,
    jqClose,
    jqOpen,
    jqReject,
    jqStop,
    mdAnn,
    mdAnnNote,
    mdAnnOff,
    mdAnnRemove,
    mdAnnRestore,
    mdAnnShown,
    mdAnnSub,
    mdCanEdit,
    mdCanRestore,
    mdCap,
    mdCapPct,
    mdClose,
    mdCount,
    mdEdit,
    mdExport,
    mdHasCap,
    mdHasMore,
    mdHasPeople,
    mdHost,
    mdMore,
    mdNoPeople,
    mdOn,
    mdPeople,
    mdPhotoCss,
    mdSt,
    mdStats,
    mdTitle,
    mdToggle,
    mdToggleLabel,
    mdVenue,
    mdWhen,
    ntBody,
    ntBusy,
    ntCancelEdit,
    ntClosed,
    ntCursor,
    ntE,
    ntErr,
    ntFormRef,
    ntHasErr,
    ntHead,
    ntKinds,
    ntNew,
    ntOpacity,
    ntOpen,
    ntPrimaryLabel,
    ntSubmit,
    ntTitle,
    onEvQ,
    onEvStatusF,
    onNtBody,
    onNtTitle,
    postsPreviewGo,
    postsSubtitle,
    rowHover,
    tabEvents,
    tabJobs,
    toastBg,
    toastClose,
    toastIcon,
    toastOn,
    toastText,
  } = v;
  return (
    <>
      <div
        data-screen-label={adminPostsLabel}
        style={{
          display: 'flex',
          minHeight: '100vh',
          background:
            'radial-gradient(900px 520px at 0% 0%,#FBF1D3 0%,rgba(251,241,211,0) 70%),radial-gradient(800px 500px at 100% 100%,#F8F1DE 0%,rgba(248,241,222,0) 70%),#F7F6F1',
        }}
      >
        {jqOpen ? (
          <>
            <div role="presentation"
              onClick={jqClose}
              style={{
                position: 'fixed',
                inset: '0',
                zIndex: '80',
                background: 'rgba(11,18,32,.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                boxSizing: 'border-box',
                fontFamily: 'Inter,system-ui,sans-serif',
              }}
            >
              <div role="button" tabIndex={0} onKeyDown={onActivate(jqStop)}
                onClick={jqStop}
                style={{
                  width: '100%',
                  maxWidth: '640px',
                  maxHeight: 'calc(100vh - 48px)',
                  overflowY: 'auto',
                  background: '#fff',
                  borderRadius: '20px',
                  boxShadow: '0 24px 60px rgba(16,24,40,.25)',
                }}
              >
                <div style={{ height: '180px', position: 'relative', background: jq.photoCss, borderRadius: '20px 20px 0 0' }}>
                  {jq.noPhoto ? (
                    <>
                      <div
                        style={{
                          position: 'absolute',
                          inset: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
                          fontSize: '11px',
                          color: '#94A3B8',
                        }}
                      >
                        no company photo submitted
                      </div>
                    </>
                  ) : null}
                  <div role="button" tabIndex={0} onKeyDown={onActivate(jqClose)}
                    onClick={jqClose}
                    title="Close"
                    style={{
                      position: 'absolute',
                      top: '14px',
                      right: '14px',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '18px',
                      color: '#0B1220',
                      boxShadow: '0 2px 8px rgba(16,24,40,.15)',
                    }}
                  >
                    ×
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      left: '18px',
                      top: '16px',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      letterSpacing: '.5px',
                      color: '#7A4B00',
                      background: '#FDF3D0',
                      padding: '5px 10px',
                      borderRadius: '8px',
                    }}
                  >
                    PENDING APPROVAL
                  </div>
                </div>
                <div style={{ padding: '22px 26px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <div
                      style={{
                        fontFamily: 'Inter,sans-serif',
                        fontWeight: '700',
                        fontSize: '22px',
                        letterSpacing: '-.4px',
                        color: '#0B1220',
                        lineHeight: '1.25',
                      }}
                    >
                      {jq.title}
                    </div>
                    <div style={{ fontSize: '13.5px', color: '#64748B', marginTop: '5px' }}>
                      {jq.company} · {jq.location}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,160px),1fr))',
                      gap: '14px',
                      padding: '16px',
                      background: '#F8FAFB',
                      border: '1px solid #EEF0F3',
                      borderRadius: '14px',
                    }}
                  >
                    <div style={{ minWidth: '0' }}>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          letterSpacing: '.4px',
                          textTransform: 'uppercase',
                          color: '#94A3B8',
                          marginBottom: '5px',
                        }}
                      >
                        Employment type
                      </div>
                      <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220', lineHeight: '1.4' }}>{jq.type}</div>
                    </div>
                    <div style={{ minWidth: '0' }}>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          letterSpacing: '.4px',
                          textTransform: 'uppercase',
                          color: '#94A3B8',
                          marginBottom: '5px',
                        }}
                      >
                        Salary
                      </div>
                      <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220', lineHeight: '1.4' }}>{jq.salary}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>{jq.salaryNote}</div>
                    </div>
                    <div style={{ minWidth: '0' }}>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          letterSpacing: '.4px',
                          textTransform: 'uppercase',
                          color: '#94A3B8',
                          marginBottom: '5px',
                        }}
                      >
                        Apply by
                      </div>
                      <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220', lineHeight: '1.4' }}>{jq.deadline}</div>
                    </div>
                    <div style={{ minWidth: '0' }}>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          letterSpacing: '.4px',
                          textTransform: 'uppercase',
                          color: '#94A3B8',
                          marginBottom: '5px',
                        }}
                      >
                        How to apply
                      </div>
                      <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220', lineHeight: '1.4' }}>{jq.applyVia}</div>
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        letterSpacing: '.4px',
                        textTransform: 'uppercase',
                        color: '#94A3B8',
                        marginBottom: '5px',
                      }}
                    >
                      Description
                    </div>
                    <div style={{ fontSize: '13.5px', lineHeight: '1.65', color: '#334155', textWrap: 'pretty' }}>{jq.desc}</div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        letterSpacing: '.4px',
                        textTransform: 'uppercase',
                        color: '#94A3B8',
                        marginBottom: '5px',
                      }}
                    >
                      Skills / tags
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                      {(jq.tags || []).map((tg, _i) => (
                        <React.Fragment key={_i}>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#0F3D2E',
                              background: '#E6F0EB',
                              padding: '5px 11px',
                              borderRadius: '99px',
                            }}
                          >
                            {tg}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      border: '1px solid #EEF0F3',
                      borderRadius: '14px',
                    }}
                  >
                    <div
                      style={{
                        flex: 'none',
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: '#0F3D2E',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                      }}
                    >
                      {jq.initials}
                    </div>
                    <div style={{ minWidth: '0', flex: '1' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0B1220' }}>Submitted by {jq.by}</div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                        {jq.batch} · {jq.email} · {jq.when}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '10px',
                      flexWrap: 'wrap',
                      paddingTop: '16px',
                      borderTop: '1px solid #E7E9ED',
                    }}
                  >
                    <button
                      type="button"
                      onClick={jqClose}
                      style={{
                        marginRight: 'auto',
                        background: 'none',
                        border: 'none',
                        fontFamily: 'inherit',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#64748B',
                        cursor: 'pointer',
                        padding: '10px 4px',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={jqReject}
                      style={{
                        background: '#fff',
                        color: '#9F1239',
                        fontFamily: 'inherit',
                        fontWeight: '700',
                        fontSize: '13.5px',
                        padding: '12px 20px',
                        minHeight: '44px',
                        border: '1px solid #E2E5EA',
                        borderRadius: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={jqApprove}
                      style={{
                        background: '#0F3D2E',
                        color: '#fff',
                        fontFamily: 'inherit',
                        fontWeight: '700',
                        fontSize: '13.5px',
                        padding: '12px 22px',
                        minHeight: '44px',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      Approve & publish
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
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
              {tabJobs ? (
                <>
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
                  <div style={{ fontSize: '11px', color: 'rgba(0,0,0,.45)', fontWeight: '600', letterSpacing: '.3px' }}>UDM ALUMNI · JOBS</div>
                </>
              ) : null}
              {tabEvents ? (
                <>
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
                    Events
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(0,0,0,.45)', fontWeight: '600', letterSpacing: '.3px' }}>UDM ALUMNI · EVENTS</div>
                </>
              ) : null}
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
                {tabJobs ? (
                  <>
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
                      Job Management
                    </div>
                  </>
                ) : null}
                {tabEvents ? (
                  <>
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
                      Events
                    </div>
                  </>
                ) : null}
                {tabJobs ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#64748B' }}>
                      <span style={{ width: '13px', height: '13px', borderRadius: '50%', border: '1.5px solid #A7B0BC', flex: 'none' }} />
                      <span>{postsSubtitle}</span>
                    </div>
                  </>
                ) : null}
                {tabEvents ? (
                  <>
                    <div style={{ fontSize: '14px', color: '#64748B', marginTop: '6px' }}>Create and manage alumni events</div>
                  </>
                ) : null}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {tabJobs ? (
                  <>
                    <div role="button" tabIndex={0} onKeyDown={onActivate(postsPreviewGo)}
                      onClick={postsPreviewGo}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#fff',
                        border: '1px solid #E2E5EA',
                        borderRadius: '12px',
                        padding: '11px 16px',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#0B1220',
                        cursor: 'pointer',
                      }}
                      {...hv(rowHover)}
                    >
                      <span>Preview job board</span>
                      <span style={{ fontSize: '12px' }}>→</span>
                    </div>
                    <div role="button" tabIndex={0} onKeyDown={onActivate(addJob)}
                      onClick={addJob}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#0F3D2E',
                        color: '#fff',
                        borderRadius: '12px',
                        padding: '12px 18px',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                      {...hv(exportHover)}
                    >
                      <span style={{ fontSize: '15px', lineHeight: '1' }}>+</span>
                      <span>Add Job</span>
                    </div>
                  </>
                ) : null}
                {tabEvents ? (
                  <>
                    <button
                      type="button"
                      onClick={evCreate}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: '#fff',
                        fontFamily: 'inherit',
                        fontWeight: '700',
                        fontSize: '13.5px',
                        padding: '0 20px',
                        minHeight: '46px',
                        border: 'none',
                        borderRadius: '12px',
                        background: '#0F3D2E',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      {...hv({ background: '#0B3125' })}
                    >
                      <span style={{ fontSize: '17px', lineHeight: '1' }}>+</span>
                      <span>Create event</span>
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            {tabJobs ? (
              <>
                {jobComposer ? <JobComposerDialog {...jobComposer} /> : null}
                {jobApps ? (
                  <div onClick={onBackdrop(jobApps.onClose)} role="presentation"
                    style={{ position: 'fixed', inset: '0', zIndex: '80', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', boxSizing: 'border-box', background: 'rgba(11,18,32,.45)' }}
                  >
                    <div role="dialog" aria-modal="true" aria-label="Applicants"
                      style={{ position: 'relative', width: '100%', maxWidth: '520px', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', background: '#fff', borderRadius: '20px', boxShadow: '0 24px 60px rgba(16,24,40,.25)', padding: '24px 26px', boxSizing: 'border-box' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>{jobApps.label}</div>
                          <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '3px' }}>{jobApps.title}</div>
                        </div>
                        <button type="button" aria-label="Close" onClick={jobApps.onClose}
                          style={{ width: '34px', height: '34px', flex: 'none', border: 'none', borderRadius: '50%', background: '#F1F3F5', color: '#0B1220', fontSize: '18px', lineHeight: '1', cursor: 'pointer' }}
                          {...hv({ background: '#E2E5EA' })}
                        >
                          ×
                        </button>
                      </div>
                      <div style={{ padding: '4px 14px', background: '#F7F8FA', border: '1px solid #E7E9ED', borderRadius: '12px' }}>
                        {jobApps.rows.map((r) => (
                          <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 0', fontSize: '13px', borderBottom: '1px solid #EEF0F3' }}>
                            <span style={{ color: '#64748B' }}>{r.label}</span>
                            <span style={{ fontWeight: '700', color: '#0B1220' }}>{r.value}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.5', marginTop: '12px' }}>{jobApps.note}</div>
                    </div>
                  </div>
                ) : null}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', gap: '18px', minWidth: '0', alignItems: 'start' }}>
                  <div style={{ ...jobCard, padding: '22px 0 8px' }}>
                    <div style={{ padding: '0 24px 16px' }}>
                      <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>Alumni submissions</div>
                      <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Awaiting approval before they appear on the board</div>
                    </div>
                    <div style={{ margin: '0 24px 16px', display: 'flex', alignItems: 'center', gap: '14px', background: '#FBF0D8', borderRadius: '14px', padding: '14px 18px' }}>
                      <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: '32px', lineHeight: '1', letterSpacing: '-1px', color: '#6B4E00' }}>{jobPendingCount}</div>
                      <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#6B4E00' }}>Alumni jobs pending</div>
                    </div>
                    {(jobQueueRows || []).map((q, _i) => (
                      <React.Fragment key={_i}>
                        <div role="button" tabIndex={0} onKeyDown={onActivate(q.open)} onClick={q.open}
                          style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 24px', borderTop: '1px solid #F2F4F5', cursor: 'pointer' }}
                          {...hv(rowHover)}
                        >
                          <div style={{ flex: 'none', width: '64px', height: '52px', borderRadius: '12px', overflow: 'hidden', position: 'relative', background: q.photoCss, border: '1px solid #E7E9ED' }}>
                            {q.noPhoto ? (
                              <div style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: '8px', color: '#94A3B8' }}>
                                no photo
                              </div>
                            ) : null}
                          </div>
                          <div style={{ minWidth: '0', flex: '1' }}>
                            <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0B1220', lineHeight: '1.35' }}>{q.title}</div>
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.meta}</div>
                          </div>
                          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button type="button" onClick={q.open}
                              style={{ background: '#0F3D2E', color: '#fff', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700', padding: '8px 14px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                            >
                              Review
                            </button>
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  <div style={{ ...jobCard, padding: '22px 0 8px' }}>
                    <div style={{ padding: '0 24px 16px' }}>
                      <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>Live job postings</div>
                      <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Visible to all alumni on the Job Board</div>
                    </div>
                    <div style={{ margin: '0 24px 16px', display: 'flex', alignItems: 'center', gap: '14px', background: '#E1F3EA', borderRadius: '14px', padding: '14px 18px' }}>
                      <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: '32px', lineHeight: '1', letterSpacing: '-1px', color: '#0F6B4F' }}>{jobLiveCount}</div>
                      <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0F6B4F' }}>Jobs live</div>
                    </div>
                    {(adminJobRows || []).map((jr) => (
                      <div key={jr.key} style={{ padding: '14px 24px', borderTop: '1px solid #F2F4F5' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ minWidth: '0', flex: '1', opacity: jr.dim }}>
                            <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0B1220', lineHeight: '1.35' }}>{jr.title}</div>
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{jr.meta}</div>
                          </div>
                          <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                            <div style={{ fontSize: '11.5px', fontWeight: '700', color: jr.sourceColor, background: jr.sourceBg, padding: '5px 11px', borderRadius: '99px', whiteSpace: 'nowrap', opacity: jr.dim }}>{jr.source}</div>
                            <div style={{ position: 'relative', display: 'flex' }}>
                              <button type="button" aria-haspopup="menu" aria-expanded={jr.menuOpen} aria-label={`Review ${jr.title}`} onClick={jr.onMenu}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0F3D2E', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 13px', fontFamily: 'inherit', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                {...hv({ background: '#0B3125' })}
                              >
                                Review <span aria-hidden="true" style={{ fontSize: '9px' }}>▾</span>
                              </button>
                              {jr.menuOpen ? (
                                <>
                                  <div onClick={jr.onMenu} role="presentation" style={{ position: 'fixed', inset: '0', zIndex: '40' }} />
                                  <div role="menu" aria-label={`Actions for ${jr.title}`}
                                    style={{ position: 'absolute', right: '0', top: '36px', zIndex: '41', minWidth: '210px', background: '#fff', border: '1px solid #E7E9ED', borderRadius: '12px', boxShadow: '0 12px 32px rgba(16,24,40,.16)', padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}
                                  >
                                    <button type="button" role="menuitem" onClick={jr.onEdit} style={menuItem('#0B1220')} {...hv({ background: '#F3F6F4' })}>Edit listing</button>
                                    <button type="button" role="menuitem" onClick={jr.onApps} style={menuItem('#0B1220')} {...hv({ background: '#F3F6F4' })}>View {jr.appLabel}</button>
                                    <div style={{ height: '1px', background: '#EEF0F3', margin: '2px 0' }} />
                                    <button type="button" role="menuitem" onClick={jr.onToggle} style={menuItem(jr.toggleColor)} {...hv({ background: '#F8F8F8' })}>{jr.toggleLabel}</button>
                                    <button type="button" role="menuitem" onClick={jr.onDelete} style={menuItem('#B3213C')} {...hv({ background: '#FEF0F2' })}>Delete listing</button>
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
            {tabEvents ? (
              <>
                <div data-m="ev-admin-layout" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' }}>
                  <div data-m="ev-admin-main" style={{ flex: '20 1 600px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <div
                        role="tablist"
                        aria-label="Events"
                        style={{
                          display: 'flex',
                          padding: '4px',
                          background: '#fff',
                          border: '1px solid #E7E9ED',
                          borderRadius: '12px',
                          gap: '2px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {(evTabs || []).map((t, _i) => (
                          <React.Fragment key={_i}>
                            <button
                              type="button"
                              role="tab"
                              aria-selected={t.sel}
                              onClick={t.onClick}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                minHeight: '38px',
                                padding: '0 14px',
                                border: 'none',
                                borderRadius: '9px',
                                fontFamily: 'inherit',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                background: t.bg,
                                color: t.color,
                              }}
                            >
                              <span>{t.label}</span>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  minWidth: '20px',
                                  padding: '2px 7px',
                                  boxSizing: 'border-box',
                                  borderRadius: '99px',
                                  background: t.countBg,
                                  color: t.countColor,
                                }}
                              >
                                {t.count}
                              </span>
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                      <div
                        style={{
                          flex: '1 1 200px',
                          minWidth: '0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          height: '46px',
                          padding: '0 12px',
                          boxSizing: 'border-box',
                          background: '#fff',
                          border: '1px solid #E2E5EA',
                          borderRadius: '12px',
                          color: '#64748B',
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ width: '16px', height: '16px', flex: 'none' }}
                        >
                          <circle cx="11" cy="11" r="7" />
                          <path d="M20 20l-3.5-3.5" />
                        </svg>
                        <input
                          type="search"
                          aria-label="Search events"
                          placeholder="Search events"
                          value={evQ}
                          onChange={onEvQ}
                          style={{
                            flex: '1',
                            minWidth: '0',
                            border: 'none',
                            outline: 'none',
                            fontFamily: 'inherit',
                            fontSize: '13.5px',
                            color: '#0B1220',
                            background: 'transparent',
                            height: '100%',
                          }}
                        />
                      </div>
                      {evShowFilter ? (
                        <>
                          <select
                            aria-label="Filter by registration"
                            value={evStatusF}
                            onChange={onEvStatusF}
                            style={{
                              height: '46px',
                              padding: '0 14px',
                              borderRadius: '12px',
                              border: '1px solid #E2E5EA',
                              background: '#fff',
                              fontFamily: 'inherit',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#0B1220',
                              cursor: 'pointer',
                              outline: 'none',
                              maxWidth: '100%',
                            }}
                          >
                            {(evFilterOpts || []).map((o, _i) => (
                              <React.Fragment key={_i}>
                                <option value={o.value}>{o.label}</option>
                              </React.Fragment>
                            ))}
                          </select>
                        </>
                      ) : null}
                    </div>
                    <div
                      style={{
                        background: '#fff',
                        border: '1px solid #E7E9ED',
                        borderRadius: '16px',
                        boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                      }}
                    >
                      {evLoading ? (
                        <>
                          <div aria-busy="true" aria-label="Loading events" style={{ marginTop: '-1px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderTop: '1px solid #F2F4F5' }}>
                              <div style={{ flex: 'none', width: '120px', height: '80px', borderRadius: '12px', background: '#EEF1F4' }} />
                              <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                                <div style={{ height: '12px', width: '60%', borderRadius: '6px', background: '#EEF1F4' }} />
                                <div style={{ height: '10px', width: '42%', borderRadius: '6px', background: '#F2F4F6' }} />
                                <div style={{ height: '10px', width: '34%', borderRadius: '6px', background: '#F2F4F6' }} />
                              </div>
                              <div style={{ flex: 'none', width: '96px', height: '40px', borderRadius: '10px', background: '#F2F4F6' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderTop: '1px solid #F2F4F5' }}>
                              <div style={{ flex: 'none', width: '120px', height: '80px', borderRadius: '12px', background: '#EEF1F4' }} />
                              <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                                <div style={{ height: '12px', width: '60%', borderRadius: '6px', background: '#EEF1F4' }} />
                                <div style={{ height: '10px', width: '42%', borderRadius: '6px', background: '#F2F4F6' }} />
                                <div style={{ height: '10px', width: '34%', borderRadius: '6px', background: '#F2F4F6' }} />
                              </div>
                              <div style={{ flex: 'none', width: '96px', height: '40px', borderRadius: '10px', background: '#F2F4F6' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderTop: '1px solid #F2F4F5' }}>
                              <div style={{ flex: 'none', width: '120px', height: '80px', borderRadius: '12px', background: '#EEF1F4' }} />
                              <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                                <div style={{ height: '12px', width: '60%', borderRadius: '6px', background: '#EEF1F4' }} />
                                <div style={{ height: '10px', width: '42%', borderRadius: '6px', background: '#F2F4F6' }} />
                                <div style={{ height: '10px', width: '34%', borderRadius: '6px', background: '#F2F4F6' }} />
                              </div>
                              <div style={{ flex: 'none', width: '96px', height: '40px', borderRadius: '10px', background: '#F2F4F6' }} />
                            </div>
                          </div>
                        </>
                      ) : null}
                      {evListEmpty ? (
                        <>
                          <div
                            style={{
                              padding: '48px 24px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '6px',
                              textAlign: 'center',
                            }}
                          >
                            <div
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: '#EEF4F1',
                                color: '#0F3D2E',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '6px',
                              }}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ width: '20px', height: '20px', flex: 'none' }}
                              >
                                <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
                                <path d="M3.5 10h17M8 3v4M16 3v4" />
                              </svg>
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0B1220' }}>{evEmptyTitle}</div>
                            <div style={{ fontSize: '13px', color: '#64748B', maxWidth: '340px', textWrap: 'pretty' }}>{evEmptyBody}</div>
                            {evEmptyCreate ? (
                              <>
                                <button
                                  type="button"
                                  onClick={evCreate}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    color: '#fff',
                                    fontFamily: 'inherit',
                                    fontWeight: '700',
                                    fontSize: '13.5px',
                                    padding: '0 20px',
                                    minHeight: '44px',
                                    border: 'none',
                                    borderRadius: '10px',
                                    background: '#0F3D2E',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    marginTop: '12px',
                                  }}
                                >
                                  <span style={{ fontSize: '16px', lineHeight: '1' }}>+</span>
                                  <span>Create event</span>
                                </button>
                              </>
                            ) : null}
                            {evEmptyClear ? (
                              <>
                                <button
                                  type="button"
                                  onClick={evClearSearch}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    background: '#fff',
                                    color: '#0B1220',
                                    fontFamily: 'inherit',
                                    fontWeight: '600',
                                    fontSize: '13.5px',
                                    padding: '0 18px',
                                    minHeight: '44px',
                                    border: '1px solid #E2E5EA',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    marginTop: '12px',
                                  }}
                                >
                                  Clear search
                                </button>
                              </>
                            ) : null}
                          </div>
                        </>
                      ) : null}
                      {(evRows || []).map((r, _i) => (
                        <React.Fragment key={_i}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px 18px',
                              flexWrap: 'wrap',
                              padding: '16px',
                              borderTop: `1px solid ${r.divider}`,
                            }}
                          >
                            <div role="presentation"
                              onClick={r.onManage}
                              style={{
                                flex: 'none',
                                width: '120px',
                                height: '80px',
                                borderRadius: '12px',
                                background: r.photoCss,
                                border: '1px solid #E7E9ED',
                                boxSizing: 'border-box',
                                cursor: 'pointer',
                                opacity: r.dim,
                              }}
                            />
                            <div style={{ flex: '1 1 240px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div role="button" tabIndex={0} onKeyDown={onActivate(r.onManage)}
                                onClick={r.onManage}
                                style={{
                                  fontSize: '15px',
                                  fontWeight: '700',
                                  color: '#0B1220',
                                  lineHeight: '1.35',
                                  cursor: 'pointer',
                                  textWrap: 'pretty',
                                }}
                                {...hv({ color: '#0F3D2E', textDecoration: 'underline', textUnderlineOffset: '3px' })}
                              >
                                {r.title}
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px 16px',
                                  flexWrap: 'wrap',
                                  fontSize: '12.5px',
                                  color: '#475569',
                                }}
                              >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0B1220', fontWeight: '600' }}>
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ width: '15px', height: '15px', flex: 'none' }}
                                  >
                                    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
                                    <path d="M3.5 10h17M8 3v4M16 3v4" />
                                  </svg>
                                  <span>{r.date}</span>
                                </span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ width: '15px', height: '15px', flex: 'none' }}
                                  >
                                    <circle cx="12" cy="12" r="8.5" />
                                    <path d="M12 7.5V12l3 2" />
                                  </svg>
                                  <span>{r.time}</span>
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#475569', minWidth: '0' }}>
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ width: '15px', height: '15px', flex: 'none' }}
                                >
                                  <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
                                  <circle cx="12" cy="10" r="2.3" />
                                </svg>
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.venue}</span>
                              </div>
                            </div>
                            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '14px', marginLeft: 'auto' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '7px', minWidth: '140px' }}>
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '11.5px',
                                    fontWeight: '700',
                                    color: r.statusFg,
                                    background: r.statusBg,
                                    padding: '4px 10px',
                                    borderRadius: '99px',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: r.statusDot }} />
                                  <span>{r.status}</span>
                                </div>
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '12.5px',
                                    color: '#475569',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ width: '15px', height: '15px', flex: 'none' }}
                                  >
                                    <circle cx="9" cy="8" r="3.2" />
                                    <path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5" />
                                    <path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2M17.5 14.7c1.9.6 3.1 2.2 3.5 4.8" />
                                  </svg>
                                  <span>
                                    <span style={{ fontWeight: '700', color: '#0B1220' }}>{r.count}</span> {r.countLabel}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={r.onManage}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  color: '#fff',
                                  fontFamily: 'inherit',
                                  fontWeight: '700',
                                  fontSize: '13.5px',
                                  padding: '0 18px',
                                  minHeight: '44px',
                                  border: 'none',
                                  borderRadius: '10px',
                                  background: '#0F3D2E',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Manage
                              </button>
                              <div style={{ position: 'relative', flex: 'none' }}>
                                <button
                                  type="button"
                                  onClick={r.onMenu}
                                  aria-label="More actions"
                                  aria-haspopup="menu"
                                  aria-expanded={r.menuExp}
                                  style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '10px',
                                    border: '1px solid #E2E5EA',
                                    background: r.menuBg,
                                    color: '#0B1220',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    fontSize: '18px',
                                    fontWeight: '700',
                                    lineHeight: '1',
                                    letterSpacing: '1px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  {...hv({ background: '#F6F8F7' })}
                                >
                                  ···
                                </button>
                                {r.menuOpen ? (
                                  <>
                                    <div role="presentation" onClick={evMenuClose} style={{ position: 'fixed', inset: '0', zIndex: '40' }} />
                                    <div
                                      role="menu"
                                      style={{
                                        position: 'absolute',
                                        right: '0',
                                        top: '50px',
                                        zIndex: '41',
                                        minWidth: '220px',
                                        background: '#fff',
                                        border: '1px solid #E7E9ED',
                                        borderRadius: '12px',
                                        boxShadow: '0 12px 32px rgba(16,24,40,.14)',
                                        padding: '6px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                      }}
                                    >
                                      {(r.menu || []).map((mi, _i) => (
                                        <React.Fragment key={_i}>
                                          {mi.sep ? (
                                            <>
                                              <div style={{ height: '1px', background: '#EEF0F3', margin: '5px 4px' }} />
                                            </>
                                          ) : null}
                                          <button
                                            type="button"
                                            role="menuitem"
                                            onClick={mi.onClick}
                                            style={{
                                              width: '100%',
                                              textAlign: 'left',
                                              background: 'none',
                                              border: 'none',
                                              borderRadius: '8px',
                                              padding: '0 12px',
                                              minHeight: '40px',
                                              fontFamily: 'inherit',
                                              fontSize: '13px',
                                              fontWeight: '600',
                                              color: mi.color,
                                              cursor: 'pointer',
                                            }}
                                            {...hv({ background: '#F3F6F4' })}
                                          >
                                            {mi.label}
                                          </button>
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div
                    data-m="ev-admin-side"
                    style={{
                      flex: '9 1 320px',
                      minWidth: 'min(100%,300px)',
                      maxWidth: '100%',
                      position: 'sticky',
                      top: '14px',
                      alignSelf: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        background: '#fff',
                        border: '1px solid #E7E9ED',
                        borderRadius: '16px',
                        boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                        padding: '20px 22px 14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ minWidth: '0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: '16px', color: '#0B1220' }}>
                              Official announcements
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                color: '#0F3D2E',
                                background: '#E6F0EB',
                                padding: '2px 8px',
                                borderRadius: '99px',
                              }}
                            >
                              {annCount}
                            </div>
                          </div>
                          <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px', lineHeight: '1.5', textWrap: 'pretty' }}>
                            Notices, reminders, and official updates for alumni.
                          </div>
                        </div>
                        {ntClosed ? (
                          <>
                            <button
                              type="button"
                              onClick={ntNew}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                background: '#fff',
                                color: '#0B1220',
                                fontFamily: 'inherit',
                                fontWeight: '700',
                                fontSize: '12.5px',
                                padding: '0 12px',
                                minHeight: '38px',
                                border: '1px solid #E2E5EA',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                flex: 'none',
                              }}
                            >
                              <span style={{ fontSize: '15px', lineHeight: '1' }}>+</span>
                              <span>New announcement</span>
                            </button>
                          </>
                        ) : null}
                      </div>
                      {ntOpen ? (
                        <>
                          <form
                            ref={ntFormRef}
                            onSubmit={ntSubmit}
                            style={{
                              margin: '16px 0 4px',
                              padding: '16px',
                              background: '#F7FAF8',
                              border: '1px solid #E3ECE7',
                              borderRadius: '14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '14px',
                            }}
                          >
                            <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0B1220' }}>{ntHead}</div>
                            <div role="group" aria-label="Type" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {(ntKinds || []).map((k, _i) => (
                                <React.Fragment key={_i}>
                                  <button
                                    type="button"
                                    onClick={k.onClick}
                                    aria-pressed={k.pressed}
                                    disabled={ntBusy}
                                    style={{
                                      background: k.bg,
                                      color: k.color,
                                      border: `1px solid ${k.border}`,
                                      borderRadius: '99px',
                                      padding: '0 14px',
                                      minHeight: '36px',
                                      fontFamily: 'inherit',
                                      fontSize: '12.5px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {k.label}
                                  </button>
                                </React.Fragment>
                              ))}
                            </div>
                            <div>
                              <label
                                htmlFor="nt-title"
                                style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#0B1220', marginBottom: '7px' }}
                              >
                                Title
                              </label>
                              <input
                                id="nt-title"
                                type="text"
                                value={ntTitle}
                                onChange={onNtTitle}
                                disabled={ntBusy}
                                aria-invalid={ntE.invalid}
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  borderRadius: '10px',
                                  padding: '10px 13px',
                                  minHeight: '44px',
                                  fontFamily: 'inherit',
                                  fontSize: '13.5px',
                                  color: '#0B1220',
                                  background: '#fff',
                                  outline: 'none',
                                  border: `1px solid ${ntE.border}`,
                                }}
                                {...fv(inputFocus)}
                              />
                              {ntE.has ? (
                                <>
                                  <div style={{ fontSize: '12px', color: '#B42318', marginTop: '6px' }}>{ntE.msg}</div>
                                </>
                              ) : null}
                            </div>
                            <div>
                              <label
                                htmlFor="nt-body"
                                style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#0B1220', marginBottom: '7px' }}
                              >
                                Message
                              </label>
                              <textarea
                                id="nt-body"
                                value={ntBody}
                                onChange={onNtBody}
                                disabled={ntBusy}
                                rows={3}
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  borderRadius: '10px',
                                  padding: '11px 13px',
                                  minHeight: '44px',
                                  fontFamily: 'inherit',
                                  fontSize: '13.5px',
                                  color: '#0B1220',
                                  background: '#fff',
                                  outline: 'none',
                                  lineHeight: '1.6',
                                  resize: 'vertical',
                                  border: '1px solid #E2E5EA',
                                }}
                                {...fv(inputFocus)}
                              />
                            </div>
                            {ntHasErr ? (
                              <>
                                <div
                                  role="alert"
                                  style={{
                                    fontSize: '12.5px',
                                    fontWeight: '600',
                                    color: '#B42318',
                                    background: '#FEF3F2',
                                    border: '1px solid #FECDCA',
                                    borderRadius: '10px',
                                    padding: '9px 12px',
                                  }}
                                >
                                  {ntErr}
                                </div>
                              </>
                            ) : null}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <button
                                type="submit"
                                disabled={ntBusy}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  color: '#fff',
                                  fontFamily: 'inherit',
                                  fontWeight: '700',
                                  fontSize: '13.5px',
                                  padding: '0 20px',
                                  minHeight: '44px',
                                  border: 'none',
                                  borderRadius: '10px',
                                  background: '#0F3D2E',
                                  cursor: ntCursor,
                                  whiteSpace: 'nowrap',
                                  opacity: ntOpacity,
                                }}
                              >
                                {ntPrimaryLabel}
                              </button>
                              <button
                                type="button"
                                onClick={ntCancelEdit}
                                disabled={ntBusy}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  background: '#fff',
                                  color: '#0B1220',
                                  fontFamily: 'inherit',
                                  fontWeight: '600',
                                  fontSize: '13.5px',
                                  padding: '0 18px',
                                  minHeight: '44px',
                                  border: '1px solid #E2E5EA',
                                  borderRadius: '10px',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </>
                      ) : null}
                      <div style={{ marginTop: '12px' }}>
                        {evLoading ? (
                          <>
                            <div aria-busy="true" aria-label="Loading announcements">
                              <div
                                style={{ padding: '14px 0', borderTop: '1px solid #F0F2F4', display: 'flex', flexDirection: 'column', gap: '8px' }}
                              >
                                <div style={{ height: '9px', width: '22%', borderRadius: '6px', background: '#F2F4F6' }} />
                                <div style={{ height: '11px', width: '68%', borderRadius: '6px', background: '#EEF1F4' }} />
                                <div style={{ height: '9px', width: '40%', borderRadius: '6px', background: '#F2F4F6' }} />
                              </div>
                              <div
                                style={{ padding: '14px 0', borderTop: '1px solid #F0F2F4', display: 'flex', flexDirection: 'column', gap: '8px' }}
                              >
                                <div style={{ height: '9px', width: '22%', borderRadius: '6px', background: '#F2F4F6' }} />
                                <div style={{ height: '11px', width: '56%', borderRadius: '6px', background: '#EEF1F4' }} />
                                <div style={{ height: '9px', width: '40%', borderRadius: '6px', background: '#F2F4F6' }} />
                              </div>
                            </div>
                          </>
                        ) : null}
                        {annEmpty ? (
                          <>
                            <div
                              style={{
                                padding: '22px 0 10px',
                                borderTop: '1px solid #F0F2F4',
                                fontSize: '13px',
                                color: '#64748B',
                                textAlign: 'center',
                              }}
                            >
                              No official announcements yet.
                            </div>
                          </>
                        ) : null}
                        {(annRows || []).map((a, _i) => (
                          <React.Fragment key={_i}>
                            <div
                              style={{
                                display: 'flex',
                                gap: '10px',
                                alignItems: 'flex-start',
                                padding: '14px 0',
                                borderTop: '1px solid #F0F2F4',
                                background: a.bg,
                              }}
                            >
                              <div style={{ flex: '1', minWidth: '0' }}>
                                <div
                                  style={{
                                    display: 'inline-block',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    letterSpacing: '.4px',
                                    color: a.kindColor,
                                    background: a.kindBg,
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    marginBottom: '6px',
                                  }}
                                >
                                  {a.kind}
                                </div>
                                <div
                                  style={{
                                    fontSize: '13.5px',
                                    fontWeight: '700',
                                    color: '#0B1220',
                                    lineHeight: '1.4',
                                    textWrap: 'pretty',
                                    textDecoration: a.decor,
                                  }}
                                >
                                  {a.title}
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    flexWrap: 'wrap',
                                    fontSize: '12px',
                                    color: '#64748B',
                                    marginTop: '3px',
                                  }}
                                >
                                  {a.linked ? (
                                    <>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#0F3D2E', fontWeight: '600' }}>
                                        <svg
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="1.8"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          style={{ width: '13px', height: '13px', flex: 'none' }}
                                        >
                                          <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                                          <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
                                        </svg>
                                        <span>Linked event</span>
                                      </span>
                                      <span aria-hidden="true">·</span>
                                      <span style={{ fontWeight: '700', color: a.statusColor }}>{a.statusLabel}</span>
                                    </>
                                  ) : null}
                                  {a.standalone ? (
                                    <>
                                      <span>{a.meta}</span>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                              <div style={{ flex: 'none', display: 'flex', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={a.onEdit}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '0 9px',
                                    minHeight: '36px',
                                    fontFamily: 'inherit',
                                    fontSize: '12.5px',
                                    fontWeight: '700',
                                    color: '#0F3D2E',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={a.onRemove}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '0 9px',
                                    minHeight: '36px',
                                    fontFamily: 'inherit',
                                    fontSize: '12.5px',
                                    fontWeight: '700',
                                    color: '#B42318',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </React.Fragment>
                        ))}
                        {annHasMore ? (
                          <>
                            <div style={{ borderTop: '1px solid #F0F2F4', paddingTop: '12px' }}>
                              <button
                                type="button"
                                onClick={annToggle}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  background: '#F6F8F7',
                                  color: '#0B1220',
                                  fontFamily: 'inherit',
                                  fontWeight: '700',
                                  fontSize: '13px',
                                  padding: '0 18px',
                                  minHeight: '42px',
                                  border: '1px solid #E2E5EA',
                                  borderRadius: '10px',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  width: '100%',
                                  borderColor: '#EEF1EF',
                                }}
                              >
                                {annToggleLabel}
                              </button>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {fdOn ? (
                    <>
                      <div
                        style={{
                          position: 'fixed',
                          inset: '0',
                          zIndex: '70',
                          background: 'rgba(11,18,32,.4)',
                          display: 'flex',
                          justifyContent: 'flex-end',
                          fontFamily: 'Inter,system-ui,sans-serif',
                        }}
                      >
                        <div role="presentation" onClick={fdClose} style={{ position: 'absolute', inset: '0' }} />
                        <form
                          ref={eventFormRef}
                          onSubmit={fdSubmit}
                          aria-busy={fd.busy}
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="fd-h"
                          style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '520px',
                            height: '100%',
                            background: '#fff',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '-24px 0 60px rgba(11,18,32,.18)',
                            margin: '0',
                            boxSizing: 'border-box',
                          }}
                        >
                          <div
                            style={{
                              flex: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              padding: '18px 24px',
                              borderBottom: '1px solid #EEF0F3',
                            }}
                          >
                            <div id="fd-h" style={{ fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: '19px', color: '#0B1220' }}>
                              {fdHead}
                            </div>
                            <button
                              type="button"
                              onClick={fdClose}
                              aria-label="Close"
                              style={{
                                flex: 'none',
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                border: '1px solid #E7E9ED',
                                background: '#fff',
                                color: '#64748B',
                                fontSize: '19px',
                                lineHeight: '1',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                              }}
                            >
                              ×
                            </button>
                          </div>
                          <div
                            style={{
                              flex: '1',
                              minHeight: '0',
                              overflowY: 'auto',
                              padding: '22px 24px 28px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '24px',
                            }}
                          >
                            {fdHasErr ? (
                              <>
                                <div
                                  role="alert"
                                  style={{
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#B42318',
                                    background: '#FEF3F2',
                                    border: '1px solid #FECDCA',
                                    borderRadius: '10px',
                                    padding: '10px 12px',
                                  }}
                                >
                                  {fdErr}
                                </div>
                              </>
                            ) : null}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              <div style={{ minWidth: '0' }}>
                                <label
                                  htmlFor="fd-title-in"
                                  style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#0B1220', marginBottom: '7px' }}
                                >
                                  Event title
                                </label>
                                <input
                                  id="fd-title-in"
                                  type="text"
                                  value={fd.title}
                                  onChange={fd.on_title}
                                  disabled={fd.busy}
                                  aria-invalid={fdE.title.invalid}
                                  style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    borderRadius: '10px',
                                    padding: '10px 13px',
                                    minHeight: '44px',
                                    fontFamily: 'inherit',
                                    fontSize: '13.5px',
                                    color: '#0B1220',
                                    background: '#fff',
                                    outline: 'none',
                                    border: `1px solid ${fdE.title.border}`,
                                  }}
                                  {...fv(inputFocus)}
                                />
                                {fdE.title.has ? (
                                  <>
                                    <div style={{ fontSize: '12px', color: '#B42318', marginTop: '6px' }}>{fdE.title.msg}</div>
                                  </>
                                ) : null}
                              </div>
                              <div style={{ minWidth: '0' }}>
                                <label
                                  htmlFor="fd-host"
                                  style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#0B1220', marginBottom: '7px' }}
                                >
                                  Hosted by
                                </label>
                                <select
                                  id="fd-host"
                                  value={fd.organizer}
                                  onChange={fd.on_organizer}
                                  disabled={fd.busy}
                                  style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    borderRadius: '10px',
                                    padding: '10px 13px',
                                    minHeight: '44px',
                                    fontFamily: 'inherit',
                                    fontSize: '13.5px',
                                    color: '#0B1220',
                                    background: '#fff',
                                    outline: 'none',
                                    border: '1px solid #E2E5EA',
                                    cursor: 'pointer',
                                  }}
                                  {...fv(inputFocus)}
                                >
                                  {(fd.hosts || []).map((ho, _i) => (
                                    <React.Fragment key={_i}>
                                      <option value={ho}>{ho}</option>
                                    </React.Fragment>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))',
                                gap: '16px 14px',
                                paddingTop: '22px',
                                borderTop: '1px solid #F0F2F4',
                              }}
                            >
                              <div style={{ minWidth: '0' }}>
                                <label
                                  htmlFor="fd-date"
                                  style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#0B1220', marginBottom: '7px' }}
                                >
                                  Date
                                </label>
                                <input
                                  id="fd-date"
                                  type="date"
                                  value={fd.dateISO}
                                  onChange={fd.on_dateISO}
                                  disabled={fd.busy}
                                  aria-invalid={fdE.dateISO.invalid}
                                  style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    borderRadius: '10px',
                                    padding: '10px 13px',
                                    minHeight: '44px',
                                    fontFamily: 'inherit',
                                    fontSize: '13.5px',
                                    color: '#0B1220',
                                    background: '#fff',
                                    outline: 'none',
                                    border: `1px solid ${fdE.dateISO.border}`,
                                  }}
                                  {...fv(inputFocus)}
                                />
                                {fdE.dateISO.has ? (
                                  <>
                                    <div style={{ fontSize: '12px', color: '#B42318', marginTop: '6px' }}>{fdE.dateISO.msg}</div>
                                  </>
                                ) : null}
                              </div>
                              <div role="group" aria-labelledby="fd-time-l" style={{ minWidth: '0' }}>
                                <div
                                  id="fd-time-l"
                                  style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#0B1220', marginBottom: '7px' }}
                                >
                                  Time
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <input
                                    type="time"
                                    aria-label="Start time"
                                    value={fd.timeStart}
                                    onChange={fd.on_timeStart}
                                    disabled={fd.busy}
                                    aria-invalid={fdE.start.invalid}
                                    style={{
                                      width: '100%',
                                      boxSizing: 'border-box',
                                      borderRadius: '10px',
                                      padding: '10px',
                                      minHeight: '44px',
                                      fontFamily: 'inherit',
                                      fontSize: '13.5px',
                                      color: '#0B1220',
                                      background: '#fff',
                                      outline: 'none',
                                      flex: '1',
                                      minWidth: '0',
                                      border: `1px solid ${fdE.start.border}`,
                                    }}
                                    {...fv(inputFocus)}
                                  />
                                  <span aria-hidden="true" style={{ fontSize: '13px', color: '#64748B' }}>
                                    –
                                  </span>
                                  <input
                                    type="time"
                                    aria-label="End time"
                                    value={fd.timeEnd}
                                    onChange={fd.on_timeEnd}
                                    disabled={fd.busy}
                                    aria-invalid={fdE.end.invalid}
                                    style={{
                                      width: '100%',
                                      boxSizing: 'border-box',
                                      borderRadius: '10px',
                                      padding: '10px',
                                      minHeight: '44px',
                                      fontFamily: 'inherit',
                                      fontSize: '13.5px',
                                      color: '#0B1220',
                                      background: '#fff',
                                      outline: 'none',
                                      flex: '1',
                                      minWidth: '0',
                                      border: `1px solid ${fdE.end.border}`,
                                    }}
                                    {...fv(inputFocus)}
                                  />
                                </div>
                                {fdE.time.has ? (
                                  <>
                                    <div style={{ fontSize: '12px', color: '#B42318', marginTop: '6px' }}>{fdE.time.msg}</div>
                                  </>
                                ) : null}
                              </div>
                              <div style={{ minWidth: '0', gridColumn: '1 / -1' }}>
                                <label
                                  htmlFor="fd-venue"
                                  style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#0B1220', marginBottom: '7px' }}
                                >
                                  Venue
                                </label>
                                <input
                                  id="fd-venue"
                                  type="text"
                                  value={fd.venue}
                                  onChange={fd.on_venue}
                                  disabled={fd.busy}
                                  aria-invalid={fdE.venue.invalid}
                                  style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    borderRadius: '10px',
                                    padding: '10px 13px',
                                    minHeight: '44px',
                                    fontFamily: 'inherit',
                                    fontSize: '13.5px',
                                    color: '#0B1220',
                                    background: '#fff',
                                    outline: 'none',
                                    border: `1px solid ${fdE.venue.border}`,
                                  }}
                                  {...fv(inputFocus)}
                                />
                                {fdE.venue.has ? (
                                  <>
                                    <div style={{ fontSize: '12px', color: '#B42318', marginTop: '6px' }}>{fdE.venue.msg}</div>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <div style={{ paddingTop: '22px', borderTop: '1px solid #F0F2F4' }}>
                              <label
                                htmlFor="fd-body"
                                style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#0B1220', marginBottom: '7px' }}
                              >
                                Description
                              </label>
                              <textarea
                                id="fd-body"
                                value={fd.body}
                                onChange={fd.on_body}
                                disabled={fd.busy}
                                rows={6}
                                aria-invalid={fdE.body.invalid}
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  borderRadius: '10px',
                                  padding: '11px 13px',
                                  minHeight: '44px',
                                  fontFamily: 'inherit',
                                  fontSize: '13.5px',
                                  color: '#0B1220',
                                  background: '#fff',
                                  outline: 'none',
                                  lineHeight: '1.6',
                                  resize: 'vertical',
                                  border: `1px solid ${fdE.body.border}`,
                                }}
                                {...fv(inputFocus)}
                              />
                              {fdE.body.has ? (
                                <>
                                  <div style={{ fontSize: '12px', color: '#B42318', marginTop: '6px' }}>{fdE.body.msg}</div>
                                </>
                              ) : null}
                            </div>
                            <div style={{ paddingTop: '22px', borderTop: '1px solid #F0F2F4' }}>
                              <div style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#0B1220', marginBottom: '7px' }}>
                                Cover photo
                              </div>
                              <div tabIndex={0} onKeyDown={onActivate(fdPick)}
                                onClick={fdPick}
                                role="button"
                                aria-label="Choose cover photo"
                                style={{
                                  height: '170px',
                                  borderRadius: '12px',
                                  border: '1px solid #E2E5EA',
                                  boxSizing: 'border-box',
                                  background: fdPhotoCss,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {fdNoPhoto ? (
                                  <>
                                    <span
                                      style={{
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        color: '#0F3D2E',
                                        background: '#fff',
                                        padding: '10px 16px',
                                        borderRadius: '10px',
                                        border: '1px solid #E2E5EA',
                                      }}
                                    >
                                      + Add cover photo
                                    </span>
                                  </>
                                ) : null}
                              </div>
                              <input type="file" accept="image/*" ref={fdPhotoRef} onChange={fdPhotoFile} style={{ display: 'none' }} />
                              {fdHasPhoto ? (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginTop: '6px' }}>
                                    <button
                                      type="button"
                                      onClick={fdPick}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: '0 9px',
                                        minHeight: '36px',
                                        fontFamily: 'inherit',
                                        fontSize: '12.5px',
                                        fontWeight: '700',
                                        color: '#0F3D2E',
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                      }}
                                    >
                                      Replace
                                    </button>
                                    <button
                                      type="button"
                                      onClick={fdPhotoRemove}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: '0 9px',
                                        minHeight: '36px',
                                        fontFamily: 'inherit',
                                        fontSize: '12.5px',
                                        fontWeight: '700',
                                        color: '#B42318',
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                      }}
                                    >
                                      Remove
                                    </button>
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        color: '#94A3B8',
                                        minWidth: '0',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {fdPhotoName}
                                    </span>
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </div>
                          <div
                            style={{
                              flex: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              flexWrap: 'wrap',
                              padding: '14px 24px',
                              borderTop: '1px solid #EEF0F3',
                              background: '#FAFBFA',
                            }}
                          >
                            <div
                              style={{
                                flex: '1 1 180px',
                                minWidth: '0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                color: '#64748B',
                              }}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ width: '13px', height: '13px', flex: 'none' }}
                              >
                                <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                                <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
                              </svg>
                              <span>{fdNote}</span>
                            </div>
                            <button
                              type="button"
                              onClick={fdClose}
                              disabled={fd.busy}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                background: '#fff',
                                color: '#0B1220',
                                fontFamily: 'inherit',
                                fontWeight: '600',
                                fontSize: '13.5px',
                                padding: '0 18px',
                                minHeight: '44px',
                                border: '1px solid #E2E5EA',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={fd.busy}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                color: '#fff',
                                fontFamily: 'inherit',
                                fontWeight: '700',
                                fontSize: '13.5px',
                                padding: '0 20px',
                                minHeight: '44px',
                                border: 'none',
                                borderRadius: '10px',
                                background: '#0F3D2E',
                                cursor: fd.cursor,
                                whiteSpace: 'nowrap',
                                opacity: fd.opacity,
                              }}
                            >
                              {fdSubmitLabel}
                            </button>
                          </div>
                        </form>
                      </div>
                    </>
                  ) : null}
                  {mdOn ? (
                    <>
                      <div
                        style={{
                          position: 'fixed',
                          inset: '0',
                          zIndex: '70',
                          background: 'rgba(11,18,32,.4)',
                          display: 'flex',
                          justifyContent: 'flex-end',
                          fontFamily: 'Inter,system-ui,sans-serif',
                        }}
                      >
                        <div role="presentation" onClick={mdClose} style={{ position: 'absolute', inset: '0' }} />
                        <div
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="md-h"
                          style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '520px',
                            height: '100%',
                            background: '#fff',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '-24px 0 60px rgba(11,18,32,.18)',
                            margin: '0',
                            boxSizing: 'border-box',
                          }}
                        >
                          <div
                            style={{
                              flex: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              padding: '18px 24px',
                              borderBottom: '1px solid #EEF0F3',
                            }}
                          >
                            <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '.6px', textTransform: 'uppercase', color: '#64748B' }}>
                              Manage event
                            </div>
                            <button
                              type="button"
                              onClick={mdClose}
                              aria-label="Close"
                              style={{
                                flex: 'none',
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                border: '1px solid #E7E9ED',
                                background: '#fff',
                                color: '#64748B',
                                fontSize: '19px',
                                lineHeight: '1',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                              }}
                            >
                              ×
                            </button>
                          </div>
                          <div
                            style={{
                              flex: '1',
                              minHeight: '0',
                              overflowY: 'auto',
                              padding: '22px 24px 28px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '26px',
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                              <div style={{ height: '150px', borderRadius: '12px', background: mdPhotoCss, border: '1px solid #E7E9ED' }} />
                              <div>
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '11.5px',
                                    fontWeight: '700',
                                    color: mdSt.fg,
                                    background: mdSt.bg,
                                    padding: '4px 10px',
                                    borderRadius: '99px',
                                    whiteSpace: 'nowrap',
                                    marginBottom: '8px',
                                  }}
                                >
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: mdSt.dot }} />
                                  <span>{mdSt.label}</span>
                                </div>
                                <div
                                  id="md-h"
                                  style={{
                                    fontFamily: 'Inter,sans-serif',
                                    fontWeight: '700',
                                    fontSize: '20px',
                                    lineHeight: '1.3',
                                    letterSpacing: '-.3px',
                                    color: '#0B1220',
                                    textWrap: 'pretty',
                                  }}
                                >
                                  {mdTitle}
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    marginTop: '10px',
                                    fontSize: '13px',
                                    color: '#475569',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      style={{ width: '15px', height: '15px', flex: 'none' }}
                                    >
                                      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
                                      <path d="M3.5 10h17M8 3v4M16 3v4" />
                                    </svg>
                                    <span>{mdWhen}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      style={{ width: '15px', height: '15px', flex: 'none' }}
                                    >
                                      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
                                      <circle cx="12" cy="10" r="2.3" />
                                    </svg>
                                    <span>{mdVenue}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      style={{ width: '15px', height: '15px', flex: 'none' }}
                                    >
                                      <circle cx="9" cy="8" r="3.2" />
                                      <path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5" />
                                      <path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2M17.5 14.7c1.9.6 3.1 2.2 3.5 4.8" />
                                    </svg>
                                    <span>{mdHost}</span>
                                  </div>
                                </div>
                              </div>
                              {mdCanEdit ? (
                                <>
                                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button
                                      type="button"
                                      onClick={mdEdit}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        color: '#fff',
                                        fontFamily: 'inherit',
                                        fontWeight: '700',
                                        fontSize: '13.5px',
                                        padding: '0 20px',
                                        minHeight: '44px',
                                        border: 'none',
                                        borderRadius: '10px',
                                        background: '#0F3D2E',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      Edit event
                                    </button>
                                    <button
                                      type="button"
                                      onClick={mdToggle}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        background: '#fff',
                                        color: '#0B1220',
                                        fontFamily: 'inherit',
                                        fontWeight: '600',
                                        fontSize: '13.5px',
                                        padding: '0 18px',
                                        minHeight: '44px',
                                        border: '1px solid #E2E5EA',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {mdToggleLabel}
                                    </button>
                                  </div>
                                </>
                              ) : null}
                            </div>
                            <div style={{ paddingTop: '22px', borderTop: '1px solid #F0F2F4' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                <div>
                                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#0B1220' }}>Registrations</div>
                                  <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>{mdCount}</div>
                                </div>
                                {mdHasPeople ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={mdExport}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        background: '#fff',
                                        color: '#0B1220',
                                        fontFamily: 'inherit',
                                        fontWeight: '700',
                                        fontSize: '12.5px',
                                        padding: '0 14px',
                                        minHeight: '38px',
                                        border: '1px solid #E2E5EA',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      Export list
                                    </button>
                                  </>
                                ) : null}
                              </div>
                              {mdHasCap ? (
                                <>
                                  <div style={{ marginTop: '12px' }}>
                                    <div style={{ height: '6px', borderRadius: '99px', background: '#E7EDEA', overflow: 'hidden' }}>
                                      <div style={{ height: '100%', borderRadius: '99px', background: '#0F8A5F', width: mdCapPct }} />
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px' }}>{mdCap}</div>
                                  </div>
                                </>
                              ) : null}
                              <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                                {(mdStats || []).map((x, _i) => (
                                  <React.Fragment key={_i}>
                                    <div
                                      style={{
                                        flex: '1 1 90px',
                                        minWidth: '0',
                                        background: '#F8FAFB',
                                        border: '1px solid #EDF0F3',
                                        borderRadius: '12px',
                                        padding: '12px 14px',
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontFamily: 'Inter,sans-serif',
                                          fontWeight: '700',
                                          fontSize: '20px',
                                          color: x.color,
                                          lineHeight: '1',
                                        }}
                                      >
                                        {x.value}
                                      </div>
                                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', marginTop: '5px' }}>{x.label}</div>
                                    </div>
                                  </React.Fragment>
                                ))}
                              </div>
                              <div style={{ marginTop: '8px' }}>
                                {(mdPeople || []).map((p, _i) => (
                                  <React.Fragment key={_i}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '11px 0',
                                        borderBottom: '1px solid #F2F4F5',
                                      }}
                                    >
                                      <div
                                        style={{
                                          flex: 'none',
                                          width: '34px',
                                          height: '34px',
                                          borderRadius: '50%',
                                          background: '#0F3D2E',
                                          color: '#fff',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '11.5px',
                                          fontWeight: '700',
                                        }}
                                      >
                                        {p.initials}
                                      </div>
                                      <div style={{ minWidth: '0', flex: '1' }}>
                                        <div
                                          style={{
                                            fontSize: '13.5px',
                                            fontWeight: '700',
                                            color: '#0B1220',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                          }}
                                        >
                                          {p.name}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: '12px',
                                            color: '#64748B',
                                            marginTop: '2px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                          }}
                                        >
                                          {p.meta}
                                        </div>
                                      </div>
                                      <div
                                        style={{
                                          flex: 'none',
                                          fontSize: '11.5px',
                                          fontWeight: '700',
                                          color: p.fg,
                                          background: p.bg,
                                          padding: '4px 10px',
                                          borderRadius: '99px',
                                        }}
                                      >
                                        {p.reply}
                                      </div>
                                    </div>
                                  </React.Fragment>
                                ))}
                                {mdNoPeople ? (
                                  <>
                                    <div style={{ padding: '16px 0', fontSize: '13px', color: '#64748B' }}>No responses yet.</div>
                                  </>
                                ) : null}
                                {mdHasMore ? (
                                  <>
                                    <div style={{ paddingTop: '10px', fontSize: '12px', color: '#64748B' }}>{mdMore}</div>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <div style={{ paddingTop: '22px', borderTop: '1px solid #F0F2F4' }}>
                              <div style={{ fontSize: '15px', fontWeight: '700', color: '#0B1220', marginBottom: '12px' }}>
                                Dashboard announcement
                              </div>
                              {mdAnnShown ? (
                                <>
                                  <div style={{ background: '#F7FAF8', border: '1px solid #E3ECE7', borderRadius: '14px', padding: '14px 16px' }}>
                                    <div
                                      style={{
                                        display: 'inline-block',
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        letterSpacing: '.4px',
                                        color: '#0F3D2E',
                                        background: '#E6F0EB',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        marginBottom: '6px',
                                      }}
                                    >
                                      EVENT
                                    </div>
                                    <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0B1220', textDecoration: mdAnn.titleDecor }}>
                                      {mdAnn.title}
                                    </div>
                                    <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.5', marginTop: '4px', textWrap: 'pretty' }}>
                                      {mdAnn.body}
                                    </div>
                                  </div>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '10px',
                                      flexWrap: 'wrap',
                                      marginTop: '8px',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
                                      <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        style={{ width: '13px', height: '13px', flex: 'none' }}
                                      >
                                        <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                                        <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
                                      </svg>
                                      <span>{mdAnnSub}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={mdAnnRemove}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: '0 9px',
                                        minHeight: '36px',
                                        fontFamily: 'inherit',
                                        fontSize: '12.5px',
                                        fontWeight: '700',
                                        color: '#B42318',
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                      }}
                                    >
                                      Remove from Dashboard
                                    </button>
                                  </div>
                                </>
                              ) : null}
                              {mdAnnOff ? (
                                <>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '10px',
                                      flexWrap: 'wrap',
                                      background: '#F6F8F7',
                                      border: '1px solid #E7E9ED',
                                      borderRadius: '12px',
                                      padding: '10px 14px',
                                    }}
                                  >
                                    <div style={{ fontSize: '12.5px', color: '#475569' }}>{mdAnnNote}</div>
                                    {mdCanRestore ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={mdAnnRestore}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: '0 9px',
                                            minHeight: '36px',
                                            fontFamily: 'inherit',
                                            fontSize: '12.5px',
                                            fontWeight: '700',
                                            color: '#0F3D2E',
                                            cursor: 'pointer',
                                            borderRadius: '8px',
                                          }}
                                        >
                                          Show on Dashboard
                                        </button>
                                      </>
                                    ) : null}
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </>
            ) : null}
            <div
              aria-live="polite"
              style={{
                position: 'fixed',
                left: '50%',
                bottom: '24px',
                transform: 'translateX(-50%)',
                zIndex: '90',
                pointerEvents: 'none',
                width: 'max-content',
                maxWidth: 'calc(100vw - 32px)',
              }}
            >
              {toastOn ? (
                <>
                  <div
                    role="status"
                    style={{
                      pointerEvents: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: toastBg,
                      color: '#fff',
                      padding: '10px 10px 10px 16px',
                      borderRadius: '12px',
                      boxShadow: '0 12px 32px rgba(11,18,32,.25)',
                      fontFamily: 'Inter,system-ui,sans-serif',
                      fontSize: '13.5px',
                      fontWeight: '600',
                    }}
                  >
                    <span
                      style={{
                        flex: 'none',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                      }}
                    >
                      {toastIcon}
                    </span>
                    <span style={{ textWrap: 'pretty' }}>{toastText}</span>
                    <button
                      type="button"
                      onClick={toastClose}
                      aria-label="Dismiss"
                      style={{
                        flex: 'none',
                        width: '32px',
                        height: '32px',
                        border: 'none',
                        background: 'none',
                        color: '#fff',
                        fontSize: '17px',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        fontFamily: 'inherit',
                      }}
                    >
                      ×
                    </button>
                  </div>
                </>
              ) : null}
            </div>
            {cfOn ? (
              <>
                <div role="presentation"
                  onClick={onBackdrop(cfCancel)}
                  style={{
                    position: 'fixed',
                    inset: '0',
                    zIndex: '95',
                    background: 'rgba(11,18,32,.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    fontFamily: 'Inter,system-ui,sans-serif',
                  }}
                >
                  <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="cf-title"
                    aria-describedby="cf-body"
                    style={{
                      width: '100%',
                      maxWidth: '420px',
                      background: '#fff',
                      borderRadius: '16px',
                      boxShadow: '0 24px 60px rgba(11,18,32,.3)',
                      padding: '22px 24px',
                    }}
                  >
                    <div id="cf-title" style={{ fontWeight: '700', fontSize: '17px', color: '#0B1220' }}>
                      {cfTitle}
                    </div>
                    <div
                      id="cf-body"
                      style={{ fontSize: '13.5px', lineHeight: '1.55', color: '#475569', marginTop: '6px', textWrap: 'pretty' }}
                    >
                      {cfBody}
                    </div>
                    {cfHasDetail ? (
                      <>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            color: '#0B1220',
                            background: '#F6F8F7',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            marginTop: '12px',
                          }}
                        >
                          {cfDetail}
                        </div>
                      </>
                    ) : null}
                    <div aria-live="assertive">
                      {cfHasErr ? (
                        <>
                          <div
                            role="alert"
                            style={{
                              fontSize: '12.5px',
                              fontWeight: '600',
                              color: '#B42318',
                              background: '#FEF3F2',
                              border: '1px solid #FECDCA',
                              borderRadius: '10px',
                              padding: '9px 12px',
                              marginTop: '12px',
                            }}
                          >
                            {cfErr}
                          </div>
                        </>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        ref={cfCancelRef}
                        onClick={cfCancel}
                        disabled={cfBusy}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          background: '#fff',
                          color: '#0B1220',
                          fontFamily: 'inherit',
                          fontWeight: '600',
                          fontSize: '13.5px',
                          padding: '0 18px',
                          minHeight: '44px',
                          border: '1px solid #E2E5EA',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cfCancelLabel}
                      </button>
                      <button
                        type="button"
                        onClick={cfOk}
                        disabled={cfBusy}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          color: '#fff',
                          fontFamily: 'inherit',
                          fontWeight: '700',
                          fontSize: '13.5px',
                          padding: '0 20px',
                          minHeight: '44px',
                          border: 'none',
                          borderRadius: '10px',
                          background: cfOkBg,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          opacity: cfOpacity,
                        }}
                      >
                        {cfOkLabel}
                      </button>
                    </div>
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

