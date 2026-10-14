// COLLEGE / PROGRAM catalog, taken from client/src/data/colleges.js and the program codes in client/src/lib/colleges.js.
// PROGRAM.code must be unique, but some display codes repeat across colleges (BSIT, BPA, BSBA-MM), so the
// unique code is "<college>-<abbr>" and the display code is kept in PROGRAM.abbr.
export const COLLEGES = [
  { code: 'CAS', name: 'College of Arts and Sciences', programs: [
    ['ABComm', 'Bachelor of Arts in Communication'], ['ABPolSci', 'Bachelor of Arts in Political Science'], ['BPA', 'Bachelor in Public Administration'],
    ['BPA-SP', 'Bachelor in Public Administration – Special Program'], ['BSMath-CS', 'BS in Mathematics Major in Computer Science'],
    ['BSPsych', 'Bachelor of Science in Psychology'], ['BSSW', 'Bachelor of Science in Social Work'],
  ] },
  { code: 'CBA', name: 'College of Business Administration', programs: [
    ['BSA', 'Bachelor of Science in Accountancy'], ['BSAIS', 'Bachelor of Science in Accounting Information System'], ['BSBA-Econ', 'BS in Business Administration Major in Economics'],
    ['BSBA-HRDM', 'BS in Business Administration Major in Human Resource Development Management'], ['BSBA-MM', 'BS in Business Administration Major in Marketing Management'],
    ['BSEntrep', 'Bachelor of Science in Entrepreneurship'],
  ] },
  { code: 'CBPM', name: 'College of Business and Public Management', programs: [
    ['BPA', 'Bachelor of Public Administration'], ['BSBA-BE', 'Bachelor of Science in Business Administration Major in Business Economics'],
    ['BSBA-HRM', 'Bachelor of Science in Business Administration Major in Human Resource Management'],
    ['BSBA-MM', 'Bachelor of Science in Business Administration Major in Marketing Management'], ['BSHM', 'Bachelor of Science in Hospitality Management'],
  ] },
  { code: 'CCS', name: 'College of Computing Studies', programs: [['BSIT', 'Bachelor of Science in Information Technology']] },
  { code: 'CCJ', name: 'College of Criminal Justice', programs: [['BSCrim', 'Bachelor of Science in Criminology']] },
  { code: 'COED', name: 'College of Education', programs: [
    ['BPEd', 'Bachelor of Physical Education'], ['BSEd-Eng', 'Bachelor of Secondary Education Major in English'], ['BSEd-Sci', 'Bachelor of Secondary Education Major in Science'],
    ['BSEd-Math', 'Bachelor of Secondary Education Major in Mathematics'], ['BSEd-SS', 'Bachelor of Secondary Education Major in Social Studies'],
    ['BPEd-SPE', 'Bachelor in Physical Education Major in School of Physical Education'], ['BTVTE-Auto', 'BTVTE Major in Automotive (2nd-4th Year)'],
    ['BTVTE-CPT', 'BTVTE Major in Computer Programming Technology (2nd-4th Year)'], ['BTVTE-Elec', 'BTVTE Major in Electrical Technology (2nd-4th Year)'],
    ['BTVTE-Elx', 'BTVTE Major in Electronics Technology (2nd-4th Year)'], ['BTVTE-FSM', 'BTVTE Major in Food Service Management Technology (2nd-4th Year)'],
    ['BTVTE-GT', 'BTVTE Major in Garments Technology (2nd-4th Year)'], ['BTVTE-HRS', 'BTVTE Major in Hotel and Restaurant Services Technology (2nd-4th Year)'],
    ['BTVTE-HVAC', 'BTVTE Major in Heating, Ventilation and Air Conditioning Technology (2nd-4th Year)'],
  ] },
  { code: 'CET', name: 'College of Engineering and Technology', programs: [
    ['BSECE', 'Bachelor in Electronics Engineering'], ['BSCpE', 'Bachelor of Science in Computer Engineering'],
    ['BIT-Cyber', 'Bachelor in Information Technology with Specialization in Cybersecurity'], ['BIT-DS', 'Bachelor in Information Technology with Specialization in Data Science'],
    ['BSIT', 'Bachelor of Science in Information Technology'], ['BSCS', 'Bachelor of Science in Computer Science'],
  ] },
  { code: 'CHS', name: 'College of Health Sciences', programs: [['BSN', 'Bachelor of Science in Nursing'], ['BSPT', 'Bachelor of Science in Physical Therapy']] },
  { code: 'CLAW', name: 'College of Law', programs: [['JD', 'Juris Doctor']] },
  { code: 'GS', name: 'Graduate Studies', programs: [
    ['PhD-ELM', 'Doctor of Philosophy (PhD) Major in Educational Leadership and Management (Academic Track)'],
    ['PhD-Crim', 'Doctor of Philosophy (PhD) Major in Criminology (Academic Track)'], ['DPA', 'Doctor in Public Administration (DPA) (Academic Track)'],
    ['MAEd-ELM', 'Master of Arts in Education (MaEd) Major in Educational Leadership and Management (Academic Track-Thesis and Non-Thesis Programs)'],
    ['MBA', 'Master in Business Administration (MBA) (Academic Track-Thesis and Non-Thesis Programs)'],
    ['MPA', 'Master in Public Administration (MPA) (Academic Track-Thesis and Non-Thesis Programs)'],
    ['MSCJ', 'Master of Science in Criminal Justice (MSCJ) with Specialization in Criminology (Academic Track-Thesis and Non-Thesis Programs)'],
  ] },
  // Registrants who pick "Others" type their own program; they count here under "Unmapped program" until staff map them.
  { code: 'OTH', name: 'Others', programs: [] },
];

export const degreeLevel = (name) => (/^Doctor (of|in)|PhD/.test(name) ? 'doctorate' : /^Master/.test(name) ? 'master' : /^Juris Doctor/.test(name) ? 'professional' : 'bachelor');

export const SKILLS = [
  ['Node.js', 'Software'], ['SQL', 'Data'], ['Express', 'Software'], ['AWS', 'Cloud'], ['Marketing', 'Business'], ['SaaS', 'Business'], ['Growth Marketing', 'Business'],
  ['Excel', 'Data'], ['Python', 'Software'], ['Power BI', 'Data'], ['Figma', 'Design'], ['Design Systems', 'Design'], ['User Research', 'Design'], ['Linux', 'Cloud'],
  ['Docker', 'Cloud'], ['Terraform', 'Cloud'], ['Selenium', 'Software'], ['Cypress', 'Software'], ['CI/CD', 'Cloud'], ['JavaScript', 'Software'], ['Help Desk', 'IT Support'],
  ['Windows', 'IT Support'], ['Networking', 'IT Support'], ['Financial Modeling', 'Business'], ['Spark', 'Data'], ['SAP ERP', 'Business'], ['Business Process Modeling', 'Business'],
  ['Network Security', 'Security'], ['Penetration Testing', 'Security'], ['Kubernetes', 'Cloud'], ['React', 'Software'], ['TypeScript', 'Software'], ['React Native', 'Software'],
  ['Firebase', 'Software'], ['Next.js', 'Software'], ['Agile Scrum', 'Business'], ['Product Lifecycle', 'Business'], ['Data Analytics', 'Data'], ['Go', 'Software'],
  ['Microservices', 'Software'], ['PostgreSQL', 'Data'], ['Nursing Care', 'Health'], ['Teaching', 'Education'], ['Accounting', 'Business'], ['Customer Service', 'Business'],
];

export const FIRST_CYCLE = { label: 'AY 2025–2026', opens_on: '2026-09-28', closes_on: '2026-11-15', status: 'open' };
