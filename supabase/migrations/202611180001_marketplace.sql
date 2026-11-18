-- TrueDeal initial schema. Apply to a fresh Supabase project with SQL Editor
-- or `supabase db push`. No prototype users or financial events are seeded.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id),
  name text not null check (length(name) between 1 and 100),
  city text not null default '',
  account_status text not null default 'active' check (account_status in ('active','suspended')),
  created_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid references public.profiles(id),
  role text check (role in ('ops','admin')),
  primary key(user_id,role)
);
create table public.addresses (
  user_id uuid primary key references public.profiles(id),
  address jsonb not null
);
create table public.seller_verifications (
  user_id uuid primary key references public.profiles(id),
  legal_name text not null,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  provider_reference text,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), reviewed_at timestamptz
);
create table public.seller_accounts (
  user_id uuid primary key references public.profiles(id),
  provider text not null default 'razorpay', environment text not null check(environment in ('test','live')),
  provider_account_id text not null, product_config_id text,
  onboarding_status text not null default 'pending', payouts_enabled boolean not null default false,
  bank_last4 text, created_at timestamptz not null default now(),
  unique(provider,environment,provider_account_id)
);
create table public.categories (
  slug text primary key, label text not null,
  shipping_paise bigint not null check(shipping_paise>=0), bench_paise bigint not null check(bench_paise>=0)
);
insert into public.categories values
 ('gpu','Graphics cards',34900,79900),('cpu','Processors & boards',24900,49900),
 ('laptop','Laptops',49900,99900),('desktop','Desktop builds',149900,149900),
 ('monitor','Monitors',79900,59900),('keyboard','Keyboards',19900,29900),
 ('mouse','Mice',14900,19900),('audio','Audio',19900,29900),
 ('camera','Cameras',39900,79900),('component','Other components',24900,39900);
