import { fail, guarded, ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/session';
import { act, db } from '@/lib/store';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const me = await getSessionUser();
    const { id } = await params;
    const order = db.order(id);
    if (!me || !order || order.buyerId !== me.id) return fail('Not authorized.', 403);
    const { reason, detail } = await req.json();
    act.dispute(id, reason, String(detail || '').trim());
    return ok({ done: true });
  });
}
