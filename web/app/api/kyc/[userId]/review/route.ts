import { fail, guarded, ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/session';
import { act } from '@/lib/store';

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  return guarded(async () => {
    const me = await getSessionUser();
    if (!me || me.role !== 'ops') return fail('Not authorized.', 403);
    const { userId } = await params;
    const { ok: pass } = await req.json();
    act.reviewKyc(userId, !!pass);
    return ok({ done: true });
  });
}
