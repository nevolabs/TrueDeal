'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FEES, fee, inr } from '@/lib/data';
import { useSession } from '@/lib/session-context';

export default function SellLanding() {
  const { user, loading } = useSession();
  const [price, setPrice] = useState(30000);
  const feeAmt = useMemo(() => (price ? fee(price) : 0), [price]);

  const next = loading
    ? '#'
    : !user
      ? '/login?mode=join&next=' + encodeURIComponent('/selling')
      : user.kyc.status === 'verified'
        ? '/sell/new'
        : '/sell/verify';
  const cta = !user ? 'Create a seller account' : user.kyc.status === 'verified' ? 'List an item' : 'Verify your identity';

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-10 md:grid-cols-2 md:items-start">
        <div>
          <h1 className="text-2xl font-semibold">Sell your hardware on sell.io</h1>
          <p className="mt-3 text-neutral-600">
            The buyer pays into escrow before you send anything, so you never chase a payment or meet a stranger to
            hand it over. You are paid 48 hours after the item is delivered.
          </p>
          <Link href={next} className="mt-5 inline-block rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white">
            {cta} →
          </Link>
        </div>
        <div className="rounded-xl border border-neutral-200 p-5">
          <h2 className="mb-3 text-sm font-semibold">Work out your payout</h2>
          <label className="text-sm">
            Sale price
            <div className="mt-1 flex items-center rounded-md border border-neutral-300 px-3 py-2">
              <span className="mr-1 text-neutral-400">₹</span>
              <input
                type="number"
                min={FEES.minPrice}
                step={500}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value) || 0)}
                className="w-full outline-none"
              />
            </div>
          </label>
          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>sell.io fee ({FEES.commissionRate * 100}%, min {inr(FEES.commissionMin)})</dt>
              <dd>− {inr(feeAmt)}</dd>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-1 font-medium">
              <dt>Paid to your bank</dt>
              <dd>{inr(Math.max(0, price - feeAmt))}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-neutral-500">
            The buyer pays shipping. You pay nothing unless the item sells. Would rather not post it? Our agent can
            inspect and collect it from you for {inr(FEES.visitFee)}.
          </p>
        </div>
      </div>

      <ol className="mt-12 grid gap-6 sm:grid-cols-3">
        {[
          ['Verify your identity', 'Your PAN and a bank account in your own name. It takes a few minutes, and it keeps stolen goods off the site.'],
          ['List the item', 'Mention scratches, faults and missing parts. The technician checks the item against what you write, so an accurate listing gets through fastest.'],
          ['Hand it over', `When it sells, courier it to our hub, or pay ${inr(FEES.visitFee)} for our agent to collect it from you. You are paid 48 hours after delivery.`],
        ].map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white">
              {i + 1}
            </span>
            <div>
              <h2 className="font-medium">{s[0]}</h2>
              <p className="text-sm text-neutral-600">{s[1]}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
