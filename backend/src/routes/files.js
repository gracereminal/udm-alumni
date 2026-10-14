// Serves stored files on the same origin. public/... is open; private/... needs a valid, unexpired signature
// (issued only after a scope check — see /alumni/:id/proofs and /me/employment/:id/proof/:docId).
import { Router } from 'express';
import { getObject, mimeOf, verifySignature } from '../services/storage.js';

const router = Router();

router.get('/*key', async (req, res, next) => {
  try {
    const key = [].concat(req.params.key).join('/');
    if (!/^(public|private)\/[\w\-/.]+$/.test(key) || key.includes('..')) return res.status(404).json({ error: 'Not found.' });
    if (key.startsWith('private/') && !verifySignature(key, req.query.exp, req.query.sig)) return res.status(403).json({ error: 'This link has expired.' });
    let body;
    try { body = await getObject(key); } catch { return res.status(404).json({ error: 'Not found.' }); }
    res.set({
      'Content-Type': mimeOf(key),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': key.startsWith('private/') ? 'private, no-store' : 'public, max-age=86400, immutable',
      'Content-Disposition': key.endsWith('.pdf') ? 'inline' : 'inline',
      'Cross-Origin-Resource-Policy': 'same-origin',
    });
    body.on('error', next);
    body.pipe(res);
  } catch (err) { next(err); }
});

export default router;
