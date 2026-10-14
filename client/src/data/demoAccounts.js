// Prototype accounts used by the Sign In screen. Each account determines the role (and therefore the dashboard).
export const DEMO_PASSWORD = 'demoPass123';

export const DEMO_ACCOUNTS = {
  alumni: { role: 'alumni', email: 'maria.delacruz@udmalumni.edu', alumniId: '2024-00567-AT', name: 'Maria Dela Cruz' },
  admin: { role: 'admin', email: 'admin@udmalumni.edu', alumniId: 'ADMIN-001', name: 'System Admin', roleLabel: 'Administrator', initials: 'SA' },
  dept: { role: 'dept', email: 'ccs.dean@udmalumni.edu', alumniId: 'CCS-DEAN-01', name: 'Dr. Maria Santos', roleLabel: 'College Dean', initials: 'MS', college: 'College of Computing Studies' },
};

export const ROLE_HOME = {
  alumni: '/alumni/dashboard',
  dept: '/college/dashboard',
  admin: '/admin/dashboard',
};

export function findAccount(identifier) {
  const id = String(identifier || '').trim().toLowerCase();
  if (!id) return null;
  return Object.entries(DEMO_ACCOUNTS).find(([, a]) => a.email.toLowerCase() === id || a.alumniId.toLowerCase() === id) || null;
}
