'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import ProductPhotoPicker, { type ProductPhoto } from '@/components/ProductPhotoPicker';
import { CATEGORIES, CONDITIONS, FEES, fee, inr, shipFor } from '@/lib/data';
import { api, ApiError } from '@/lib/client';
import { useSession } from '@/lib/session-context';
import { useToast } from '@/lib/toast-context';
import type { Listing } from '@/lib/types';
import { sellerReady } from '@/lib/seller-validation';

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
  const [photos, setPhotos] = useState<ProductPhoto[]>([]);
  const [uploadProgress, setUploadProgress] = useState('');

  const priceNum = Number(price) || 0;
  const feeAmt = priceNum ? fee(priceNum) : 0;
  const visit = handover === 'onsite' ? FEES.visitFee : 0;
  const net = priceNum ? Math.max(0, priceNum - feeAmt - visit) : 0;

  if (!user) return null;
  if (!sellerReady(user.kyc)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h2 className="text-xl font-semibold">Complete your seller details first.</h2>
        <Link href="/sell/verify" className="mt-3 inline-block text-sm underline">
          Complete details
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (!title.trim() || !brand.trim() || ageMonths.trim() === '' || !description.trim() || !serial.trim() || !city.trim() || price.trim() === '') {
      setError('Please fill in every required field.');
      return;
    }
    if (!photos.length || photos.length > 8) {
      setError('Add between 1 and 8 product photos.');
      return;
    }
    setBusy(true);
    try {
      const imagePaths: string[] = [];
      for (const [index, photo] of photos.entries()) {
        if (photo.path) {
          imagePaths.push(photo.path);
          continue;
        }
        setUploadProgress(`Uploading photo ${index + 1} of ${photos.length}…`);
        const form = new FormData();
        form.set('file', photo.file);
        const response = await fetch('/api/uploads', { method: 'POST', body: form });
        const result = await response.json();
        if (!response.ok) throw new ApiError(result.error || `Photo ${index + 1} upload failed. Please retry.`);
        if (typeof result.path !== 'string' || !result.path) throw new ApiError('The photo upload returned no storage path. Please retry.');
        imagePaths.push(result.path);
        setPhotos((current) => current.map((item) => item.id === photo.id ? { ...item, path: result.path } : item));
      }
      setUploadProgress('Submitting listing…');
      const d = await api.post<{ listing: Listing }>('/api/listings', {
        title, category, brand, condition, ageMonths, warranty, description,
        invoice, box, serial, city, handover, price, newPrice, imagePaths,
      });
      toast('Submitted. We will review it within a working day.');
      router.push('/selling');
      void d;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not submit your listing. Check your connection and retry; uploaded photos will be reused.');
    } finally {
      setBusy(false);
      setUploadProgress('');
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/selling" className="hover:underline">Selling</Link>
      </nav>
      <div className="mb-6">
        <h1 className="page-title">List an item</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mention any scratches, faults or missing parts. The technician checks the item against this description.
        </p>
      </div>
      <form onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy} className="grid min-w-0 gap-6 md:grid-cols-[1fr_320px]">
        <legend className="sr-only">New listing details</legend>
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-line p-5">
            <h2 className="mb-3 text-sm font-semibold">The item</h2>
            <ProductPhotoPicker photos={photos} onChange={setPhotos} disabled={busy} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                Title
                <input required maxLength={90} className="mt-1 w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label className="text-sm">
                Category
                <select className="mt-1 w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {Object.keys(CATEGORIES).map((k) => (
                    <option key={k} value={k}>{CATEGORIES[k].label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Brand
                <input required className="mt-1 w-full" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </label>
              <label className="text-sm">
                Condition
                <select className="mt-1 w-full" value={condition} onChange={(e) => setCondition(e.target.value)}>
                  {Object.keys(CONDITIONS).map((k) => (
                    <option key={k} value={k}>{CONDITIONS[k].label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Age in months
                <input required type="number" min={0} max={240} className="mt-1 w-full" value={ageMonths} onChange={(e) => setAgeMonths(e.target.value)} />
              </label>
              <label className="text-sm sm:col-span-2">
                Warranty
                <input placeholder="e.g. 8 months manufacturer warranty, or leave blank if none" className="mt-1 w-full" value={warranty} onChange={(e) => setWarranty(e.target.value)} />
              </label>
              <label className="text-sm sm:col-span-2">
                Description
                <textarea required rows={4} placeholder="How it was used, any marks or faults, what is included." className="mt-1 w-full" value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={invoice} onChange={(e) => setInvoice(e.target.checked)} /> I have the original invoice</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={box} onChange={(e) => setBox(e.target.checked)} /> Original box included</label>
            </div>
          </section>

          <section className="rounded-xl border border-line p-5">
            <h2 className="mb-3 text-sm font-semibold">Proof and handover</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                Serial number
                <input required placeholder="As printed on the unit" className="mt-1 w-full font-mono" value={serial} onChange={(e) => setSerial(e.target.value)} />
              </label>
              <label className="text-sm sm:col-span-2">
                Your city
                <input required className="mt-1 w-full" value={city} onChange={(e) => setCity(e.target.value)} />
              </label>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              The serial is never shown to buyers in full. Our technician matches it against the unit, and it must
              match your invoice.
            </p>
            <h2 className="mb-2 mt-4 text-sm font-semibold">How should we inspect it?</h2>
            <div className="flex flex-col gap-2">
              <label className="flex items-start gap-2 rounded-lg border border-line p-3 text-sm">
                <input type="radio" className="mt-1" checked={handover === 'ship'} onChange={() => setHandover('ship')} />
                <span>
                  <strong>Send it to our hub</strong> — Free
                  <br />
                  <span className="text-muted-foreground">When it sells, pack it and courier it to our Bengaluru hub within {FEES.handoverDays} days. The buyer pays shipping.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-line p-3 text-sm">
                <input type="radio" className="mt-1" checked={handover === 'onsite'} onChange={() => setHandover('onsite')} />
                <span>
                  <strong>Our agent visits you</strong> — {inr(FEES.visitFee)}
                  <br />
                  <span className="text-muted-foreground">We inspect it in front of you, seal it and collect it. Nothing to pack or post. Deducted from your payout.</span>
                </span>
              </label>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-line p-5">
          <h2 className="mb-3 text-sm font-semibold">Price</h2>
          <label className="text-sm">
            Asking price
            <div className="field-group mt-1 flex items-center rounded-lg border border-line-strong px-3 py-2">
              <span className="mr-1 text-muted-foreground">₹</span>
              <input required type="number" min={FEES.minPrice} step={100} className="w-full outline-none field-bare" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </label>
          <label className="mt-3 block text-sm">
            Price when new <span className="text-muted-foreground">(optional)</span>
            <div className="field-group mt-1 flex items-center rounded-lg border border-line-strong px-3 py-2">
              <span className="mr-1 text-muted-foreground">₹</span>
              <input type="number" min={0} step={100} className="w-full outline-none field-bare" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
            </div>
          </label>
          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between"><dt>TrueDeal fee</dt><dd>{priceNum ? '− ' + inr(feeAmt) : '–'}</dd></div>
            <div className="flex justify-between"><dt>On-site visit</dt><dd>{visit ? '− ' + inr(visit) : 'None'}</dd></div>
            <div className="flex justify-between"><dt>Buyer pays shipping</dt><dd>{inr(shipFor(category))}</dd></div>
            <div className="flex justify-between border-t border-line pt-1 font-medium"><dt>You receive</dt><dd>{priceNum ? inr(net) : '–'}</dd></div>
          </dl>
          {error && <div role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {busy && <p role="status" className="mt-3 text-sm text-muted-foreground">{uploadProgress || 'Preparing photos…'}</p>}
          <button disabled={busy} className="mt-4 w-full btn">
            {busy ? 'Submitting…' : 'Submit for review'}
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">We review new listings within a working day. Minimum price {inr(FEES.minPrice)}.</p>
        </aside>
      </fieldset>
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