create table public.fee_policies (
  version integer primary key, commission_bps integer not null, min_commission_paise bigint not null,
  visit_paise bigint not null, inspection_hours integer not null,
  effective_at timestamptz not null default now()
);
insert into public.fee_policies values(1,500,49900,79900,48,now());
create table public.listings (
  id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.profiles(id),
  category text not null references public.categories(slug),
  price_paise bigint not null check(price_paise between 500000 and 10000000000),
  status text not null default 'pending' check(status in ('pending','live','reserved','sold','rejected','withdrawn')),
  mode text not null default 'order' check(mode in ('order','hub')),
  handover text not null check(handover in ('ship','onsite')),
  serial text not null, attributes jsonb not null,
  created_at timestamptz not null default now()
);
create table public.listing_media (
  id uuid primary key default gen_random_uuid(), listing_id uuid references public.listings(id),
  storage_path text not null, sort_order integer not null default 0
);
create table public.orders (
  id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.listings(id),
  buyer_id uuid not null references public.profiles(id), seller_id uuid not null references public.profiles(id),
  status text not null default 'awaiting_payment' check(status in
   ('awaiting_payment','payment_review','paid','in_transit','at_hub','verified','shipped','delivered','completed','disputed','refund_pending','refunded','cancelled','release_pending')),
  financial_decision text check(financial_decision in ('release','refund')),
  reservation_expires_at timestamptz not null default now()+interval '15 minutes',
  delivered_at timestamptz, inspection_deadline_at timestamptz, buyer_accepted_at timestamptz,
  handover_code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
  created_at timestamptz not null default now(),
  check(buyer_id<>seller_id)
);
create unique index one_claim_per_listing on public.orders(listing_id) where status not in ('cancelled','refunded');
create index buyer_orders on public.orders(buyer_id,created_at desc);
create index seller_orders on public.orders(seller_id,created_at desc);
create index release_deadlines on public.orders(inspection_deadline_at) where status='delivered';
create index listing_browse on public.listings(status,category,created_at desc);
create table public.order_snapshots (
  order_id uuid primary key references public.orders(id), product jsonb not null, address jsonb not null,
  tier text not null check(tier in ('basic','full')), handover text not null,
  fee_policy_version integer not null references public.fee_policies(version),
  price_paise bigint not null check(price_paise>=0), shipping_paise bigint not null check(shipping_paise>=0),
  inspection_paise bigint not null check(inspection_paise>=0), commission_paise bigint not null check(commission_paise>=0),
  visit_paise bigint not null check(visit_paise>=0), total_paise bigint not null, seller_due_paise bigint not null check(seller_due_paise>0),
  currency text not null default 'INR' check(currency='INR'),
  check(total_paise=price_paise+shipping_paise+inspection_paise),
  check(seller_due_paise=price_paise-commission_paise-visit_paise)
);
create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id),
  provider text not null default 'razorpay', environment text not null check(environment in ('test','live')),
  provider_order_id text unique, provider_payment_id text unique,
  amount_paise bigint not null check(amount_paise>0), currency text not null default 'INR' check(currency='INR'),
  status text not null default 'created' check(status in ('created','creating','authorized','captured','failed','unknown')),
  next_reconcile_at timestamptz not null default now(),
  created_at timestamptz not null default now(), captured_at timestamptz
);
create table public.seller_transfers (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id),
  provider_transfer_id text not null unique, amount_paise bigint not null check(amount_paise>0),
  status text not null check(status in ('held','release_authorized','settled','reversed','failed')),
  provider_settlement_id text, updated_at timestamptz not null default now()
);
create table public.refunds (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id),
  provider_refund_id text unique, amount_paise bigint not null check(amount_paise>0),
  status text not null default 'pending' check(status in ('pending','processed','failed','unknown')),
  reason text not null, created_at timestamptz not null default now()
);
create table public.transfer_reversals (
  id uuid primary key default gen_random_uuid(), transfer_id uuid references public.seller_transfers(id),
  provider_reversal_id text unique, amount_paise bigint not null check(amount_paise>0), status text not null
);
create table public.provider_settlements (
  provider_settlement_id text primary key, status text not null, amount_paise bigint not null,
  fees_paise bigint not null default 0, tax_paise bigint not null default 0
);
create table public.settlement_items (
  settlement_id text references public.provider_settlements(provider_settlement_id),
  transfer_id uuid references public.seller_transfers(id), primary key(settlement_id,transfer_id)
);
create table public.inspections (
  id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.listings(id),
  order_id uuid unique references public.orders(id), inspector_id uuid not null references public.profiles(id),
  report jsonb not null, passed boolean not null, created_at timestamptz not null default now()
);
create table public.shipments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
  leg text not null check(leg in ('seller_to_hub','hub_to_buyer','return')),
  courier text not null, tracking_number text not null, delivered_at timestamptz,
  unique(order_id,leg)
);
create table public.disputes (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id),
  opened_by uuid not null references public.profiles(id), reason text not null, detail text not null,
  resolution text check(resolution in ('refund','release')), resolved_by uuid references public.profiles(id),
  return_received_at timestamptz, created_at timestamptz not null default now()
);
create table public.dispute_evidence (
  id uuid primary key default gen_random_uuid(), dispute_id uuid not null references public.disputes(id),
  submitted_by uuid not null references public.profiles(id), storage_path text not null
);
create table public.payment_disputes (
  provider_dispute_id text primary key, order_id uuid not null references public.orders(id),
  status text not null, created_at timestamptz not null default now()
);
create table public.order_events (
  id bigint generated always as identity primary key, order_id uuid not null references public.orders(id),
  status text not null, note text, actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.webhook_events (
  event_id text primary key, payload jsonb not null, status text not null default 'pending',
  attempts integer not null default 0, last_error text,
  received_at timestamptz not null default now(), processed_at timestamptz
);
create table public.payment_operations (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
  kind text not null check(kind in ('checkout','release','refund','reconcile')),
  status text not null default 'pending' check(status in ('pending','processing','done','unknown','failed')),
  provider_reference text, last_error text, created_at timestamptz not null default now(),
  unique(order_id,kind)
);
create table public.outbox_jobs (
  id uuid primary key default gen_random_uuid(), operation_id uuid not null unique references public.payment_operations(id),
  run_after timestamptz not null default now(), lease_until timestamptz, attempts integer not null default 0,
  status text not null default 'pending' check(status in ('pending','processing','done','manual_review'))
);
create index jobs_due on public.outbox_jobs(status,run_after);
create table public.ledger_accounts (code text primary key);
insert into public.ledger_accounts values('gateway_clearing'),('buyer_funds'),('seller_payable'),('platform_retained');
create table public.ledger_transactions (
  id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id),
  event_key text not null unique, created_at timestamptz not null default now()
);
create table public.ledger_entries (
  id bigint generated always as identity primary key, transaction_id uuid not null references public.ledger_transactions(id),
  account text not null references public.ledger_accounts(code), signed_amount_paise bigint not null
);
create table public.audit_logs (
  id bigint generated always as identity primary key, actor_id uuid references public.profiles(id),
  action text not null, entity_id uuid, created_at timestamptz not null default now()
);
create index payment_reconcile_due on public.payment_attempts(next_reconcile_at);
create index order_listing_history on public.orders(listing_id);
create index inspection_listing_history on public.inspections(listing_id,created_at desc);
create index order_event_history on public.order_events(order_id,id);
create index listing_media_order on public.listing_media(listing_id,sort_order);
create index journal_transaction_entries on public.ledger_entries(transaction_id);

