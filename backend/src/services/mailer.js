// Shared mailer for password-reset and outreach emails. MAIL_DRIVER=console|memory|google|smtp.
// google: Gmail API as no-reply@udmalumni.edu through a Workspace service account with domain-wide delegation
// (gmail.send scope only), or as a personal Gmail account through an OAuth refresh token (GOOGLE_OAUTH_*, from
// scripts/google-oauth-token.js). smtp: fallback (e.g. Google SMTP with an app password).
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import nodemailer from 'nodemailer';
import { JWT, OAuth2Client } from 'google-auth-library';
import { config } from '../config/index.js';
import { logger, maskEmail } from '../lib/logger.js';

/** Messages captured by the memory driver (tests only). */
export const outbox = [];

async function buildRaw(msg) {
  const mail = new MailComposer({ from: config.MAIL_FROM, ...msg });
  const buf = await mail.compile().build();
  return buf.toString('base64url');
}

/** Gmail REST transport. `fetchImpl`/`jwtFactory`/`oauthFactory` are injectable so tests can mock the Google client. */
export function googleTransport({ fetchImpl = fetch, jwtFactory, oauthFactory } = {}) {
  const useOAuth = Boolean(config.GOOGLE_OAUTH_REFRESH_TOKEN);
  let client;
  const auth = () => {
    if (!client && useOAuth) {
      const creds = { clientId: config.GOOGLE_OAUTH_CLIENT_ID, clientSecret: config.GOOGLE_OAUTH_CLIENT_SECRET, refreshToken: config.GOOGLE_OAUTH_REFRESH_TOKEN };
      if (oauthFactory) client = oauthFactory(creds);
      else {
        client = new OAuth2Client({ clientId: creds.clientId, clientSecret: creds.clientSecret });
        client.setCredentials({ refresh_token: creds.refreshToken });
      }
    } else if (!client) {
      const key = JSON.parse(config.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
      client = jwtFactory ? jwtFactory(key) : new JWT({
        email: key.client_email, key: key.private_key, scopes: ['https://www.googleapis.com/auth/gmail.send'], subject: config.GOOGLE_IMPERSONATE_USER,
      });
    }
    return client;
  };
  return async (msg) => {
    const { token } = await auth().getAccessToken();
    // OAuth sends as the account that granted the token ("me"); MAIL_FROM must be that address or Gmail rewrites it.
    const user = useOAuth ? 'me' : encodeURIComponent(config.GOOGLE_IMPERSONATE_USER);
    const res = await fetchImpl(`https://gmail.googleapis.com/gmail/v1/users/${user}/messages/send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ raw: await buildRaw(msg) }),
    });
    if (!res.ok) throw new Error(`Gmail send failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    return res.json();
  };
}

let transport = null;
function pick() {
  switch (config.MAIL_DRIVER) {
    case 'google': return googleTransport();
    case 'smtp': { const t = nodemailer.createTransport(config.SMTP_URL); return (msg) => t.sendMail({ from: config.MAIL_FROM, ...msg }); }
    case 'memory': return async (msg) => { outbox.push({ ...msg, at: new Date() }); return { id: `mem-${outbox.length}` }; };
    default: return async (msg) => {
      // Development only (refused in production by config): print the mail so the link/code can be used locally.
      logger.info({ to: msg.to, subject: msg.subject }, 'console mailer');
      console.log(`\n--- email to ${msg.to}: ${msg.subject} ---\n${msg.text}\n---\n`);
      return { id: 'console' };
    };
  }
}

/** Replace the transport (tests). Pass null to go back to MAIL_DRIVER. */
export function setTransport(fn) { transport = fn; }

/** send({ to, subject, html, text }). Throws when delivery fails so callers can roll back. */
export async function sendMail(msg) {
  const t = transport || (transport = pick());
  const out = await t(msg);
  logger.info({ to: maskEmail(msg.to), subject: msg.subject }, 'email sent');
  return out;
}
