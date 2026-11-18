import { timingSafeEqual } from 'node:crypto';
import { guarded,ok } from '@/lib/api-helpers';
import { processPaymentJobs } from '@/lib/payments/service';
import { paymentsEnabled } from '@/lib/payments/config';
import { AppError } from '@/lib/errors';
export async function POST(request:Request) {
  return guarded(async()=>{
    const expected=process.env.CRON_SECRET;
    const actual=request.headers.get('authorization')?.replace(/^Bearer /,'');
    if(!expected || expected.length<32 || !actual || Buffer.byteLength(actual)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(actual),Buffer.from(expected))) throw new AppError('Not authorized.',401);
    if(!paymentsEnabled()) throw new AppError('Payments are disabled.',503);
    return ok(await processPaymentJobs());
  });
}
