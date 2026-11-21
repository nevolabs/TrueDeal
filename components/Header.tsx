'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/lib/session-context';
import { useToast } from '@/lib/toast-context';
import { getBrandLogoUrl } from '@/lib/public-assets';

const NAV_LINK = 'inline-flex min-h-11 items-center border-b text-[14.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-4';

export default function Header() {
  const { user, loading, signOut } = useSession();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [disclosure, setDisclosure] = useState<'navigation' | 'account' | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const navigationTrigger = useRef<HTMLButtonElement>(null);
  const accountTrigger = useRef<HTMLButtonElement>(null);
  const logoUrl = getBrandLogoUrl();
  const primaryLinks = [
    { href: '/browse', label: 'Browse' },
    { href: '/how-it-works', label: 'How it works' },
    { href: '/sell', label: 'Sell' },
  ];
  const memberLinks = !loading && user ? [
      { href: '/orders', label: 'Orders' },
      { href: '/selling', label: 'Selling' },
      ...(user.role === 'ops' ? [{ href: '/ops', label: 'Ops' }] : []),
    ] : [];

  useEffect(() => {
    if (!disclosure) return;
    const dismiss = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setDisclosure(null);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [disclosure]);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      setDisclosure(null);
      toast('Signed out.');
      router.push('/');
    } catch {
      toast('Could not sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const renderLinks = (links: typeof primaryLinks, mobile = false) => links.map(({ href, label }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? 'page' : undefined}
        onClick={() => setDisclosure(null)}
        className={`${NAV_LINK} ${isHome
          ? active ? 'border-white text-white' : 'border-transparent text-white/70 hover:border-white hover:text-white'
          : active ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:border-foreground hover:text-foreground'} ${mobile ? 'w-full py-2' : ''}`}
      >
        {label}
      </Link>
    );
  });

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-40 border-b ${isHome ? 'site-header--dark border-white/10 bg-[#0b0c0f] text-white' : 'border-line bg-background'}`}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !disclosure) return;
        event.preventDefault();
        (disclosure === 'navigation' ? navigationTrigger : accountTrigger).current?.focus();
        setDisclosure(null);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDisclosure(null);
      }}
    >
      <div className="site-shell flex h-14 items-center gap-4 lg:h-16 lg:gap-10">
        <Link href="/" aria-label="TrueDeal home" onClick={() => setDisclosure(null)} className={`shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-4 ${isHome ? 'bg-background px-2' : ''}`}>
          {logoUrl ? (
            <Image src={logoUrl} alt="TrueDeal" width={2172} height={724} sizes="(min-width: 1024px) 156px, 132px" className="h-11 w-[132px] object-contain lg:h-[52px] lg:w-[156px]" loading="eager" />
          ) : <span className="text-xl font-semibold tracking-tight">TrueDeal</span>}
        </Link>
        <nav aria-label="Main navigation" className="hidden flex-1 items-center gap-7 lg:flex">
          {renderLinks(primaryLinks)}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0 lg:gap-[22px]">
          {memberLinks.length > 0 && <nav aria-label="Your marketplace" className="hidden items-center gap-[22px] lg:flex">{renderLinks(memberLinks)}</nav>}
          <button
            ref={navigationTrigger}
            type="button"
            aria-label="Navigation menu"
            aria-expanded={disclosure === 'navigation'}
            aria-controls="mobile-navigation"
            onClick={() => setDisclosure(disclosure === 'navigation' ? null : 'navigation')}
            className={`btn w-11 px-0 sm:w-auto sm:px-4 lg:hidden ${isHome ? 'btn-inverse' : 'btn-secondary'}`}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={disclosure === 'navigation' ? 'm6 6 12 12M6 18 18 6' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
            <span className="hidden sm:inline">Menu</span>
          </button>
          {!loading && user && (
            <div className={`flex items-center gap-3 lg:border-l lg:pl-[22px] ${isHome ? 'border-white/15' : 'border-line'}`}>
            <div className="relative">
              <button
                ref={accountTrigger}
                type="button"
                aria-label={`Account for ${user.name}`}
                aria-expanded={disclosure === 'account'}
                aria-controls="account-disclosure"
                onClick={() => setDisclosure(disclosure === 'account' ? null : 'account')}
                className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-4"
              >
                <span className={`flex h-[30px] w-[30px] items-center justify-center rounded-full border font-mono text-[11px] font-medium ${isHome ? 'border-white/20 bg-white/10 text-white' : 'border-line bg-tint text-secondary-foreground'}`}>
                {user.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('') || 'Me'}
                </span>
              </button>
              <div id="account-disclosure" hidden={disclosure !== 'account'} className="absolute right-0 top-full mt-3 w-64 max-w-[calc(100vw-32px)] rounded-lg border border-line bg-surface p-4 text-foreground shadow-lg">
                <p className="break-words text-sm font-medium">{user.name}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">{user.email}</p>
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={handleSignOut}
                  className="btn btn-secondary mt-4 w-full"
                >
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
            <button type="button" disabled={signingOut} onClick={handleSignOut} className={`hidden min-h-11 items-center whitespace-nowrap text-[14.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-4 disabled:opacity-60 lg:inline-flex ${isHome ? 'text-white/70 hover:text-white' : 'text-muted-foreground hover:text-foreground'}`}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
            </div>
          )}
          {!loading && !user && pathname !== '/login' && <Link href="/login" onClick={() => setDisclosure(null)} className={`btn ${isHome ? 'btn-light' : ''}`}>Sign in</Link>}
        </div>
      </div>
      <nav id="mobile-navigation" aria-label="Mobile navigation" hidden={disclosure !== 'navigation'} className={`border-t lg:hidden ${isHome ? 'border-white/10' : 'border-line'}`}>
        <div className="site-shell grid gap-1 py-4">{renderLinks([...primaryLinks, ...memberLinks], true)}</div>
      </nav>
    </header>
  );
}
