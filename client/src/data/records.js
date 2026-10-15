// Alumni Records labels and styles. The records themselves come from the API (GET /alumni).
// Statuses: pending | flagged | verified | archived (archived = ALUMNUS.archived_at, outside every count).
export const REC_STATUS_STYLE = {
  pending: { label: 'Pending', bg: '#FBF0D8', color: '#8A6D1F' },
  verified: { label: 'Verified', bg: '#E1F3EA', color: '#0F6B4F' },
  flagged: { label: 'Flagged', bg: '#FDE7EC', color: '#B3213C' },
  archived: { label: 'Archived', bg: '#EDEFF2', color: '#5A6572' },
};

/** EMPLOYMENT_RECORD.employment_status labels. The survey does not ask full-time vs part-time. */
export const EMPLOYMENT_LABEL = {
  employed: 'Employed', self_employed: 'Self-Employed / Freelancer', further_studies: 'Further studies', not_employed: 'Not yet employed',
};
export const NO_SURVEY = 'Survey not yet answered';
export const employmentLabel = (code) => EMPLOYMENT_LABEL[code] || NO_SURVEY;
export const employmentCode = (label) => Object.keys(EMPLOYMENT_LABEL).find((k) => EMPLOYMENT_LABEL[k] === label) || '';

export const SOURCE_LABEL = {
  self_registration: 'Self-registration', survey: 'Survey form', alumni_update: 'Alumni update', admin_encoded: 'Admin encoded', import: 'Imported',
};
