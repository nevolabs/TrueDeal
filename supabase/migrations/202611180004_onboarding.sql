begin;
create function public.seller_onboarding_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('status',coalesce((select onboarding_status from public.seller_accounts where user_id=auth.uid()),'not_started'),
  'payoutsEnabled',coalesce((select payouts_enabled from public.seller_accounts where user_id=auth.uid()),false))
$$;
revoke all on function public.seller_onboarding_status() from public,anon,authenticated;
grant execute on function public.seller_onboarding_status() to authenticated;
create function public.activate_seller_account(actor uuid, seller uuid, account text, product text, env text) returns void
language plpgsql security definer set search_path='' as $$
declare existing public.seller_accounts;
begin
 if actor=seller or not exists(select 1 from public.user_roles r join public.profiles p on p.id=r.user_id
  where r.user_id=actor and p.account_status='active' and r.role in ('ops','admin')) then raise exception 'Not authorized' using errcode='42501'; end if;
 perform 1 from public.profiles where id=seller and account_status='active' for update;
 if not found or not exists(select 1 from public.seller_verifications where user_id=seller and status='verified') then raise exception 'Seller review is incomplete'; end if;
 select * into existing from public.seller_accounts where user_id=seller;
 if existing.user_id is not null and (existing.provider_account_id<>account or existing.environment<>env) then raise exception 'Payout destination changes require separate review'; end if;
 insert into public.seller_accounts(user_id,provider_account_id,product_config_id,environment,onboarding_status,payouts_enabled)
  values(seller,account,product,env,'activated',true)
  on conflict(user_id) do update set product_config_id=excluded.product_config_id,onboarding_status='activated',payouts_enabled=true;
 insert into public.audit_logs(actor_id,action,entity_id) values(actor,'seller_account_activated',seller);
end $$;
revoke all on function public.activate_seller_account(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.activate_seller_account(uuid,uuid,text,text,text) to service_role;
notify pgrst, 'reload schema';
commit;
