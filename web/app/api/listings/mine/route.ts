import { fail, ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/session';
import { db } from '@/lib/store';

export async function GET() {
  const me = await getSessionUser();
  if (!me) return fail('Sign in first.', 401);
  const listings = db.state.listings.filter((l) => l.sellerId === me.id);
  return ok({ listings });
}
