import { randomUUID } from 'node:crypto';
import { guarded, ok } from './api-helpers';
import { command, readState } from './repository';
import { requireUser } from './session';
import { AppError } from './errors';
import { assertSameOrigin, jsonBody, oneOf, text } from './validation';
import { CATEGORIES, CONDITIONS, checklistFor } from './data';
import { paymentsEnabled } from './payments/config';
import { validateSellerDetails } from './seller-validation';

export function marketplaceRead(request: Request, resource: string, id?: string) {
  return guarded(async () => {
    const me = ['browse', 'listing'].includes(resource) ? null : await requireUser();
    const state = await readState();
    if (resource === 'browse') {
      const p = new URL(request.url).searchParams;
      const live = state.listings.filter(l => l.status === 'live');
      const q = (p.get('q') || '').toLowerCase();
      const other = live.filter(l => (!p.get('vault') || l.mode === 'hub') &&
        (!p.getAll('cond').length || p.getAll('cond').includes(l.condition)) &&
        (!q || (l.title + ' ' + l.brand).toLowerCase().includes(q)));
      const listings = other.filter(l => !p.get('cat') || l.category === p.get('cat'));
      listings.sort((a,b) => p.get('sort') === 'low' ? a.price-b.price : p.get('sort') === 'high' ? b.price-a.price : b.createdAt-a.createdAt);
      const counts: Record<string, number> = {};
      other.forEach(l => { counts[l.category] = (counts[l.category] || 0) + 1; });
      return ok({ listings, counts, categories: Object.keys(CATEGORIES), total: other.length });
    }
    if (resource === 'listing') {
      const listing = state.listings.find(l => l.id === id);
      if (!listing) throw new AppError('Listing not found.', 404);
      const seller = state.users.find(u => u.id === listing.sellerId);
      return ok({ listing, seller: seller ? { id: seller.id, name: seller.name, city: seller.city, joined: seller.joined, deals: seller.deals, verified: seller.kyc.status === 'verified' } : null });
    }
    if (resource === 'my_listings') return ok({ listings: state.listings.filter(l => l.sellerId === me!.id) });
    if (resource === 'mine' || resource === 'selling') return ok({ orders: state.orders.filter(o => resource === 'mine' ? o.buyerId === me!.id : o.sellerId === me!.id) });
    if (resource === 'order') {
      const order = state.orders.find(o => o.id === id);
      if (!order) throw new AppError('Order not found.', 404);
      return ok({ order, role: me!.role === 'ops' ? 'ops' : me!.id === order.buyerId ? 'buyer' : 'seller',
        listing: state.listings.find(l => l.id === order.listingId),
        buyer: state.users.find(u => u.id === order.buyerId), seller: state.users.find(u => u.id === order.sellerId) });
    }
    if (resource === 'ops') {
      if (me!.role !== 'ops') throw new AppError('Not authorized.', 403);
      const next: Record<string,string> = { in_transit: 'Receive at hub', at_hub: 'Inspect', verified: 'Dispatch', delivered: 'Release when due', disputed: 'Resolve claim', payment_review: 'Review payment', release_pending: 'Release processing', refund_pending: 'Refund processing' };
      const withListing = (o: typeof state.orders[number]) => ({ order: o, listing: state.listings.find(l => l.id === o.listingId), seller: state.users.find(u => u.id === o.sellerId), buyer: state.users.find(u => u.id === o.buyerId) });
      const pendingListings = state.listings.filter(l => l.status === 'pending');
      const pendingKyc: typeof state.users = [];
      const queue = state.orders.filter(o => next[o.status]);
      return ok({ stats: { queueCount: queue.length, pendingListings: pendingListings.length, pendingKyc: pendingKyc.length,
        held: state.orders.filter(o => o.fundsStatus === 'held').reduce((sum,o) => sum+o.payout,0) },
        queue: queue.map(o => ({ ...withListing(o), action: next[o.status] })),
        waiting: state.orders.filter(o => ['paid','shipped','awaiting_payment'].includes(o.status)).map(withListing),
        closed: state.orders.filter(o => ['completed','refunded','cancelled'].includes(o.status)).map(withListing),
        pendingListings: pendingListings.map(l => ({ listing:l, seller:state.users.find(u => u.id === l.sellerId) })), pendingKyc });
    }
    throw new AppError('Not found.', 404);
  });
}

