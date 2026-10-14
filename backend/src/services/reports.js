// Report data for the five report types, in the shape the Reports screen renders (KPIs, chart bars, table, findings).
// Ported from client/src/lib/analytics.js repData(), with every number now coming from v_stats_grain.
import { many, one, pool } from '../db/index.js';
import { scopeFor } from '../middleware/scope.js';
import { aggregate, labelRows, sectors } from './stats.js';
import { getSettings } from './settings.js';
import { manilaToday } from '../lib/validation.js';

export const REPORT_TYPES = [
  { id: 'ched', name: 'UDM Alumni Survey — Form A', desc: 'Mandated institutional submission covering employment status, relevance of degree and months before first job, for the last five graduating batches.', cadence: 'Annual' },
  { id: 'employability', name: 'Employability by Program', desc: 'Per-program employment rate against the university target, with batch-on-batch movement.', cadence: 'Quarterly' },
  { id: 'coverage', name: 'Batch Coverage Audit', desc: 'Traced versus total graduates for each batch, with unreached counts for follow-up.', cadence: 'Monthly' },
  { id: 'employer', name: 'Employer & Industry Distribution', desc: 'Where graduates are absorbed, by industry sector — employer counts only, no named alumni.', cadence: 'On demand' },
  { id: 'inclusion', name: 'Inclusion Profile — IP & PWD', desc: 'Indigenous Peoples and Persons with Disability (Yes / No) among respondents, with employment outcomes per group. Aggregated counts only.', cadence: 'Annual' },
];

const N = (n) => Math.round(n || 0).toLocaleString('en-US');
const P = (n) => (n == null ? '—' : `${Number(n).toFixed(1)}%`);
const v = (n) => n ?? 0;
const best = (arr, f) => arr.filter((u) => f(u) != null).reduce((a, b) => (a == null || f(b) > f(a) ? b : a), null);
const worst = (arr, f) => arr.filter((u) => f(u) != null).reduce((a, b) => (a == null || f(b) < f(a) ? b : a), null);

/** Batches covered by reports: the last five graduating years. */
export function reportBatches() {
  const y = Number(manilaToday().slice(0, 4));
  return { from: y - 4, to: y, list: [y - 4, y - 3, y - 2, y - 1, y] };
}

