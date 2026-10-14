// The accuracy contract (docs/plan-backend.md "Verification"): every screen's numbers come from the same tables.
import { describe, expect, it } from 'vitest';
import { as, collegeId, EMPLOYED, one, register } from './helpers.js';
import { reportBatches } from '../src/services/reports.js';

const B = reportBatches();
const window = `batchFrom=${B.from}&batchTo=${B.to}`;

/** Every view of "how many alumni" the UI shows, for the admin and for the CCS dept user. */
async function totals() {
  const [admin, dept] = await Promise.all([as('admin'), as('dept')]);
  const ccs = await collegeId('CCS');
  const [summary, byCollege, counters, coverage, deptSummary, deptCounters, pop, grain] = await Promise.all([
    admin.get('/stats/summary'), admin.get('/stats/by-program'), admin.get('/stats/counters'), admin.get(`/stats/summary?${window}`),
    dept.get('/stats/summary'), dept.get('/stats/counters'),
    one('SELECT count(*)::int AS n FROM v_alumni_current'), one('SELECT sum(total)::int AS n FROM v_stats_grain'),
  ]);
  const report = await admin.get('/reports/coverage');
  const reportTotal = Number(report.body.rows.at(-1)[1].replace(/,/g, ''));
  const deptReport = await dept.get('/reports/coverage');
  return {
    admin: summary.body.total, sumOfColleges: byCollege.body.rows.reduce((a, r) => a + r.total, 0), recordsActive: counters.body.active,
    population: pop.n, grain: grain.n, reportWindow: coverage.body.total, report: reportTotal,
    dept: deptSummary.body.total, deptRecords: deptCounters.body.active, deptReport: Number(deptReport.body.rows.at(-1)[1].replace(/,/g, '')),
    deptAdminView: (await admin.get(`/stats/summary?collegeId=${ccs}`)).body.total,
    traced: summary.body.traced, employed: summary.body.employed,
  };
}

function expectAgree(t) {
  expect(t.grain).toBe(t.population);
  expect(t.admin).toBe(t.population);
  expect(t.sumOfColleges).toBe(t.admin);
  expect(t.recordsActive).toBe(t.admin);
  expect(t.report).toBe(t.reportWindow);
  expect(t.dept).toBe(t.deptRecords);
  expect(t.dept).toBe(t.deptAdminView);
}

