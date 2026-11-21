begin;

alter table public.listings add column revision integer not null default 1;
create function public.bump_listing_revision() returns trigger language plpgsql set search_path='' as $$
begin new.revision:=old.revision+1; return new; end $$;
revoke all on function public.bump_listing_revision() from public,anon,authenticated;
create trigger bump_listing_revision before update on public.listings for each row execute function public.bump_listing_revision();

alter function public.marketplace_command(text,uuid,jsonb) rename to marketplace_command_v2;
revoke all on function public.marketplace_command_v2(text,uuid,jsonb) from public,anon,authenticated;
create function public.marketplace_command(action text,entity uuid default null,body jsonb default '{}') returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); l public.listings; result uuid; paths jsonb;
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and account_status='active') then
  raise exception 'Sign in first' using errcode='42501'; end if;
 if body is null or jsonb_typeof(body)<>'object' or length(body::text)>32000 then raise exception 'Invalid command body'; end if;
 if action='submit_kyc' then
  -- Serialize updates with payout activation, which locks this same profile.
  perform 1 from public.profiles where id=uid for update;
  if exists(select 1 from public.seller_accounts where user_id=uid and payouts_enabled) then
   raise exception 'Payouts are active. Bank changes must be completed through payment-provider onboarding.'; end if;
  result:=public.marketplace_command_v2(action,entity,body);
  -- Syntax checks cannot carry an earlier identity verification forward.
  update public.seller_verifications set status='pending',reviewed_by=null,reviewed_at=null,provider_reference=null where user_id=uid;
  return result;
 elsif action='update_listing' then
  select * into l from public.listings where id=entity for update;
  if l.id is null or l.seller_id<>uid then raise exception 'Listing not found or not yours' using errcode='42501'; end if;
  if l.status not in ('pending','live','rejected','withdrawn') or l.mode<>'order' or exists(
   select 1 from public.orders where listing_id=l.id and status not in ('cancelled','refunded','completed')) then
   raise exception 'Reserved, sold or hub-inspected listings cannot be edited'; end if;
  if coalesce((body->>'revision')::integer,0)<>l.revision then raise exception 'This listing changed. Reload it before saving your changes.'; end if;
  if not exists(select 1 from public.seller_verifications where user_id=uid and (status='verified' or details_checked_at is not null)) then
   raise exception 'Complete your seller details first'; end if;
  if length(trim(coalesce(body->>'title',''))) not between 3 and 90 or length(trim(coalesce(body->>'description',''))) not between 5 and 10000
   or length(trim(coalesce(body->>'serial',''))) not between 1 and 100 or length(trim(coalesce(body->>'brand',''))) not between 1 and 100
   or length(trim(coalesce(body->>'city',''))) not between 1 and 100
   or coalesce(body->>'condition','') not in ('likenew','excellent','good','fair')
   or coalesce((body->>'ageMonths')::integer,-1) not between 0 and 240 then raise exception 'Invalid listing details'; end if;
  paths:=body->'imagePaths';
  if paths is null or jsonb_typeof(paths)<>'array' then raise exception 'Upload at least one product photo'; end if;
  if jsonb_array_length(paths) not between 1 and 8 then raise exception 'Upload one to eight product photos'; end if;
  update public.listings set category=body->>'category',price_paise=round((body->>'price')::numeric*100),handover=body->>'handover',
   serial=body->>'serial',status='pending',attributes=(l.attributes-'img') || jsonb_build_object('title',body->>'title','brand',body->>'brand',
   'condition',body->>'condition','description',body->>'description','city',body->>'city','ageMonths',(body->>'ageMonths')::integer,
   'warranty',coalesce(nullif(body->>'warranty',''),'Out of warranty'),'newPrice',coalesce((body->>'newPrice')::numeric,0),
   'invoice',coalesce((body->>'invoice')::boolean,false),'box',coalesce((body->>'box')::boolean,false),'imagePaths',paths) where id=l.id;
  insert into public.audit_logs(actor_id,action,entity_id) values(uid,'update_listing',l.id);
  return l.id;
 end if;
 return public.marketplace_command_v2(action,entity,body);
end $$;
revoke all on function public.marketplace_command(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.marketplace_command(text,uuid,jsonb) to authenticated;

alter function public.app_state() rename to app_state_v2;
revoke all on function public.app_state_v2() from public,anon,authenticated;
create function public.app_state() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare state jsonb:=public.app_state_v2();
begin
 return jsonb_set(state,'{listings}',coalesce((select jsonb_agg(l || jsonb_build_object('revision',
  (select revision from public.listings where id=(l->>'id')::uuid))) from jsonb_array_elements(state->'listings') l),'[]'));
end $$;
revoke all on function public.app_state() from public,anon,authenticated;
grant execute on function public.app_state() to anon,authenticated;
notify pgrst, 'reload schema';
commit;