export function marketplaceWrite(request: Request, action: string, id?: string) {
  return guarded(async () => {
    assertSameOrigin(request);
    const me = await requireUser();
    const body = request.headers.get('content-type')?.includes('application/json') ? await jsonBody(request) : {};
    let entity = id || null;
    let payload: Record<string, unknown> = body;
    if (action === 'create_listing') {
      payload = { title: text(body.title,'title',90,3), brand: text(body.brand,'brand'),
        category: oneOf(body.category,Object.keys(CATEGORIES),'category'), condition: oneOf(body.condition,Object.keys(CONDITIONS),'condition'),
        description: text(body.description,'description',10000,5), city: text(body.city,'city'), serial: text(body.serial,'serial'),
        price: Number(body.price), newPrice: Number(body.newPrice || 0), ageMonths: Number(body.ageMonths || 0),
        handover: oneOf(body.handover,['ship','onsite'],'handover'), warranty: typeof body.warranty === 'string' ? body.warranty.slice(0,200) : '', invoice: body.invoice === true, box: body.box === true };
      if(body.img) {
        const image=text(body.img,'image URL',600);
        const prefix=process.env.NEXT_PUBLIC_SUPABASE_URL+'/storage/v1/object/public/listing-photos/'+me.id+'/';
        if(!image.startsWith(prefix) || !/^[a-f0-9-]+\.(jpg|png|webp)$/.test(image.slice(prefix.length))) throw new AppError('Upload your listing photo first.');
        payload.img=image;
      }
      if (body.imagePaths !== undefined) {
        if (!Array.isArray(body.imagePaths) || body.imagePaths.length < 1 || body.imagePaths.length > 8 ||
            new Set(body.imagePaths).size !== body.imagePaths.length || body.imagePaths.some(path => typeof path !== 'string' || !path.startsWith(me.id + '/') || !/^[a-f0-9-]+\.(jpg|png|webp)$/.test(path.slice(me.id.length + 1)))) {
          throw new AppError('Upload between one and eight different product photos.');
        }
        payload.imagePaths = body.imagePaths;
      } else if (!body.img) throw new AppError('Upload at least one product photo.');
      if (!Number.isFinite(payload.price) || !Number.isInteger(payload.ageMonths) || Number(payload.ageMonths)<0 || Number(payload.ageMonths)>240) throw new AppError('Invalid price or age.');
    } else if (action === 'reserve') {
      if (!paymentsEnabled()) throw new AppError('Payments are not enabled yet. Checkout will be available after payment onboarding.',503);
      entity = text(body.listingId,'listing');
      const address = body.address as Record<string,unknown> | undefined;
      payload = { tier: oneOf(body.tier,['basic','full'],'inspection tier'), address: {
        name: text(address?.name,'recipient'), phone:text(address?.phone,'phone',15,10),
        line:text(address?.line,'address',300), city:text(address?.city,'city'), pin:text(address?.pin,'postcode',6,6) } };
      if (!/^\d{6}$/.test((payload.address as {pin:string}).pin)) throw new AppError('Enter a six-digit PIN code.');
    } else if (action === 'submit_kyc') {
      payload = validateSellerDetails(body);
    } else if (action === 'review_kyc' || action === 'review_listing') {
      if (typeof body.pass !== 'boolean') throw new AppError('Select an approval outcome.');
      payload = {pass:body.pass};
    } else if (action === 'verify') {
      const state = await readState();
      const order = state.orders.find(o => o.id===id);
      const listing = state.listings.find(l => l.id===order?.listingId);
      if (!order || !listing || me.role!=='ops') throw new AppError('Not authorized.',403);
      const checks = checklistFor(listing.category,order.tier).map((label,i) => ({label,result:oneOf(body['c'+i],['pass','fail','na'],'check result')}));
      const passed = oneOf(body.outcome,['pass','fail'],'outcome')==='pass';
      if (passed && checks.some(c => c.result==='fail')) throw new AppError('A failed check cannot pass.');
      if (!passed && !checks.some(c => c.result==='fail')) throw new AppError('Mark the failed check.');
      payload={pass:passed,report:{agent:me.name,tier:order.tier,serial:text(body.serial,'serial'),
        grade:oneOf(body.grade,Object.keys(CONDITIONS),'grade'),checks,notes:typeof body.notes==='string'?body.notes.slice(0,10000):'',seal:passed?'S-'+randomUUID().slice(0,8):null}};
    } else if (action === 'dispatch') payload={courier:text(body.courier,'courier'),awb:text(body.awb,'tracking number',100,3)};
    else if (action === 'dispute') payload={reason:text(body.reason,'reason',200),detail:text(body.detail,'details',10000,5)};
    const result = await command(action,entity,payload);
    if (action==='create_listing') return ok({listing:(await readState()).listings.find(l => l.id===result)},201);
    if (action==='reserve') return ok({order:(await readState()).orders.find(o => o.id===result)},201);
    return ok({done:true});
  });
}
