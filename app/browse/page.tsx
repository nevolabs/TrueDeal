'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ListingCard from '@/components/ListingCard';
import { SearchIcon } from '@/components/icons';
import { CATEGORIES, CONDITIONS } from '@/lib/data';
import { api } from '@/lib/client';
import type { Listing } from '@/lib/types';

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="aspect-[4/3] w-full bg-neutral-100" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-4 w-3/4 rounded bg-neutral-100" />
        <div className="h-4 w-1/3 rounded bg-neutral-100" />
      </div>
    </div>
  );
}

function BrowseInner() {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(search.get('q') || '');
  const [cat, setCat] = useState(search.get('cat') || '');
  const [cond, setCond] = useState<string[]>(search.getAll('cond'));
  const [vault, setVault] = useState(search.get('vault') === '1');
  const [sort, setSort] = useState(search.get('sort') || 'new');
  const [listings, setListings] = useState<Listing[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error,setError]=useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (cat) params.set('cat', cat);
    if (vault) params.set('vault', '1');
    if (q) params.set('q', q);
    if (sort && sort !== 'new') params.set('sort', sort);
    cond.forEach((c) => params.append('cond', c));
    const qs = params.toString();

    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });

    // eslint-disable-next-line react-hooks/set-state-in-effect -- filter change triggers a refetch
    setLoading(true);
    api
      .get<{ listings: Listing[]; counts: Record<string, number>; categories: string[]; total: number }>(
        '/api/listings?' + qs
      )
      .then((d) => {
        setError('');
        setListings(d.listings);
        setCounts(d.counts);
        setCategories(d.categories);
        setTotal(d.total);
      })
      .catch(e=>setError(e instanceof Error?e.message:'Listings are unavailable.'))
      .finally(() => {
        setLoadedOnce(true);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cat, cond, vault, sort]);

  function clearFilters() {
    setQ('');
    setCat('');
    setCond([]);
    setVault(false);
    setSort('new');
  }

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
          <label className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-neutral-900">
            <SearchIcon size={16} className="shrink-0 text-neutral-400" />
            <input
              type="search"
              placeholder="Search model or brand"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full outline-none"
              aria-label="Search listings"
            />
          </label>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Category</h2>
            <div className="flex flex-col gap-1.5 text-sm">
              <label className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <input type="radio" name="category" checked={!cat} onChange={() => setCat('')} /> Everything
                </span>
                <em className="text-neutral-400">{total}</em>
              </label>
              {categories.map((k) => {
                const count = counts[k] || 0;
                const disabled = count === 0 && cat !== k;
                return (
                  <label
                    key={k}
                    className={`flex items-center justify-between ${disabled ? 'cursor-not-allowed text-neutral-300' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="category"
                        checked={cat === k}
                        disabled={disabled}
                        onChange={() => setCat(k)}
                      />{' '}
                      {CATEGORIES[k].label}
                    </span>
                    <em className={disabled ? 'text-neutral-300' : 'text-neutral-400'}>{count}</em>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Condition</h2>
            <div className="flex flex-col gap-1.5 text-sm">
              {Object.keys(CONDITIONS).map((k) => (
                <label key={k} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label={CONDITIONS[k].label}
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
            <span className="text-sm text-neutral-500" aria-live="polite">
              {loading ? 'Loading…' : `${listings.length} ${listings.length === 1 ? 'listing' : 'listings'}`}
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
          {error ? <p role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</p> : loading && !loadedOnce ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : listings.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center">
              <h3 className="font-medium">Nothing matches those filters.</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Stock is small while we onboard sellers.{' '}
                <button onClick={clearFilters} className="underline hover:text-neutral-900">
                  Clear filters
                </button>
              </p>
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
