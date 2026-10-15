import React from 'react';
import { hv, fv } from '../lib/stateStyle';
import NavSidebar from '../components/NavSidebar';
import SearchPill from '../components/topbar/SearchPill';
import NotificationBell from '../components/topbar/NotificationBell';
import UserChip from '../components/topbar/UserChip';
import { onActivate, onBackdrop } from '../lib/a11y';

const CHEVRON = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5 6 8l3.5-3.5' fill='none' stroke='%2364748B' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
const SEL = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#0F172A',
  appearance: 'none',
  WebkitAppearance: 'none',
  minHeight: '44px',
  padding: '0 40px 0 14px',
  borderRadius: '10px',
  border: '1px solid #D5DBE3',
  backgroundColor: '#fff',
  backgroundImage: CHEVRON,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  backgroundSize: '12px 12px',
  fontFamily: 'inherit',
  lineHeight: '1.3',
  textOverflow: 'ellipsis',
  cursor: 'pointer',
  outline: 'none',
  boxShadow: '0 1px 2px rgba(16,24,40,.04)',
  transition: 'border-color .15s, box-shadow .15s',
};
const FORM_SEL = { ...SEL, width: '100%', boxSizing: 'border-box', fontWeight: '400', color: '#0B1220' };
const SEL_HOVER = { borderColor: '#9AA6B5' };
const SEL_FOCUS = { borderColor: '#0F3D2E', boxShadow: '0 0 0 3px rgba(15,61,46,.15)' };

