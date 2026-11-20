import { randomBytes } from 'node:crypto';
import { readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { sampleUsers, sampleListings, sampleSeed, insertSampleListings } from './sample-catalog.mjs';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const project = 'fgcgmycoyxrkznskgkpa';
const expectedUrl = `https://${project}.supabase.co`;
const apply = process.argv.includes('--apply');
const credentialsFile = fileURLToPath(new URL('../.demo-accounts.json', import.meta.url));

async function run() {
  if (process.env.PAYMENTS_ENABLED === 'true') throw new Error('Disable payments before setting up the sample catalogue.');
  for (const listing of sampleListings) await access(new URL(`../public${listing.attributes.img}`, import.meta.url));
  console.log(JSON.stringify({ project, accounts: sampleUsers.map(({ key, name, city, email }) => ({ key, name, city, email })),
    listings: sampleListings.length, pricesInRupees: sampleListings.map(listing => ({ title: listing.attributes.title, price: listing.pricePaise / 100 })),
    mode: apply ? 'apply' : 'preview', payments: 'disabled; no payout accounts or financial records are created' }, null, 2));
  if (!apply) { console.log('Preview only. Run npm run demo:seed -- --apply to create the catalogue.'); return; }
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') !== expectedUrl) throw new Error('Supabase URL does not match this project.');
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('Set SUPABASE_SECRET_KEY in ignored .env.local to create confirmed sample Auth accounts. No data was changed.');
  if (!process.env.SUPABASE_DB_PASSWORD) throw new Error('Set SUPABASE_DB_PASSWORD in ignored .env.local.');
  const host = process.env.SUPABASE_DB_HOST || `db.${project}.supabase.co`;
  const user = process.env.SUPABASE_DB_USER || (host.endsWith('.pooler.supabase.com') ? `postgres.${project}` : 'postgres');
  if (host !== `db.${project}.supabase.co` && !/^(aws|gcp)-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(host)) throw new Error('Expected an official Supabase database host.');
  if (user !== 'postgres' && user !== `postgres.${project}`) throw new Error('Database user does not match this project.');
  const db = new pg.Client({ host, user, password: process.env.SUPABASE_DB_PASSWORD, database: 'postgres', port: 5432,
    ssl: { ca: await readFile(new URL('../supabase/certs/supabase-root-2021.crt', import.meta.url), 'utf8'), rejectUnauthorized: true },
    connectionTimeoutMillis: 10000, query_timeout: 15000 });
  const admin = createClient(expectedUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    await db.connect();
    // Refuse to change credentials or create users until the schema is available.
    await db.query('select id from public.listings limit 0');
    const existingUsers = [];
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(`Could not inspect Auth users (${error.code || error.status || 'unknown'}).`);
      existingUsers.push(...data.users.filter(account => sampleUsers.some(sample => sample.email === account.email)));
      if (data.users.length < 200) break;
    }
    let credentials;
    try { credentials = JSON.parse(await readFile(credentialsFile, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; credentials = { project, sampleSeed, accounts: [] }; }
    if (credentials.project !== project || credentials.sampleSeed !== sampleSeed || !Array.isArray(credentials.accounts)) throw new Error('The local sample credential file belongs to another setup.');
    // Validate all collisions before creating any accounts.
    for (const account of existingUsers) {
      if (account.app_metadata?.sampleSeed !== sampleSeed || !account.email_confirmed_at) throw new Error('A sample email belongs to an unrelated or unconfirmed account. No existing account will be modified.');
    }
    const userIds = {};
    for (const sample of sampleUsers) {
      const existing = existingUsers.find(account => account.email === sample.email);
      if (existing) { userIds[sample.key] = existing.id; continue; }
      let credential = credentials.accounts.find(account => account.email === sample.email);
      if (!credential) {
        credential = { email: sample.email, password: `Td!9aA${randomBytes(24).toString('base64url')}` };
        credentials.accounts.push(credential);
      }
      // Persist before sending the request, so an interrupted response cannot
      // lose the login password. Never print passwords or server keys.
      await writeFile(credentialsFile, JSON.stringify(credentials, null, 2) + '\n', { mode: 0o600 });
      const { data, error } = await admin.auth.admin.createUser({ email: sample.email, password: credential.password, email_confirm: true,
        user_metadata: { name: sample.name, city: sample.city }, app_metadata: { sampleSeed } });
      if (error || !data.user) throw new Error(`Could not create sample account ${sample.key} (${error?.code || error?.status || 'unknown'}). Rerun after resolving the error; existing sample accounts are reused.`);
      userIds[sample.key] = data.user.id;
    }
    await insertSampleListings(db, userIds);
    const result = await db.query("select count(*)::int as listings from public.listings where attributes->>'sampleSeed'=$1", [sampleSeed]);
    console.log(`Ready: ${sampleUsers.length} sample Auth accounts and ${result.rows[0].listings} listings. Login credentials, when created by this machine, are in ignored .demo-accounts.json.`);
  } finally { await db.end(); }
}

run().catch(error => { console.error(error.message); process.exitCode = 1; });
