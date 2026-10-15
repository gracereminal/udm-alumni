// Demo data for local, preview and staging ONLY (refuses to run with NODE_ENV=production).
// Replaces every conflicting prototype dataset (records, directory, registrations, job queue, RSVPs) with single
// ALUMNUS rows that carry both membership_id and student_no, plus a few hundred generated alumni with survey
// responses and current employment, so every statistic is real and checkable.
//   npm run seed:demo            (refuses if alumni already exist)
//   npm run seed:demo -- --reset (wipes all non-lookup data first)
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { hashPassword } from '../src/services/users.js';
import { completionPct, credentialsFrom, deriveEmployment } from '../src/lib/survey.js';
import { notify } from '../src/services/notifications.js';

export const DEMO_PASSWORD = 'demoPass123';

// Deterministic PRNG so every environment gets the same demo numbers.
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const FIRST = ['Angelo', 'Bea', 'Carlo', 'Danica', 'Enzo', 'Francine', 'Gabriel', 'Hannah', 'Isaac', 'Jasmine', 'Kevin', 'Louise', 'Miguel', 'Nicole', 'Oliver', 'Patricia', 'Quincy', 'Rhea', 'Samuel', 'Trisha', 'Ulysses', 'Vanessa', 'Warren', 'Ysabel', 'Zachary', 'Andrea', 'Bryan', 'Camille', 'Dominic', 'Erika', 'Francis', 'Grace', 'Harold', 'Ivy', 'Joshua', 'Kristine', 'Lorenzo', 'Mae', 'Nathan', 'Pauline'];
const LAST = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Tomas', 'Andrada', 'Castillo', 'Flores', 'Villanueva', 'Ramos', 'Castro', 'Rivera', 'Aquino', 'Navarro', 'Salazar', 'Mercado', 'Domingo', 'Gonzales', 'Lim', 'Tan', 'Soriano', 'Pascual', 'Valdez', 'Manalo', 'Dizon', 'Lopez'];
const EMPLOYERS = {
  tech: ['Accenture Philippines', 'Trend Micro', 'Globe Telecom', 'GCash (Mynt)', 'Maya Philippines', 'Canva Philippines', 'Oracle Philippines', 'Concentrix', 'PLDT', 'Smart Communications'],
  health: ['Ospital ng Maynila', 'Philippine General Hospital', "St. Luke's Medical Center", 'Manila Doctors Hospital', 'Department of Health'],
  edu: ['Manila City Schools Division', 'DepEd NCR', 'Far Eastern University', 'Universidad de Manila', 'Ateneo de Manila University'],
  gov: ['Manila City Hall', 'Manila Police District', 'Bureau of Internal Revenue', 'Department of Social Welfare and Development', 'Philippine National Police'],
  biz: ['BDO Unibank', 'BPI', 'SM Retail', 'Jollibee Foods Corporation', 'Robinsons Land', 'Ayala Land', 'San Miguel Corporation', 'Manila Hotel'],
};
const TITLES = {
  tech: ['Software Engineer', 'Web Developer', 'IT Support Specialist', 'Network Support Engineer', 'QA / Software Tester', 'Systems Administrator', 'Data Analyst', 'Cloud Engineer'],
  health: ['Staff Nurse', 'Physical Therapist', 'Clinical Instructor', 'Public Health Nurse'],
  edu: ['Secondary School Teacher', 'Physical Education Teacher', 'Instructor', 'Guidance Associate'],
  gov: ['Police Officer', 'Administrative Officer', 'Social Worker', 'Legal Assistant'],
  biz: ['Accounting Associate', 'Marketing Associate', 'HR Associate', 'Bank Teller', 'Front Office Associate', 'Business Analyst'],
};
const SECTOR = { tech: 'Information and communication', health: 'Human health and social work activities', edu: 'Education', gov: 'Public administration and defense', biz: 'Financial and insurance activities' };
const family = (name) => (/Information|Computer|Data Science|Cybersecurity|Electronics|BTVTE Major in Computer/.test(name) ? 'tech'
  : /Nursing|Physical Therapy|Psychology/.test(name) ? 'health'
    : /Education|BTVTE|Physical Education/.test(name) ? 'edu'
      : /Criminology|Criminal|Juris|Public Administration|Political|Social Work/.test(name) ? 'gov' : 'biz');

