import pino from 'pino';
import { config } from '../config/index.js';

// Never log secrets, tokens, codes or full emails.
export const logger = pino({
  level: config.NODE_ENV === 'test' ? 'silent' : config.LOG_LEVEL,
  redact: {
    paths: ['req.headers.cookie', 'req.headers.authorization', 'req.headers["x-cron-secret"]', 'res.headers["set-cookie"]',
      '*.password', '*.token', '*.password_hash', '*.reg_pw', '*.reg_pw2'],
    censor: '[redacted]',
  },
});

/** "maria.delacruz@x.edu" -> "m***@x.edu" for logs. */
export const maskEmail = (e) => String(e || '').replace(/^(.).*(@.*)$/, '$1***$2');
