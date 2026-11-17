'use client';

import Image from 'next/image';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import { CONDITIONS, TIERS, benchFor, firstName, inr, shipFor } from '@/lib/data';
import { api, ApiError } from '@/lib/client';
import { useSession } from '@/lib/session-context';
import type { Listing, Order } from '@/lib/types';

function CheckoutForm({ id }: { id: string }) {
  const { user } = useSession();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<{ name: string } | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [line, setLine] = useState('');
  const [city, setCity] = useState('');
  const [pin, setPin] = useState('');
  const [tier, setTier] = useState<'basic' | 'full'>('basic');
  const [pay, setPay] = useState('UPI');
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    api
      .get<{ listing: Listing; seller: { name: string } }>('/api/listings/' + id)
      .then((d) => {
        if (d.listing.status !== 'live') {
          setNotFound(true);
          return;
        }
        setListing(d.listing);
        setSeller(d.seller);
        const a = user?.address;
        setName(a?.name || user?.name || '');
        setPhone(a?.phone || '');
        setLine(a?.line || '');
        setCity(a?.city || user?.city || '');
        setPin(a?.pin || '');
      })
      .catch(() => setNotFound(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (notFound) return <div className="mx-auto max-w-lg px-4 py-16 text-center text-neutral-500">That item is no longer available.</div>;
  if (!listing || !seller) return <div className="mx-auto max-w-lg px-4 py-16 text-center text-neutral-400">Loading…</div>;

  const ship = shipFor(listing.category);
  const vault = listing.mode === 'hub' && !!listing.report;
  const bench = benchFor(listing.category);
  const total = listing.price + ship + (vault ? 0 : tier === 'full' ? bench : 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name || !phone || !line || !city || !pin) {
      setError('Please fill in every field.');
      return;
    }
    setPaying(true);
    await new Promise((r) => setTimeout(r, 900));
    try {
      const d = await api.post<{ order: Order }>('/api/orders', {
        listingId: id,
        address: { name, phone, line, city, pin },
        payMethod: pay,
        tier,
      });
      router.push(`/order/${d.order.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
      setPaying(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <nav className="mb-4 text-sm text-neutral-500">
        <Link href={`/item/${listing.id}`} className="hover:underline">Back to the listing</Link>
      </nav>
      <h1 className="mb-6 text-2xl font-semibold">Checkout</h1>
      <form onSubmit={submit} className="grid gap-6 md:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-neutral-200 p-5">
            <h2 className="mb-3 text-sm font-semibold">Deliver to</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Full name<input className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="text-sm">Mobile number<input className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" placeholder="10-digit mobile" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
              <label className="text-sm sm:col-span-2">Address<input placeholder="Flat, building, street" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={line} onChange={(e) => setLine(e.target.value)} /></label>
              <label className="text-sm">City<input className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={city} onChange={(e) => setCity(e.target.value)} /></label>
              <label className="text-sm">PIN code<input maxLength={6} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={pin} onChange={(e) => setPin(e.target.value)} /></label>
            </div>
            <p className="mt-2 text-xs text-neutral-500">The courier will ask for a one-time code at the door. Someone must be there to receive it.</p>
          </section>

          <section className="rounded-xl border border-neutral-200 p-5">
            <h2 className="mb-3 text-sm font-semibold">How should we check it?</h2>
            {vault ? (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                ✓ This item has already had the full bench test and is sealed at our hub. Its report is on the listing.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label className="flex items-start gap-2 rounded-lg border border-neutral-200 p-3 text-sm">
                  <input type="radio" className="mt-1" checked={tier === 'basic'} onChange={() => setTier('basic')} />
                  <span><strong>{TIERS.basic.label}</strong> — Included<br /><span className="text-neutral-500">{TIERS.basic.note}</span></span>
                </label>
                <label className="flex items-start gap-2 rounded-lg border border-neutral-200 p-3 text-sm">
                  <input type="radio" className="mt-1" checked={tier === 'full'} onChange={() => setTier('full')} />
                  <span><strong>{TIERS.full.label}</strong> — +{inr(bench)}<br /><span className="text-neutral-500">{TIERS.full.note}</span></span>
                </label>
                <p className="text-xs text-neutral-500">If the item fails either check, you are refunded in full, including the bench test fee.</p>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-neutral-200 p-5">
            <h2 className="mb-3 text-sm font-semibold">Pay into escrow</h2>
            <div className="flex flex-col gap-2">
              {['UPI', 'Net banking', 'Card'].map((p) => (
                <label key={p} className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3 text-sm">
                  <input type="radio" checked={pay === p} onChange={() => setPay(p)} /> {p}
                </label>
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600">
              🔒 Your payment is held by our payment partner and released to the seller only after the item passes
              inspection, is delivered, and your 48-hour window has closed.
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-neutral-200 p-5">
          <div className="mb-3 flex gap-3">
            <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100">
              {listing.img && <Image src={listing.img} alt={listing.title} fill className="object-cover" />}
            </div>
            <div className="text-sm">
              <strong>{listing.title}</strong>
              <div className="text-neutral-500">{CONDITIONS[listing.condition].label} · sold by {firstName(seller.name)}</div>
            </div>
          </div>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt>Item</dt><dd>{inr(listing.price)}</dd></div>
            <div className="flex justify-between"><dt>Insured shipping</dt><dd>{inr(ship)}</dd></div>
            <div className="flex justify-between"><dt>Inspection</dt><dd>{vault ? 'Full bench test, done' : tier === 'full' ? 'Full bench test, +' + inr(bench) : 'Look and feel, included'}</dd></div>
            <div className="flex justify-between border-t border-neutral-200 pt-1 font-medium"><dt>Total</dt><dd>{inr(total)}</dd></div>
          </dl>
          {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <button disabled={paying} className="mt-4 w-full rounded-full bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {paying ? 'Contacting your bank…' : `Pay ${inr(total)} into escrow`}
          </button>
          <p className="mt-2 text-center text-xs text-neutral-500">Mock prototype: no real payment is taken.</p>
        </aside>
      </form>
    </div>
  );
}

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <CheckoutForm id={id} />
    </RequireAuth>
  );
}