// Named people from the prototype (records, directory, job queue, registrations), merged one row per person.
const PEOPLE = [
  { first: 'Angela Mae', last: 'Dizon', mid: 'AM-2024-00891', sno: '2020-00891-UDM', prog: 'CBPM-BSBA-MM', batch: 2024, status: 'pending', emp: ['employed', 'SAP Systems Analyst', 'Accenture Philippines', 'tech'], note: 'Membership ID pending confirmation — submitted before Alumni Office activation.', dir: { industry: 'IT Consulting', skills: ['SAP ERP', 'SQL', 'Business Process Modeling'], email: true, links: { linkedin: 'linkedin.com/in/angeladizon' } } },
  { first: 'Christian Paul', last: 'Mendoza', mid: 'AM-2024-03310', sno: '2021-03310-UDM', prog: 'CCS-BSIT', batch: 2024, status: 'pending', emp: ['employed', 'Associate Cybersecurity Engineer', 'Trend Micro', 'tech'], dir: { industry: 'Cybersecurity', skills: ['Network Security', 'Penetration Testing', 'Python'], links: { messenger: 'm.me/cpmendoza', linkedin: 'linkedin.com/in/cpmendoza' } } },
  { first: 'Kristine', last: 'Bautista', mid: 'AM-2024-04421', sno: '2020-04421-UDM', prog: 'CBPM-BSBA-HRM', batch: 2024, status: 'pending', emp: ['employed', 'HR Associate', 'BDO Unibank', 'biz'] },
  { first: 'Jerome', last: 'Aquino', mid: 'AM-2023-02219', sno: '2019-02219-UDM', prog: 'CCS-BSIT', batch: 2023, status: 'pending', emp: ['employed', 'Database Administrator', 'Oracle Philippines', 'tech'], note: 'Employer certificate uploaded — awaiting cross-check with masterlist entry.' },
  { first: 'Michelle', last: 'Ramos', mid: 'AM-2023-06654', sno: '2019-06654-UDM', prog: 'CAS-BSPsych', batch: 2023, status: 'pending', emp: ['employed', 'Customer Experience Specialist', 'Concentrix', 'biz'] },
  { first: 'Allan', last: 'Del Rosario', mid: 'AM-2022-07781', sno: '2018-07781-UDM', prog: 'CCS-BSIT', batch: 2022, status: 'pending', emp: ['self_employed', 'Freelance Web Developer', 'Self-employed', 'tech'], note: 'Self-employment declared — request business or BIR registration proof.' },
  { first: 'Charmaine', last: 'Lopez', mid: 'AM-2022-03390', sno: '2018-03390-UDM', prog: 'CCJ-BSCrim', batch: 2022, status: 'pending', emp: ['employed', 'Police Officer', 'Manila Police District', 'gov'] },
  { first: 'Bryan', last: 'Navarro', mid: 'AM-2021-05512', sno: '2017-05512-UDM', prog: 'CHS-BSN', batch: 2021, status: 'pending', emp: ['further_studies'] },
  { first: 'Kathleen', last: 'Mercado', mid: 'AM-2021-00984', sno: '2017-00984-UDM', prog: 'COED-BSEd-Eng', batch: 2021, status: 'pending', emp: ['not_employed'], note: 'Survey submitted without employment section — follow up before batch clearance.' },
  { first: 'Paolo', last: 'Enriquez', mid: 'AM-2020-06120', sno: '2016-06120-UDM', prog: 'CHS-BSN', batch: 2020, status: 'pending', emp: ['employed', 'Staff Nurse', 'Ospital ng Maynila', 'health'] },
  { first: 'John Carlo', last: 'Reyes', mid: 'AM-2022-01932', sno: '2018-01932-UDM', prog: 'CCS-BSIT', batch: 2022, status: 'flagged', emp: ['employed', 'Cloud DevOps Specialist', 'GCash (Mynt)', 'tech'], note: 'Two submissions filed under one Membership ID — merge duplicates before review.', dir: { industry: 'Financial Technology', skills: ['Kubernetes', 'Docker', 'Terraform'], email: true, links: { linkedin: 'linkedin.com/in/jcreyes-devops', website: 'jcreyes.dev' } } },
  { first: 'Maria', last: 'Santos', mid: 'AM-2023-04128', sno: '2019-04128-UDM', prog: 'CCS-BSIT', batch: 2023, status: 'verified', emp: ['employed', 'Senior Software Engineer', 'Canva Philippines', 'tech'], account: 'maria.santos@udm.edu.ph', dir: { industry: 'Software & Design', skills: ['React', 'TypeScript', 'Node.js'], email: true, links: { messenger: 'm.me/mariasantos.dev', linkedin: 'linkedin.com/in/mariasantos', website: 'mariasantos.io' } } },
  { first: 'Mark Kenneth', last: 'Torres', mid: 'AM-2023-07712', sno: '2019-07712-UDM', prog: 'CCS-BSIT', batch: 2023, status: 'verified', emp: ['self_employed', 'Full-Stack Mobile Developer', 'Independent Consultant', 'tech'], dir: { industry: 'Freelance Software Development', skills: ['React Native', 'Firebase', 'Next.js'], email: true, links: { messenger: 'm.me/mktorres', website: 'mktorres.studio' } } },
  { first: 'Patricia Anne', last: 'Lim', mid: 'AM-2020-01104', sno: '2016-01104-UDM', prog: 'CBPM-BSBA-BE', batch: 2020, status: 'verified', emp: ['employed', 'Lead Product Manager', 'Globe Telecom', 'tech'], account: 'patricia.lim@udm.edu.ph', dir: { industry: 'Telecommunications', skills: ['Agile Scrum', 'Product Lifecycle', 'Data Analytics'], links: { linkedin: 'linkedin.com/in/patricialim-pm' } } },
  { first: 'Rafael', last: 'De La Cruz', mid: 'AM-2021-08912', sno: '2017-08912-UDM', prog: 'CCS-BSIT', batch: 2021, status: 'verified', emp: ['self_employed', 'Co-Founder & CTO', 'PayByte Solutions', 'tech', 'self_owned'], account: 'rafael.delacruz@udm.edu.ph', dir: { industry: 'Financial Technology', skills: ['Go', 'Microservices', 'PostgreSQL'], links: {} } },
  { first: 'Joanna', last: 'Rivera', mid: 'AM-2019-02277', sno: '2015-02277-UDM', prog: 'CAS-BSPsych', batch: 2019, status: 'flagged', emp: ['not_employed'], note: 'Career milestone dates overlap (2023 start vs 2022 promotion) — ask alumna to correct entries.' },
  { first: 'Dennis', last: 'Oliveros', mid: 'AM-2018-00418', sno: '2014-00418-UDM', prog: 'CCJ-BSCrim', batch: 2018, status: 'verified', archived: true, emp: ['further_studies'] },
  { first: 'Grace', last: 'Villanueva', mid: 'AM-2017-05590', sno: '2013-05590-UDM', prog: 'COED-BSEd-Math', batch: 2017, status: 'verified', archived: true, emp: ['employed', 'Secondary School Teacher', 'Manila City Schools Division', 'edu'] },
];

