// HTML emails. The reset email follows the mockup in client/src/pages/auth/ResetInbox.jsx (the former demo inbox).
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const firstName = (name, email) => esc((String(name || '').trim().split(/\s+/)[0]) || (String(email || '').split('@')[0].split(/[._]/)[0] || 'there').replace(/^./, (c) => c.toUpperCase()));

function layout(appUrl, inner) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#F4F6F5;font-family:Inter,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;border:1px solid #E3E7E5;border-radius:12px;overflow:hidden;background:#fff">
<tr><td style="background:#062A20;padding:18px 28px">
  <img src="${esc(appUrl)}/alumni-logo.png" alt="UDM Alumni seal" width="40" height="40" style="vertical-align:middle;margin-right:12px">
  <span style="display:inline-block;vertical-align:middle"><span style="font-weight:800;font-size:17px;color:#fff">UDM Alumni</span><br>
  <span style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#D9B45A;font-weight:700">Universidad de Manila</span></span>
</td></tr>
<tr><td style="padding:30px 28px 26px;font-size:14.5px;line-height:1.6;color:#2B3330">${inner}</td></tr>
<tr><td style="background:#F4F6F5;padding:14px 28px;font-size:11.5px;color:#6B7672;line-height:1.5">
  UDM Alumni Relations Office · Universidad de Manila, Cecilia Muñoz-Palma St., Ermita, Manila<br>This is an automated message. Please do not reply.
</td></tr></table></body></html>`;
}

const button = (href, text) => `<a href="${esc(href)}" style="display:inline-block;background:#0B5A40;color:#fff;border-radius:8px;padding:13px 28px;font-weight:700;font-size:14.5px;text-decoration:none;margin-bottom:22px">${esc(text)}</a>`;

export function resetPasswordEmail({ appUrl, name, email, link, code }) {
  const first = firstName(name, email);
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  const html = layout(appUrl, `
<div style="font-weight:800;font-size:22px;letter-spacing:-.4px;color:#0A1F18;margin-bottom:14px">Reset your password</div>
<p style="margin:0 0 12px">Hi ${first},</p>
<p style="margin:0 0 22px">We received a request to reset the password for your UDM Alumni portal account. Click the button below to choose a new password.</p>
${button(link, 'Reset Password')}
<div style="margin-bottom:8px;font-size:13.5px">Or enter this verification code on the reset page:</div>
<div style="display:inline-block;font-family:'JetBrains Mono',Consolas,monospace;font-size:20px;font-weight:700;letter-spacing:.3em;background:#F2F8F5;border:1px solid #CFE3D9;border-radius:8px;padding:8px 14px;color:#0A1F18;margin-bottom:22px">${esc(spaced)}</div>
<div style="font-size:13.5px;margin-bottom:6px;font-weight:700;color:#0A1F18">How to reset</div>
<div style="font-size:13.5px;margin-bottom:22px">1. Click <strong>Reset Password</strong> above. The link opens the UDM Alumni portal.<br>
2. Enter and confirm a new password (8+ characters, one number, one uppercase letter).<br>3. Sign in with your new password.</div>
<div style="font-size:13px;color:#5F6B66;margin-bottom:6px">This link expires in <strong style="color:#2B3330">30 minutes</strong> and can only be used once.</div>
<div style="font-size:13px;color:#5F6B66;margin-bottom:6px">Button not working? Copy this link into your browser:</div>
<div style="font-family:Consolas,monospace;font-size:12px;color:#0B5A40;word-break:break-all;margin-bottom:22px">${esc(link)}</div>
<div style="border-top:1px solid #E3E7E5;padding-top:16px;font-size:12.5px;color:#5F6B66">If you didn't request a password reset, you can ignore this email — your password won't change. Never share this email or code with anyone.</div>`);
  const text = `Hi ${first},\n\nWe received a request to reset the password for your UDM Alumni portal account.\n\nReset link: ${link}\nVerification code: ${spaced}\n\nThis link expires in 30 minutes and can only be used once.\nIf you didn't request a password reset, you can ignore this email.`;
  return { subject: 'Reset your UDM Alumni portal password', html, text };
}

export function outreachEmail({ appUrl, name, collegeName }) {
  const first = firstName(name);
  const link = `${appUrl}/signin`;
  const html = layout(appUrl, `
<div style="font-weight:800;font-size:22px;letter-spacing:-.4px;color:#0A1F18;margin-bottom:14px">Help us hear from you</div>
<p style="margin:0 0 12px">Hi ${first},</p>
<p style="margin:0 0 12px">${esc(collegeName || 'Your college')} is updating its graduate tracer records for this survey cycle, and we haven't received your answers yet.</p>
<p style="margin:0 0 22px">The alumni survey takes about 10 minutes. Your answers help the university report graduate outcomes and plan career support for alumni like you.</p>
${button(link, 'Sign in and answer the survey')}
<div style="font-size:13px;color:#5F6B66">Already answered? Thank you — you can ignore this message. You can update your answers any time from your alumni profile.</div>`);
  const text = `Hi ${first},\n\n${collegeName || 'Your college'} is updating its graduate tracer records and we haven't received your survey answers yet.\nSign in and answer the survey: ${link}\n\nUDM Alumni Relations Office`;
  return { subject: 'Your UDM alumni survey is waiting', html, text };
}
