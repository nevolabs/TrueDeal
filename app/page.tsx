'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import ListingCard from '@/components/ListingCard';
import ReportCard from '@/components/ReportCard';
import ProviderGrid from '@/components/ProviderGrid';
import { CheckIcon, ClockIcon, LockIcon, TruckIcon } from '@/components/icons';
import { FEES, benchFor, inr } from '@/lib/data';
import { api } from '@/lib/client';
import type { Listing } from '@/lib/types';

const STEPS = [
  ['Find your next upgrade', 'Browse by category, condition and price. Take a closer look at the photos and specifications.'],
  ['Get the full picture', 'Review the description, included accessories and seller details before making a decision.'],
  ['Make it yours', 'When checkout is available, the order page guides you through payment and the selected inspection service.'],
  ['Keep everything in view', 'Track the next steps, inspection reports and delivery updates from your account.'],
];

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [paymentsAvailable, setPaymentsAvailable] = useState<boolean | null>(null);

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
    api.get<{ enabled: boolean }>('/api/payments/config').then(data => {
      if (active) setPaymentsAvailable(data.enabled);
    }).catch(() => { /* Browsing remains available if checkout status cannot be loaded. */ });
    return () => { active = false; };
  }, []);

  const heroListing = listings.find(listing => listing.category === 'gpu' && listing.img) || listings.find(listing => listing.img);
  const sample = listings.find(listing => listing.report);

  return (
    <>
      <section className="home-hero">
        <div className="site-shell home-hero-inner">
          <div className="hero-content">
            <h1 className="hero-title">
              Used PC hardware,<br />inspected by hand<br />before it ships.
            </h1>
            <p className="hero-copy">
              Review the photos, condition and specifications before you commit. When checkout is available,
              choose the inspection service that checks the item before it ships.
            </p>
            <div className="hero-actions">
              <Link href="/browse" className="btn btn-lg btn-light">
                Browse listings →
              </Link>
              <Link href="/sell" className="btn btn-lg btn-inverse">
                Sell your hardware
              </Link>
            </div>
          </div>
          <div className="hero-art">
            {heroListing ? <Image src={heroListing.img} alt={heroListing.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" /> :
              <div className="flex h-full items-center justify-center text-neutral-300">Discover hardware on TrueDeal</div>}
          </div>
        </div>
        <ul className="site-shell hero-facts">
          <li className="flex items-center gap-2">
            <LockIcon size={16} /> Secure account sign-in
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon size={16} /> Clear condition details
          </li>
          <li className="flex items-center gap-2">
            <TruckIcon size={16} /> Shipping options by item
          </li>
          <li className="flex items-center gap-2">
            <ClockIcon size={16} /> One account, buy and sell
          </li>
        </ul>
      </section>

      <ProviderGrid />

      <section className="site-shell home-section">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">Something worth discovering</p>
            <h2 className="section-title">Recently listed</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Showing {listings.length} of {total} live listings
            </p>
          </div>
          <Link href="/browse" className="btn btn-secondary">
            Browse all →
          </Link>
        </div>
        {error && <p role="alert" className="mb-4 rounded-md bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
        {paymentsAvailable === false && <p className="mb-6 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted-foreground">Checkout is not available yet. You can browse the catalogue and prepare your seller account.</p>}
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </section>

      <section className="home-section border-y border-line bg-tint">
        <div className="site-shell">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="section-title">A little clarity, at every step.</h2>
            <Link href="/how-it-works" className="text-sm underline">
              Fees and the full process
            </Link>
          </div>
          <ol className="grid gap-6 border-t border-line-strong pt-7 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={i} className="min-w-0">
                <span className="mb-5 block font-display text-base font-semibold text-muted-foreground">
                  0{i + 1}
                </span>
                <div>
                  <h3 className="font-medium">{s[0]}</h3>
                  <p className="text-sm text-muted-foreground">{s[1]}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {sample?.report && (
        <section className="grid gap-8 home-section md:grid-cols-2 md:items-center site-shell">
          <div>
            <h2 className="section-title">The details, documented.</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              This is the report for {sample.title}. The technician records the serial number, the
              result of each check and anything they noticed, including scratches and wear.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
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

      <section className="home-section bg-night text-white">
        <div className="site-shell">
          <h2 className="section-title">Clear pricing, before you commit.</h2>
          <p className="mt-1 text-sm text-white/70">
            No subscription and no listing fee. These fees apply when checkout is available.
          </p>
          <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="font-medium">Buyers</dt>
              <dd className="text-sm text-white/70">
                Listed price and insured shipping, with a look-and-feel check included.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Full bench test</dt>
              <dd className="text-sm text-white/70">
                Optional, chosen at checkout. From {inr(benchFor('mouse'))} for a mouse to {inr(benchFor('desktop'))} for a
                desktop build.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Sellers</dt>
              <dd className="text-sm text-white/70">
                {FEES.commissionRate * 100}% of the sale price (minimum {inr(FEES.commissionMin)}), charged only when
                the deal completes.
              </dd>
            </div>
            <div>
              <dt className="font-medium">If it fails inspection</dt>
              <dd className="text-sm text-white/70">The buyer is refunded in full. The item goes back to the seller.</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="flex flex-col items-start justify-between gap-6 home-section md:flex-row md:items-center site-shell">
        <div>
          <h2 className="section-title">Make room for your next upgrade.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start with your seller profile. Add clear photos, an honest description and a price that works for you.
          </p>
        </div>
        <Link href="/sell" className="btn btn-lg">
          Start selling →
        </Link>
      </section>
    </>
  );
}
