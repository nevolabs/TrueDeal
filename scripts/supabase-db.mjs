import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import nextEnv from '@next/env';
import pg from 'pg';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const project = 'fgcgmycoyxrkznskgkpa';
const host = process.env.SUPABASE_DB_HOST || `db.${project}.supabase.co`;
const user = process.env.SUPABASE_DB_USER || (host.endsWith('.pooler.supabase.com') ? `postgres.${project}` : 'postgres');
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) throw new Error('Set SUPABASE_DB_PASSWORD in ignored .env.local.');
if (host !== `db.${project}.supabase.co` && !/^(aws|gcp)-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(host)) {
  throw new Error('Expected this project’s direct host or an official Supabase pooler.');
}
if (user !== 'postgres' && user !== `postgres.${project}`) throw new Error('Database user does not match the project.');
const caFile = fileURLToPath(new URL('../supabase/certs/supabase-root-2021.crt', import.meta.url));
const mode = process.argv[2] || 'plan';
const redact = value => String(value).split(password).join('[redacted]');

if (mode === 'inspect') {
  const client = new pg.Client({ host, port: 5432, database: 'postgres', user, password,
    ssl: { ca: await readFile(caFile, 'utf8'), rejectUnauthorized: true },
    connectionTimeoutMillis: 10000, query_timeout: 15000 });
  try {
    await client.connect();
    await client.query('begin read only');
    const tables = await client.query("select schemaname, tablename from pg_tables where schemaname in ('public','supabase_migrations') order by 1,2");
    const historyExists = await client.query("select to_regclass('supabase_migrations.schema_migrations') is not null as present");
    const history = historyExists.rows[0].present ? (await client.query('select version from supabase_migrations.schema_migrations order by version')).rows : [];
    const counts = await client.query('select (select count(*)::int from auth.users) as auth_users, (select count(*)::int from public.profiles) as profiles, (select count(*)::int from public.user_roles) as operator_grants, (select count(*)::int from public.orders) as orders');
    const buckets = await client.query("select id, public from storage.buckets where id in ('listing-photos','order-evidence') order by id");
    const permissions = await client.query("select has_function_privilege('anon','public.marketplace_command(text,uuid,jsonb)','execute') as anonymous_can_mutate, has_function_privilege('anon','public.app_state()','execute') as anonymous_can_browse, (select bool_and(rowsecurity) from pg_tables where schemaname='public') as public_tables_use_rls");
    console.log(JSON.stringify({ host, tables: tables.rows, migrationHistory: history,
      counts: counts.rows[0], buckets: buckets.rows, permissions: permissions.rows[0] }, null, 2));
    await client.query('rollback');
  } catch (error) { console.error(redact(error.message)); process.exitCode = 1; }
  finally { await client.end(); }
} else {
  const url = new URL(`postgresql://${user}@${host}:5432/postgres`);
  url.searchParams.set('sslmode', 'verify-full');
  url.searchParams.set('sslrootcert', caFile);
  const commands = {
    plan: ['db', 'push', '--dry-run', '--skip-vault'],
    migrate: ['db', 'push', '--skip-vault', '--yes'],
    status: ['migration', 'list'],
  };
  if (!commands[mode]) throw new Error('Use inspect, plan, migrate or status.');
  const cli = fileURLToPath(new URL('../node_modules/supabase/dist/supabase.js', import.meta.url));
  const child = spawn(process.execPath, [cli, ...commands[mode], `--remote=${url}`], {
    env: { ...process.env, PGPASSWORD: password, SUPABASE_DB_PASSWORD: password, NODE_EXTRA_CA_CERTS: caFile },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  child.stdout.on('data', chunk => process.stdout.write(redact(chunk)));
  child.stderr.on('data', chunk => process.stderr.write(redact(chunk)));
  child.on('error', error => { console.error(redact(error.message)); process.exitCode = 1; });
  child.on('close', code => { process.exitCode = code ?? 1; });
}
