import { progCode } from './colleges';

export const initials = (name, n = 2) => String(name || '').split(' ').filter(Boolean).map((w) => w[0]).slice(0, n).join('').toUpperCase();

/** "Bachelor of Science in Information Technology" -> "BSIT" */
export const courseCode = (full) => progCode(full);

export const num = (n) => Number(n).toLocaleString('en-US');

export function fmtShortDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

/** ISO yyyy-mm-dd -> "Jun 15, 2024" */
export function fmtIso(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function nowLabel() {
  try {
    return `${new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })} PHT`;
  } catch {
    return 'Just now';
  }
}

/** Uppercase the first letter of every word, leaving the rest as typed ("123 rizal st." -> "123 Rizal St."). Length never changes. */
export const capitalizeWords = (s) => String(s || '').replace(/(^|[\s,.\-/(#])(\p{Ll})/gu, (_, p, c) => p + c.toUpperCase());

/** Address cleanup on blur: collapse spaces, one space after commas, no stray leading/trailing commas, capitalized words. */
export const tidyAddress = (s) =>
  capitalizeWords(
    String(s || '')
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/(,\s*)+/g, ', ')
      .replace(/^[\s,]+|[\s,]+$/g, ''),
  );
