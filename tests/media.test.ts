import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicAssetUrl } from '../lib/public-assets';
import { imageObjectPath } from '../scripts/media-storage.mjs';

test('public assets resolve against the deployment project without permitting arbitrary URLs or path traversal',()=>{
  const path=`brand/${'a'.repeat(64)}.png`;
  assert.equal(publicAssetUrl('https://project.supabase.co',path),`https://project.supabase.co/storage/v1/object/public/site-assets/${path}`);
  assert.equal(publicAssetUrl('http://127.0.0.1:54321',path),`http://127.0.0.1:54321/storage/v1/object/public/site-assets/${path}`);
  assert.equal(publicAssetUrl('',''),'');
  const provider=`providers/razorpay-${'a'.repeat(64)}.svg`;
  assert.equal(publicAssetUrl('https://project.supabase.co',provider),`https://project.supabase.co/storage/v1/object/public/site-assets/${provider}`);
  for(const path of ['../secret.png','https://evil.test/image.png','brand/%2e%2e/file.png',`brand/${'a'.repeat(64)}.png?token=secret`])assert.throws(()=>publicAssetUrl('https://project.supabase.co',path));
  assert.throws(()=>publicAssetUrl('https://user:password@project.supabase.co',path));
});

test('image imports are immutable and scoped to their owner using a content digest',()=>{
  const owner='10000000-0000-4000-8000-000000000001';const bytes=Buffer.from('image content');
  const path=imageObjectPath(owner,bytes,'jpg');
  assert.match(path,new RegExp(`^${owner}/[a-f0-9]{64}\\.jpg$`));
  assert.equal(imageObjectPath(owner,bytes,'jpg'),path);
  assert.notEqual(imageObjectPath(owner,Buffer.from('changed image'),'jpg'),path);
  assert.throws(()=>imageObjectPath('../other',bytes,'jpg'));
  assert.throws(()=>imageObjectPath(owner,bytes,'svg'));
});
