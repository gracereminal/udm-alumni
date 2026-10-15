// Program catalog helpers. Codes and colleges come from the PROGRAM / COLLEGE tables (data/colleges.js CATALOG).
import { CATALOG, COLLEGES } from '../data/colleges';

/** "Bachelor of Science in Information Technology" -> "BSIT" (PROGRAM.abbr). */
export function progCode(course) {
  if (!course) return '—';
  const p = CATALOG.programs.find((x) => x.name === course);
  return p ? p.abbr : course;
}

/** College of a program name (the first match when a name exists in two colleges). */
export const progCollege = (course) => CATALOG.programs.find((p) => p.name === course)?.collegeName || '';

export function progCourses(college) {
  const list = college ? (COLLEGES[college] || []) : Object.keys(COLLEGES).flatMap((k) => COLLEGES[k]);
  return list.filter((c, i) => list.indexOf(c) === i);
}

export const progOpts = (college) => progCourses(college).map((c) => ({ value: c, label: `${progCode(c)} — ${c}` }));
