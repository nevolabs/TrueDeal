import { ok } from '@/lib/api-helpers';
import { setSessionUser } from '@/lib/session';
import { db } from '@/lib/store';

export async function POST() {
  db.reset();
  await setSessionUser(null);
  return ok({ done: true });
}
