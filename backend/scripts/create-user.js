// Create a staff account and print a one-time password (must be changed at first sign-in).
//   npm run create-user -- --role admin --email admin@udm.edu.ph --name "Alumni Office Admin"
//   npm run create-user -- --role dept --college CCS --email ccs.dean@udm.edu.ph --name "Dr. Maria Santos" --label "College Dean"
import { parseArgs } from 'node:util';
import { one, pool, tx } from '../src/db/index.js';
import { createStaffUser } from '../src/routes/users.js';

const { values: a } = parseArgs({
  options: { role: { type: 'string' }, email: { type: 'string' }, name: { type: 'string' }, college: { type: 'string' }, label: { type: 'string' } },
});

try {
  if (!['admin', 'dept'].includes(a.role) || !a.email || !a.name) throw new Error('Usage: --role admin|dept --email <email> --name "<display name>" [--college <code>] [--label "<role label>"]');
  let collegeId = null;
  if (a.role === 'dept') {
    const c = await one('SELECT college_id FROM college WHERE upper(code) = upper($1) OR name = $1', [a.college || '']);
    if (!c) throw new Error(`Unknown college "${a.college}". Use a college code such as CCS.`);
    collegeId = c.college_id;
  }
  const r = await tx((db) => createStaffUser(db, { email: a.email, name: a.name, role: a.role, collegeId, roleLabel: a.label || null }));
  console.log(`Created ${a.role} account ${a.email} (user ${r.userId}).`);
  console.log(`One-time password: ${r.oneTimePassword}`);
  console.log('Share it over a private channel; the user must change it at first sign-in.');
} catch (err) {
  console.error(err.fields ? `${err.message} ${JSON.stringify(err.fields)}` : err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
