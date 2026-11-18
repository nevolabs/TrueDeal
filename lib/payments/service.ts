import { createAdminClient } from '@/utils/supabase/admin';
import { AppError, databaseError } from '../errors';
import { razorpay,paymentEnvironment, type ProviderOrder,type ProviderPayment,type ProviderTransfer,type ProviderRefund } from './razorpay';

export async function checked<T>(query:PromiseLike<{data:T;error:{code?:string;message:string}|null}>):Promise<T> {
  const result=await query;
  if(result.error) databaseError(result.error);
  return result.data;
}

interface CheckoutClaim {
  order:{id:string}; snapshot:{total_paise:number;seller_due_paise:number}; account:string;
  attempt:{id:string;provider_order_id:string|null};
}
export async function createCheckout(orderId:string,buyerId:string) {
  const db=createAdminClient();
  const claim=await checked(db.rpc('checkout_claim',{oid:orderId,actor:buyerId,env:paymentEnvironment()})) as CheckoutClaim;
  let providerOrder=claim.attempt.provider_order_id;
  if(!providerOrder) {
    try {
      const order=await razorpay<ProviderOrder>('/orders','POST',{
        amount:Number(claim.snapshot.total_paise),currency:'INR',receipt:'td'+orderId.replaceAll('-',''),
        notes:{app_order_id:orderId},
        transfers:[{account:claim.account,amount:Number(claim.snapshot.seller_due_paise),currency:'INR',on_hold:true,notes:{app_order_id:orderId}}],
      });
      if(order.amount!==Number(claim.snapshot.total_paise) || order.currency!=='INR') throw new Error('Unexpected provider order');
      providerOrder=order.id;
      await checked(db.from('payment_attempts').update({provider_order_id:providerOrder,status:'created'}).eq('id',claim.attempt.id));
    } catch(error) {
      await checked(db.from('payment_attempts').update({status:'unknown'}).eq('id',claim.attempt.id));
      throw error;
    }
  }
  return {key:process.env.RAZORPAY_KEY_ID,orderId:providerOrder,amount:Number(claim.snapshot.total_paise),currency:'INR',appOrderId:orderId,testMode:paymentEnvironment()==='test'};
}

export async function reconcileOrder(orderId:string,paymentId?:string) {
  const db=createAdminClient();
  const attempt=await checked(db.from('payment_attempts').select('*').eq('order_id',orderId).single());
  if(!attempt.provider_order_id) throw new AppError('Checkout has an unknown provider outcome; manual reconciliation is required.',409);
  if(attempt.environment!==paymentEnvironment()) throw new AppError('Payment environment mismatch.',409);
  const payments=await razorpay<{items:ProviderPayment[]}>('/orders/'+encodeURIComponent(attempt.provider_order_id)+'/payments');
  const captured=payments.items.filter(p=>p.status==='captured' || (attempt.status==='captured' && p.status==='refunded'));
  if(captured.length!==1) throw new AppError(captured.length?'Multiple captured payments require review.':'Payment capture is not confirmed yet.',409);
  const payment=captured[0];
  if((paymentId && payment.id!==paymentId) || (attempt.status==='captured' && attempt.provider_payment_id!==payment.id) || payment.order_id!==attempt.provider_order_id || payment.amount!==Number(attempt.amount_paise) || payment.currency!=='INR') throw new AppError('Payment details do not match the order.',409);
  const transfers=await razorpay<{items:ProviderTransfer[]}>('/orders/'+encodeURIComponent(attempt.provider_order_id)+'/transfers');
  const snapshot=await checked(db.from('order_snapshots').select('*').eq('order_id',orderId).single());
  const order=await checked(db.from('orders').select('*').eq('id',orderId).single());
  const account=await checked(db.from('seller_accounts').select('*').eq('user_id',order.seller_id).single());
  if(transfers.items.length!==1) throw new AppError('Seller allocation is not confirmed yet.',409);
  const transfer=transfers.items[0];
  if(transfer.recipient!==account.provider_account_id || transfer.amount!==Number(snapshot.seller_due_paise) || transfer.currency!=='INR' || ![payment.id,attempt.provider_order_id].includes(transfer.source)) throw new AppError('Seller transfer requires review.',409);
  if(attempt.status!=='captured') {
    if(transfer.status!=='processed' || !transfer.on_hold || transfer.settlement_status!=='on_hold') throw new AppError('Seller settlement is not confirmed held.',409);
    await checked(db.rpc('record_capture',{oid:orderId,provider_order:payment.order_id,payment:payment.id,amount:payment.amount,
      transfer:transfer.id,transfer_amount:transfer.amount,recipient:transfer.recipient,env:paymentEnvironment()}));
  }
  if(transfer.settlement_status==='settled' && transfer.recipient_settlement_id) {
    await checked(db.rpc('record_settlement',{oid:orderId,transfer:transfer.id,settlement:transfer.recipient_settlement_id}));
  }
  return {orderId,payment,transfer,snapshot,order};
}

