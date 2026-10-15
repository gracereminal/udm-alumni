// Send one test email through the configured MAIL_DRIVER, to prove the Gmail API / SMTP credentials work.
//   npm run mail:test -- --to you@gmail.com
import { parseArgs } from 'node:util';
import { config } from '../src/config/index.js';
import { sendMail } from '../src/services/mailer.js';

const { values: a } = parseArgs({ options: { to: { type: 'string' } } });

try {
  if (!a.to) throw new Error('Usage: --to <recipient email>');
  if (config.MAIL_DRIVER === 'google' && config.GOOGLE_OAUTH_REFRESH_TOKEN) {
    console.log(`Driver google (OAuth, personal Gmail): client ${config.GOOGLE_OAUTH_CLIENT_ID}, From ${config.MAIL_FROM}`);
  } else if (config.MAIL_DRIVER === 'google') {
    const key = JSON.parse(config.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
    if (key.type !== 'service_account' || !key.client_email || !key.private_key) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not a service-account JSON key (needs type, client_email and private_key)');
    }
    console.log(`Driver google: service account ${key.client_email} (client ID ${key.client_id}), sending as ${config.GOOGLE_IMPERSONATE_USER}`);
  } else {
    console.log(`Driver ${config.MAIL_DRIVER}`);
  }
  const out = await sendMail({
    to: a.to,
    subject: 'UDM Alumni mail test',
    text: `This is a test email from the UDM Alumni Tracer (${config.NODE_ENV}, driver ${config.MAIL_DRIVER}). No action is needed.`,
  });
  console.log(`Sent. Result id: ${out?.id || out?.messageId || 'n/a'}. Check the inbox (and the spam folder) of ${a.to}.`);
} catch (err) {
  console.error(err.message);
  if (/unauthorized_client/i.test(err.message)) {
    console.error('Hint: domain-wide delegation is missing, or not for this client ID, or not with scope https://www.googleapis.com/auth/gmail.send (it can take a few minutes to apply).');
  } else if (/invalid_grant/i.test(err.message) && config.GOOGLE_OAUTH_REFRESH_TOKEN) {
    console.error('Hint: the refresh token was revoked or expired (tokens from a consent screen left in "Testing" expire after 7 days). Publish the app, then run npm run google:token again.');
  } else if (/invalid_client/i.test(err.message)) {
    console.error('Hint: GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET are wrong or belong to a different OAuth client.');
  } else if (/invalid_grant/i.test(err.message)) {
    console.error('Hint: GOOGLE_IMPERSONATE_USER must be an existing, active Workspace mailbox, and the server clock must be correct.');
  } else if (/\b403\b/.test(err.message)) {
    console.error('Hint: enable the Gmail API in the service account\'s Google Cloud project.');
  }
  process.exitCode = 1;
}
