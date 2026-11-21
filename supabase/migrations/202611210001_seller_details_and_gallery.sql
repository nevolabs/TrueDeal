begin;

-- Basic syntax checks are separate from identity verification and payouts.
-- Full PAN/account numbers are validated transiently and never retained.
alter table public.seller_verifications
 add column details_checked_at timestamptz,
 add column pan_last4 text,
 add column bank_last4 text,
 add column ifsc text;

alter function public.marketplace_command(text,uuid,jsonb) rename to marketplace_command_legacy;
revoke all on function public.marketplace_command_legacy(text,uuid,jsonb) from public,anon,authenticated;

create function public.marketplace_command(action text,entity uuid default null,body jsonb default '{}') returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); oid uuid; legal text; holder text; pan text; acct text; confirmation text; code text; paths jsonb;
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and account_status='active') then
  raise exception 'Sign in first' using errcode='42501'; end if;
 if body is null or jsonb_typeof(body)<>'object' or length(body::text)>32000 then raise exception 'Invalid command body'; end if;
 if action='submit_kyc' then
  legal:=regexp_replace(trim(coalesce(body->>'legalName','')),'\s+',' ','g');
  holder:=regexp_replace(trim(coalesce(body->>'accountHolder','')),'\s+',' ','g');
  pan:=upper(trim(coalesce(body->>'pan',''))); code:=upper(trim(coalesce(body->>'ifsc','')));
  acct:=trim(coalesce(body->>'accountNumber','')); confirmation:=trim(coalesce(body->>'confirmAccountNumber',''));
  if length(legal) not between 2 and 100 or legal !~ '^[[:alpha:] .''-]+$' then raise exception 'Enter your full legal name'; end if;
  if pan !~ '^[A-Z]{3}P[A-Z][0-9]{4}[A-Z]$' or substring(pan,6,4)='0000' then raise exception 'Enter a valid individual PAN format'; end if;
  if acct !~ '^[0-9]{9,18}$' or acct ~ '^([0-9])\1+$' then raise exception 'Enter a bank account number with 9–18 digits'; end if;
  if acct<>confirmation then raise exception 'The account numbers do not match'; end if;
  if code !~ '^[A-Z]{4}0[A-Z0-9]{6}$' then raise exception 'Enter a valid IFSC format'; end if;
  if lower(legal)<>lower(holder) then raise exception 'The account holder name must match your legal name'; end if;
  insert into public.seller_verifications(user_id,legal_name,details_checked_at,pan_last4,bank_last4,ifsc)
   values(uid,legal,now(),right(pan,4),right(acct,4),code)
   on conflict(user_id) do update set legal_name=excluded.legal_name,details_checked_at=excluded.details_checked_at,
    pan_last4=excluded.pan_last4,bank_last4=excluded.bank_last4,ifsc=excluded.ifsc;
  return uid;
 elsif action='create_listing' then
  if not exists(select 1 from public.seller_verifications where user_id=uid and (status='verified' or details_checked_at is not null)) then
   raise exception 'Complete your seller details first'; end if;
  if length(trim(coalesce(body->>'title',''))) not between 3 and 90 or length(trim(coalesce(body->>'description',''))) not between 5 and 10000
   or length(trim(coalesce(body->>'serial',''))) not between 1 and 100 or length(trim(coalesce(body->>'brand',''))) not between 1 and 100
   or length(trim(coalesce(body->>'city',''))) not between 1 and 100
   or coalesce(body->>'condition','') not in ('likenew','excellent','good','fair')
   or coalesce((body->>'ageMonths')::integer,-1) not between 0 and 240 then raise exception 'Invalid listing details'; end if;
  paths:=body->'imagePaths';
  -- Compatibility for the old single-photo caller; all new clients send paths.
  if paths is null and coalesce(body->>'img','')<>'' then
   paths:=jsonb_build_array(substring(body->>'img' from '^https?://[^/?#]+/storage/v1/object/public/listing-photos/([^?#]+)$'));
  end if;
  if paths is null or jsonb_typeof(paths)<>'array' then raise exception 'Upload at least one product photo'; end if;
  if jsonb_array_length(paths) not between 1 and 8 then raise exception 'Upload one to eight product photos'; end if;
  insert into public.listings(seller_id,category,price_paise,handover,serial,attributes)
   values(uid,body->>'category',round((body->>'price')::numeric*100),body->>'handover',body->>'serial',
    jsonb_build_object('title',body->>'title','brand',body->>'brand','condition',body->>'condition',
     'description',body->>'description','city',body->>'city','ageMonths',(body->>'ageMonths')::integer,
     'warranty',coalesce(nullif(body->>'warranty',''),'Out of warranty'),'newPrice',coalesce((body->>'newPrice')::numeric,0),
     'invoice',coalesce((body->>'invoice')::boolean,false),'box',coalesce((body->>'box')::boolean,false),'imagePaths',paths,'specs','[]'::jsonb)) returning id into oid;
  return oid;
 end if;
 return public.marketplace_command_legacy(action,entity,body);
