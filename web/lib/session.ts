import { cookies } from 'next/headers';
import { db } from './store';
import type { User } from './types';

const COOKIE = 'sellio_uid';

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const uid = store.get(COOKIE)?.value;
  return db.user(uid);
}

export async function setSessionUser(userId: string | null) {
  const store = await cookies();
  if (userId) store.set(COOKIE, userId, { httpOnly: true, sameSite: 'lax', path: '/' });
  else store.delete(COOKIE);
}

export { COOKIE };
