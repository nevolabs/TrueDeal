import { fail, ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/session';
import { db } from '@/lib/store';

const NEXT: Record<string, string> = {
  in_transit: 'Receive at hub',
  at_hub: 'Inspect',
  verified: 'Pack and dispatch',
  delivered: 'Release when window closes',
  disputed: 'Resolve claim',
};
const PRIO = ['disputed', 'at_hub', 'verified', 'in_transit', 'delivered'];

export async function GET() {
  const me = await getSessionUser();
  if (!me || me.role !== 'ops') return fail('Not authorized.', 403);
  const st = db.state;
  const orders = st.orders;
  const queue = orders
    .filter((o) => NEXT[o.status])
    .sort((a, b) => PRIO.indexOf(a.status) - PRIO.indexOf(b.status))
    .map((o) => ({ order: o, action: NEXT[o.status] }));
  const waiting = orders.filter((o) => ['paid', 'shipped'].includes(o.status));
  const closed = orders.filter((o) => ['completed', 'refunded', 'cancelled'].includes(o.status));
  const pendingListings = st.listings.filter((l) => l.status === 'pending');
  const pendingKyc = st.users.filter((u) => u.kyc && u.kyc.status === 'pending');
  const held = orders
    .filter((o) => !['completed', 'refunded', 'cancelled'].includes(o.status))
    .reduce((t, o) => t + o.total, 0);

  const withListing = <T extends { listingId: string; sellerId: string; buyerId: string }>(o: T) => ({
    order: o,
    listing: db.listing(o.listingId),
    seller: db.user(o.sellerId),
    buyer: db.user(o.buyerId),
  });

  return ok({
    stats: { queueCount: queue.length, pendingListings: pendingListings.length, pendingKyc: pendingKyc.length, held },
    queue: queue.map((q) => ({ ...withListing(q.order), action: q.action })),
    waiting: waiting.map(withListing),
    closed: closed.map(withListing),
    pendingListings: pendingListings.map((l) => ({ listing: l, seller: db.user(l.sellerId) })),
    pendingKyc,
  });
}