create function public.is_operator() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_roles r join public.profiles p on p.id=r.user_id
 where r.user_id=auth.uid() and p.account_status='active' and r.role in ('ops','admin'))
$$;
create function public.new_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,name,city) values(new.id,
  left(coalesce(nullif(trim(new.raw_user_meta_data->>'name'),''),split_part(new.email,'@',1),'Member'),100),
  left(coalesce(new.raw_user_meta_data->>'city',''),100));
 return new;
end $$;
create trigger create_profile after insert on auth.users for each row execute function public.new_profile();
-- Backfill actual existing Auth users only, never seeded demo identities.
insert into public.profiles(id,name,city) select id,
 left(coalesce(nullif(trim(raw_user_meta_data->>'name'),''),split_part(email,'@',1),'Member'),100),
 left(coalesce(raw_user_meta_data->>'city',''),100) from auth.users on conflict do nothing;

-- Default-deny all direct table access. User commands and read models below
-- derive identity inside fixed-search_path functions. Service role is server-only.
do $$ declare t record; begin
 for t in select tablename from pg_tables where schemaname='public' and tablename in ('profiles','user_roles','addresses','seller_verifications','seller_accounts','categories','fee_policies','listings','listing_media','orders','order_snapshots','payment_attempts','seller_transfers','refunds','transfer_reversals','provider_settlements','settlement_items','inspections','shipments','disputes','dispute_evidence','payment_disputes','order_events','webhook_events','payment_operations','outbox_jobs','ledger_accounts','ledger_transactions','ledger_entries','audit_logs') loop
  execute format('alter table public.%I enable row level security',t.tablename);
  execute format('revoke all on public.%I from anon, authenticated',t.tablename);
  execute format('grant all on public.%I to service_role',t.tablename);
 end loop;
end $$;
grant select on public.profiles,public.user_roles,public.seller_verifications,public.addresses to authenticated;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
create policy own_roles on public.user_roles for select to authenticated using(user_id=auth.uid());
create policy own_verification on public.seller_verifications for select to authenticated using(user_id=auth.uid());
create policy own_address on public.addresses for select to authenticated using(user_id=auth.uid());
grant usage,select on all sequences in schema public to service_role;

