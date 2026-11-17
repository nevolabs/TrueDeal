'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { CATEGORIES, CONDITIONS, FEES, fee, inr, shipFor } from '@/lib/data';
import { api, ApiError } from '@/lib/client';
import { useSession } from '@/lib/session-context';
import { useToast } from '@/lib/toast-context';
import type { Listing } from '@/lib/types';

function NewListingForm() {
  const { user } = useSession();
  const router = useRouter();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('gpu');
  const [brand, setBrand] = useState('');
  const [condition, setCondition] = useState('excellent');
  const [ageMonths, setAgeMonths] = useState('');
  const [warranty, setWarranty] = useState('');
  const [description, setDescription] = useState('');
  const [invoice, setInvoice] = useState(true);
  const [box, setBox] = useState(true);
  const [serial, setSerial] = useState('');
  const [city, setCity] = useState(user?.city || '');
  const [handover, setHandover] = useState<'ship' | 'onsite'>('ship');
  const [price, setPrice] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const priceNum = Number(price) || 0;
  const feeAmt = priceNum ? fee(priceNum) : 0;
  const visit = handover === 'onsite' ? FEES.visitFee : 0;
  const net = priceNum ? Math.max(0, priceNum - feeAmt - visit) : 0;

  if (!user) return null;
  if (user.kyc.status !== 'verified') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h2 className="text-xl font-semibold">Verify your identity first.</h2>
        <Link href="/sell/verify" className="mt-3 inline-block text-sm underline">
          Verify now
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!title || !brand || !ageMonths || !description || !serial || !city || !price) {
      setError('Please fill in every required field.');
      return;
    }
    setBusy(true);
    try {
      const d = await api.post<{ listing: Listing }>('/api/listings', {
        title, category, brand, condition, ageMonths, warranty, description,
        invoice, box, serial, city, handover, price, newPrice,
      });
      toast('Submitted. We will review it within a working day.');
      router.push('/selling');
      void d;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <nav className="mb-4 text-sm text-neutral-500">
        <Link href="/selling" className="hover:underline">Selling</Link>
      </nav>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">List an item</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Mention any scratches, faults or missing parts. The technician checks the item against this description.
        </p>
      </div>
      <form onSubmit={submit} className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-neutral-200 p-5">
            <h2 className="mb-3 text-sm font-semibold">The item</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                Title
                <input maxLength={90} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="text-sm">
                Category
                <select className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {Object.keys(CATEGORIES).map((k) => (
                    <option key={k} value={k}>{CATEGORIES[k].label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Brand
                <input className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </label>
              <label className="text-sm">
                Condition
                <select className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={condition} onChange={(e) => setCondition(e.target.value)}>
                  {Object.keys(CONDITIONS).map((k) => (
                    <option key={k} value={k}>{CONDITIONS[k].label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Age in months
                <input type="number" min={0} max={240} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={ageMonths} onChange={(e) => setAgeMonths(e.target.value)} />
              </label>
              <label className="text-sm sm:col-span-2">
                Warranty
                <input placeholder="e.g. 8 months manufacturer warranty, or leave blank if none" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={warranty} onChange={(e) => setWarranty(e.target.value)} />
              </label>
              <label className="text-sm sm:col-span-2">
                Description
                <textarea rows={4} placeholder="How it was used, any marks or faults, what is included." className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
            </div>
            <div className="mt-3 flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={invoice} onChange={(e) => setInvoice(e.target.checked)} /> I have the original invoice</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={box} onChange={(e) => setBox(e.target.checked)} /> Original box included</label>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 p-5">
            <h2 className="mb-3 text-sm font-semibold">Proof and handover</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                Serial number
                <input placeholder="As printed on the unit" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono" value={serial} onChange={(e) => setSerial(e.target.value)} />
              </label>
              <label className="text-sm sm:col-span-2">
                Your city
                <input className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={city} onChange={(e) => setCity(e.target.value)} />
              </label>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              The serial is never shown to buyers in full. Our technician matches it against the unit, and it must
              match your invoice.
            </p>
            <h2 className="mb-2 mt-4 text-sm font-semibold">How should we inspect it?</h2>
            <div className="flex flex-col gap-2">
              <label className="flex items-start gap-2 rounded-lg border border-neutral-200 p-3 text-sm">
                <input type="radio" className="mt-1" checked={handover === 'ship'} onChange={() => setHandover('ship')} />
                <span>
                  <strong>Send it to our hub</strong> — Free
                  <br />
                  <span className="text-neutral-500">When it sells, pack it and courier it to our Bengaluru hub within {FEES.handoverDays} days. The buyer pays shipping.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-neutral-200 p-3 text-sm">
                <input type="radio" className="mt-1" checked={handover === 'onsite'} onChange={() => setHandover('onsite')} />
                <span>
                  <strong>Our agent visits you</strong> — {inr(FEES.visitFee)}
                  <br />
                  <span className="text-neutral-500">We inspect it in front of you, seal it and collect it. Nothing to pack or post. Deducted from your payout.</span>
                </span>
              </label>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-neutral-200 p-5">
          <h2 className="mb-3 text-sm font-semibold">Price</h2>
          <label className="text-sm">
            Asking price
            <div className="mt-1 flex items-center rounded-md border border-neutral-300 px-3 py-2">
              <span className="mr-1 text-neutral-400">₹</span>
              <input type="number" min={FEES.minPrice} step={100} className="w-full outline-none" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </label>
          <label className="mt-3 block text-sm">
            Price when new <span className="text-neutral-400">(optional)</span>
            <div className="mt-1 flex items-center rounded-md border border-neutral-300 px-3 py-2">
              <span className="mr-1 text-neutral-400">₹</span>
              <input type="number" min={0} step={100} className="w-full outline-none" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
            </div>
          </label>
          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between"><dt>sell.io fee</dt><dd>{priceNum ? '− ' + inr(feeAmt) : '–'}</dd></div>
            <div className="flex justify-between"><dt>On-site visit</dt><dd>{visit ? '− ' + inr(visit) : 'None'}</dd></div>
            <div className="flex justify-between"><dt>Buyer pays shipping</dt><dd>{inr(shipFor(category))}</dd></div>
            <div className="flex justify-between border-t border-neutral-200 pt-1 font-medium"><dt>You receive</dt><dd>{priceNum ? inr(net) : '–'}</dd></div>
          </dl>
          {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <button disabled={busy} className="mt-4 w-full rounded-full bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            Submit for review
          </button>
          <p className="mt-2 text-center text-xs text-neutral-500">We review new listings within a working day. Minimum price {inr(FEES.minPrice)}.</p>
        </aside>
      </form>
    </div>
  );
}

export default function SellNewPage() {
  return (
    <RequireAuth>
      <NewListingForm />
    </RequireAuth>
  );
}
