// "Signals Worth Acting On": five ranked findings, each with evidence, interpretation, actions and owners (the
// reference design's insight engine). Every count comes from GET /stats/* and /jobs/stats; nothing is invented here.
import { qs } from './api';

const N = (n) => Math.round(n || 0).toLocaleString('en-US');
const P = (x) => (x == null || Number.isNaN(x) ? '—' : `${x.toFixed(1)}%`);
const pc = (a, b) => (b ? (a / b) * 100 : null);
const W = (x, m) => `${(m ? Math.min(100, (x / m) * 100) : 0).toFixed(1)}%`;
const sg = (d) => `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} pts`;
const thisYear = () => new Date().getFullYear();
/** Minimum responses for a finding, and for a college / program / batch to be listed or compared. */
const MIN = 30;
const GMIN = 20;
const PMIN = 10;
const ORD = { High: 0, Medium: 1, Low: 2 };
/** Priority pill → [text, background, border]. */
const PS = { High: ['#B42318', '#FDF1F0', '#F3C9C6'], Medium: ['#7A5E0E', '#FDF6DD', '#F0E0A6'], Low: ['#0F6B4F', '#E6F0EB', '#CFE3DA'], none: ['#64748B', '#F1F4F2', '#E2E8F0'] };
const SRC = ' · Source: UDM Graduate Tracer Survey, same definitions as Reports.';

/** Batch groups compared by the industry signal: the latest three batches against batches five to eight years back. */
const recentFrom = () => thisYear() - 2;
const oldRange = () => [thisYear() - 8, thisYear() - 5];

/** Requests the signals need beyond the dashboard's own: sector breakdowns and the Job Board totals. */
export function signalRequests(sc) {
  const base = { college_id: sc.college, program_id: sc.course, status: sc.status };
  const range = sc.batch === 'all' ? {} : { batch_from: sc.lo, batch_to: sc.hi };
  const [oLo, oHi] = oldRange();
  return {
    sectors: `/stats/sectors${qs({ ...base, ...range })}`,
    sectorsNew: `/stats/sectors${qs({ ...base, batch_from: recentFrom(), batch_to: thisYear() })}`,
    sectorsOld: `/stats/sectors${qs({ ...base, batch_from: oLo, batch_to: oHi })}`,
    jobs: '/jobs/stats',
  };
}

/**
 * @param sc      adminScope(sel)
 * @param data    dashboard responses (adminRequests)
 * @param sig     responses keyed like signalRequests()
 * @param target  { employment, coverage }
 * @param where   scope label shown under each signal's title
 * @param go      { records, jobs, events, reports, tracer } navigation
 * @return signals ranked by priority, those without enough data last
 */