-- Safe read model. No emails, PAN, full bank accounts or provider payloads.
create function public.app_state() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid(); op boolean:=public.is_operator(); result jsonb;
begin
 if uid is not null and not exists(select 1 from public.profiles where id=uid and account_status='active') then
  raise exception 'Account unavailable' using errcode='42501';
 end if;
 select jsonb_build_object(
  'users',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'city',p.city,
   'email','','role',case when op and exists(select 1 from public.user_roles where user_id=p.id) then 'ops' else 'member' end,
   'joined',extract(epoch from p.created_at)*1000,'deals',(select count(*) from public.orders where seller_id=p.id and status='completed'),
   'kyc',jsonb_build_object('status',coalesce(v.status,'none'),'legalName',case when op or p.id=uid then v.legal_name end)))
   from public.profiles p left join public.seller_verifications v on v.user_id=p.id
   where p.id=uid or op or exists(select 1 from public.listings l where l.seller_id=p.id and l.status in ('live','reserved','sold'))
    or exists(select 1 from public.orders o where (o.buyer_id=uid or o.seller_id=uid) and p.id in (o.buyer_id,o.seller_id))), '[]'),
  'listings',coalesce((select jsonb_agg(l.attributes || jsonb_build_object('id',l.id,'sellerId',l.seller_id,
   'category',l.category,'price',l.price_paise/100.0,'status',l.status,'mode',l.mode,'handover',l.handover,
   'serial',case when op or l.seller_id=uid then l.serial else '' end,
   'createdAt',extract(epoch from l.created_at)*1000,
   'report',(select i.report || jsonb_build_object('serial',case when op or l.seller_id=uid then i.report->>'serial' else 'Hidden' end)
     from public.inspections i where i.listing_id=l.id and i.passed order by i.created_at desc limit 1)))
   from public.listings l where l.status='live' or l.seller_id=uid or op or exists(select 1 from public.orders o
    where o.listing_id=l.id and uid in (o.buyer_id,o.seller_id))), '[]'),
  'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'listingId',o.listing_id,'buyerId',o.buyer_id,'sellerId',o.seller_id,
   'status',o.status,'financialDecision',o.financial_decision,'createdAt',extract(epoch from o.created_at)*1000,
   'price',s.price_paise/100.0,'shipping',s.shipping_paise/100.0,'inspectionFee',s.inspection_paise/100.0,
   'fee',s.commission_paise/100.0,'visitFee',s.visit_paise/100.0,'total',s.total_paise/100.0,'payout',s.seller_due_paise/100.0,
   'tier',s.tier,'handover',s.handover,'fromStock',s.handover='hub','address',case when op or o.buyer_id=uid then s.address else '{}'::jsonb end,
   'payMethod','Razorpay','handoverCode',case when op or o.seller_id=uid then o.handover_code else '' end,
   'windowEnds',extract(epoch from o.inspection_deadline_at)*1000,
   'fundsStatus',(select t.status from public.seller_transfers t where t.order_id=o.id),
   'timeline',coalesce((select jsonb_agg(jsonb_build_object('status',e.status,'at',extract(epoch from e.created_at)*1000,'note',e.note) order by e.id)
    from public.order_events e where e.order_id=o.id),'[]'),
   'report',(select i.report || jsonb_build_object('serial',case when op or o.seller_id=uid then i.report->>'serial' else 'Hidden' end)
    from public.inspections i where i.order_id=o.id or (s.handover='hub' and i.listing_id=o.listing_id) order by i.created_at desc limit 1),
   'tracking',(select jsonb_build_object('courier',sh.courier,'awb',sh.tracking_number) from public.shipments sh where sh.order_id=o.id and sh.leg='hub_to_buyer'),
   'dispute',(select jsonb_build_object('reason',d.reason,'detail',d.detail,'at',extract(epoch from d.created_at)*1000,'resolution',d.resolution) from public.disputes d where d.order_id=o.id)))
   from public.orders o join public.order_snapshots s on s.order_id=o.id where op or uid in (o.buyer_id,o.seller_id)), '[]')
 ) into result;
 return result;
