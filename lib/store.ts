import { benchFor, checklistFor, fee as calcFee, FEES, shipFor } from './data';
import { seed } from './seed';
import type { Address, AppState, CheckItem, Order, User } from './types';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function code(len: number): string {
  return Array.from({ length: len }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
}

class AppError extends Error {}
function fail(msg: string): never {
  throw new AppError(msg);
}

declare global {
  var __sellioState: AppState | undefined;
}

function getState(): AppState {
  if (!globalThis.__sellioState) globalThis.__sellioState = seed(checklistFor);
  return globalThis.__sellioState;
}
function resetState(): AppState {
  globalThis.__sellioState = seed(checklistFor);
  return globalThis.__sellioState;
}

export const db = {
  get state() {
    return getState();
  },
  user(id: string | null | undefined): User | null {
    if (!id) return null;
    return getState().users.find((u) => u.id === id) ?? null;
  },
  listing(id: string) {
    return getState().listings.find((l) => l.id === id) ?? null;
  },
  order(id: string) {
    return getState().orders.find((o) => o.id === id) ?? null;
  },
  live() {
    return getState().listings.filter((l) => l.status === 'live');
  },
  reset() {
    return resetState();
  },
};

function stamp(order: Order, status: Order['status'], note?: string) {
  order.status = status;
  order.timeline.push({ status, at: Date.now(), note });
}

export const act = {
  signIn(email: string): User {
    const u = getState().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) fail('No account with that email. Create one, or use a demo account below.');
    return u;
  },
  signUp(d: { name: string; email: string; city: string }): User {
    const email = d.email.trim().toLowerCase();
    const s = getState();
    if (s.users.some((x) => x.email.toLowerCase() === email)) fail('An account with that email already exists.');
    const u: User = {
      id: 'u_' + code(6).toLowerCase(), name: d.name.trim(), email, city: d.city.trim(),
      role: 'member', joined: Date.now(), deals: 0, kyc: { status: 'none' },
    };
    s.users.push(u);
    return u;
  },

  submitKyc(userId: string, d: { legalName: string; pan: string; bank: string; account: string }) {
    const me = db.user(userId);
    if (!me) fail('Not signed in.');
    me.kyc = {
      status: 'pending',
      legalName: d.legalName.trim(),
      pan: 'XXXXX' + d.pan.slice(5).toUpperCase(),
      bank: d.bank.trim(),
      acct: d.account.slice(-4),
      at: Date.now(),
    };
  },
  reviewKyc(userId: string, ok: boolean) {
    const u = db.user(userId);
    if (!u) fail('User not found.');
    u.kyc.status = ok ? 'verified' : 'rejected';
    u.kyc.reviewedAt = Date.now();
  },

  createListing(sellerId: string, d: {
    category: string; img?: string; title: string; brand: string; price: string | number;
    newPrice?: string | number; condition: string; ageMonths?: string | number; warranty?: string;
    city: string; handover?: 'ship' | 'onsite'; invoice?: boolean; box?: boolean; serial: string; description: string;
  }) {
    const me = db.user(sellerId);
    if (!me) fail('Not signed in.');
    if (me.kyc.status !== 'verified') fail('Verify your identity before listing.');
    const price = Number(d.price);
    if (!(price >= FEES.minPrice)) fail('Listings start at ₹' + FEES.minPrice.toLocaleString('en-IN') + '.');
    const months = Number(d.ageMonths) || 0;
    const s = getState();
    const l = {
      id: 'l_' + code(6).toLowerCase(), sellerId: me.id, category: d.category, img: d.img || '',
      title: d.title.trim(), brand: d.brand.trim(), price, newPrice: Number(d.newPrice) || 0,
      condition: d.condition, ageMonths: months, warranty: (d.warranty || '').trim() || 'Out of warranty',
      city: d.city.trim(), status: 'pending' as const, mode: 'order' as const, handover: d.handover || 'ship',
      invoice: !!d.invoice, box: !!d.box, serial: d.serial.trim(), createdAt: Date.now(),
      specs: [] as [string, string][], description: d.description.trim(),
    };
    s.listings.unshift(l);
    return l;
  },
  reviewListing(id: string, ok: boolean) {
    const l = db.listing(id);
    if (!l) fail('Listing not found.');
    l.status = ok ? 'live' : 'rejected';
  },
  withdrawListing(id: string) {
    const l = db.listing(id);
    if (l && (l.status === 'live' || l.status === 'pending')) l.status = 'withdrawn';
  },

  placeOrder(buyerId: string, listingId: string, address: Address, payMethod: string, tierIn?: 'basic' | 'full') {
    const me = db.user(buyerId);
    const l = db.listing(listingId);
    if (!me) fail('Not signed in.');
    if (!l || l.status !== 'live') fail('This item is no longer available.');
    if (l.sellerId === me.id) fail('You cannot buy your own listing.');
    const vault = l.mode === 'hub' && !!l.report;
    const tier: 'basic' | 'full' = vault || tierIn === 'full' ? 'full' : 'basic';
    const inspectionFee = tier === 'full' && !vault ? benchFor(l.category) : 0;
    const shipping = shipFor(l.category);
    const feeAmt = calcFee(l.price);
    const now = Date.now();
    const handover = vault ? 'hub' : l.handover;
    const visitFee = handover === 'onsite' ? FEES.visitFee : 0;
    const s = getState();
    const o: Order = {
      id: 'PK-' + s.seq.order++, listingId: l.id, buyerId: me.id, sellerId: l.sellerId,
      price: l.price, shipping, tier, inspectionFee, handover, visitFee,
      total: l.price + shipping + inspectionFee, fee: feeAmt, payout: l.price - feeAmt - visitFee,
      address, payMethod, status: 'paid', createdAt: now, handoverCode: 'H-' + (1000 + Math.floor(Math.random() * 9000)),
      timeline: [{ status: 'paid', at: now }],
    };
    if (l.mode === 'hub' && l.report) {
      o.report = l.report;
      o.fromStock = true;
      o.timeline.push({ status: 'verified', at: now, note: 'Already inspected and sealed at our hub.' });
      o.status = 'verified';
    }
    l.status = 'reserved';
    me.address = address;
    s.orders.unshift(o);
    return o;
  },
  cancel(id: string) {
    const o = db.order(id);
    if (!o) fail('Order not found.');
    if (o.status !== 'paid') fail('This order can no longer be cancelled.');
    stamp(o, 'cancelled', 'Cancelled by the buyer before handover. Refund issued in full.');
    const l = db.listing(o.listingId);
    if (l) l.status = 'live';
  },
  handover(id: string) {
    const o = db.order(id);
    if (!o || o.status !== 'paid') return;
    stamp(o, 'in_transit');
  },
  receive(id: string) {
    const o = db.order(id);
    if (!o || o.status !== 'in_transit') return;
    stamp(o, 'at_hub', o.handover === 'onsite'
      ? 'Agent arrived and matched the code with the seller. Intake video started on site.'
      : 'Intake video recorded. Parcel weight and serial logged.');
  },
  verify(id: string, agentName: string, r: { grade: string; serial: string; notes: string; checks: CheckItem[] }, pass: boolean) {
    const o = db.order(id);
    if (!o || o.status !== 'at_hub') return;
    const l = db.listing(o.listingId);
    const s = getState();
    o.report = {
      id: 'VR-' + s.seq.report++, at: Date.now(), agent: agentName, grade: r.grade, tier: o.tier,
      seal: pass ? 'S-' + code(6) : null, serial: r.serial, notes: r.notes, checks: r.checks, failed: !pass,
    };
    if (pass) {
      stamp(o, 'verified');
    } else {
      stamp(o, 'refunded', 'Did not pass inspection. Buyer refunded in full; item returned to the seller.');
      if (l) l.status = 'rejected';
    }
  },
  dispatch(id: string, courier: string) {
    const o = db.order(id);
    if (!o || o.status !== 'verified') return;
    o.tracking = { courier, awb: String(10000000000 + Math.floor(Math.random() * 89999999999)) };
    stamp(o, 'shipped', 'Packing video recorded. Seal ' + o.report!.seal + ' applied.');
  },
  delivered(id: string) {
    const o = db.order(id);
    if (!o || o.status !== 'shipped') return;
    o.windowEnds = Date.now() + FEES.inspectionHours * 36e5;
    stamp(o, 'delivered');
  },
  release(id: string, note?: string) {
    const o = db.order(id);
    if (!o || (o.status !== 'delivered' && o.status !== 'disputed')) return;
    stamp(o, 'completed', note);
    const l = db.listing(o.listingId);
    if (l) l.status = 'sold';
    const seller = db.user(o.sellerId);
    if (seller) seller.deals++;
  },
  dispute(id: string, reason: string, detail: string) {
    const o = db.order(id);
    if (!o || o.status !== 'delivered') return;
    o.dispute = { reason, detail, at: Date.now() };
    stamp(o, 'disputed', reason);
  },
  refund(id: string) {
    const o = db.order(id);
    if (!o || o.status !== 'disputed') return;
    o.dispute!.resolution = 'refund';
    stamp(o, 'refunded', 'Claim upheld. Buyer refunded in full on return of the item.');
    const l = db.listing(o.listingId);
    if (l) l.status = 'rejected';
  },
};

export { AppError };