export async function reportData(user, type, { collegeId, programId } = {}, db = pool) {
  const settings = await getSettings(db);
  const empT = Number(settings.employment_target);
  const covT = Number(settings.coverage_target);
  const B = reportBatches();
  const sc = scopeFor(user);
  const college = sc.collegeId ?? collegeId ?? null;
  let program = null;
  if (programId) program = await one('SELECT program_id, abbr, name, college_id FROM program WHERE program_id = $1 AND ($2::bigint IS NULL OR college_id = $2)', [programId, college], db);
  const col = college ? await one('SELECT college_id, code, name FROM college WHERE college_id = $1', [college], db) : null;
  const level = program ? 'batch' : col ? 'course' : 'college';
  const f = { collegeId: col?.college_id, programId: program?.program_id, batchFrom: B.from, batchTo: B.to };
  const group = level === 'college' ? 'college' : level === 'course' ? 'program' : 'batch';

  const [tot, unitsRaw, byBatchRaw] = await Promise.all([aggregate(user, f, null, db), aggregate(user, f, group, db), aggregate(user, f, 'batch', db)]);
  const units = await labelRows(unitsRaw, group, db);
  // Every batch in the window appears, even with no records yet.
  const byBatch = B.list.map((y) => byBatchRaw.find((r) => r.key === y) || { key: y, total: 0, traced: 0, untraced: 0, coverage: null, employmentRate: null, employed: 0 })
    .map((r) => ({ ...r, label: String(r.key), full: `Batch ${r.key}` }));
  const unitList = level === 'batch' ? byBatch : units;

  const unitHead = level === 'college' ? 'College' : level === 'course' ? 'Program' : 'Batch';
  const plural = unitHead.toLowerCase() + (level === 'batch' ? 'es' : 's');
  const scopeLabel = program ? program.name : col ? col.name : 'All colleges';
  const fileScope = program ? program.abbr : col ? col.code : 'All';
  const batchLabel = `Batches ${B.from}–${B.to}`;
  const base = { type, records: N(tot.traced), recordCount: tot.traced, unitHead, scope: scopeLabel, batchLabel, batchRange: `${B.from}-${B.to}`, level, unit: '%' };

  if (type === 'employability') {
    const above = unitList.filter((u) => v(u.employmentRate) >= empT);
    const b = best(unitList, (u) => u.employmentRate);
    const w = worst(unitList, (u) => u.employmentRate);
    return {
      ...base, file: `UDM_Employability_${fileScope}`,
      kpis: [{ label: 'Employment rate', value: P(tot.employmentRate), sub: `target ${empT}%` }, { label: 'Above target', value: `${above.length} of ${unitList.length}`, sub: plural },
        { label: 'Highest', value: P(b?.employmentRate), sub: b?.label || '—' }, { label: 'Lowest', value: P(w?.employmentRate), sub: w?.label || '—' }],
      chartTitle: `Employment rate by ${unitHead.toLowerCase()}`, chartNote: level === 'batch' ? scopeLabel : `${batchLabel} combined`, target: empT,
      bars: unitList.map((u) => [u.label, v(u.employmentRate)]),
      tableTitle: `Employability by ${unitHead.toLowerCase()}`, grid: '1.4fr 1fr 1fr 1fr 1fr',
      cols: [unitHead, 'Traced', 'Employed', 'Unemployed', 'Rate'],
      rows: unitList.map((u) => [u.label, N(u.traced), N(u.employed), N(u.notEmployed), P(u.employmentRate)]),
      findings: [
        `${above.length} of ${unitList.length} ${plural} meet the ${empT}% employment target.`,
        b ? `${b.full} has the highest employment rate at ${P(b.employmentRate)}.` : 'No employment responses in this scope yet.',
        w ? `${w.full} trails at ${P(w.employmentRate)}${w.employmentRate < empT ? ' — below target and a candidate for placement support.' : '.'}` : 'Encourage alumni in this scope to answer the survey.',
      ],
    };
  }
  if (type === 'coverage') {
    const b = best(byBatch, (u) => u.coverage);
    const w = worst(byBatch, (u) => u.coverage);
    const lowU = worst(units, (u) => u.coverage);
    return {
      ...base, file: `UDM_Batch-Coverage_${fileScope}`,
      kpis: [{ label: 'Overall coverage', value: P(tot.coverage), sub: `${N(tot.traced)} of ${N(tot.total)} graduates` }, { label: 'Unreached', value: N(tot.untraced), sub: 'need follow-up' },
        { label: 'Highest', value: P(b?.coverage), sub: b ? `Batch ${b.label}` : '—' }, { label: 'Lowest', value: P(w?.coverage), sub: w ? `Batch ${w.label}` : '—' }],
      chartTitle: 'Survey coverage by batch', chartNote: 'Traced ÷ total graduates', target: covT,
      bars: byBatch.map((u) => [u.label, v(u.coverage)]),
      tableTitle: 'Coverage by batch', grid: '1fr 1fr 1fr 1fr 1fr',
      cols: ['Batch', 'Graduates', 'Traced', 'Coverage', 'Unreached'],
      rows: [...byBatch.map((u) => [u.label, N(u.total), N(u.traced), P(u.coverage), N(u.total - u.traced)]), ['Total', N(tot.total), N(tot.traced), P(tot.coverage), N(tot.untraced)]],
      findings: [
        `${byBatch.filter((u) => v(u.coverage) < covT).length} of ${byBatch.length} batches sit below the ${covT}% coverage target.`,
        w ? `Batch ${w.label} has the most room to improve, with ${N(w.total - w.traced)} graduates unreached.` : 'No records in this scope yet.',
        level === 'batch' || !lowU ? 'Prioritise survey reminders for recent batches before the Form A deadline.' : `${lowU.full} has the lowest coverage (${P(lowU.coverage)}) — prioritise reminders there.`,
      ],
    };
  }
  if (type === 'employer') {
    const s = await sectors(user, f, db);
    const list = s.industries.slice().sort((a, b) => (a.key === 'Not specified') - (b.key === 'Not specified') || b.n - a.n);
    const lead = list[0];
    return {
      ...base, records: N(s.employed), recordCount: s.employed, file: `UDM_Employer-Industry_${fileScope}`,
      kpis: [{ label: 'Employed respondents', value: N(s.employed), sub: batchLabel.toLowerCase() }, { label: 'Distinct employers', value: N(s.distinctEmployers), sub: 'self-reported' },
        { label: 'Top sector', value: P(lead?.share), sub: lead?.key || '—' }, { label: 'Sectors', value: String(list.length), sub: 'represented' }],
      chartTitle: 'Share of employed alumni by sector', chartNote: 'Percent of employed respondents', target: null,
      bars: list.map((x) => [x.key, v(x.share)]),
      tableTitle: 'Sector detail', grid: '1.4fr .9fr .8fr 1.3fr',
      cols: ['Sector', 'Alumni', 'Share', 'Top programs'],
      rows: list.map((x) => [x.key, N(x.n), P(x.share), x.topPrograms.join(', ')]),
      findings: [
        lead ? `${lead.key} is the largest absorber of graduates in this scope at ${P(lead.share)}.` : 'No employed respondents in this scope yet.',
        'Sector mix is the major line of business each employed alumnus reported in the survey.',
        'Counts are aggregated by sector; no employer or alumni names are exported.',
      ],
    };
  }
  if (type === 'inclusion') {
    const t = tot.traced;
    const pc = (n) => P(t ? (n / t) * 100 : null);
    const topIp = best(units, (u) => (u.traced ? u.ip / u.traced : null));
    const topPwd = best(units, (u) => (u.traced ? u.pwd / u.traced : null));
    const gap = tot.nonPwdEmploymentRate != null && tot.pwdEmploymentRate != null ? tot.nonPwdEmploymentRate - tot.pwdEmploymentRate : null;
    return {
      ...base, file: `UDM_Inclusion-IP-PWD_${fileScope}`,
      kpis: [{ label: 'Indigenous — Yes', value: N(tot.ip), sub: `${pc(tot.ip)} of respondents` }, { label: 'Indigenous — No', value: N(t - tot.ip), sub: `${pc(t - tot.ip)} of respondents` },
        { label: 'PWD — Yes', value: N(tot.pwd), sub: `${pc(tot.pwd)} of respondents` }, { label: 'PWD — No', value: N(t - tot.pwd), sub: `${pc(t - tot.pwd)} of respondents` }],
      chartTitle: 'Employment rate by inclusion group', chartNote: 'Share of respondents employed', target: empT,
      bars: [['IP — Yes', v(tot.ipEmploymentRate)], ['IP — No', v(tot.nonIpEmploymentRate)], ['PWD — Yes', v(tot.pwdEmploymentRate)], ['PWD — No', v(tot.nonPwdEmploymentRate)], ['All', v(tot.employmentRate)]],
      tableTitle: `IP & PWD respondents by ${unitHead.toLowerCase()}`, grid: '1.4fr 1fr .8fr .8fr .8fr .8fr',
      cols: [unitHead, 'Respondents', 'IP Yes', 'IP No', 'PWD Yes', 'PWD No'],
      rows: [...unitList.map((u) => [u.label, N(u.traced), N(u.ip), N(u.traced - u.ip), N(u.pwd), N(u.traced - u.pwd)]), ['Total', N(t), N(tot.ip), N(t - tot.ip), N(tot.pwd), N(t - tot.pwd)]],
      findings: [
        `${pc(tot.ip)} of respondents identify as members of an Indigenous People group; ${pc(tot.pwd)} are Persons with Disability.`,
        gap == null ? 'Not enough PWD respondents yet to compare employment outcomes.'
          : gap > 0 ? `PWD respondents trail non-PWD peers on employment by ${gap.toFixed(1)} pts — a candidate for targeted placement and accommodation support.`
            : `PWD respondents are employed at ${P(tot.pwdEmploymentRate)}, on par with or above non-PWD peers (${P(tot.nonPwdEmploymentRate)}).`,
        topIp && topPwd ? `${topIp.full} has the highest IP share (${P((topIp.ip / topIp.traced) * 100)}); ${topPwd.full} has the highest PWD share (${P((topPwd.pwd / topPwd.traced) * 100)}).` : 'Shares by unit appear once respondents are recorded.',
      ],
    };
  }
  // ched — Form A
  const meet = byBatch.filter((u) => v(u.employmentRate) >= empT).length;
  const b = best(unitList, (u) => u.employmentRate);
  const lr = worst(unitList, (u) => u.alignedRate);
  return {
    ...base, file: `UDM_Form-A_${fileScope}`,
    kpis: [{ label: 'Employment rate', value: P(tot.employmentRate), sub: 'of traced respondents in the labour force' }, { label: 'Degree-relevant', value: P(tot.alignedRate), sub: 'of employed respondents' },
      { label: 'Months Before First Job', value: tot.monthsAvg == null ? '—' : `${tot.monthsAvg.toFixed(1)} mo`, sub: 'average of bucket midpoints' }, { label: 'Respondents', value: N(tot.traced), sub: `${Math.round(v(tot.coverage))}% response rate` }],
    chartTitle: 'Employment rate by graduating batch', chartNote: 'Share of respondents employed', target: empT,
    bars: byBatch.map((u) => [u.label, v(u.employmentRate)]),
    tableTitle: `${unitHead} breakdown`, grid: '1.4fr 1fr 1fr 1fr 1fr',
    cols: [unitHead, 'Respondents', 'Employed', 'Degree-relevant', 'Time to 1st job'],
    rows: unitList.map((u) => [u.label, N(u.traced), P(u.employmentRate), P(u.alignedRate), u.monthsAvg == null ? '—' : `${u.monthsAvg.toFixed(1)} mo`]),
    findings: [
      `${meet} of ${byBatch.length} batches meet the ${empT}% employment target; Batch ${B.to} is still within its first year after graduation.`,
      b ? `${b.full} leads on employment at ${P(b.employmentRate)}.` : 'No employment responses in this scope yet.',
      lr ? `${lr.full} has the lowest degree-relevant rate (${P(lr.alignedRate)}) — a candidate for curriculum and placement review.` : 'Degree relevance appears once employed alumni answer the survey.',
    ],
  };
}

/** Last export per type ("last run" on the template cards). */
export async function lastRuns(user, db = pool) {
  const sc = scopeFor(user);
  const rows = await many(
    `SELECT e.report_type, max(e.created_at) AS last FROM report_export e LEFT JOIN user_account u ON u.user_id = e.generated_by
      WHERE ($1::bigint IS NULL OR u.college_id = $1) GROUP BY 1`, [sc.collegeId ?? null], db,
  );
  return Object.fromEntries(rows.map((r) => [r.report_type, r.last]));
}
