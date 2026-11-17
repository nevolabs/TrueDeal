'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ListingCard from '@/components/ListingCard';
import { CATEGORIES, CONDITIONS } from '@/lib/data';
import { api } from '@/lib/client';
import type { Listing } from '@/lib/types';

function BrowseInner() {
  const search = useSearchParams();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(search.get('cat') || '');
  const [cond, setCond] = useState<string[]>([]);
  const [vault, setVault] = useState(search.get('vault') === '1');
  const [sort, setSort] = useState('new');
  const [listings, setListings] = useState<Listing[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams();
    if (cat) params.set('cat', cat);
    if (vault) params.set('vault', '1');
    if (q) params.set('q', q);
    if (sort) params.set('sort', sort);
    cond.forEach((c) => params.append('cond', c));
    api
      .get<{ listings: Listing[]; counts: Record<string, number>; total: number }>('/api/listings?' + params.toString())
      .then((d) => {
        setListings(d.listings);
        setCounts(d.counts);
        setTotal(d.total);
      });
  }, [q, cat, cond, vault, sort]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Browse</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Every listing here comes from a seller whose identity and bank account we have verified.
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="flex flex-col gap-6">
          <label className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
            <span>🔍</span>
            <input
              type="search"
              placeholder="Search model or brand"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full outline-none"
            />
          </label>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Category</h2>
            <div className="flex flex-col gap-1.5 text-sm">
              <label className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <input type="radio" checked={!cat} onChange={() => setCat('')} /> Everything
                </span>
                <em className="text-neutral-400">{total}</em>
              </label>
              {Object.keys(CATEGORIES)
                .filter((k) => counts[k])
                .map((k) => (
                  <label key={k} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <input type="radio" checked={cat === k} onChange={() => setCat(k)} /> {CATEGORIES[k].label}
                    </span>
                    <em className="text-neutral-400">{counts[k]}</em>
                  </label>
                ))}
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Condition</h2>
            <div className="flex flex-col gap-1.5 text-sm">
              {Object.keys(CONDITIONS).map((k) => (
                <label key={k} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cond.includes(k)}
                    onChange={(e) =>
                      setCond((c) => (e.target.checked ? [...c, k] : c.filter((x) => x !== k)))
                    }
                  />
                  {CONDITIONS[k].label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Availability</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={vault} onChange={(e) => setVault(e.target.checked)} />
              Already inspected and at our hub
            </label>
          </div>
        </aside>
        <div>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-neutral-500">
              {listings.length} {listings.length === 1 ? 'listing' : 'listings'}
            </span>
            <label className="flex items-center gap-2 text-sm">
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-md border border-neutral-200 px-2 py-1">
                <option value="new">Newest</option>
                <option value="low">Price, low to high</option>
                <option value="high">Price, high to low</option>
              </select>
            </label>
          </div>
          {listings.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center">
              <h3 className="font-medium">Nothing matches those filters.</h3>
              <p className="mt-1 text-sm text-neutral-500">Stock is small while we onboard sellers.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowseInner />
    </Suspense>
  );
}
