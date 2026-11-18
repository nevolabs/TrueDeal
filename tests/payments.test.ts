import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCheckout,reconcileOrder} from '../lib/payments/service';
import {POST as webhook} from '../app/api/webhooks/razorpay/route';
import {POST as runJobs} from '../app/api/internal/payments/run/route';

const oid='10000000-0000-4000-8000-000000000001';
function environment() {
  const keys=['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SECRET_KEY','PAYMENTS_ENABLED','RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET','CRON_SECRET'] as const;
  const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY='fake-server-key';process.env.PAYMENTS_ENABLED='true';
  process.env.RAZORPAY_KEY_ID='rzp_test_fake';process.env.RAZORPAY_KEY_SECRET='fake-secret';
  process.env.RAZORPAY_WEBHOOK_SECRET='fake-webhook-secret';
  return ()=>{for(const key of keys){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}};
}
test('checkout sends only server-snapshotted amounts and holds the seller allocation',async()=>{
  const restore=environment();const original=globalThis.fetch;let providerCalls=0;
  try {
    globalThis.fetch=async(input,init)=>{
      const request=input instanceof Request?input:new Request(input,init);const url=new URL(request.url);
      if(url.pathname.endsWith('/rpc/checkout_claim')) return Response.json({order:{id:oid},snapshot:{total_paise:1034900,seller_due_paise:950000},account:'acc_test',attempt:{id:'attempt',provider_order_id:null}});
      if(url.host==='api.razorpay.com') {
        providerCalls++;const body=await request.json();
        assert.equal(body.amount,1034900);assert.equal(body.transfers[0].amount,950000);assert.equal(body.transfers[0].on_hold,true);assert.equal(body.currency,'INR');
        return Response.json({id:'order_provider',amount:1034900,currency:'INR'});
      }
      assert.equal(request.method,'PATCH');return new Response(null,{status:204});
    };
    const result=await createCheckout(oid,'buyer');assert.equal(result.orderId,'order_provider');assert.equal(providerCalls,1);
  }finally{globalThis.fetch=original;restore();}
});
test('reusing checkout never creates another provider order',async()=>{
  const restore=environment();const original=globalThis.fetch;
  try {
    globalThis.fetch=async input=>{
      const url=new URL(input instanceof Request?input.url:input.toString());
      assert.notEqual(url.host,'api.razorpay.com');
      return Response.json({order:{id:oid},snapshot:{total_paise:1034900,seller_due_paise:950000},account:'acc_test',attempt:{id:'attempt',provider_order_id:'order_existing'}});
    };
    assert.equal((await createCheckout(oid,'buyer')).orderId,'order_existing');
  }finally{globalThis.fetch=original;restore();}
});
test('wrong captured amount cannot reach a financial database transition',async()=>{
  const restore=environment();const original=globalThis.fetch;
  try{
    globalThis.fetch=async input=>{
      const url=new URL(input instanceof Request?input.url:input.toString());
      if(url.pathname.endsWith('/payment_attempts'))return Response.json({provider_order_id:'order_test',amount_paise:1034900,environment:'test',status:'created'});
      if(url.pathname==='/v1/orders/order_test/payments')return Response.json({items:[{id:'pay_test',order_id:'order_test',amount:1,currency:'INR',status:'captured'}]});
      assert.fail('Mismatched payment must stop before any transition');
    };
    await assert.rejects(reconcileOrder(oid),/do not match/);
  }finally{globalThis.fetch=original;restore();}
});
test('order-sourced Route allocations are accepted only while confirmed on hold',async()=>{
 const restore=environment();const original=globalThis.fetch;let hold=true;let posted=0;
 try{
  globalThis.fetch=async(input,init)=>{
   const request=input instanceof Request?input:new Request(input,init);const url=new URL(request.url);
   if(url.host==='api.razorpay.com'){
    if(url.pathname.endsWith('/payments'))return Response.json({items:[{id:'pay_test',order_id:'order_test',amount:1034900,currency:'INR',status:'captured'}]});
    assert.equal(url.pathname,'/v1/orders/order_test/transfers');
    return Response.json({items:[{id:'trf_test',source:'order_test',recipient:'acc_test',amount:950000,currency:'INR',status:'processed',on_hold:hold,settlement_status:hold?'on_hold':'pending',amount_reversed:0}]});
   }
   if(url.pathname.endsWith('/payment_attempts'))return Response.json({provider_order_id:'order_test',amount_paise:1034900,environment:'test',status:'created'});
   if(url.pathname.endsWith('/order_snapshots'))return Response.json({total_paise:1034900,seller_due_paise:950000});
   if(url.pathname.endsWith('/orders'))return Response.json({id:oid,seller_id:'seller',status:'awaiting_payment'});
   if(url.pathname.endsWith('/seller_accounts'))return Response.json({provider_account_id:'acc_test'});
   assert.ok(url.pathname.endsWith('/rpc/record_capture'));posted++;return Response.json(null);
  };
  await reconcileOrder(oid);assert.equal(posted,1);
  hold=false;await assert.rejects(reconcileOrder(oid),/not confirmed held/);assert.equal(posted,1);
 }finally{globalThis.fetch=original;restore();}
});
test('unsigned webhooks and unauthenticated workers cannot access the database',async()=>{
  const restore=environment();const original=globalThis.fetch;
  try{
    globalThis.fetch=async()=>assert.fail('Unauthorized requests must not reach the database');
    assert.equal((await webhook(new Request('https://app.test/api/webhooks/razorpay',{method:'POST',body:'{}'}))).status,400);
    assert.equal((await runJobs(new Request('https://app.test/api/internal/payments/run',{method:'POST'}))).status,401);
    process.env.PAYMENTS_ENABLED='false';
    assert.equal((await webhook(new Request('https://app.test/api/webhooks/razorpay',{method:'POST',body:'{}'}))).status,503);
  }finally{globalThis.fetch=original;restore();}
});
