// College outreach. POST sends a real email through the mailer and logs OUTREACH_CONTACT + AUDIT_LOG in the same
// transaction: when the send fails, nothing is recorded. The recipient address never reaches the client.
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config/index.js';
import { one, tx } from '../db/index.js';
import { requireRole } from '../middleware/auth.js';
import { outreachLimiter, validate } from '../middleware/common.js';
import { assertAlumnusInScope } from '../middleware/scope.js';
import { badRequest, notFound, tooMany } from '../lib/errors.js';
import { id } from '../lib/validation.js';
import { audit, fromReq } from '../services/audit.js';
import { sendMail } from '../services/mailer.js';
import { outreachEmail } from '../services/emailTemplates.js';
import { notify } from '../services/notifications.js';
import { getSettings } from '../services/settings.js';

const router = Router();
router.use(requireRole('admin', 'dept'));

const contactSelect = `SELECT contact_id AS id, alumni_id AS "alumniId", method, template, outcome, note, contacted_at AS "contactedAt" FROM outreach_contact`;

router.post('/', outreachLimiter(), validate({ body: z.object({
  alumniId: id,
  method: z.enum(['email', 'phone', 'facebook', 'messenger', 'linkedin']).default('email'),
  template: z.enum(['survey_followup']).default('survey_followup'),
  note: z.string().trim().max(1000).optional(),
}) }), async (req, res, next) => {
  try {
    const { alumniId, method, template, note } = req.valid.body;
    await assertAlumnusInScope(req.user, alumniId);
    const settings = await getSettings();
    const row = await tx(async (db) => {
      const a = await one(
        `SELECT a.alumni_id, a.first_name, a.last_name, a.user_id, u.email, c.name AS college_name
           FROM alumnus a LEFT JOIN user_account u ON u.user_id = a.user_id
           LEFT JOIN program p ON p.program_id = a.program_id
           LEFT JOIN college c ON c.college_id = COALESCE(p.college_id, a.declared_college_id)
          WHERE a.alumni_id = $1 AND a.archived_at IS NULL AND a.merged_into_id IS NULL FOR UPDATE OF a`, [alumniId], db,
      );
      if (!a) throw notFound();
      if (method === 'email') {
        if (!a.email) throw badRequest('This alumnus has no email address on file. Log a phone or social contact instead.');
        const recent = await one(
          `SELECT contacted_at FROM outreach_contact WHERE alumni_id = $1 AND method = 'email' AND outcome <> 'bounced'
             AND contacted_at > now() - make_interval(days => $2) ORDER BY contacted_at DESC LIMIT 1`,
          [alumniId, Number(settings.outreach_interval_days)], db,
        );
        if (recent) throw tooMany(`An outreach email was already sent to this alumnus in the last ${settings.outreach_interval_days} days.`);
      }
      const r = await one(
        `INSERT INTO outreach_contact (alumni_id, contacted_by, method, template, note, outcome) VALUES ($1, $2, $3, $4, $5, $6) RETURNING contact_id`,
        [alumniId, req.user.user_id, method, method === 'email' ? template : null, note || null, method === 'email' ? 'sent' : 'reached'], db,
      );
      await audit(db, fromReq(req, { entityType: 'alumnus', entityId: alumniId, action: 'outreach', details: { method, template: method === 'email' ? template : null } }));
      if (method === 'email') {
        const mail = outreachEmail({ appUrl: config.APP_URL, name: a.first_name, collegeName: a.college_name });
        if (a.user_id) await notify(db, [a.user_id], { type: 'outreach', title: mail.subject, message: `${a.college_name || 'Your college'} asked you to complete the alumni survey.`, link: 'profile' });
        await sendMail({ to: a.email, ...mail }); // throws -> the whole transaction rolls back
      }
      return one(`${contactSelect} WHERE contact_id = $1`, [r.contact_id], db);
    });
    res.status(201).json(row);
  } catch (err) { next(err); }
});

router.patch('/:id', validate({ params: z.object({ id }), body: z.object({ outcome: z.enum(['sent', 'reached', 'no_response', 'bounced']), note: z.string().trim().max(1000).optional() }) }), async (req, res, next) => {
  try {
    const c = await one('SELECT alumni_id FROM outreach_contact WHERE contact_id = $1', [req.valid.params.id]);
    if (!c) throw notFound();
    await assertAlumnusInScope(req.user, c.alumni_id);
    const row = await tx(async (db) => {
      await db.query('UPDATE outreach_contact SET outcome = $2, note = COALESCE($3, note) WHERE contact_id = $1', [req.valid.params.id, req.valid.body.outcome, req.valid.body.note ?? null]);
      await audit(db, fromReq(req, { entityType: 'outreach_contact', entityId: req.valid.params.id, action: 'outcome', details: { outcome: req.valid.body.outcome } }));
      return one(`${contactSelect} WHERE contact_id = $1`, [req.valid.params.id], db);
    });
    res.json(row);
  } catch (err) { next(err); }
});

export default router;
