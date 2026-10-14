// Colleges / departments and their programs (from the alumni tracer prototype).
// Single source of truth: colleges sorted A–Z, programs sorted A–Z, 'Others' last.
const RAW = {
  'College of Arts and Sciences': ['Bachelor of Arts in Communication', 'Bachelor of Arts in Political Science', 'Bachelor in Public Administration', 'Bachelor in Public Administration – Special Program', 'BS in Mathematics Major in Computer Science', 'Bachelor of Science in Psychology', 'Bachelor of Science in Social Work'],
  'College of Business Administration': ['Bachelor of Science in Accountancy', 'Bachelor of Science in Accounting Information System', 'BS in Business Administration Major in Economics', 'BS in Business Administration Major in Human Resource Development Management', 'BS in Business Administration Major in Marketing Management', 'Bachelor of Science in Entrepreneurship'],
  'College of Business and Public Management': ['Bachelor of Public Administration', 'Bachelor of Science in Business Administration Major in Business Economics', 'Bachelor of Science in Business Administration Major in Human Resource Management', 'Bachelor of Science in Business Administration Major in Marketing Management', 'Bachelor of Science in Hospitality Management'],
  'College of Computing Studies': ['Bachelor of Science in Information Technology'],
  'College of Criminal Justice': ['Bachelor of Science in Criminology'],
  'College of Education': ['Bachelor of Physical Education', 'Bachelor of Secondary Education Major in English', 'Bachelor of Secondary Education Major in Science', 'Bachelor of Secondary Education Major in Mathematics', 'Bachelor of Secondary Education Major in Social Studies', 'Bachelor in Physical Education Major in School of Physical Education', 'BTVTE Major in Automotive (2nd-4th Year)', 'BTVTE Major in Computer Programming Technology (2nd-4th Year)', 'BTVTE Major in Electrical Technology (2nd-4th Year)', 'BTVTE Major in Electronics Technology (2nd-4th Year)', 'BTVTE Major in Food Service Management Technology (2nd-4th Year)', 'BTVTE Major in Garments Technology (2nd-4th Year)', 'BTVTE Major in Hotel and Restaurant Services Technology (2nd-4th Year)', 'BTVTE Major in Heating, Ventilation and Air Conditioning Technology (2nd-4th Year)'],
  'College of Engineering and Technology': ['Bachelor in Electronics Engineering', 'Bachelor of Science in Computer Engineering', 'Bachelor in Information Technology with Specialization in Cybersecurity', 'Bachelor in Information Technology with Specialization in Data Science', 'Bachelor of Science in Information Technology', 'Bachelor of Science in Computer Science'],
  'College of Health Sciences': ['Bachelor of Science in Nursing', 'Bachelor of Science in Physical Therapy'],
  'College of Law': ['Juris Doctor'],
  'Graduate Studies': ['Doctor of Philosophy (PhD) Major in Educational Leadership and Management (Academic Track)', 'Doctor of Philosophy (PhD) Major in Criminology (Academic Track)', 'Doctor in Public Administration (DPA) (Academic Track)', 'Master of Arts in Education (MaEd) Major in Educational Leadership and Management (Academic Track-Thesis and Non-Thesis Programs)', 'Master in Business Administration (MBA) (Academic Track-Thesis and Non-Thesis Programs)', 'Master in Public Administration (MPA) (Academic Track-Thesis and Non-Thesis Programs)', 'Master of Science in Criminal Justice (MSCJ) with Specialization in Criminology (Academic Track-Thesis and Non-Thesis Programs)'],
  'Others': [],
};

const cmp = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });
export const COLLEGES = (() => {
  const out = {};
  Object.keys(RAW).filter((k) => k !== 'Others').sort(cmp).forEach((k) => { out[k] = RAW[k].slice().sort(cmp); });
  if (RAW.Others) out.Others = RAW.Others;
  return out;
})();

export const gradYears = () => {
  const out = [];
  for (let y = new Date().getFullYear(); y >= 1999; y--) out.push(String(y));
  return out;
};
