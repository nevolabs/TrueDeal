'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CATEGORIES, FEES, benchFor, fee, inr } from '@/lib/data';
import { useSession } from '@/lib/session-context';
import { sellerReady } from '@/lib/seller-validation';

export default function SellLanding() {
  const { user, loading } = useSession();
  const [price, setPrice] = useState('30000');
  const [onSiteVisit, setOnSiteVisit] = useState(false);
  const priceNum = Number(price) || 0;
  const feeAmt = useMemo(() => (priceNum ? fee(priceNum) : 0), [priceNum]);
  const visitFee = onSiteVisit ? FEES.visitFee : 0;
  const belowMin = priceNum > 0 && priceNum < FEES.minPrice;

  const next = loading
    ? '#'
    : !user
      ? '/login?mode=join&next=' + encodeURIComponent('/selling')
      : sellerReady(user.kyc)
        ? '/sell/new'
        : '/sell/verify';
  const cta = !user ? 'Create a seller account' : sellerReady(user.kyc) ? 'List an item' : 'Complete seller details';

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-10 md:grid-cols-2 md:items-start">
        <div>
          <h1 className="page-title">Sell your hardware on TrueDeal</h1>
          <p className="mt-3 text-muted-foreground">
            The buyer pays into escrow before you send anything, so you never chase a payment or meet a stranger to
            hand it over. You are paid 48 hours after the item is delivered.
          </p>
          <Link
            href={next}
            className="mt-5 btn btn-lg"
          >
            {cta} →
          </Link>
        </div>
        <div className="rounded-xl border border-line p-5">
          <h2 className="mb-3 text-sm font-semibold">Work out your payout</h2>
          <label className="text-sm">
            Sale price
            <div className="mt-1 flex items-center rounded-md border border-line-strong px-3 py-2">
              <span className="mr-1 text-muted-foreground">₹</span>
              <input
                type="number"
                min={FEES.minPrice}
                step={500}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full outline-none field-bare"
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
              <dt>TrueDeal fee ({FEES.commissionRate * 100}%, min {inr(FEES.commissionMin)})</dt>
              <dd>− {inr(feeAmt)}</dd>
            </div>
            {onSiteVisit && (
              <div className="flex justify-between">
                <dt>On-site visit</dt>
                <dd>− {inr(visitFee)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-1 font-medium">
              <dt>Paid to your bank</dt>
              <dd>{belowMin || price === '' ? '—' : inr(Math.max(0, priceNum - feeAmt - visitFee))}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            The buyer pays shipping. You pay nothing unless the item sells.
          </p>
        </div>
      </div>

      <ol className="mt-12 grid gap-6 sm:grid-cols-3">
        {[
          ['Complete seller details', 'Add your legal name, PAN and a bank account in your own name. Basic format and consistency checks let you start listing; they are not identity or bank verification.'],
          ['List the item', 'Mention scratches, faults and missing parts. The technician checks the item against what you write, so an accurate listing gets through fastest.'],
          ['Hand it over', `When it sells, courier it to our hub, or pay ${inr(FEES.visitFee)} for our agent to collect it from you. You are paid 48 hours after delivery.`],
        ].map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white">
              {i + 1}
            </span>
            <div>
              <h2 className="font-medium">{s[0]}</h2>
              <p className="text-sm text-muted-foreground">{s[1]}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">What you&apos;d take home</h2>
        <p className="mt-1 text-sm text-muted-foreground">A few example sale prices, after the TrueDeal fee.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-tint text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Sale price</th>
                <th className="px-4 py-2">TrueDeal fee</th>
                <th className="px-4 py-2">You receive</th>
              </tr>
            </thead>
            <tbody>
              {[6000, 15000, 30000, 80000, 150000].map((p) => (
                <tr key={p} className="border-t border-line">
                  <td className="px-4 py-2">{inr(p)}</td>
                  <td className="px-4 py-2 text-muted-foreground">− {inr(fee(p))}</td>
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
            <details key={q} className="rounded-lg border border-line p-4">
              <summary className="cursor-pointer font-medium">{q}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
