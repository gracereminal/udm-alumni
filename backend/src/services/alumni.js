// ALUMNUS: one row per person (sync rule 1). Records, Directory, Profile and the Survey are all views of it.
// Every change runs in the caller's transaction and writes RECORD_REVIEW / AUDIT_LOG (sync rule 7).
import { many, one } from '../db/index.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { CIVIL, PWD, SEX, code, label } from '../lib/vocab.js';
import { displayMobile, normalizeMobile, profileErrors } from '../lib/validation.js';
import { audit, recordReview } from './audit.js';
import { hashPassword } from './users.js';
import { adminIds, deptIds, notify } from './notifications.js';

const LINK_FIELDS = ['facebook', 'twitter', 'instagram', 'linkedin'];
const blank = (v) => v == null || String(v).trim() === '';
const t = (v) => (blank(v) ? null : String(v).trim());

/** college name + program name (or a typed "Others" program) -> program_id / declared college. */
export async function resolveProgram(db, collegeName, course, courseOther) {
  const college = await one('SELECT college_id, code, name FROM college WHERE name = $1 OR code = $1', [String(collegeName || '').trim()], db);
  if (!college) throw badRequest('Some fields need attention.', { college: 'Select your college / department.' });
  if (!blank(course)) {
    const p = await one('SELECT program_id, abbr FROM program WHERE college_id = $1 AND (name = $2 OR code = $2) AND is_active', [college.college_id, String(course).trim()], db);
    if (p) return { programId: p.program_id, courseOther: null, declaredCollegeId: null, collegeId: college.college_id, abbr: p.abbr };
    if (college.code !== 'OTH') throw badRequest('Some fields need attention.', { course: 'Select a program from the list, or indicate it under Others.' });
  }
  return { programId: null, courseOther: t(courseOther) || t(course), declaredCollegeId: college.college_id, collegeId: college.college_id, abbr: null };
}

async function nextMembershipId(db, year) {
  const { n } = await one("SELECT nextval('membership_seq') AS n", [], db);
  return `AM-${year}-${String(n).padStart(5, '0')}`;
}

async function writeLinks(db, alumniId, a) {
  for (const platform of LINK_FIELDS) {
    if (!(platform in a)) continue;
    if (blank(a[platform])) await db.query('DELETE FROM social_link WHERE alumni_id = $1 AND platform = $2', [alumniId, platform]);
    else {
      await db.query(
        `INSERT INTO social_link (alumni_id, platform, url) VALUES ($1, $2, $3)
         ON CONFLICT (alumni_id, platform) DO UPDATE SET url = EXCLUDED.url`,
        [alumniId, platform, String(a[platform]).trim()],
      );
    }
  }
}

/** Registration form answers -> ALUMNUS columns. */
function profileColumns(a, prog) {
  return {
    last_name: t(a.last_name), first_name: t(a.first_name), middle_name: t(a.middle_name), suffix: t(a.suffix),
    married_name: a.marital_status === 'Married' ? t(a.married_name) : null,
    birth_date: t(a.dob), sex: code(SEX, a.gender), civil_status: code(CIVIL, a.marital_status),
    present_address: t(a.present_address), permanent_address: t(a.permanent_address), mobile_no: normalizeMobile(a.mobile),
    is_indigenous: a.indigenous === 'Yes', indigenous_group: a.indigenous === 'Yes' ? t(a.indigenous_group) : null,
    pwd_type: a.pwd === 'Yes' ? code(PWD, a.pwd_type) : null,
    program_id: prog.programId, course_other: prog.courseOther, declared_college_id: prog.declaredCollegeId,
    year_graduated: Number(a.year_graduated),
  };
}

