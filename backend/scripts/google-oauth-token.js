// One-time: sign in with the sending Gmail account and print a refresh token for GOOGLE_OAUTH_REFRESH_TOKEN.
// Needs an OAuth client of type "Desktop app" from Google Cloud (see docs/deploy-notes.md, Step 3).
//   npm run google:token -- --client-id <id> --client-secret <secret>
// (or set GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET in backend/.env and run without flags)
import 'dotenv/config';
import http from 'node:http';
import { parseArgs } from 'node:util';
import { OAuth2Client } from 'google-auth-library';

const SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const { values: a } = parseArgs({ options: { 'client-id': { type: 'string' }, 'client-secret': { type: 'string' } } });
const clientId = a['client-id'] || process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = a['client-secret'] || process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Usage: --client-id <id> --client-secret <secret> (or set GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET)');
  process.exit(1);
}

// Desktop-app clients accept any loopback port, so listen on a free one and use it as the redirect URI.
const server = http.createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const redirectUri = `http://127.0.0.1:${server.address().port}`;
const client = new OAuth2Client({ clientId, clientSecret, redirectUri });
const url = client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: [SCOPE] });

console.log('\nOpen this URL in a browser and sign in with the Gmail account that will send the emails:\n');
console.log(url);
console.log('\nWaiting for Google to redirect back...');

server.on('request', async (req, res) => {
  const params = new URL(req.url, redirectUri).searchParams;
  if (!params.has('code') && !params.has('error')) { res.writeHead(404).end(); return; }
  try {
    if (params.get('error')) throw new Error(`Google returned: ${params.get('error')}`);
    const { tokens } = await client.getToken(params.get('code'));
    if (!tokens.refresh_token) throw new Error('No refresh token returned. Remove the app at https://myaccount.google.com/permissions and run this again.');
    if (!String(tokens.scope || '').includes(SCOPE)) throw new Error('The gmail.send permission was not granted. Run again and tick it on the consent screen.');
    res.writeHead(200, { 'content-type': 'text/plain' }).end('Done. You can close this tab and return to the terminal.');
    console.log('\nAdd these to backend/.env (local) or the Render environment. The refresh token is a secret:\n');
    console.log('MAIL_DRIVER=google');
    console.log(`GOOGLE_OAUTH_CLIENT_ID=${clientId}`);
    console.log('GOOGLE_OAUTH_CLIENT_SECRET=<the client secret>');
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('MAIL_FROM="UDM Alumni <the same gmail address you signed in with>"\n');
  } catch (err) {
    res.writeHead(400, { 'content-type': 'text/plain' }).end(`Failed: ${err.message}`);
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
