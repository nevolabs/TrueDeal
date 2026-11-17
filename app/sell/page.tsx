'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CATEGORIES, FEES, benchFor, fee, inr } from '@/lib/data';
import { useSession } from '@/lib/session-context';

export default function SellLanding() {
  const { user, loading } = useSession();
  const [price, setPrice] = useState(30000);
  const [onSiteVisit, setOnSiteVisit] = useState(false);
  const feeAmt = useMemo(() => (price ? fee(price) : 0), [price]);
  const visitFee = onSiteVisit ? FEES.visitFee : 0;
  const belowMin = price > 0 && price < FEES.minPrice;

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
          <Link
            href={next}
            className="mt-5 inline-block rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
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
          {belowMin && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Minimum price is {inr(FEES.minPrice)} — below that, the inspection would cost more than it protects.
            </p>
          )}
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onSiteVisit} onChange={(e) => setOnSiteVisit(e.target.checked)} />
            Our agent visits me instead of me shipping it (+{inr(FEES.visitFee)}, deducted from payout)
          </label>
          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>sell.io fee ({FEES.commissionRate * 100}%, min {inr(FEES.commissionMin)})</dt>
              <dd>− {inr(feeAmt)}</dd>
            </div>
            {onSiteVisit && (
              <div className="flex justify-between">
                <dt>On-site visit</dt>
                <dd>− {inr(visitFee)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-neutral-200 pt-1 font-medium">
              <dt>Paid to your bank</dt>
              <dd>{belowMin ? '—' : inr(Math.max(0, price - feeAmt - visitFee))}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-neutral-500">
            The buyer pays shipping. You pay nothing unless the item sells.
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

      <section className="mt-12">
        <h2 className="text-lg font-semibold">What you&apos;d take home</h2>
        <p className="mt-1 text-sm text-neutral-600">A few example sale prices, after the sell.io fee.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-2">Sale price</th>
                <th className="px-4 py-2">sell.io fee</th>
                <th className="px-4 py-2">You receive</th>
              </tr>
            </thead>
            <tbody>
              {[6000, 15000, 30000, 80000, 150000].map((p) => (
                <tr key={p} className="border-t border-neutral-100">
                  <td className="px-4 py-2">{inr(p)}</td>
                  <td className="px-4 py-2 text-neutral-500">− {inr(fee(p))}</td>
                  <td className="px-4 py-2 font-medium">{inr(p - fee(p))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Questions sellers ask</h2>
        <div className="mt-4 space-y-3">
          {[
            [
              'What if my item fails inspection?',
              'The buyer is refunded in full and the item is returned to you. If you chose an on-site visit, that fee is still due since the agent already made the trip.',
            ],
            [
              'Can I sell something below the minimum price?',
              `No — listings start at ${inr(FEES.minPrice)}. Below that, the cost of inspecting the item exceeds what it protects, so we can't accept the listing.`,
            ],
            [
              `Why does the ${CATEGORIES.desktop.label.toLowerCase()} bench test cost more than a ${CATEGORIES.mouse.label.toLowerCase()}'s?`,
              `Bench test pricing scales with how long the check takes: ${inr(benchFor('mouse'))} for a mouse up to ${inr(benchFor('desktop'))} for a full desktop build.`,
            ],
          ].map(([q, a]) => (
            <details key={q} className="rounded-lg border border-neutral-200 p-4">
              <summary className="cursor-pointer font-medium">{q}</summary>
              <p className="mt-2 text-sm text-neutral-600">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
