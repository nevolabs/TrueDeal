import Image from 'next/image';
import Link from 'next/link';
import { CATEGORIES, CONDITIONS, inr } from '@/lib/data';
import type { Listing } from '@/lib/types';

export default function ListingCard({ listing }: { listing: Listing }) {
  const cond = CONDITIONS[listing.condition];
  return (
    <Link
      href={`/item/${listing.id}`}
      className="listing-card"
    >
      <div className="listing-image">
        {listing.img ? (
          <Image
            src={listing.img}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">No photo</div>
        )}
        {listing.mode === 'hub' && listing.report && (
          <span className="absolute left-2 top-2 rounded-md bg-success px-2 py-1 text-xs font-medium text-white">
            Already inspected
          </span>
        )}
      </div>
      <div className="listing-body">
        <div className="listing-meta mb-2 flex justify-between gap-2"><span>{CATEGORIES[listing.category]?.label}</span><span>{cond?.label}</span></div>
        <h3 className="listing-title line-clamp-2">{listing.title}</h3>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
          <span className="listing-price">{inr(listing.price)}</span>
          <span className="listing-meta text-right">{listing.city}</span>
        </div>
      </div>
    </Link>
  );
}
