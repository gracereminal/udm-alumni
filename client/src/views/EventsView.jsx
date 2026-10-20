import React from 'react';
import { hv } from '../lib/stateStyle';
import NavSidebar from '../components/NavSidebar';
import SearchPill from '../components/topbar/SearchPill';
import NotificationBell from '../components/topbar/NotificationBell';
import UserChip from '../components/topbar/UserChip';
import { onActivate } from '../lib/a11y';

/* View layer for the "Events" screen — converted from "Alumni Tracer Mockups.dc.html". */
export default function EventsView(v) {
  const {
    calBg,
    calBorder,
    calColor,
    calLabel,
    cancelReg,
    evAgenda,
    evBody,
    evCanCal,
    evCapNote,
    evCapPct,
    evCount,
    evDate,
    evFee,
    evFilters,
    evHasAgenda,
    evHasCapNote,
    evHasHighlights,
    evHasPhoto,
    evHighlights,
    evKind,
    evListCount,
    evListEmpty,
    evNoPhoto,
    evOrganizer,
    evPhotoCss,
    evStatus,
    evStatusBg,
    evStatusDot,
    evStatusFg,
    evTime,
    evTitle,
    evVenue,
    eventsList,
    isRegistered,
    regBg,
    regBorder,
    regColor,
    regConfirmSub,
    regConfirmText,
    regCursor,
    regDlgBtnBg,
    regDlgBtnCursor,
    regDlgClose,
    regDlgConfirm,
    regDlgFields,
    regDlgOpen,
    regDlgTitle,
    regDlgVenue,
    regDlgWhen,
    regHover,
    regLabel,
    toggleCalendar,
    toggleRsvp,
    viewRegEmail,
  } = v;
  return (
    <>
      <div
        data-screen-label="Events"
        style={{
          display: 'flex',
          minHeight: '100vh',
          background:
            'radial-gradient(900px 520px at 0% 0%,#E3F1EA 0%,rgba(227,241,234,0) 70%),radial-gradient(800px 500px at 100% 100%,#EAF2EE 0%,rgba(234,242,238,0) 70%),#F3F6F4',
        }}
      >
        <NavSidebar style={{ flex: 'none' }} />
        <div style={{ flex: '1', minWidth: '0', background: 'transparent', display: 'flex', flexDirection: 'column' }}>
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
                Events
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,.45)', fontWeight: '600', letterSpacing: '.3px' }}>
                UDM ALUMNI RELATIONS OFFICE · EVENTS
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
              data-m="ev-page"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                background: 'rgba(255,255,255,.55)',
                border: '1px solid #E7E9ED',
                borderRadius: '20px',
                boxShadow: '0 1px 2px rgba(16,24,40,.03)',
                padding: '24px',
              }}
            >
              <div
                data-m="ev-page-head"
                style={{ width: '100%', boxSizing: 'border-box', minWidth: '0', padding: '0 4px 20px', borderBottom: '1px solid #E3E8E5' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }} />
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
                  Upcoming Alumni Events
                </div>
                <div style={{ fontSize: '13.5px', color: '#64748B', marginTop: '4px', maxWidth: '760px' }}>
                  Homecomings, job fairs and chapter activities posted by the UDM Alumni Relations Office. Previews appear in your dashboard
                  announcements; full details live here.
                </div>
              </div>
              <div data-m="ev-grid" style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    flex: '999 1 520px',
                    background: '#fff',
                    border: '1px solid #E7E9ED',
                    borderRadius: '16px',
                    boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)',
                    overflow: 'hidden',
                    minWidth: '0',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      height: '148px',
                      background: 'radial-gradient(420px 200px at 100% 0%,#DCEBE3 0%,rgba(220,235,227,0) 70%),#EEF4F1',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: '18px 22px',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                    }}
                  >
                    {evNoPhoto ? (
                      <>
                        <img
                          src="/alumni-logo.png"
                          alt=""
                          style={{
                            position: 'absolute',
                            right: '22px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '104px',
                            height: '104px',
                            objectFit: 'contain',
                            opacity: '.14',
                            mixBlendMode: 'multiply',
                            filter: 'grayscale(1)',
                          }}
                        />
                      </>
                    ) : null}
                    {evHasPhoto ? (
                      <>
                        <div style={{ position: 'absolute', inset: '0', background: evPhotoCss }} />
                        <div
                          style={{
                            position: 'absolute',
                            inset: '0',
                            background: 'linear-gradient(180deg,rgba(11,18,32,0) 40%,rgba(11,18,32,.45) 100%)',
                          }}
                        />
                      </>
                    ) : null}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div
                        style={{
                          fontSize: '10.5px',
                          fontWeight: '700',
                          letterSpacing: '.5px',
                          color: '#fff',
                          background: '#0F3D2E',
                          padding: '5px 10px',
                          borderRadius: '8px',
                        }}
                      >
                        {evKind}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          color: evStatusFg,
                          background: evStatusBg,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: evStatusDot, flex: 'none' }} />
                        <span>{evStatus}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '24px 28px 28px' }}>
                    <h2
                      style={{
                        margin: '0',
                        fontFamily: 'Inter,sans-serif',
                        fontWeight: '700',
                        fontSize: '24px',
                        lineHeight: '1.25',
                        letterSpacing: '-.5px',
                        color: '#0B1220',
                        textWrap: 'pretty',
                      }}
                    >
                      {evTitle}
                    </h2>
                    <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '6px' }}>Hosted by {evOrganizer}</div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,170px),1fr))',
                        gap: '14px 20px',
                        marginTop: '20px',
                        padding: '16px 18px',
                        background: '#F7FAF8',
                        border: '1px solid #EDF2EF',
                        borderRadius: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '11px', alignItems: 'flex-start', minWidth: '0' }}>
                        <div
                          style={{
                            flex: 'none',
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            background: '#fff',
                            border: '1px solid #E3ECE7',
                            boxSizing: 'border-box',
                            color: '#0F3D2E',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ width: '17px', height: '17px' }}
                          >
                            <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
                            <path d="M3.5 10h17M8 3v4M16 3v4" />
                          </svg>
                        </div>
                        <div style={{ minWidth: '0' }}>
                          <div
                            style={{
                              fontSize: '10.5px',
                              fontWeight: '700',
                              letterSpacing: '.6px',
                              textTransform: 'uppercase',
                              color: '#64748B',
                              marginBottom: '2px',
                            }}
                          >
                            Date
                          </div>
                          <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220', lineHeight: '1.4', textWrap: 'pretty' }}>
                            {evDate}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '11px', alignItems: 'flex-start', minWidth: '0' }}>
                        <div
                          style={{
                            flex: 'none',
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            background: '#fff',
                            border: '1px solid #E3ECE7',
                            boxSizing: 'border-box',
                            color: '#0F3D2E',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ width: '17px', height: '17px' }}
                          >
                            <circle cx="12" cy="12" r="8.5" />
                            <path d="M12 7.5V12l3 2" />
                          </svg>
                        </div>
                        <div style={{ minWidth: '0' }}>
                          <div
                            style={{
                              fontSize: '10.5px',
                              fontWeight: '700',
                              letterSpacing: '.6px',
                              textTransform: 'uppercase',
                              color: '#64748B',
                              marginBottom: '2px',
                            }}
                          >
                            Time
                          </div>
                          <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220', lineHeight: '1.4', textWrap: 'pretty' }}>
                            {evTime}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '11px', alignItems: 'flex-start', minWidth: '0' }}>
                        <div
                          style={{
                            flex: 'none',
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            background: '#fff',
                            border: '1px solid #E3ECE7',
                            boxSizing: 'border-box',
                            color: '#0F3D2E',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ width: '17px', height: '17px' }}
                          >
                            <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
                            <circle cx="12" cy="10" r="2.3" />
                          </svg>
                        </div>
                        <div style={{ minWidth: '0' }}>
                          <div
                            style={{
                              fontSize: '10.5px',
                              fontWeight: '700',
                              letterSpacing: '.6px',
                              textTransform: 'uppercase',
                              color: '#64748B',
                              marginBottom: '2px',
                            }}
                          >
                            Venue
                          </div>
                          <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220', lineHeight: '1.4', textWrap: 'pretty' }}>
                            {evVenue}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '11px', alignItems: 'flex-start', minWidth: '0' }}>
                        <div
                          style={{
                            flex: 'none',
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            background: '#fff',
                            border: '1px solid #E3ECE7',
                            boxSizing: 'border-box',
                            color: '#0F3D2E',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ width: '17px', height: '17px' }}
                          >
                            <path d="M3.5 8.5V6.5a1.5 1.5 0 0 1 1.5-1.5h14a1.5 1.5 0 0 1 1.5 1.5v2a3.5 3.5 0 0 0 0 7v2a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-2a3.5 3.5 0 0 0 0-7z" />
                            <path d="M14 5v14" strokeDasharray="2 2.5" />
                          </svg>
                        </div>
                        <div style={{ minWidth: '0' }}>
                          <div
                            style={{
                              fontSize: '10.5px',
                              fontWeight: '700',
                              letterSpacing: '.6px',
                              textTransform: 'uppercase',
                              color: '#64748B',
                              marginBottom: '2px',
                            }}
                          >
                            Fee
                          </div>
                          <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220', lineHeight: '1.4', textWrap: 'pretty' }}>
                            {evFee}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                        marginTop: '22px',
                        padding: '16px 0',
                        borderTop: '1px solid #E7E9ED',
                        borderBottom: '1px solid #E7E9ED',
                      }}
                    >
                      <button
                        type="button"
                        onClick={toggleRsvp}
                        style={{
                          background: regBg,
                          color: regColor,
                          border: `1px solid ${regBorder}`,
                          cursor: regCursor,
                          fontFamily: 'inherit',
                          fontWeight: '700',
                          fontSize: '14px',
                          padding: '12px 26px',
                          minHeight: '46px',
                          borderRadius: '10px',
                        }}
                        {...hv(regHover)}
                      >
                        {regLabel}
                      </button>
                      {evCanCal ? (
                        <>
                          <button
                            type="button"
                            onClick={toggleCalendar}
                            style={{
                              fontFamily: 'inherit',
                              fontWeight: '600',
                              fontSize: '13.5px',
                              padding: '12px 18px',
                              minHeight: '46px',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              background: calBg,
                              color: calColor,
                              border: `1px solid ${calBorder}`,
                            }}
                          >
                            {calLabel}
                          </button>
                        </>
                      ) : null}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', minWidth: '0' }}>
                        <div
                          style={{
                            flex: 'none',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: '#EEF4F1',
                            color: '#0F3D2E',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ width: '17px', height: '17px' }}
                          >
                            <circle cx="9" cy="8" r="3.2" />
                            <path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5" />
                            <path d="M15.5 4.9a3.2 3.2 0 0 1 0 6.2M17.5 14.7c1.9.6 3.1 2.2 3.5 4.8" />
                          </svg>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '150px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0B1220', whiteSpace: 'nowrap' }}>{evCount}</div>
                          {evHasCapNote ? (
                            <>
                              <div style={{ height: '5px', borderRadius: '999px', background: '#E7EDEA', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: '999px', background: '#0F8A5F', width: evCapPct }} />
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#64748B' }}>{evCapNote}</div>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {isRegistered ? (
                      <>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            marginTop: '14px',
                            padding: '13px 16px',
                            background: '#EEF6F1',
                            border: '1px solid #CFE3DA',
                            borderRadius: '12px',
                          }}
                        >
                          <div
                            style={{
                              flex: 'none',
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background: '#0F8A5F',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: '700',
                              marginTop: '1px',
                            }}
                          >
                            ✓
                          </div>
                          <div style={{ flex: '1', minWidth: '0' }}>
                            <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#0B3D2A' }}>{regConfirmText}</div>
                            <div style={{ fontSize: '12.5px', color: '#3F5F52', marginTop: '2px', textWrap: 'pretty' }}>
                              {regConfirmSub}
                              {viewRegEmail ? (
                                <>
                                  {' '}
                                  <button
                                    type="button"
                                    onClick={viewRegEmail}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      padding: '0',
                                      fontFamily: 'inherit',
                                      fontSize: 'inherit',
                                      fontWeight: '700',
                                      color: '#0B5A40',
                                      cursor: 'pointer',
                                      textDecoration: 'underline',
                                      textUnderlineOffset: '2px',
                                    }}
                                  >
                                    View email
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={cancelReg}
                            style={{
                              flex: 'none',
                              background: 'none',
                              border: 'none',
                              padding: '4px 2px',
                              fontFamily: 'inherit',
                              fontSize: '12.5px',
                              fontWeight: '700',
                              color: '#64748B',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              textUnderlineOffset: '2px',
                            }}
                          >
                            Cancel registration
                          </button>
                        </div>
                      </>
                    ) : null}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginTop: '28px', maxWidth: '720px' }}>
                      <div>
                        <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: '15px', color: '#0B1220', marginBottom: '12px' }}>
                          About this event
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {(evBody || []).map((p, _i) => (
                            <React.Fragment key={_i}>
                              <div style={{ fontSize: '14px', lineHeight: '1.7', color: '#334155', textWrap: 'pretty' }}>{p.text}</div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      {evHasHighlights ? (
                        <>
                          <div>
                            <div
                              style={{ fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: '15px', color: '#0B1220', marginBottom: '12px' }}
                            >
                              Highlights
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {(evHighlights || []).map((hl, _i) => (
                                <React.Fragment key={_i}>
                                  <div style={{ display: 'flex', gap: '11px', alignItems: 'flex-start' }}>
                                    <svg
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="#0F8A5F"
                                      strokeWidth="2.2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      style={{ width: '16px', height: '16px', flex: 'none', marginTop: '3px' }}
                                    >
                                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                                    </svg>
                                    <div style={{ fontSize: '14px', lineHeight: '1.55', color: '#334155' }}>{hl.text}</div>
                                  </div>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : null}
                      {evHasAgenda ? (
                        <>
                          <div>
                            <div
                              style={{ fontFamily: 'Inter,sans-serif', fontWeight: '700', fontSize: '15px', color: '#0B1220', marginBottom: '12px' }}
                            >
                              Program
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              {(evAgenda || []).map((ag, _i) => (
                                <React.Fragment key={_i}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '72px 14px minmax(0,1fr)', columnGap: '14px' }}>
                                    <div
                                      style={{
                                        fontSize: '12.5px',
                                        fontWeight: '700',
                                        color: '#0F3D2E',
                                        textAlign: 'right',
                                        padding: '1px 0 20px',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {ag.time}
                                    </div>
                                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                                      <div
                                        style={{ position: 'absolute', top: '9px', bottom: '-5px', left: '6px', width: '2px', background: ag.line }}
                                      />
                                      <div
                                        style={{
                                          position: 'relative',
                                          width: '12px',
                                          height: '12px',
                                          borderRadius: '50%',
                                          background: '#fff',
                                          border: '2px solid #0F3D2E',
                                          boxSizing: 'border-box',
                                          marginTop: '3px',
                                        }}
                                      />
                                    </div>
                                    <div style={{ fontSize: '14px', lineHeight: '1.45', color: '#334155', paddingBottom: '20px' }}>{ag.label}</div>
                                  </div>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div style={{ flex: '1 1 320px', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '0' }}>
                  <div style={{ display: 'flex', padding: '3px', background: '#E9EEEB', borderRadius: '11px', gap: '2px' }}>
                    {(evFilters || []).map((f, _i) => (
                      <React.Fragment key={_i}>
                        <button
                          type="button"
                          onClick={f.onClick}
                          style={{
                            flex: '1',
                            minHeight: '36px',
                            border: 'none',
                            borderRadius: '8px',
                            fontFamily: 'inherit',
                            fontSize: '12.5px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            background: f.bg,
                            color: f.color,
                            boxShadow: f.shadow,
                          }}
                        >
                          {f.label}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      color: '#64748B',
                      padding: '4px 2px 0',
                    }}
                  >
                    {evListCount} · soonest first
                  </div>
                  {evListEmpty ? (
                    <>
                      <div
                        style={{
                          padding: '22px 16px',
                          textAlign: 'center',
                          fontSize: '13px',
                          color: '#64748B',
                          background: '#fff',
                          border: '1px dashed #D5DBE1',
                          borderRadius: '14px',
                        }}
                      >
                        No events in this category yet.
                      </div>
                    </>
                  ) : null}
                  {(eventsList || []).map((ev, _i) => (
                    <React.Fragment key={_i}>
                      {ev.pastHeader ? (
                        <>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              fontSize: '11px',
                              fontWeight: '700',
                              letterSpacing: '1px',
                              textTransform: 'uppercase',
                              color: '#64748B',
                              padding: '12px 2px 2px',
                            }}
                          >
                            <span>Past events</span>
                            <span style={{ flex: '1', height: '1px', background: '#E1E6E3' }} />
                          </div>
                        </>
                      ) : null}
                      <div role="button" tabIndex={0} onKeyDown={onActivate(ev.onClick)}
                        onClick={ev.onClick}
                        style={{
                          display: 'flex',
                          gap: '13px',
                          alignItems: 'center',
                          padding: '11px 12px',
                          borderRadius: '14px',
                          cursor: 'pointer',
                          background: ev.cardBg,
                          border: `1px solid ${ev.cardBorder}`,
                          boxShadow: ev.cardShadow,
                          minHeight: '44px',
                        }}
                        {...hv(ev.hover)}
                      >
                        <div
                          style={{
                            flex: 'none',
                            width: '54px',
                            height: '58px',
                            borderRadius: '11px',
                            background: ev.dateBg,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1px',
                          }}
                        >
                          <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.8px', color: ev.dateSub }}>{ev.month}</div>
                          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: '22px', fontWeight: '700', lineHeight: '1', color: ev.dateColor }}>
                            {ev.day}
                          </div>
                        </div>
                        <div style={{ minWidth: '0', flex: '1' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px', flexWrap: 'wrap' }}>
                            <div
                              style={{
                                fontSize: '9.5px',
                                fontWeight: '700',
                                letterSpacing: '.4px',
                                color: ev.kindColor,
                                background: ev.kindBg,
                                padding: '3px 7px',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {ev.kind}
                            </div>
                            {ev.notOpen ? (
                              <>
                                <div style={{ fontSize: '11px', fontWeight: '700', color: ev.statusColor, whiteSpace: 'nowrap' }}>
                                  {ev.statusLabel}
                                </div>
                              </>
                            ) : null}
                          </div>
                          <div
                            style={{
                              fontSize: '13.5px',
                              fontWeight: '700',
                              color: ev.titleColor,
                              lineHeight: '1.35',
                              marginBottom: '3px',
                              textWrap: 'pretty',
                            }}
                          >
                            {ev.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ev.meta}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              {regDlgOpen ? (
                <>
                  <div
                    style={{
                      position: 'fixed',
                      inset: '0',
                      zIndex: '200',
                      background: 'rgba(11,18,32,.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '16px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div role="presentation" onClick={regDlgClose} style={{ position: 'absolute', inset: '0' }} />
                    <div
                      role="dialog"
                      aria-modal="true"
                      style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '480px',
                        maxHeight: 'calc(100vh - 32px)',
                        overflowY: 'auto',
                        background: '#fff',
                        borderRadius: '16px',
                        boxShadow: '0 24px 48px -12px rgba(16,24,40,.28)',
                        fontFamily: 'Inter,system-ui,sans-serif',
                      }}
                    >
                      <div
                        style={{
                          padding: '22px 24px 16px',
                          borderBottom: '1px solid #EEF0F3',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{ flex: '1', minWidth: '0' }}>
                          <div
                            style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              letterSpacing: '.6px',
                              textTransform: 'uppercase',
                              color: '#0F8A5F',
                              marginBottom: '6px',
                            }}
                          >
                            Register for Event
                          </div>
                          <div
                            style={{
                              fontFamily: 'Inter,sans-serif',
                              fontWeight: '700',
                              fontSize: '19px',
                              lineHeight: '1.3',
                              color: '#0B1220',
                              textWrap: 'pretty',
                            }}
                          >
                            {regDlgTitle}
                          </div>
                          <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '5px' }}>{regDlgWhen}</div>
                          <div style={{ fontSize: '12.5px', color: '#64748B' }}>{regDlgVenue}</div>
                        </div>
                        <button
                          type="button"
                          onClick={regDlgClose}
                          aria-label="Close"
                          style={{
                            flex: 'none',
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            border: '1px solid #E7E9ED',
                            background: '#fff',
                            color: '#64748B',
                            fontSize: '18px',
                            lineHeight: '1',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                          }}
                        >
                          ×
                        </button>
                      </div>
                      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {(regDlgFields || []).map((fd, _i) => (
                          <React.Fragment key={_i}>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0B1220', marginBottom: '8px' }}>{fd.label}</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {(fd.options || []).map((op, _i) => (
                                  <React.Fragment key={_i}>
                                    <button
                                      type="button"
                                      onClick={op.onClick}
                                      style={{
                                        minHeight: '42px',
                                        padding: '0 16px',
                                        borderRadius: '10px',
                                        border: `1px solid ${op.border}`,
                                        background: op.bg,
                                        color: op.color,
                                        fontFamily: 'inherit',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {op.label}
                                    </button>
                                  </React.Fragment>
                                ))}
                              </div>
                              {fd.hasHint ? (
                                <>
                                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '7px' }}>{fd.hint}</div>
                                </>
                              ) : null}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                      <div
                        style={{
                          padding: '16px 24px 22px',
                          borderTop: '1px solid #EEF0F3',
                          display: 'flex',
                          gap: '10px',
                          justifyContent: 'flex-end',
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          type="button"
                          onClick={regDlgClose}
                          style={{
                            minHeight: '44px',
                            padding: '0 18px',
                            borderRadius: '10px',
                            border: '1px solid #E2E5EA',
                            background: '#fff',
                            color: '#0B1220',
                            fontFamily: 'inherit',
                            fontSize: '13.5px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={regDlgConfirm}
                          style={{
                            minHeight: '44px',
                            padding: '0 22px',
                            borderRadius: '10px',
                            border: 'none',
                            background: regDlgBtnBg,
                            color: '#fff',
                            fontFamily: 'inherit',
                            fontSize: '13.5px',
                            fontWeight: '700',
                            cursor: regDlgBtnCursor,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Confirm Registration
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
