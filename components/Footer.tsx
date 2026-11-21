import Link from 'next/link';

const FOOTER_LINK = 'inline-flex min-h-11 items-center text-[14.5px] text-muted-foreground hover:text-foreground hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-4 sm:min-h-8';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-background pb-12 pt-14 sm:pb-20">
      <div className="site-shell">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:gap-10">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex min-h-11 items-center text-2xl font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-4">TrueDeal</Link>
            <p className="mt-3 max-w-[26em] text-sm leading-6 text-muted-foreground">A marketplace for buying and selling pre-owned tech. Explore listings, find your next upgrade, or give your gear a new home.</p>
          </div>
          <nav aria-label="Marketplace">
            <h2 className="mb-3 font-sans text-[13px] font-semibold tracking-normal">Marketplace</h2>
            <ul>
              <li><Link href="/browse" className={FOOTER_LINK}>Browse listings</Link></li>
              <li><Link href="/sell" className={FOOTER_LINK}>Sell your gear</Link></li>
              <li><Link href="/how-it-works" className={FOOTER_LINK}>How it works</Link></li>
            </ul>
          </nav>
          <nav aria-label="Help">
            <h2 className="mb-3 font-sans text-[13px] font-semibold tracking-normal">Help</h2>
            <ul>
              <li><Link href="/how-it-works#faq" className={FOOTER_LINK}>Common questions</Link></li>
              <li><Link href="/how-it-works#fees" className={FOOTER_LINK}>Fees</Link></li>
            </ul>
          </nav>
          <div>
            <h2 className="mb-3 font-sans text-[13px] font-semibold tracking-normal">Legal</h2>
            <ul className="text-[14.5px] text-muted-foreground">
              <li className="py-2 sm:py-1">Terms <span className="text-xs">(unavailable)</span></li>
              <li className="py-2 sm:py-1">Privacy <span className="text-xs">(unavailable)</span></li>
            </ul>
          </div>
        </div>
        <p className="mt-11 border-t border-line pt-5 text-[13px] text-muted-foreground">TrueDeal · Make room for what’s next.</p>
      </div>
    </footer>
  );
}