const JOBS = [
  { title: 'Junior Backend Developer', company: 'Brightline Tech', location: 'Manila · Hybrid', type: 'full_time', badge: 'Alumni Founded', salary: '₱35,000 - ₱48,000', note: '2 UDM alumni work here', tags: ['Node.js', 'SQL', 'Express', 'AWS'], days: 2, deadline: 11, applyVia: 'careers@brightline.tech', desc: 'Build and maintain REST APIs for Brightline’s logistics platform. You will pair with senior engineers, write tests, and ship weekly. Fresh graduates with solid Node.js and SQL fundamentals are welcome.' },
  { title: 'Product Marketing Associate', company: 'Nimbus Systems', location: 'Cebu · Remote', type: 'full_time', badge: 'UDM Referral Available', salary: '₱40,000 - ₱55,000', tags: ['Marketing', 'SaaS', 'Growth Marketing'], days: 5, deadline: 16, applyVia: 'talent@nimbus.systems', desc: 'Own go-to-market messaging for Nimbus’ SaaS suite: launch campaigns, write product copy, and work with sales on enablement. Marketing, communication or business graduates preferred.' },
  { title: 'Data Analyst Intern', company: 'Veyra Analytics', location: 'Quezon City · On-site', type: 'internship', badge: 'Alumni Hiring Partner', salary: '₱18,000 - ₱22,000', salaryNote: 'allowance / month', tags: ['SQL', 'Excel', 'Python', 'Power BI'], days: 7, deadline: 6, applyVia: 'talent@veyra.ai', desc: '6-month internship supporting client reporting. You will clean data, build Power BI dashboards and present weekly findings. Open to final-year students and recent graduates.' },
  { title: 'UX/UI Designer', company: 'Formwell Studio', location: 'Pasig · Hybrid', type: 'full_time', badge: 'Lead by Alumni', salary: '₱45,000 - ₱65,000', tags: ['Figma', 'Design Systems', 'User Research'], days: 3, deadline: 22, applyVia: 'hello@formwell.studio', desc: 'Design end-to-end product experiences for fintech and e-commerce clients, maintain the studio design system and run usability sessions. A portfolio is required.' },
  { title: 'Cloud Support Engineer', company: 'Northpoint Cloud', location: 'Davao · Remote', type: 'full_time', badge: 'Urgent Hiring', salary: '₱50,000 - ₱70,000', note: 'Fast-track interview for UDM grads', tags: ['AWS', 'Linux', 'Docker', 'Terraform'], days: 0, deadline: 4, applyVia: 'jobs@northpoint.cloud', desc: 'Troubleshoot customer workloads on AWS, own incident follow-ups and write runbooks. Rotating on-call with allowance.' },
];
const QUEUE = [
  { by: 'maria.santos@udm.edu.ph', title: 'QA Automation Engineer', company: 'Seaboard Digital', location: 'Manila · Hybrid', type: 'full_time', salary: '₱38,000 - ₱50,000', tags: ['Selenium', 'Cypress', 'CI/CD', 'JavaScript'], applyVia: 'careers@seaboard.digital', deadline: 7, desc: 'Seaboard Digital is hiring a QA Automation Engineer to build and maintain end-to-end test suites for its banking apps. 1–2 years of test automation experience preferred; fresh grads with strong JavaScript fundamentals are welcome to apply. I work on the QA team and can refer UDM alumni directly.' },
  { by: 'rafael.delacruz@udm.edu.ph', title: 'IT Support Associate', company: 'Coastal Bank', location: 'Makati · On-site', type: 'full_time', salary: '₱25,000 - ₱30,000', tags: ['Help Desk', 'Windows', 'Networking'], applyVia: 'hr.recruitment@coastalbank.ph', deadline: 9, desc: 'Entry-level IT support role at the Makati head office. Handles employee tickets, device setup and basic network troubleshooting. Rotating shifts, with HMO from day one. Open to BSIT and BSCS graduates.' },
  { by: 'patricia.lim@udm.edu.ph', title: 'Finance Analyst', company: 'Veyra Analytics', location: 'Quezon City · Hybrid', type: 'contract', salary: '₱32,000 - ₱40,000', tags: ['Excel', 'Financial Modeling', 'Power BI'], applyVia: 'talent@veyra.ai', deadline: 12, desc: '6-month contract, extendable, supporting month-end close and client reporting. Strong Excel required; Power BI is a plus. Hybrid set-up, 3 days on-site in Quezon City.' },
];

