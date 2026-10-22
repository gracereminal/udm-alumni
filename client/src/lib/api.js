// Fetch wrapper for the UDM Alumni API. Same origin by default (/api/v1, proxied by Vite in development and by
// the Vercel rewrite in production), so the session cookie is first-party.
export const API_BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, message, { fields, code } = {}) {
    super(message);
    this.status = status;
    this.fields = fields || null;
    this.code = code || null;
  }
}

/** Fired on a 401 from any call except the auth endpoints; AuthContext signs the user out locally. */
export const UNAUTHORIZED_EVENT = 'udm:unauthorized';

export async function api(path, { method = 'GET', body, form, signal } = {}) {
  const headers = { 'X-Requested-With': 'XMLHttpRequest' };
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload, credentials: 'include', signal });
  } catch (err) {
    if (err && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Can’t reach the server. Check your connection and try again.');
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    const msg = (data && data.error) || (res.status >= 500 ? 'Something went wrong. Please try again.' : `Request failed (${res.status}).`);
    throw new ApiError(res.status, msg, { fields: data && data.fields, code: data && data.code });
  }
  return data;
}

export const get = (path, opts) => api(path, opts);
export const post = (path, body) => api(path, { method: 'POST', body: body ?? {} });
export const put = (path, body) => api(path, { method: 'PUT', body: body ?? {} });
export const patch = (path, body) => api(path, { method: 'PATCH', body: body ?? {} });
export const del = (path) => api(path, { method: 'DELETE' });

/**
 * Start-up data (GET `path`, passed to `apply`) kept in localStorage, so a returning visitor renders at once from the
 * last copy while the fresh one loads in the background. Resolves when there is data to render; the first visit waits.
 */
export function getCached(path, apply) {
  const key = `udm.cache.v1:${path}`;
  const fresh = get(path).then((data) => {
    apply(data);
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* storage unavailable or full */ }
  });
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved) {
      apply(saved);
      fresh.catch(() => {}); // keep the saved copy if the refresh fails
      return Promise.resolve();
    }
  } catch { /* no usable copy: wait for the API */ }
  return fresh;
}

/** Multipart upload of one file under `field`. */
export function upload(path, field, file, name) {
  const form = new FormData();
  form.append(field, file, name || file.name || 'upload');
  return api(path, { method: 'POST', form });
}

/** Query string from an object, skipping empty / 'all' values. */
export function qs(params) {
  const p = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || v === 'all') return;
    p.set(k, Array.isArray(v) ? v.join(',') : String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** One page of a list endpoint: `{ data, meta: { page, per_page, total } }`. */
export const page = (path, params) => get(`${path}${qs(params)}`);

/** Every row of a list endpoint, reading page after page (per_page is capped at 100 by the API). */
export async function list(path, params = {}) {
  const rows = [];
  for (let p = 1; ; p += 1) {
    const r = await page(path, { ...params, page: p, per_page: 100 });
    const data = Array.isArray(r) ? r : (r && r.data) || [];
    rows.push(...data);
    const total = r && r.meta ? r.meta.total : rows.length;
    if (!data.length || rows.length >= total) return rows;
  }
}

/** data: URL (from lib/files readImage) -> Blob, for uploading a photo picked in a form. */
export function dataUrlToBlob(url) {
  const [head, b64] = String(url).split(',');
  const mime = (/data:([^;]+)/.exec(head) || [])[1] || 'application/octet-stream';
  const bin = atob(b64 || '');
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** localStorage keys from the frontend-only prototype. They are removed once, so stale demo state never shows up. */
const LEGACY_KEYS = [
  'udm.auth.v1', 'udm.accounts.v1', 'udm.demoPasswords.v1', 'udm.records.v1', 'udm.jobs.v1', 'udm.events.v1', 'udm.notif.read.v1',
  'udm.profiles.v1', 'udm.tracer.questions.v1', 'udm.tracer.draft.v1', 'udm.tracer.draft.v1.avatar', 'udm.tracer.draft.v1.avatarName',
];
export function purgeLegacyStorage() {
  try {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    Object.keys(localStorage).filter((k) => k.startsWith('udm.avatar.v1')).forEach((k) => localStorage.removeItem(k));
  } catch { /* storage unavailable */ }
}
