import React from 'react';
import { hv, fv } from '../lib/stateStyle';
import { onBackdrop } from '../lib/a11y';

/* View layer for the "ContactModal" screen — converted from "Alumni Tracer Mockups.dc.html". */
export default function ContactModalView(v) {
  const { cardName, closeContact, contactCloseRef, contactCountLabel, contactFirst, contactHas, contactList, contactNone } = v;
  return (
    <>
      <div role="presentation"
        data-search-overlay="1"
        onClick={onBackdrop(closeContact)}
        style={{
          position: 'fixed',
          inset: '0',
          zIndex: '310',
          background: 'rgba(0,26,22,.28)',
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
          aria-labelledby="contact-title"
          style={{
            width: '100%',
            maxWidth: '380px',
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 24px 60px -16px rgba(0,26,22,.5)',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px 16px 12px 20px', borderBottom: '1px solid #EEF0F3' }}>
            <div style={{ flex: '1', minWidth: '0' }}>
              <div id="contact-title" style={{ fontSize: '15.5px', fontWeight: '700', color: '#0B1220', letterSpacing: '-.2px' }}>
                Contact {cardName}
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{contactCountLabel}</div>
            </div>
            <button
              type="button"
              ref={contactCloseRef}
              onClick={closeContact}
              aria-label="Close contact options"
              style={{
                flex: 'none',
                width: '30px',
                height: '30px',
                borderRadius: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '15px',
                outline: 'none',
                transition: 'background-color .15s ease',
              }}
              {...hv({ background: '#F1F5F3' })}
              {...fv({ boxShadow: '0 0 0 2px rgba(15,107,79,.4)' })}
            >
              ✕
            </button>
          </div>
          {contactHas ? (
            <>
              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {(contactList || []).map((m, _i) => (
                  <React.Fragment key={_i}>
                    <a
                      href={m.href}
                      target={m.target}
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '11px',
                        textDecoration: 'none',
                        color: 'inherit',
                        outline: 'none',
                        transition: 'background-color .15s ease,box-shadow .15s ease',
                      }}
                      {...hv({ background: '#F6F8F7' })}
                      {...fv({ boxShadow: 'inset 0 0 0 2px rgba(15,107,79,.55)', background: '#EEF6F2' })}
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
            </>
          ) : null}
          {contactNone ? (
            <>
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
                  {contactFirst} hasn’t made any contact method visible yet. For official requests, reach out through the UDM Alumni Relations Office.
                </div>
              </div>
            </>
          ) : null}
          <div
            style={{
              padding: '11px 20px',
              borderTop: '1px solid #EEF0F3',
              background: '#F8FAF9',
              fontSize: '11.5px',
              lineHeight: '1.5',
              color: '#64748B',
              textWrap: 'pretty',
            }}
          >
            Only methods the alumnus chose to make visible are shown. Phone numbers and addresses are never displayed.
          </div>
        </div>
      </div>
    </>
  );
}
