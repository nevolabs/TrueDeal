import { readFile, writeFile } from 'node:fs/promises';
import nextEnv from '@next/env';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { imageObjectPath, publishImage } from './media-storage.mjs';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const bytes = await readFile(new URL('../assets/brand/truedeal-logo.png', import.meta.url));
const path = imageObjectPath('brand', bytes, 'png');
const manifestFile = new URL('../assets/providers/manifest.json', import.meta.url);
const providers = await Promise.all(JSON.parse(await readFile(manifestFile, 'utf8')).map(async provider => {
  const bytes = await readFile(new URL(`../assets/providers/${provider.source}`, import.meta.url));
  const extension = provider.source.split('.').at(-1);
  const digest = createHash('sha256').update(bytes).digest('hex');
  return { provider: { ...provider, path: `providers/${provider.key}-${digest}.${extension}` }, bytes, contentType: extension === 'svg' ? 'image/svg+xml' : extension === 'webp' ? 'image/webp' : 'image/png' };
}));
if (!process.argv.includes('--apply')) {
  console.log(`Preview: publish the brand and ${providers.length} provider-reference logos to site-assets. Use --apply to upload; --write-env also updates ignored .env.local.`);
} else {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error('Configure the Supabase project URL and server-only secret key.');
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(30000) }) } });
    const asset = await publishImage(client, 'site-assets', path, bytes, 'image/png');
    for (const item of providers) await publishImage(client, 'site-assets', item.provider.path, item.bytes, item.contentType);
    await writeFile(manifestFile, JSON.stringify(providers.map(item => item.provider), null, 2) + '\n');
    if (process.argv.includes('--write-env')) {
      const file = new URL('../.env.local', import.meta.url);
      let env;
      try { env = await readFile(file, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; env = ''; }
      const line = `NEXT_PUBLIC_BRAND_LOGO_PATH=${path}`;
      env = /^NEXT_PUBLIC_BRAND_LOGO_PATH=.*$/m.test(env) ? env.replace(/^NEXT_PUBLIC_BRAND_LOGO_PATH=.*$/m, line) : env.trimEnd() + '\n' + line + '\n';
      await writeFile(file, env);
    }
    console.log(JSON.stringify({ publicUrl: asset.url, NEXT_PUBLIC_BRAND_LOGO_PATH: path }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
