// Survey structure mirrored from client/src/data/formDefs.js surveySectionDefs(): field ids, allowed options and
// the "when" visibility rules. Used to validate answers, compute completion_pct and derive the typed stat columns.
import { FURTHER_STUDY_REASON, JOB_STATUS, ORG_TYPE, PLACE, TIME_TO_JOB, TTJ_MIDPOINT, code } from './vocab.js';

const YN = ['Yes', 'No'];
const isSelfEmp = (x) => x.job_status === 'Self-employed' || x.org_type === 'Self-owned business';

export const SECTIONS = [
  { id: 'edu', questions: [
    { id: 'first_grad', options: YN }, { id: 'udmcat', options: YN },
    { id: 'honors', text: 160 }, { id: 'prof_exams', text: 160 },
  ] },
  { id: 'employment', questions: [
    { id: 'ever_employed', options: YN },
    { id: 'unemployed_reason', multi: ['Advance or further study', 'Family concern and decided not to find a job', 'Health-related reason(s)', 'Lack of work experience', 'No job opportunity available', 'Did not look for a job', 'Awaiting results of a job application'], when: (x) => x.ever_employed === 'No' },
  ] },
  { id: 'details', when: (x) => x.ever_employed === 'Yes', questions: [
    { id: 'job_name', text: 120 }, { id: 'job_address', text: 160 }, { id: 'employer', text: 160 },
    { id: 'job_status', options: Object.keys(JOB_STATUS.toCode) },
    { id: 'org_type', options: Object.keys(ORG_TYPE.toCode) },
    { id: 'business_line', options: ['Agriculture, forestry and fishing', 'Mining and quarrying', 'Manufacturing', 'Electricity, gas, steam and water supply', 'Construction', 'Wholesale and retail trade', 'Transportation and storage', 'Accommodation and food service activities', 'Information and communication', 'Financial and insurance activities', 'Real estate activities', 'Professional, scientific and technical activities', 'Administrative and support service activities', 'Public administration and defense', 'Education', 'Human health and social work activities', 'Arts, entertainment and recreation', 'Other service activities'] },
    { id: 'occ_class', options: ['Managers', 'Professionals', 'Technicians and associate professionals', 'Clerical support workers', 'Service and sales workers', 'Skilled agricultural, forestry and fishery workers', 'Craft and related trades workers', 'Plant and machine operators and assemblers', 'Elementary occupations', 'Armed forces occupations'] },
    { id: 'place_of_work', options: Object.keys(PLACE.toCode) },
    { id: 'time_to_job', options: Object.keys(TIME_TO_JOB.toCode) },
    { id: 'job_related', options: YN }, { id: 'still_working', options: YN },
    { id: 'stay_reasons', multi: ['Salaries and benefits', 'Career challenge', 'Related to special skill', 'Related to course or program of study', 'Proximity to residence', 'Peer influence', 'Family influence'], when: (x) => x.still_working === 'Yes' },
  ] },
  { id: 'self', when: isSelfEmp, questions: [
    { id: 'se_years', options: ['Less than a year', '1 year', '2 years', '3 years', '4 years', '5 years or more'] },
    { id: 'se_nature', text: 160 },
    { id: 'se_reason', multi: ['Higher income potential', 'Flexible working hours', 'Family business', 'No available employment opportunity', 'Related to my course or special skill', 'Personal passion or advocacy', 'Independence at work'] },
    { id: 'se_related', options: YN }, { id: 'se_other_job', options: YN },
  ] },
  { id: 'feedback', questions: [{ id: 'fb_contribute', text: 2000 }, { id: 'fb_activity', text: 2000 }] },
];
export const QUESTIONS = SECTIONS.flatMap((s) => s.questions);
export const SURVEY_IDS = QUESTIONS.map((q) => q.id);

const answered = (a, id) => {
  const v = a[id];
  if (Array.isArray(v)) return v.length > 0;
  return v != null && String(v).trim() !== '';
};

/** Keeps only known survey ids with allowed values; returns { answers, errors }. */
export function cleanAnswers(input) {
  const answers = {};
  const errors = {};
  QUESTIONS.forEach((q) => {
    const v = input?.[q.id];
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) return;
    if (q.multi) {
      if (!Array.isArray(v) || v.some((x) => !q.multi.includes(x))) errors[q.id] = 'Select from the listed options.';
      else answers[q.id] = [...new Set(v)];
    } else if (q.options) {
      if (!q.options.includes(v)) errors[q.id] = 'Select a valid option.';
      else answers[q.id] = v;
    } else {
      const s = String(v).trim();
      if (s.length > q.text) errors[q.id] = `Use at most ${q.text} characters.`;
      else if (s) answers[q.id] = s;
    }
  });
  return { answers, errors };
}

/** Visible-question completion, the same formula the alumni dashboard uses. */
export function completionPct(a) {
  let total = 0;
  let done = 0;
  SECTIONS.filter((s) => !s.when || s.when(a)).forEach((s) => s.questions.filter((q) => !q.when || q.when(a)).forEach((q) => {
    total += 1;
    if (answered(a, q.id)) done += 1;
  }));
  return total ? Math.round((done / total) * 100) : 0;
}

/**
 * Current employment derived from the answers (the "Employment groups" rule, see track-progress decision log):
 *  ever_employed = No  -> further_studies if the reasons include further study, else not_employed
 *  ever_employed = Yes -> not_employed when no longer working there; self_employed when job_status = Self-employed
 *                         or org_type = Self-owned business; employed otherwise.
 */
export function deriveEmployment(a) {
  if (a.ever_employed === 'No') {
    return { employment_status: (a.unemployed_reason || []).includes(FURTHER_STUDY_REASON) ? 'further_studies' : 'not_employed' };
  }
  if (a.ever_employed !== 'Yes') return null;
  const self = isSelfEmp(a);
  const bucket = code(TIME_TO_JOB, a.time_to_job);
  const related = self && a.se_related ? a.se_related : a.job_related;
  return {
    employment_status: a.still_working === 'No' ? 'not_employed' : self ? 'self_employed' : 'employed',
    job_title: a.job_name || null,
    employer_name: a.employer || null,
    org_type: code(ORG_TYPE, a.org_type),
    line_of_business: a.business_line || null,
    occupation_class: a.occ_class || null,
    place_of_work: code(PLACE, a.place_of_work),
    job_status: code(JOB_STATUS, a.job_status),
    job_location: a.job_address || null,
    is_self_employed: self,
    time_to_job_bucket: bucket,
    months_to_first_job: bucket ? TTJ_MIDPOINT[bucket] : null,
    course_relevance: related === 'Yes' ? 'related' : related === 'No' ? 'not_related' : null,
  };
}

export const yesNo = (v) => (v === 'Yes' ? true : v === 'No' ? false : null);
const noneish = (v) => !v || /^(none|n\/a|na|-)$/i.test(String(v).trim());
/** honors / prof_exams -> CREDENTIAL rows (comma or semicolon separated; "None" means no rows). */
export function credentialsFrom(a) {
  const split = (v) => (noneish(v) ? [] : String(v).split(/[;,]/).map((s) => s.trim()).filter((s) => s && !noneish(s)));
  return [...split(a.honors).map((title) => ({ type: 'honor', title })), ...split(a.prof_exams).map((title) => ({ type: 'exam', title }))];
}
