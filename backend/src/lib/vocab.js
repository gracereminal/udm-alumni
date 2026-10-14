// Form labels (client/src/data/formDefs.js) <-> database enum codes. One place, so stats never compare free text.
const pair = (obj) => ({ toCode: obj, toLabel: Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k])) });

export const SEX = pair({ Male: 'male', Female: 'female', 'Prefer not to say': 'prefer_not_to_say' });
export const CIVIL = pair({ Single: 'single', Married: 'married', Separated: 'separated', Widowed: 'widowed' });
export const PWD = pair({
  Visual: 'visual', Hearing: 'hearing', 'Speech and Language': 'speech_language', 'Physical / Orthopedic': 'physical',
  Intellectual: 'intellectual', Learning: 'learning', Psychosocial: 'psychosocial', Mental: 'mental', 'Chronic Illness': 'chronic_illness', Others: 'others',
});
export const JOB_STATUS = pair({ 'Regular or Permanent': 'regular', Temporary: 'temporary', Casual: 'casual', Contractual: 'contractual', 'Self-employed': 'self_employed' });
export const ORG_TYPE = pair({ Private: 'private', Government: 'government', 'Non-profit / NGO': 'non_profit', 'Self-owned business': 'self_owned' });
export const PLACE = pair({ 'Local (within the Philippines)': 'local', Abroad: 'abroad' });
export const TIME_TO_JOB = pair({
  'Less than a month': 'lt_1m', '1 to 6 months': 'm1_6', '7 to 11 months': 'm7_11', '1 year to less than 2 years': 'y1_2',
  '2 years to less than 3 years': 'y2_3', '3 years to less than 4 years': 'y3_4', 'More than 4 years': 'gt_4y',
});
/** Bucket midpoints in months, used only for averages (Form A itself reports buckets). */
export const TTJ_MIDPOINT = { lt_1m: 0.5, m1_6: 3.5, m7_11: 9, y1_2: 18, y2_3: 30, y3_4: 42, gt_4y: 54 };
export const TTJ_ORDER = ['lt_1m', 'm1_6', 'm7_11', 'y1_2', 'y2_3', 'y3_4', 'gt_4y'];

export const EMPLOYMENT_LABEL = {
  employed: 'Employed', self_employed: 'Self-Employed / Freelancer', further_studies: 'Further studies', not_employed: 'Not yet employed',
};
export const FURTHER_STUDY_REASON = 'Advance or further study';

export const EMP_TYPE = pair({ 'Full-time': 'full_time', 'Part-time': 'part_time', Contract: 'contract', Internship: 'internship', Freelance: 'freelance' });
export const EVENT_CATEGORY = pair({ EVENT: 'event', CAREER: 'career', COMMUNITY: 'community' });
export const NOTICE_KIND = pair({ Notice: 'notice', Reminder: 'reminder', Update: 'update' });
export const PLATFORMS = ['facebook', 'messenger', 'twitter', 'instagram', 'linkedin', 'website'];

export const code = (map, l) => (l == null || l === '' ? null : map.toCode[l] ?? null);
export const label = (map, c) => (c == null ? '' : map.toLabel[c] ?? '');
