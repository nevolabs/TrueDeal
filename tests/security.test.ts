import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertSameOrigin,safeNext,siteOrigin } from '../lib/validation';
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

test('origin checks and auth redirects use the browser host instead of the internal hostname',()=>{
  const previous=process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  try {
    for(const host of ['127.0.0.1:3001','localhost:3001']) {
      const request=new Request('http://localhost:3001/api/auth/signup',{headers:{host,origin:`http://${host}`}});
      assert.doesNotThrow(()=>assertSameOrigin(request));
      assert.equal(siteOrigin(request),`http://${host}`);
      for(const origin of ['http://evil.test','http://localhost:3002','null']) {
        assert.throws(()=>assertSameOrigin(new Request(request.url,{headers:{host,origin}})));
      }
      assert.throws(()=>assertSameOrigin(new Request(request.url,{headers:{host}})));
      assert.throws(()=>assertSameOrigin(new Request(request.url,{headers:{host,origin:`http://${host}`,'sec-fetch-site':'cross-site'}})));
    }
    for(const host of ['evil.test/path','user@evil.test','evil.test?query']) {
      assert.throws(()=>siteOrigin(new Request('http://localhost:3001',{headers:{host}})));
    }
    process.env.NEXT_PUBLIC_SITE_URL='https://truedeal.test';
    const request=new Request('http://localhost:3001/api/auth/signup',{headers:{host:'127.0.0.1:3001',origin:'https://truedeal.test'}});
    assert.equal(siteOrigin(request),'https://truedeal.test');
    assert.doesNotThrow(()=>assertSameOrigin(request));
    assert.throws(()=>assertSameOrigin(new Request(request.url,{headers:{host:'127.0.0.1:3001',origin:'http://127.0.0.1:3001'}})));
  } finally {
    if(previous===undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL=previous;
  }
});
