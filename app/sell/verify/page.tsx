'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import { useSession } from '@/lib/session-context';
import { api } from '@/lib/client';
import { sellerReady, validateSellerDetails } from '@/lib/seller-validation';

function Form() {
  const { user, refresh } = useSession();
  const router = useRouter();
  const [legalName, setLegalName] = useState('');
  const [pan, setPan] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  if (sellerReady(user.kyc)) return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="page-title">Ready to list</h1>
      <p className="my-3 text-sm">Your seller details are complete. You can now submit an item for listing review.</p>
      <Link className="btn" href="/sell/new">List an item</Link>
    </div>
  );

  return (
    <form className="mx-auto my-12 max-w-lg px-4" aria-busy={busy} onSubmit={async (event) => {
      event.preventDefault();
      if (busy) return;
      setError('');
      try {
        const details = validateSellerDetails({ legalName, pan, accountNumber, confirmAccountNumber, ifsc, accountHolder });
        setBusy(true);
        await api.post('/api/kyc', details);
        await refresh();
        router.push('/sell/new');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save your details. Please retry.');
      } finally {
        setBusy(false);
      }
    }}>
      <h1 className="page-title">Your seller details</h1>
      <p className="mb-6 mt-3 text-sm text-muted-foreground">Complete these basic checks to start listing. They check the format and consistency of your details; they do not verify your identity or bank account.</p>
      <p className="mb-6 text-xs text-muted-foreground">Your full PAN and account number are not stored. We retain only their last four characters and your IFSC. Payment provider onboarding is a separate requirement before payouts.</p>
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
        <legend className="sr-only">Required seller details</legend>
        <p className="text-xs text-muted-foreground">All fields are required. Use your own PAN and bank account.</p>
        <label className="text-sm">Legal name
          <input required minLength={2} maxLength={100} autoComplete="name" className="mt-1 w-full" value={legalName} onChange={(event) => setLegalName(event.target.value)} />
        </label>
        <label className="text-sm">PAN
          <input required maxLength={10} autoCapitalize="characters" autoComplete="off" spellCheck={false} className="mt-1 w-full font-mono" value={pan} onChange={(event) => setPan(event.target.value.toUpperCase())} />
        </label>
        <label className="text-sm">Bank account number
          <input required type="password" inputMode="numeric" autoComplete="off" maxLength={18} className="mt-1 w-full" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} />
        </label>
        <label className="text-sm">Confirm bank account number
          <input required type="text" inputMode="numeric" autoComplete="off" maxLength={18} className="mt-1 w-full" value={confirmAccountNumber} onChange={(event) => setConfirmAccountNumber(event.target.value)} />
        </label>
        <label className="text-sm">IFSC
          <input required maxLength={11} autoCapitalize="characters" autoComplete="off" spellCheck={false} className="mt-1 w-full font-mono" value={ifsc} onChange={(event) => setIfsc(event.target.value.toUpperCase())} />
        </label>
        <label className="text-sm">Account holder name
          <input required minLength={2} maxLength={100} autoComplete="off" className="mt-1 w-full" value={accountHolder} onChange={(event) => setAccountHolder(event.target.value)} />
        </label>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button disabled={busy} className="btn">{busy ? 'Saving details…' : 'Save and continue'}</button>
      </fieldset>
    </form>
  );
}

export default function Page() {
  return <RequireAuth><Form /></RequireAuth>;
}
