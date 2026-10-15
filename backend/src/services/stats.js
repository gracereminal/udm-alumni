// The only place statistics are computed (sync rule 2). Every number is a SUM over v_stats_grain (or, for
// distinct counts and breakdowns, the same filters over v_alumni_current), scoped with scopeFor(user).
import { many, one, pool } from '../db/index.js';
import { scopeFor } from '../middleware/scope.js';
import { TTJ_ORDER } from '../lib/vocab.js';
import { getSettings } from './settings.js';

const SUMS = [
  'total', 'traced', 'completion_sum', 'completed', 'employed', 'wage_employed', 'self_employed', 'further_studies', 'not_employed',
  'aligned', 'first_gen', 'ip', 'ip_employed', 'ip_further', 'pwd', 'pwd_employed', 'pwd_further', 'months_n',
  ...TTJ_ORDER.map((k) => `ttj_${k}`),
];
const SELECT_SUMS = [
  ...SUMS.map((c) => `COALESCE(sum(${c}), 0)::int AS ${c}`),
  'COALESCE(sum(months_sum), 0)::numeric AS months_sum',
  "COALESCE(sum(total) FILTER (WHERE verification_status = 'pending'), 0)::int AS pending",
  "COALESCE(sum(total) FILTER (WHERE verification_status = 'verified'), 0)::int AS verified",
  "COALESCE(sum(total) FILTER (WHERE verification_status = 'flagged'), 0)::int AS flagged",
].join(',\n  ');

/**
 * Filters accepted by every stat endpoint. Dept users are always pinned to their own college.
 * { collegeId, programId, batch, batchFrom, batchTo, batches: [..], status: 'pending'|'verified'|'flagged', unmapped }
 */
export function buildWhere(user, f = {}, alias = '') {
  const p = alias ? `${alias}.` : '';
  const where = [];
  const params = [];
  const add = (sql, v) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
  const s = scopeFor(user);
  if (s.alumniId != null) throw Object.assign(new Error('Statistics are for staff accounts.'), { status: 403 });
  if (s.collegeId != null) add(`${p}college_id = ?`, s.collegeId);
  else if (f.collegeId) add(`${p}college_id = ?`, f.collegeId);
  if (f.programId) add(`${p}program_id = ?`, f.programId);
  if (f.unmapped) where.push(`${p}program_id IS NULL`);
  if (f.batch) add(`${p}batch = ?`, f.batch);
  if (f.batchFrom) add(`${p}batch >= ?`, f.batchFrom);
  if (f.batchTo) add(`${p}batch <= ?`, f.batchTo);
  if (f.batches?.length) add(`${p}batch = ANY(?::int[])`, f.batches);
  if (f.status) add(`${p}verification_status = ?::verification_status`, f.status);
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : null);

/** Raw sums -> the metric object every screen uses (definitions: docs/plan-backend.md "Metric definitions"). */
export function toMetrics(r, settings) {
  const laborForce = settings.employment_rate_excludes_further_studies ? r.traced - r.further_studies : r.traced;
  return {
    total: r.total,
    traced: r.traced,
    untraced: r.total - r.traced,
    coverage: pct(r.traced, r.total),
    completion: r.traced ? Math.round((r.completion_sum / r.traced) * 10) / 10 : null,
    completed: r.completed,
    employed: r.employed,
    wageEmployed: r.wage_employed,
    selfEmployed: r.self_employed,
    furtherStudies: r.further_studies,
    notEmployed: r.not_employed,
    laborForce,
    employmentRate: pct(r.employed, laborForce),
    aligned: r.aligned,
    alignedRate: pct(r.aligned, r.employed),
    firstGen: r.first_gen,
    firstGenRate: pct(r.first_gen, r.traced),
    ip: r.ip, ipEmployed: r.ip_employed, ipRate: pct(r.ip, r.traced),
    ipEmploymentRate: pct(r.ip_employed, settings.employment_rate_excludes_further_studies ? r.ip - r.ip_further : r.ip),
    pwd: r.pwd, pwdEmployed: r.pwd_employed, pwdRate: pct(r.pwd, r.traced),
    pwdEmploymentRate: pct(r.pwd_employed, settings.employment_rate_excludes_further_studies ? r.pwd - r.pwd_further : r.pwd),
    nonIpEmploymentRate: pct(r.employed - r.ip_employed, laborForce - (settings.employment_rate_excludes_further_studies ? r.ip - r.ip_further : r.ip)),
    nonPwdEmploymentRate: pct(r.employed - r.pwd_employed, laborForce - (settings.employment_rate_excludes_further_studies ? r.pwd - r.pwd_further : r.pwd)),
    monthsAvg: r.months_n ? Math.round((Number(r.months_sum) / r.months_n) * 10) / 10 : null,
    timeToJob: Object.fromEntries(TTJ_ORDER.map((k) => [k, r[`ttj_${k}`]])),
    pending: r.pending, verified: r.verified, flagged: r.flagged,
  };
}