export async function registerAlumnus(db, a, req) {
  const errors = profileErrors(a, { requirePassword: true });
  if (a.privacy_consent !== true) errors.privacy_consent = 'Accept the privacy notice to register.';
  if (Object.keys(errors).length) throw badRequest('Some fields need attention.', errors);
  const email = String(a.email).trim();
  if (await one('SELECT 1 FROM user_account WHERE lower(email) = lower($1)', [email], db)) {
    throw conflict('An account with this email already exists.', { fields: { email: 'An account with this email already exists. Sign in or reset your password.' } });
  }
  const prog = await resolveProgram(db, a.college, a.course, a.course_other);
  const name = `${t(a.first_name)} ${t(a.last_name)}`;
  const { user_id: userId } = await one(
    `INSERT INTO user_account (email, password_hash, role, display_name) VALUES ($1, $2, 'alumni', $3) RETURNING user_id`,
    [email, await hashPassword(a.reg_pw ?? a.password), name], db,
  );
  const cols = profileColumns(a, prog);
  const membershipId = await nextMembershipId(db, cols.year_graduated);
  const keys = Object.keys(cols);
  const { alumni_id: alumniId } = await one(
    `INSERT INTO alumnus (user_id, membership_id, record_source, privacy_consent_at, marketing_opt_in, ${keys.join(', ')})
     VALUES ($1, $2, 'self_registration', now(), $3, ${keys.map((_, i) => `$${i + 4}`).join(', ')}) RETURNING alumni_id`,
    [userId, membershipId, a.marketing_opt_in === true, ...keys.map((k) => cols[k])], db,
  );
  await writeLinks(db, alumniId, a);
  await recordReview(db, { alumniId, reviewerId: userId, action: 'create', toStatus: 'pending', reason: 'Self-registration' });
  await audit(db, { actorId: userId, entityType: 'alumnus', entityId: alumniId, action: 'register', details: { membershipId }, ip: req?.ip });
  const who = `${name} (${prog.abbr || 'Unmapped program'} ${cols.year_graduated})`;
  const msg = { type: 'registration', title: 'New alumni registration', message: `${who} registered and is awaiting verification.`, link: 'records' };
  await notify(db, [...await adminIds(db), ...await deptIds(db, prog.collegeId)], msg);
  return { userId, alumniId, membershipId };
}

/** ALUMNUS row (+ email, links, college/program names) -> the form-answer object the client edits (field ids from formDefs). */
export async function profileAnswers(db, alumniId) {
  const r = await one(
    `SELECT a.*, u.email, p.name AS program_name, c.name AS college_name
       FROM alumnus a LEFT JOIN user_account u ON u.user_id = a.user_id
       LEFT JOIN program p ON p.program_id = a.program_id
       LEFT JOIN college c ON c.college_id = COALESCE(p.college_id, a.declared_college_id)
      WHERE a.alumni_id = $1`, [alumniId], db,
  );
  if (!r) throw notFound();
  const links = await many('SELECT platform, url, is_visible FROM social_link WHERE alumni_id = $1', [alumniId], db);
  const a = {
    last_name: r.last_name, first_name: r.first_name, middle_name: r.middle_name || '', suffix: r.suffix || '', married_name: r.married_name || '',
    dob: r.birth_date || '', gender: label(SEX, r.sex), marital_status: label(CIVIL, r.civil_status),
    present_address: r.present_address || '', permanent_address: r.permanent_address || '',
    indigenous: r.privacy_consent_at || r.is_indigenous ? (r.is_indigenous ? 'Yes' : 'No') : '', indigenous_group: r.indigenous_group || '',
    pwd: r.privacy_consent_at || r.pwd_type ? (r.pwd_type ? 'Yes' : 'No') : '', pwd_type: label(PWD, r.pwd_type),
    mobile: displayMobile(r.mobile_no), email: r.email || '',
    college: r.college_name || '', course: r.program_name || '', course_other: r.course_other || '', year_graduated: String(r.year_graduated),
  };
  LINK_FIELDS.forEach((k) => { a[k] = links.find((l) => l.platform === k)?.url || ''; });
  return { a, row: r, links };
}