describe('invariants', () => {
  it('admin total = sum of colleges = Records counter = population; Reports = same window; dept agrees with admin', async () => {
    expectAgree(await totals());
  });

  it('traced <= total and employed <= traced in every grouping', async () => {
    const admin = await as('admin');
    for (const group of ['college', 'program', 'batch']) {
      const rows = (await admin.get(`/stats/by-program?group=${group}`)).body.rows;
      for (const r of rows) {
        expect(r.traced).toBeLessThanOrEqual(r.total);
        expect(r.employed).toBeLessThanOrEqual(r.traced);
        expect(r.aligned).toBeLessThanOrEqual(r.employed);
        expect(r.employed + r.furtherStudies + r.notEmployed).toBe(r.traced);
      }
    }
  });

  it('no alumnus has two current employment records (and the index refuses a second one)', async () => {
    expect(await one('SELECT alumni_id FROM employment_record WHERE is_current GROUP BY alumni_id HAVING count(*) > 1')).toBeNull();
    const a = await one('SELECT alumni_id FROM employment_record WHERE is_current LIMIT 1');
    await expect(one("INSERT INTO employment_record (alumni_id, employment_status, is_current) VALUES ($1, 'employed', true)", [a.alumni_id])).rejects.toThrow(/employment_one_current/);
  });

  it('adding one alumnus in Records moves every total by exactly 1', async () => {
    const before = await totals();
    const admin = await as('admin');
    const res = await admin.post('/alumni', { last_name: 'Plus', first_name: 'One', college: 'College of Computing Studies', course: 'Bachelor of Science in Information Technology', year_graduated: B.to });
    expect(res.status).toBe(201);
    const after = await totals();
    expectAgree(after);
    for (const k of ['admin', 'sumOfColleges', 'recordsActive', 'population', 'report', 'dept', 'deptRecords', 'deptReport']) expect(after[k] - before[k], k).toBe(1);
    expect(after.traced).toBe(before.traced);
  });

  it('submitting a survey changes coverage and employment by exactly that person', async () => {
    const { c } = await register({ year_graduated: String(B.to) });
    const before = await totals();
    const res = await c.put('/me/survey', { answers: EMPLOYED, submit: true });
    expect(res.status).toBe(200);
    expect(res.body.submitted).toBe(true);
    const after = await totals();
    expect(after.traced - before.traced).toBe(1);
    expect(after.employed - before.employed).toBe(1);
    expect(after.admin).toBe(before.admin);
    // Re-saving the submitted survey re-derives the same person — no double count.
    await c.put('/me/survey', { answers: { ...EMPLOYED, job_name: 'Senior Engineer' } });
    const again = await totals();
    expect(again.traced).toBe(after.traced);
    expect(again.employed).toBe(after.employed);
    // Changing the answer to "not employed" moves exactly one person out of employed.
    await c.put('/me/survey', { answers: { ever_employed: 'No', unemployed_reason: ['Lack of work experience'] } });
    expect((await totals()).employed).toBe(after.employed - 1);
  });

  it('archived and merged alumni appear in no count', async () => {
    const admin = await as('admin');
    const a = await admin.post('/alumni', { last_name: 'Dup', first_name: 'One', college: 'College of Education', course: 'Bachelor of Physical Education', year_graduated: 2022 });
    const b = await admin.post('/alumni', { last_name: 'Dup', first_name: 'Two', college: 'College of Education', course: 'Bachelor of Physical Education', year_graduated: 2022 });
    const base = await totals();
    expect((await admin.post(`/alumni/${a.body.id}/status`, { action: 'archive' })).body.status).toBe('archived');
    let t = await totals();
    expectAgree(t);
    expect(t.admin).toBe(base.admin - 1);
    expect((await admin.get('/stats/counters')).body.archived).toBeGreaterThan(0);
    await admin.post(`/alumni/${a.body.id}/status`, { action: 'restore' });
    expect((await totals()).admin).toBe(base.admin);
    const m = await admin.post(`/alumni/${a.body.id}/merge`, { intoId: b.body.id });
    expect(m.status).toBe(200);
    t = await totals();
    expectAgree(t);
    expect(t.admin).toBe(base.admin - 1);
    expect((await admin.get(`/alumni?q=${encodeURIComponent('Dup')}`)).body.rows.map((r) => r.id)).not.toContain(a.body.id);
  });

  it('alumni with an unmapped program count once, in their declared college, until mapped', async () => {
    const admin = await as('admin');
    const oth = await collegeId('OTH');
    const before = (await admin.get('/stats/by-program')).body.rows.find((r) => r.key === oth)?.total ?? 0;
    const base = await totals();
    const { user } = await register({ college: 'Others', course: '', course_other: 'BS Customs Administration' });
    const rows = (await admin.get('/stats/by-program')).body.rows;
    expect(rows.find((r) => r.key === oth).total).toBe(before + 1);
    expect((await totals()).admin).toBe(base.admin + 1);
    const unmappedRow = (await admin.get(`/stats/by-program?collegeId=${oth}`)).body.rows.find((r) => r.label === 'Unmapped');
    expect(unmappedRow.total).toBeGreaterThan(0);
    // Mapping moves the person, not copies them.
    const p = await one("SELECT program_id FROM program WHERE code = 'CBA-BSA'");
    await admin.post(`/alumni/${user.alumniId}/map-program`, { programId: p.program_id });
    const t = await totals();
    expectAgree(t);
    expect(t.admin).toBe(base.admin + 1);
    expect((await admin.get('/stats/by-program')).body.rows.find((r) => r.key === oth).total).toBe(before);
  });

  it('event registration counts equal the EVENT_REGISTRATION rows', async () => {
    const alum = await as('alumni');
    const events = (await alum.get('/events')).body;
    for (const e of events) {
      const n = await one('SELECT count(*)::int AS n FROM event_registration WHERE event_id = $1 AND cancelled_at IS NULL', [e.id]);
      expect(e.regCount).toBe(n.n);
    }
  });

  it('every report type renders from the same totals', async () => {
    const admin = await as('admin');
    const t = await totals();
    for (const type of ['ched', 'employability', 'coverage', 'employer', 'inclusion']) {
      const r = await admin.get(`/reports/${type}`);
      expect(r.status, type).toBe(200);
      expect(r.body.kpis).toHaveLength(4);
      expect(r.body.bars.length).toBeGreaterThan(0);
      expect(r.body.findings).toHaveLength(3);
    }
    const ched = (await admin.get('/reports/ched')).body;
    const window = (await admin.get(`/stats/summary?batchFrom=${B.from}&batchTo=${B.to}`)).body;
    expect(Number(ched.kpis[3].value.replace(/,/g, ''))).toBe(window.traced);
    expect(t.traced).toBeGreaterThanOrEqual(window.traced);
  });
});
