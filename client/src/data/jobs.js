// Job board display helpers. Listings and the approval queue come from GET /jobs.
export const STRIPE = 'repeating-linear-gradient(135deg,#E9E5DB 0 10px,#F1EEE7 10px 20px)';

export const jobKey = (j) => j.id;
/** Approval-queue entry key (the posting id). */
export const queueKey = (q) => q.id;

/** Composer dropdowns. Employment types are the JOB_POSTING enum; the work setup is appended to the location ("Manila · Hybrid"). */
export const WORK_SETUPS = ['On-site', 'Hybrid', 'Remote'];
export const EMP_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
export const DEADLINES = ['Closes in 3 days', 'Closes in 7 days', 'Closes in 14 days', 'Closes in 30 days'];

/** "Closes in 7 days" -> the ISO date (Manila) that many days from today; '' -> null. */
export function deadlineFrom(choice) {
  const n = parseInt(String(choice || '').replace(/\D+/g, ''), 10);
  if (!n) return null;
  const d = new Date(Date.now() + n * 864e5);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

/** Monthly salary inputs -> "₱35,000 - ₱48,000" / "From ₱35,000" / "Up to ₱48,000" / '' (with an error when max < min). */
export function salaryFrom(min, max) {
  const lo = Number(min) || 0;
  const hi = Number(max) || 0;
  const fm = (n) => `₱${n.toLocaleString('en-US')}`;
  return {
    error: lo && hi && hi < lo ? 'Maximum must be at least the minimum' : '',
    text: lo && hi ? `${fm(lo)} - ${fm(hi)}` : lo ? `From ${fm(lo)}` : hi ? `Up to ${fm(hi)}` : '',
  };
}

/** Days left before the posting's deadline as a card badge, or null when it has none (or it has passed). */
export function closesBadge(deadlineIso) {
  if (!deadlineIso) return null;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const n = Math.round((new Date(`${deadlineIso}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / 864e5);
  if (n < 0) return null;
  return {
    label: n === 0 ? 'Closes today' : n === 1 ? 'Closes in 1 day' : `Closes in ${n} days`,
    color: n <= 7 ? '#B3213C' : n <= 14 ? '#8A5A00' : '#475569',
    bg: n <= 7 ? '#FDE7EC' : n <= 14 ? '#FBF0D8' : '#EEF2F6',
  };
}