export function buildSignals(sc, data, sig, target, where, go) {
  const S = data.summary;
  const T = target.coverage;
  const unit = sc.group === 'college' ? 'college' : sc.group === 'program' ? 'program' : 'batch';
  const lb = (u) => (sc.group === 'batch' ? `Batch ${u.key}` : u.label);
  const units = (data.units.data || []).filter((u) => u.total > 0);
  const byB = (data.byBatch.data || []).filter((r) => sc.years.includes(r.key));
  const Y = thisYear();
  const RF = recentFrom();
  const recL = `Batches ${RF}–${Y}`;
  const oldL = `batches before ${RF}`;
  const sum = (rows, k) => rows.reduce((a, r) => a + (r[k] || 0), 0);
  const out = [];

  // 1 Alumni not yet employed
  {
    const known = S.traced || 0;
    const un = S.notEmployed || 0;
    const rate = pc(un, known);
    const byU = units.filter((u) => u.traced >= GMIN).map((u) => ({ u, n: u.traced, x: u.notEmployed || 0, v: pc(u.notEmployed || 0, u.traced) })).sort((a, b) => b.x - a.x);
    const rec = byB.filter((r) => r.key >= RF);
    const old = byB.filter((r) => r.key < RF);
    const recN = sum(rec, 'notEmployed');
    const oldN = sum(old, 'notEmployed');
    const ru = pc(recN, sum(rec, 'traced'));
    const ro = pc(oldN, sum(old, 'traced'));
    const recHi = ru != null && ro != null && ru > ro;
    const mx = Math.max(1, ...byU.map((x) => x.x));
    const top = byU[0];
    out.push({
      id: 'unemp', cat: 'Career assistance', lvl: rate >= 15 ? 'High' : rate >= 8 ? 'Medium' : 'Low',
      low: known < MIN ? `Only ${known} traced alumni in this scope reported an employment status (minimum ${MIN}).` : '',
      title: `${N(un)} traced alumni are not yet employed`,
      summary: `${P(rate)} of respondents${top ? ` · most in ${lb(top.u)} (${N(top.x)})` : ''}`,
      scope: where,
      finding: `${N(un)} of ${N(known)} traced alumni (${P(rate)}) reported in the tracer survey that they are not yet employed.`,
      stats: [{ v: N(un), l: 'Not yet employed' }, { v: P(rate), l: 'of traced alumni' }, { v: P(ru), l: `not yet employed · ${recL}` }],
      bTitle: `By ${unit} · highest count first (${unit === 'batch' ? 'batches' : `${unit}s`} with ≥ ${GMIN} respondents)`,
      rows: byU.slice(0, 5).map((x) => ({ l: lb(x.u), full: x.u.full, v: N(x.x), note: `${P(x.v)} of ${N(x.n)}`, w: W(x.x, mx) })),
      means: recHi
        ? 'Unemployment is concentrated among the most recent graduates, so early career support is likely to reach the largest group.'
        : 'Unemployment is spread across batches rather than concentrated among recent graduates.',
      facts: [
        ru != null && ro != null ? `${recL} report ${P(ru)} not yet employed (${N(recN)} alumni), compared with ${P(ro)} for ${oldL}.` : null,
        top ? `${lb(top.u)} has the most respondents not yet employed (${N(top.x)}, ${P(top.v)}).` : null,
      ],
      maybes: [
        recHi ? 'A higher rate among recent batches is consistent with a normal job-search period after graduation.' : 'Unemployment persisting in older batches may point to longer-term barriers to employment.',
        'The survey does not record why alumni are unemployed (still searching, further training, personal reasons), so the cause cannot be confirmed.',
      ],
      actions: [
        `Send matching Job Board postings to the ${N(un)} alumni, starting with the ${recHi ? `${N(recN)} from ${recL}` : `${N(oldN)} from ${oldL}, where the rate is higher`}.`,
        'Invite them to upcoming career events through Events.',
        top && unit === 'college' ? `Ask the ${lb(top.u)}${byU[1] ? ` and ${lb(byU[1].u)}` : ''} coordinators to schedule career-advising follow-ups.` : null,
      ],
      roles: ['Career & Placement Office', 'College Coordinators (own college only)'],
      criteria: `High ≥ 15% · Medium 8–15% · Low < 8% of traced alumni not yet employed. Current: ${P(rate)}.`,
      links: [{ l: 'Alumni Records', go: go.records }, { l: 'Jobs Management', go: go.jobs }, { l: 'Events', go: go.events }],
      monitor: `Not-yet-employed rate, now ${P(rate)}. Re-check after the next tracer cycle.`,
      basis: `${N(known)} traced alumni with a reported employment status${SRC}`,
    });
  }

  // 2 Course-to-job alignment
  {
    const emp = S.employed || 0;
    const al = S.aligned || 0;
    const no = emp - al;
    const rate = pc(no, emp);
    const progs = units.filter((u) => u.employed >= PMIN && u.alignedRate != null).map((u) => ({ u, n: u.employed, no: u.employed - (u.aligned || 0), v: 100 - u.alignedRate })).sort((a, b) => b.v - a.v);
    const n0 = data.now.alignedRate;
    const p0 = data.prev.alignedRate;
    const d = n0 != null && p0 != null ? p0 - n0 : null;
    const top3 = progs.slice(0, 3).map((x) => lb(x.u));
    out.push({
      id: 'mismatch', cat: 'Course-to-job alignment', lvl: rate >= 35 ? 'High' : rate >= 25 ? 'Medium' : 'Low',
      low: emp < MIN ? `Only ${emp} employed alumni in this scope (minimum ${MIN}).` : '',
      title: `${P(rate)} of employed alumni are not in a degree-related job`,
      summary: `${N(no)} of ${N(emp)} employed respondents${top3[0] ? ` · highest in ${top3[0]}` : ''}`,
      scope: where,
      finding: `${N(no)} of ${N(emp)} employed alumni (${P(rate)}) did not answer “Yes” to “Is your job related to the course you took up in college?”`,
      stats: [{ v: P(rate), l: 'not reported as degree-related' }, { v: N(no), l: 'employed alumni' }, { v: d == null ? '—' : sg(d), l: 'change vs a year earlier' }],
      bTitle: `${unit === 'batch' ? 'Batches' : `${unit[0].toUpperCase()}${unit.slice(1)}s`} with the highest share not aligned (≥ ${PMIN} employed)`,
      rows: progs.slice(0, 5).map((x) => ({ l: lb(x.u), full: x.u.full, v: P(x.v), note: `${N(x.no)} of ${N(x.n)}`, w: `${x.v.toFixed(1)}%`, c: '#C99A12' })),
      means: 'A sizeable share of graduates are employed but not using their degree, which points to an alignment gap between some programs and the jobs graduates obtain.',
      facts: [
        d != null ? `The not-aligned share moved ${sg(d)} against the batches a year earlier (${P(100 - p0)} → ${P(100 - n0)}).` : null,
        progs[0] ? `${lb(progs[0].u)} has the highest not-aligned share (${P(progs[0].v)}, ${N(progs[0].no)} of ${N(progs[0].n)}).` : null,
      ],
      maybes: [
        'Entry-level hiring in customer service, sales and administrative roles may absorb graduates regardless of degree.',
        'Some alumni may choose unrelated work by preference. The survey asks whether the job is related, not why, so the reason cannot be confirmed.',
      ],
      actions: [
        top3.length ? `Review curriculum-to-industry fit for ${top3.join(', ')} with program chairs.` : null,
        'Prioritise degree-related postings for these programs on the Job Board.',
        'Propose a follow-up tracer question on why the job is unrelated, so the cause can be measured next cycle.',
      ],
      roles: ['VP for Academic Affairs', 'Program Chairs', 'Career & Placement Office'],
      criteria: `High ≥ 35% · Medium 25–35% · Low < 25% of employed alumni not aligned. Current: ${P(rate)}.`,
      links: [{ l: 'Reports', go: go.reports }, { l: 'Alumni Tracer', go: go.tracer }, { l: 'Jobs Management', go: go.jobs }],
      monitor: `Not-aligned share, now ${P(rate)}, for the listed ${unit === 'batch' ? 'batches' : `${unit}s`} after the next tracer cycle.`,
      gap: 'Alumni Records has no course-relevance filter, so the not-aligned alumni cannot be listed by name. Smallest fix: add an Aligned / Not aligned filter to Alumni Records using the same survey field.',
      basis: `${N(emp)} employed alumni; those without a “related” answer count as not aligned${SRC}`,
    });
  }

  // 3 Tracer survey completion
  {
    const elig = S.total || 0;
    const done = S.traced || 0;
    const cov = pc(done, elig);
    const bs = byB.filter((b) => b.total >= 5).map((b) => ({ y: b.key, e: b.total, t: b.traced, v: pc(b.traced, b.total) }));
    const below = bs.filter((b) => b.v < T);
    const asc = bs.slice().sort((a, b) => a.v - b.v);
    const worst = asc[0];
    const byU = sc.group === 'batch' ? [] : units.filter((u) => u.total >= GMIN).sort((a, b) => a.coverage - b.coverage);
    const lowU = byU.filter((u) => u.coverage < T).slice(0, 2).map(lb);
    const un = elig - done;
    out.push({
      id: 'survey', cat: 'Tracer survey completion', lvl: cov < 50 ? 'High' : cov < T || below.length ? 'Medium' : 'Low',
      low: elig < MIN ? `Only ${elig} alumni records in this scope (minimum ${MIN}).` : '',
      title: below.length ? `${below.length} of ${bs.length} batches are below the ${T}% response target` : `All batches meet the ${T}% response target`,
      summary: `Overall ${P(cov)} · ${N(un)} alumni not yet surveyed`,
      scope: where,
      finding: `${N(done)} of ${N(elig)} alumni (${P(cov)}) completed the tracer survey.${worst ? ` Batch ${worst.y} is lowest at ${P(worst.v)}.` : ''}`,
      stats: [{ v: P(cov), l: `overall completion (target ${T}%)` }, { v: N(un), l: 'alumni not yet surveyed' }, { v: String(below.length), l: 'batches below target' }],
      bTitle: 'Lowest-completion batches',
      rows: asc.slice(0, 5).map((b) => ({ l: `Batch ${b.y}`, v: P(b.v), note: `${N(b.e - b.t)} unreached`, w: `${b.v.toFixed(1)}%`, c: b.v < T ? '#E0A915' : '#0F6B4F' })),
      means: below.length
        ? `Results for batches below ${T}% may not represent all graduates in those batches, so their employment figures should be read with caution.`
        : 'Coverage is high enough for batch results to be broadly representative.',
      facts: [
        worst ? `Batch ${worst.y} has ${N(worst.e - worst.t)} alumni without a survey response.` : null,
        byU[0] ? `Lowest ${unit} coverage: ${lb(byU[0])} at ${P(byU[0].coverage)}.` : null,
      ],
      maybes: ['Outdated contact details or survey fatigue are common causes of low response, but neither is recorded in the system.'],
      actions: [
        worst ? `Send survey reminders to the ${N(worst.e - worst.t)} untraced alumni of Batch ${worst.y} first.` : null,
        lowU.length && unit === 'college' ? `Ask the ${lowU.join(' and ')} coordinators to run college outreach through their Outreach page.` : null,
        'Check email and mobile details of untraced records in Alumni Records before resending.',
      ],
      roles: ['Alumni Relations Office', 'College Coordinators (own college only)'],
      criteria: `High: overall < 50% · Medium: overall < ${T}% or any batch below ${T}% · Low: all batches ≥ ${T}%. Current: ${P(cov)}, ${below.length} below.`,
      links: [{ l: 'Alumni Tracer', go: go.tracer }, { l: 'Alumni Records', go: go.records }],
      monitor: `Completion rate, now ${P(cov)}, and the number of batches below ${T}%, weekly during the survey cycle.`,
      gap: 'Administrators cannot send survey reminders from the dashboard; the reminder workflow exists only on the College Coordinator Outreach page. Smallest fix: add a “Send reminder” action for untraced alumni, reusing the Outreach message template.',
      basis: `${N(elig)} alumni records in this scope${SRC}`,
    });
  }

  // 4 Declining employability: the selected batches against the batches a year earlier (the Employability card).
  {
    const prevBy = new Map((data.unitsPrev.data || []).map((r) => [String(r.key), r]));
    const rows = (data.unitsNow.data || []).filter((r) => r.laborForce >= PMIN && r.employmentRate != null).map((r) => {
      const p = prevBy.get(String(sc.group === 'batch' ? r.key - 1 : r.key));
      return p && p.laborForce >= PMIN && p.employmentRate != null ? { u: r, a: r.employmentRate, p: p.employmentRate, d: r.employmentRate - p.employmentRate } : null;
    }).filter(Boolean);
    const excl = (data.unitsNow.data || []).filter((r) => r.traced > 0).length - rows.length;
    const dec = rows.filter((x) => x.d <= -1).sort((a, b) => a.d - b.d);
    const w = dec[0];
    const show = (dec.length ? dec : rows.slice().sort((a, b) => a.d - b.d)).slice(0, 5);
    const mx = Math.max(1, ...show.map((x) => Math.abs(x.d)));
    const wc = w ? w.u.coverage : null;
    const us = unit === 'batch' ? 'batches' : `${unit}s`;
    const cmp = sc.group === 'batch' ? 'each batch against the batch before it' : `batches ${sc.now[0]}–${sc.now[sc.now.length - 1]} against batches ${sc.prev[0]}–${sc.prev[sc.prev.length - 1]}`;
    out.push({
      id: 'decline', cat: 'Employability trend', lvl: !w ? 'Low' : w.d <= -3 ? 'High' : 'Medium',
      low: !rows.length ? `No ${unit} has enough comparable responses (≥ ${PMIN} in the labour force) in both periods.` : '',
      title: dec.length ? `${dec.length} ${dec.length === 1 ? unit : us} declined in employability` : `No ${unit} declined by 1 point or more`,
      summary: w ? `Largest drop: ${lb(w.u)} ${sg(w.d)}, now ${P(w.a)}` : 'Rates are stable or rising vs a year earlier',
      scope: where,
      finding: w
        ? `${lb(w.u)}’s employment rate fell from ${P(w.p)} to ${P(w.a)} (${sg(w.d)})${dec.length > 1 ? `; ${dec.length - 1} other ${dec.length > 2 ? us : unit} also declined.` : '.'}`
        : `No ${unit}’s employment rate fell by 1 point or more against a year earlier.`,
      stats: [{ v: String(dec.length), l: `${us} down ≥ 1 pt` }, { v: w ? sg(w.d) : '—', l: 'largest decline' }, { v: String(rows.length), l: `${us} compared` }],
      bTitle: dec.length ? `Declining ${us} · previous → current` : 'Smallest changes · previous → current',
      rows: show.map((x) => ({ l: lb(x.u), full: x.u.full, v: sg(x.d), note: `${P(x.p)} → ${P(x.a)}`, w: W(Math.abs(x.d), mx), c: x.d < 0 ? '#C2563B' : '#0F6B4F' })),
      means: w
        ? 'The decline is measured, but the data does not show why it happened. Investigate at program level before choosing an intervention.'
        : `No ${unit} needs a decline-specific intervention this cycle.`,
      facts: [
        `Compares ${cmp}.`,
        w ? `${lb(w.u)} tracer completion is ${P(wc)}${wc != null && wc < T ? `, below the ${T}% target.` : '.'}` : null,
        excl > 0 ? `${excl} ${excl > 1 ? us : unit} excluded: fewer than ${PMIN} comparable responses.` : null,
      ],
      maybes: [
        w && wc != null && wc < T ? 'With low completion, part of the drop may reflect who responded rather than a real change.' : null,
        w ? 'Fewer openings in the field or changes in program enrolment could contribute; the system has no data to confirm either.' : 'Stable rates do not rule out declines within individual programs; filter the dashboard by college to check.',
      ],
      actions: w
        ? [`Filter the dashboard to ${lb(w.u)} to find which programs drive the decline.`, `Review the findings with the ${lb(w.u)} dean and coordinator before planning interventions.`, 'Direct employer partnerships and job postings to the affected programs.']
        : ['Keep monitoring at the next survey cycle.'],
      roles: ['College Dean', 'College Coordinator', 'Career & Placement Office'],
      criteria: `High: any ${unit} down ≥ 3 pts · Medium: down 1–3 pts · Low: no decline ≥ 1 pt. ${us[0].toUpperCase()}${us.slice(1)} with < ${PMIN} comparable responses are excluded.`,
      links: [{ l: 'Reports', go: go.reports }],
      monitor: w ? `${lb(w.u)} employment rate, now ${P(w.a)}, at the next survey cycle.` : `${unit[0].toUpperCase()}${unit.slice(1)} employment rates at the next survey cycle.`,
      basis: `Employment rate = employed ÷ traced graduates in the labour force (same as the Employability card)${SRC}`,
    });
  }

  // 5 Employment & industry trends
  {
    const real = (s) => ((s && s.industries) || []).filter((x) => x.key !== 'Not specified');
    const all = real(sig.sectors);
    const E = sum(all, 'n');
    const share = (s) => { const rs = real(s); const t = sum(rs, 'n'); return { t, m: new Map(rs.map((x) => [x.key, pc(x.n, t)])) }; };
    const sr = share(sig.sectorsNew);
    const so = share(sig.sectorsOld);
    const cmp = sr.t >= MIN && so.t >= MIN;
    const inds = all.map((x) => ({ k: x.key, n: x.n, v: pc(x.n, E), dv: cmp ? (sr.m.get(x.key) || 0) - (so.m.get(x.key) || 0) : null }));
    const byD = inds.filter((x) => x.dv != null).sort((a, b) => b.dv - a.dv);
    const grow = byD[0] && byD[0].dv > 0 ? byD[0] : null;
    const fall = byD.length && byD[byD.length - 1].dv < 0 ? byD[byD.length - 1] : null;
    const big = byD.slice().sort((a, b) => Math.abs(b.dv) - Math.abs(a.dv))[0] || null;
    const unspec = (sig.sectors && sig.sectors.employed) - E;
    const jobs = sig.jobs || {};
    const mx = inds[0] ? inds[0].v : 1;
    const [oLo, oHi] = oldRange();
    const grp = `${recL} vs ${oLo}–${oHi}`;
    out.push({
      id: 'industry', cat: 'Employment & industry trends', lvl: big && Math.abs(big.dv) >= 5 ? 'Medium' : 'Low',
      low: E < MIN ? `Only ${E} employed alumni reported an industry (minimum ${MIN}).` : '',
      title: inds[0] ? `Most alumni work in ${inds[0].k.toLowerCase()}` : 'Industry distribution',
      summary: grow ? `${grow.k} ${sg(grow.dv)} in recent batches` : cmp ? 'No industry gained share in recent batches' : 'Too few responses to compare batch groups',
      scope: where,
      finding: inds.length
        ? `The top three industries employ ${P(inds.slice(0, 3).reduce((a, x) => a + x.v, 0))} of ${N(E)} employed alumni${grow ? `; ${grow.k.toLowerCase()} grew most in recent batches (${sg(grow.dv)}).` : '.'}`
        : 'No employed alumni in this scope reported an industry.',
      stats: [{ v: inds[0] ? P(inds[0].v) : '—', l: 'in the top industry' }, { v: grow ? sg(grow.dv) : '—', l: `largest share gain, ${grp}` }, { v: N(jobs.open), l: 'open Job Board postings' }],
      bTitle: 'Industry share of employed alumni',
      rows: inds.slice(0, 5).map((x) => ({ l: x.k, v: P(x.v), note: N(x.n), w: W(x.v, mx) })),
      means: 'This shows where alumni are employed, which can guide employer outreach and job-posting priorities. It is not a measure of labour-market demand.',
      facts: [
        grow || fall ? `Share in ${grp}: ${[grow, fall].filter(Boolean).map((x) => `${x.k} ${sg(x.dv)}`).join('; ')}.` : null,
        `Job Board has ${N(jobs.open)} open postings from ${N(jobs.employers)} employers.`,
        unspec > 0 ? `${N(unspec)} employed alumni did not specify an industry and are left out.` : null,
      ],
      maybes: ['A rising share may reflect hiring demand in that industry, but the system has no vacancy or labour-market data to confirm it.'],
      actions: [
        grow ? `Prioritise employer outreach and job postings in ${grow.k.toLowerCase()}.` : null,
        'Share the industry breakdown with colleges for curriculum and OJT partner planning.',
        'Promote open Job Board postings to alumni who are not yet employed.',
      ],
      roles: ['Career & Placement Office', 'Industry Linkages / OJT Coordinators'],
      criteria: `Medium: an industry’s share changed ≥ 5 pts between batch groups · Low otherwise (informational). Current largest change: ${big ? `${big.k} ${sg(big.dv)}` : '—'}.`,
      links: [{ l: 'Jobs Management', go: go.jobs }, { l: 'Reports', go: go.reports }],
      monitor: 'Top-industry shares and Job Board postings per industry each cycle.',
      basis: `${N(E)} employed alumni with a reported industry${SRC}`,
    });
  }

  return out.sort((a, b) => (!!a.low - !!b.low) || ORD[a.lvl] - ORD[b.lvl]);
}

/** Pill of a signal: its priority, or "Not enough data". */
export const signalPill = (i) => {
  const p = i.low ? PS.none : PS[i.lvl];
  return { pl: i.low ? 'Not enough data' : `${i.lvl} priority`, pc: p[0], pbg: p[1], pbd: p[2] };
};

/** "5 signals · 2 high" */
export const signalCount = (list) => {
  const high = list.filter((i) => !i.low && i.lvl === 'High').length;
  return `${list.length} signal${list.length === 1 ? '' : 's'}${high ? ` · ${high} high` : ''}`;
};