/** Alumni-side profile save (Edit Profile): same rules as registration (minus the password). */
export async function applyProfile(db, alumniId, input, actor) {
  const { a: before, row } = await profileAnswers(db, alumniId);
  const a = { ...before, ...input };
  const errors = profileErrors(a);
  if (Object.keys(errors).length) throw badRequest('Some fields need attention.', errors);
  if (row.user_id && String(a.email).trim().toLowerCase() !== String(before.email).toLowerCase()) {
    if (await one('SELECT 1 FROM user_account WHERE lower(email) = lower($1) AND user_id <> $2', [a.email.trim(), row.user_id], db)) {
      throw conflict('That email is already used by another account.', { fields: { email: 'That email is already used by another account.' } });
    }
    await db.query('UPDATE user_account SET email = $2, updated_at = now() WHERE user_id = $1', [row.user_id, a.email.trim()]);
  }
  const prog = await resolveProgram(db, a.college, a.course, a.course_other);
  const cols = profileColumns(a, prog);
  const keys = Object.keys(cols);
  await db.query(
    `UPDATE alumnus SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')}, record_source = 'alumni_update', profile_saved_at = now(), updated_at = now()
     WHERE alumni_id = $1`, [alumniId, ...keys.map((k) => cols[k])],
  );
  if (row.user_id) await db.query('UPDATE user_account SET display_name = $2 WHERE user_id = $1', [row.user_id, `${cols.first_name} ${cols.last_name}`]);
  await writeLinks(db, alumniId, a);
  const changes = Object.fromEntries(Object.keys(a).filter((k) => String(a[k] ?? '') !== String(before[k] ?? '')).map((k) => [k, { from: before[k] ?? '', to: a[k] ?? '' }]));
  // Sensitive values are not copied into the change log.
  ['dob', 'pwd_type', 'indigenous_group', 'mobile', 'present_address', 'permanent_address'].forEach((k) => { if (changes[k]) changes[k] = { changed: true }; });
  await recordReview(db, { alumniId, reviewerId: actor.user_id, action: 'edit', changes, reason: 'Profile update' });
  await audit(db, { actorId: actor.user_id, entityType: 'alumnus', entityId: alumniId, action: 'profile_update', details: { fields: Object.keys(changes) }, ip: actor.ip });
  return changes;
}

// --- Staff: Alumni Records ---------------------------------------------------------------------------
const RECORD_SELECT = `
  SELECT a.alumni_id, a.membership_id, a.student_no, a.last_name, a.first_name, a.middle_name, a.year_graduated AS batch,
         a.verification_status, a.archived_at, a.merged_into_id, a.flag_note, a.record_source, a.created_at, a.updated_at,
         a.program_id, a.course_other, COALESCE(p.college_id, a.declared_college_id) AS college_id,
         p.abbr AS program_abbr, p.name AS program_name, c.name AS college_name, c.code AS college_code,
         u.email, a.mobile_no, a.present_address, a.user_id,
         e.employment_status, e.employer_name, e.job_title,
         EXISTS (SELECT 1 FROM survey_response r JOIN v_active_cycle vc ON vc.cycle_id = r.cycle_id WHERE r.alumni_id = a.alumni_id AND r.status = 'submitted') AS traced
    FROM alumnus a
    LEFT JOIN program p ON p.program_id = a.program_id
    LEFT JOIN college c ON c.college_id = COALESCE(p.college_id, a.declared_college_id)
    LEFT JOIN user_account u ON u.user_id = a.user_id
    LEFT JOIN employment_record e ON e.alumni_id = a.alumni_id AND e.is_current`;

export const recordStatus = (r) => (r.archived_at ? 'archived' : r.verification_status);

