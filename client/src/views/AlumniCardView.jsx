import React from 'react';
import { hv, fv } from '../lib/stateStyle';
import { onBackdrop } from '../lib/a11y';

/* View layer for the "AlumniCard" screen — converted from "Alumni Tracer Mockups.dc.html". */
export default function AlumniCardView(v) {
  const {
    cardCareer,
    cardCtaRef,
    cardHasCareer,
    cardHasJourney,
    cardHasRelevance,
    cardHasRole,
    cardHasSkills,
    cardHasUpdated,
    cardInitials,
    cardJourney,
    cardName,
    cardProgram,
    cardRelBg,
    cardRelColor,
    cardRelGlyph,
    cardRelLabel,
    cardRole,
    cardSkills,
    cardUpdated,
    closeCard,
    openContact,
  } = v;
  return (
    <>
      <div role="presentation"
        data-search-overlay="1"
        onClick={onBackdrop(closeCard)}
        style={{
          position: 'fixed',
          inset: '0',
          zIndex: '305',
          background: 'rgba(0,26,22,.42)',
          backdropFilter: 'blur(3px)',
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
          aria-labelledby="alum-card-name"
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
          <div
            style={{
              background: 'linear-gradient(160deg,#00332B,#004D40)',
              padding: '24px 60px 22px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              position: 'relative',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(240,196,40,.18)',
                border: '1.5px solid rgba(240,196,40,.6)',
                color: '#F0C428',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '19px',
                flex: 'none',
              }}
            >
              {cardInitials}
            </div>
            <div style={{ minWidth: '0', flex: '1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h2
                id="alum-card-name"
                style={{
                  margin: '0',
                  fontSize: '20px',
                  lineHeight: '1.2',
                  fontWeight: '700',
                  color: '#fff',
                  letterSpacing: '-.4px',
                  textWrap: 'pretty',
                }}
              >
                {cardName}
              </h2>
              {cardHasRole ? (
                <>
                  <div style={{ fontSize: '14px', lineHeight: '1.35', fontWeight: '500', color: '#EAF3F1', textWrap: 'pretty' }}>{cardRole}</div>
                </>
              ) : null}
              <div style={{ fontSize: '12.5px', lineHeight: '1.35', color: 'rgba(234,243,241,.72)' }}>{cardProgram}</div>
            </div>
            <button
              type="button"
              onClick={closeCard}
              aria-label="Close profile and return to search"
              title="Back to search (Esc)"
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
                cursor: 'pointer',
                fontSize: '17px',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                transition: 'background-color .15s ease',
              }}
              {...hv({ background: 'rgba(234,243,241,.12)' })}
              {...fv({ boxShadow: 'inset 0 0 0 2px #F0C428' })}
            >
              ✕
            </button>
          </div>
          <div style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {cardHasCareer ? (
              <>
                <section aria-labelledby="alum-sec-career" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3
                    id="alum-sec-career"
                    style={{ margin: '0', fontSize: '11px', fontWeight: '700', letterSpacing: '1.1px', textTransform: 'uppercase', color: '#64748B' }}
                  >
                    Career
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,180px),1fr))', gap: '14px 20px' }}>
                    {(cardCareer || []).map((c, _i) => (
                      <React.Fragment key={_i}>
                        <div style={{ minWidth: '0', display: 'flex', flexDirection: 'column', gap: '3px', gridColumn: c.span }}>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{c.k}</div>
                          <div style={{ fontSize: '14.5px', lineHeight: '1.35', fontWeight: '600', color: '#0B1220', textWrap: 'pretty' }}>{c.v}</div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </section>
              </>
            ) : null}
            {cardHasJourney ? (
              <>
                <section
                  aria-labelledby="alum-sec-journey"
                  style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '20px', borderTop: '1px solid #EEF0F3' }}
                >
                  <h3
                    id="alum-sec-journey"
                    style={{ margin: '0', fontSize: '11px', fontWeight: '700', letterSpacing: '1.1px', textTransform: 'uppercase', color: '#64748B' }}
                  >
                    Career Journey
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,180px),1fr))', gap: '14px 20px' }}>
                    {(cardJourney || []).map((c, _i) => (
                      <React.Fragment key={_i}>
                        <div style={{ minWidth: '0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{c.k}</div>
                          <div style={{ fontSize: '14.5px', lineHeight: '1.35', fontWeight: '600', color: '#0B1220', textWrap: 'pretty' }}>{c.v}</div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  {cardHasRelevance ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>Degree Relevance</div>
                        <div
                          style={{
                            alignSelf: 'flex-start',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '7px 12px 7px 8px',
                            borderRadius: '10px',
                            background: cardRelBg,
                            color: cardRelColor,
                            fontSize: '13.5px',
                            fontWeight: '600',
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: cardRelColor,
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11.5px',
                              fontWeight: '700',
                              flex: 'none',
                            }}
                          >
                            {cardRelGlyph}
                          </span>
                          {cardRelLabel}{' '}
                        </div>
                      </div>
                    </>
                  ) : null}
                </section>
              </>
            ) : null}
            {cardHasSkills ? (
              <>
                <section
                  aria-labelledby="alum-sec-skills"
                  style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '20px', borderTop: '1px solid #EEF0F3' }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
                    <h3
                      id="alum-sec-skills"
                      style={{
                        margin: '0',
                        fontSize: '11px',
                        fontWeight: '700',
                        letterSpacing: '1.1px',
                        textTransform: 'uppercase',
                        color: '#64748B',
                      }}
                    >
                      Skills
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(cardSkills || []).map((k, _i) => (
                      <React.Fragment key={_i}>
                        <button
                          type="button"
                          onClick={k.go}
                          aria-label={`Search alumni with skill ${k.s}`}
                          style={{
                            minHeight: '36px',
                            fontFamily: 'inherit',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#334155',
                            background: '#fff',
                            border: '1px solid #E2E5EA',
                            padding: '6px 13px',
                            borderRadius: '999px',
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'background-color .15s ease,border-color .15s ease,color .15s ease',
                          }}
                          {...hv({ background: '#EEF6F2', borderColor: '#9FBFB1', color: '#0F3D2E' })}
                          {...fv({ boxShadow: '0 0 0 3px rgba(15,107,79,.3)' })}
                        >
                          {k.s}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                </section>
              </>
            ) : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
              <button
                type="button"
                ref={cardCtaRef}
                onClick={openContact}
                aria-haspopup="dialog"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  minHeight: '48px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#0F3D2E',
                  color: '#fff',
                  border: '1px solid #0F3D2E',
                  fontFamily: 'inherit',
                  fontSize: '14.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'background-color .15s ease,box-shadow .15s ease',
                }}
                {...hv({ background: '#0F6B4F' })}
                {...fv({ boxShadow: '0 0 0 3px rgba(15,107,79,.3)' })}
              >
                Contact Alumni
              </button>
              {cardHasUpdated ? (
                <>
                  <div style={{ textAlign: 'center', fontSize: '11.5px', color: '#94A3B8' }}>Last updated {cardUpdated}</div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
