import { fail, ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/session';
import { db } from '@/lib/store';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUser();
  if (!me) return fail('Sign in first.', 401);
  const { id } = await params;
  const order = db.order(id);
  if (!order) return fail('We could not find that order.', 404);
  const role = me.role === 'ops' ? 'ops' : me.id === order.buyerId ? 'buyer' : me.id === order.sellerId ? 'seller' : null;
  if (!role) return fail('We could not find that order.', 404);
  const listing = db.listing(order.listingId);
  const buyer = db.user(order.buyerId);
  const seller = db.user(order.sellerId);
  return ok({
    order,
    role,
    listing,
    buyer: buyer ? { id: buyer.id, name: buyer.name, city: buyer.city } : null,
    seller: seller ? { id: seller.id, name: seller.name, city: seller.city, kyc: seller.kyc } : null,
  });
}
