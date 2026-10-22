// Colleges / departments and their programs — loaded from the API (COLLEGE and PROGRAM tables) once at start-up.
// COLLEGES keeps the old shape ({ collegeName: [programName, ...] }, 'Others' last) so forms can read it synchronously.
import { getCached } from '../lib/api';

export const COLLEGES = {};
export const CATALOG = { colleges: [], programs: [], targets: { employment: 80, coverage: 60 }, cycle: null, skills: [], loaded: false };

const cmp = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });

export function setCatalog(data) {
  Object.keys(COLLEGES).forEach((k) => delete COLLEGES[k]);
  const cols = [...data.colleges].sort((a, b) => (a.code === 'OTH') - (b.code === 'OTH') || cmp(a.name, b.name));
  cols.forEach((c) => { COLLEGES[c.name] = c.programs.map((p) => p.name).sort(cmp); });
  CATALOG.colleges = cols;
  CATALOG.programs = cols.flatMap((c) => c.programs.map((p) => ({ ...p, collegeName: c.name, collegeCode: c.code })));
  CATALOG.targets = data.targets || CATALOG.targets;
  CATALOG.cycle = data.cycle || null;
  CATALOG.skills = data.skills || [];
  CATALOG.loaded = true;
}

export function loadCatalog() {
  return getCached('/lookups', setCatalog);
}

export const collegeByName = (name) => CATALOG.colleges.find((c) => c.name === name) || null;
export const collegeById = (id) => CATALOG.colleges.find((c) => Number(c.id) === Number(id)) || null;
/** Program within a college (names repeat across colleges, e.g. BS Information Technology in CCS and CET). */
export const programIn = (collegeName, programName) => CATALOG.programs.find((p) => p.collegeName === collegeName && p.name === programName) || null;
export const programById = (id) => CATALOG.programs.find((p) => Number(p.id) === Number(id)) || null;

export const gradYears = () => {
  const out = [];
  for (let y = new Date().getFullYear(); y >= 1999; y--) out.push(String(y));
  return out;
};
