'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ListingCard from '@/components/ListingCard';
import { SearchIcon } from '@/components/icons';
import { CATEGORIES, CONDITIONS } from '@/lib/data';
import { api } from '@/lib/client';
import type { Listing } from '@/lib/types';

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="listing-image" />
      <div className="flex flex-col gap-2 pt-3">
        <div className="h-4 w-3/4 rounded bg-tint" />
        <div className="h-4 w-1/3 rounded bg-tint" />
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
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
    const timer = setTimeout(() => { api
      .get<{ listings: Listing[]; counts: Record<string, number>; categories: string[]; total: number }>(
        '/api/listings?' + qs
      )
      .then((d) => {
        if (!active) return;
        setError('');
        setListings(d.listings);
        setCounts(d.counts);
        setCategories(d.categories);
        setTotal(d.total);
      })
      .catch(e=>{ if (active) setError(e instanceof Error?e.message:'Listings are unavailable.'); })
      .finally(() => {
        if (!active) return;
        setLoadedOnce(true);
        setLoading(false);
      });
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [q, cat, cond, vault, sort, pathname, router]);

  function clearFilters() {
    setQ('');
    setCat('');
    setCond([]);
    setVault(false);
    setSort('new');
  }

  return (
    <div className="page-shell">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
        <div>
        <p className="eyebrow mb-3">Find your next upgrade</p>
        <h1 className="page-title">Browse</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare hardware by condition, specifications and price. The details make the difference.
        </p>
        </div>
        <button ref={filterTrigger} type="button" className="btn btn-secondary md:hidden" aria-expanded={filtersOpen} aria-controls="browse-filters" onClick={() => setFiltersOpen(value => !value)}>Filters and search</button>
      </div>
      <div className="grid gap-8 md:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-12">
        <aside id="browse-filters" aria-label="Listing filters" className={`${filtersOpen ? 'flex' : 'hidden'} flex-col gap-7 md:flex`} onKeyDown={event => { if (event.key === 'Escape' && filtersOpen) { setFiltersOpen(false); filterTrigger.current?.focus(); } }}>
          <label className="field-group flex items-center gap-2 rounded-lg border border-line-strong px-3 py-2 text-sm">
            <SearchIcon size={16} className="shrink-0 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search model or brand"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full outline-none field-bare"
              aria-label="Search listings"
            />
          </label>
          <div>
            <h2 className="mb-2 text-muted-foreground eyebrow">Category</h2>
            <div className="flex flex-col gap-1.5 text-sm">
              <label className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <input type="radio" name="category" checked={!cat} onChange={() => setCat('')} /> Everything
                </span>
                <em className="text-muted-foreground">{total}</em>
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
                    <span className={disabled ? 'text-neutral-400' : 'text-muted-foreground'}>{count}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-muted-foreground eyebrow">Condition</h2>
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
            <h2 className="mb-2 text-muted-foreground eyebrow">Availability</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={vault} onChange={(e) => setVault(e.target.checked)} />
              Already inspected and at our hub
            </label>
          </div>
        </aside>
        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
            <span className="text-sm text-muted-foreground" aria-live="polite">
              {loading ? 'Loading…' : `${listings.length} ${listings.length === 1 ? 'listing' : 'listings'}`}
            </span>
            {(q || cat || cond.length > 0 || vault || sort !== 'new') && <button type="button" className="btn btn-sm btn-secondary" onClick={clearFilters}>Clear filters</button>}
            <label className="flex items-center gap-2 text-sm">
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="">
                <option value="new">Newest</option>
                <option value="low">Price, low to high</option>
                <option value="high">Price, high to low</option>
              </select>
            </label>
          </div>
          {error ? <p role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</p> : loading && !loadedOnce ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : listings.length ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-3">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line-strong p-10 text-center">
              <h3 className="font-medium">Nothing matches those filters.</h3>
              <p className="mt-1 text-sm text-muted-foreground">
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
