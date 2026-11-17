import { guarded, ok } from '@/lib/api-helpers';
import { setSessionUser } from '@/lib/session';
import { act } from '@/lib/store';

export async function POST(req: Request) {
  return guarded(async () => {
    const { email } = await req.json();
    const user = act.signIn(String(email || ''));
    await setSessionUser(user.id);
    return ok({ user });
  });
}
