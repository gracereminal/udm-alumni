import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResetFlow } from '../../context/ResetFlowContext';
import useNarrow from '../../hooks/useNarrow';
import { hv } from '../../lib/stateStyle';
import { onActivate } from '../../lib/a11y';

const MONO = "'JetBrains Mono',monospace";
const HEAD = "'Plus Jakarta Sans',sans-serif";
const pill = { border: '1px solid #C4CCC8', borderRadius: 18, padding: '8px 20px', fontSize: 13.5, fontWeight: 600, color: '#3E4844' };
const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

const FOLDERS = ['Inbox', 'Starred', 'Sent', 'Drafts', 'Spam'];
const UNREAD_IDS = ['reset', 'hc'];

function buildMessages(to, sentAt) {
  const first = (to.split('@')[0].split(/[._]/)[0] || 'there').replace(/^./, (c) => c.toUpperCase());
  const sent = new Date(sentAt || Date.now() - 120000);
  const tm = sent.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const mins = Math.max(0, Math.round((Date.now() - sent.getTime()) / 60000));
  const ago = mins < 1 ? 'just now' : `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
  const dLong = sent.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const msgs = [
    { id: 'reset', from: 'UDM Alumni', email: 'no-reply@udmalumni.edu', subject: 'Reset your UDM Alumni portal password', preview: 'We received a request to reset the password for your account…', time: tm, stamp: `${tm} (${ago})`, longStamp: `${dLong}, ${tm}`, logo: true },
    { id: 'reg', from: 'UDM Registrar', email: 'registrar@udm.edu.ph', subject: 'Transcript request TR-20811 is ready for pickup', preview: 'Your requested Transcript of Records is ready at Window 3…', time: 'Oct 12', stamp: 'Oct 12, 2026, 3:15 PM', longStamp: 'Mon, Oct 12, 2026, 3:15 PM', initial: 'R', avatarBg: '#6B5B95', body: 'Good afternoon,\n\nYour requested Transcript of Records (TR-20811) is ready for pickup at the Registrar, Window 3, Monday to Friday, 8:00 AM – 4:00 PM. Please bring a valid ID and your claim stub.\n\nOffice of the University Registrar' },
    { id: 'hc', from: 'UDM Alumni', email: 'events@udmalumni.edu', subject: 'Homecoming 2026: registration is now open', preview: 'Reconnect with your batchmates on December 5 at the UDM campus…', time: 'Oct 9', stamp: 'Oct 9, 2026, 10:02 AM', longStamp: 'Fri, Oct 9, 2026, 10:02 AM', logo: true, body: `Hi ${first},\n\nGrand Alumni Homecoming 2026 is happening on December 5 at the UDM campus. Registration is open on the alumni portal under Events.\n\nSee you there!\nUDM Alumni Relations Office` },
    { id: 'cc', from: 'UDM Career Center', email: 'careers@udm.edu.ph', subject: 'New job matches for your program', preview: '3 new openings were posted by partner employers this week…', time: 'Oct 7', stamp: 'Oct 7, 2026, 8:30 AM', longStamp: 'Wed, Oct 7, 2026, 8:30 AM', initial: 'C', avatarBg: '#2F6F8F', body: `Hi ${first},\n\nThree new openings matching your program were posted by partner employers this week. Sign in to the alumni portal and open Jobs to view and apply.\n\nUDM Career Center` },
  ];
  return { first, msgs };
}

/** Demo "Sample Email Inbox" for the password-reset flow. No real email is sent. */
export default function ResetInbox() {
  const navigate = useNavigate();
  const narrow = useNarrow();
  const { flow, patch } = useResetFlow();
  const [selId, setSelId] = useState('reset');
  const [read, setRead] = useState({});
  const [details, setDetails] = useState(false);

  const em = flow.email.trim();
  const to = em.includes('@') ? em : 'maria.delacruz@udmalumni.edu';
  const used = flow.linkUsed;
  const { first, msgs } = buildMessages(to, flow.sentAt);
  const sel = msgs.find((m) => m.id === selId) || msgs[0];
  const isUnread = (m) => m.id !== selId && !read[m.id] && UNREAD_IDS.includes(m.id);
  const unread = msgs.filter(isUnread).length;

  const open = (id) => { setRead((r) => ({ ...r, [selId]: true })); setSelId(id); setDetails(false); };
  const back = (e) => { e.preventDefault(); navigate('/forgot-password'); };
  const resetClick = () => {
    if (used) patch({ step: 5, viaLink: false });
    else patch({ step: 3, viaLink: true, linkUsed: true, email: to });
    navigate('/forgot-password');
  };

  const avatarBg = sel.logo ? '#062A20' : sel.avatarBg;

  return (
    <div data-screen-label="Sample Email Inbox" style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#F4F6F5', fontFamily: 'Inter,system-ui,sans-serif', color: '#1F2523' }}>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 14px', background: '#FDF6DD', borderBottom: '1px solid #EFDFA6', padding: '8px 20px', fontSize: 12.5, color: '#5C4A12' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', background: '#F0C428', color: '#2A2205', borderRadius: 4, padding: '3px 7px' }}>Demo</div>
        <div style={{ flex: 1, minWidth: 200 }}>Simulated mail client for the password reset flow. No account is needed and no real email is sent.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Link status:</div>
          <div tabIndex={0} onKeyDown={onActivate(() => patch({ linkUsed: !used }))}
            role="button" title="Click to toggle" onClick={() => patch({ linkUsed: !used })}
            style={{ whiteSpace: 'nowrap', cursor: 'pointer', fontWeight: 700, borderRadius: 999, padding: '3px 10px', background: used ? '#FBEDEC' : '#E3F1EA', color: used ? '#B3261E' : '#0B5A40' }}
          >
            {used ? 'Used / expired' : 'Active'}
          </div>
        </div>
        <button type="button" className="link-btn" onClick={back} style={{ fontWeight: 700, textDecoration: 'none', color: '#5C4A12', whiteSpace: 'nowrap' }}>← Back to portal</button>
      </div>

      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px', background: '#F4F6F5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: narrow ? 'auto' : 216, flex: 'none' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#2F4A5E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 14, height: 10, border: '2px solid #fff', borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.01em', color: '#2B3330' }}>Mailbox</div>
        </div>
        {narrow ? null : (
          <div style={{ flex: 1, maxWidth: 680, display: 'flex', alignItems: 'center', gap: 10, background: '#E6EAE8', borderRadius: 24, padding: '11px 18px', fontSize: 14, color: '#5F6B66' }}>
            <div style={{ width: 12, height: 12, border: '2px solid #5F6B66', borderRadius: '50%', flex: 'none' }} />
            <div>Search mail</div>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div title={to} style={{ width: 34, height: 34, flex: 'none', borderRadius: '50%', background: '#0B5A40', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{to[0].toUpperCase()}</div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {narrow ? null : (
          <div style={{ flex: 'none', width: 236, padding: '6px 12px 20px 8px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 'fit-content', background: '#D6E6F0', color: '#1B2B36', borderRadius: 16, padding: '16px 22px', fontWeight: 600, fontSize: 14, margin: '0 0 14px 4px', cursor: 'default' }}>
              <div style={{ fontSize: 20, lineHeight: 1, fontWeight: 400 }}>+</div><div>Compose</div>
            </div>
            {FOLDERS.map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px 7px 22px', borderRadius: '0 18px 18px 0', fontSize: 14, background: i === 0 ? '#D6E6F0' : 'transparent', fontWeight: i === 0 ? 700 : 400, color: '#1F2523' }}>
                <div>{label}</div><div style={{ fontSize: 12.5 }}>{i === 0 ? unread || '' : ''}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: narrow ? 'column' : 'row', background: '#fff', borderRadius: '16px 16px 0 0', overflow: 'hidden', marginRight: narrow ? 0 : 12 }}>
          <div style={{ flex: 'none', width: narrow ? 'auto' : 380, maxHeight: narrow ? '34%' : 'none', borderRight: narrow ? 'none' : '1px solid #E3E7E5', borderBottom: narrow ? '1px solid #E3E7E5' : 'none', overflowY: 'auto' }}>
            <div style={{ padding: '14px 18px 10px', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#5F6B66', borderBottom: '1px solid #EEF1EF' }}>Primary</div>
            {msgs.map((m) => {
              const on = m.id === selId;
              const weight = isUnread(m) ? 700 : 400;
              return (
                <div tabIndex={0} onKeyDown={onActivate(() => open(m.id))}
                  key={m.id} role="button" onClick={() => open(m.id)} {...hv({ background: '#F2F6F4' })}
                  style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '12px 18px', borderBottom: '1px solid #EEF1EF', cursor: 'pointer', background: on ? '#EAF3EF' : '#fff', boxShadow: on ? 'inset 3px 0 0 #0B5A40' : 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: weight, ...ellipsis }}>{m.from}</div>
                    <div style={{ flex: 'none', fontSize: 12, fontWeight: weight, color: '#5F6B66' }}>{m.time}</div>
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: weight, ...ellipsis }}>{m.subject}</div>
                  <div style={{ fontSize: 13, color: '#5F6B66', ...ellipsis }}>{m.preview}</div>
                </div>
              );
            })}
          </div>

          <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: narrow ? '18px 16px 40px' : '22px 32px 48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20, paddingLeft: narrow ? 0 : 52 }}>
              <div style={{ fontSize: 22, fontWeight: 500, color: '#1F2523', lineHeight: 1.3, textWrap: 'pretty' }}>{sel.subject}</div>
              <div style={{ fontSize: 12, background: '#E6EAE8', color: '#3E4844', borderRadius: 4, padding: '2px 7px' }}>Inbox</div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 22 }}>
              <div style={{ width: 40, height: 40, flex: 'none', borderRadius: '50%', overflow: 'hidden', background: avatarBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {sel.logo ? <img src="/alumni-logo.png" alt="UDM Alumni" style={{ width: 34, height: 34, objectFit: 'contain' }} /> : <div>{sel.initial}</div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px 8px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{sel.from}</div>
                  <div style={{ fontSize: 12.5, color: '#5F6B66', minWidth: 0, ...ellipsis }}>&lt;{sel.email}&gt;</div>
                  <div style={{ flex: '1 0 0' }} />
                  <div style={{ fontSize: 12.5, color: '#5F6B66', whiteSpace: 'nowrap' }}>{sel.stamp}</div>
                </div>
                <div tabIndex={0} onKeyDown={onActivate(() => setDetails((d) => !d))} role="button" onClick={() => setDetails((d) => !d)} style={{ display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content', fontSize: 12.5, color: '#5F6B66', cursor: 'pointer', marginTop: 2 }}>
                  to {to} <span style={{ fontSize: 9 }}>▼</span>
                </div>
                {details ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: '4px 14px', marginTop: 10, padding: '12px 14px', border: '1px solid #E3E7E5', borderRadius: 8, fontSize: 12.5, boxShadow: '0 4px 14px rgba(0,0,0,.06)', maxWidth: 460 }}>
                    <div style={{ color: '#5F6B66', textAlign: 'right' }}>from:</div><div><strong>{sel.from}</strong> &lt;{sel.email}&gt;</div>
                    <div style={{ color: '#5F6B66', textAlign: 'right' }}>to:</div><div>{to}</div>
                    <div style={{ color: '#5F6B66', textAlign: 'right' }}>date:</div><div>{sel.longStamp}</div>
                    <div style={{ color: '#5F6B66', textAlign: 'right' }}>subject:</div><div>{sel.subject}</div>
                    <div style={{ color: '#5F6B66', textAlign: 'right' }}>security:</div><div>Standard encryption (TLS)</div>
                  </div>
                ) : null}
              </div>
            </div>

            {sel.id === 'reset' ? (
              <div style={{ maxWidth: 600, marginLeft: narrow ? 0 : 52, border: '1px solid #E3E7E5', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#062A20', padding: '18px 28px' }}>
                  <img src="/alumni-logo.png" alt="UDM Alumni seal" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 17, color: '#fff' }}>UDM Alumni</div>
                    <div style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#D9B45A', fontWeight: 700, marginTop: 2 }}>Universidad de Manila</div>
                  </div>
                </div>
                <div style={{ padding: '30px 28px 26px', fontSize: 14.5, lineHeight: 1.6, color: '#2B3330' }}>
                  <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: 22, letterSpacing: '-.4px', color: '#0A1F18', marginBottom: 14 }}>Reset your password</div>
                  <div style={{ marginBottom: 12 }}>Hi {first},</div>
                  <div style={{ marginBottom: 22, textWrap: 'pretty' }}>We received a request to reset the password for your UDM Alumni portal account. Click the button below to choose a new password.</div>
                  <div tabIndex={0} onKeyDown={onActivate(resetClick)} role="button" onClick={resetClick} {...hv({ background: '#062A20' })} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#0B5A40', color: '#fff', borderRadius: 8, padding: '13px 28px', fontWeight: 700, fontSize: 14.5, cursor: 'pointer', marginBottom: 22 }}>Reset Password</div>
                  <div style={{ marginBottom: 8, fontSize: 13.5 }}>Or enter this verification code on the reset page:</div>
                  <div style={{ display: 'inline-block', fontFamily: MONO, fontSize: 20, fontWeight: 700, letterSpacing: '.3em', background: '#F2F8F5', border: '1px solid #CFE3D9', borderRadius: 8, padding: '8px 14px', color: '#0A1F18', marginBottom: 22 }}>482 913</div>
                  <div style={{ fontSize: 13.5, marginBottom: 6, fontWeight: 700, color: '#0A1F18' }}>How to reset</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5, marginBottom: 22 }}>
                    <div>1. Click <strong>Reset Password</strong> above. The link opens the UDM Alumni portal.</div>
                    <div>2. Enter and confirm a new password (8+ characters, one number, one uppercase letter).</div>
                    <div>3. Sign in with your new password.</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#5F6B66', marginBottom: 6 }}>This link expires in <strong style={{ color: '#2B3330' }}>30 minutes</strong> and can only be used once.</div>
                  <div style={{ fontSize: 13, color: '#5F6B66', marginBottom: 6 }}>Button not working? Copy this link into your browser:</div>
                  <div tabIndex={0} onKeyDown={onActivate(resetClick)} role="link" onClick={resetClick} style={{ fontFamily: MONO, fontSize: 12, color: '#0B5A40', wordBreak: 'break-all', cursor: 'pointer', textDecoration: 'underline', marginBottom: 22 }}>https://alumni.udm.edu.ph/reset?token=7f3c9a1e-b24d-4e8a</div>
                  <div style={{ borderTop: '1px solid #E3E7E5', paddingTop: 16, fontSize: 12.5, color: '#5F6B66', textWrap: 'pretty' }}>If you didn&apos;t request a password reset, you can ignore this email — your password won&apos;t change. Never share this email or code with anyone.</div>
                </div>
                <div style={{ background: '#F4F6F5', padding: '14px 28px', fontSize: 11.5, color: '#6B7672', lineHeight: 1.5 }}>
                  UDM Alumni Relations Office · Universidad de Manila, Cecilia Muñoz-Palma St., Ermita, Manila<br />This is an automated message. Please do not reply.
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 600, marginLeft: narrow ? 0 : 52, fontSize: 14.5, lineHeight: 1.65, color: '#2B3330', whiteSpace: 'pre-line' }}>{sel.body}</div>
            )}

            <div style={{ display: 'flex', gap: 10, margin: `26px 0 0 ${narrow ? 0 : 52}px`, flexWrap: 'wrap' }}>
              <div style={pill}>↩ Reply</div>
              <div style={pill}>↪ Forward</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
