// SURVEY_RESPONSE + EMPLOYMENT_RECORD. `answers` (jsonb, keyed by surveySectionDefs() ids) is the source of truth for
// re-rendering the form; the typed columns that stats read are filled from it on every submitted save.
import { one } from '../db/index.js';
import { badRequest, conflict } from '../lib/errors.js';
import { cleanAnswers, completionPct, credentialsFrom, deriveEmployment, yesNo } from '../lib/survey.js';
import { audit } from './audit.js';
import { adminIds, deptIds, notify } from './notifications.js';
import { getSettings } from './settings.js';

export const openCycle = (db) => one("SELECT * FROM survey_cycle WHERE status = 'open'", [], db);

export async function getSurvey(db, alumniId) {
  const r = await one(
    `SELECT r.*, c.label AS cycle_label, c.status AS cycle_status FROM survey_response r JOIN v_active_cycle c ON c.cycle_id = r.cycle_id WHERE r.alumni_id = $1`,
    [alumniId], db,
  );
  const cycle = await one('SELECT cycle_id, label, status, closes_on FROM v_active_cycle', [], db);
  return {
    cycle: cycle ? { id: cycle.cycle_id, label: cycle.label, status: cycle.status, closesOn: cycle.closes_on } : null,
    answers: r?.answers || {},
    status: r?.status || 'not_started',
    submitted: r?.status === 'submitted',
    completionPct: r?.completion_pct ?? 0,
    currentSection: r?.current_section ?? 0,
    savedAt: r?.saved_at || null,
    submittedAt: r?.submitted_at || null,
  };
}

async function writeEmployment(db, alumniId, responseId, emp) {
  const cur = await one('SELECT employment_id, response_id FROM employment_record WHERE alumni_id = $1 AND is_current FOR UPDATE', [alumniId], db);
  const cols = ['employment_status', 'job_title', 'employer_name', 'org_type', 'line_of_business', 'occupation_class', 'place_of_work', 'job_status',
    'job_location', 'is_self_employed', 'time_to_job_bucket', 'months_to_first_job', 'course_relevance'];
  const vals = cols.map((c) => emp[c] ?? (c === 'is_self_employed' ? false : null));
  if (cur && Number(cur.response_id) === Number(responseId)) {
    await db.query(`UPDATE employment_record SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(', ')}, reported_at = now() WHERE employment_id = $1`, [cur.employment_id, ...vals]);
    return;
  }
  if (cur) await db.query('UPDATE employment_record SET is_current = false WHERE employment_id = $1', [cur.employment_id]);
  await db.query(
    `INSERT INTO employment_record (alumni_id, response_id, ${cols.join(', ')}) VALUES ($1, $2, ${cols.map((_, i) => `$${i + 3}`).join(', ')})`,
    [alumniId, responseId, ...vals],
  );
}

/** Coverage milestone for the alumnus' college + batch, created once per crossing (dedupe_key). */
async function coverageMilestone(db, alumniId, cycleId) {
  const settings = await getSettings(db);
  const g = await one(
    `SELECT v.college_id, v.batch, c.name AS college_name,
            (SELECT count(*) FROM v_alumni_current x WHERE x.college_id = v.college_id AND x.batch = v.batch)::int AS total,
            (SELECT count(*) FROM v_alumni_current x WHERE x.college_id = v.college_id AND x.batch = v.batch AND x.traced)::int AS traced
       FROM v_alumni_current v JOIN college c ON c.college_id = v.college_id WHERE v.alumni_id = $1`, [alumniId], db,
  );
  if (!g || !g.total) return;
  const rate = (g.traced / g.total) * 100;
  const target = Number(settings.coverage_target);
  const prevRate = ((g.traced - 1) / g.total) * 100;
  if (rate >= target && prevRate < target) {
    const msg = {
      type: 'milestone', link: 'reports', dedupeKey: `coverage:${cycleId}:${g.college_id}:${g.batch}:${target}`,
      title: `Batch ${g.batch} passed ${target}% survey coverage`,
      message: `${g.college_name} · Batch ${g.batch} is now at ${rate.toFixed(1)}% (${g.traced} of ${g.total}). Report data has been refreshed.`,
    };
    await notify(db, [...await adminIds(db), ...await deptIds(db, g.college_id)], msg);
  }
}

/**
 * Save a draft or submit. Once a response is submitted it stays submitted; later saves re-derive the typed columns
 * (employment, credentials) so the stats always match the latest answers.
 */
export async function saveSurvey(db, alumniId, { answers: input, currentSection = 0, submit = false }, actor) {
  const cycle = await openCycle(db);
  if (!cycle) throw conflict('The alumni survey is closed right now.');
  const { answers, errors } = cleanAnswers(input || {});
  if (Object.keys(errors).length) throw badRequest('Some answers need attention.', errors);
  const existing = await one('SELECT response_id, status FROM survey_response WHERE alumni_id = $1 AND cycle_id = $2 FOR UPDATE', [alumniId, cycle.cycle_id], db);
  const submitted = existing?.status === 'submitted' || submit;
  if (submitted && !answers.ever_employed) throw badRequest('Answer "Have you ever been employed?" before submitting.', { ever_employed: 'Select an option.' });
  const pct = completionPct(answers);
  const feedback = [answers.fb_contribute, answers.fb_activity].filter(Boolean).join('\n\n') || null;
  const r = await one(
    `INSERT INTO survey_response (alumni_id, cycle_id, status, completion_pct, current_section, first_gen_grad, passed_udmcat, feedback, answers, saved_at, submitted_at)
     VALUES ($1, $2, $3::response_status, $4, $5, $6, $7, $8, $9, now(), CASE WHEN $3::text = 'submitted' THEN now() END)
     ON CONFLICT (alumni_id, cycle_id) DO UPDATE SET
       status = EXCLUDED.status, completion_pct = EXCLUDED.completion_pct, current_section = EXCLUDED.current_section,
       first_gen_grad = EXCLUDED.first_gen_grad, passed_udmcat = EXCLUDED.passed_udmcat, feedback = EXCLUDED.feedback,
       answers = EXCLUDED.answers, saved_at = now(),
       submitted_at = CASE WHEN EXCLUDED.status = 'submitted' THEN COALESCE(survey_response.submitted_at, now()) END
     RETURNING response_id`,
    [alumniId, cycle.cycle_id, submitted ? 'submitted' : 'draft', pct, Math.max(0, Math.min(10, Number(currentSection) || 0)),
      yesNo(answers.first_grad), yesNo(answers.udmcat), feedback, JSON.stringify(answers)], db,
  );
  if (submitted) {
    await writeEmployment(db, alumniId, r.response_id, deriveEmployment(answers));
    await db.query("DELETE FROM credential WHERE alumni_id = $1 AND type IN ('honor', 'exam')", [alumniId]);
    for (const c of credentialsFrom(answers)) {
      await db.query('INSERT INTO credential (alumni_id, type, title) VALUES ($1, $2, $3)', [alumniId, c.type, c.title.slice(0, 160)]);
    }
    await db.query("UPDATE alumnus SET record_source = 'survey', updated_at = now() WHERE alumni_id = $1", [alumniId]);
    if (existing?.status !== 'submitted') await coverageMilestone(db, alumniId, cycle.cycle_id);
  }
  await audit(db, { actorId: actor.user_id, entityType: 'survey_response', entityId: r.response_id, action: submitted ? (existing?.status === 'submitted' ? 'survey_update' : 'survey_submit') : 'survey_draft', ip: actor.ip });
  return getSurvey(db, alumniId);
}
