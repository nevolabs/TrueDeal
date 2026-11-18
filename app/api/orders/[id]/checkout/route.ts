import { guarded,ok } from '@/lib/api-helpers';
import { requireUser } from '@/lib/session';
import { assertSameOrigin } from '@/lib/validation';
import { createCheckout } from '@/lib/payments/service';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  return guarded(async()=>{assertSameOrigin(request);const me=await requireUser();return ok(await createCheckout((await params).id,me.id));});
}