const GROUPS = { batch: 'batch', college: 'college_id', program: 'program_id' };

/** Aggregate over v_stats_grain, optionally grouped by batch | college | program. */
export async function aggregate(user, filters = {}, groupBy = null, db = pool) {
  const settings = await getSettings(db);
  const w = buildWhere(user, filters);
  const g = groupBy ? GROUPS[groupBy] : null;
  const rows = await many(
    `SELECT ${g ? `${g} AS key,` : ''} ${SELECT_SUMS} FROM v_stats_grain ${w.sql} ${g ? `GROUP BY ${g} ORDER BY ${g}` : ''}`,
    w.params, db,
  );
  if (!g) return toMetrics(rows[0], settings);
  return rows.map((r) => ({ key: r.key, ...toMetrics(r, settings) }));
}

/** Labels for grouped rows (college / program names, "Unmapped program" for typed-in courses). */
export async function labelRows(rows, groupBy, db = pool) {
  if (groupBy === 'batch') return rows.map((r) => ({ ...r, label: String(r.key), full: `Batch ${r.key}` }));
  if (groupBy === 'college') {
    const cs = await many('SELECT college_id, code, name FROM college', [], db);
    const by = new Map(cs.map((c) => [c.college_id, c]));
    return rows.map((r) => ({ ...r, label: by.get(r.key)?.code || '—', full: by.get(r.key)?.name || 'Unknown college', collegeId: r.key }));
  }
  const ps = await many('SELECT program_id, abbr, name, college_id FROM program', [], db);
  const by = new Map(ps.map((p) => [p.program_id, p]));
  return rows.map((r) => (r.key == null
    ? { ...r, label: 'Unmapped', full: 'Unmapped program', programId: null }
    : { ...r, label: by.get(r.key)?.abbr || '—', full: by.get(r.key)?.name || 'Unknown program', programId: r.key, collegeId: by.get(r.key)?.college_id }));
}

/** Sector / employer distribution among the employed (aggregated counts only; no names). */
export async function sectors(user, filters = {}, db = pool) {
  const w = buildWhere(user, filters, 'v');
  const base = `FROM v_alumni_current v LEFT JOIN program p ON p.program_id = v.program_id ${w.sql ? `${w.sql} AND` : 'WHERE'} v.employed`;
  const [industries, orgTypes, occupations, titles, employers, topPrograms] = await Promise.all([
    many(`SELECT COALESCE(v.line_of_business, 'Not specified') AS key, count(*)::int AS n ${base} GROUP BY 1 ORDER BY 2 DESC, 1`, w.params, db),
    many(`SELECT COALESCE(v.org_type::text, 'unspecified') AS key, count(*)::int AS n ${base} GROUP BY 1 ORDER BY 2 DESC`, w.params, db),
    many(`SELECT COALESCE(v.occupation_class, 'Not specified') AS key, count(*)::int AS n ${base} GROUP BY 1 ORDER BY 2 DESC`, w.params, db),
    many(`SELECT initcap(lower(trim(v.job_title))) AS key, count(*)::int AS n ${base} AND coalesce(trim(v.job_title), '') <> '' GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10`, w.params, db),
    one(`SELECT count(DISTINCT lower(trim(v.employer_name)))::int AS n ${base} AND coalesce(trim(v.employer_name), '') <> ''`, w.params, db),
    many(`SELECT COALESCE(v.line_of_business, 'Not specified') AS sector, COALESCE(p.abbr, 'Unmapped') AS program, count(*)::int AS n
            ${base} GROUP BY 1, 2 ORDER BY 1, 3 DESC`, w.params, db),
  ]);
  const employed = industries.reduce((a, r) => a + r.n, 0);
  const tops = {};
  topPrograms.forEach((r) => { (tops[r.sector] = tops[r.sector] || []).push(r.program); });
  return {
    employed,
    distinctEmployers: employers.n,
    industries: industries.map((r) => ({ ...r, share: pct(r.n, employed), topPrograms: (tops[r.key] || []).slice(0, 2) })),
    orgTypes, occupations, topJobTitles: titles,
  };
}

