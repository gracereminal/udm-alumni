import request from 'supertest';
import { createApp } from '../src/app.js';
import { many, one, pool } from '../src/db/index.js';
import { DEMO_PASSWORD } from '../seed/demo.js';

export const app = createApp();
export { many, one, pool };
export const DEMO = { admin: 'admin@udmalumni.edu', dept: 'ccs.dean@udmalumni.edu', alumni: 'maria.delacruz@udmalumni.edu' };

/** Supertest agent (keeps cookies) with the API prefix and the CSRF header on writes. */
export function client(agent = request.agent(app)) {
  const w = (m) => (p, body) => agent[m](`/api/v1${p}`).set('X-Requested-With', 'XMLHttpRequest').send(body);
  return { agent, get: (p) => agent.get(`/api/v1${p}`), post: w('post'), put: w('put'), patch: w('patch'), del: w('delete') };
}

export async function login(identifier, password = DEMO_PASSWORD) {
  const c = client();
  const res = await c.post('/auth/login', { identifier, password });
  if (res.status !== 200) throw new Error(`login ${identifier} failed: ${res.status} ${JSON.stringify(res.body)}`);
  return c;
}
export const as = (role) => login(DEMO[role]);

let seq = 0;
/** Registration form answers (field ids from client/src/data/formDefs.js). */
export function regForm(over = {}) {
  seq += 1;
  const tag = `${Date.now().toString(36)}${seq}`;
  return {
    privacy_consent: true, last_name: 'Tester', first_name: `Alum${seq}`, dob: '2000-01-15', present_address: 'Tondo, Manila', permanent_address: 'Tondo, Manila',
    gender: 'Female', marital_status: 'Single', indigenous: 'No', pwd: 'No', mobile: '0917 555 0101', email: `alum.${tag}@example.com`,
    college: 'College of Computing Studies', course: 'Bachelor of Science in Information Technology', year_graduated: '2024',
    reg_pw: 'Password123', reg_pw2: 'Password123', ...over,
  };
}

export async function register(over = {}) {
  const c = client();
  const form = regForm(over);
  const res = await c.post('/auth/register', form);
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { c, form, user: res.body.user, membershipId: res.body.membershipId };
}

export const EMPLOYED = { ever_employed: 'Yes', job_name: 'Software Engineer', employer: 'Acme PH', job_status: 'Regular or Permanent', org_type: 'Private', business_line: 'Information and communication', time_to_job: '1 to 6 months', job_related: 'Yes', still_working: 'Yes', first_grad: 'Yes' };
export const collegeId = async (code) => (await one('SELECT college_id FROM college WHERE code = $1', [code])).college_id;
export const programId = async (code) => (await one('SELECT program_id FROM program WHERE code = $1', [code])).program_id;
