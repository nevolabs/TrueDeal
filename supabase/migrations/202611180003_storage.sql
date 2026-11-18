begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('listing-photos','listing-photos',true,5242880,array['image/jpeg','image/png','image/webp']),
 ('order-evidence','order-evidence',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do nothing;
create policy upload_own_listing_photo on storage.objects for insert to authenticated
 with check(bucket_id='listing-photos' and (storage.foldername(name))[1]=auth.uid()::text
  and exists(select 1 from public.profiles where id=auth.uid() and account_status='active'));
-- Listing photos are public. Order evidence is never public and is immutable.
create policy read_own_photo on storage.objects for select to authenticated
 using(bucket_id='listing-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create function public.can_access_order(oid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.orders where id=oid and (auth.uid() in (buyer_id,seller_id) or public.is_operator()))
  and exists(select 1 from public.profiles where id=auth.uid() and account_status='active')
$$;
revoke all on function public.can_access_order(uuid) from public,anon,authenticated;
grant execute on function public.can_access_order(uuid) to authenticated;
create policy upload_order_evidence on storage.objects for insert to authenticated
 with check(bucket_id='order-evidence' and (storage.foldername(name))[2]=auth.uid()::text
  and public.can_access_order(((storage.foldername(name))[1])::uuid));
create policy read_order_evidence on storage.objects for select to authenticated
 using(bucket_id='order-evidence' and public.can_access_order(((storage.foldername(name))[1])::uuid));
create table public.order_evidence (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
 submitted_by uuid not null references public.profiles(id), storage_path text not null unique,
 created_at timestamptz not null default now()
);
alter table public.order_evidence enable row level security;
revoke all on public.order_evidence from public,anon,authenticated;
grant select,insert on public.order_evidence to authenticated;
grant all on public.order_evidence to service_role;
create policy read_evidence_records on public.order_evidence for select to authenticated using(public.can_access_order(order_id));
create policy submit_evidence_record on public.order_evidence for insert to authenticated
 with check(submitted_by=auth.uid() and public.can_access_order(order_id)
  and storage_path like order_id::text||'/'||auth.uid()::text||'/%');
commit;