/** IP / PWD breakdown by group and type among the traced (counts only — the Inclusion report never lists names). */
export async function inclusion(user, filters = {}, db = pool) {
  const w = buildWhere(user, filters, 'v');
  const base = `FROM v_alumni_current v ${w.sql ? `${w.sql} AND` : 'WHERE'} v.traced`;
  const [groups, types] = await Promise.all([
    many(`SELECT COALESCE(nullif(initcap(trim(v.indigenous_group)), ''), 'Not specified') AS key, count(*)::int AS n ${base} AND v.is_indigenous GROUP BY 1 ORDER BY 2 DESC, 1`, w.params, db),
    many(`SELECT v.pwd_type::text AS key, count(*)::int AS n ${base} AND v.is_pwd GROUP BY 1 ORDER BY 2 DESC, 1`, w.params, db),
  ]);
  return { indigenousGroups: groups, pwdTypes: types };
}

/** Records page counters: the population by status (+ archived, which sits outside the population). */
export async function counters(user, filters = {}, db = pool) {
  const w = buildWhere(user, { ...filters, status: undefined });
  const r = await one(
    `SELECT COALESCE(sum(pending),0)::int AS pending, COALESCE(sum(flagged),0)::int AS flagged,
            COALESCE(sum(verified),0)::int AS verified, COALESCE(sum(archived),0)::int AS archived
       FROM v_records_counters ${w.sql}`, w.params, db,
  );
  // Context for the counter cards, over the same scoped population.
  const sc = scopeFor(user);
  const w2 = [];
  const p2 = [];
  if (sc.collegeId != null) { p2.push(sc.collegeId); w2.push(`COALESCE(p.college_id, a.declared_college_id) = $${p2.length}`); }
  const scoped = `FROM alumnus a LEFT JOIN program p ON p.program_id = a.program_id WHERE a.merged_into_id IS NULL ${w2.length ? `AND ${w2.join(' AND ')}` : ''}`;
  const extra = await one(
    `SELECT (SELECT min(a.created_at) ${scoped} AND a.archived_at IS NULL AND a.verification_status = 'pending') AS oldest_pending_at,
            (SELECT max(a.updated_at) ${scoped}) AS last_updated_at,
            (SELECT count(*)::int FROM record_review rr WHERE rr.action = 'verify' AND rr.created_at > now() - interval '7 days'
                AND rr.alumni_id IN (SELECT a.alumni_id ${scoped})) AS verified_7d,
            (SELECT COALESCE(array_agg(DISTINCT a.year_graduated ORDER BY a.year_graduated DESC), '{}') ${scoped}) AS batches`, p2, db,
  );
  return {
    ...r, active: r.pending + r.flagged + r.verified, all: r.pending + r.flagged + r.verified + r.archived,
    oldestPendingAt: extra.oldest_pending_at, lastUpdatedAt: extra.last_updated_at, verifiedLast7d: extra.verified_7d, batches: extra.batches,
  };
}

/** Outreach list (v_unresponsive) with the "N of M" counters from the same query. */
export async function unresponsive(user, filters = {}, { limit = 20, offset = 0 } = {}, db = pool) {
  const w = buildWhere(user, { ...filters, status: undefined }, 'u');
  const rows = await many(
    `SELECT u.alumni_id, concat_ws(' ', u.first_name, u.last_name) AS name, u.batch, u.reason, u.last_contacted_at,
            u.created_at, COALESCE(p.abbr, 'Unmapped') AS program, count(*) OVER ()::int AS total_count
       FROM v_unresponsive u LEFT JOIN program p ON p.program_id = u.program_id
       ${w.sql}
      ORDER BY (u.reason = 'new') DESC, u.last_contacted_at NULLS FIRST, u.batch DESC, u.last_name
      LIMIT ${Number(limit) | 0} OFFSET ${Number(offset) | 0}`,
    w.params, db,
  );
  const byReason = await many(`SELECT reason, count(*)::int AS n FROM v_unresponsive u ${w.sql} GROUP BY reason`, w.params, db);
  return {
    total: rows[0]?.total_count ?? (await one(`SELECT count(*)::int AS n FROM v_unresponsive u ${w.sql}`, w.params, db)).n,
    byReason: Object.fromEntries(byReason.map((r) => [r.reason, r.n])),
    rows: rows.map(({ total_count: _t, ...r }) => r),
  };
}
