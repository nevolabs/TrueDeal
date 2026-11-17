import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-neutral-500">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-sm">TrueDeal — a mock, non-production prototype. No real payments or KYC happen here.</div>
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Site</span>
              <Link href="/how-it-works" className="hover:text-neutral-800">Fees</Link>
              <Link href="/browse" className="hover:text-neutral-800">Browse</Link>
              <Link href="/sell" className="hover:text-neutral-800">Sell</Link>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Company</span>
              <Link href="/how-it-works#faq" className="hover:text-neutral-800">Support</Link>
              <span className="text-neutral-300" title="Not built in this prototype">About</span>
              <span className="text-neutral-300" title="Not built in this prototype">Contact</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Legal</span>
              <span className="text-neutral-300" title="Not built in this prototype">Terms</span>
              <span className="text-neutral-300" title="Not built in this prototype">Privacy</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
