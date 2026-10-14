// Alumni Records — seed data (Admin / College views). Statuses: pending | flagged | verified | archived.
export const BASE_RECORDS = [
  { sid: 'AM-2024-00891', name: 'Angela Mae Dizon', program: 'BSBA', batch: 2024, employment: 'Employed Full-time', company: 'Accenture Philippines (self-reported)', source: 'Survey form', updated: 'Sep 16, 2026', status: 'pending', note: 'Membership ID pending confirmation — submitted before Alumni Office activation.' },
  { sid: 'AM-2024-03310', name: 'Christian Paul Mendoza', program: 'BSIT', batch: 2024, employment: 'Employed Full-time', company: 'Trend Micro (self-reported)', source: 'Survey form', updated: 'Sep 15, 2026', status: 'pending', note: 'New submission — first Alumni Office review pending.' },
  { sid: 'AM-2024-04421', name: 'Kristine Bautista', program: 'BSBA', batch: 2024, employment: 'Employed Full-time', company: 'BDO Unibank (self-reported)', source: 'Survey form', updated: 'Sep 15, 2026', status: 'pending', note: '' },
  { sid: 'AM-2023-02219', name: 'Jerome Aquino', program: 'BSIT', batch: 2023, employment: 'Employed Full-time', company: 'Oracle Philippines (self-reported)', source: 'Survey form', updated: 'Sep 14, 2026', status: 'pending', note: 'Employer certificate uploaded — awaiting cross-check with masterlist entry.' },
  { sid: 'AM-2023-06654', name: 'Michelle Ramos', program: 'BSPsych', batch: 2023, employment: 'Employed Part-time', company: 'Concentrix (self-reported)', source: 'Alumni update', updated: 'Sep 13, 2026', status: 'pending', note: '' },
  { sid: 'AM-2022-07781', name: 'Allan Del Rosario', program: 'BSIT', batch: 2022, employment: 'Self-Employed / Freelancer', company: 'Freelance web developer', source: 'Survey form', updated: 'Sep 12, 2026', status: 'pending', note: 'Self-employment declared — request business or BIR registration proof.' },
  { sid: 'AM-2022-03390', name: 'Charmaine Lopez', program: 'BSCrim', batch: 2022, employment: 'Employed Full-time', company: 'Manila Police District (self-reported)', source: 'Admin encoded', updated: 'Sep 11, 2026', status: 'pending', note: '' },
  { sid: 'AM-2021-05512', name: 'Bryan Navarro', program: 'BSN', batch: 2021, employment: 'Further studies', company: 'UST Graduate School (self-reported)', source: 'Survey form', updated: 'Sep 10, 2026', status: 'pending', note: '' },
  { sid: 'AM-2021-00984', name: 'Kathleen Mercado', program: 'BSEd', batch: 2021, employment: 'Not yet employed', company: '—', source: 'Survey form', updated: 'Sep 09, 2026', status: 'pending', note: 'Survey submitted without employment section — follow up before batch clearance.' },
  { sid: 'AM-2020-06120', name: 'Paolo Enriquez', program: 'BSN', batch: 2020, employment: 'Employed Full-time', company: 'Ospital ng Maynila (self-reported)', source: 'Alumni update', updated: 'Sep 08, 2026', status: 'pending', note: '' },
  { sid: 'AM-2022-01932', name: 'John Carlo Reyes', program: 'BSIT', batch: 2022, employment: 'Employed Full-time', company: 'GCash (Mynt) (self-reported)', source: 'Admin encoded', updated: 'Sep 12, 2026', status: 'flagged', note: 'Two submissions filed under one Membership ID — merge duplicates before review.' },
  { sid: 'AM-2023-04128', name: 'Maria Santos', program: 'BSIT', batch: 2023, employment: 'Employed Full-time', company: 'Canva Philippines (self-reported)', source: 'Survey form', updated: 'Sep 10, 2026', status: 'verified', note: '' },
  { sid: 'AM-2023-07712', name: 'Mark Kenneth Torres', program: 'BSIT', batch: 2023, employment: 'Self-Employed / Freelancer', company: 'Independent consultant', source: 'Survey form', updated: 'Sep 09, 2026', status: 'verified', note: '' },
  { sid: 'AM-2020-01104', name: 'Patricia Anne Lim', program: 'BSBA', batch: 2020, employment: 'Employed Full-time', company: 'Globe Telecom (self-reported)', source: 'Alumni update', updated: 'Sep 05, 2026', status: 'verified', note: '' },
  { sid: 'AM-2021-08912', name: 'Rafael De La Cruz', program: 'BSIT', batch: 2021, employment: 'Business Owner', company: 'PayByte Solutions (self-reported)', source: 'Alumni update', updated: 'Aug 30, 2026', status: 'verified', note: '' },
  { sid: 'AM-2019-02277', name: 'Joanna Rivera', program: 'BSPsych', batch: 2019, employment: 'Not yet employed', company: '—', source: 'Admin encoded', updated: 'Aug 22, 2026', status: 'flagged', note: 'Career milestone dates overlap (2023 start vs 2022 promotion) — ask alumna to correct entries.' },
  { sid: 'AM-2018-00418', name: 'Dennis Oliveros', program: 'BSCrim', batch: 2018, employment: 'Further studies', company: 'PUP Graduate School (self-reported)', source: 'Survey form', updated: 'Jul 18, 2026', status: 'archived', note: '' },
  { sid: 'AM-2017-05590', name: 'Grace Villanueva', program: 'BSEd', batch: 2017, employment: 'Employed Part-time', company: 'Manila City Schools Division (self-reported)', source: 'Admin encoded', updated: 'Jun 02, 2026', status: 'archived', note: '' },
];

export const REC_STATUS_STYLE = {
  pending: { label: 'Pending', bg: '#FBF0D8', color: '#8A6D1F' },
  verified: { label: 'Verified', bg: '#E1F3EA', color: '#0F6B4F' },
  flagged: { label: 'Flagged', bg: '#FDE7EC', color: '#B3213C' },
  archived: { label: 'Archived', bg: '#EDEFF2', color: '#5A6572' },
};

// Full-dataset counters (Pending + Flagged + Verified + Archived === All).
export const FULL_TOTALS = { pending: 24, flagged: 9, verified: 3340, archived: 109, all: 3482 };
export const CCS_TOTALS = { pending: 9, flagged: 3, verified: 1000, archived: 31, all: 1043 };
export const CCS_COLLEGE = 'College of Computing Studies';
