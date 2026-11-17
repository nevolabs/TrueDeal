import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-neutral-500">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>sell.io — a mock, non-production prototype. No real payments or KYC happen here.</div>
          <div className="flex gap-4">
            <Link href="/protection" className="hover:text-neutral-800">
              Fees
            </Link>
            <Link href="/browse" className="hover:text-neutral-800">
              Browse
            </Link>
            <Link href="/sell" className="hover:text-neutral-800">
              Sell
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