export function recordRow(r) {
  return {
    id: r.alumni_id, membershipId: r.membership_id, studentNo: r.student_no,
    name: [r.first_name, r.middle_name ? `${r.middle_name[0]}.` : '', r.last_name].filter(Boolean).join(' '),
    lastName: r.last_name, firstName: r.first_name,
    program: r.program_abbr || 'Unmapped', course: r.program_name || r.course_other || '', unmapped: !r.program_id,
    college: r.college_name, collegeId: r.college_id, collegeCode: r.college_code, batch: r.batch,
    employmentStatus: r.employment_status || null, company: r.employer_name || '', jobTitle: r.job_title || '', traced: r.traced,
    email: r.email || '', mobile: displayMobile(r.mobile_no), address: r.present_address || '',
    source: r.record_source, status: recordStatus(r), note: r.flag_note || '', hasAccount: !!r.user_id,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export async function getRecord(db, alumniId) {
  const r = await one(`${RECORD_SELECT} WHERE a.alumni_id = $1`, [alumniId], db);
  if (!r) throw notFound();
  return r;
}

export { RECORD_SELECT };

/** verify | flag | unflag | archive | restore, with RECORD_REVIEW + AUDIT_LOG + a notification to the alumnus. */
export async function changeStatus(db, alumniId, action, reason, actor) {
  const r = await one('SELECT alumni_id, verification_status, archived_at, user_id, merged_into_id FROM alumnus WHERE alumni_id = $1 FOR UPDATE', [alumniId], db);
  if (!r || r.merged_into_id) throw notFound();
  const from = recordStatus(r);
  if (action === 'flag' && blank(reason)) throw badRequest('Add a note explaining what needs to be fixed.', { reason: 'Add a note explaining what needs to be fixed.' });
  const sql = {
    verify: "verification_status = 'verified', flag_note = NULL, archived_at = NULL",
    flag: "verification_status = 'flagged', flag_note = $2, archived_at = NULL",
    unflag: "verification_status = 'pending', flag_note = NULL",
    archive: 'archived_at = now()',
    restore: 'archived_at = NULL',
  }[action];
  if (!sql) throw badRequest('Unknown action.');
  await db.query(`UPDATE alumnus SET ${sql}, updated_at = now() WHERE alumni_id = $1`, action === 'flag' ? [alumniId, String(reason).trim()] : [alumniId]);
  const to = action === 'archive' ? 'archived' : action === 'restore' ? r.verification_status : { verify: 'verified', flag: 'flagged', unflag: 'pending' }[action];
  await recordReview(db, { alumniId, reviewerId: actor.user_id, action, fromStatus: from, toStatus: to, reason: t(reason) });
  await audit(db, { actorId: actor.user_id, entityType: 'alumnus', entityId: alumniId, action: `status_${action}`, details: { from, to }, ip: actor.ip });
  if (['verify', 'flag', 'archive'].includes(action) && r.user_id) {
    const text = {
      verify: ['Your alumni record was verified', 'The Alumni Office verified your record. Thank you for keeping it up to date.'],
      flag: ['Your alumni record needs an update', `The Alumni Office flagged your record: ${String(reason).trim()}`],
      archive: ['Your alumni record was archived', 'Contact the Alumni Office if you think this is a mistake.'],
    }[action];
    await notify(db, [r.user_id], { type: 'record_status', title: text[0], message: text[1], link: 'profile' });
  }
  return { from, to };
}

/** Merge a duplicate into the surviving record. The duplicate keeps its row (merged_into_id) for the audit trail. */
export async function mergeInto(db, sourceId, targetId, actor) {
  if (Number(sourceId) === Number(targetId)) throw badRequest('Choose a different record to merge into.');
  const s = await one('SELECT * FROM alumnus WHERE alumni_id = $1 FOR UPDATE', [sourceId], db);
  const d = await one('SELECT * FROM alumnus WHERE alumni_id = $1 FOR UPDATE', [targetId], db);
  if (!s || !d || s.merged_into_id || d.merged_into_id) throw notFound();
  if (s.user_id && d.user_id) throw conflict('Both records have sign-in accounts. Disable one account before merging.');
  if (s.user_id) {
    await db.query('UPDATE alumnus SET user_id = NULL WHERE alumni_id = $1', [sourceId]);
    await db.query('UPDATE alumnus SET user_id = $2 WHERE alumni_id = $1', [targetId, s.user_id]);
  }
  // Fill identifiers the survivor lacks; move child rows that do not collide.
  for (const col of ['student_no', 'membership_id']) {
    if (!d[col] && s[col]) {
      await db.query(`UPDATE alumnus SET ${col} = NULL WHERE alumni_id = $1`, [sourceId]);
      await db.query(`UPDATE alumnus SET ${col} = $2 WHERE alumni_id = $1`, [targetId, s[col]]);
    }
  }
  await db.query(`UPDATE social_link SET alumni_id = $2 WHERE alumni_id = $1 AND platform NOT IN (SELECT platform FROM social_link WHERE alumni_id = $2)`, [sourceId, targetId]);
  await db.query(`UPDATE survey_response SET alumni_id = $2 WHERE alumni_id = $1 AND cycle_id NOT IN (SELECT cycle_id FROM survey_response WHERE alumni_id = $2)`, [sourceId, targetId]);
  const targetHasCurrent = await one('SELECT 1 FROM employment_record WHERE alumni_id = $1 AND is_current', [targetId], db);
  if (targetHasCurrent) await db.query('UPDATE employment_record SET is_current = false WHERE alumni_id = $1', [sourceId]);
  await db.query('UPDATE employment_record SET alumni_id = $2 WHERE alumni_id = $1', [sourceId, targetId]);
  await db.query('UPDATE credential SET alumni_id = $2 WHERE alumni_id = $1', [sourceId, targetId]);
  await db.query(`UPDATE event_registration SET alumni_id = $2 WHERE alumni_id = $1 AND event_id NOT IN (SELECT event_id FROM event_registration WHERE alumni_id = $2)`, [sourceId, targetId]);
  await db.query('UPDATE outreach_contact SET alumni_id = $2 WHERE alumni_id = $1', [sourceId, targetId]);
  await db.query('UPDATE alumnus SET merged_into_id = $2, updated_at = now() WHERE alumni_id = $1', [sourceId, targetId]);
  await recordReview(db, { alumniId: sourceId, reviewerId: actor.user_id, action: 'merge', fromStatus: recordStatus(s), toStatus: 'merged', changes: { mergedInto: Number(targetId) } });
  await recordReview(db, { alumniId: targetId, reviewerId: actor.user_id, action: 'merge', changes: { absorbed: Number(sourceId) } });
  await audit(db, { actorId: actor.user_id, entityType: 'alumnus', entityId: sourceId, action: 'merge', details: { into: Number(targetId) }, ip: actor.ip });
}

export async function mapProgram(db, alumniId, programId, actor, scopeCollegeId = null) {
  const p = await one('SELECT program_id, college_id, abbr FROM program WHERE program_id = $1', [programId], db);
  if (!p || (scopeCollegeId != null && Number(p.college_id) !== Number(scopeCollegeId))) throw badRequest('Choose a program from your college.', { programId: 'Choose a program from your college.' });
  const before = await one('SELECT program_id, course_other FROM alumnus WHERE alumni_id = $1 FOR UPDATE', [alumniId], db);
  await db.query('UPDATE alumnus SET program_id = $2, course_other = NULL, declared_college_id = NULL, updated_at = now() WHERE alumni_id = $1', [alumniId, programId]);
  await recordReview(db, { alumniId, reviewerId: actor.user_id, action: 'map_program', changes: { from: before.program_id || before.course_other, to: p.abbr } });
  await audit(db, { actorId: actor.user_id, entityType: 'alumnus', entityId: alumniId, action: 'map_program', details: { programId }, ip: actor.ip });
}

/** Staff-created record (Records "Add alumnus", import). No sign-in account. */
export async function createRecord(db, input, actor, source = 'admin_encoded') {
  const errors = {};
  if (blank(input.last_name)) errors.last_name = 'Enter the last name.';
  if (blank(input.first_name)) errors.first_name = 'Enter the first name.';
  const yr = Number(input.year_graduated);
  if (!Number.isInteger(yr) || yr < 1950 || yr > new Date().getFullYear()) errors.year_graduated = 'Enter a valid graduation year.';
  if (!blank(input.mobile) && !normalizeMobile(input.mobile)) errors.mobile = 'Enter a valid mobile number (e.g. 09XX XXX XXXX).';
  if (!blank(input.student_no) && !/^\d{4}-\d{5}-UDM$/i.test(String(input.student_no).trim())) errors.student_no = 'Use the format YYYY-NNNNN-UDM.';
  if (Object.keys(errors).length) throw badRequest('Some fields need attention.', errors);
  const prog = await resolveProgram(db, input.college, input.course, input.course_other);
  if (actor.scopeCollegeId != null && Number(prog.collegeId) !== Number(actor.scopeCollegeId)) throw badRequest('You can only add alumni to your own college.', { college: 'You can only add alumni to your own college.' });
  const membershipId = await nextMembershipId(db, yr);
  const { alumni_id: alumniId } = await one(
    `INSERT INTO alumnus (membership_id, student_no, program_id, course_other, declared_college_id, year_graduated, last_name, first_name, middle_name,
                          mobile_no, present_address, record_source, flag_note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING alumni_id`,
    [membershipId, t(input.student_no)?.toUpperCase() || null, prog.programId, prog.courseOther, prog.declaredCollegeId, yr, t(input.last_name), t(input.first_name),
      t(input.middle_name), normalizeMobile(input.mobile), t(input.address), source, t(input.note)], db,
  );
  await recordReview(db, { alumniId, reviewerId: actor.user_id, action: 'create', toStatus: 'pending', reason: source === 'import' ? 'Imported' : 'Encoded by staff' });
  await audit(db, { actorId: actor.user_id, entityType: 'alumnus', entityId: alumniId, action: source === 'import' ? 'import' : 'create', ip: actor.ip });
  return { alumniId, membershipId };
}

/** Staff edit of a record (Records drawer). Partial; only the listed fields. */
export async function staffUpdate(db, alumniId, input, actor) {
  const before = await getRecord(db, alumniId);
  const sets = [];
  const params = [alumniId];
  const set = (col, v) => { params.push(v); sets.push(`${col} = $${params.length}`); };
  const errors = {};
  if ('last_name' in input) { if (blank(input.last_name)) errors.last_name = 'Enter the last name.'; else set('last_name', t(input.last_name)); }
  if ('first_name' in input) { if (blank(input.first_name)) errors.first_name = 'Enter the first name.'; else set('first_name', t(input.first_name)); }
  if ('middle_name' in input) set('middle_name', t(input.middle_name));
  if ('student_no' in input) {
    if (!blank(input.student_no) && !/^\d{4}-\d{5}-UDM$/i.test(String(input.student_no).trim())) errors.student_no = 'Use the format YYYY-NNNNN-UDM.';
    else set('student_no', t(input.student_no)?.toUpperCase() || null);
  }
  if ('year_graduated' in input) {
    const yr = Number(input.year_graduated);
    if (!Number.isInteger(yr) || yr < 1950 || yr > new Date().getFullYear()) errors.year_graduated = 'Enter a valid graduation year.'; else set('year_graduated', yr);
  }
  if ('mobile' in input) { if (!blank(input.mobile) && !normalizeMobile(input.mobile)) errors.mobile = 'Enter a valid mobile number.'; else set('mobile_no', normalizeMobile(input.mobile)); }
  if ('address' in input) set('present_address', t(input.address));
  if ('note' in input) set('flag_note', t(input.note));
  if ('college' in input || 'course' in input || 'course_other' in input) {
    const prog = await resolveProgram(db, input.college ?? before.college_name, input.course, input.course_other);
    if (actor.scopeCollegeId != null && Number(prog.collegeId) !== Number(actor.scopeCollegeId)) errors.college = 'You can only assign programs from your own college.';
    else { set('program_id', prog.programId); set('course_other', prog.courseOther); set('declared_college_id', prog.declaredCollegeId); }
  }
  if (Object.keys(errors).length) throw badRequest('Some fields need attention.', errors);
  if (!sets.length) return;
  await db.query(`UPDATE alumnus SET ${sets.join(', ')}, updated_at = now() WHERE alumni_id = $1`, params);
  await recordReview(db, { alumniId, reviewerId: actor.user_id, action: 'edit', changes: { fields: Object.keys(input) } });
  await audit(db, { actorId: actor.user_id, entityType: 'alumnus', entityId: alumniId, action: 'staff_edit', details: { fields: Object.keys(input) }, ip: actor.ip });
}