end $$;
revoke all on function public.marketplace_command(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.marketplace_command(text,uuid,jsonb) to authenticated;

create or replace function public.sync_listing_photo() returns trigger
language plpgsql security definer set search_path='' as $$
declare paths jsonb:=new.attributes->'imagePaths'; object_path text; entry jsonb; position integer:=0;
begin
 if paths is null then
  if coalesce(new.attributes->>'img','')='' then
   delete from public.listing_media where listing_id=new.id;
   return new;
  end if;
  paths:=jsonb_build_array(substring(new.attributes->>'img' from '^https?://[^/?#]+/storage/v1/object/public/listing-photos/([^?#]+)$'));
 end if;
 if jsonb_typeof(paths)<>'array' then raise exception 'Invalid product photos'; end if;
 if jsonb_array_length(paths) not between 1 and 8 or
  (select count(distinct value) from jsonb_array_elements(paths))<>jsonb_array_length(paths) then raise exception 'Upload one to eight different product photos'; end if;
 delete from public.listing_media where listing_id=new.id;
 for entry in select value from jsonb_array_elements(paths) loop
  object_path:=entry #>> '{}';
  if jsonb_typeof(entry)<>'string' or object_path is null or object_path !~ ('^'||new.seller_id::text||'/[a-f0-9-]+\.(jpg|png|webp)$') then
   raise exception 'Use a photo uploaded to this seller account' using errcode='23514'; end if;
  if not exists(select 1 from storage.objects where bucket_id='listing-photos' and name=object_path) then
   raise exception 'Upload the listing photo first' using errcode='23514'; end if;
  insert into public.listing_media(listing_id,storage_path,sort_order) values(new.id,object_path,position);
  position:=position+1;
 end loop;
 return new;
end $$;

alter function public.app_state() rename to app_state_legacy;
revoke all on function public.app_state_legacy() from public,anon,authenticated;
create function public.app_state() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare state jsonb:=public.app_state_legacy();
begin
 state:=jsonb_set(state,'{users}',coalesce((select jsonb_agg(u || jsonb_build_object('kyc',u->'kyc' || jsonb_build_object(
  'basicStatus',case when exists(select 1 from public.seller_verifications v where v.user_id=(u->>'id')::uuid and v.details_checked_at is not null) then 'checked' else 'not_started' end))) from jsonb_array_elements(state->'users') u),'[]'));
 return jsonb_set(state,'{listings}',coalesce((select jsonb_agg((l-'imagePaths') || jsonb_build_object('imagePaths',coalesce(
  (select jsonb_agg(m.storage_path order by m.sort_order) from public.listing_media m where m.listing_id=(l->>'id')::uuid),'[]'::jsonb))) from jsonb_array_elements(state->'listings') l),'[]'));
end $$;
revoke all on function public.app_state() from public,anon,authenticated;
grant execute on function public.app_state() to anon,authenticated;
notify pgrst, 'reload schema';
commit;
