'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import StatusBadge from '@/components/StatusBadge';
import { inr } from '@/lib/data';
import { api } from '@/lib/client';
import type { Listing, Order } from '@/lib/types';

function Row({ order, listing }: { order: Order; listing?: Listing }) {
  return (
    <Link href={`/order/${order.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3 hover:border-neutral-400">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-16 overflow-hidden rounded-md bg-neutral-100">
          {listing?.img && <Image src={listing.img} alt={listing.title} fill className="object-cover" />}
        </div>
        <div className="text-sm">
          <div className="font-medium">{listing?.title}</div>
          <div className="text-neutral-500">
            <span className="font-mono">{order.id}</span> · {new Date(order.createdAt).toLocaleDateString('en-IN')}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-sm">
          <div className="font-medium">{inr(order.total)}</div>
          <div className="text-xs text-neutral-500">paid</div>
        </div>
        <StatusBadge status={order.status} />
      </div>
    </Link>
  );
}

function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ orders: Order[] }>('/api/orders/mine').then(async (d) => {
      setOrders(d.orders);
      const entries = await Promise.all(
        [...new Set(d.orders.map((o) => o.listingId))].map(async (id) => {
          const r = await api.get<{ listing: Listing }>('/api/listings/' + id);
          return [id, r.listing] as const;
        })
      );
      setListings(Object.fromEntries(entries));
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-neutral-400">Loading…</div>;

  const open = orders.filter((o) => !['completed', 'refunded', 'cancelled'].includes(o.status));
  const done = orders.filter((o) => ['completed', 'refunded', 'cancelled'].includes(o.status));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Your orders</h1>
      {!orders.length && (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
          You have not bought anything yet. <Link href="/browse" className="underline">Browse listings</Link>
        </div>
      )}
      {!!open.length && (
        <>
          <h2 className="mb-2 text-sm font-semibold text-neutral-500">In progress</h2>
          <div className="mb-6 flex flex-col gap-2">{open.map((o) => <Row key={o.id} order={o} listing={listings[o.listingId]} />)}</div>
        </>
      )}
      {!!done.length && (
        <>
          <h2 className="mb-2 text-sm font-semibold text-neutral-500">Past orders</h2>
          <div className="flex flex-col gap-2">{done.map((o) => <Row key={o.id} order={o} listing={listings[o.listingId]} />)}</div>
        </>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <RequireAuth>
      <OrdersList />
    </RequireAuth>
  );
}
