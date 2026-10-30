import React from 'react';
import { hv, fv } from '../lib/stateStyle';
import { onBackdrop } from '../lib/a11y';
import { initials } from '../lib/format';

/* View layer for the "ContactModal" screen — per "UDM Alumni.dc.html" (green header with the alumnus' initials, bordered method rows). */
export default function ContactModalView(v) {
  const { cardName, closeContact, contactCloseRef, contactCountLabel, contactFirst, contactHas, contactList, contactNone } = v;
  // Optional (staff outreach): an editable message sent through the chosen channel, a custom footnote / empty state, and an undo action.
  const { contactMessage, onContactMessage, contactMessageHint, contactFootnote, contactNoneText, contactUndo } = v;
  return (
    <>
      <div role="presentation"
        data-search-overlay="1"
        onClick={onBackdrop(closeContact)}
        style={{
          position: 'fixed',
          inset: '0',
          zIndex: '310',
          background: 'rgba(0,26,22,.42)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          boxSizing: 'border-box',
          fontFamily: 'var(--udm-sans)',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-title"
          style={{
            width: '100%',
            maxWidth: '460px',
            maxHeight: 'calc(100vh - 32px)',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            background: '#fff',
            borderRadius: '18px',
            boxShadow: '0 30px 80px -20px rgba(0,26,22,.55)',
          }}
        >
          <div style={{ background: 'linear-gradient(160deg,#00332B,#004D40)', padding: '24px 60px 22px 24px', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
            <div
              aria-hidden="true"
              style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(240,196,40,.18)', border: '1.5px solid rgba(240,196,40,.6)', color: '#F0C428', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '19px', flex: 'none' }}
            >
              {initials(cardName)}
            </div>
            <div style={{ minWidth: '0', flex: '1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h2 id="contact-title" style={{ margin: '0', fontSize: '20px', lineHeight: '1.2', fontWeight: '700', color: '#fff', letterSpacing: '-.4px', textWrap: 'pretty' }}>
                Contact {cardName}
              </h2>
              <div style={{ fontSize: '12.5px', lineHeight: '1.35', color: 'rgba(234,243,241,.72)' }}>{contactCountLabel}</div>
            </div>
            <button
              type="button"
              ref={contactCloseRef}
              onClick={closeContact}
              aria-label="Close contact options"
              title="Back to profile (Esc)"
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EAF3F1',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '17px',
                outline: 'none',
                transition: 'background-color .15s ease',
              }}
              {...hv({ background: 'rgba(234,243,241,.12)' })}
              {...fv({ boxShadow: 'inset 0 0 0 2px #F0C428' })}
            >
              ✕
            </button>
          </div>
          {onContactMessage ? (
            <div style={{ padding: '16px 24px 4px' }}>
              <label htmlFor="contact-message" style={{ display: 'block', fontSize: '11px', fontWeight: '700', letterSpacing: '1.1px', textTransform: 'uppercase', color: '#64748B', marginBottom: '6px' }}>
                Message
              </label>
              <textarea
                id="contact-message"
                value={contactMessage}
                onChange={onContactMessage}
                rows={5}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', border: '1px solid #E2E5EA', borderRadius: '12px', padding: '10px 12px', fontFamily: 'inherit', fontSize: '13px', lineHeight: '1.5', color: '#0B1220', outline: 'none' }}
                {...fv({ borderColor: '#0F6B4F' })}
              />
              {contactMessageHint ? <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px', lineHeight: '1.45' }}>{contactMessageHint}</div> : null}
            </div>
          ) : null}
          {contactHas ? (
            <div style={{ padding: '16px 24px 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: '700', letterSpacing: '1.1px', textTransform: 'uppercase', color: '#64748B' }}>Shared contact methods</h3>
              {(contactList || []).map((m, _i) => (
                <React.Fragment key={_i}>
                  <a
                    href={m.href}
                    target={m.target}
                    rel="noopener noreferrer"
                    onClick={m.onClick}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      minHeight: '48px',
                      boxSizing: 'border-box',
                      border: '1px solid #E2E5EA',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      color: 'inherit',
                      outline: 'none',
                      transition: 'background-color .15s ease,box-shadow .15s ease',
                    }}
                    {...hv({ background: '#EEF6F2', borderColor: '#9FBFB1' })}
                    {...fv({ boxShadow: '0 0 0 3px rgba(15,107,79,.3)', background: '#EEF6F2' })}
                  >
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        background: m.bg,
                        color: m.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        flex: 'none',
                      }}
                    >
                      {m.glyph}
                    </div>
                    <div style={{ flex: '1', minWidth: '0' }}>
                      <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220' }}>{m.label}</div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748B',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: '1px',
                        }}
                      >
                        {m.value}
                      </div>
                    </div>
                    <div aria-hidden="true" style={{ flex: 'none', fontSize: '13px', color: '#94A3B8' }}>
                      ↗
                    </div>
                  </a>
                </React.Fragment>
              ))}
            </div>
          ) : null}
          {contactNone ? (
            <div style={{ padding: '28px 24px 24px', textAlign: 'center' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#F1F5F3',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontSize: '18px',
                }}
              >
                —
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: '600', color: '#0B1220', marginBottom: '4px' }}>No contact details shared</div>
              <div style={{ fontSize: '12.5px', lineHeight: '1.55', color: '#64748B', textWrap: 'pretty' }}>
                {contactNoneText || `${contactFirst} hasn’t made any contact method visible yet. For official requests, reach out through the UDM Alumni Relations Office.`}
              </div>
            </div>
          ) : null}
          <div
            style={{
              padding: '14px 24px 18px',
              fontSize: '11.5px',
              lineHeight: '1.5',
              color: '#64748B',
              textWrap: 'pretty',
            }}
          >
            {contactUndo ? (
              <button type="button" className="link-btn" onClick={contactUndo.onClick} style={{ display: 'block', fontWeight: '700', fontSize: '12px', marginBottom: '4px' }}>
                {contactUndo.label}
              </button>
            ) : null}
            {contactFootnote || 'Only methods the alumnus chose to make visible are shown. Phone numbers and addresses are never displayed.'}
          </div>
        </div>
      </div>
    </>
  );
}
