'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import ListingForm from '@/components/ListingForm';
import { api } from '@/lib/client';
import { useSession } from '@/lib/session-context';
import type { Listing } from '@/lib/types';

function EditListing() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();
  const [result, setResult] = useState<{ id: string; listing?: Listing; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get<{ listing: Listing }>(`/api/listings/${encodeURIComponent(id)}`).then(({ listing }) => {
      if (!cancelled) setResult({ id, listing });
    }).catch((error: unknown) => {
      if (!cancelled) setResult({ id, error: error instanceof Error ? error.message : 'Could not load this listing.' });
    });
    return () => { cancelled = true; };
  }, [id]);

  if (!user || result?.id !== id) return <p role="status" className="page-shell">Loading listing…</p>;
  const listing = result.listing;
  const message = result.error || (!listing ? 'This listing is unavailable.'
    : listing.sellerId !== user.id ? 'You can only edit your own listings.'
    : listing.mode !== 'order' ? 'Hub listings cannot be edited here.'
    : !['pending', 'live', 'rejected', 'withdrawn'].includes(listing.status) ? 'This listing cannot be edited while a sale is in progress or after it has sold.' : '');

  if (message || !listing) return <div className="page-shell">
    <h1 className="page-title">Listing unavailable for editing</h1>
    <p role="alert" className="my-4 text-sm">{message}</p>
    <Link href="/selling" className="btn btn-secondary">Back to selling</Link>
  </div>;

  return <ListingForm key={listing.id} listing={listing} />;
}

export default function EditListingPage() {
  return <RequireAuth><EditListing /></RequireAuth>;
}
