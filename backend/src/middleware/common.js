import crypto from 'node:crypto';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { ZodError } from 'zod';
import { config } from '../config/index.js';
import { HttpError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

/** State-changing requests must carry X-Requested-With (a custom header a cross-site form cannot add). */
export function requireCustomHeader(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.path.startsWith('/internal/')) return next(); // cron calls: authenticated by CRON_SECRET, never by cookie
  if (!req.get('x-requested-with')) return res.status(403).json({ error: 'Missing X-Requested-With header.' });
  next();
}

/** validate({ body, query, params }) -> parsed values in req.valid.{body,query,params}. */
export const validate = (schemas) => (req, _res, next) => {
  try {
    req.valid = req.valid || {};
    for (const part of ['params', 'query', 'body']) {
      if (schemas[part]) req.valid[part] = schemas[part].parse(req[part] ?? {});
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const authLimiter = () => rateLimit({
  windowMs: config.AUTH_RATE_LIMIT_WINDOW_MIN * 60e3,
  limit: () => config.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

export const outreachLimiter = () => rateLimit({
  windowMs: 60 * 60e3,
  limit: () => config.OUTREACH_RATE_LIMIT_MAX,
  keyGenerator: (req) => (req.user ? `u${req.user.user_id}` : ipKeyGenerator(req.ip)),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Outreach limit reached for this hour. Try again later.' },
});

export function requestId(req, res, next) {
  req.id = req.get('x-request-id') || crypto.randomUUID();
  res.set('x-request-id', req.id);
  next();
}

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Not found.' });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    const fields = {};
    err.issues.forEach((i) => { const k = i.path.join('.') || '_'; if (!fields[k]) fields[k] = i.message; });
    return res.status(400).json({ error: 'Some fields need attention.', fields, requestId: req.id });
  }
  if (err instanceof HttpError || (err.status && err.status < 500)) {
    const body = { error: err.message, requestId: req.id };
    if (err.fields) body.fields = err.fields;
    if (err.code && typeof err.code === 'string' && !/^\d/.test(err.code)) body.code = err.code;
    return res.status(err.status).json(body);
  }
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large.', requestId: req.id });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON.', requestId: req.id });
  if (err.code === '23505') return res.status(409).json({ error: 'That record already exists.', requestId: req.id });
  if (err.code === '23503') return res.status(400).json({ error: 'A referenced record does not exist.', requestId: req.id });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File is too large.', requestId: req.id });
  logger.error({ err, requestId: req.id, path: req.path }, 'unhandled error');
  res.status(500).json({ error: 'Something went wrong. Please try again.', requestId: req.id });
}
