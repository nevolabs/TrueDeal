import { fail, guarded, ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/session';
import { act } from '@/lib/store';
import type { Address } from '@/lib/types';

export async function POST(req: Request) {
  return guarded(async () => {
    const me = await getSessionUser();
    if (!me) return fail('Sign in first.', 401);
    const body = await req.json();
    const address: Address = body.address;
    const order = act.placeOrder(me.id, body.listingId, address, body.payMethod || 'UPI', body.tier);
    return ok({ order });
  });
}
