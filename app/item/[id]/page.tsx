'use client';

import { use, useEffect, useState } from 'react';
import ProductGallery from '@/components/ProductGallery';
import Link from 'next/link';
import ReportCard from '@/components/ReportCard';
import { CheckIcon, LockIcon, ShieldIcon, TruckIcon } from '@/components/icons';
import { CATEGORIES, CHECKS, CONDITIONS, FEES, age, benchFor, checklistFor, initials, shipFor, inr } from '@/lib/data';
import { api, ApiError } from '@/lib/client';
import { useSession } from '@/lib/session-context';
import type { Listing } from '@/lib/types';

interface Seller {
  id: string;
  name: string;
  city: string;
  deals: number;
  joined: number;
  verified: boolean;
}

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useSession();
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [error, setError] = useState('');
  const [wantsBench, setWantsBench] = useState(false);
  const [paymentsEnabled, setPaymentsEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get<{ listing: Listing; seller: Seller }>('/api/listings/' + id)
      .then((d) => {
        if (!active) return;
        setListing(d.listing);
        setSeller(d.seller);
      })
      .catch((e) => { if (active) setError(e instanceof ApiError ? e.message : 'Could not load that listing.'); });
    api.get<{ enabled: boolean }>('/api/payments/config').then(data => {
      if (active) setPaymentsEnabled(data.enabled);
    }).catch(() => { /* Checkout stays disabled until availability is confirmed. */ });
    return () => { active = false; };
  }, [id]);

  if (error) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">{error}</div>;
  }
  if (!listing || !seller) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Loading…</div>;
  }

  const mine = user?.id === listing.sellerId;
  const cond = CONDITIONS[listing.condition];
  const ship = shipFor(listing.category);
  const specs: [string, string][] = [
    ['Brand', listing.brand],
    ['Age', age(listing.ageMonths)],
    ['Warranty', listing.warranty],
    ['Original invoice', listing.invoice ? 'Yes' : 'No'],
    ['Original box', listing.box ? 'Yes' : 'No'],
    ...(listing.specs || []),
  ];

  let buyBox: React.ReactNode;
  if (listing.status === 'live' && mine) {
    buyBox = <div className="rounded-lg bg-tint p-3 text-sm text-muted-foreground">This is your listing. Buyers see this page.</div>;
  } else if (listing.status === 'live' && user?.role === 'ops') {
    buyBox = <div className="rounded-lg bg-tint p-3 text-sm text-muted-foreground">Bench accounts cannot buy.</div>;
  } else if (listing.status === 'live' && !paymentsEnabled) {
    buyBox = <div><button disabled className="btn btn-lg w-full">Checkout coming soon</button><p className="mt-2 text-sm text-muted-foreground">Payments are not available for this item yet.</p></div>;
  } else if (listing.status === 'live') {
    buyBox = (
      <Link
        href={`/checkout/${listing.id}${wantsBench ? '?tier=full' : ''}`}
        className="btn btn-lg w-full"
      >
        Buy with TrueDeal protection
      </Link>
    );
  } else if (listing.status === 'reserved') {
    buyBox = <button disabled className="w-full btn btn-lg">Reserved by a buyer</button>;
  } else if (listing.status === 'sold') {
    buyBox = <button disabled className="w-full btn btn-lg">Sold</button>;
  } else {
    buyBox = <div className="rounded-lg bg-tint p-3 text-sm text-muted-foreground">Status: {listing.status}. Not visible to buyers.</div>;
  }

  const how = !paymentsEnabled ? 'You can review the photos, specifications and seller details now. Checkout and its inspection options will be available after payment onboarding is complete.' :
    listing.mode === 'hub'
      ? 'This item is already at our hub. It has been inspected, sealed and is ready to ship the day you pay.'
      : listing.handover === 'onsite'
        ? `After you pay, our agent inspects it in person at the seller's address in ${listing.city}, seals it, and we ship it to you.`
        : `After you pay, the seller has ${FEES.handoverDays} days to get it to our hub. We inspect it and send you the report before it ships.`;

  return (
    <div className="page-shell">
      <nav className="mb-4 flex gap-2 text-sm text-muted-foreground">
        <Link href="/browse" className="hover:underline">Browse</Link>
        <span>/</span>
        <Link href={`/browse?cat=${listing.category}`} className="hover:underline">{CATEGORIES[listing.category].label}</Link>
      </nav>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
        <div className="flex flex-col gap-6">
          <ProductGallery images={listing.images?.length ? listing.images : listing.img ? [listing.img] : []} title={listing.title} />
          <section>
            <h2 className="mb-2 text-lg font-semibold">From the seller</h2>
            <p className="text-secondary-foreground">{listing.description}</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold">Details</h2>
            <table className="w-full text-sm">
              <tbody>
                {specs.map((r) => (
                  <tr key={r[0]} className="border-b border-line">
                    <th className="py-2 pr-4 text-left font-medium text-muted-foreground">{r[0]}</th>
                    <td className="py-2">{r[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          {listing.mode === 'hub' && listing.report ? (
            <section>
              <h2 className="mb-2 text-lg font-semibold">Inspection report</h2>
              <ReportCard report={listing.report} />
            </section>
          ) : (
            <section>
              <h2 className="mb-2 text-lg font-semibold">What we will check</h2>
              <p className="mb-3 text-sm text-muted-foreground">
                You choose the level at checkout. Either way, a TrueDeal technician handles the item before it ships
                and you receive the signed report.
              </p>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-medium">Look-and-feel check, included</h3>
                  <ul className="space-y-1.5 text-sm text-secondary-foreground">
                    {checklistFor(listing.category, 'basic').map((c) => (
                      <li key={c} className="flex items-start gap-2">
                        <CheckIcon size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 font-medium">Full bench test, +{inr(benchFor(listing.category))}</h3>
                  <ul className="space-y-1.5 text-sm text-secondary-foreground">
                    {(CHECKS[listing.category] || CHECKS.component).map((c) => (
                      <li key={c} className="flex items-start gap-2">
                        <CheckIcon size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-xl border border-line p-5">
            <div className="mb-2 flex gap-2 text-xs">
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">
                <CheckIcon size={12} /> Verified seller
              </span>
              <span className="rounded-full bg-tint px-2 py-1 text-secondary-foreground">{cond.label}</span>
            </div>
            <h1 className="font-display text-[30px] font-semibold leading-tight tracking-tight">{listing.title}</h1>
            <div className="mt-1 text-2xl font-semibold">{inr(listing.price)}</div>
            {listing.newPrice > listing.price && (
              <div className="text-xs text-muted-foreground">New, this sold for about {inr(listing.newPrice)}</div>
            )}
            <dl className="my-4 space-y-1 text-sm">
              <div className="flex justify-between"><dt>Item</dt><dd>{inr(listing.price)}</dd></div>
              <div className="flex justify-between"><dt>Shipping estimate</dt><dd>{inr(ship)}</dd></div>
              {listing.mode === 'hub' && listing.report ? (
                <>
                  <div className="flex justify-between"><dt>Full bench test</dt><dd>Already done</dd></div>
                  <div className="flex justify-between border-t border-line pt-1 font-medium"><dt>You pay</dt><dd>{inr(listing.price + ship)}</dd></div>
                </>
              ) : (
                <>
                  <div className="flex justify-between"><dt>Look-and-feel check</dt><dd>Included</dd></div>
                  <div className="flex justify-between"><dt>Full bench test</dt><dd>Optional, +{inr(benchFor(listing.category))}</dd></div>
                  <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-foreground">
                    <dt>You pay from</dt>
                    <dd>{inr(listing.price + ship + (wantsBench ? benchFor(listing.category) : 0))}</dd>
                  </div>
                </>
              )}
            </dl>
            {listing.status === 'live' && !mine && user?.role !== 'ops' && !(listing.mode === 'hub' && listing.report) && (
              <label className="mb-3 flex items-start gap-2 rounded-lg border border-line p-3 text-sm">
                <input type="checkbox" className="mt-0.5" checked={wantsBench} onChange={(e) => setWantsBench(e.target.checked)} />
                <span>
                  Add the full bench test <span className="text-muted-foreground">(+{inr(benchFor(listing.category))}, chosen at checkout)</span>
                </span>
              </label>
            )}
            {buyBox}
            <p className="mt-3 text-xs text-muted-foreground">{how}</p>
            {paymentsEnabled && <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <LockIcon size={14} className="shrink-0 text-muted-foreground" /> Held in escrow until you have had {FEES.inspectionHours} hours with it
              </li>
              <li className="flex items-center gap-2">
                <ShieldIcon size={14} className="shrink-0 text-muted-foreground" /> Full refund if it fails inspection
              </li>
              <li className="flex items-center gap-2">
                <TruckIcon size={14} className="shrink-0 text-muted-foreground" /> Tamper-sealed and insured in transit
              </li>
            </ul>}
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-line p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white">
              {initials(seller.name)}
            </span>
            <div className="text-sm">
              <div className="font-medium">
                {seller.name}{' '}
                {seller.verified && <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-success-surface px-2 py-0.5 text-xs text-success">
                  <CheckIcon size={11} /> ID verified
                </span>}
              </div>
              <div className="text-muted-foreground">
                {seller.city} · {seller.deals} completed {seller.deals === 1 ? 'deal' : 'deals'} · member since{' '}
                {new Date(seller.joined).getFullYear()}
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-tint p-4 text-sm">
            <strong>{cond.label}.</strong> {cond.note}
          </div>
        </aside>
      </div>
    </div>
  );
}
