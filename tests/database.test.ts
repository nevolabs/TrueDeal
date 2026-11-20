import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const buyer='10000000-0000-4000-8000-000000000001';
const seller='10000000-0000-4000-8000-000000000002';
const ops='10000000-0000-4000-8000-000000000003';
const stranger='10000000-0000-4000-8000-000000000004';
async function database(bundle = false) {
  const db=new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;`);
  await db.exec(`create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
    grant usage on schema storage to authenticated; grant select,insert on storage.objects to authenticated;`);
  if (bundle) {
    await db.exec(await readFile('supabase/setup.sql','utf8'));
    return db;
  }
  await db.exec(await readFile('supabase/migrations/202611180001_marketplace.sql','utf8'));
  await db.exec(await readFile('supabase/migrations/202611180002_payments.sql','utf8'));
  await db.exec(await readFile('supabase/migrations/202611180003_storage.sql','utf8'));
  await db.exec(await readFile('supabase/migrations/202611180004_onboarding.sql','utf8'));
  for(const [id,name] of [[buyer,'Buyer'],[seller,'Seller'],[ops,'Operator'],[stranger,'Other']]) {
    await db.query(`insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)`,[id,name+'@test.invalid',JSON.stringify({name,city:'Bengaluru'})]);
  }
  await db.query(`insert into public.user_roles values($1,'ops')`,[ops]);
  return db;
}
test('single-file setup installs the schema without creating accounts or paid transactions',async()=>{
  const db=await database(true);
  try {
    assert.equal((await db.query('select * from public.profiles')).rows.length,0);
    assert.equal((await db.query('select * from public.user_roles')).rows.length,0);
    assert.equal((await db.query('select * from public.orders')).rows.length,0);
    assert.equal((await db.query('select * from public.payment_attempts')).rows.length,0);
    assert.equal((await db.query('select * from storage.buckets')).rows.length,2);
    await asUser(db,'','anon');
    const result=await db.query<{state:{listings:unknown[];orders:unknown[]}}>('select public.app_state() as state');
    assert.deepEqual(result.rows[0].state.listings,[]);
    assert.deepEqual(result.rows[0].state.orders,[]);
  } finally { await db.close(); }
});
async function asUser(db:PGlite,id:string,role='authenticated') {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`,[id]);
  await db.exec('set role '+role);
}
async function command(db:PGlite,action:string,id:string|null=null,body:unknown={}) {
  const r=await db.query<{id:string}>(`select public.marketplace_command($1,$2,$3) as id`,[action,id,JSON.stringify(body)]);
  return r.rows[0].id;
}
async function listed(db:PGlite) {
  await asUser(db,seller);
  await command(db,'submit_kyc',null,{legalName:'Seller Name'});
  await assert.rejects(command(db,'review_kyc',seller,{pass:true}));
  await asUser(db,ops); await command(db,'review_kyc',seller,{pass:true});
  await asUser(db,seller);
  const id=await command(db,'create_listing',null,{title:'Graphics card',brand:'Test',category:'gpu',condition:'good',price:10000,ageMonths:4,handover:'ship',serial:'SECRET-SERIAL',description:'Test graphics card',city:'Bengaluru'});
  await asUser(db,ops); await command(db,'review_listing',id,{pass:true});
  return id;
}
test('migration enforces identity, role grants, private reads and public redaction',async()=>{
  const db=await database();
  try {
    const listing=await listed(db);
    await asUser(db,stranger);
    await assert.rejects(db.exec(`insert into public.user_roles values('${stranger}','ops')`));
    await assert.rejects(command(db,'review_listing',listing,{pass:true}));
    const profiles=await db.query('select * from public.profiles');
    assert.equal(profiles.rows.length,1);
    await asUser(db,'','anon');
    await assert.rejects(command(db,'reserve',listing,{}));
    const state=await db.query<{state:{listings:{serial:string}[];orders:unknown[]}}>('select public.app_state() as state');
    assert.equal(state.rows[0].state.listings[0].serial,'');
    assert.equal(state.rows[0].state.orders.length,0);
  } finally {await db.close();}
});

