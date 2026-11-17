import { fail, guarded, ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/session';
import { act, db } from '@/lib/store';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const me = await getSessionUser();
    const { id } = await params;
    const listing = db.listing(id);
    if (!me || !listing || listing.sellerId !== me.id) return fail('Not authorized.', 403);
    act.withdrawListing(id);
    return ok({ done: true });
  });
}