end $$;

-- One transaction for every business command. Service/provider commands live
-- in a separate migration and are never granted to browser roles.
create function public.marketplace_command(action text, entity uuid default null, body jsonb default '{}') returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); op boolean:=public.is_operator(); l public.listings; o public.orders;
 c public.categories; f public.fee_policies; oid uuid; commission bigint; visit bigint; inspection bigint;
 report jsonb; passed boolean; next_status text; operation uuid;
begin
 if body is null or jsonb_typeof(body)<>'object' or length(body::text)>32000 then raise exception 'Invalid command body'; end if;
 if uid is null or not exists(select 1 from public.profiles where id=uid and account_status='active') then
  raise exception 'Sign in first' using errcode='42501'; end if;
 if action='submit_kyc' then
  if length(trim(coalesce(body->>'legalName',''))) not between 2 and 100 then raise exception 'Enter your legal name'; end if;
  insert into public.seller_verifications(user_id,legal_name) values(uid,trim(body->>'legalName'))
   on conflict(user_id) do update set legal_name=excluded.legal_name,status='pending',reviewed_by=null,reviewed_at=null
   where public.seller_verifications.status<>'verified';
  return uid;
 elsif action='review_kyc' then
  if not op or entity=uid then raise exception 'Not authorized' using errcode='42501'; end if;
  update public.seller_verifications set status=case when (body->>'pass')::boolean then 'verified' else 'rejected' end,
   reviewed_by=uid,reviewed_at=now() where user_id=entity;
  if not found then raise exception 'Verification not found'; end if;
  insert into public.audit_logs(actor_id,action,entity_id) values(uid,action,entity); return entity;
 elsif action='create_listing' then
  if not exists(select 1 from public.seller_verifications where user_id=uid and status='verified') then raise exception 'Verify your identity first'; end if;
  if length(trim(coalesce(body->>'title',''))) not between 3 and 90 or length(trim(coalesce(body->>'description',''))) not between 5 and 10000
    or length(trim(coalesce(body->>'serial',''))) not between 1 and 100
    or coalesce(body->>'condition','') not in ('likenew','excellent','good','fair')
    or coalesce((body->>'ageMonths')::integer,-1) not between 0 and 240 then raise exception 'Invalid listing details'; end if;
  insert into public.listings(seller_id,category,price_paise,handover,serial,attributes)
   values(uid,body->>'category',round((body->>'price')::numeric*100),body->>'handover',body->>'serial',
    jsonb_build_object('title',body->>'title','brand',body->>'brand','condition',body->>'condition',
     'description',body->>'description','city',body->>'city','ageMonths',(body->>'ageMonths')::integer,
     'warranty',coalesce(nullif(body->>'warranty',''),'Out of warranty'),'newPrice',coalesce((body->>'newPrice')::numeric,0),
     'invoice',coalesce((body->>'invoice')::boolean,false),'box',coalesce((body->>'box')::boolean,false),'img',coalesce(body->>'img',''),'specs','[]'::jsonb)) returning id into oid;
  return oid;
 elsif action in ('review_listing','withdraw_listing') then
  select * into l from public.listings where id=entity for update;
  if l.id is null then raise exception 'Listing not found'; end if;
  if action='review_listing' then
   if not op or l.seller_id=uid then raise exception 'Not authorized' using errcode='42501'; end if;
   if l.status<>'pending' then raise exception 'Listing is not pending'; end if;
   update public.listings set status=case when (body->>'pass')::boolean then 'live' else 'rejected' end where id=entity;
  else
   if l.seller_id<>uid then raise exception 'Not authorized' using errcode='42501'; end if;
   if l.status not in ('live','pending') then raise exception 'Listing cannot be withdrawn'; end if;
   update public.listings set status='withdrawn' where id=entity;
  end if;
  insert into public.audit_logs(actor_id,action,entity_id) values(uid,action,entity);
  return entity;
 elsif action='reserve' then
  select * into l from public.listings where id=entity for update;
  if l.id is null or l.status<>'live' or l.seller_id=uid then raise exception 'Item unavailable'; end if;
  if l.mode='hub' and not exists(select 1 from public.inspections i where i.listing_id=l.id and i.passed) then raise exception 'The hub inspection report is missing'; end if;
  if not exists(select 1 from public.seller_accounts where user_id=l.seller_id and payouts_enabled) then raise exception 'Seller payment onboarding is not complete'; end if;
  if not coalesce(body->'address' ?& array['name','phone','line','city','pin'],false)
    or length(coalesce(body->'address'->>'name','')) not between 1 and 100
    or length(coalesce(body->'address'->>'phone','')) not between 10 and 15
    or length(coalesce(body->'address'->>'line','')) not between 1 and 300
    or length(coalesce(body->'address'->>'city','')) not between 1 and 100
    or coalesce(body->'address'->>'pin','') !~ '^[0-9]{6}$'
    or coalesce(body->>'tier','') not in ('basic','full') then raise exception 'Complete the delivery address and inspection choice'; end if;
  select * into c from public.categories where slug=l.category;
  select * into f from public.fee_policies order by version desc limit 1;
  commission:=greatest(f.min_commission_paise,round(l.price_paise*f.commission_bps/10000.0));
  visit:=case when l.handover='onsite' and l.mode<>'hub' then f.visit_paise else 0 end;
  inspection:=case when body->>'tier'='full' and l.mode<>'hub' then c.bench_paise else 0 end;
  insert into public.orders(listing_id,buyer_id,seller_id) values(l.id,uid,l.seller_id) returning id into oid;
  insert into public.order_snapshots values(oid,l.attributes,body->'address',case when l.mode='hub' then 'full' else body->>'tier' end,
   case when l.mode='hub' then 'hub' else l.handover end,f.version,l.price_paise,c.shipping_paise,inspection,commission,visit,
   l.price_paise+c.shipping_paise+inspection,l.price_paise-commission-visit,'INR');
  update public.listings set status='reserved' where id=l.id;
  insert into public.order_events(order_id,status,actor_id) values(oid,'awaiting_payment',uid);
  insert into public.addresses values(uid,body->'address') on conflict(user_id) do update set address=excluded.address;
  return oid;
 end if;
 select * into o from public.orders where id=entity for update;
 if o.id is null or not (op or uid in (o.buyer_id,o.seller_id)) then raise exception 'Order not found' using errcode='42501'; end if;
 if op and uid in (o.buyer_id,o.seller_id) and action in ('receive','verify','dispatch','refund','return_received') then
  raise exception 'Operators cannot review their own transactions' using errcode='42501'; end if;
 if action='handover' and o.status='paid' and uid=o.seller_id then next_status:='in_transit';
 elsif action='receive' and o.status='in_transit' and op then next_status:='at_hub';
 elsif action='verify' and o.status='at_hub' and op then
  passed:=(body->>'pass')::boolean; report:=body->'report';
  if jsonb_array_length(report->'checks')<1 or exists(select 1 from jsonb_array_elements(report->'checks') x
    where coalesce(x->>'result','') not in ('pass','fail','na')) then raise exception 'Complete every inspection check'; end if;
  if passed and (exists(select 1 from jsonb_array_elements(report->'checks') x where x->>'result'='fail')
    or upper(report->>'serial')<>(select upper(serial) from public.listings where id=o.listing_id)) then raise exception 'Inspection failed'; end if;
  insert into public.inspections(listing_id,order_id,inspector_id,report,passed) values(o.listing_id,o.id,uid,
    report || jsonb_build_object('id',gen_random_uuid(),'at',extract(epoch from now())*1000,'failed',not passed),passed);
  if passed then next_status:='verified'; else next_status:='refund_pending'; end if;
 elsif action='dispatch' and o.status='verified' and op then
  if length(trim(coalesce(body->>'awb',''))) not between 3 and 100 then raise exception 'Enter the courier tracking number'; end if;
  insert into public.shipments(order_id,leg,courier,tracking_number) values(o.id,'hub_to_buyer',body->>'courier',body->>'awb');
  next_status:='shipped';
 elsif action='delivered' and o.status='shipped' and (op or uid=o.buyer_id) then
  update public.orders set delivered_at=now(),inspection_deadline_at=now()+interval '48 hours' where id=o.id;
  update public.shipments set delivered_at=now() where order_id=o.id and leg='hub_to_buyer'; next_status:='delivered';
 elsif action='dispute' and o.status='delivered' and uid=o.buyer_id and o.financial_decision is null and now()<o.inspection_deadline_at then
  if length(trim(coalesce(body->>'detail',''))) not between 5 and 10000 then raise exception 'Describe the issue'; end if;
  insert into public.disputes(order_id,opened_by,reason,detail) values(o.id,uid,body->>'reason',body->>'detail'); next_status:='disputed';
 elsif action='return_received' and o.status='disputed' and op then
  update public.disputes set return_received_at=now() where order_id=o.id;
  insert into public.audit_logs(actor_id,action,entity_id) values(uid,action,o.id);
  return o.id;
 elsif action='release' and o.financial_decision is null and (
   (o.status='delivered' and (uid=o.buyer_id or (op and now()>=o.inspection_deadline_at)))
   or (o.status='disputed' and op and uid not in (o.buyer_id,o.seller_id))) then
  if exists(select 1 from public.payment_disputes where order_id=o.id and status<>'won') then raise exception 'Payment dispute blocks release'; end if;
  if not exists(select 1 from public.seller_transfers where order_id=o.id and status='held') then raise exception 'Seller funds are not confirmed held'; end if;
  update public.orders set buyer_accepted_at=case when uid=o.buyer_id then now() else buyer_accepted_at end where id=o.id;
  update public.disputes set resolution='release',resolved_by=uid where order_id=o.id;
  next_status:='release_pending';
 elsif action='refund' and o.status='disputed' and op and o.financial_decision is null then
  if not exists(select 1 from public.disputes where order_id=o.id and return_received_at is not null) then raise exception 'Confirm return receipt before refund'; end if;
  update public.disputes set resolution='refund',resolved_by=uid where order_id=o.id; next_status:='refund_pending';
 elsif action='cancel' and uid=o.buyer_id and o.status='paid' and o.financial_decision is null then next_status:='refund_pending';
 else raise exception 'Action not allowed in the current state' using errcode='42501';
 end if;
 if next_status in ('release_pending','refund_pending') then
  update public.orders set financial_decision=case when next_status='release_pending' then 'release' else 'refund' end where id=o.id;
  insert into public.payment_operations(order_id,kind) values(o.id,case when next_status='release_pending' then 'release' else 'refund' end)
   on conflict(order_id,kind) do update set order_id=excluded.order_id returning id into operation;
  insert into public.outbox_jobs(operation_id) values(operation) on conflict do nothing;
 end if;
 update public.orders set status=next_status where id=o.id;
 insert into public.order_events(order_id,status,actor_id) values(o.id,next_status,uid);
 insert into public.audit_logs(actor_id,action,entity_id) values(uid,action,o.id);
 return o.id;
end $$;

revoke all on function public.new_profile() from public,anon,authenticated;
revoke all on function public.is_operator() from public,anon,authenticated;
revoke all on function public.app_state() from public,anon,authenticated;
revoke all on function public.marketplace_command(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.is_operator() to authenticated;
grant execute on function public.app_state() to anon,authenticated;
grant execute on function public.marketplace_command(text,uuid,jsonb) to authenticated;
commit;
