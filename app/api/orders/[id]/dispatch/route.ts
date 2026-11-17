import { fail, guarded, ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/session';
import { act } from '@/lib/store';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const me = await getSessionUser();
    if (!me || me.role !== 'ops') return fail('Not authorized.', 403);
    const { id } = await params;
    const { courier } = await req.json();
    act.dispatch(id, courier);
    return ok({ done: true });
  });
}
