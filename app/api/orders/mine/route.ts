import { fail, ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/session';
import { db } from '@/lib/store';

export async function GET() {
  const me = await getSessionUser();
  if (!me) return fail('Sign in first.', 401);
  const orders = db.state.orders.filter((o) => o.buyerId === me.id);
  return ok({ orders });
}
