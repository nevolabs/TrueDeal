import { fail, ok } from '@/lib/api-helpers';
import { db } from '@/lib/store';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = db.listing(id);
  if (!listing) return fail('That listing does not exist.', 404);
  const seller = db.user(listing.sellerId);
  return ok({ listing, seller: seller ? { id: seller.id, name: seller.name, city: seller.city, deals: seller.deals, joined: seller.joined } : null });
}
