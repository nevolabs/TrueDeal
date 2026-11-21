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
import { sellerReady } from '@/lib/seller-validation';

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
    <Link href={`/order/${order.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-line p-3 hover:border-neutral-400">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-16 overflow-hidden rounded-md bg-tint">
          {l?.img && <Image src={l.img} alt={l.title} fill className="object-cover" />}
        </div>
        <div className="text-sm">
          <div className="font-medium">{l?.title}</div>
          <div className="text-muted-foreground">
            <span className="font-mono">{order.id}</span> · {new Date(order.createdAt).toLocaleDateString('en-IN')}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-sm">
          <div className="font-medium">{inr(order.payout)}</div>
          <div className="text-xs text-muted-foreground">payout</div>
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

  if (!user || loading) return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-muted-foreground">Loading…</div>;

  const k = user.kyc.status;
  const ready = sellerReady(user.kyc);
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
          <h1 className="page-title">Selling</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user.name}
            {k === 'verified' && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">✓ ID verified</span>}
          </p>
        </div>
        {ready && (
          <Link href="/sell/new" className="btn">
            List an item
          </Link>
        )}
      </div>

      {!ready && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <div>
            <strong>Complete your seller details to start listing.</strong>
            <div className="text-muted-foreground">Add your legal name, PAN and bank details for basic format and consistency checks.</div>
          </div>
          <Link href="/sell/verify" className="btn btn-sm">Complete details</Link>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ['Live listings', listings.filter((l) => l.status === 'live').length],
          ['Sales in progress', toAct.length + moving.length],
          ['Seller settlements held', inr(sum(pending.filter(o=>o.fundsStatus==='held')))],
          ['Paid out', inr(sum(paidOut))],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-lg font-semibold">{value}</div>
          </div>
        ))}
      </div>

      {!!toAct.length && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">Needs your action</h2>
          <div className="flex flex-col gap-2">{toAct.map((o) => <OrderRow key={o.id} order={o} listings={listings} />)}</div>
        </>
      )}
      {!!moving.length && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">In progress</h2>
          <div className="flex flex-col gap-2">{moving.map((o) => <OrderRow key={o.id} order={o} listings={listings} />)}</div>
        </>
      )}

      <h2 className="mb-2 mt-8 text-sm font-semibold text-muted-foreground">Your listings</h2>
      {listings.length ? (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-tint text-left text-xs text-muted-foreground">
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
                  <tr key={l.id} className="border-t border-line">
                    <td className="px-4 py-2">
                      <Link href={`/item/${l.id}`} className="font-medium hover:underline">{l.title}</Link>
                      <div className="text-xs text-muted-foreground">Listed {new Date(l.createdAt).toLocaleDateString('en-IN')}</div>
                    </td>
                    <td className="px-4 py-2">{inr(l.price)}</td>
                    <td className="px-4 py-2">
                      {inr(l.price - fee(l.price) - (l.handover === 'onsite' ? FEES.visitFee : 0))}
                      {l.handover === 'onsite' && <div className="text-xs text-muted-foreground">after on-site visit</div>}
                    </td>
                    <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${st[1]}`}>{st[0]}</span></td>
                    <td className="px-4 py-2 text-right">
                      {['live', 'pending'].includes(l.status) && (
                        <button onClick={() => withdraw(l.id)} className="btn btn-sm btn-secondary">Withdraw</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line-strong p-8 text-center text-sm text-muted-foreground">
          No listings yet. {ready ? <Link href="/sell/new" className="underline">List your first item</Link> : <Link href="/sell/verify" className="underline">Complete your seller details, then list your first item.</Link>}
        </div>
      )}

      {!!paidOut.length && (
        <>
          <h2 className="mb-2 mt-8 text-sm font-semibold text-muted-foreground">Payouts</h2>
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
