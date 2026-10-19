// External contact channels (Facebook Messenger, email, web links). The portal has no messaging of its own,
// so outreach and applications hand off to these platforms in a new tab or the user's mail app.

const FB_HOSTS = /^(?:https?:\/\/)?(?:www\.|m\.|web\.)?(?:facebook\.com|fb\.com|messenger\.com\/t|m\.me)\/?/i;

/**
 * Messenger chat link for whatever an alumnus typed as their Facebook / Messenger contact:
 * a username, "@username", a facebook.com / fb.com / m.me / messenger.com link, or a profile.php?id= link.
 * Returns '' when nothing usable was given.
 */
export function messengerUrl(value) {
  let v = String(value || '').trim();
  if (!v) return '';
  const id = v.match(/profile\.php\?(?:[^#]*&)?id=(\d+)/i);
  if (id) return `https://m.me/${id[1]}`;
  v = v.replace(FB_HOSTS, '').replace(/^@/, '').split(/[?#]/)[0].replace(/\/+$/, '');
  // facebook.com/people/Name/123… → the numeric id; otherwise the first path segment is the username.
  const parts = v.split('/').filter(Boolean);
  const handle = parts[0] === 'people' && parts[2] ? parts[2] : parts[0];
  if (!handle || !/^[\w.-]+$/.test(handle)) return '';
  return `https://m.me/${handle}`;
}

/** Short display form of a Messenger link (m.me/handle). */
export const messengerLabel = (value) => messengerUrl(value).replace(/^https:\/\//, '');

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

/** mailto: link with an optional prefilled subject and body. */
export function mailtoUrl(to, subject = '', body = '') {
  const q = [subject && `subject=${encodeURIComponent(subject)}`, body && `body=${encodeURIComponent(body)}`].filter(Boolean).join('&');
  return `mailto:${encodeURIComponent(String(to || '').trim()).replace(/%40/g, '@')}${q ? `?${q}` : ''}`;
}

/** Link for a free-form "apply via" value: an email becomes a mailto:, a web address an https:// link. */
export function applyUrl(value, subject = '') {
  const v = String(value || '').trim();
  if (!v) return '';
  if (isEmail(v)) return mailtoUrl(v, subject);
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return `https://${v}`;
  return '';
}

/**
 * Opens an external link: web links in a new tab (the portal stays open), mailto: in the user's mail app.
 * Uses a temporary <a> so the browser treats it as a user-initiated navigation (no popup blocker).
 */
export function openExternal(url) {
  if (!url) return false;
  try {
    const a = document.createElement('a');
    a.href = url;
    if (!/^mailto:/i.test(url)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch {
    return false;
  }
}

/** Copies text to the clipboard (Messenger links can't carry a prefilled message). Resolves to true on success. */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through to the textarea fallback */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
