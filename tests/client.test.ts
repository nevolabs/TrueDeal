import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, ApiError } from '../lib/client';

test('network failures become a useful application error', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(api.get('/api/listings'), (error: unknown) =>
      error instanceof ApiError && /connection/i.test(error.message));
  } finally { globalThis.fetch = original; }
});

test('the API preserves setup errors and rejects unexpected HTML responses', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ error: 'Apply the Supabase migrations.' }, { status: 503 });
    await assert.rejects(api.get('/api/listings'), /Apply the Supabase migrations/);
    globalThis.fetch = async () => new Response('<html>Another app</html>', { headers: { 'Content-Type': 'text/html' } });
    await assert.rejects(api.get('/api/listings'), /unexpected response/i);
  } finally { globalThis.fetch = original; }
});
