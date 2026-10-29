// Batch-range filters (From / To): the range runs oldest to newest, so a From year later than To is refused.

export const RANGE_ERROR = 'The From year can’t be later than the To year.';

/** Apply a From / To pick to `range`; returns the new range, or null when it would run newest to oldest. */
export function pickYear(range, key, year) {
  const next = { ...range, [key]: year };
  return Number(next.from) > Number(next.to) ? null : next;
}
