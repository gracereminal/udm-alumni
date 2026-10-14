// Public (opt-in) alumni directory used by "Search for an Alumni" and the alumni profile card.
export const DATA = [
  { name: 'Alumni Demo User', studentId: '2022-01234-UDM', degree: 'BSIT', batch: 2024, title: 'Junior Data Engineer', company: 'Maya Philippines', status: 'Employed Full-time', skills: ['Python', 'Spark', 'SQL'], more: 2 },
  { name: 'Angela Mae Dizon', studentId: '2020-00891-UDM', degree: 'BSBA', batch: 2024, title: 'SAP Systems Analyst', company: 'Accenture Philippines', status: 'Employed Full-time', skills: ['SAP ERP', 'SQL', 'Business Process Modeling'], more: 1 },
  { name: 'Christian Paul Mendoza', studentId: '2021-03310-UDM', degree: 'BSIT', batch: 2024, title: 'Associate Cybersecurity Engineer', company: 'Trend Micro', status: 'Employed Full-time', skills: ['Network Security', 'Penetration Testing', 'Python'], more: 2 },
  { name: 'John Carlo Reyes', studentId: '2018-01932-UDM', degree: 'BSIT', batch: 2022, title: 'Cloud DevOps Specialist', company: 'GCash (Mynt)', status: 'Employed Full-time', skills: ['Kubernetes', 'Docker', 'Terraform'], more: 2 },
  { name: 'Maria Santos', studentId: '2019-04128-UDM', degree: 'BSIT', batch: 2023, title: 'Senior Software Engineer', company: 'Canva Philippines', status: 'Employed Full-time', skills: ['React', 'TypeScript', 'Node.js'], more: 2 },
  { name: 'Mark Kenneth Torres', studentId: '2019-07712-UDM', degree: 'BSIT', batch: 2023, title: 'Full-Stack Mobile Developer', company: 'Independent Consultant', status: 'Self-Employed / Freelancer', skills: ['React Native', 'Firebase', 'Next.js'], more: 2 },
  { name: 'Patricia Anne Lim', studentId: '2016-01104-UDM', degree: 'BSBA', batch: 2020, title: 'Lead Product Manager', company: 'Globe Telecom', status: 'Employed Full-time', skills: ['Agile Scrum', 'Product Lifecycle', 'Data Analytics'], more: 1 },
  { name: 'Rafael De La Cruz', studentId: '2017-08912-UDM', degree: 'BSIT', batch: 2021, title: 'Co-Founder & CTO', company: 'PayByte Solutions', status: 'Startup Founder', skills: ['Go', 'Microservices', 'PostgreSQL'], more: 2 },
];

export const STATUS_STYLE = {
  'Employed Full-time': { bg: '#E7F8EF', color: '#0B7A4B' },
  'Self-Employed / Freelancer': { bg: '#E8F1FE', color: '#1D4ED8' },
  'Startup Founder': { bg: '#FEF6DC', color: '#92680B' },
};

// Public, opt-in career profile fields. Contacts are only those the alumnus chose to make visible.
export const PUBLIC_PROFILE = {
  'Angela Mae Dizon': { industry: 'IT Consulting', since: '2024', firstJob: 'Within 3 months', related: 'Yes', contacts: { email: 'angela.dizon@alumni.udm.edu.ph', linkedin: 'linkedin.com/in/angeladizon' } },
  'Christian Paul Mendoza': { industry: 'Cybersecurity', since: '2024', firstJob: 'Within 3 months', related: 'Yes', contacts: { messenger: 'm.me/cpmendoza', linkedin: 'linkedin.com/in/cpmendoza' } },
  'John Carlo Reyes': { industry: 'Financial Technology', since: '2022', firstJob: 'Within 6 months', related: 'Yes', contacts: { email: 'jc.reyes@alumni.udm.edu.ph', linkedin: 'linkedin.com/in/jcreyes-devops', website: 'jcreyes.dev' } },
  'Maria Santos': { industry: 'Software & Design', since: '2023', firstJob: 'Within 3 months', related: 'Yes', contacts: { email: 'maria.santos@alumni.udm.edu.ph', messenger: 'm.me/mariasantos.dev', linkedin: 'linkedin.com/in/mariasantos', website: 'mariasantos.io' } },
  'Mark Kenneth Torres': { industry: 'Freelance Software Development', since: '2023', firstJob: 'Within 6 months', related: 'Yes', contacts: { email: 'mk.torres@alumni.udm.edu.ph', messenger: 'm.me/mktorres', website: 'mktorres.studio' } },
  'Patricia Anne Lim': { industry: 'Telecommunications', since: '2021', firstJob: 'Within 3 months', related: 'Yes', contacts: { linkedin: 'linkedin.com/in/patricialim-pm' } },
  'Rafael De La Cruz': { industry: 'Financial Technology', since: '2022', firstJob: 'Within 6 months', related: 'Yes', contacts: {} },
};

export const CONTACT_TYPES = [
  { key: 'email', label: 'Email', glyph: '@', bg: '#E6F0EB', color: '#0F3D2E', href: (v) => `mailto:${v}` },
  { key: 'messenger', label: 'Facebook Messenger', glyph: 'M', bg: '#E8F1FE', color: '#1D4ED8', href: (v) => `https://${v}` },
  { key: 'linkedin', label: 'LinkedIn', glyph: 'in', bg: '#E8F1FE', color: '#0A5BB5', href: (v) => `https://${v}` },
  { key: 'website', label: 'Portfolio / website', glyph: '↗', bg: '#FEF6DC', color: '#92680B', href: (v) => `https://${v}` },
];
