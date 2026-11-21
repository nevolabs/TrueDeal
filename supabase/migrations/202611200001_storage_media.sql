begin;

-- Deployment-managed public branding. Browser users have no write policy.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('site-assets','site-assets',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create unique index listing_media_position on public.listing_media(listing_id,sort_order);

-- Enforce ownership/existence even when callers invoke marketplace_command
-- directly instead of going through the Next.js request validator.
create function public.sync_listing_photo() returns trigger
language plpgsql security definer set search_path='' as $$
declare photo text:=coalesce(new.attributes->>'img',''); object_path text;
begin
 if photo='' then
  delete from public.listing_media where listing_id=new.id and sort_order=0;
  return new;
 end if;
 object_path:=substring(photo from '^https?://[^/?#]+/storage/v1/object/public/listing-photos/([^?#]+)$');
 if object_path is null or object_path !~ ('^'||new.seller_id::text||'/[a-f0-9-]+\.(jpg|png|webp)$') then
  raise exception 'Use a photo uploaded to this seller account' using errcode='23514';
 end if;
 if not exists(select 1 from storage.objects where bucket_id='listing-photos' and name=object_path) then
  raise exception 'Upload the listing photo first' using errcode='23514';
 end if;
 insert into public.listing_media(listing_id,storage_path,sort_order) values(new.id,object_path,0)
 on conflict(listing_id,sort_order) do update set storage_path=excluded.storage_path;
 return new;
end $$;
revoke all on function public.sync_listing_photo() from public,anon,authenticated;
create trigger sync_listing_photo after insert or update of attributes,seller_id on public.listings
for each row execute function public.sync_listing_photo();

-- Backfill existing valid Storage references without modifying the listings.
-- Local prototype paths are migrated by the explicit catalogue import script.
insert into public.listing_media(listing_id,storage_path,sort_order)
select l.id,photo.object_path,0 from public.listings l
cross join lateral (select substring(l.attributes->>'img' from '^https?://[^/?#]+/storage/v1/object/public/listing-photos/([^?#]+)$') as object_path) photo
where photo.object_path ~ ('^'||l.seller_id::text||'/[a-f0-9-]+\.(jpg|png|webp)$')
 and exists(select 1 from storage.objects s where s.bucket_id='listing-photos' and s.name=photo.object_path)
on conflict(listing_id,sort_order) do nothing;

-- Read-model definition follows. Image URLs are resolved from imagePath by
-- the server using the configured project; legacy attributes.img is ignored.

create or replace function public.app_state() returns jsonb language plpgsql stable security definer set search_path='' as $$
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
  'listings',coalesce((select jsonb_agg((l.attributes - 'img') || jsonb_build_object('id',l.id,'sellerId',l.seller_id,
   'imagePath',(select m.storage_path from public.listing_media m where m.listing_id=l.id and m.sort_order=0),'category',l.category,'price',l.price_paise/100.0,'status',l.status,'mode',l.mode,'handover',l.handover,
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

notify pgrst, 'reload schema';
commit;
