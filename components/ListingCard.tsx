import Image from 'next/image';
import Link from 'next/link';
import { CONDITIONS, inr } from '@/lib/data';
import type { Listing } from '@/lib/types';

export default function ListingCard({ listing }: { listing: Listing }) {
  const cond = CONDITIONS[listing.condition];
  return (
    <Link
      href={`/item/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-neutral-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        {listing.img ? (
          <Image
            src={listing.img}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-400">No photo</div>
        )}
        {listing.mode === 'hub' && listing.report && (
          <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
            Already inspected
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="line-clamp-2 text-sm font-medium text-neutral-900">{listing.title}</div>
        <div className="text-base font-semibold text-neutral-900">{inr(listing.price)}</div>
        <div className="mt-auto flex items-center justify-between gap-2 text-xs">
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-600">{cond?.label}</span>
          <span className="text-neutral-500">{listing.city}</span>
        </div>
      </div>
    </Link>
  );
}
