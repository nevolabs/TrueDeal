'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { api } from '@/lib/client';
import { useSession } from '@/lib/session-context';
import { useToast } from '@/lib/toast-context';

function KycForm() {
  const { user, refresh } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [legalName, setLegalName] = useState(user?.name || '');
  const [pan, setPan] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [bank, setBank] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [account, setAccount] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  if (user.kyc.status === 'verified') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h2 className="text-xl font-semibold">You are verified.</h2>
        <Link href="/sell/new" className="mt-3 inline-block text-sm underline">
          List an item
        </Link>
      </div>
    );
  }
  if (user.kyc.status === 'pending') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h2 className="text-xl font-semibold">Your details are with our team.</h2>
        <p className="mt-2 text-sm text-neutral-600">
          We will email you as soon as you are verified.{' '}
          <Link href="/selling" className="underline">
            Back to selling
          </Link>
        </p>
        <p className="mt-2 text-xs text-neutral-400">
          Prototype tip: sign in as the bench agent demo account to approve this.
        </p>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!legalName || !pan || !aadhaar || !bank || !ifsc || !account || !consent) {
      setError('Please fill in every field and tick the confirmation box.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/kyc', { legalName, pan, aadhaar, bank, ifsc, account });
      await refresh();
      toast('Details submitted for review.');
      router.push('/selling');
    } catch {
      setError('Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-semibold">Verify your identity</h1>
      <p className="mt-2 text-sm text-neutral-600">
        We verify every seller so that buyers know a real, traceable person stands behind each listing. Your
        details are never shown to buyers.
      </p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4 rounded-xl border border-neutral-200 p-5">
        <h2 className="text-sm font-semibold">Identity</h2>
        <label className="text-sm">
          Full name, as on your PAN card
          <input className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={legalName} onChange={(e) => setLegalName(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            PAN
            <input className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono uppercase" maxLength={10} placeholder="ABCDE1234F" value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} />
          </label>
          <label className="text-sm">
            Last 4 digits of Aadhaar
            <input className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono" maxLength={4} value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} />
          </label>
        </div>
        <h2 className="text-sm font-semibold">Bank account for payouts</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Bank
            <input className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" placeholder="e.g. HDFC Bank" value={bank} onChange={(e) => setBank(e.target.value)} />
          </label>
          <label className="text-sm">
            IFSC
            <input className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono uppercase" maxLength={11} placeholder="HDFC0001234" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} />
          </label>
        </div>
        <label className="text-sm">
          Account number
          <input className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono" value={account} onChange={(e) => setAccount(e.target.value)} />
        </label>
        <p className="text-xs text-neutral-500">
          We send ₹1 to this account to confirm the holder&apos;s name matches your PAN. Payouts only ever go to this
          account.
        </p>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          I confirm that I own the items I list and that these details are mine.
        </label>
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <button disabled={busy} className="rounded-full bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          Submit for verification
        </button>
      </form>
    </div>
  );
}

export default function SellVerifyPage() {
  return (
    <RequireAuth>
      <KycForm />
    </RequireAuth>
  );
}