// Events relative to "today" (Manila) so the demo always has upcoming and past events.
const EVENTS = [
  { key: 'homecoming', in: 10, t1: '16:00', t2: '22:00', title: 'UDM Grand Alumni Homecoming 2026', category: 'event', organizer: 'UDM Alumni Relations Office', venue: 'UDM Gymnasium, Mehan Gardens, Manila', fee: 'Free for alumni · ₱350 per guest', regs: 412,
    highlights: ['Recognition of golden (Batch 1976) and silver (Batch 2001) jubilarians', 'Outstanding Alumni Awards', 'Variety show by the UDM alumni chorale', 'Batch tables of ten — reserve with the Alumni Affairs office'],
    regFields: [{ key: 'guests', label: 'Guests you’re bringing', hint: '₱350 per guest, payable at the registration desk', options: ['None', '1', '2', '3'] }, { key: 'seat', label: 'Seating preference', options: ['With my batch', 'Open seating'] }],
    body: 'The biggest gathering of Merlions returns to the gymnasium for an evening of batch reunions, a variety show by the alumni chorale, and the awarding of this year’s Outstanding Alumni.\n\nGolden jubilarians (Batch 1976) and silver jubilarians (Batch 2001) will be recognized on stage. Batch coordinators may reserve tables of ten at the Alumni Affairs office.',
    agenda: [['15:00', 'Registration and batch check-in'], ['16:00', 'Holy Mass at the university chapel'], ['17:30', 'Opening program and jubilarian recognition'], ['19:00', 'Dinner, variety show and batch presentations'], ['21:00', 'Raffle draw and socials']] },
  { key: 'jobfair', in: 4, t1: '09:00', t2: '16:00', title: 'Alumni Job Fair — 18 partner employers', category: 'career', organizer: 'Career & Placement Office', venue: 'UDM Quadrangle and Function Rooms 2–4', fee: 'Free admission', regs: 286,
    highlights: ['18 partner employers across fintech, BPO and engineering', 'On-the-spot interviews and same-day job offers', 'Free resume clinic and mock interviews'],
    body: 'Eighteen partner employers will conduct on-the-spot interviews, with same-day job offers for qualified applicants. Bring five copies of your resume and a valid ID.\n\nA resume clinic and mock-interview room run all day in Function Room 4 for alumni who graduated within the last three years.',
    agenda: [['09:00', 'Booths open · initial screening'], ['10:30', 'Resume clinic (Function Room 4)'], ['13:00', 'Employer talks: fintech and BPO tracks'], ['15:00', 'Final interviews and job-offer releasing']] },
  { key: 'run', in: 25, t1: '05:00', t2: '09:00', title: 'Merlion Run 2026 — Scholarship Fun Run', category: 'community', organizer: 'UDM Alumni Association', venue: 'Rizal Park, Ermita, Manila', fee: '₱500 (3K) · ₱650 (5K) · ₱800 (10K)', capacity: 600, regs: 134,
    highlights: ['100% of proceeds fund alumni scholarships', 'Singlet, race bib and finisher medal included', '3K, 5K and 10K categories'],
    regFields: [{ key: 'dist', label: 'Race category', hint: 'Fee is paid when claiming your race kit', options: ['3K · ₱500', '5K · ₱650', '10K · ₱800'] }, { key: 'size', label: 'Singlet size', options: ['XS', 'S', 'M', 'L', 'XL'] }],
    body: 'Proceeds go entirely to the alumni scholarship fund, which supported 60 scholars this academic year. Registration includes a singlet, race bib and finisher medal.\n\nRace kits may be claimed at the Alumni Affairs office, 9:00 AM to 5:00 PM.',
    agenda: [['05:00', 'Assembly and warm-up'], ['05:30', '10K gun start'], ['05:45', '5K and 3K gun start'], ['08:00', 'Awarding and raffle']] },
  { key: 'mentor', in: 39, t1: '18:00', t2: '21:00', title: 'Career Mentorship Night with Batch 2010–2015', category: 'career', organizer: 'UDM Alumni Relations Office', venue: 'Audio-Visual Room, Building B', fee: 'Free · limited to 80 participants', capacity: 80, regs: 80,
    highlights: ['Twelve mentors from IT, education, finance and public service', 'Three rounds of small-group sessions', 'Resume and interview review'],
    body: 'Mentors from IT, education, finance and public service hold three rounds of small-group sessions with graduating students and recent alumni looking to shift careers.\n\nSign-ups close once the 80-participant cap is reached.',
    agenda: [['18:00', 'Registration and mentor matching'], ['18:30', 'Round 1 — industry breakout'], ['19:30', 'Round 2 — resume and interview review'], ['20:30', 'Open networking']] },
  { key: 'cleanup', in: -25, t1: '06:00', t2: '10:00', title: 'Alumni Coastal Cleanup at Manila Bay', category: 'community', organizer: 'UDM Alumni Association', venue: 'Manila Baywalk, Roxas Boulevard', fee: 'Free · volunteers', regs: 96,
    highlights: ['96 alumni volunteers', 'Over 400 kg of waste collected'],
    body: 'Alumni volunteers and their families joined International Coastal Cleanup Day along the Manila Baywalk, in partnership with the city environment office.',
    agenda: [['06:00', 'Assembly and safety briefing'], ['06:30', 'Cleanup in assigned zones'], ['09:30', 'Waste audit and group photo']] },
];

const NOTICES = [
  { kind: 'reminder', source: 'UDM Alumni Relations Office', title: 'Alumni survey cycle now open', body: 'Employment records for AY 2025–2026 are being consolidated for CHED reporting. Update your answers before November 15.', ago: 16 },
  { kind: 'update', source: 'University Bulletin', title: 'UDM alumni scholarship fund reaches ₱2.4M', body: 'Contributions from the 2015–2020 batches will support 60 new scholars this academic year.', ago: 24 },
];

