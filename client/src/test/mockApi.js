import { vi } from 'vitest';
import { setCatalog } from '../data/colleges';

/**
 * Stubs `fetch` with a tiny router for /api/v1. Each route is [method, path, reply]: `path` is a string (exact
 * path, query string ignored) or a RegExp tested against path + query; `reply` is a value (200 JSON body) or a
 * function (req) -> value | { status, body }. The start-up lookups (/lookups, /tracer/questions) answer with the test
 * catalog unless a route overrides them; other unmatched calls answer 404. `calls` records every request.
 */
export function mockApi(routes = []) {
  const calls = [];
  const fetchMock = vi.fn(async (url, init = {}) => {
    const u = new URL(url, 'http://localhost');
    const path = u.pathname.replace(/^\/api\/v1/, '');
    const method = (init.method || 'GET').toUpperCase();
    let body = init.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { /* keep text */ } }
    const req = { method, path, query: Object.fromEntries(u.searchParams), search: u.search, body };
    calls.push(req);
    const hit = [...routes, ...STARTUP_ROUTES].find(([m, p]) => m === method && (p instanceof RegExp ? p.test(path + u.search) : p === path));
    let out = { status: 404, body: { error: 'Not found' } };
    if (hit) {
      const r = typeof hit[2] === 'function' ? await hit[2](req) : hit[2];
      out = r && typeof r === 'object' && 'status' in r && 'body' in r ? r : { status: 200, body: r };
    }
    return new Response(out.body === undefined || out.status === 204 ? null : JSON.stringify(out.body), { status: out.status, headers: { 'Content-Type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fetchMock);
  return {
    calls,
    /** Requests matching method + exact path (query ignored). */
    find: (method, path) => calls.filter((c) => c.method === method && c.path === path),
    last: (method, path) => calls.filter((c) => c.method === method && c.path === path).at(-1),
  };
}

/** A list endpoint's reply: { data, meta: { page, per_page, total } } (one page holding every row). */
export const listOf = (rows, meta = {}) => ({ data: rows, meta: { page: 1, per_page: 100, total: rows.length, ...meta } });

export const USERS = {
  alumni: { id: 11, role: 'alumni', name: 'Ana Cruz', email: 'ana@example.com' },
  dept: { id: 21, role: 'dept', name: 'CCS Dean', collegeId: 1, college: 'College of Computer Studies', collegeCode: 'CCS' },
  admin: { id: 31, role: 'admin', name: 'Alumni Office' },
};

/** GET /auth/session reply for a role, or a 401 when signed out. */
export const session = (role) => ['GET', '/auth/session', role ? { user: USERS[role] } : { status: 401, body: { error: 'Not signed in' } }];

/** A small two-college catalog (BSIT repeats across colleges, as in the real data). */
const TEST_CATALOG = {
    colleges: [
      { id: 1, code: 'CCS', name: 'College of Computer Studies', programs: [{ id: 10, abbr: 'BSIT', name: 'BS Information Technology', collegeId: 1 }, { id: 11, abbr: 'BSCS', name: 'BS Computer Science', collegeId: 1 }] },
      { id: 2, code: 'CET', name: 'College of Engineering and Technology', programs: [{ id: 20, abbr: 'BSIT', name: 'BS Information Technology', collegeId: 2 }, { id: 21, abbr: 'BSCE', name: 'BS Civil Engineering', collegeId: 2 }] },
      { id: 9, code: 'OTH', name: 'Others', programs: [] },
    ],
    targets: { employment: 80, coverage: 60 },
};

export function loadTestCatalog() {
  setCatalog(TEST_CATALOG);
}

/** Lazy pages wait for these (lib/startup.js). */
const STARTUP_ROUTES = [
  ['GET', '/lookups', () => TEST_CATALOG],
  ['GET', '/tracer/questions', () => ({ ov: {}, custom: [], order: {} })],
];