export async function processPaymentJobs() {
  const db=createAdminClient();
  const summary={webhooks:0,reconciled:0,processed:0,needsReview:0};
  await checked(db.rpc('authorize_due_releases'));
  const events=await checked(db.from('webhook_events').select('*').eq('status','pending').order('received_at').limit(25));
  for(const event of events || []) {
    try {
      const payload=event.payload;
      const entity=payload.payload?.payment?.entity;
      const transfer=payload.payload?.transfer?.entity;
      const dispute=payload.payload?.dispute?.entity;
      const refund=payload.payload?.refund?.entity;
      const providerPayment=entity?.id || dispute?.payment_id || refund?.payment_id || (transfer?.source?.startsWith('pay_')?transfer.source:undefined);
      const providerOrder=entity?.order_id || (transfer?.source?.startsWith('order_')?transfer.source:undefined);
      let query=db.from('payment_attempts').select('order_id');
      if(providerOrder) query=query.eq('provider_order_id',providerOrder);
      else if(providerPayment) query=query.eq('provider_payment_id',providerPayment);
      else { await checked(db.from('webhook_events').update({status:'ignored',processed_at:new Date().toISOString()}).eq('event_id',event.event_id)); continue; }
      const attempt=await checked(query.maybeSingle());
      if(!attempt) throw new Error('Provider event has no matching payment yet');
      if(dispute?.id) {
        await checked(db.from('payment_disputes').upsert({provider_dispute_id:dispute.id,order_id:attempt.order_id,
          status:payload.event==='payment.dispute.won'?'won':payload.event==='payment.dispute.closed'?'closed':'open'}));
      }
      await reconcileOrder(attempt.order_id);
      await checked(db.from('webhook_events').update({status:'processed',processed_at:new Date().toISOString(),last_error:null}).eq('event_id',event.event_id));
      summary.webhooks++;
    } catch {
      const attempts=event.attempts+1;
      await checked(db.from('webhook_events').update({attempts,last_error:'Provider reconciliation pending',status:attempts>=20?'manual_review':'pending'}).eq('event_id',event.event_id));
    }
  }
  const pending=await checked(db.from('payment_attempts').select('id,order_id').lte('next_reconcile_at',new Date().toISOString()).order('next_reconcile_at').limit(50));
  for(const attempt of pending || []) {
    try {await reconcileOrder(attempt.order_id);summary.reconciled++;}catch{/* Keep the financial state unchanged until confirmed. */}
    await checked(db.from('payment_attempts').update({next_reconcile_at:new Date(Date.now()+300000).toISOString()}).eq('id',attempt.id));
  }
  const jobs=await checked(db.rpc('claim_payment_jobs')) as {job:{id:string};operation:{id:string;order_id:string;kind:string;status:string}}[];
  for(const {job,operation} of jobs) {
    try {
      const result=await reconcileOrder(operation.order_id);
      const previousStatus=operation.status;
      if(operation.kind==='release') {
        const disputes=await checked(db.from('payment_disputes').select('status').eq('order_id',operation.order_id));
        if(disputes?.some(d=>d.status!=='won')) throw new Error('Payment dispute blocks release');
        if(result.order.financial_decision!=='release') throw new Error('Release was not authorized');
        if(result.transfer.settlement_status!=='settled') {
          // Setting on_hold=false is repeatable; it does not create a new transfer.
          await razorpay('/transfers/'+encodeURIComponent(result.transfer.id),'PATCH',{on_hold:false});
          await checked(db.from('seller_transfers').update({status:'release_authorized'}).eq('order_id',operation.order_id));
        }
      } else if(operation.kind==='refund') {
        if(result.order.financial_decision!=='refund') throw new Error('Refund was not authorized');
        const all=await razorpay<{items:ProviderRefund[]}>('/payments/'+encodeURIComponent(result.payment.id)+'/refunds');
        let refund=all.items.find(r=>r.notes?.operation_id===operation.id);
        if(!refund) {
          // Never blindly retry a POST whose outcome may be unknown.
          if(previousStatus!=='pending' || all.items.length) throw new Error('Refund needs manual reconciliation');
          await checked(db.from('payment_operations').update({status:'processing'}).eq('id',operation.id));
          refund=await razorpay<ProviderRefund>('/payments/'+encodeURIComponent(result.payment.id)+'/refund','POST',{
            amount:Number(result.snapshot.total_paise),reverse_all:true,notes:{operation_id:operation.id},
          });
          await checked(db.from('refunds').upsert({order_id:operation.order_id,provider_refund_id:refund.id,amount_paise:refund.amount,status:'pending',reason:'Approved refund'},{onConflict:'order_id'}));
        }
        const updated=await razorpay<ProviderRefund>('/payments/'+encodeURIComponent(result.payment.id)+'/refunds/'+encodeURIComponent(refund.id));
        const transfer=await razorpay<ProviderTransfer>('/transfers/'+encodeURIComponent(result.transfer.id));
        if(updated.status!=='processed' || updated.payment_id!==result.payment.id || updated.amount!==Number(result.snapshot.total_paise) || transfer.amount_reversed!==transfer.amount) {
          await checked(db.from('payment_operations').update({status:'unknown'}).eq('id',operation.id));
          await checked(db.from('outbox_jobs').update({status:'pending',run_after:new Date(Date.now()+60000).toISOString()}).eq('id',job.id));
          continue;
        }
        await checked(db.rpc('record_refund',{oid:operation.order_id,provider_refund:updated.id,amount:updated.amount,reversed:true}));
      } else throw new Error('Unsupported payment job');
      await checked(db.from('payment_operations').update({status:'done',last_error:null}).eq('id',operation.id));
      await checked(db.from('outbox_jobs').update({status:'done',lease_until:null}).eq('id',job.id));
      summary.processed++;
    } catch {
      await checked(db.from('payment_operations').update({status:'unknown',last_error:'Provider outcome requires reconciliation'}).eq('id',operation.id));
      await checked(db.from('outbox_jobs').update({status:'manual_review',lease_until:null}).eq('id',job.id));
      summary.needsReview++;
    }
  }
  return summary;
}
