import { guarded,ok } from '@/lib/api-helpers';
import { createAdminClient } from '@/utils/supabase/admin';
import { checked } from '@/lib/payments/service';
import { verifyHmac } from '@/lib/payments/razorpay';
import { paymentsEnabled } from '@/lib/payments/config';
import { AppError } from '@/lib/errors';
export async function POST(request:Request) {
  return guarded(async()=>{
    if(!paymentsEnabled() || !process.env.RAZORPAY_WEBHOOK_SECRET) throw new AppError('Payment webhooks are not configured.',503);
    const raw=await request.text();
    if(raw.length>262144) throw new AppError('Payload too large.',413);
    if(!verifyHmac(raw,request.headers.get('x-razorpay-signature')||'',process.env.RAZORPAY_WEBHOOK_SECRET)) throw new AppError('Invalid webhook signature.',400);
    const eventId=request.headers.get('x-razorpay-event-id');
    if(!eventId || eventId.length>200) throw new AppError('Missing event ID.');
    let payload;try{payload=JSON.parse(raw);}catch{throw new AppError('Invalid payload.');}
    if(!payload || typeof payload.event!=='string') throw new AppError('Invalid event.');
    await checked(createAdminClient().from('webhook_events').upsert({event_id:eventId,payload},{onConflict:'event_id',ignoreDuplicates:true}));
    return ok({received:true});
  });
}
