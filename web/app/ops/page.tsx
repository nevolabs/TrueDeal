'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import StatusBadge from '@/components/StatusBadge';
import { TIERS, age, firstName, inr } from '@/lib/data';
import { api } from '@/lib/client';
import { useSession } from '@/lib/session-context';
import { useToast } from '@/lib/toast-context';
import type { Listing, Order, User } from '@/lib/types';

interface QueueRow {
  order: Order;
  listing: Listing;
  seller: User;
  buyer: User;
  action?: string;
}
interface Overview {
  stats: { queueCount: number; pendingListings: number; pendingKyc: number; held: number };
  queue: QueueRow[];
  waiting: QueueRow[];
  closed: QueueRow[];
  pendingListings: { listing: Listing; seller: User }[];
  pendingKyc: User[];
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
          <tr>{head.map((h) => <th key={h} className="px-4 py-2">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function OrderRow({ r }: { r: QueueRow }) {
  return (
    <tr className="border-t border-neutral-100">
      <td className="px-4 py-2"><Link href={`/order/${r.order.id}`} className="font-mono text-sm hover:underline">{r.order.id}</Link></td>
      <td className="px-4 py-2">
        {r.listing.title}
        <div className="text-xs text-neutral-500">
          {firstName(r.seller.name)} → {firstName(r.buyer.name)}, {r.order.address.city} · {(TIERS[r.order.tier || 'full']).short}
          {r.order.handover === 'onsite' ? ' · On site' : ''}
        </div>
      </td>
      <td className="px-4 py-2">{inr(r.order.total)}</td>
      <td className="px-4 py-2"><StatusBadge status={r.order.status} /></td>
      <td className="px-4 py-2 text-right">
        <Link href={`/order/${r.order.id}`} className={r.action ? 'rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white' : 'text-xs underline'}>
          {r.action || 'Open'}
        </Link>
      </td>
    </tr>
  );
}

function Console() {
  const { user } = useSession();
  const toast = useToast();
  const [data, setData] = useState<Overview | null>(null);

  async function load() {
    const d = await api.get<Overview>('/api/ops/overview');
    setData(d);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial overview fetch on mount
    load();
  }, []);

  if (!data || !user) return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-neutral-400">Loading…</div>;

  async function approveListing(id: string, ok: boolean) {
    await api.post(`/api/listings/${id}/review`, { ok });
    toast(ok ? 'Listing is live.' : 'Listing rejected.');
    load();
  }
  async function reviewKyc(id: string, ok: boolean) {
    await api.post(`/api/kyc/${id}/review`, { ok });
    toast(ok ? 'Seller verified.' : 'Seller rejected.');
    load();
  }

  const oHead = ['Order', 'Item', 'In escrow', 'Status', ''];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Bench console</h1>
        <p className="mt-1 text-sm text-neutral-600">Signed in as {user.name}, Bengaluru hub.</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ['Orders needing action', data.stats.queueCount],
          ['Listings to review', data.stats.pendingListings],
          ['Sellers to verify', data.stats.pendingKyc],
          ['Currently in escrow', inr(data.stats.held)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-neutral-200 p-4">
            <div className="text-xs text-neutral-500">{label}</div>
            <div className="mt-1 text-lg font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-2 text-sm font-semibold text-neutral-500">Orders needing action</h2>
      {data.queue.length ? (
        <Table head={oHead}>{data.queue.map((r) => <OrderRow key={r.order.id} r={r} />)}</Table>
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">The bench is clear.</div>
      )}

      <h2 className="mb-2 mt-8 text-sm font-semibold text-neutral-500">Listings to review</h2>
      {data.pendingListings.length ? (
        <Table head={['Item', 'Seller', 'Asking', '']}>
          {data.pendingListings.map(({ listing: l, seller: s }) => (
            <tr key={l.id} className="border-t border-neutral-100">
              <td className="px-4 py-2">
                <Link href={`/item/${l.id}`} className="font-medium hover:underline">{l.title}</Link>
                <div className="text-xs text-neutral-500">{age(l.ageMonths)} old · serial <span className="font-mono">{l.serial}</span></div>
              </td>
              <td className="px-4 py-2">{s.name}<div className="text-xs text-neutral-500">{s.deals} completed · {l.city}</div></td>
              <td className="px-4 py-2">{inr(l.price)}{!!l.newPrice && <div className="text-xs text-neutral-500">new {inr(l.newPrice)}</div>}</td>
              <td className="whitespace-nowrap px-4 py-2 text-right">
                <button onClick={() => approveListing(l.id, true)} className="mr-2 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white">Approve</button>
                <button onClick={() => approveListing(l.id, false)} className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium">Reject</button>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">No listings waiting.</div>
      )}

      <h2 className="mb-2 mt-8 text-sm font-semibold text-neutral-500">Sellers to verify</h2>
      {data.pendingKyc.length ? (
        <Table head={['Seller', 'Identity', 'Bank account', 'Submitted', '']}>
          {data.pendingKyc.map((u) => (
            <tr key={u.id} className="border-t border-neutral-100">
              <td className="px-4 py-2">{u.name}<div className="text-xs text-neutral-500">{u.email} · {u.city}</div></td>
              <td className="px-4 py-2 font-mono">{u.kyc.pan}<div className="text-xs text-neutral-500 font-sans">PAN name: {u.kyc.legalName || u.name}</div></td>
              <td className="px-4 py-2">{u.kyc.bank} <span className="font-mono">••{u.kyc.acct}</span><div className="text-xs text-emerald-600">✓ ₹1 test transfer: name matched</div></td>
              <td className="px-4 py-2 text-xs text-neutral-500">{u.kyc.at && new Date(u.kyc.at).toLocaleString('en-IN')}</td>
              <td className="whitespace-nowrap px-4 py-2 text-right">
                <button onClick={() => reviewKyc(u.id, true)} className="mr-2 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white">Verify</button>
                <button onClick={() => reviewKyc(u.id, false)} className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium">Reject</button>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">No sellers waiting.</div>
      )}

      {!!data.waiting.length && (
        <>
          <h2 className="mb-2 mt-8 text-sm font-semibold text-neutral-500">Waiting on someone else</h2>
          <Table head={oHead}>{data.waiting.map((r) => <OrderRow key={r.order.id} r={r} />)}</Table>
        </>
      )}
      {!!data.closed.length && (
        <>
          <h2 className="mb-2 mt-8 text-sm font-semibold text-neutral-500">Closed</h2>
          <Table head={oHead}>{data.closed.map((r) => <OrderRow key={r.order.id} r={r} />)}</Table>
        </>
      )}
    </div>
  );
}

export default function OpsPage() {
  return (
    <RequireAuth role="ops">
      <Console />
    </RequireAuth>
  );
}
