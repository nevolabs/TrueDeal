'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import StatusBadge from '@/components/StatusBadge';
import { FEES, fee, inr } from '@/lib/data';
import { api } from '@/lib/client';
import { useSession } from '@/lib/session-context';
import { useToast } from '@/lib/toast-context';
import type { Listing, Order } from '@/lib/types';

const LISTING_LABEL: Record<string, [string, string]> = {
  live: ['Live', 'bg-emerald-100 text-emerald-800'],
  pending: ['In review', 'bg-amber-100 text-amber-800'],
  reserved: ['Sale in progress', 'bg-amber-100 text-amber-800'],
  sold: ['Sold', 'bg-neutral-900 text-white'],
  rejected: ['Not accepted', 'bg-red-100 text-red-800'],
  withdrawn: ['Withdrawn', 'bg-neutral-100 text-neutral-500'],
};

function OrderRow({ order, listings }: { order: Order; listings: Listing[] }) {
  const l = listings.find((x) => x.id === order.listingId);
  return (
    <Link href={`/order/${order.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3 hover:border-neutral-400">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-16 overflow-hidden rounded-md bg-neutral-100">
          {l?.img && <Image src={l.img} alt={l.title} fill className="object-cover" />}
        </div>
        <div className="text-sm">
          <div className="font-medium">{l?.title}</div>
          <div className="text-neutral-500">
            <span className="font-mono">{order.id}</span> · {new Date(order.createdAt).toLocaleDateString('en-IN')}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-sm">
          <div className="font-medium">{inr(order.payout)}</div>
          <div className="text-xs text-neutral-500">payout</div>
        </div>
        <StatusBadge status={order.status} />
      </div>
    </Link>
  );
}

function Dashboard() {
  const { user } = useSession();
  const toast = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [sales, setSales] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [l, s] = await Promise.all([
      api.get<{ listings: Listing[] }>('/api/listings/mine'),
      api.get<{ orders: Order[] }>('/api/orders/selling'),
    ]);
    setListings(l.listings);
    setSales(s.orders);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial dashboard data fetch on mount
    load();
  }, []);

  if (!user || loading) return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-neutral-400">Loading…</div>;

  const k = user.kyc.status;
  const toAct = sales.filter((o) => o.status === 'paid');
  const moving = sales.filter((o) => ['in_transit', 'at_hub', 'verified', 'shipped', 'delivered', 'disputed'].includes(o.status));
  const paidOut = sales.filter((o) => o.status === 'completed');
  const pending = sales.filter((o) => ['paid', 'in_transit', 'at_hub', 'verified', 'shipped', 'delivered'].includes(o.status));
  const sum = (arr: Order[]) => arr.reduce((t, o) => t + o.payout, 0);

  async function withdraw(id: string) {
    await api.post(`/api/listings/${id}/withdraw`);
    toast('Listing withdrawn.');
    load();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Selling</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {user.name}
            {k === 'verified' && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">✓ ID verified</span>}
          </p>
        </div>
        {k === 'verified' && (
          <Link href="/sell/new" className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
            List an item
          </Link>
        )}
      </div>

      {k !== 'verified' && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          {k === 'pending' ? (
            <div>
              <strong>We are checking your details.</strong>
              <div className="text-neutral-600">This usually takes a few hours. You can list as soon as you are verified.</div>
            </div>
          ) : k === 'rejected' ? (
            <>
              <div>
                <strong>We could not verify your details.</strong>
                <div className="text-neutral-600">The name on the bank account must match your PAN.</div>
              </div>
              <Link href="/sell/verify" className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white">Try again</Link>
            </>
          ) : (
            <>
              <div>
                <strong>Verify your identity to start selling.</strong>
                <div className="text-neutral-600">PAN and a bank account in your name. A few minutes, once.</div>
              </div>
              <Link href="/sell/verify" className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white">Get verified</Link>
            </>
          )}
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ['Live listings', listings.filter((l) => l.status === 'live').length],
          ['Sales in progress', toAct.length + moving.length],
          ['Held in escrow for you', inr(sum(pending))],
          ['Paid out', inr(sum(paidOut))],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-neutral-200 p-4">
            <div className="text-xs text-neutral-500">{label}</div>
            <div className="mt-1 text-lg font-semibold">{value}</div>
          </div>
        ))}
      </div>

      {!!toAct.length && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-semibold text-neutral-500">Needs your action</h2>
          <div className="flex flex-col gap-2">{toAct.map((o) => <OrderRow key={o.id} order={o} listings={listings} />)}</div>
        </>
      )}
      {!!moving.length && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-semibold text-neutral-500">In progress</h2>
          <div className="flex flex-col gap-2">{moving.map((o) => <OrderRow key={o.id} order={o} listings={listings} />)}</div>
        </>
      )}

      <h2 className="mb-2 mt-8 text-sm font-semibold text-neutral-500">Your listings</h2>
      {listings.length ? (
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2">Price</th>
                <th className="px-4 py-2">You receive</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => {
                const st = LISTING_LABEL[l.status] || [l.status, 'bg-neutral-100 text-neutral-500'];
                return (
                  <tr key={l.id} className="border-t border-neutral-100">
                    <td className="px-4 py-2">
                      <Link href={`/item/${l.id}`} className="font-medium hover:underline">{l.title}</Link>
                      <div className="text-xs text-neutral-500">Listed {new Date(l.createdAt).toLocaleDateString('en-IN')}</div>
                    </td>
                    <td className="px-4 py-2">{inr(l.price)}</td>
                    <td className="px-4 py-2">
                      {inr(l.price - fee(l.price) - (l.handover === 'onsite' ? FEES.visitFee : 0))}
                      {l.handover === 'onsite' && <div className="text-xs text-neutral-500">after on-site visit</div>}
                    </td>
                    <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${st[1]}`}>{st[0]}</span></td>
                    <td className="px-4 py-2 text-right">
                      {['live', 'pending'].includes(l.status) && (
                        <button onClick={() => withdraw(l.id)} className="text-xs underline">Withdraw</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          No listings yet. {k === 'verified' ? <Link href="/sell/new" className="underline">List your first item</Link> : 'Verify your identity, then list your first item.'}
        </div>
      )}

      {!!paidOut.length && (
        <>
          <h2 className="mb-2 mt-8 text-sm font-semibold text-neutral-500">Payouts</h2>
          <div className="flex flex-col gap-2">{paidOut.map((o) => <OrderRow key={o.id} order={o} listings={listings} />)}</div>
        </>
      )}
    </div>
  );
}

export default function SellingPage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}
