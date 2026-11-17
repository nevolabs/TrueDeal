import { guarded, ok } from '@/lib/api-helpers';
import { setSessionUser } from '@/lib/session';
import { act } from '@/lib/store';

export async function POST(req: Request) {
  return guarded(async () => {
    const { name, email, city } = await req.json();
    const user = act.signUp({ name: String(name || ''), email: String(email || ''), city: String(city || '') });
    await setSessionUser(user.id);
    return ok({ user });
  });
}
