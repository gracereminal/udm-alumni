// Demo accounts for the Sign In screen's Demo Access panel. They exist only where the backend demo seed ran
// (local and staging), so the panel shows only in development or with VITE_DEMO=true.
export const SHOW_DEMO = import.meta.env.DEV || import.meta.env.VITE_DEMO === 'true';
export const DEMO_PASSWORD = 'demoPass123';

export const DEMO_ACCOUNTS = {
  alumni: { role: 'alumni', email: 'maria.delacruz@udmalumni.edu', alumniId: '24-05-567', name: 'Maria Dela Cruz' },
  admin: { role: 'admin', email: 'admin@udmalumni.edu', name: 'System Admin' },
  dept: { role: 'dept', email: 'ccs.dean@udmalumni.edu', name: 'Dr. Maria Santos', college: 'College of Computing Studies' },
};
