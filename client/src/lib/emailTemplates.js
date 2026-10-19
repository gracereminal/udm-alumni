// Renders the shared email templates in /emails (the same files the backend sends through the Gmail API).
// Rules are in emails/README.md: {{ name }} placeholders, <!--if:name-->…<!--endif:name--> blocks, subject = <title>.
import resetHtml from '../../../emails/password-reset.html?raw';
import resetText from '../../../emails/password-reset.txt?raw';
import eventRegHtml from '../../../emails/event-registration.html?raw';
import eventRegText from '../../../emails/event-registration.txt?raw';
import SENDERS from '../../../emails/senders.json';

const TEMPLATES = {
  'password-reset': { html: resetHtml, text: resetText },
  'event-registration': { html: eventRegHtml, text: eventRegText },
};

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const decodeEntities = (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[e]);

function fill(src, vars, html) {
  return src
    .replace(/<!--if:(\w+)-->([\s\S]*?)<!--endif:\1-->/g, (_, k, body) => (vars[k] != null && vars[k] !== '' ? body : ''))
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
      if (!(k in vars)) throw new Error(`Email template placeholder "${k}" has no value`);
      return html ? escapeHtml(vars[k] ?? '') : String(vars[k] ?? '');
    });
}

/**
 * { from, subject, html, text, body } for a template. `from` ({ name, address }) is the From header, which Gmail shows
 * as "UDM Alumni <no-reply@udmalumni.edu>"; `body` is the inner <body> markup for showing the email inside a page.
 */
export function renderEmail(name, vars) {
  const t = TEMPLATES[name];
  if (!t) throw new Error(`Unknown email template "${name}"`);
  const html = fill(t.html, vars, true);
  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
  const body = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/) || [])[1] || html;
  return { from: SENDERS[name], subject: decodeEntities(title.trim()), html, text: fill(t.text, vars, false), body };
}

/** The six-digit reset code as the email shows it ("482 913"). */
export const formatResetCode = (code) => (code ? `${code.slice(0, 3)} ${code.slice(3)}` : '— — —');

/** Deterministic entry-pass code for an event registration, e.g. UDM-HOME-04127 (same rule as the mockup). */
export function entryPassCode(eventId, email) {
  const id = String(eventId).replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase().padEnd(4, 'X');
  const h = [...`${eventId}${email}`].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
  return `UDM-${id}-${String(Math.abs(h) % 100000).padStart(5, '0')}`;
}

/** Absolute URL on this site (emails need absolute links and images). */
export const siteUrl = (path) => `${typeof window !== 'undefined' ? window.location.origin : ''}${path}`;
