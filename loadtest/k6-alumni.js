// Load test for the UDM Alumni API (k6: https://k6.io). Runbook: loadtest/README.md.
//
//   k6 run loadtest/k6-alumni.js                                  # smoke: 1 user per role, 30 s
//   k6 run -e PROFILE=load loadtest/k6-alumni.js                  # ~100 concurrent users, 5 min
//   k6 run -e PROFILE=load -e BASE_URL=https://<staging> loadtest/k6-alumni.js
//
// Never point this at production: it registers new alumni on every run. Signs in with the DemoSeeder accounts, so the
// target needs demo data (DEMO_ALUMNI=3000 for the 3,000-alumni run) and AUTH_RATE_LIMIT raised (every virtual user
// signs in from the same IP). It skips everything that sends email (event RSVP, forgot password).

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = (__ENV.BASE_URL || 'http://localhost:4000').replace(/\/$/, '') + '/api/v1';
const PASSWORD = __ENV.DEMO_PASSWORD || 'demoPass123';
const PROFILE = __ENV.PROFILE || 'smoke';

const ACCOUNTS = {
  alumni: 'maria.delacruz@udmalumni.edu',
  admin: 'admin@udmalumni.edu',
  dept: 'ccs.dean@udmalumni.edu',
};

// Peak shape for a survey launch or homecoming: mostly alumni browsing, a few staff on dashboards and reports,
// and a steady trickle of new registrations.
const PROFILES = {
  smoke: {
    alumni: { executor: 'constant-vus', vus: 1, duration: '30s' },
    admin: { executor: 'constant-vus', vus: 1, duration: '30s' },
    dept: { executor: 'constant-vus', vus: 1, duration: '30s' },
    register: { executor: 'constant-vus', vus: 1, duration: '30s' },
  },
  load: {
    alumni: { executor: 'ramping-vus', stages: [{ duration: '1m', target: 80 }, { duration: '3m', target: 80 }, { duration: '30s', target: 0 }] },
    admin: { executor: 'ramping-vus', stages: [{ duration: '1m', target: 8 }, { duration: '3m', target: 8 }, { duration: '30s', target: 0 }] },
    dept: { executor: 'ramping-vus', stages: [{ duration: '1m', target: 7 }, { duration: '3m', target: 7 }, { duration: '30s', target: 0 }] },
    register: { executor: 'constant-arrival-rate', rate: 30, timeUnit: '1m', duration: '4m30s', preAllocatedVUs: 5, maxVUs: 20 },
  },
};

const shape = PROFILES[PROFILE];
if (!shape) throw new Error(`Unknown PROFILE "${PROFILE}" (use smoke or load).`);

export const options = {
  scenarios: {
    alumni: { ...shape.alumni, exec: 'alumni' },
    admin: { ...shape.admin, exec: 'admin' },
    dept: { ...shape.dept, exec: 'dept' },
    register: { ...shape.register, exec: 'register' },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
    'http_req_duration{scenario:alumni}': ['p(95)<1000'],
    'http_req_duration{name:POST /auth/login}': ['p(95)<2000'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'max'],
  noCookiesReset: true, // keep each VU's session cookie between iterations (k6 clears it by default)
};

const HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };

// A JSON body, not a PHP error page that happens to come back as 200.
const isJson = (r) => String(r.headers['Content-Type'] || '').includes('application/json');

function get(path, name) {
  const res = http.get(BASE + path, { headers: HEADERS, tags: { name: `GET ${name || path}` } });
  check(res, { [`GET ${name || path} 200`]: (r) => r.status === 200 && isJson(r) });
  return res;
}

function post(path, body) {
  return http.post(BASE + path, JSON.stringify(body), { headers: HEADERS, tags: { name: `POST ${path}` } });
}

// One sign-in per virtual user; k6 keeps the session cookie in the VU's cookie jar across iterations.
let signedIn = false;
function signIn(role) {
  if (signedIn) return true;
  const res = post('/auth/login', { identifier: ACCOUNTS[role], password: PASSWORD });
  signedIn = check(res, { 'POST /auth/login 200': (r) => r.status === 200 && isJson(r) });
  if (!signedIn) {
    console.warn(`${role} sign-in failed: ${res.status} ${res.body && res.body.slice(0, 200)}`);
    sleep(5);
  }
  return signedIn;
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const think = () => sleep(1 + Math.random() * 2);

export function alumni() {
  if (!signIn('alumni')) return;
  get('/auth/session');
  get('/me');
  get('/notifications');
  get('/announcements');
  think();
  get('/jobs?page=1&per_page=10', '/jobs');
  think();
  get('/events');
  think();
  get(`/directory?page=1&per_page=12&q=${pick(['santos', 'reyes', 'cruz', 'it', ''])}`, '/directory');
  get('/tracer/questions');
  think();
}

function staffPages() {
  get('/stats/summary');
  get('/stats/counters');
  get('/stats/by-batch');
  get('/stats/by-program');
  get('/notifications');
  think();
  get(`/alumni?page=${1 + Math.floor(Math.random() * 20)}&per_page=20`, '/alumni (page)');
  get(`/alumni?q=${pick(['santos', 'garcia', 'AM-2024', 'accenture', 'bsit'])}&page=1&per_page=20`, '/alumni (search)');
  think();
  get('/stats/unresponsive?page=1&per_page=20', '/stats/unresponsive');
  get(`/reports/${pick(['ched', 'employability', 'coverage', 'employer', 'inclusion'])}`, '/reports/:type');
  think();
}

export function admin() {
  if (!signIn('admin')) return;
  staffPages();
}

export function dept() {
  if (!signIn('dept')) return;
  staffPages();
}

// A new alumnus going through Register as Alumni (lookups for the form, then the final submit).
export function register() {
  get('/lookups');
  const id = `${Date.now()}${__VU}${__ITER}`;
  const res = post('/auth/register', {
    last_name: 'Loadtest', first_name: `User ${__VU}`, middle_name: '', dob: '2001-05-09',
    present_address: '123 Mabini St., Ermita, Manila', permanent_same: true, permanent_address: '',
    gender: pick(['Female', 'Male']), marital_status: 'Single', indigenous: 'No', pwd: 'No',
    mobile: `0917${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`,
    email: `loadtest.${id}@example.com`, facebook: `loadtest.${id}`, linkedin: '',
    college: 'College of Computing Studies', course: 'Bachelor of Science in Information Technology', course_other: '',
    year_graduated: String(2019 + Math.floor(Math.random() * 8)),
    reg_pw: 'Register123', reg_pw2: 'Register123', privacy_consent: true,
  });
  if (!check(res, { 'POST /auth/register 201': (r) => r.status === 201 && isJson(r) })) {
    console.warn(`register failed: ${res.status} ${res.body && res.body.slice(0, 300)}`);
  }
  if (PROFILE === 'smoke') think();
}
