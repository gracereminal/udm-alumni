// Job board display helpers. Listings and the approval queue come from GET /jobs.
export const STRIPE = 'repeating-linear-gradient(135deg,#E9E5DB 0 10px,#F1EEE7 10px 20px)';

export const jobKey = (j) => j.id;
/** Approval-queue entry key (the posting id). */
export const queueKey = (q) => q.id;
