import { guarded,ok } from '@/lib/api-helpers';
import { requireUser } from '@/lib/session';
import { assertSameOrigin,jsonBody,text } from '@/lib/validation';
import { createAdminClient } from '@/utils/supabase/admin';
import { checked } from '@/lib/payments/service';
import { razorpay,paymentEnvironment } from '@/lib/payments/razorpay';
import { AppError } from '@/lib/errors';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  return guarded(async()=>{
    const me=await requireUser();
    const {data,error}=await (await createClient()).rpc('seller_onboarding_status');
    if(error) throw new AppError('Seller onboarding setup is incomplete.',503);
    return ok({userId:me.id,onboarding:data});
  });
}
// For the first release, sellers are onboarded through Razorpay's dashboard.
// An operator binds a provider-verified account; the seller cannot supply an
// arbitrary destination or self-activate payouts.
export async function POST(request:Request) {
  return guarded(async()=>{
    assertSameOrigin(request);const me=await requireUser();
    if(me.role!=='ops') throw new AppError('An operator must verify the linked account.',403);
    const body=await jsonBody(request);const sellerId=text(body.sellerId,'seller');
    if(sellerId===me.id) throw new AppError('Another operator must review your account.',403);
    const accountId=text(body.accountId,'linked account');const productId=text(body.productId,'Route product');
    if(!/^acc_[a-zA-Z0-9]+$/.test(accountId) || !/^acc_prd_[a-zA-Z0-9]+$/.test(productId)) throw new AppError('Invalid provider identifiers.');
    const db=createAdminClient();
    const account=await razorpay<{id:string;email:string}>('/accounts/'+accountId);
    const product=await razorpay<{id:string;product_name:string;activation_status:string}>('/accounts/'+accountId+'/products/'+productId);
    const {data,error}=await db.auth.admin.getUserById(sellerId);
    if(error || !data.user || account.email.toLowerCase()!==data.user.email?.toLowerCase() || product.product_name!=='route' || product.activation_status!=='activated') throw new AppError('The account must match the seller and have an activated Route product.',409);
    const verification=await checked(db.from('seller_verifications').select('status').eq('user_id',sellerId).single());
    if(verification?.status!=='verified') throw new AppError('Complete the seller review first.',409);
    const existing=await checked(db.from('seller_accounts').select('provider_account_id').eq('user_id',sellerId).maybeSingle());
    if(existing && existing.provider_account_id!==accountId) throw new AppError('Existing payout destinations require a separate account-change review.',409);
    await checked(db.rpc('activate_seller_account',{actor:me.id,seller:sellerId,account:accountId,product:productId,env:paymentEnvironment()}));
    return ok({done:true});
  });
}
