import { fail, guarded, ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/session';
import { act } from '@/lib/store';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const me = await getSessionUser();
    if (!me || me.role !== 'ops') return fail('Not authorized.', 403);
    const { id } = await params;
    act.refund(id);
    return ok({ done: true });
  });
}
