// Program catalog helpers — every screen derives program codes / colleges from COLLEGES (data/colleges.js).
import { COLLEGES } from '../data/colleges';

const PROG_CODES = {
  'Bachelor of Arts in Communication': 'ABComm', 'Bachelor of Arts in Political Science': 'ABPolSci', 'Bachelor in Public Administration': 'BPA', 'Bachelor in Public Administration – Special Program': 'BPA-SP',
  'BS in Mathematics Major in Computer Science': 'BSMath-CS', 'Bachelor of Science in Psychology': 'BSPsych', 'Bachelor of Science in Social Work': 'BSSW',
  'Bachelor of Science in Accountancy': 'BSA', 'Bachelor of Science in Accounting Information System': 'BSAIS', 'BS in Business Administration Major in Economics': 'BSBA-Econ',
  'BS in Business Administration Major in Human Resource Development Management': 'BSBA-HRDM', 'BS in Business Administration Major in Marketing Management': 'BSBA-MM', 'Bachelor of Science in Entrepreneurship': 'BSEntrep',
  'Bachelor of Public Administration': 'BPA', 'Bachelor of Science in Business Administration Major in Business Economics': 'BSBA-BE', 'Bachelor of Science in Business Administration Major in Human Resource Management': 'BSBA-HRM',
  'Bachelor of Science in Business Administration Major in Marketing Management': 'BSBA-MM', 'Bachelor of Science in Hospitality Management': 'BSHM',
  'Bachelor of Science in Information Technology': 'BSIT', 'Bachelor of Science in Criminology': 'BSCrim',
  'Bachelor of Physical Education': 'BPEd', 'Bachelor of Secondary Education Major in English': 'BSEd-Eng', 'Bachelor of Secondary Education Major in Science': 'BSEd-Sci', 'Bachelor of Secondary Education Major in Mathematics': 'BSEd-Math',
  'Bachelor of Secondary Education Major in Social Studies': 'BSEd-SS', 'Bachelor in Physical Education Major in School of Physical Education': 'BPEd-SPE',
  'BTVTE Major in Automotive (2nd-4th Year)': 'BTVTE-Auto', 'BTVTE Major in Computer Programming Technology (2nd-4th Year)': 'BTVTE-CPT', 'BTVTE Major in Electrical Technology (2nd-4th Year)': 'BTVTE-Elec',
  'BTVTE Major in Electronics Technology (2nd-4th Year)': 'BTVTE-Elx', 'BTVTE Major in Food Service Management Technology (2nd-4th Year)': 'BTVTE-FSM', 'BTVTE Major in Garments Technology (2nd-4th Year)': 'BTVTE-GT',
  'BTVTE Major in Hotel and Restaurant Services Technology (2nd-4th Year)': 'BTVTE-HRS', 'BTVTE Major in Heating, Ventilation and Air Conditioning Technology (2nd-4th Year)': 'BTVTE-HVAC',
  'Bachelor in Electronics Engineering': 'BSECE', 'Bachelor of Science in Computer Engineering': 'BSCpE', 'Bachelor in Information Technology with Specialization in Cybersecurity': 'BIT-Cyber',
  'Bachelor in Information Technology with Specialization in Data Science': 'BIT-DS', 'Bachelor of Science in Computer Science': 'BSCS',
  'Bachelor of Science in Nursing': 'BSN', 'Bachelor of Science in Physical Therapy': 'BSPT', 'Juris Doctor': 'JD',
  'Doctor of Philosophy (PhD) Major in Educational Leadership and Management (Academic Track)': 'PhD-ELM', 'Doctor of Philosophy (PhD) Major in Criminology (Academic Track)': 'PhD-Crim',
  'Doctor in Public Administration (DPA) (Academic Track)': 'DPA', 'Master of Arts in Education (MaEd) Major in Educational Leadership and Management (Academic Track-Thesis and Non-Thesis Programs)': 'MAEd-ELM',
  'Master in Business Administration (MBA) (Academic Track-Thesis and Non-Thesis Programs)': 'MBA', 'Master in Public Administration (MPA) (Academic Track-Thesis and Non-Thesis Programs)': 'MPA',
  'Master of Science in Criminal Justice (MSCJ) with Specialization in Criminology (Academic Track-Thesis and Non-Thesis Programs)': 'MSCJ',
};

/** "Bachelor of Science in Information Technology" -> "BSIT" */
export function progCode(course) {
  if (!course) return '—';
  if (PROG_CODES[course]) return PROG_CODES[course];
  const m = course.match(/^Bachelor of Science in (.+)$/);
  return m ? `BS${m[1].split(/\s+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join('')}` : course;
}

export const progCollege = (course) => Object.keys(COLLEGES).find((k) => COLLEGES[k].includes(course)) || '';

export function progCourses(college) {
  const list = college ? (COLLEGES[college] || []) : Object.keys(COLLEGES).flatMap((k) => COLLEGES[k]);
  return list.filter((c, i) => list.indexOf(c) === i);
}

export const progOpts = (college) => progCourses(college).map((c) => ({ value: c, label: `${progCode(c)} — ${c}` }));

const IT = 'Bachelor of Science in Information Technology';
const MM = 'Bachelor of Science in Business Administration Major in Marketing Management';
const LEGACY = {
  BSIT: IT, BSCS: 'Bachelor of Science in Computer Science', BSBA: MM, BSPsych: 'Bachelor of Science in Psychology',
  BSCrim: 'Bachelor of Science in Criminology', BSN: 'Bachelor of Science in Nursing', BSEd: 'Bachelor of Secondary Education Major in English',
};
const BY_SID = {
  'AM-2024-04421': 'Bachelor of Science in Business Administration Major in Human Resource Management',
  'AM-2020-01104': 'Bachelor of Science in Business Administration Major in Business Economics',
  'AM-2017-05590': 'Bachelor of Secondary Education Major in Mathematics',
};

/** Seed records predate the catalog; map their legacy codes onto catalog courses. */
export function progNorm(r) {
  const course = r.course || BY_SID[r.sid] || LEGACY[r.program] || LEGACY[r.degree] || '';
  return { ...r, course, college: r.college || progCollege(course), program: course ? progCode(course) : (r.program || '—') };
}
