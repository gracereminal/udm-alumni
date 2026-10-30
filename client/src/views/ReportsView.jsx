import { hv } from '../lib/stateStyle';
import NavSidebar from '../components/NavSidebar';
import RangeError from '../components/RangeError';
import SearchPill from '../components/topbar/SearchPill';
import NotificationBell from '../components/topbar/NotificationBell';
import UserChip from '../components/topbar/UserChip';
import { onActivate } from '../lib/a11y';

const CHEVRON = "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22%3E%3Cpath d=%22M2.5 4.5 6 8l3.5-3.5%22 fill=%22none%22 stroke=%22%2364748B%22 stroke-width=%221.6%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E')";
/* Full-width form select of the scope panel. */
const field = {
  width: '100%', fontSize: '13px', fontWeight: '500', color: '#0B1220', appearance: 'none', WebkitAppearance: 'none', minHeight: '42px', padding: '0 36px 0 12px',
  borderRadius: '10px', border: '1px solid #D5DBE3', backgroundColor: '#fff', backgroundImage: CHEVRON, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
  backgroundSize: '12px 12px', fontFamily: 'inherit', textOverflow: 'ellipsis', cursor: 'pointer', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s, box-shadow .15s',
};
const fieldFx = hv({ borderColor: '#9AA6B5' });
const label = { fontSize: '12.5px', fontWeight: '600', color: '#334155' };
const hint = { fontSize: '12px', color: '#64748B', lineHeight: '1.45' };
const panel = { background: '#fff', border: '1px solid #E7E9ED', borderRadius: '16px', boxShadow: '0 1px 2px rgba(16,24,40,.04)', boxSizing: 'border-box', minWidth: '0' };
const h2 = { margin: '0', fontFamily: 'var(--udm-sans)', fontWeight: '600', fontSize: '16px', color: '#0B1220' };
const h4 = { margin: '0', fontSize: '15px', fontWeight: '700', color: '#0B1220' };

/** Numbered step marker ("1", "2", …) in front of a panel heading. */
const Step = ({ n }) => (
  <span aria-hidden="true" style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#0F3D2E', color: '#fff', fontSize: '11.5px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{n}</span>
);
const Options = ({ opts }) => (opts || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>);

