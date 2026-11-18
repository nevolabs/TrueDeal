import { guarded,ok } from '@/lib/api-helpers';
import { requireUser } from '@/lib/session';
import { assertSameOrigin,jsonBody,text } from '@/lib/validation';
import { createAdminClient } from '@/utils/supabase/admin';
import { checked,reconcileOrder } from '@/lib/payments/service';
import { verifyHmac } from '@/lib/payments/razorpay';
import { AppError } from '@/lib/errors';
export async function POST(request:Request) {
  return guarded(async()=>{
    assertSameOrigin(request);const me=await requireUser();const body=await jsonBody(request);
    const orderId=text(body.orderId,'order');const payment=text(body.razorpay_payment_id,'payment');
    const db=createAdminClient();
    const order=await checked(db.from('orders').select('buyer_id').eq('id',orderId).single());
    if(!order || order.buyer_id!==me.id) throw new AppError('Not authorized.',403);
    const attempt=await checked(db.from('payment_attempts').select('provider_order_id').eq('order_id',orderId).single());
    if(!attempt || body.razorpay_order_id!==attempt.provider_order_id || !process.env.RAZORPAY_KEY_SECRET ||
      !verifyHmac(attempt.provider_order_id+'|'+payment,text(body.razorpay_signature,'signature'),process.env.RAZORPAY_KEY_SECRET)) throw new AppError('Invalid payment signature.',400);
    await reconcileOrder(orderId,payment);return ok({done:true});
  });
}
