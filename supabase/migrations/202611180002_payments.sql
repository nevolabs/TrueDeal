begin;
-- Trusted provider functions: only the server credential can execute these.
create function public.checkout_claim(oid uuid, actor uuid, env text) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders; s public.order_snapshots; a public.seller_accounts; p public.payment_attempts;
begin
 select * into o from public.orders where id=oid for update;
 if o.buyer_id is distinct from actor or not exists(select 1 from public.profiles where id=actor and account_status='active') then raise exception 'Not authorized' using errcode='42501'; end if;
 if o.status<>'awaiting_payment' or now()>=o.reservation_expires_at then raise exception 'Reservation expired or payment already processed'; end if;
 select * into s from public.order_snapshots where order_id=oid;
 select * into a from public.seller_accounts where user_id=o.seller_id and environment=env and payouts_enabled;
 if a.user_id is null then raise exception 'Seller is not enabled for payments'; end if;
 select * into p from public.payment_attempts where order_id=oid;
 if p.id is null then
  insert into public.payment_attempts(order_id,environment,amount_paise,status) values(oid,env,s.total_paise,'creating') returning * into p;
 elsif p.provider_order_id is null then raise exception 'Checkout creation needs reconciliation. Do not retry payment creation.';
 end if;
 return jsonb_build_object('order',to_jsonb(o),'snapshot',to_jsonb(s),'account',a.provider_account_id,'attempt',to_jsonb(p));
end $$;

create function public.record_capture(oid uuid, provider_order text, payment text, amount bigint, transfer text, transfer_amount bigint, recipient text, env text) returns void
language plpgsql security definer set search_path='' as $$
declare o public.orders; p public.payment_attempts; s public.order_snapshots; tx uuid; next_status text;
begin
 select * into o from public.orders where id=oid for update;
 select * into p from public.payment_attempts where order_id=oid for update;
 select * into s from public.order_snapshots where order_id=oid;
 if o.id is null or p.provider_order_id is distinct from provider_order or p.environment is distinct from env
  or amount is distinct from s.total_paise or transfer_amount is distinct from s.seller_due_paise
  or not exists(select 1 from public.seller_accounts where user_id=o.seller_id and environment=env and provider_account_id=recipient)
  then raise exception 'Payment verification mismatch'; end if;
 if p.status='captured' then
  if p.provider_payment_id is distinct from payment then raise exception 'Unexpected second captured payment'; end if;
  return;
 end if;
 if o.status not in ('awaiting_payment','payment_review') then raise exception 'Captured payment needs manual reconciliation'; end if;
 update public.payment_attempts set status='captured',provider_payment_id=payment,captured_at=now() where id=p.id;
 insert into public.seller_transfers(order_id,provider_transfer_id,amount_paise,status) values(oid,transfer,transfer_amount,'held');
 next_status:=case when s.handover='hub' then 'verified' else 'paid' end;
 update public.orders set status=next_status where id=oid;
 insert into public.order_events(order_id,status,note) values(oid,next_status,'Captured payment and held seller allocation verified.');
 insert into public.ledger_transactions(order_id,event_key) values(oid,'capture:'||payment) returning id into tx;
 insert into public.ledger_entries(transaction_id,account,signed_amount_paise) values(tx,'gateway_clearing',amount),(tx,'buyer_funds',-amount);
end $$;

create function public.authorize_due_releases() returns integer language plpgsql security definer set search_path='' as $$
declare o public.orders; operation uuid; n integer:=0;
begin
 for o in select * from public.orders where status='delivered' and financial_decision is null and inspection_deadline_at<=now() for update skip locked loop
  if exists(select 1 from public.disputes where order_id=o.id and resolution is null)
   or exists(select 1 from public.payment_disputes where order_id=o.id and status<>'won')
   or not exists(select 1 from public.seller_transfers where order_id=o.id and status='held') then continue; end if;
  update public.orders set status='release_pending',financial_decision='release' where id=o.id;
  insert into public.payment_operations(order_id,kind) values(o.id,'release') on conflict(order_id,kind) do update set order_id=excluded.order_id returning id into operation;
  insert into public.outbox_jobs(operation_id) values(operation) on conflict do nothing;
  insert into public.order_events(order_id,status,note) values(o.id,'release_pending','Inspection window expired without an open claim.'); n:=n+1;
 end loop;
 -- An untouched reservation can be freed safely: no provider order was created.
 for o in select * from public.orders where status='awaiting_payment' and reservation_expires_at<=now()
  and not exists(select 1 from public.payment_attempts where order_id=public.orders.id) for update skip locked loop
  update public.orders set status='cancelled' where id=o.id;
  update public.listings set status='live' where id=o.listing_id;
  insert into public.order_events(order_id,status,note) values(o.id,'cancelled','Unpaid reservation expired before checkout was created.');
 end loop;
 return n;