const TTJ = ['Less than a month', '1 to 6 months', '1 to 6 months', '1 to 6 months', '7 to 11 months', '1 year to less than 2 years', '2 years to less than 3 years'];
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

/** Survey answers for an employment outcome (the same answers the form would produce). */
function answersFor(r, outcome, fam) {
  const a = { first_grad: r() < 0.37 ? 'Yes' : 'No', udmcat: r() < 0.8 ? 'Yes' : 'No', honors: r() < 0.12 ? 'Cum Laude' : 'None', prof_exams: fam === 'health' && r() < 0.7 ? 'Nursing Licensure Examination' : fam === 'edu' && r() < 0.6 ? 'Licensure Examination for Teachers' : 'None' };
  const [status, title, employer, f, org] = outcome;
  if (status === 'not_employed' || status === 'further_studies') {
    a.ever_employed = 'No';
    a.unemployed_reason = status === 'further_studies' ? ['Advance or further study'] : [pick(r, ['Lack of work experience', 'No job opportunity available', 'Awaiting results of a job application', 'Family concern and decided not to find a job'])];
    return a;
  }
  const self = status === 'self_employed';
  Object.assign(a, {
    ever_employed: 'Yes', job_name: title, employer, job_address: 'Metro Manila',
    job_status: self ? 'Self-employed' : pick(r, ['Regular or Permanent', 'Regular or Permanent', 'Regular or Permanent', 'Contractual', 'Temporary']),
    org_type: org === 'self_owned' ? 'Self-owned business' : self ? 'Self-owned business' : f === 'gov' || (f === 'edu' && r() < 0.6) ? 'Government' : 'Private',
    business_line: SECTOR[f || 'biz'], occ_class: pick(r, ['Professionals', 'Professionals', 'Technicians and associate professionals', 'Clerical support workers', 'Service and sales workers']),
    place_of_work: r() < 0.93 ? 'Local (within the Philippines)' : 'Abroad', time_to_job: pick(r, TTJ),
    job_related: r() < 0.72 ? 'Yes' : 'No', still_working: 'Yes', stay_reasons: ['Salaries and benefits'],
  });
  if (self) Object.assign(a, { se_years: pick(r, ['1 year', '2 years', '3 years']), se_nature: title, se_reason: ['Independence at work'], se_related: a.job_related, se_other_job: 'No' });
  return a;
}

async function insertAlumnus(db, p) {
  const { rows: [row] } = await db.query(
    `INSERT INTO alumnus (user_id, membership_id, student_no, program_id, course_other, declared_college_id, year_graduated, last_name, first_name, birth_date, sex, civil_status,
                          present_address, permanent_address, mobile_no, is_indigenous, indigenous_group, pwd_type, verification_status, record_source, flag_note,
                          archived_at, privacy_consent_at, directory_opt_in, show_email, industry, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$26) RETURNING alumni_id`,
    [p.userId || null, p.mid, p.sno, p.programId, p.courseOther || null, p.declaredCollegeId || null, p.batch, p.last, p.first, p.dob, p.sex, 'single',
      p.address, p.mobile, !!p.ip, p.ip || null, p.pwd || null, p.status, p.source || 'survey', p.note || null, p.archived ? new Date() : null,
      p.userId ? new Date() : null, !!p.dir, !!p.dir?.email, p.dir?.industry || null, p.createdAt || new Date()],
  );
  return row.alumni_id;
}

async function submitSurvey(db, alumniId, cycleId, answers, when) {
  const { rows: [resp] } = await db.query(
    `INSERT INTO survey_response (alumni_id, cycle_id, status, completion_pct, first_gen_grad, passed_udmcat, answers, saved_at, submitted_at)
     VALUES ($1, $2, 'submitted', $3, $4, $5, $6, $7, $7) RETURNING response_id`,
    [alumniId, cycleId, completionPct(answers), answers.first_grad === 'Yes', answers.udmcat === 'Yes', JSON.stringify(answers), when],
  );
  const e = deriveEmployment(answers);
  const cols = Object.keys(e);
  await db.query(`INSERT INTO employment_record (alumni_id, response_id, ${cols.join(', ')}, reported_at) VALUES ($1, $2, ${cols.map((_, i) => `$${i + 3}`).join(', ')}, $${cols.length + 3})`,
    [alumniId, resp.response_id, ...cols.map((c) => e[c]), when]);
  for (const c of credentialsFrom(answers)) await db.query('INSERT INTO credential (alumni_id, type, title) VALUES ($1, $2, $3)', [alumniId, c.type, c.title]);
}