async function capturedOrder(db:PGlite) {
  const listing=await listed(db);
  await db.exec('reset role');
  await db.query(`insert into public.seller_accounts(user_id,environment,provider_account_id,payouts_enabled) values($1,'test','acc_test',true)`,[seller]);
  await asUser(db,buyer);
  const order=await command(db,'reserve',listing,{address:{name:'Buyer',phone:'9999999999',line:'Street',city:'Bengaluru',pin:'560001'},tier:'basic'});
  await assert.rejects(db.query('select public.checkout_claim($1,$2,$3)',[order,buyer,'test']));
  await db.exec('reset role');
  await db.query('select public.checkout_claim($1,$2,$3)',[order,buyer,'test']);
  await assert.rejects(db.query('select public.checkout_claim($1,$2,$3)',[order,buyer,'test']));
  await db.query(`update public.payment_attempts set provider_order_id='order_test',status='created' where order_id=$1`,[order]);
  await assert.rejects(db.query('select public.record_capture($1,$2,$3,$4,$5,$6,$7,$8)',[order,'order_test','pay_test',1,'trf_test',950000,'acc_test','test']));
  for(let i=0;i<2;i++) await db.query('select public.record_capture($1,$2,$3,$4,$5,$6,$7,$8)',[order,'order_test','pay_test',1034900,'trf_test',950000,'acc_test','test']);
  assert.equal((await db.query('select * from public.ledger_transactions')).rows.length,1);
  await asUser(db,seller);await command(db,'handover',order);
  await asUser(db,ops);await command(db,'receive',order);
  await command(db,'verify',order,{pass:true,report:{serial:'SECRET-SERIAL',checks:[{label:'Identity',result:'pass'}],grade:'good',agent:'Operator',seal:'SEALED'}});
  await assert.rejects(command(db,'dispatch',order,{courier:'Courier'}));
  await command(db,'dispatch',order,{courier:'Courier',awb:'TRACK123'});
  await asUser(db,buyer);await command(db,'delivered',order);
  return order;
}
test('a dispute blocks buyer release; refunds require return and provider confirmation',async()=>{
  const db=await database();
  try {
    const order=await capturedOrder(db);
    await command(db,'dispute',order,{reason:'Wrong item',detail:'The item does not match the description'});
    await assert.rejects(command(db,'release',order));
    await asUser(db,ops);
    await assert.rejects(command(db,'refund',order));
    await command(db,'return_received',order);await command(db,'refund',order);
    await assert.rejects(command(db,'release',order));
    await db.exec('reset role');
    await assert.rejects(db.query('select public.record_refund($1,$2,$3,$4)',[order,'rf_test',1034900,false]));
    await db.query('select public.record_refund($1,$2,$3,$4)',[order,'rf_test',1034900,true]);
    await db.query('select public.record_refund($1,$2,$3,$4)',[order,'rf_test',1034900,true]);
    const r=await db.query<{status:string}>('select status from public.orders where id=$1',[order]);
    assert.equal(r.rows[0].status,'refunded');
    const journal=await db.query<{balance:number}>('select sum(signed_amount_paise) as balance from public.ledger_entries');
    assert.equal(Number(journal.rows[0].balance),0);
  } finally {await db.close();}
});
test('release is a single decision and completion waits for settlement',async()=>{
  const db=await database();
  try {
    const order=await capturedOrder(db);
    await asUser(db,ops);await assert.rejects(command(db,'release',order));
    await asUser(db,buyer);await command(db,'release',order);
    await assert.rejects(command(db,'dispute',order,{reason:'Late claim',detail:'Late claim should not race a committed release'}));
    await db.exec('reset role');
    const before=await db.query<{status:string}>('select status from public.orders where id=$1',[order]);
    assert.equal(before.rows[0].status,'release_pending');
    await assert.rejects(db.query('select public.record_settlement($1,$2,$3)',[order,'wrong-transfer','setl_test']));
    await db.query('select public.record_settlement($1,$2,$3)',[order,'trf_test','setl_test']);
    await db.query('select public.record_settlement($1,$2,$3)',[order,'trf_test','setl_test']);
    assert.equal((await db.query<{status:string}>('select status from public.orders where id=$1',[order])).rows[0].status,'completed');
    assert.equal((await db.query('select * from public.payment_operations')).rows.length,1);
    await assert.rejects(db.exec(`insert into public.ledger_entries(transaction_id,account,signed_amount_paise) select id,'gateway_clearing',1 from public.ledger_transactions limit 1`));
  } finally {await db.close();}
});
test('private evidence belongs to order participants; arbitrary upload paths are denied',async()=>{
  const db=await database();
  try {
    const order=await capturedOrder(db);
    await db.query(`insert into storage.objects(bucket_id,name) values('order-evidence',$1)`,[order+'/'+buyer+'/evidence.jpg']);
    await assert.rejects(db.query(`insert into storage.objects(bucket_id,name) values('order-evidence',$1)`,[order+'/'+seller+'/forged.jpg']));
    await asUser(db,stranger);
    assert.equal((await db.query(`select * from storage.objects where bucket_id='order-evidence'`)).rows.length,0);
    await assert.rejects(db.query(`insert into storage.objects(bucket_id,name) values('order-evidence',$1)`,[order+'/'+stranger+'/intruder.jpg']));
    await asUser(db,seller);
    assert.equal((await db.query(`select * from storage.objects where bucket_id='order-evidence'`)).rows.length,1);
  } finally{await db.close();}
});
test('the timed worker authorizes once, and external disputes block automatic release',async()=>{
 const db=await database();
 try{
  const order=await capturedOrder(db);
  await db.exec('reset role');
  await db.query(`update public.orders set inspection_deadline_at=now()-interval '1 minute' where id=$1`,[order]);
  await asUser(db,buyer);
  await assert.rejects(command(db,'dispute',order,{reason:'Expired',detail:'Claim after the inspection deadline'}));
  await db.exec('reset role');
  await db.query(`insert into public.payment_disputes(provider_dispute_id,order_id,status) values('disp_test',$1,'closed')`,[order]);
  await db.exec('select public.authorize_due_releases()');
  assert.equal((await db.query('select * from public.payment_operations')).rows.length,0);
  await db.exec(`update public.payment_disputes set status='won' where provider_dispute_id='disp_test'`);
  await db.exec('select public.authorize_due_releases(); select public.authorize_due_releases()');
  assert.equal((await db.query('select * from public.payment_operations')).rows.length,1);
  assert.equal((await db.query('select * from public.outbox_jobs')).rows.length,1);
 }finally{await db.close();}
});
test('onsite fees are snapshotted and pre-inspected hub stock skips reinspection',async()=>{
 for(const mode of ['onsite','hub']){
  const db=await database();
  try{
   const listing=await listed(db);await db.exec('reset role');
   await db.query(`insert into public.seller_accounts(user_id,environment,provider_account_id,payouts_enabled) values($1,'test','acc_test',true)`,[seller]);
   if(mode==='onsite')await db.query(`update public.listings set handover='onsite' where id=$1`,[listing]);
   else{
    await db.query(`update public.listings set mode='hub' where id=$1`,[listing]);
    await db.query(`insert into public.inspections(listing_id,inspector_id,report,passed) values($1,$2,'{"serial":"SECRET-SERIAL","checks":[],"seal":"SEALED"}',true)`,[listing,ops]);
   }
   await asUser(db,buyer);
   const order=await command(db,'reserve',listing,{address:{name:'Buyer',phone:'9999999999',line:'Street',city:'Bengaluru',pin:'560001'},tier:'full'});
   await db.exec('reset role');
   const snapshot=(await db.query<{total_paise:number;seller_due_paise:number;visit_paise:number;inspection_paise:number;handover:string}>('select * from public.order_snapshots where order_id=$1',[order])).rows[0];
   assert.equal(Number(snapshot.visit_paise),mode==='onsite'?79900:0);
   assert.equal(Number(snapshot.inspection_paise),mode==='onsite'?79900:0);
   if(mode==='hub'){
    await db.query(`insert into public.payment_attempts(order_id,environment,provider_order_id,amount_paise) values($1,'test','order_hub',$2)`,[order,snapshot.total_paise]);
    await db.query('select public.record_capture($1,$2,$3,$4,$5,$6,$7,$8)',[order,'order_hub','pay_hub',snapshot.total_paise,'trf_hub',snapshot.seller_due_paise,'acc_test','test']);
    assert.equal((await db.query<{status:string}>('select status from public.orders where id=$1',[order])).rows[0].status,'verified');
   }
  }finally{await db.close();}
 }
});
test('reservation snapshots server prices, blocks double claims and unauthorized changes',async()=>{
  const db=await database();
  try {
    const listing=await listed(db);
    await db.exec('reset role');
    await db.query(`insert into public.seller_accounts(user_id,environment,provider_account_id,payouts_enabled) values($1,'test','acc_test',true)`,[seller]);
    await asUser(db,buyer);
    const address={name:'Buyer',phone:'9999999999',line:'Example street',city:'Bengaluru',pin:'560001'};
    const order=await command(db,'reserve',listing,{address,tier:'full',price:1,total:1});
    await assert.rejects(command(db,'reserve',listing,{address,tier:'basic'}));
    await assert.rejects(command(db,'release',order));
    await assert.rejects(command(db,'handover',order));
    await db.exec('reset role');
    const snapshot=await db.query<{total_paise:number,seller_due_paise:number}>('select * from public.order_snapshots where order_id=$1',[order]);
    assert.equal(Number(snapshot.rows[0].total_paise),1114800);
    assert.equal(Number(snapshot.rows[0].seller_due_paise),950000);
    await asUser(db,stranger);
    const state=await db.query<{state:{orders:unknown[]}}>('select public.app_state() as state');
    assert.equal(state.rows[0].state.orders.length,0);
    await assert.rejects(command(db,'dispute',order,{reason:'Wrong item',detail:'Wrong item delivered'}));
  } finally {await db.close();}
});