end $$;

create function public.claim_payment_jobs() returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.outbox_jobs; result jsonb:='[]';
begin
 for j in select * from public.outbox_jobs where (status='pending' and run_after<=now())
  or (status='processing' and lease_until<now()) order by run_after for update skip locked limit 10 loop
  update public.outbox_jobs set status='processing',lease_until=now()+interval '5 minutes',attempts=attempts+1 where id=j.id;
  result:=result || jsonb_build_array(jsonb_build_object('job',to_jsonb(j),
   'operation',(select to_jsonb(p) from public.payment_operations p where p.id=j.operation_id)));
 end loop;
 return result;
end $$;

create function public.record_refund(oid uuid, provider_refund text, amount bigint, reversed boolean) returns void
language plpgsql security definer set search_path='' as $$
declare o public.orders; s public.order_snapshots; tx uuid;
begin
 select * into o from public.orders where id=oid for update;
 select * into s from public.order_snapshots where order_id=oid;
 if o.financial_decision is distinct from 'refund' or amount is distinct from s.total_paise or not reversed then raise exception 'Refund not reconciled'; end if;
 if o.status='refunded' then return; end if;
 if o.status<>'refund_pending' then raise exception 'Invalid refund state'; end if;
 insert into public.refunds(order_id,provider_refund_id,amount_paise,status,reason) values(oid,provider_refund,amount,'processed','Approved refund')
  on conflict(order_id) do update set provider_refund_id=excluded.provider_refund_id,status='processed';
 update public.seller_transfers set status='reversed',updated_at=now() where order_id=oid;
 update public.orders set status='refunded' where id=oid;
 update public.listings set status=case when exists(select 1 from public.inspections where order_id=oid and not passed)
  or exists(select 1 from public.disputes where order_id=oid) then 'rejected' else 'live' end where id=o.listing_id;
 insert into public.order_events(order_id,status,note) values(oid,'refunded','Customer refund processed and seller transfer reversal confirmed.');
 insert into public.ledger_transactions(order_id,event_key) values(oid,'refund:'||provider_refund) returning id into tx;
 insert into public.ledger_entries(transaction_id,account,signed_amount_paise) values(tx,'buyer_funds',amount),(tx,'gateway_clearing',-amount);
end $$;

create function public.record_settlement(oid uuid, transfer text, settlement text) returns void
language plpgsql security definer set search_path='' as $$
declare o public.orders; s public.order_snapshots; tx uuid;
begin
 select * into o from public.orders where id=oid for update;
 select * into s from public.order_snapshots where order_id=oid;
 if o.financial_decision is distinct from 'release' or not exists(select 1 from public.seller_transfers where order_id=oid and provider_transfer_id=transfer) then raise exception 'Unexpected settlement'; end if;
 if o.status='completed' then return; end if;
 if o.status<>'release_pending' then raise exception 'Unexpected settlement state'; end if;
 update public.seller_transfers set status='settled',provider_settlement_id=settlement,updated_at=now() where order_id=oid;
 update public.orders set status='completed' where id=oid;
 update public.listings set status='sold' where id=o.listing_id;
 insert into public.order_events(order_id,status,note) values(oid,'completed','Provider confirmed seller settlement.');
 insert into public.ledger_transactions(order_id,event_key) values(oid,'settlement:'||transfer) returning id into tx;
 insert into public.ledger_entries(transaction_id,account,signed_amount_paise) values
  (tx,'buyer_funds',s.total_paise),(tx,'gateway_clearing',-s.seller_due_paise),(tx,'platform_retained',-(s.total_paise-s.seller_due_paise));
end $$;

-- Database-level balanced journal invariant, checked at transaction commit.
create function public.assert_balanced() returns trigger language plpgsql set search_path='' as $$
begin
 if (select coalesce(sum(signed_amount_paise),0) from public.ledger_entries where transaction_id=new.transaction_id)<>0 then raise exception 'Unbalanced journal'; end if;
 return new;
end $$;
create constraint trigger balanced_journal after insert or update on public.ledger_entries deferrable initially deferred for each row execute function public.assert_balanced();

revoke all on function public.checkout_claim(uuid,uuid,text),public.record_capture(uuid,text,text,bigint,text,bigint,text,text),
 public.authorize_due_releases(),public.claim_payment_jobs(),public.record_refund(uuid,text,bigint,boolean),public.record_settlement(uuid,text,text),public.assert_balanced() from public,anon,authenticated;
grant execute on function public.checkout_claim(uuid,uuid,text),public.record_capture(uuid,text,text,bigint,text,bigint,text,text),
 public.authorize_due_releases(),public.claim_payment_jobs(),public.record_refund(uuid,text,bigint,boolean),public.record_settlement(uuid,text,text) to service_role;
commit;
