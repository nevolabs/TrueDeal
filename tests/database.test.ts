import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { insertSampleListings, sampleUsers, sampleListings, sampleSeed } from '../scripts/sample-catalog.mjs';
import { imageObjectPath } from '../scripts/media-storage.mjs';

const sellerDetails={legalName:'Seller Name',accountHolder:'Seller Name',pan:'ABCPN1234E',accountNumber:'012345678901',confirmAccountNumber:'012345678901',ifsc:'SBIN0001234'};
const buyer='10000000-0000-4000-8000-000000000001';
const seller='10000000-0000-4000-8000-000000000002';
const ops='10000000-0000-4000-8000-000000000003';
const stranger='10000000-0000-4000-8000-000000000004';
async function database(bundle = false, withMedia = true) {
  const db=new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',raw_app_meta_data jsonb default '{}',email_confirmed_at timestamptz);
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
  if (withMedia) await db.exec(await readFile('supabase/migrations/202611200001_storage_media.sql','utf8'));
  if (withMedia) await db.exec(await readFile('supabase/migrations/202611200002_site_asset_formats.sql','utf8'));
  if (withMedia) await db.exec(await readFile('supabase/migrations/202611210001_seller_details_and_gallery.sql','utf8'));
  if (withMedia) await db.exec(await readFile('supabase/migrations/202611210002_seller_editing.sql','utf8'));
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
    assert.equal((await db.query('select * from storage.buckets')).rows.length,3);
    assert.ok((await db.query<{allowed_mime_types:string[]}>("select allowed_mime_types from storage.buckets where id='site-assets'")).rows[0].allowed_mime_types.includes('image/svg+xml'));
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
  await command(db,'submit_kyc',null,sellerDetails);
  await assert.rejects(command(db,'review_kyc',seller,{pass:true}));
  await asUser(db,ops); await command(db,'review_kyc',seller,{pass:true});
  await db.exec('reset role');
  await db.query("insert into storage.objects(bucket_id,name) values('listing-photos',$1)",[`${seller}/aaa.jpg`]);
  await asUser(db,seller);
  const id=await command(db,'create_listing',null,{title:'Graphics card',brand:'Test',category:'gpu',condition:'good',price:10000,ageMonths:4,handover:'ship',serial:'SECRET-SERIAL',description:'Test graphics card',city:'Bengaluru',imagePaths:[`${seller}/aaa.jpg`]});
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

test('sample catalogue publishes all original images with sellers, integer paise and no financial or verification records', async () => {
  const db=await database();
  try {
    const userIds:Record<string,string>={};
    for(const [index,user] of sampleUsers.entries()) {
      const id=`d4e00000-0000-4000-8000-${String(index+1).padStart(12,'0')}`;
      userIds[user.key]=id;
      await db.query('insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data,email_confirmed_at) values($1,$2,$3,$4,now())',
        [id,user.email,JSON.stringify({name:user.name,city:user.city}),JSON.stringify({sampleSeed})]);
    }
    const media=await catalogueMedia(db,userIds);
    await insertSampleListings(db,userIds,media);
    // A rerun must preserve later edits rather than resetting listings.
    await db.query('update public.listings set price_paise=600000 where id=$1',[sampleListings[0].id]);
    await insertSampleListings(db,userIds,media);
    assert.equal((await db.query<{price_paise:number}>('select price_paise from public.listings where id=$1',[sampleListings[0].id])).rows[0].price_paise,600000);
    const rows=(await db.query<{price_paise:number;attributes:{title:string;img:string};seller_id:string}>("select * from public.listings where attributes->>'sampleSeed'=$1",[sampleSeed])).rows;
    assert.equal(rows.length,14);
    assert.equal(new Set(rows.map(row=>row.seller_id)).size,4);
    for(const row of rows) {
      assert.ok(Number.isInteger(row.price_paise));
      assert.match(row.attributes.title,/^\[Demo\]/);
      assert.match(row.attributes.img,/^https:\/\/storage.test\/storage\/v1\/object\/public\/listing-photos\//);
    }
    assert.equal((await db.query('select * from public.orders')).rows.length,0);
    assert.equal((await db.query('select * from public.seller_verifications')).rows.length,0);
    assert.equal((await db.query('select * from public.seller_accounts')).rows.length,0);
    assert.equal((await db.query('select * from public.ledger_entries')).rows.length,0);
    assert.equal((await db.query('select * from public.user_roles')).rows.length,1); // Original fixture operator only.
    assert.equal((await db.query('select * from public.listing_media')).rows.length,14);
    await asUser(db,'','anon');
    const state=(await db.query<{state:{listings:unknown[];users:unknown[];orders:unknown[]}}>('select public.app_state() as state')).rows[0].state;
    assert.equal(state.listings.length,14);
    assert.equal(state.users.length,4);
    assert.deepEqual(state.orders,[]);
  } finally {await db.close();}
});

test('sample catalogue refuses unrelated identities and rolls back partial listing writes', async () => {
  const db=await database();
  try {
    const userIds:Record<string,string>={};
    for(const [index,user] of sampleUsers.entries()) {
      const id=`d4e00000-0000-4000-8000-${String(index+1).padStart(12,'0')}`;
      userIds[user.key]=id;
      await db.query('insert into auth.users(id,email,raw_app_meta_data,email_confirmed_at) values($1,$2,$3,now())',
        [id,user.email,JSON.stringify({sampleSeed})]);
    }
    // The fourth seller is needed only after earlier products have been inserted.
    const media=await catalogueMedia(db,userIds);
    await db.query("update auth.users set raw_app_meta_data='{}' where id=$1",[userIds.kabir]);
    await assert.rejects(insertSampleListings(db,userIds,media),/seed-owned/);
    assert.equal((await db.query('select * from public.listings')).rows.length,0);
    await assert.rejects(insertSampleListings(db,{...userIds,asha:buyer},media),/seller-owned/);
    assert.equal((await db.query('select * from public.listings')).rows.length,0);
  } finally {await db.close();}
});

async function catalogueMedia(db:PGlite,userIds:Record<string,string>) {
  const media:Record<string,{path:string;url:string}>={};
  for(const listing of sampleListings) {
    const bytes=await readFile(`scripts/fixtures/catalog/${listing.sourceImage}`);
    const path=imageObjectPath(userIds[listing.seller],bytes,'jpg');
    await db.query("insert into storage.objects(bucket_id,name) values('listing-photos',$1)",[path]);
    media[listing.id]={path,url:`https://storage.test/storage/v1/object/public/listing-photos/${path}`};
  }
  return media;
}

test('listing media requires an existing seller-owned storage object even through a direct RPC',async()=>{
  const db=await database();
  try{
    await listed(db);
    const body={title:'Storage-backed graphics card',brand:'Test',category:'gpu',condition:'good',price:10000,ageMonths:4,handover:'ship',serial:'TEST',description:'A real stored photo',city:'Bengaluru'};
    const path=`${seller}/abcdef.jpg`;
    const url=`https://storage.test/storage/v1/object/public/listing-photos/${path}`;
    await asUser(db,seller);
    await assert.rejects(command(db,'create_listing',null,{...body,img:'/img/gpu.jpg'}));
    await assert.rejects(command(db,'create_listing',null,{...body,img:url}));
    await db.exec('reset role');
    await db.query("insert into storage.objects(bucket_id,name) values('listing-photos',$1)",[path]);
    await db.query("insert into storage.objects(bucket_id,name) values('listing-photos',$1)",[`${stranger}/abcdef.jpg`]);
    await asUser(db,seller);
    await assert.rejects(command(db,'create_listing',null,{...body,img:url.replace(seller,stranger)}));
    await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('site-assets','brand/abcdef.png')"));
    const id=await command(db,'create_listing',null,{...body,img:url});
    await asUser(db,ops);await command(db,'review_listing',id,{pass:true});
    await asUser(db,'','anon');
    const state=(await db.query<{state:{listings:{id:string;imagePath:string;img?:string}[]}}>('select public.app_state() as state')).rows[0].state;
    const listing=state.listings.find(listing=>listing.id===id)!;
    assert.equal(listing.imagePath,path);
    assert.equal(listing.img,undefined); // URL is derived by the server, never taken from arbitrary attributes.
  }finally{await db.close();}
});

test('basic checks unblock pending sellers without granting verified identity or payout access; gallery paths remain owned',async()=>{
  const db=await database();
  try {
    await asUser(db,seller);
    await assert.rejects(command(db,'submit_kyc',null,{...sellerDetails,pan:'invalid'}));
    await assert.rejects(command(db,'submit_kyc',null,{...sellerDetails,confirmAccountNumber:'999999999'}));
    await command(db,'submit_kyc',null,sellerDetails);
    const paths=[`${seller}/aaa.jpg`,`${seller}/bbb.png`];
    await db.exec('reset role');
    const row=(await db.query<{status:string;pan_last4:string;bank_last4:string}>('select * from public.seller_verifications where user_id=$1',[seller])).rows[0];
    assert.equal(row.status,'pending');assert.equal(row.pan_last4,'234E');assert.equal(row.bank_last4,'8901');
    assert.ok(!JSON.stringify(row).includes(sellerDetails.accountNumber));
    assert.ok(!JSON.stringify(row).includes(sellerDetails.pan));
    for(const path of [...paths,`${stranger}/ccc.jpg`]) await db.query("insert into storage.objects(bucket_id,name) values('listing-photos',$1)",[path]);
    await asUser(db,seller);
    const body={title:'Gallery GPU',brand:'Test',category:'gpu',condition:'good',price:10000,ageMonths:0,handover:'ship',serial:'TEST',description:'Two product photos',city:'Bengaluru',imagePaths:paths};
    for(const invalid of [[],[...paths,paths[0]],[...paths,`${stranger}/ccc.jpg`],[`${seller}/ddd.jpg`],Array(9).fill(paths[0])]) {
      await assert.rejects(command(db,'create_listing',null,{...body,imagePaths:invalid}));
    }
    const id=await command(db,'create_listing',null,body);
    const state=(await db.query<{state:{users:{id:string;kyc:{status:string;basicStatus:string}}[];listings:{id:string;imagePaths:string[]}[]}}>('select public.app_state() as state')).rows[0].state;
    assert.deepEqual(state.listings.find(l=>l.id===id)?.imagePaths,paths);
    assert.equal(state.users.find(u=>u.id===seller)?.kyc.basicStatus,'checked');
    assert.equal(state.users.find(u=>u.id===seller)?.kyc.status,'pending');
    await assert.rejects(db.query("select public.marketplace_command_legacy('create_listing',null,'{}')"));
    await db.exec('reset role');
    assert.equal((await db.query('select * from public.seller_accounts')).rows.length,0);
  }finally{await db.close();}
});

test('listing edits enforce ownership, revisions, photo ownership and renewed review atomically',async()=>{
  const db=await database();
  try {
    const id=await listed(db);
    await asUser(db,seller);
    const state=(await db.query<{state:{listings:{id:string;revision:number}[]}}>('select public.app_state() as state')).rows[0].state;
    const revision=state.listings.find(l=>l.id===id)!.revision;
    const body={title:'Updated graphics card',brand:'Updated',category:'gpu',condition:'excellent',price:15000,ageMonths:0,handover:'onsite',serial:'UPDATED',description:'Updated product details',city:'Chennai',imagePaths:[`${seller}/aaa.jpg`],revision};
    await asUser(db,stranger);await assert.rejects(command(db,'update_listing',id,body));
    await asUser(db,ops);await assert.rejects(command(db,'update_listing',id,body));
    await asUser(db,seller);
    await assert.rejects(command(db,'update_listing',id,{...body,imagePaths:[`${stranger}/aaa.jpg`]}));
    await assert.rejects(command(db,'update_listing',id,{...body,price:1}));
    await command(db,'update_listing',id,body);
    await assert.rejects(command(db,'update_listing',id,body));
    await db.exec('reset role');
    const row=(await db.query<{status:string;revision:number;price_paise:number;serial:string;attributes:{title:string}}> ('select * from public.listings where id=$1',[id])).rows[0];
    assert.equal(row.status,'pending');assert.equal(row.price_paise,1500000);assert.equal(row.serial,'UPDATED');assert.equal(row.attributes.title,body.title);assert.equal(row.revision,revision+1);
    assert.equal((await db.query('select * from public.listing_media where listing_id=$1',[id])).rows.length,1);
    for(const status of ['reserved','sold']) {
      await db.query('update public.listings set status=$1 where id=$2',[status,id]);
      const rev=(await db.query<{revision:number}>('select revision from public.listings where id=$1',[id])).rows[0].revision;
      await asUser(db,seller);await assert.rejects(command(db,'update_listing',id,{...body,revision:rev}));await db.exec('reset role');
    }
    await db.query("update public.listings set status='live',mode='hub' where id=$1",[id]);
    const rev=(await db.query<{revision:number}>('select revision from public.listings where id=$1',[id])).rows[0].revision;
    await asUser(db,seller);await assert.rejects(command(db,'update_listing',id,{...body,revision:rev}));
    await assert.rejects(db.query("select public.marketplace_command_v2('update_listing',null,'{}')"));
  }finally{await db.close();}
});

test('seller detail edits reset earlier identity approval and never change an activated payout account',async()=>{
  const db=await database();
  try {
    await listed(db);
    await asUser(db,seller);
    await command(db,'submit_kyc',null,{...sellerDetails,accountNumber:'012345679012',confirmAccountNumber:'012345679012'});
    await db.exec('reset role');
    const row=(await db.query<{status:string;bank_last4:string;reviewed_by:string|null}>('select * from public.seller_verifications where user_id=$1',[seller])).rows[0];
    assert.equal(row.status,'pending');assert.equal(row.bank_last4,'9012');assert.equal(row.reviewed_by,null);
    await db.query("insert into public.seller_accounts(user_id,environment,provider_account_id,payouts_enabled) values($1,'test','acc_unchanged',true)",[seller]);
    await asUser(db,seller);await assert.rejects(command(db,'submit_kyc',null,sellerDetails));
    await db.exec('reset role');
    const account=(await db.query<{provider_account_id:string}>('select * from public.seller_accounts where user_id=$1',[seller])).rows[0];
    assert.equal(account.provider_account_id,'acc_unchanged');
    assert.equal((await db.query<{bank_last4:string}>('select bank_last4 from public.seller_verifications where user_id=$1',[seller])).rows[0].bank_last4,'9012');
  }finally{await db.close();}
});

test('legacy catalogue media migrates without resetting prices or replacing later seller photos',async()=>{
  const db=await database(false,false);
  try{
    const userIds:Record<string,string>={};
    for(const [index,user] of sampleUsers.entries()){
      const id=`d4e00000-0000-4000-8000-${String(index+1).padStart(12,'0')}`;userIds[user.key]=id;
      await db.query('insert into auth.users(id,email,raw_app_meta_data,email_confirmed_at) values($1,$2,$3,now())',[id,user.email,JSON.stringify({sampleSeed})]);
    }
    const original=sampleListings[0];
    await db.query("insert into public.listings(id,seller_id,category,price_paise,status,handover,serial,attributes) values($1,$2,'gpu',777700,'withdrawn','ship','TEST',$3)",
      [original.id,userIds.asha,JSON.stringify({...original.attributes,img:`/img/${original.sourceImage}`})]);
    const uploaded=sampleListings[1];const existingPath=`${userIds.asha}/987654.jpg`;
    const existingUrl=`https://storage.test/storage/v1/object/public/listing-photos/${existingPath}`;
    await db.query("insert into storage.objects(bucket_id,name) values('listing-photos',$1)",[existingPath]);
    await db.query("insert into public.listings(id,seller_id,category,price_paise,status,handover,serial,attributes) values($1,$2,'cpu',500000,'live','ship','TEST',$3)",
      [uploaded.id,userIds.asha,JSON.stringify({...uploaded.attributes,img:existingUrl})]);
    await db.exec(await readFile('supabase/migrations/202611200001_storage_media.sql','utf8'));
    assert.equal((await db.query<{storage_path:string}>('select storage_path from public.listing_media where listing_id=$1',[uploaded.id])).rows[0].storage_path,existingPath);
    const media=await catalogueMedia(db,userIds);
    await insertSampleListings(db,userIds,media);
    assert.equal((await db.query<{attributes:{img:string}}>('select attributes from public.listings where id=$1',[uploaded.id])).rows[0].attributes.img,existingUrl);
    const row=(await db.query<{attributes:{img:string};status:string;price_paise:number}>('select * from public.listings where id=$1',[original.id])).rows[0];
    assert.equal(row.attributes.img,media[original.id].url);assert.equal(row.status,'withdrawn');assert.equal(row.price_paise,777700);
    const replacement=`${userIds.asha}/123456.jpg`;
    await db.query("insert into storage.objects(bucket_id,name) values('listing-photos',$1)",[replacement]);
    const replacementUrl=`https://storage.test/storage/v1/object/public/listing-photos/${replacement}`;
    await db.query("update public.listings set attributes=jsonb_set(attributes,'{img}',to_jsonb($2::text)) where id=$1",[original.id,replacementUrl]);
    await insertSampleListings(db,userIds,media);
    assert.equal((await db.query<{storage_path:string}>('select storage_path from public.listing_media where listing_id=$1',[original.id])).rows[0].storage_path,replacement);
  }finally{await db.close();}
});
