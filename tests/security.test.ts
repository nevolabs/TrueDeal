import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertSameOrigin,safeNext } from '../lib/validation';
import { createHmac } from 'node:crypto';
import { verifyHmac } from '../lib/payments/razorpay';
test('redirects stay on this application',()=>{
  for(const value of ['https://evil.test','//evil.test','/\\evil.test','/\nevil.test']) assert.equal(safeNext(value),'/browse');
  assert.equal(safeNext('/orders?tab=open'),'/orders?tab=open');
});
test('payment signatures bind the exact body and secret',()=>{
  const raw='{"event":"payment.captured"}';
  const signature=createHmac('sha256','test-secret').update(raw).digest('hex');
  assert.equal(verifyHmac(raw,signature,'test-secret'),true);
  assert.equal(verifyHmac(raw+' ',signature,'test-secret'),false);
  assert.equal(verifyHmac(raw,signature,'different-secret'),false);
  assert.equal(verifyHmac(raw,'broken','test-secret'),false);
});
test('cookie-authenticated mutations require same origin',()=>{
  delete process.env.NEXT_PUBLIC_SITE_URL;
  assert.throws(()=>assertSameOrigin(new Request('https://app.test/api/orders',{headers:{origin:'https://evil.test'}})));
  assert.throws(()=>assertSameOrigin(new Request('https://app.test/api/orders')));
  assert.doesNotThrow(()=>assertSameOrigin(new Request('https://app.test/api/orders',{headers:{origin:'https://app.test'}})));
});