/* View layer for the "Records" screen — converted from "Alumni Tracer Mockups.dc.html". */
export default function RecordsView(v) {
  const {
    exportHover,
    filterHover,
    goReports,
    recActBatches,
    recActBody,
    recActCancel,
    recActClose,
    recActDesc,
    recActDocs,
    recActDue,
    recActDupList,
    recActHasPrimary,
    recActIsDup,
    recActIsEmail,
    recActIsHistory,
    recActIsProof,
    recActIsReassign,
    recActLog,
    recActNote,
    recActOn,
    recActPrimary,
    recActPrimaryBg,
    recActPrimaryCursor,
    recActPrimaryOp,
    recActCourse,
    recActCourseOpts,
    recActSetCourse,
    recActReason,
    recActReasonLabel,
    recActReasonPh,
    recActSetBody,
    recActSetNote,
    recActSetReason,
    recActSetSubject,
    recActShowReason,
    recActSubject,
    recActSubmit,
    recActTitle,
    recActTo,
    recActWho,
    recAllBg,
    recAllBorder,
    recAllMark,
    recAudit,
    recBatchOpts,
    recBatchSel,
    recBulkDelete,
    recBulkExport,
    recBulkFlag,
    recBulkVerify,
    recClearQuery,
    recClearSel,
    recCountLabel,
    recCreate,
    recDangerHover,
    recDelBtn,
    recDelClose,
    recDelConfirm,
    recDelHasMore,
    recDelList,
    recDelMore,
    recDelOn,
    recDelTitle,
    recDotsFocus,
    recDotsHover,
    recDrawerApprove,
    recDrawerCanApprove,
    recDrawerClose,
    recDrawerDelete,
    recDrawerEdit,
    recDrawerFacts,
    recDrawerFlag,
    recDrawerFlagAction,
    recDrawerHasFlag,
    recDrawerInitials,
    recDrawerName,
    recDrawerNote,
    recDrawerOpen,
    recDrawerProof,
    recDrawerSetNote,
    recDrawerSid,
    recDrawerStatusBg,
    recDrawerStatusColor,
    recDrawerStatusLabel,
    recDrawerStatusNote,
    recEmpOpts,
    recEmpSel,
    recEmpty,
    recFBatch,
    recFBatchOpts,
    recFCoBg,
    recFCoDisabled,
    recFCoLabel,
    recFCoPh,
    recFCompany,
    recFCompanyBorder,
    recFEmail,
    recFEmailBorder,
    recFEmp,
    recFEmpOpts,
    recFErrCompany,
    recFErrEmail,
    recFErrName,
    recFHasErrCompany,
    recFHasErrEmail,
    recFHasErrName,
    recFName,
    recFNameBorder,
    recFNote,
    recFProgOpts,
    recFProgram,
    recFSetBatch,
    recFSetCompany,
    recFSetEmail,
    recFSetEmp,
    recFSetName,
    recFSetNote,
    recFSetProgram,
    recFSetSource,
    recFSource,
    recFSourceOpts,
    recFStatusChips,
    recFormClose,
    recFormDesc,
    recFormOn,
    recFormSave,
    recFormSid,
    recFormSidNote,
    recFormSubmit,
    recFormTitle,
    recHasQuery,
    recHasSel,
    recIsDept,
    recCanEdit,
    recGridCols,
    recIsQueue,
    recImport,
    recNext,
    recNextBg,
    recNextColor,
    recNextCursor,
    recNextDisabled,
    recNextOpacity,
    recNoSel,
    recPageSizeVal,
    recPages,
    recPrev,
    recPrevBg,
    recPrevColor,
    recPrevCursor,
    recPrevDisabled,
    recPrevOpacity,
    recProgOpts,
    recProgSel,
    recQuery,
    recResetFilters,
    recResultLabel,
    recRowsView,
    recSelLabel,
    recSetBatchSel,
    recSetEmpSel,
    recSetPageSize,
    recSetProgSel,
    recSetQuery,
    recSetSort,
    recSortOpts,
    recSortVal,
    recStats,
    recTabs,
    recToggleAll,
    rowHover,
  } = v;
  return (
    <>
      <div
        data-screen-label="Manage Records"
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
              {recIsQueue ? (
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
                    Alumni Records
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(0,0,0,.45)', fontWeight: '600', letterSpacing: '.3px' }}>UDM ALUMNI · RECORDS</div>
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
                {recIsQueue ? (
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
                      Alumni Records
                    </div>
                    {recCanEdit ? (
                      <div style={{ fontSize: '13.5px', color: '#64748B', marginTop: '7px' }}>
                        Search, review, verify and manage every alumni record — submissions, verified profiles and career data in one place.
                      </div>
                    ) : null}
                    {recIsDept ? (
                      <div style={{ fontSize: '13.5px', color: '#64748B', marginTop: '7px' }}>
                        Browse alumni records for your college. Records are managed by the Alumni Relations Office.
                      </div>
                    ) : null}
                  </>
                ) : null}
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>
                  Employment data is self-reported by alumni and synced from their profiles.
                </div>
                {recIsDept ? (
                  <>
                    <div
                      title="Records scoped to your assigned college"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '10px',
                        width: 'fit-content',
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
                      <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0B3A2B' }}>
                        College of Computing Studies · BSIT, BSCS records only
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
              {recCanEdit ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={recImport}
                  onKeyDown={(e) => { if (e.key === 'Enter') recImport(); }}
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
                  Import alumni master list (CSV)
                </div>
                <div role="button" tabIndex={0} onKeyDown={onActivate(goReports)}
                  onClick={goReports}
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
                  Open reports
                </div>
                <div tabIndex={0} onKeyDown={onActivate(recCreate)}
                  onClick={recCreate}
                  role="button"
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
                  <span style={{ fontSize: '14px' }}>+</span>
                  <span>Add alumni record</span>
                </div>
              </div>
              ) : null}
              {recIsDept ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: '1px solid #E2E5EA',
                    background: '#fff',
                    borderRadius: '999px',
                    padding: '8px 14px',
                    fontSize: '12.5px',
                    fontWeight: '600',
                    color: '#475569',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px' }}>
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>View-only access</span>
                </div>
              ) : null}
            </div>
            {recIsQueue ? (
              <>
                <div data-m="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: '14px' }}>
                  {(recStats || []).map((m, _i) => (
                    <React.Fragment key={_i}>
                      <div
                        style={{
                          background: '#fff',
                          border: '1px solid #E7E9ED',
                          borderRadius: '16px',
                          boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                          padding: '18px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '9px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '0' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '10px',
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
                                style={{ width: '16px', height: '16px' }}
                              >
                                <path d={m.icon} />
                              </svg>
                            </div>
                            <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220', lineHeight: '1.35' }}>{m.label}</div>
                          </div>
                        </div>
                        <div
                          data-m="kpi-val"
                          style={{
                            fontFamily: 'Inter,sans-serif',
                            fontWeight: '700',
                            fontSize: '32px',
                            lineHeight: '1.05',
                            letterSpacing: '-1px',
                            color: '#0B1220',
                          }}
                        >
                          {m.value}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748B' }}>{m.sub}</div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            alignSelf: 'flex-start',
                            borderRadius: '999px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: '600',
                            marginTop: '2px',
                            background: m.pillBg,
                            color: m.pillColor,
                          }}
                        >
                          {m.hasDot ? (
                            <>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: m.pillColor, flex: 'none' }} />
                            </>
                          ) : null}
                          <span>{m.pill}</span>
                        </div>
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
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      flexWrap: 'wrap',
                      padding: '18px 24px 14px',
                    }}
                  >
                    <div style={{ minWidth: '0' }}>
                      <div style={{ fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>Records</div>
                      <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '3px' }}>{recResultLabel}</div>
                    </div>
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
                        flexWrap: 'wrap',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      {(recTabs || []).map((t, _i) => (
                        <React.Fragment key={_i}>
                          <div role="button" tabIndex={0} onKeyDown={onActivate(t.onClick)}
                            onClick={t.onClick}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              background: t.bg,
                              color: t.color,
                              borderRadius: '999px',
                              padding: '7px 13px',
                              fontSize: '12.5px',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            <span>{t.label}</span>
                            <span
                              style={{
                                background: t.countBg,
                                color: t.countColor,
                                borderRadius: '8px',
                                padding: '1px 7px',
                                fontSize: '11px',
                                fontWeight: '700',
                              }}
                            >
                              {t.count}
                            </span>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  {recNoSel ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '0 24px 16px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '9px',
                            flex: '1 1 280px',
                            minWidth: '0',
                            border: '1px solid #E2E5EA',
                            borderRadius: '10px',
                            padding: '0 6px 0 12px',
                            background: '#fff',
                            height: '40px',
                            boxSizing: 'border-box',
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            style={{ width: '16px', height: '16px', color: '#94A3B8', flex: 'none' }}
                          >
                            <circle cx="11" cy="11" r="7" />
                            <path d="M20 20l-3.5-3.5" />
                          </svg>
                          <input
                            value={recQuery}
                            onInput={recSetQuery}
                            placeholder="Search by name, Membership ID or employer"
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
                          {recHasQuery ? (
                            <>
                              <div tabIndex={0} onKeyDown={onActivate(recClearQuery)}
                                onClick={recClearQuery}
                                role="button"
                                aria-label="Clear search"
                                style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '7px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#64748B',
                                  cursor: 'pointer',
                                  fontSize: '15px',
                                }}
                                {...hv({ background: '#F1F3F5' })}
                              >
                                ×
                              </div>
                            </>
                          ) : null}
                        </div>
                        <select
                          value={recProgSel}
                          onChange={recSetProgSel}
                          aria-label="Filter by program"
                          style={SEL} {...hv(SEL_HOVER)} {...fv(SEL_FOCUS)}
                        >
                          {(recProgOpts || []).map((o, _i) => (
                            <React.Fragment key={_i}>
                              <option value={o.value}>{o.label}</option>
                            </React.Fragment>
                          ))}
                        </select>
                        <select
                          value={recBatchSel}
                          onChange={recSetBatchSel}
                          aria-label="Filter by batch"
                          style={SEL} {...hv(SEL_HOVER)} {...fv(SEL_FOCUS)}
                        >
                          {(recBatchOpts || []).map((o, _i) => (
                            <React.Fragment key={_i}>
                              <option value={o.value}>{o.label}</option>
                            </React.Fragment>
                          ))}
                        </select>
                        <select
                          value={recEmpSel}
                          onChange={recSetEmpSel}
                          aria-label="Filter by employment status"
                          style={SEL} {...hv(SEL_HOVER)} {...fv(SEL_FOCUS)}
                        >
                          {(recEmpOpts || []).map((o, _i) => (
                            <React.Fragment key={_i}>
                              <option value={o.value}>{o.label}</option>
                            </React.Fragment>
                          ))}
                        </select>
                        <select
                          value={recSortVal}
                          onChange={recSetSort}
                          aria-label="Sort records"
                          style={SEL} {...hv(SEL_HOVER)} {...fv(SEL_FOCUS)}
                        >
                          {(recSortOpts || []).map((o, _i) => (
                            <React.Fragment key={_i}>
                              <option value={o.value}>{o.label}</option>
                            </React.Fragment>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : null}
                  {recHasSel ? (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          flexWrap: 'wrap',
                          margin: '0 24px 16px',
                          padding: '8px 8px 8px 14px',
                          minHeight: '40px',
                          boxSizing: 'border-box',
                          background: '#0F3D2E',
                          borderRadius: '12px',
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginRight: 'auto' }}>{recSelLabel}</div>
                        <div tabIndex={0} onKeyDown={onActivate(recBulkVerify)}
                          onClick={recBulkVerify}
                          role="button"
                          style={{
                            background: '#F0C428',
                            color: '#00251F',
                            borderRadius: '9px',
                            padding: '8px 13px',
                            fontSize: '12.5px',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          Mark verified
                        </div>
                        <div tabIndex={0} onKeyDown={onActivate(recBulkFlag)}
                          onClick={recBulkFlag}
                          role="button"
                          style={{
                            border: '1px solid rgba(255,255,255,.3)',
                            color: '#fff',
                            borderRadius: '9px',
                            padding: '8px 13px',
                            fontSize: '12.5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                          {...hv({ background: 'rgba(255,255,255,.08)' })}
                        >
                          Flag
                        </div>
                        <div tabIndex={0} onKeyDown={onActivate(recBulkExport)}
                          onClick={recBulkExport}
                          role="button"
                          style={{
                            border: '1px solid rgba(255,255,255,.3)',
                            color: '#fff',
                            borderRadius: '9px',
                            padding: '8px 13px',
                            fontSize: '12.5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                          {...hv({ background: 'rgba(255,255,255,.08)' })}
                        >
                          Export CSV
                        </div>
                        <div tabIndex={0} onKeyDown={onActivate(recBulkDelete)}
                          onClick={recBulkDelete}
                          role="button"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            background: '#FDE7EC',
                            color: '#B3213C',
                            borderRadius: '9px',
                            padding: '8px 13px',
                            fontSize: '12.5px',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ width: '14px', height: '14px' }}
                          >
                            <path d="M4 7h16" />
                            <path d="M9 7V4h6v3" />
                            <path d="M6 7l1 13h10l1-13" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                          <span>Delete</span>
                        </div>
                        <div tabIndex={0} onKeyDown={onActivate(recClearSel)}
                          onClick={recClearSel}
                          role="button"
                          style={{ color: 'rgba(255,255,255,.75)', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', padding: '8px' }}
                        >
                          Clear
                        </div>
                      </div>
                    </>
                  ) : null}
                  <div data-m="tscroll" style={{ overflowX: 'auto' }}>
                    <div
                      data-m="trow"
                      style={{
                        minWidth: '980px',
                        display: 'grid',
                        gridTemplateColumns: recGridCols,
                        padding: '11px 24px',
                        background: '#F8FAF9',
                        borderTop: '1px solid #EEF0F3',
                        borderBottom: '1px solid #EEF0F3',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#64748B',
                        letterSpacing: '.6px',
                        textTransform: 'uppercase',
                        gap: '12px',
                        alignItems: 'center',
                      }}
                    >
                      {recCanEdit ? (
                        <div tabIndex={0} onKeyDown={onActivate(recToggleAll)}
                          onClick={recToggleAll}
                          role="checkbox"
                          aria-checked={!!recAllMark}
                          aria-label="Select all on this page"
                          style={{
                            width: '17px',
                            height: '17px',
                            borderRadius: '5px',
                            border: `1.5px solid ${recAllBorder}`,
                            background: recAllBg,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          {recAllMark}
                        </div>
                      ) : null}
                      <div>Alumni</div>
                      <div>Program · Batch</div>
                      <div>Employment (self-reported)</div>
                      <div>Status</div>
                      <div>Updated</div>
                      <div style={{ textAlign: 'right' }}>Actions</div>
                    </div>
                    {(recRowsView || []).map((r, _i) => (
                      <React.Fragment key={_i}>
                        <div
                          data-m="trow"
                          style={{
                            minWidth: '980px',
                            display: 'grid',
                            gridTemplateColumns: recGridCols,
                            padding: '14px 24px',
                            borderBottom: '1px solid #EEF0F3',
                            alignItems: 'center',
                            gap: '12px',
                            background: r.rowBg,
                            transition: 'background .3s',
                          }}
                          {...hv(rowHover)}
                        >
                          {recCanEdit ? (
                            <div tabIndex={0} onKeyDown={onActivate(r.toggle)}
                              onClick={r.toggle}
                              role="checkbox"
                              aria-checked={!!r.checkMark}
                              aria-label="Select record"
                              style={{
                                width: '17px',
                                height: '17px',
                                borderRadius: '5px',
                                border: `1.5px solid ${r.checkBorder}`,
                                background: r.checkBg,
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              {r.checkMark}
                            </div>
                          ) : null}
                          <div role="button" tabIndex={0} onKeyDown={onActivate(r.onView)} onClick={r.onView} style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: '0', cursor: 'pointer' }}>
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: '#E7F0EE',
                                color: '#0F3D2E',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                flex: 'none',
                              }}
                            >
                              {r.initials}
                            </div>
                            <div style={{ minWidth: '0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: '0' }}>
                                <div
                                  style={{
                                    fontSize: '13.5px',
                                    fontWeight: '600',
                                    color: '#0B1220',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {r.name}
                                </div>
                                {r.hasNote ? (
                                  <>
                                    <span
                                      title={r.note}
                                      aria-label="Has review note"
                                      style={{ flex: 'none', width: '6px', height: '6px', borderRadius: '50%', background: '#D4A72C' }}
                                    />
                                  </>
                                ) : null}
                              </div>
                              <div
                                style={{
                                  fontFamily: "'JetBrains Mono',ui-monospace,monospace",
                                  fontSize: '11px',
                                  color: '#94A3B8',
                                  marginTop: '1px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {r.sid}
                                {r.isSelf ? (
                                  <>
                                    <span title="Synced from the alumnus' Edit Profile" style={{ color: '#0F6B4F' }}>
                                      {' '}
                                      · {r.syncLabel}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: '12.5px', color: '#475569' }}>{r.progBatch}</div>
                          <div style={{ minWidth: '0' }}>
                            <div style={{ fontSize: '13px', color: '#0B1220' }}>{r.employment}</div>
                            <div style={{ fontSize: '11.5px', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {r.company}
                            </div>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              color: r.statusColor,
                              background: r.statusBg,
                              padding: '4px 10px',
                              borderRadius: '99px',
                              width: 'fit-content',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: r.statusColor }} />
                            <span>{r.statusLabel}</span>
                          </div>
                          <div style={{ fontSize: '12.5px', color: '#64748B' }}>{r.updated}</div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <div onKeyDown={onActivate(r.onView)}
                              onClick={r.onView}
                              role="button"
                              tabIndex={0}
                              title="View record"
                              aria-label="View record"
                              style={{
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                flex: 'none',
                              }}
                              {...hv({ background: '#F4F9F7', color: '#0F6B4F', borderColor: '#CFE3DA' })}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ width: '16px', height: '16px' }}
                              >
                                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </div>
                          {recCanEdit ? (
                            <>
                            <div onKeyDown={onActivate(r.onEdit)}
                              onClick={r.onEdit}
                              role="button"
                              tabIndex={0}
                              title="Edit record"
                              aria-label="Edit record"
                              style={{
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                flex: 'none',
                              }}
                              {...hv({ background: '#F4F9F7', color: '#0F6B4F', borderColor: '#CFE3DA' })}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ width: '16px', height: '16px' }}
                              >
                                <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                                <path d="M13.5 6.5l4 4" />
                              </svg>
                            </div>
                            <div onKeyDown={onActivate(r.onDelete)}
                              onClick={r.onDelete}
                              role="button"
                              tabIndex={0}
                              title="Delete record"
                              aria-label="Delete record"
                              style={{
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '8px',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                flex: 'none',
                              }}
                              {...hv({ background: '#FDF2F5', color: '#B3213C', borderColor: '#F6CFD8' })}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ width: '16px', height: '16px' }}
                              >
                                <path d="M4 7h16" />
                                <path d="M9 7V4h6v3" />
                                <path d="M6 7l1 13h10l1-13" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                              </svg>
                            </div>
                            <div data-row-menu="1" style={{ position: 'relative', flex: 'none' }}>
                              <div onKeyDown={onActivate(r.menuToggle)}
                                onClick={r.menuToggle}
                                role="button"
                                tabIndex={0}
                                aria-haspopup="menu"
                                aria-expanded={r.menuExpanded}
                                aria-label="More actions"
                                title="More actions"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '15px',
                                  color: r.dotsColor,
                                  background: r.dotsBg,
                                  cursor: 'pointer',
                                  borderRadius: '8px',
                                  outline: 'none',
                                }}
                                {...hv(recDotsHover)}
                                {...fv(recDotsFocus)}
                              >
                                ⋯
                              </div>
                              {r.menuOpen ? (
                                <>
                                  <div
                                    role="menu"
                                    aria-label="Record actions"
                                    style={{
                                      position: 'absolute',
                                      top: '36px',
                                      right: '0',
                                      zIndex: '60',
                                      width: '252px',
                                      background: '#fff',
                                      border: '1px solid #E2E5EA',
                                      borderRadius: '12px',
                                      boxShadow: '0 16px 38px rgba(11,18,32,.18)',
                                      padding: '6px',
                                      textAlign: 'left',
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: '10.5px',
                                        fontWeight: '700',
                                        letterSpacing: '.6px',
                                        color: '#A7B0BC',
                                        padding: '7px 10px 5px',
                                      }}
                                    >
                                      {r.menuHeading}
                                    </div>
                                    {(r.menuItems || []).map((mi, _i) => (
                                      <React.Fragment key={_i}>
                                        <div onKeyDown={onActivate(mi.onClick)}
                                          role="menuitem"
                                          tabIndex={0}
                                          onClick={mi.onClick}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '9px',
                                            padding: '9px 10px',
                                            borderRadius: '10px',
                                            fontSize: '12.5px',
                                            fontWeight: '600',
                                            color: mi.color,
                                            cursor: 'pointer',
                                            outline: 'none',
                                          }}
                                          {...hv(mi.hover)}
                                          {...fv(mi.hover)}
                                        >
                                          <span style={{ width: '14px', textAlign: 'center', fontSize: '12px', color: mi.color, flex: 'none' }}>
                                            {mi.icon}
                                          </span>
                                          <span>{mi.label}</span>
                                        </div>
                                      </React.Fragment>
                                    ))}
                                    <div style={{ height: '1px', background: '#EEF0F3', margin: '6px 4px' }} />
                                    {(r.menuDanger || []).map((mi, _i) => (
                                      <React.Fragment key={_i}>
                                        <div onKeyDown={onActivate(mi.onClick)}
                                          role="menuitem"
                                          tabIndex={0}
                                          onClick={mi.onClick}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '9px',
                                            padding: '9px 10px',
                                            borderRadius: '10px',
                                            fontSize: '12.5px',
                                            fontWeight: '600',
                                            color: '#BE123C',
                                            cursor: 'pointer',
                                            outline: 'none',
                                          }}
                                          {...hv(recDangerHover)}
                                          {...fv(recDangerHover)}
                                        >
                                          <span style={{ width: '14px', textAlign: 'center', fontSize: '12px', flex: 'none' }}>{mi.icon}</span>
                                          <span>{mi.label}</span>
                                        </div>
                                      </React.Fragment>
                                    ))}
                                  </div>
                                </>
                              ) : null}
                            </div>
                            </>
                          ) : null}
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  {recEmpty ? (
                    <>
                      <div
                        style={{
                          padding: '48px 24px',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <div style={{ fontWeight: '600', fontSize: '15px', color: '#0B1220' }}>No records match these filters</div>
                        <div style={{ fontSize: '13px', color: '#64748B' }}>Clear the search or pick a different program or status.</div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <div tabIndex={0} onKeyDown={onActivate(recResetFilters)}
                            onClick={recResetFilters}
                            role="button"
                            style={{
                              border: '1px solid #E2E5EA',
                              borderRadius: '10px',
                              padding: '9px 14px',
                              fontSize: '12.5px',
                              fontWeight: '600',
                              color: '#0B1220',
                              cursor: 'pointer',
                            }}
                            {...hv({ background: '#F7F8F9' })}
                          >
                            Reset filters
                          </div>
                          {recCanEdit ? (
                            <div tabIndex={0} onKeyDown={onActivate(recCreate)}
                              onClick={recCreate}
                              role="button"
                              style={{
                                background: '#0F3D2E',
                                color: '#fff',
                                borderRadius: '10px',
                                padding: '9px 14px',
                                fontSize: '12.5px',
                                fontWeight: '700',
                                cursor: 'pointer',
                              }}
                            >
                              + Add record
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </>
                  ) : null}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                      padding: '14px 24px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#64748B' }}>
                        <span>Rows per page</span>
                        <select
                          value={recPageSizeVal}
                          onChange={recSetPageSize}
                          aria-label="Rows per page"
                          style={{ ...SEL, fontSize: '12.5px', minHeight: '32px', padding: '5px 30px 5px 10px', borderRadius: '8px', backgroundPosition: 'right 9px center' }} {...hv(SEL_HOVER)} {...fv(SEL_FOCUS)}
                        >
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="20">20</option>
                        </select>
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#64748B' }}>{recCountLabel}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div tabIndex={0} onKeyDown={onActivate(recPrev)}
                        onClick={recPrev}
                        role="button"
                        aria-label="Previous page"
                        aria-disabled={recPrevDisabled}
                        style={{
                          width: '34px',
                          height: '34px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #E2E5EA',
                          borderRadius: '9px',
                          fontSize: '14px',
                          color: recPrevColor,
                          background: recPrevBg,
                          opacity: recPrevOpacity,
                          cursor: recPrevCursor,
                          userSelect: 'none',
                        }}
                      >
                        ‹
                      </div>
                      {(recPages || []).map((p, _i) => (
                        <React.Fragment key={_i}>
                          <div tabIndex={0} onKeyDown={onActivate(p.onClick)}
                            onClick={p.onClick}
                            role="button"
                            style={{
                              minWidth: '34px',
                              height: '34px',
                              boxSizing: 'border-box',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: `1px solid ${p.border}`,
                              background: p.bg,
                              color: p.color,
                              fontWeight: p.weight,
                              borderRadius: '9px',
                              fontSize: '12.5px',
                              cursor: 'pointer',
                              userSelect: 'none',
                            }}
                          >
                            {p.n}
                          </div>
                        </React.Fragment>
                      ))}
                      <div tabIndex={0} onKeyDown={onActivate(recNext)}
                        onClick={recNext}
                        role="button"
                        aria-label="Next page"
                        aria-disabled={recNextDisabled}
                        style={{
                          width: '34px',
                          height: '34px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #E2E5EA',
                          borderRadius: '9px',
                          fontSize: '14px',
                          color: recNextColor,
                          background: recNextBg,
                          opacity: recNextOpacity,
                          cursor: recNextCursor,
                          userSelect: 'none',
                        }}
                      >
                        ›
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
                    <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '16px', color: '#0B1220' }}>Audit trail</div>
                    <div style={{ fontSize: '12.5px', color: '#94A3B8' }}>
                      Alumni Office actions and automated system tasks · reversible for 30 days
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {(recAudit || []).map((a, _i) => (
                      <React.Fragment key={_i}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              alignSelf: 'stretch',
                              flex: 'none',
                              width: '28px',
                            }}
                          >
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                flex: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '13px',
                                fontWeight: '700',
                                background: a.iconBg,
                                color: a.color,
                                border: `1px solid ${a.iconBorder}`,
                              }}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.9"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ width: '14px', height: '14px' }}
                              >
                                <path d={a.icon} />
                              </svg>
                            </div>
                            {a.notLast ? (
                              <>
                                <div style={{ flex: '1', width: '2px', background: '#E7E9ED', borderRadius: '2px', margin: '4px 0 0' }} />
                              </>
                            ) : null}
                          </div>
                          <div
                            style={{
                              flex: '1',
                              minWidth: '0',
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              gap: '14px',
                              paddingBottom: '18px',
                            }}
                          >
                            <div style={{ flex: '1', minWidth: '0', fontSize: '13.5px', lineHeight: '1.5', color: '#334155', textWrap: 'pretty' }}>
                              <span style={{ fontWeight: '700', color: '#0B1220' }}>{a.who}</span> {a.action} {a.target}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94A3B8', whiteSpace: 'nowrap', paddingTop: '2px' }}>{a.when}</div>
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
            {recDrawerOpen ? (
              <>
                <div style={{ position: 'fixed', inset: '0', zIndex: '90', display: 'flex', justifyContent: 'flex-end' }}>
                  <div role="presentation" onClick={recDrawerClose} style={{ position: 'absolute', inset: '0', background: 'rgba(11,18,32,.42)' }} />
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Review alumni submission"
                    style={{
                      position: 'relative',
                      width: 'min(470px,100%)',
                      height: '100%',
                      background: '#fff',
                      boxShadow: '-20px 0 60px rgba(11,18,32,.24)',
                      display: 'flex',
                      flexDirection: 'column',
                      fontFamily: 'Inter,system-ui,sans-serif',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '14px',
                        padding: '20px 22px',
                        borderBottom: '1px solid #EEF0F3',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '0' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#E7F0EE',
                            color: '#0F3D2E',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: '700',
                            flex: 'none',
                          }}
                        >
                          {recDrawerInitials}
                        </div>
                        <div style={{ minWidth: '0' }}>
                          <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '600', fontSize: '17px', color: '#0B1220' }}>{recDrawerName}</div>
                          <div style={{ fontSize: '12px', color: '#94A3B8' }}>{recDrawerSid}</div>
                        </div>
                      </div>
                      <div onKeyDown={onActivate(recDrawerClose)}
                        onClick={recDrawerClose}
                        role="button"
                        aria-label="Close review drawer"
                        tabIndex={0}
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '10px',
                          fontSize: '16px',
                          color: '#64748B',
                          cursor: 'pointer',
                          flex: 'none',
                        }}
                        {...hv(recDotsHover)}
                      >
                        ×
                      </div>
                    </div>
                    <div
                      style={{
                        flex: '1',
                        minHeight: '0',
                        overflowY: 'auto',
                        padding: '20px 22px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '18px',
                      }}
                    >
                      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <div
                          style={{
                            fontSize: '11.5px',
                            fontWeight: '700',
                            padding: '5px 11px',
                            borderRadius: '99px',
                            background: recDrawerStatusBg,
                            color: recDrawerStatusColor,
                          }}
                        >
                          {recDrawerStatusLabel}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: '600' }}>{recDrawerStatusNote}</div>
                      </div>
                      <div style={{ flex: 'none', border: '1px solid #E7E9ED', borderRadius: '14px' }}>
                        {(recDrawerFacts || []).map((f, _i) => (
                          <React.Fragment key={_i}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                gap: '14px',
                                padding: '11px 14px',
                                borderBottom: '1px solid #EEF0F3',
                                minHeight: '22px',
                              }}
                            >
                              <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600' }}>{f.label}</div>
                              <div style={{ fontSize: '12.5px', color: '#0B1220', fontWeight: '600', textAlign: 'right' }}>{f.value}</div>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                      {recDrawerHasFlag ? (
                        <>
                          <div
                            style={{ flex: 'none', background: '#FDFAF2', border: '1px solid #F1E4C4', borderRadius: '12px', padding: '12px 14px' }}
                          >
                            <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.6px', color: '#8A6D1F', marginBottom: '5px' }}>
                              DATA ISSUE ON FILE
                            </div>
                            <div style={{ fontSize: '12.5px', lineHeight: '1.5', color: '#5A4712', textWrap: 'pretty' }}>{recDrawerFlag}</div>
                          </div>
                        </>
                      ) : null}
                      <div style={{ flex: 'none' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.6px', color: '#A7B0BC', marginBottom: '8px' }}>
                          UPLOADED PROOF
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {(recDrawerProof || []).map((p, _i) => (
                            <React.Fragment key={_i}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '11px',
                                  background: '#F7FAF8',
                                  border: '1px solid #EDF2EF',
                                  borderRadius: '14px',
                                  padding: '10px 12px',
                                }}
                              >
                                <div
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '8px',
                                    background: '#F1F3F5',
                                    color: '#5A6572',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    flex: 'none',
                                  }}
                                >
                                  ▤
                                </div>
                                <div style={{ minWidth: '0', flex: '1' }}>
                                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0B1220' }}>{p.name}</div>
                                  <div style={{ fontSize: '11.5px', color: '#94A3B8' }}>{p.meta}</div>
                                </div>
                                {p.ok ? (
                                  <>
                                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11.5px', fontWeight: '700', color: '#0F6B4F', flex: 'none', textDecoration: 'none' }}>View</a>
                                  </>
                                ) : null}
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      <div style={{ flex: 'none' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.6px', color: '#A7B0BC', marginBottom: '8px' }}>
                          ADMIN NOTES
                        </div>
                        <textarea
                          value={recDrawerNote}
                          onChange={recDrawerSetNote}
                          placeholder="Record what was checked, or what the alumnus still needs to submit…"
                          style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            minHeight: '96px',
                            resize: 'vertical',
                            border: '1px solid #E2E5EA',
                            borderRadius: '12px',
                            padding: '11px 12px',
                            fontFamily: 'inherit',
                            fontSize: '12.5px',
                            lineHeight: '1.55',
                            color: '#0B1220',
                            outline: 'none',
                            background: '#FBFCFC',
                          }}
                        />
                      </div>
                    </div>
                    {recIsDept ? (
                      <div style={{ borderTop: "1px solid #EEF0F3", padding: "14px 22px", fontSize: "12.5px", color: "#64748B", lineHeight: "1.5" }}>
                        View-only · Contact the Alumni Relations Office to request changes to this record.
                      </div>
                    ) : null}
                    {recCanEdit ? (
                    <div
                      style={{
                        borderTop: '1px solid #EEF0F3',
                        padding: '14px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {recDrawerCanApprove ? (
                        <>
                          <div onKeyDown={onActivate(recDrawerApprove)}
                            onClick={recDrawerApprove}
                            role="button"
                            tabIndex={0}
                            style={{
                              flex: '1',
                              minWidth: '170px',
                              textAlign: 'center',
                              background: '#0F6B4F',
                              color: '#fff',
                              borderRadius: '12px',
                              padding: '12px 16px',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            Approve & mark verified
                          </div>
                        </>
                      ) : null}
                      <div onKeyDown={onActivate(recDrawerFlagAction)}
                        onClick={recDrawerFlagAction}
                        role="button"
                        tabIndex={0}
                        style={{
                          background: '#FBF0D8',
                          color: '#7A5E15',
                          border: '1px solid #F1E4C4',
                          borderRadius: '12px',
                          padding: '12px 15px',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Flag
                      </div>
                      <div onKeyDown={onActivate(recDrawerEdit)}
                        onClick={recDrawerEdit}
                        role="button"
                        tabIndex={0}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          border: '1px solid #E2E5EA',
                          color: '#0B1220',
                          borderRadius: '12px',
                          padding: '12px 15px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                        {...hv({ background: '#F7F8F9' })}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ width: '14px', height: '14px' }}
                        >
                          <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                          <path d="M13.5 6.5l4 4" />
                        </svg>
                        <span>Edit</span>
                      </div>
                      <div onKeyDown={onActivate(recDrawerDelete)}
                        onClick={recDrawerDelete}
                        role="button"
                        tabIndex={0}
                        title="Delete record"
                        aria-label="Delete record"
                        style={{
                          width: '44px',
                          height: '44px',
                          boxSizing: 'border-box',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #F6CFD8',
                          color: '#B3213C',
                          borderRadius: '12px',
                          cursor: 'pointer',
                        }}
                        {...hv({ background: '#FDF2F5' })}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ width: '16px', height: '16px' }}
                        >
                          <path d="M4 7h16" />
                          <path d="M9 7V4h6v3" />
                          <path d="M6 7l1 13h10l1-13" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </div>
                    </div>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
            {recFormOn ? (
              <>
                <div role="presentation"
                  onClick={onBackdrop(recFormClose)}
                  style={{
                    position: 'fixed',
                    inset: '0',
                    zIndex: '96',
                    background: 'rgba(11,18,32,.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    boxSizing: 'border-box',
                    fontFamily: 'Inter,system-ui,sans-serif',
                  }}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={recFormTitle}
                    style={{
                      width: '100%',
                      maxWidth: '640px',
                      maxHeight: 'calc(100vh - 32px)',
                      display: 'flex',
                      flexDirection: 'column',
                      background: '#fff',
                      borderRadius: '16px',
                      boxShadow: '0 24px 60px rgba(11,18,32,.28)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '14px',
                        padding: '20px 22px 16px',
                        borderBottom: '1px solid #EEF0F3',
                      }}
                    >
                      <div style={{ minWidth: '0' }}>
                        <div style={{ fontWeight: '700', fontSize: '18px', color: '#0B1220', letterSpacing: '-.2px' }}>{recFormTitle}</div>
                        <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px', textWrap: 'pretty' }}>{recFormDesc}</div>
                      </div>
                      <div onKeyDown={onActivate(recFormClose)}
                        onClick={recFormClose}
                        role="button"
                        aria-label="Close"
                        tabIndex={0}
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '10px',
                          fontSize: '16px',
                          color: '#64748B',
                          cursor: 'pointer',
                          flex: 'none',
                        }}
                        {...hv({ background: '#F1F3F5' })}
                      >
                        ×
                      </div>
                    </div>
                    <div
                      style={{
                        flex: '1',
                        minHeight: '0',
                        overflowY: 'auto',
                        padding: '18px 22px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.7px', color: '#94A3B8' }}>PERSONAL DETAILS</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: '12px 14px' }}>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                              Full name <span style={{ color: '#B3213C' }}>*</span>
                            </div>
                            <input
                              value={recFName}
                              onChange={recFSetName}
                              placeholder="e.g. Juan Dela Cruz"
                              style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                border: '1px solid #E2E5EA',
                                borderRadius: '10px',
                                padding: '10px 12px',
                                fontFamily: 'inherit',
                                fontSize: '13px',
                                color: '#0B1220',
                                outline: 'none',
                                background: '#fff',
                                borderColor: recFNameBorder,
                              }}
                            />
                            {recFHasErrName ? (
                              <>
                                <div style={{ fontSize: '11.5px', color: '#B3213C', marginTop: '5px' }}>{recFErrName}</div>
                              </>
                            ) : null}
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Email</div>
                            <input
                              value={recFEmail}
                              onChange={recFSetEmail}
                              placeholder="name@example.com"
                              style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                border: '1px solid #E2E5EA',
                                borderRadius: '10px',
                                padding: '10px 12px',
                                fontFamily: 'inherit',
                                fontSize: '13px',
                                color: '#0B1220',
                                outline: 'none',
                                background: '#fff',
                                borderColor: recFEmailBorder,
                              }}
                            />
                            {recFHasErrEmail ? (
                              <>
                                <div style={{ fontSize: '11.5px', color: '#B3213C', marginTop: '5px' }}>{recFErrEmail}</div>
                              </>
                            ) : null}
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Alumni Membership ID</div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                boxSizing: 'border-box',
                                border: '1px dashed #D5DAE0',
                                borderRadius: '10px',
                                padding: '10px 12px',
                                background: '#F8FAF9',
                              }}
                            >
                              <span style={{ fontFamily: "'JetBrains Mono',ui-monospace,monospace", fontSize: '12.5px', color: '#0B1220' }}>
                                {recFormSid}
                              </span>
                              <span style={{ fontSize: '11px', color: '#94A3B8' }}>{recFormSidNote}</span>
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                              Program <span style={{ color: '#B3213C' }}>*</span>
                            </div>
                            <select
                              value={recFProgram}
                              onChange={recFSetProgram}
                              style={FORM_SEL} {...hv(SEL_HOVER)} {...fv(SEL_FOCUS)}
                            >
                              {(recFProgOpts || []).map((o, _i) => (
                                <React.Fragment key={_i}>
                                  <option value={o.value}>{o.label}</option>
                                </React.Fragment>
                              ))}
                            </select>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                              Graduation batch <span style={{ color: '#B3213C' }}>*</span>
                            </div>
                            <select
                              value={recFBatch}
                              onChange={recFSetBatch}
                              style={FORM_SEL} {...hv(SEL_HOVER)} {...fv(SEL_FOCUS)}
                            >
                              {(recFBatchOpts || []).map((o, _i) => (
                                <React.Fragment key={_i}>
                                  <option value={o.value}>{o.label}</option>
                                </React.Fragment>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.7px', color: '#94A3B8' }}>EMPLOYMENT</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: '12px 14px' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Employment status</div>
                            <select
                              value={recFEmp}
                              onChange={recFSetEmp}
                              style={FORM_SEL} {...hv(SEL_HOVER)} {...fv(SEL_FOCUS)}
                            >
                              {(recFEmpOpts || []).map((o, _i) => (
                                <React.Fragment key={_i}>
                                  <option value={o.value}>{o.label}</option>
                                </React.Fragment>
                              ))}
                            </select>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>{recFCoLabel}</div>
                            <input
                              value={recFCompany}
                              onChange={recFSetCompany}
                              disabled={recFCoDisabled}
                              placeholder={recFCoPh}
                              style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                border: '1px solid #E2E5EA',
                                borderRadius: '10px',
                                padding: '10px 12px',
                                fontFamily: 'inherit',
                                fontSize: '13px',
                                color: '#0B1220',
                                outline: 'none',
                                background: recFCoBg,
                                borderColor: recFCompanyBorder,
                              }}
                            />
                            {recFHasErrCompany ? (
                              <>
                                <div style={{ fontSize: '11.5px', color: '#B3213C', marginTop: '5px' }}>{recFErrCompany}</div>
                              </>
                            ) : null}
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Submitted via</div>
                            <select
                              value={recFSource}
                              onChange={recFSetSource}
                              style={FORM_SEL} {...hv(SEL_HOVER)} {...fv(SEL_FOCUS)}
                            >
                              {(recFSourceOpts || []).map((o, _i) => (
                                <React.Fragment key={_i}>
                                  <option value={o.value}>{o.label}</option>
                                </React.Fragment>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.7px', color: '#94A3B8' }}>RECORD STATUS</div>
                        <div role="radiogroup" aria-label="Record status" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {(recFStatusChips || []).map((c, _i) => (
                            <React.Fragment key={_i}>
                              <div onKeyDown={onActivate(c.onClick)}
                                onClick={c.onClick}
                                role="radio"
                                aria-checked={c.checked}
                                tabIndex={0}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '7px',
                                  padding: '8px 13px',
                                  borderRadius: '99px',
                                  border: `1px solid ${c.border}`,
                                  background: c.bg,
                                  color: c.color,
                                  fontSize: '12.5px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                }}
                              >
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: c.dot }} />
                                <span>{c.label}</span>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Admin note</div>
                          <textarea
                            value={recFNote}
                            onChange={recFSetNote}
                            placeholder="Optional — shown under the row, e.g. what still needs to be submitted"
                            style={{
                              width: '100%',
                              boxSizing: 'border-box',
                              border: '1px solid #E2E5EA',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              fontFamily: 'inherit',
                              fontSize: '13px',
                              color: '#0B1220',
                              outline: 'none',
                              background: '#fff',
                              minHeight: '70px',
                              resize: 'vertical',
                              lineHeight: '1.5',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        borderTop: '1px solid #EEF0F3',
                        padding: '14px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                        <span style={{ color: '#B3213C' }}>*</span> Required · changes are logged to the audit trail
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div onKeyDown={onActivate(recFormClose)}
                          onClick={recFormClose}
                          role="button"
                          tabIndex={0}
                          style={{
                            border: '1px solid #E2E5EA',
                            color: '#475569',
                            borderRadius: '10px',
                            padding: '10px 16px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                          {...hv({ background: '#F7F8F9' })}
                        >
                          Cancel
                        </div>
                        <div onKeyDown={onActivate(recFormSubmit)}
                          onClick={recFormSubmit}
                          role="button"
                          tabIndex={0}
                          style={{
                            background: '#0F3D2E',
                            color: '#fff',
                            borderRadius: '10px',
                            padding: '10px 18px',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                          {...hv({ background: '#0B2F23' })}
                        >
                          {recFormSave}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
            {recDelOn ? (
              <>
                <div role="presentation"
                  onClick={onBackdrop(recDelClose)}
                  style={{
                    position: 'fixed',
                    inset: '0',
                    zIndex: '97',
                    background: 'rgba(11,18,32,.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    boxSizing: 'border-box',
                    fontFamily: 'Inter,system-ui,sans-serif',
                  }}
                >
                  <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-label={recDelTitle}
                    style={{
                      width: '100%',
                      maxWidth: '440px',
                      background: '#fff',
                      borderRadius: '16px',
                      boxShadow: '0 24px 60px rgba(11,18,32,.28)',
                      padding: '22px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '12px',
                          background: '#FDE7EC',
                          color: '#B3213C',
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
                          style={{ width: '19px', height: '19px' }}
                        >
                          <path d="M4 7h16" />
                          <path d="M9 7V4h6v3" />
                          <path d="M6 7l1 13h10l1-13" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </div>
                      <div style={{ minWidth: '0' }}>
                        <div style={{ fontWeight: '700', fontSize: '17px', color: '#0B1220' }}>{recDelTitle}</div>
                        <div style={{ fontSize: '12.5px', lineHeight: '1.5', color: '#64748B', marginTop: '4px', textWrap: 'pretty' }}>
                          Deleted records are removed from the list and from all employability reports. You can undo right after, or restore from the
                          audit trail within 30 days.
                        </div>
                      </div>
                    </div>
                    <div style={{ border: '1px solid #EEF0F3', borderRadius: '12px', overflow: 'hidden' }}>
                      {(recDelList || []).map((d, _i) => (
                        <React.Fragment key={_i}>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderBottom: '1px solid #F1F2F4' }}
                          >
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: '#E7F0EE',
                                color: '#0F3D2E',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10.5px',
                                fontWeight: '700',
                                flex: 'none',
                              }}
                            >
                              {d.initials}
                            </div>
                            <div style={{ minWidth: '0' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0B1220' }}>{d.name}</div>
                              <div style={{ fontSize: '11.5px', color: '#94A3B8' }}>{d.meta}</div>
                            </div>
                          </div>
                        </React.Fragment>
                      ))}
                      {recDelHasMore ? (
                        <>
                          <div style={{ padding: '9px 12px', fontSize: '12px', fontWeight: '600', color: '#64748B', background: '#FAFBFB' }}>
                            {recDelMore}
                          </div>
                        </>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <div onKeyDown={onActivate(recDelClose)}
                        onClick={recDelClose}
                        role="button"
                        tabIndex={0}
                        style={{
                          border: '1px solid #E2E5EA',
                          color: '#475569',
                          borderRadius: '10px',
                          padding: '10px 16px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                        {...hv({ background: '#F7F8F9' })}
                      >
                        Cancel
                      </div>
                      <div onKeyDown={onActivate(recDelConfirm)}
                        onClick={recDelConfirm}
                        role="button"
                        tabIndex={0}
                        style={{
                          background: '#B3213C',
                          color: '#fff',
                          borderRadius: '10px',
                          padding: '10px 18px',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                        {...hv({ background: '#961B32' })}
                      >
                        {recDelBtn}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
            {recActOn ? (
              <>
                <div role="presentation"
                  onClick={onBackdrop(recActClose)}
                  style={{
                    position: 'fixed',
                    inset: '0',
                    zIndex: '95',
                    background: 'rgba(11,18,32,.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    boxSizing: 'border-box',
                    fontFamily: 'Inter,system-ui,sans-serif',
                  }}
                >
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={recActTitle}
                    style={{
                      width: '100%',
                      maxWidth: '520px',
                      maxHeight: 'calc(100vh - 32px)',
                      display: 'flex',
                      flexDirection: 'column',
                      background: '#fff',
                      borderRadius: '16px',
                      boxShadow: '0 24px 60px rgba(11,18,32,.28)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '14px',
                        padding: '18px 20px 14px',
                        borderBottom: '1px solid #EEF0F3',
                      }}
                    >
                      <div style={{ minWidth: '0' }}>
                        <div style={{ fontWeight: '600', fontSize: '17px', color: '#0B1220' }}>{recActTitle}</div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>{recActWho}</div>
                      </div>
                      <div onKeyDown={onActivate(recActClose)}
                        onClick={recActClose}
                        role="button"
                        aria-label="Close"
                        tabIndex={0}
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '10px',
                          fontSize: '16px',
                          color: '#64748B',
                          cursor: 'pointer',
                          flex: 'none',
                        }}
                        {...hv(recDotsHover)}
                      >
                        ×
                      </div>
                    </div>
                    <div
                      style={{
                        flex: '1',
                        minHeight: '0',
                        overflowY: 'auto',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                      }}
                    >
                      <div style={{ fontSize: '12.5px', lineHeight: '1.5', color: '#475569', textWrap: 'pretty' }}>{recActDesc}</div>
                      {recActIsHistory ? (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {(recActLog || []).map((h, _i) => (
                              <React.Fragment key={_i}>
                                <div style={{ display: 'grid', gridTemplateColumns: '14px minmax(0,1fr)', gap: '12px', paddingBottom: '14px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', paddingTop: '4px' }}>
                                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: h.dot, flex: 'none' }} />
                                    <div style={{ width: '1px', flex: '1', background: '#EEF0F3' }} />
                                  </div>
                                  <div style={{ minWidth: '0' }}>
                                    <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#0B1220', lineHeight: '1.45', textWrap: 'pretty' }}>
                                      {h.what}
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '2px' }}>
                                      {h.who} · {h.when}
                                    </div>
                                  </div>
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                        </>
                      ) : null}
                      {recActIsEmail ? (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                              <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.6px', color: '#A7B0BC', marginBottom: '6px' }}>
                                TO
                              </div>
                              <div
                                style={{
                                  fontSize: '12.5px',
                                  fontWeight: '600',
                                  color: '#0B1220',
                                  background: '#F7F8F9',
                                  border: '1px solid #EEF0F3',
                                  borderRadius: '10px',
                                  padding: '9px 12px',
                                }}
                              >
                                {recActTo}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.6px', color: '#A7B0BC', marginBottom: '6px' }}>
                                SUBJECT
                              </div>
                              <input
                                value={recActSubject}
                                onChange={recActSetSubject}
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  border: '1px solid #E2E5EA',
                                  borderRadius: '10px',
                                  padding: '9px 12px',
                                  fontFamily: 'inherit',
                                  fontSize: '12.5px',
                                  color: '#0B1220',
                                  outline: 'none',
                                }}
                              />
                            </div>
                            <div>
                              <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.6px', color: '#A7B0BC', marginBottom: '6px' }}>
                                MESSAGE
                              </div>
                              <textarea
                                value={recActBody}
                                onChange={recActSetBody}
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  minHeight: '170px',
                                  resize: 'vertical',
                                  border: '1px solid #E2E5EA',
                                  borderRadius: '10px',
                                  padding: '10px 12px',
                                  fontFamily: 'inherit',
                                  fontSize: '12.5px',
                                  lineHeight: '1.55',
                                  color: '#0B1220',
                                  outline: 'none',
                                }}
                              />
                            </div>
                          </div>
                        </>
                      ) : null}
                      {recActIsProof ? (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                              <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.6px', color: '#A7B0BC', marginBottom: '8px' }}>
                                DOCUMENTS TO REQUEST
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {(recActDocs || []).map((d, _i) => (
                                  <React.Fragment key={_i}>
                                    <div onKeyDown={onActivate(d.toggle)}
                                      onClick={d.toggle}
                                      role="checkbox"
                                      aria-checked={!!d.mark}
                                      tabIndex={0}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '11px',
                                        padding: '9px 12px',
                                        border: `1px solid ${d.border}`,
                                        background: d.bg,
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: '16px',
                                          height: '16px',
                                          borderRadius: '5px',
                                          border: `1.5px solid ${d.markBorder}`,
                                          background: d.markBg,
                                          color: '#fff',
                                          fontSize: '10px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flex: 'none',
                                        }}
                                      >
                                        {d.mark}
                                      </div>
                                      <div style={{ minWidth: '0' }}>
                                        <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#0B1220' }}>{d.label}</div>
                                        <div style={{ fontSize: '11.5px', color: '#94A3B8' }}>{d.hint}</div>
                                      </div>
                                    </div>
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.6px', color: '#A7B0BC', marginBottom: '8px' }}>
                                DUE IN
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {(recActDue || []).map((c, _i) => (
                                  <React.Fragment key={_i}>
                                    <div onKeyDown={onActivate(c.onClick)}
                                      onClick={c.onClick}
                                      role="button"
                                      tabIndex={0}
                                      style={{
                                        padding: '7px 13px',
                                        borderRadius: '99px',
                                        border: `1px solid ${c.border}`,
                                        background: c.bg,
                                        color: c.color,
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {c.label}
                                    </div>
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.6px', color: '#A7B0BC', marginBottom: '6px' }}>
                                NOTE TO ALUMNUS (OPTIONAL)
                              </div>
                              <textarea
                                value={recActNote}
                                onChange={recActSetNote}
                                placeholder="e.g. A clear phone photo is fine."
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  minHeight: '64px',
                                  resize: 'vertical',
                                  border: '1px solid #E2E5EA',
                                  borderRadius: '10px',
                                  padding: '9px 12px',
                                  fontFamily: 'inherit',
                                  fontSize: '12.5px',
                                  lineHeight: '1.5',
                                  color: '#0B1220',
                                  outline: 'none',
                                }}
                              />
                            </div>
                          </div>
                        </>
                      ) : null}
                      {recActIsReassign ? (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                              <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.6px', color: '#A7B0BC', marginBottom: '8px' }}>
                                PROGRAM
                              </div>
                              <select
                                value={recActCourse}
                                onChange={recActSetCourse}
                                aria-label="Program"
                                style={FORM_SEL} {...hv(SEL_HOVER)} {...fv(SEL_FOCUS)}
                              >
                                {(recActCourseOpts || []).map((o, _i) => (
                                  <React.Fragment key={_i}>
                                    <option value={o.value}>{o.label}</option>
                                  </React.Fragment>
                                ))}
                              </select>
                            </div>
                            <div>
                              <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.6px', color: '#A7B0BC', marginBottom: '8px' }}>
                                GRADUATION BATCH
                              </div>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {(recActBatches || []).map((c, _i) => (
                                  <React.Fragment key={_i}>
                                    <div onKeyDown={onActivate(c.onClick)}
                                      onClick={c.onClick}
                                      role="button"
                                      tabIndex={0}
                                      style={{
                                        padding: '7px 12px',
                                        borderRadius: '99px',
                                        border: `1px solid ${c.border}`,
                                        background: c.bg,
                                        color: c.color,
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {c.label}
                                    </div>
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : null}
                      {recActIsDup ? (
                        <>
                          <div>
                            <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.6px', color: '#A7B0BC', marginBottom: '8px' }}>
                              DUPLICATE OF
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {(recActDupList || []).map((d, _i) => (
                                <React.Fragment key={_i}>
                                  <div onKeyDown={onActivate(d.onClick)}
                                    onClick={d.onClick}
                                    role="radio"
                                    aria-checked={!!d.mark}
                                    tabIndex={0}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '11px',
                                      padding: '9px 12px',
                                      border: `1px solid ${d.border}`,
                                      background: d.bg,
                                      borderRadius: '10px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '50%',
                                        border: `1.5px solid ${d.markBorder}`,
                                        background: d.markBg,
                                        color: '#fff',
                                        fontSize: '9px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flex: 'none',
                                      }}
                                    >
                                      {d.mark}
                                    </div>
                                    <div style={{ minWidth: '0' }}>
                                      <div style={{ fontSize: '12.5px', fontWeight: '600', color: '#0B1220' }}>{d.name}</div>
                                      <div
                                        style={{
                                          fontSize: '11.5px',
                                          color: '#94A3B8',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {d.meta}
                                      </div>
                                    </div>
                                  </div>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : null}
                      {recActShowReason ? (
                        <>
                          <div>
                            <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.6px', color: '#A7B0BC', marginBottom: '6px' }}>
                              {recActReasonLabel}
                            </div>
                            <textarea
                              value={recActReason}
                              onChange={recActSetReason}
                              placeholder={recActReasonPh}
                              style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                minHeight: '70px',
                                resize: 'vertical',
                                border: '1px solid #E2E5EA',
                                borderRadius: '10px',
                                padding: '9px 12px',
                                fontFamily: 'inherit',
                                fontSize: '12.5px',
                                lineHeight: '1.5',
                                color: '#0B1220',
                                outline: 'none',
                              }}
                            />
                            <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '5px' }}>Required · saved to the audit log</div>
                          </div>
                        </>
                      ) : null}
                    </div>
                    <div
                      style={{
                        borderTop: '1px solid #EEF0F3',
                        padding: '14px 20px',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '10px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div onKeyDown={onActivate(recActClose)}
                        onClick={recActClose}
                        role="button"
                        tabIndex={0}
                        style={{
                          border: '1px solid #E2E5EA',
                          color: '#475569',
                          borderRadius: '12px',
                          padding: '11px 16px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        {recActCancel}
                      </div>
                      {recActHasPrimary ? (
                        <>
                          <div onKeyDown={onActivate(recActSubmit)}
                            onClick={recActSubmit}
                            role="button"
                            tabIndex={0}
                            style={{
                              background: recActPrimaryBg,
                              color: '#fff',
                              borderRadius: '12px',
                              padding: '11px 18px',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: recActPrimaryCursor,
                              opacity: recActPrimaryOp,
                            }}
                          >
                            {recActPrimary}
                          </div>
                        </>
                      ) : null}
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

