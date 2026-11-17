import { fail, guarded, ok } from '@/lib/api-helpers';
import { getSessionUser, setSessionUser } from '@/lib/session';
import { db } from '@/lib/store';

export async function GET() {
  const user = await getSessionUser();
  return ok({ user });
}

export async function POST(req: Request) {
  return guarded(async () => {
    const { userId } = await req.json();
    const user = db.user(userId);
    if (!user) return fail('No such user.', 404);
    await setSessionUser(user.id);
    return ok({ user });
  });
}

export async function DELETE() {
  await setSessionUser(null);
  return ok({ user: null });
}
