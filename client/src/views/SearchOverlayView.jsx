import React from 'react';
import { hv, fv } from '../lib/stateStyle';
import { onBackdrop } from '../lib/a11y';

/* View layer for the "SearchOverlay" screen — converted from "Alumni Tracer Mockups.dc.html". */
export default function SearchOverlayView(v) {
  const {
    closeSearch,
    searchActiveId,
    searchCountLabel,
    searchEmpty,
    searchInputRef,
    searchKeyDown,
    searchQuery,
    searchRows,
    setSearchQuery,
    srBusy,
    srChipH,
    srChips,
    srClearFilters,
    srClearQuery,
    srDesktop,
    srH,
    srHasFilters,
    srHasQuery,
    srHeadPad,
    srHeading,
    srListRef,
    srLoading,
    srMaxH,
    srMenuLabel,
    srMenuOn,
    srMenuOpts,
    srMobile,
    srNoMatch,
    srNoMatchSub,
    srPad,
    srPlaceholder,
    srRadius,
    srShowChips,
    srSkeletons,
  } = v;
  return (
    <>
      <div role="presentation"
        data-search-overlay="1"
        onClick={onBackdrop(closeSearch)}
        style={{
          position: 'fixed',
          inset: '0',
          zIndex: '300',
          background: 'rgba(0,26,22,.42)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: srPad,
          boxSizing: 'border-box',
          fontFamily: 'Inter,system-ui,sans-serif',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search UDM alumni and accounts"
          style={{
            width: '100%',
            maxWidth: '680px',
            background: '#fff',
            borderRadius: srRadius,
            boxShadow: '0 30px 80px -20px rgba(0,26,22,.55)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: srMaxH,
            height: srH,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: srHeadPad, borderBottom: '1px solid #EEF0F3' }}>
            {srMobile ? (
              <>
                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label="Close search"
                  style={{
                    flex: 'none',
                    width: '44px',
                    height: '44px',
                    marginLeft: '-8px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    color: '#0F3D2E',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                  {...fv({ boxShadow: '0 0 0 3px rgba(15,107,79,.22)' })}
                >
                  ←
                </button>
              </>
            ) : null}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0F3D2E"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ width: '19px', height: '19px', flex: 'none' }}
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={setSearchQuery}
              onKeyDown={searchKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-controls="alumni-results"
              aria-activedescendant={searchActiveId}
              aria-autocomplete="list"
              aria-label="Search alumni of any course or college, and admin and college accounts"
              placeholder={srPlaceholder}
              style={{
                flex: '1',
                width: '100%',
                minWidth: '0',
                height: '44px',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: 'inherit',
                fontSize: '16px',
                color: '#0B1220',
              }}
            />
            {srHasQuery ? (
              <>
                <button
                  type="button"
                  onClick={srClearQuery}
                  aria-label="Clear search"
                  style={{
                    flex: 'none',
                    width: '28px',
                    height: '28px',
                    border: 'none',
                    borderRadius: '50%',
                    background: '#F1F3F5',
                    color: '#64748B',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    outline: 'none',
                  }}
                  {...hv({ background: '#E2E5EA' })}
                  {...fv({ boxShadow: '0 0 0 3px rgba(15,107,79,.22)' })}
                >
                  ✕
                </button>
              </>
            ) : null}
            {srDesktop ? (
              <>
                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label="Close search"
                  style={{
                    flex: 'none',
                    fontFamily: 'inherit',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#64748B',
                    background: '#fff',
                    border: '1px solid #E2E5EA',
                    borderRadius: '7px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                  {...hv({ borderColor: '#CBD5E1', color: '#0B1220' })}
                  {...fv({ boxShadow: '0 0 0 3px rgba(15,107,79,.22)' })}
                >
                  ESC
                </button>
              </>
            ) : null}
          </div>
          {srShowChips ? (
            <>
              <div
                role="group"
                aria-label="Filter alumni"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderBottom: '1px solid #EEF0F3',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                }}
              >
                {(srChips || []).map((c, _i) => (
                  <React.Fragment key={_i}>
                    <button
                      type="button"
                      onClick={c.toggle}
                      aria-expanded={c.expanded}
                      aria-haspopup="listbox"
                      aria-label={c.aria}
                      style={{
                        flex: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        height: srChipH,
                        padding: '0 12px',
                        borderRadius: '999px',
                        border: `1px solid ${c.border}`,
                        background: c.bg,
                        color: c.color,
                        fontFamily: 'inherit',
                        fontSize: '12.5px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        outline: 'none',
                        transition: 'background-color .15s ease,border-color .15s ease',
                      }}
                      {...hv({ borderColor: '#9FBFB1' })}
                      {...fv({ boxShadow: '0 0 0 3px rgba(15,107,79,.22)' })}
                    >
                      {c.label}
                      <span aria-hidden="true" style={{ fontSize: '9px', opacity: '.75' }}>
                        {c.caret}
                      </span>
                    </button>
                  </React.Fragment>
                ))}
                {srHasFilters ? (
                  <>
                    <button
                      type="button"
                      onClick={srClearFilters}
                      style={{
                        flex: 'none',
                        height: srChipH,
                        padding: '0 10px',
                        border: 'none',
                        background: 'transparent',
                        color: '#0F6B4F',
                        fontFamily: 'inherit',
                        fontSize: '12.5px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        borderRadius: '8px',
                        outline: 'none',
                      }}
                      {...hv({ textDecoration: 'underline' })}
                      {...fv({ boxShadow: '0 0 0 3px rgba(15,107,79,.22)' })}
                    >
                      Clear all
                    </button>
                  </>
                ) : null}
              </div>
            </>
          ) : null}
          {srMenuOn ? (
            <>
              <div style={{ padding: '12px 16px 14px', borderBottom: '1px solid #EEF0F3', background: '#F8FAF9' }}>
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: '700',
                    letterSpacing: '1.1px',
                    textTransform: 'uppercase',
                    color: '#64748B',
                    marginBottom: '8px',
                  }}
                >
                  {srMenuLabel}
                </div>
                <div role="listbox" aria-label={srMenuLabel} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {(srMenuOpts || []).map((o, _i) => (
                    <React.Fragment key={_i}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={o.sel}
                        onClick={o.pick}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          height: srChipH,
                          padding: '0 11px',
                          borderRadius: '9px',
                          border: `1px solid ${o.border}`,
                          background: o.bg,
                          color: o.color,
                          fontFamily: 'inherit',
                          fontSize: '12.5px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                        {...hv({ borderColor: '#9FBFB1' })}
                        {...fv({ boxShadow: '0 0 0 3px rgba(15,107,79,.22)' })}
                      >
                        {o.check}
                        {o.label}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </>
          ) : null}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', padding: '14px 18px 8px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '1.1px', textTransform: 'uppercase', color: '#64748B' }}>
              {srHeading}
            </div>
            <div aria-live="polite" style={{ fontSize: '12px', color: '#64748B' }}>
              {searchCountLabel}
            </div>
          </div>
          <div
            id="alumni-results"
            ref={srListRef}
            role="listbox"
            aria-label="Alumni results"
            aria-busy={srBusy}
            style={{ flex: '1', minHeight: '0', overflowY: 'auto', padding: '0 10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}
          >
            {srLoading ? (
              <>
                {(srSkeletons || []).map((k, _i) => (
                  <React.Fragment key={_i}>
                    <div
                      aria-hidden="true"
                      style={{ display: 'flex', gap: '12px', padding: '14px 12px', border: '1px solid #F1F3F5', borderRadius: '12px' }}
                    >
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#F1F3F5', flex: 'none' }} />
                      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '2px' }}>
                        <div style={{ width: '42%', height: '11px', borderRadius: '6px', background: '#EEF0F3' }} />
                        <div style={{ width: '64%', height: '9px', borderRadius: '6px', background: '#F3F4F6' }} />
                        <div style={{ width: '30%', height: '9px', borderRadius: '6px', background: '#F3F4F6' }} />
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </>
            ) : null}
            {(searchRows || []).map((r, _i) => (
              <React.Fragment key={_i}>
                <div
                  id={r.domId}
                  role="option"
                  aria-selected={r.selected}
                  aria-label={r.aria}
                  tabIndex={-1}
                  onClick={r.go}
                  onKeyDown={r.keyOpen}
                  onMouseEnter={r.hover}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: '12px',
                    border: `1px solid ${r.border}`,
                    background: r.bg,
                    boxShadow: r.ring,
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'background-color .16s ease,border-color .16s ease,box-shadow .16s ease',
                  }}
                  {...fv({ boxShadow: '0 0 0 3px rgba(15,107,79,.22)' })}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#E6F0EB',
                      color: '#0F3D2E',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: '700',
                      flex: 'none',
                    }}
                  >
                    {r.initials}
                  </div>
                  <div style={{ flex: '1', minWidth: '0' }}>
                    <div
                      style={{
                        fontSize: '14.5px',
                        fontWeight: '650',
                        color: '#0B1220',
                        letterSpacing: '-.1px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {r.name}
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#334155',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {r.role}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>{r.meta}</div>
                    {r.hasTags ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginTop: '8px' }}>
                          {(r.tags || []).map((t, _i) => (
                            <React.Fragment key={_i}>
                              <div
                                style={{
                                  fontSize: '11px',
                                  fontWeight: '500',
                                  color: t.color,
                                  background: t.bg,
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {t.s}
                              </div>
                            </React.Fragment>
                          ))}
                          {r.hasMore ? (
                            <>
                              <div style={{ fontSize: '11px', fontWeight: '500', color: '#64748B', padding: '2px 2px' }}>{r.more}</div>
                            </>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </div>
                  <div style={{ flex: 'none', alignSelf: 'center', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {r.kbd ? (
                      <>
                        <span
                          aria-hidden="true"
                          style={{
                            fontSize: '10.5px',
                            fontWeight: '700',
                            color: '#475569',
                            background: '#fff',
                            border: '1px solid #E2E5EA',
                            borderBottomWidth: '2px',
                            borderRadius: '5px',
                            padding: '1px 6px',
                            fontFamily: 'inherit',
                          }}
                        >
                          ↵
                        </span>
                      </>
                    ) : null}
                    <div
                      aria-hidden="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        color: r.ctaColor,
                        background: r.ctaBg,
                        padding: '6px 9px',
                        borderRadius: '8px',
                        transition: 'background-color .16s ease,color .16s ease',
                      }}
                    >
                      {srDesktop ? (
                        <>
                          <span>{r.cta}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
            {searchEmpty ? (
              <>
                <div
                  role="status"
                  style={{ padding: '44px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: '#F1F5F3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#64748B"
                      strokeWidth="2"
                      strokeLinecap="round"
                      style={{ width: '20px', height: '20px' }}
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="M20 20l-3.5-3.5" />
                    </svg>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#0B1220' }}>No results found</div>
                  <div style={{ fontSize: '13px', color: '#64748B', textWrap: 'pretty' }}>Try another name, course, college, batch, skill, or account.</div>
                </div>
              </>
            ) : null}
            {srNoMatch ? (
              <>
                <div
                  role="status"
                  style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: '#F1F5F3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#64748B"
                      strokeWidth="2"
                      strokeLinecap="round"
                      style={{ width: '20px', height: '20px' }}
                    >
                      <path d="M4 6h16M7 12h10M10 18h4" />
                    </svg>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#0B1220' }}>No alumni match these filters</div>
                  <div style={{ fontSize: '13px', color: '#64748B', textWrap: 'pretty' }}>{srNoMatchSub}</div>
                  <button
                    type="button"
                    onClick={srClearFilters}
                    style={{
                      marginTop: '10px',
                      height: '40px',
                      padding: '0 16px',
                      borderRadius: '10px',
                      border: '1px solid #D7E3DE',
                      background: '#fff',
                      color: '#0F3D2E',
                      fontFamily: 'inherit',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                    {...hv({ background: '#F3F8F5' })}
                    {...fv({ boxShadow: '0 0 0 3px rgba(15,107,79,.22)' })}
                  >
                    Clear filters
                  </button>
                </div>
              </>
            ) : null}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '10px 18px',
              borderTop: '1px solid #EEF0F3',
              background: '#F8FAF9',
              fontSize: '11.5px',
              color: '#64748B',
              flexWrap: 'wrap',
            }}
          >
            {srDesktop ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        color: '#475569',
                        background: '#fff',
                        border: '1px solid #E2E5EA',
                        borderBottomWidth: '2px',
                        borderRadius: '5px',
                        padding: '1px 6px',
                        fontFamily: 'inherit',
                      }}
                    >
                      ↑
                    </span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        color: '#475569',
                        background: '#fff',
                        border: '1px solid #E2E5EA',
                        borderBottomWidth: '2px',
                        borderRadius: '5px',
                        padding: '1px 6px',
                        fontFamily: 'inherit',
                      }}
                    >
                      ↓
                    </span>
                    Navigate
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        color: '#475569',
                        background: '#fff',
                        border: '1px solid #E2E5EA',
                        borderBottomWidth: '2px',
                        borderRadius: '5px',
                        padding: '1px 6px',
                        fontFamily: 'inherit',
                      }}
                    >
                      ↵
                    </span>
                    Open
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: '700',
                        color: '#475569',
                        background: '#fff',
                        border: '1px solid #E2E5EA',
                        borderBottomWidth: '2px',
                        borderRadius: '5px',
                        padding: '1px 6px',
                        fontFamily: 'inherit',
                      }}
                    >
                      Esc
                    </span>
                    Close
                  </div>
                </div>
              </>
            ) : null}
            <div style={{ flex: '1' }} />
          </div>
        </div>
      </div>
    </>
  );
}
