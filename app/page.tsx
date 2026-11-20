'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import ListingCard from '@/components/ListingCard';
import ReportCard from '@/components/ReportCard';
import { CheckIcon, ClockIcon, LockIcon, TruckIcon } from '@/components/icons';
import { FEES, PARTNERS, benchFor, inr } from '@/lib/data';
import { api } from '@/lib/client';
import type { Listing } from '@/lib/types';

const STEPS = [
  ['You pay into escrow', 'Your money is held by our payment partner. The seller can see that you have paid, but cannot withdraw it yet.'],
  ['The seller hands it over', 'They courier it to our hub in Bengaluru within three days. If they prefer, our agent visits them to inspect and collect it.'],
  ['We inspect it', 'Every item gets a look-and-feel check by hand. You can add a full bench test at checkout. You see the report before the item ships.'],
  ['You check it, then the seller is paid', 'It ships sealed and insured. You have 48 hours to check it. If you raise nothing in that time, the payment is released.'],
];

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get<{ listings: Listing[]; total: number }>('/api/listings').then((d) => {
      if (!active) return;
      const featured = [...d.listings]
        .sort((a, b) => Number(b.mode === 'hub') - Number(a.mode === 'hub') || b.price - a.price)
        .slice(0, 8);
      setListings(featured);
      setTotal(d.total);
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : 'Listings are temporarily unavailable.');
    });
    return () => { active = false; };
  }, []);

  const sample = listings.find((l) => l.id === 'l_gpu');

  return (
    <>
      <section className="bg-neutral-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
              Used PC hardware, inspected by hand before it ships.
            </h1>
            <p className="mt-4 text-neutral-300">
              Your payment waits in escrow while a TrueDeal technician checks the item against its listing. The
              seller is paid only after you have had it for 48 hours.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/browse" className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-neutral-900">
                Browse listings →
              </Link>
              <Link href="/sell" className="rounded-full border border-white/40 px-5 py-2.5 text-sm font-medium">
                Sell your hardware
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            <Image src="/img/gpu.jpg" alt="Two graphics cards on a dark surface" fill className="object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <ul className="grid grid-cols-2 gap-3 text-sm text-neutral-600 md:grid-cols-4">
          <li className="flex items-center gap-2">
            <LockIcon size={16} className="shrink-0 text-neutral-400" /> Payment held in escrow
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon size={16} className="shrink-0 text-neutral-400" /> Every item inspected by hand
          </li>
          <li className="flex items-center gap-2">
            <TruckIcon size={16} className="shrink-0 text-neutral-400" /> Sealed and insured in transit
          </li>
          <li className="flex items-center gap-2">
            <ClockIcon size={16} className="shrink-0 text-neutral-400" /> 48 hours to check it yourself
          </li>
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">In partnership with</h2>
        <p className="mb-4 text-sm text-neutral-500">
          Your money, the parcel and the seller&apos;s identity are each handled by a specialist. This is a mock
          prototype — these are not live integrations.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(['Payments', 'Identity', 'Courier', 'Insurance'] as const).map((category) => (
            <div key={category}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{category}</h3>
              <ul className="space-y-1 text-sm text-neutral-700">
                {PARTNERS.filter((p) => p.category === category).map((p) => (
                  <li key={p.name}>{p.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold">Recently listed</h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              Showing {listings.length} of {total} live listings
            </p>
          </div>
          <Link href="/browse" className="text-sm underline">
            Browse all →
          </Link>
        </div>
        {error && <p role="alert" className="mb-4 rounded-md bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </section>

      <section className="bg-neutral-50 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">How a deal works</h2>
            <Link href="/how-it-works" className="text-sm underline">
              Fees and the full process
            </Link>
          </div>
          <ol className="grid gap-6 md:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-medium">{s[0]}</h3>
                  <p className="text-sm text-neutral-600">{s[1]}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {sample?.report && (
        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-xl font-semibold">Every order comes with an inspection report</h2>
            <p className="mt-3 text-sm text-neutral-600">
              This is the report for the RTX 2080 Ti listed above. The technician records the serial number, the
              result of each check and anything they noticed, including scratches and wear.
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              You see the report before the item ships. If the item does not match its listing, the order is
              cancelled and you get all your money back.
            </p>
            <Link href="/how-it-works#checks" className="mt-4 inline-block text-sm underline">
              What we check →
            </Link>
          </div>
          <ReportCard report={sample.report} />
        </section>
      )}

      <section className="bg-neutral-900 py-12 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-xl font-semibold">What it costs</h2>
          <p className="mt-1 text-sm text-neutral-400">
            No subscription and no listing fee. Sellers pay only when something sells.
          </p>
          <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="font-medium">Buyers</dt>
              <dd className="text-sm text-neutral-400">
                Listed price and insured shipping, with a look-and-feel check included.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Full bench test</dt>
              <dd className="text-sm text-neutral-400">
                Optional, chosen at checkout. From {inr(benchFor('mouse'))} for a mouse to {inr(benchFor('desktop'))} for a
                desktop build.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Sellers</dt>
              <dd className="text-sm text-neutral-400">
                {FEES.commissionRate * 100}% of the sale price (minimum {inr(FEES.commissionMin)}), charged only when
                the deal completes.
              </dd>
            </div>
            <div>
              <dt className="font-medium">If it fails inspection</dt>
              <dd className="text-sm text-neutral-400">The buyer is refunded in full. The item goes back to the seller.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-semibold">Selling a graphics card, laptop or camera?</h2>
          <p className="mt-2 text-sm text-neutral-600">
            The buyer pays into escrow before you hand anything over, and you are paid once they have had the item
            for 48 hours.
          </p>
        </div>
        <Link href="/sell" className="whitespace-nowrap rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white">
          Start selling →
        </Link>
      </section>
    </>
  );
}
