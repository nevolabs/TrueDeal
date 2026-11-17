import { fail, guarded, ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/session';
import { act } from '@/lib/store';

export async function POST(req: Request) {
  return guarded(async () => {
    const me = await getSessionUser();
    if (!me) return fail('Sign in first.', 401);
    const body = await req.json();
    act.submitKyc(me.id, body);
    return ok({ done: true });
  });
}
