// Public lookups: the COLLEGE / PROGRAM catalog (replaces client/src/data/colleges.js and the program-code maps),
// skills, the active survey cycle and the public targets.
import { Router } from 'express';
import { many, one } from '../db/index.js';
import { getSettings } from '../services/settings.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const [colleges, programs, skills, cycle, settings] = await Promise.all([
      many('SELECT college_id AS id, code, name, is_historical AS "isHistorical" FROM college ORDER BY sort_order, name'),
      many('SELECT program_id AS id, college_id AS "collegeId", code, abbr, name, degree_level AS "degreeLevel" FROM program WHERE is_active ORDER BY name'),
      many('SELECT skill_id AS id, name, category FROM skill ORDER BY name'),
      one('SELECT cycle_id AS id, label, opens_on AS "opensOn", closes_on AS "closesOn", status FROM v_active_cycle'),
      getSettings(),
    ]);
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      colleges: colleges.map((c) => ({ ...c, programs: programs.filter((p) => p.collegeId === c.id) })),
      skills,
      cycle,
      targets: { employment: settings.employment_target, coverage: settings.coverage_target },
    });
  } catch (err) { next(err); }
});

export default router;