async function setSkills(db, alumniId, names) {
  for (const [i, name] of names.entries()) {
    const { rows: [s] } = await db.query('INSERT INTO skill (name) VALUES ($1) ON CONFLICT (lower(name)) DO UPDATE SET name = skill.name RETURNING skill_id', [name]);
    await db.query('INSERT INTO alumni_skill (alumni_id, skill_id, is_top) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [alumniId, s.skill_id, i === 0]);
  }
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Demo data (fake alumni, public demo password, and --reset's TRUNCATE of user_account) must never reach a real
 * database. NODE_ENV alone is not enough: a shell with a production DATABASE_URL and the default NODE_ENV would pass,
 * so the target database is checked too.
 */
export function assertDemoSeedAllowed(env = process.env) {
  if (env.NODE_ENV === 'production') throw new Error('Refusing to seed demo data with NODE_ENV=production.');
  const url = env.DATABASE_URL || '';
  if (/sslmode=(require|verify-ca|verify-full)/.test(url)) throw new Error('Refusing to seed demo data: DATABASE_URL looks like a production database (sslmode is set).');
  let host = '';
  try { host = new URL(url).hostname; } catch { /* unparseable URL is treated as non-local */ }
  if (!LOCAL_HOSTS.has(host) && !['true', '1'].includes(env.ALLOW_DEMO_SEED)) {
    throw new Error(`Refusing to seed demo data into non-local database host "${host || 'unknown'}". Use a local database, or set ALLOW_DEMO_SEED=true for a staging database.`);
  }
}

export async function seedDemo(db, { count = 640, reset = false } = {}) {
  assertDemoSeedAllowed();
  const { rows: [{ n }] } = await db.query('SELECT count(*)::int AS n FROM alumnus');
  if (n > 0 && !reset) throw new Error('Alumni already exist. Re-run with --reset to wipe non-lookup data first.');
  if (reset) {
    await db.query(`TRUNCATE notification, audit_log, report_export, announcement, event_registration, event_reg_field, event_agenda_item, event,
      saved_job, job_skill, job_posting, outreach_contact, record_review, proof_document, employment_record, survey_response, alumni_skill, credential,
      social_link, alumnus, password_reset, auth_session, user_account RESTART IDENTITY CASCADE`);
  }
  const r = rng(20261014);
  const { rows: [cycle] } = await db.query('SELECT cycle_id, opens_on FROM v_active_cycle');
  const { rows: programs } = await db.query('SELECT p.program_id, p.code, p.abbr, p.name, p.college_id, c.code AS college_code FROM program p JOIN college c ON c.college_id = p.college_id');
  const byCode = Object.fromEntries(programs.map((p) => [p.code, p]));
  const { rows: [oth] } = await db.query("SELECT college_id FROM college WHERE code = 'OTH'");
  const { rows: [ccs] } = await db.query("SELECT college_id FROM college WHERE code = 'CCS'");
  const { rows: [{ today }] } = await db.query("SELECT to_char(app_today(), 'YYYY-MM-DD') AS today");
  const day = (offset) => { const d = new Date(`${today}T00:00:00+08:00`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
  const pwHash = await hashPassword(DEMO_PASSWORD);
  const unusable = await hashPassword(`Unusable-${Math.random()}-X1`);

  const user = async (email, role, name, extra = {}) => (await db.query(
    `INSERT INTO user_account (email, password_hash, role, display_name, role_label, college_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, now()) RETURNING user_id`,
    [email, extra.hash || pwHash, role, name, extra.label || null, extra.collegeId || null],
  )).rows[0].user_id;

  // The three demo accounts (staging/demo only).
  const adminId = await user('admin@udmalumni.edu', 'admin', 'System Admin', { label: 'Administrator' });
  const deanId = await user('ccs.dean@udmalumni.edu', 'dept', 'Dr. Maria Santos', { label: 'College Dean', collegeId: ccs.college_id });
  const mariaUser = await user('maria.delacruz@udmalumni.edu', 'alumni', 'Maria Dela Cruz');
  const mariaId = await insertAlumnus(db, {
    userId: mariaUser, mid: 'AM-2024-00567', sno: '2024-00567-UDM', programId: byCode['CCS-BSIT'].program_id, batch: 2024, first: 'Maria', last: 'Dela Cruz',
    dob: '2002-03-14', sex: 'female', address: 'Sampaloc, Manila', mobile: '639171234567', status: 'pending', source: 'survey',
    note: 'Survey items on industry and income bracket left blank — request completion from alumna.', dir: { industry: 'Data Engineering' },
  });
  await db.query("INSERT INTO social_link (alumni_id, platform, url, is_visible) VALUES ($1, 'linkedin', 'linkedin.com/in/mariadelacruz', true), ($1, 'facebook', 'maria.delacruz', false)", [mariaId]);
  await submitSurvey(db, mariaId, cycle.cycle_id, answersFor(r, ['employed', 'Junior Data Engineer', 'Maya Philippines', 'tech'], 'tech'), new Date(`${day(-28)}T10:00:00+08:00`));
  await setSkills(db, mariaId, ['Python', 'Spark', 'SQL', 'Power BI', 'Excel']);

  const alumniIds = [mariaId];
  const accountByEmail = {};
  for (const p of PEOPLE) {
    const prog = byCode[p.prog];
    const userId = p.account ? await user(p.account, 'alumni', `${p.first} ${p.last}`, { hash: unusable }) : null;
    if (p.account) accountByEmail[p.account] = userId;
    const id = await insertAlumnus(db, {
      ...p, userId, programId: prog.program_id, dob: `${p.batch - 22}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}`, sex: r() < 0.5 ? 'female' : 'male',
      address: 'Manila', mobile: `6391${String(Math.floor(r() * 1e8)).padStart(8, '0')}`, createdAt: new Date(`${day(-30 - Math.floor(r() * 60))}T09:00:00+08:00`),
    });
    alumniIds.push(id);
    await submitSurvey(db, id, cycle.cycle_id, answersFor(r, p.emp, p.emp[3] || family(prog.name)), new Date(`${day(-Math.floor(r() * 25))}T09:00:00+08:00`));
    if (p.dir) {
      await setSkills(db, id, p.dir.skills);
      for (const [platform, url] of Object.entries(p.dir.links)) await db.query('INSERT INTO social_link (alumni_id, platform, url, is_visible) VALUES ($1, $2, $3, true)', [id, platform, url]);
    }
  }

  // Generated alumni across every college / program for batches 2019–2026.
  const progList = programs.filter((p) => p.college_code !== 'OTH');
  for (let i = 0; i < count; i += 1) {
    const unmapped = i % 97 === 13;
    const prog = unmapped ? null : (r() < 0.22 ? byCode[pick(r, ['CCS-BSIT', 'CET-BSCS', 'CHS-BSN', 'CCJ-BSCrim'])] : pick(r, progList));
    const batch = 2019 + Math.floor(r() * 8);
    const fam = prog ? family(prog.name) : 'biz';
    const age = 2026 - batch;
    const first = pick(r, FIRST);
    const last = pick(r, LAST);
    const seq = String(20000 + i).padStart(5, '0');
    const hasAccount = r() < 0.55;
    const userId = hasAccount ? await user(`${first.toLowerCase()}.${last.toLowerCase()}.${seq}@example.com`, 'alumni', `${first} ${last}`, { hash: unusable }) : null;
    const status = r() < 0.04 ? 'flagged' : r() < 0.2 ? 'pending' : 'verified';
    const id = await insertAlumnus(db, {
      userId, mid: `AM-${batch}-${seq}`, sno: `${batch - 4}-${seq}-UDM`, programId: prog?.program_id || null,
      courseOther: unmapped ? 'Bachelor of Science in Marine Transportation' : null, declaredCollegeId: unmapped ? oth.college_id : null,
      batch, first, last, dob: `${batch - 22}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}`, sex: r() < 0.52 ? 'female' : 'male', address: 'Metro Manila',
      mobile: `6399${String(Math.floor(r() * 1e8)).padStart(8, '0')}`, ip: r() < 0.04 ? pick(r, ['Aeta', 'Igorot', 'Lumad', 'Mangyan', 'Ifugao']) : null,
      pwd: r() < 0.022 ? pick(r, ['physical', 'visual', 'hearing', 'psychosocial', 'chronic_illness']) : null,
      status, archived: r() < 0.03, source: userId ? 'self_registration' : pick(r, ['import', 'admin_encoded']),
      createdAt: new Date(`${day(-Math.floor(r() * 200))}T09:00:00+08:00`),
    });
    alumniIds.push(id);
    // Older batches are better traced and better employed — like the prototype's curves, but as real rows.
    const traced = r() < Math.min(0.85, 0.42 + age * 0.06);
    if (!traced) continue;
    const roll = r();
    const empP = Math.min(0.9, 0.62 + age * 0.04);
    const outcome = roll < empP * 0.88 ? ['employed', pick(r, TITLES[fam]), pick(r, EMPLOYERS[fam]), fam]
      : roll < empP ? ['self_employed', pick(r, ['Online Seller', 'Freelance Consultant', 'Small Business Owner']), 'Self-employed', fam, r() < 0.5 ? 'self_owned' : null]
        : roll < empP + 0.06 ? ['further_studies'] : ['not_employed'];
    await submitSurvey(db, id, cycle.cycle_id, answersFor(r, outcome, fam), new Date(`${day(-Math.floor(r() * 16))}T09:00:00+08:00`));
    if (r() < 0.05) await db.query('UPDATE alumnus SET directory_opt_in = true WHERE alumni_id = $1', [id]);
  }

  // Jobs: admin postings (approved), alumni submissions (pending), Maria's saved jobs.
  const jobIds = {};
  for (const j of JOBS) {
    const { rows: [row] } = await db.query(
      `INSERT INTO job_posting (posted_by, reviewed_by, title, company, location, employment_type, salary_range, salary_note, deadline, how_to_apply, description, badge, note, source, approval_status, published_at, created_at)
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'admin', 'approved', now() - make_interval(days => $13), now() - make_interval(days => $13)) RETURNING job_id`,
      [adminId, j.title, j.company, j.location, j.type, j.salary, j.salaryNote || 'per month', day(j.deadline), j.applyVia, j.desc, j.badge, j.note || null, j.days],
    );
    jobIds[j.company] = row.job_id;
    for (const t of j.tags) await db.query('INSERT INTO job_skill (job_id, skill_id) SELECT $1, skill_id FROM skill WHERE lower(name) = lower($2)', [row.job_id, t]);
  }
  for (const [i, q] of QUEUE.entries()) {
    const { rows: [row] } = await db.query(
      `INSERT INTO job_posting (posted_by, title, company, location, employment_type, salary_range, salary_note, deadline, how_to_apply, description, source, approval_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'per month', $7, $8, $9, 'alumni', 'pending', now() - make_interval(hours => $10)) RETURNING job_id`,
      [accountByEmail[q.by], q.title, q.company, q.location, q.type, q.salary, day(q.deadline), q.applyVia, q.desc, [2, 26, 600][i]],
    );
    for (const t of q.tags) await db.query('INSERT INTO job_skill (job_id, skill_id) SELECT $1, skill_id FROM skill WHERE lower(name) = lower($2)', [row.job_id, t]);
  }
  for (const c of ['Brightline Tech', 'Formwell Studio', 'Northpoint Cloud']) await db.query('INSERT INTO saved_job (alumni_id, job_id, saved_at) VALUES ($1, $2, now())', [mariaId, jobIds[c]]);

  // Events with real registrations (capped by the population).
  const active = (await db.query('SELECT alumni_id FROM alumnus WHERE archived_at IS NULL AND merged_into_id IS NULL AND alumni_id <> $1 ORDER BY alumni_id', [mariaId])).rows.map((x) => x.alumni_id);
  for (const e of EVENTS) {
    const d = day(e.in);
    const { rows: [ev] } = await db.query(
      `INSERT INTO event (created_by, title, category, organizer, starts_at, ends_at, venue, fee_text, capacity, highlights, teaser, body, published_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now() - make_interval(days => $13), now() - make_interval(days => $13)) RETURNING event_id`,
      [adminId, e.title, e.category, e.organizer, `${d}T${e.t1}:00+08:00`, `${d}T${e.t2}:00+08:00`, e.venue, e.fee, e.capacity || null, JSON.stringify(e.highlights),
        e.body.split('\n\n')[0].slice(0, 150), e.body, Math.max(1, 30 - Math.abs(e.in))],
    );
    for (const [i, [t, l]] of e.agenda.entries()) await db.query('INSERT INTO event_agenda_item (event_id, start_time, label, sort_order) VALUES ($1, $2, $3, $4)', [ev.event_id, t, l, i]);
    for (const [i, f] of (e.regFields || []).entries()) await db.query('INSERT INTO event_reg_field (event_id, field_key, label, hint, options, sort_order) VALUES ($1, $2, $3, $4, $5, $6)', [ev.event_id, f.key, f.label, f.hint || null, JSON.stringify(f.options), i]);
    const n = Math.min(e.regs, active.length);
    const start = Math.floor(r() * active.length);
    for (let k = 0; k < n; k += 1) {
      const answers = Object.fromEntries((e.regFields || []).map((f) => [f.key, pick(r, f.options)]));
      await db.query('INSERT INTO event_registration (event_id, alumni_id, answers, registered_at) VALUES ($1, $2, $3, now() - make_interval(hours => $4))', [ev.event_id, active[(start + k) % active.length], JSON.stringify(answers), Math.floor(r() * 400)]);
    }
  }
  for (const nt of NOTICES) await db.query('INSERT INTO announcement (author_id, kind, source, title, body, published_at) VALUES ($1, $2, $3, $4, $5, now() - make_interval(days => $6))', [adminId, nt.kind, nt.source, nt.title, nt.body, nt.ago]);

  // A few outreach contacts and report exports so those screens have history.
  const unresp = (await db.query("SELECT alumni_id FROM v_unresponsive WHERE college_id = $1 ORDER BY alumni_id LIMIT 3", [ccs.college_id])).rows;
  for (const [i, u] of unresp.entries()) await db.query("INSERT INTO outreach_contact (alumni_id, contacted_by, method, template, outcome, contacted_at) VALUES ($1, $2, 'email', 'survey_followup', 'sent', now() - make_interval(days => $3))", [u.alumni_id, deanId, 9 + i * 12]);
  await db.query(`INSERT INTO report_export (generated_by, report_type, format, record_count, scope_label, status, created_at) VALUES
    ($1, 'ched', 'pdf', 0, 'All colleges · last five batches', 'submitted', now() - interval '47 days'),
    ($1, 'coverage', 'excel', 0, 'All colleges · last five batches', 'ready', now() - interval '30 days')`, [adminId]);

  // Notifications whose numbers come from the views at creation time (never typed).
  const { rows: [pend] } = await db.query("SELECT count(*)::int AS n FROM v_alumni_current WHERE verification_status = 'pending'");
  const { rows: [pendCcs] } = await db.query("SELECT count(*)::int AS n FROM v_alumni_current WHERE verification_status = 'pending' AND college_id = $1", [ccs.college_id]);
  await notify(db, [adminId], { type: 'registration', title: `${pend.n} alumni records awaiting verification`, message: 'Review them against the registrar’s graduate list.', link: 'records' });
  await notify(db, [deanId], { type: 'registration', title: `${pendCcs.n} CCS records awaiting verification`, message: 'Review them against the registrar’s graduate list.', link: 'records' });
  await notify(db, [adminId], { type: 'job_submitted', title: `${QUEUE.length} job postings submitted for review`, message: 'Alumni-submitted postings are waiting in the approval queue.', link: 'jobs' });
  await notify(db, [mariaUser], { type: 'job_match', title: 'New job match: Cloud Support Engineer', message: 'Northpoint Cloud is hiring and your skills match this posting.', link: 'jobs' });
  await notify(db, [mariaUser], { type: 'survey', title: 'Alumni survey response received', message: `Thank you — your ${cycle ? 'AY 2025–2026' : ''} survey has been recorded.`, link: 'dashboard' });

  await db.query("SELECT setval('membership_seq', 30000)");
  return { alumni: alumniIds.length, users: (await db.query('SELECT count(*)::int AS n FROM user_account')).rows[0].n };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { pool, tx } = await import('../src/db/index.js');
  try {
    const out = await tx((db) => seedDemo(db, { reset: process.argv.includes('--reset') }));
    console.log(`Demo data seeded: ${out.alumni} alumni, ${out.users} user accounts. Demo password: ${DEMO_PASSWORD}`);
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