/* View layer for the "Reports" screen — converted from the "Reports" screen of "UDM Alumni.dc.html". */
export default function ReportsView(v) {
  const {
    goRecords, rowHover,
    repBars, repChartNote, repChartTitle, repCollegeOpts, repCollegeVal, repCourseDisabled, repCourseOpacity, repCourseOpts, repCourseVal, repDeptCollege, repDesc,
    repExportDisabled, repExportLabel, repExportNow, repExportOpacity, repExporting, repFindings, repFmtOpts, repFmtVal, repFromOpts, repFromVal, repHasTarget,
    repHistory, repHistoryFoot, repIsDept, repKpis, repMetaRows, repNoSections, repNumChart, repNumFind, repNumKpi, repNumTable, repOnCollege, repOnCourse, repOnFmt,
    repOnFrom, repOnTo, repOutputMeta, repPreviewRef, repReset, repScopeNote, repSectionRows, repShowChart, repShowFindings, repShowKpi, repShowTable,
    repTableGrid, repTableHead, repTableRows, repTableTitle, repTargetLabel, repTargetPct, repTemplateCount, repTemplates, repTitle, repToOpts, repToVal,
    repToday, repViewArchive, rangeError,
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
              background: '#fff', border: '1px solid #E7E9ED', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 12px 24px',
              margin: '12px 12px 0', borderRadius: '16px', boxShadow: '0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08)', minHeight: '70px',
              boxSizing: 'border-box', gap: '16px', minWidth: '0',
            }}
          >
            <div style={{ minWidth: '0' }}>
              <div style={{ fontFamily: 'var(--udm-sans)', fontWeight: '700', fontSize: '26px', lineHeight: '1.15', letterSpacing: '-.6px', color: '#0B1220' }}>Reports</div>
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
              margin: '14px 12px 28px', padding: '24px', boxSizing: 'border-box', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '14px',
              fontFamily: 'var(--udm-sans)', background: 'rgba(255,255,255,.55)', border: '1px solid #E7E9ED', borderRadius: '20px', boxShadow: '0 1px 2px rgba(16,24,40,.03)',
            }}
          >
            <div data-m="ws-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', padding: '0 4px 20px', borderBottom: '1px solid #E3E8E5' }}>
              <div style={{ minWidth: '0', maxWidth: '760px' }}>
                <h1 style={{ margin: '0', fontFamily: 'var(--udm-sans)', fontWeight: '700', fontSize: '26px', lineHeight: '1.15', letterSpacing: '-.5px', color: '#0B1220' }}>Reports &amp; Analytics</h1>
                <p style={{ margin: '6px 0 0', fontSize: '14px', lineHeight: '1.55', color: '#475569', textWrap: 'pretty' }}>
                  Generate aggregated reports on graduate employment, survey coverage and inclusion for university and CHED submissions. Choose a report, set its scope, review the
                  preview, then export.
                </p>
                {repIsDept ? (
                  <div style={{ display: 'flex', marginTop: '12px' }}>
                    <span style={{ background: '#FBF3D6', color: '#7A5B00', borderRadius: '99px', padding: '4px 10px', fontSize: '11.5px', fontWeight: '600' }}>Scoped to {repDeptCollege}</span>
                  </div>
                ) : null}
              </div>
              <button type="button" onClick={goRecords}
                style={{ fontFamily: 'inherit', background: '#fff', border: '1px solid #D5DBE3', borderRadius: '10px', padding: '0 14px', minHeight: '40px', fontSize: '13px', fontWeight: '600', color: '#0F172A', cursor: 'pointer' }}
                {...hv({ borderColor: '#9AA6B5' })}
              >
                Manage records
              </button>
            </div>
            <RangeError message={rangeError} />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start', marginTop: '4px' }}>
              <div style={{ flex: '1 1 340px', maxWidth: '100%', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <section aria-labelledby="rep-lib-h" style={{ ...panel, padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Step n="1" />
                    <h2 id="rep-lib-h" style={{ ...h2, flex: '1' }}>Choose a report</h2>
                    <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600' }}>{repTemplateCount}</span>
                  </div>
                  <div role="radiogroup" aria-labelledby="rep-lib-h" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                    {(repTemplates || []).map((t) => (
                      <button key={t.id} type="button" role="radio" aria-checked={t.on} onClick={t.onClick}
                        style={{
                          display: 'flex', gap: '12px', alignItems: 'flex-start', width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: '12px', border: `1px solid ${t.border}`,
                          background: t.bg, boxShadow: t.ring, cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color .15s, background .15s',
                        }}
                        {...hv(t.hover)}
                      >
                        <span aria-hidden="true" style={{ width: '34px', height: '34px', borderRadius: '9px', background: t.iconBg, color: t.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}><path d={t.icon} /></svg>
                        </span>
                        <span style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#0B1220', lineHeight: '1.3' }}>{t.name}</span>
                          <span style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.45', textWrap: 'pretty' }}>{t.short}</span>
                          <span style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '2px' }}>{t.runs}</span>
                        </span>
                        <span aria-hidden="true" style={{ width: '16px', height: '16px', borderRadius: '50%', border: `1.5px solid ${t.dotBorder}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', marginTop: '2px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.dot }} />
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                <section aria-labelledby="rep-cfg-h" style={{ ...panel, padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Step n="2" />
                      <h2 id="rep-cfg-h" style={{ ...h2, flex: '1' }}>Configure scope</h2>
                      <button type="button" onClick={repReset}
                        style={{ fontFamily: 'inherit', border: '0', background: 'none', padding: '4px 2px', fontSize: '12.5px', fontWeight: '600', color: '#0F6B4F', cursor: 'pointer' }}
                        {...hv({ textDecoration: 'underline' })}
                      >
                        Reset
                      </button>
                    </div>
                    <p style={{ margin: '0 0 0 32px', fontSize: '12px', color: '#64748B', lineHeight: '1.45', textWrap: 'pretty' }}>{repScopeNote}</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label htmlFor="rep-college" style={label}>College</label>
                      {repIsDept ? (
                        <>
                          <div id="rep-college" aria-readonly="true" style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #E2E5EA', background: '#F6F7F8', fontSize: '13px', color: '#334155', boxSizing: 'border-box' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: '15px', height: '15px', flex: 'none' }}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                            <span style={{ minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{repDeptCollege}</span>
                          </div>
                          <span style={hint}>College Coordinators can report on their assigned college only.</span>
                        </>
                      ) : (
                        <select id="rep-college" aria-label="Filter by college" value={repCollegeVal} onChange={repOnCollege} style={field} {...fieldFx}>
                          <Options opts={repCollegeOpts} />
                        </select>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label htmlFor="rep-program" style={label}>Program</label>
                      <select id="rep-program" aria-label="Filter by program" value={repCourseVal} onChange={repOnCourse} disabled={repCourseDisabled} style={{ ...field, opacity: repCourseOpacity }} {...fieldFx}>
                        <Options opts={repCourseOpts} />
                      </select>
                      {repCourseDisabled ? <span style={hint}>Select a college to filter by program.</span> : null}
                    </div>
                    <fieldset style={{ border: '0', margin: '0', padding: '0', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <legend style={{ ...label, padding: '0', marginBottom: '6px' }}>Graduation batch range</legend>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', gap: '8px', alignItems: 'center' }}>
                        <select aria-label="Batch from" value={repFromVal} onChange={repOnFrom} style={field} {...fieldFx}><Options opts={repFromOpts} /></select>
                        <span style={{ fontSize: '12.5px', color: '#64748B' }}>to</span>
                        <select aria-label="Batch to" value={repToVal} onChange={repOnTo} style={field} {...fieldFx}><Options opts={repToOpts} /></select>
                      </div>
                    </fieldset>
                  </div>

                  <div style={{ borderTop: '1px solid #EEF0F3', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Step n="3" />
                      <h2 id="rep-sec-h" style={h2}>Report sections</h2>
                    </div>
                    <fieldset aria-labelledby="rep-sec-h" style={{ border: '0', margin: '0', padding: '0', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {(repSectionRows || []).map((s) => (
                        <label key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 6px', borderRadius: '8px', cursor: 'pointer' }} {...hv({ background: '#F6F8F7' })}>
                          <input type="checkbox" checked={s.on} onChange={s.onClick} style={{ width: '17px', height: '17px', margin: '1px 0 0', accentColor: '#0F3D2E', flex: 'none', cursor: 'pointer' }} />
                          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#0B1220' }}>{s.label}</span>
                            <span style={hint}>{s.desc}</span>
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  </div>
                </section>
              </div>

              <section ref={repPreviewRef} aria-labelledby="rep-prev-h" style={{ ...panel, flex: '999 1 600px', maxWidth: '100%', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', padding: '18px 20px' }}>
                  <div style={{ minWidth: '0', flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Step n="4" />
                      <h2 id="rep-prev-h" style={h2}>Preview &amp; export</h2>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: '600', color: '#0F6B4F', background: '#E6F2EC', borderRadius: '99px', padding: '3px 9px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1F9D6B' }} />
                        Live
                      </span>
                    </div>
                    <div style={{ marginLeft: '32px', fontSize: '12.5px', color: '#64748B' }}>{repOutputMeta}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '210px', maxWidth: '100%' }}>
                      <label htmlFor="rep-fmt" style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>Format</label>
                      <select id="rep-fmt" value={repFmtVal} onChange={repOnFmt} style={field} {...fieldFx}><Options opts={repFmtOpts} /></select>
                    </div>
                    <button type="button" onClick={repExportNow} disabled={repExportDisabled} aria-busy={repExporting}
                      style={{ fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '42px', padding: '0 18px', border: '0', borderRadius: '10px', background: '#0F3D2E', color: '#fff', fontSize: '13.5px', fontWeight: '700', cursor: repExportDisabled ? 'default' : 'pointer', opacity: repExportOpacity }}
                      {...hv({ background: '#0B2F23' })}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: '16px', height: '16px' }}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
                      <span>{repExportLabel}</span>
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', margin: '-6px 20px 14px', fontSize: '12px', color: '#64748B' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: '14px', height: '14px', flex: 'none' }}><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /></svg>
                  <span>Reports contain aggregated data only, in accordance with RA 10173.</span>
                </div>
                {repNoSections ? (
                  <div role="status" style={{ margin: '0 20px 14px', padding: '10px 12px', borderRadius: '10px', background: '#FDF6E3', border: '1px solid #F0DFA6', fontSize: '12.5px', color: '#6B5200' }}>
                    Select at least one report section to preview and export.
                  </div>
                ) : null}

                <div style={{ background: '#F2F2EE', borderTop: '1px solid #EEF0F3', padding: '24px' }}>
                  <article aria-label="Report preview"
                    style={{ background: '#fff', border: '1px solid #E2E4DF', borderRadius: '4px', boxShadow: '0 8px 24px -14px rgba(16,24,40,.22)', padding: '36px 40px', maxWidth: '880px', margin: '0 auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '28px', color: '#0B1220' }}
                  >
                    <header style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', paddingBottom: '14px', borderBottom: '2px solid #0F3D2E' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '0' }}>
                          <img src="/alumni-logo.png" alt="UDM Alumni" style={{ width: '40px', height: '40px', objectFit: 'contain', flex: 'none' }} />
                          <div style={{ minWidth: '0' }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F3D2E' }}>Universidad de Manila</div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>Alumni Relations Office</div>
                          </div>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', textAlign: 'right' }}>Preview · {repToday}</div>
                      </div>
                      <div>
                        <h3 style={{ margin: '0', fontFamily: 'var(--udm-sans)', fontSize: '22px', lineHeight: '1.25', fontWeight: '700', letterSpacing: '-.3px', color: '#0B1220', textWrap: 'pretty' }}>{repTitle}</h3>
                        <p style={{ margin: '6px 0 0', fontSize: '13.5px', lineHeight: '1.6', color: '#475569', textWrap: 'pretty' }}>{repDesc}</p>
                      </div>
                      <dl style={{ margin: '0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '12px 20px', padding: '14px 16px', background: '#F8FAF9', border: '1px solid #E7ECE9', borderRadius: '8px' }}>
                        {(repMetaRows || []).map((m) => (
                          <div key={m.k} style={{ minWidth: '0' }}>
                            <dt style={{ fontSize: '11.5px', color: '#64748B' }}>{m.k}</dt>
                            <dd style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: '600', color: '#0B1220', overflowWrap: 'anywhere' }}>{m.v}</dd>
                          </div>
                        ))}
                      </dl>
                    </header>

                    {repNoSections ? <div style={{ padding: '36px 10px', textAlign: 'center', fontSize: '13px', color: '#94A3B8' }}>No sections selected.</div> : null}

                    {repShowKpi ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 style={h4}><span>{repNumKpi}</span> Key indicators</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,160px),1fr))', gap: '1px', background: '#E7E9ED', border: '1px solid #E7E9ED', borderRadius: '8px', overflow: 'hidden' }}>
                          {(repKpis || []).map((k) => (
                            <div key={k.label} style={{ background: '#fff', padding: '14px 16px', minWidth: '0' }}>
                              <div style={{ fontSize: '12px', color: '#64748B' }}>{k.label}</div>
                              <div style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-.4px', color: '#0B1220', marginTop: '4px' }}>{k.value}</div>
                              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{k.sub}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {repShowChart ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                          <h4 style={h4}><span>{repNumChart}</span> {repChartTitle}</h4>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{repChartNote}</div>
                        </div>
                        {repHasTarget ? (
                          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: '#475569' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#0F3D2E' }} />Meets target</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#A9C3B8' }} />Below target</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '16px', borderTop: '1.5px dashed #A8841A' }} />{repTargetLabel}</span>
                          </div>
                        ) : null}
                        <div style={{ position: 'relative', height: '200px', display: 'flex', alignItems: 'flex-end', gap: '14px', padding: '0 6px', borderBottom: '1px solid #CFD6D3', marginTop: '4px' }}>
                          {repHasTarget ? (
                            <div aria-hidden="true" style={{ position: 'absolute', left: '0', right: '0', bottom: repTargetPct, borderTop: '1.5px dashed #A8841A', pointerEvents: 'none', zIndex: '1' }} />
                          ) : null}
                          {(repBars || []).map((b) => (
                            <div key={b.tip} title={b.tip} style={{ flex: '1', minWidth: '0', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                              <div style={{ fontSize: '12px', fontWeight: '700', color: '#0B1220', whiteSpace: 'nowrap' }}>{b.display}</div>
                              <div style={{ width: '100%', maxWidth: '56px', height: b.pct, background: b.color, borderRadius: '4px 4px 0 0' }} />
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '14px', padding: '0 6px' }}>
                          {(repBars || []).map((b) => (
                            <div key={b.tip} title={b.tip} style={{ flex: '1', minWidth: '0', textAlign: 'center', fontSize: '12px', color: '#475569', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {repShowTable ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h4 style={h4}><span>{repNumTable}</span> {repTableTitle}</h4>
                        <div style={{ overflowX: 'auto', border: '1px solid #E2E8E5', borderRadius: '8px' }}>
                          <div role="table" aria-label={repTableTitle} style={{ minWidth: '540px' }}>
                            <div role="row" style={{ display: 'grid', gridTemplateColumns: repTableGrid, gap: '12px', padding: '10px 14px', background: '#F2F6F4', borderBottom: '1px solid #D9E2DE', fontSize: '12px', fontWeight: '700', color: '#1E3A30' }}>
                              {(repTableHead || []).map((c) => <div key={c.v} role="columnheader" style={{ textAlign: c.align }}>{c.v}</div>)}
                            </div>
                            {(repTableRows || []).map((r, ri) => (
                              <div key={ri} role="row" style={{ display: 'grid', gridTemplateColumns: repTableGrid, gap: '12px', padding: '10px 14px', borderBottom: '1px solid #EEF0F3', fontSize: '13px', color: '#334155', background: r.bg, fontVariantNumeric: 'tabular-nums' }}>
                                {(r.cells || []).map((c, ci) => (
                                  <div key={ci} role="cell" style={{ textAlign: c.align, fontWeight: c.weight, color: c.color }}>{c.v}</div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {repShowFindings ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h4 style={{ ...h4, margin: '0 0 6px' }}><span>{repNumFind}</span> Key findings</h4>
                        {(repFindings || []).map((f) => (
                          <div key={f.n} style={{ display: 'grid', gridTemplateColumns: '26px minmax(0,1fr)', gap: '12px', padding: '14px 0', borderTop: '1px solid #E5EAE7' }}>
                            <div aria-hidden="true" style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#FBF3D6', color: '#7A5B00', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{f.n}</div>
                            <div style={{ fontSize: '13.5px', lineHeight: '1.55', color: '#334155', textWrap: 'pretty', paddingTop: '2px' }}>{f.text}</div>
                          </div>
                        ))}
                        <div style={{ fontSize: '12px', color: '#64748B', paddingTop: '8px', borderTop: '1px solid #E5EAE7' }}>Findings are derived from the indicators and tables in this report.</div>
                      </div>
                    ) : null}

                    <footer style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid #E5EAE7', fontSize: '11.5px', color: '#64748B' }}>
                      <span>Source: UDM Graduate Tracer Survey. Aggregated institutional data only — no names, Membership IDs or contact details (RA 10173).</span>
                      <span>{repOutputMeta}</span>
                    </footer>
                  </article>
                </div>
              </section>
            </div>

            <section aria-labelledby="rep-hist-h" style={{ ...panel, marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', padding: '18px 20px 14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '0' }}>
                  <h2 id="rep-hist-h" style={h2}>Generated reports</h2>
                  <p style={{ margin: '0', fontSize: '13px', color: '#64748B', textWrap: 'pretty' }}>
                    Every export is logged with the requesting account and time, and retained for seven years per CHED record-keeping policy. Times in PHT (UTC+8).
                  </p>
                </div>
                <div role="button" tabIndex={0} onKeyDown={onActivate(repViewArchive)} onClick={repViewArchive} style={{ fontSize: '13px', fontWeight: '600', color: '#0F6B4F', cursor: 'pointer', whiteSpace: 'nowrap' }} {...hv({ textDecoration: 'underline' })}>
                  View archive →
                </div>
              </div>
              <div data-m="tscroll" style={{ overflowX: 'auto' }}>
                <div role="table" aria-labelledby="rep-hist-h" style={{ minWidth: '860px' }}>
                  <div role="row" data-m="trow"
                    style={{ display: 'grid', gridTemplateColumns: '2.2fr .7fr 1.1fr 1.3fr .9fr 1.2fr', gap: '12px', padding: '10px 20px', background: '#F8FAF9', borderTop: '1px solid #EEF0F3', borderBottom: '1px solid #EEF0F3', fontSize: '12px', fontWeight: '700', color: '#475569' }}
                  >
                    <div role="columnheader">Report</div>
                    <div role="columnheader">Format</div>
                    <div role="columnheader">Generated by</div>
                    <div role="columnheader">Date</div>
                    <div role="columnheader">Status</div>
                    <div role="columnheader" style={{ textAlign: 'right' }}>Actions</div>
                  </div>
                  {(repHistory || []).map((h, i) => (
                    <div key={i} role="row" data-m="trow"
                      style={{ display: 'grid', gridTemplateColumns: '2.2fr .7fr 1.1fr 1.3fr .9fr 1.2fr', gap: '12px', padding: '13px 20px', borderBottom: '1px solid #EEF0F3', alignItems: 'center' }}
                      {...hv(rowHover)}
                    >
                      <div role="cell" style={{ minWidth: '0' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1220', textWrap: 'pretty' }}>{h.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{h.scope}</div>
                      </div>
                      <div role="cell" style={{ fontSize: '12.5px', fontWeight: '600', color: '#0B1220' }}>
                        {h.fmt}
                        <div style={{ fontSize: '11.5px', fontWeight: '400', color: '#94A3B8' }}>{h.size}</div>
                      </div>
                      <div role="cell" style={{ fontSize: '13px', color: '#475569' }}>{h.by}</div>
                      <div role="cell" style={{ fontSize: '12.5px', color: '#475569' }}>{h.date}</div>
                      <div role="cell">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: h.statusColor, background: h.statusBg, padding: '4px 10px', borderRadius: '99px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: h.statusDot }} />
                          {h.status}
                        </span>
                      </div>
                      <div role="cell" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                        <button type="button" onClick={h.onPreview} aria-label={h.previewLabel}
                          style={{ fontFamily: 'inherit', fontSize: '12.5px', fontWeight: '600', color: '#0F3D2E', background: '#fff', border: '1px solid #D7E3DE', borderRadius: '8px', minHeight: '34px', padding: '0 11px', cursor: 'pointer' }}
                          {...hv({ background: '#F4F8F6' })}
                        >
                          Preview
                        </button>
                        <button type="button" onClick={h.onDownload} aria-label={h.dlLabel}
                          style={{ fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#fff', background: '#0F3D2E', border: '0', borderRadius: '8px', minHeight: '34px', padding: '0 11px', cursor: 'pointer' }}
                          {...hv({ background: '#0B2F23' })}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: '14px', height: '14px' }}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '14px 20px', fontSize: '12px', color: '#64748B' }}>{repHistoryFoot}</div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
