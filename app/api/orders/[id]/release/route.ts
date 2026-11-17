import { fail, guarded, ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/session';
import { act, db } from '@/lib/store';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const me = await getSessionUser();
    const { id } = await params;
    const order = db.order(id);
    if (!me || !order) return fail('Not authorized.', 403);
    if (me.role === 'ops') {
      act.release(id, order.status === 'disputed' ? 'Claim reviewed and not upheld. Payout released.' : 'Inspection window closed without a claim.');
    } else if (order.buyerId === me.id) {
      act.release(id, 'Confirmed by the buyer.');
    } else {
      return fail('Not authorized.', 403);
    }
    return ok({ done: true });
  });
}
