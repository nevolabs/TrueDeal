'use client';

import Image from 'next/image';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import ReportCard from '@/components/ReportCard';
import StatusBadge from '@/components/StatusBadge';
import { CONDITIONS, COURIERS, DISPUTE_REASONS, FEES, STEPS, TIERS, checklistFor, firstName, inr } from '@/lib/data';
import { api, ApiError } from '@/lib/client';
import { useSession } from '@/lib/session-context';
import { useToast } from '@/lib/toast-context';
import type { Listing, Order } from '@/lib/types';

interface OrderData {
  order: Order;
  role: 'buyer' | 'seller' | 'ops';
  listing: Listing;
  buyer: { id: string; name: string; city: string };
  seller: { id: string; name: string; city: string; kyc: { bank?: string; acct?: string } };
}

function hoursLeft(o: Order) {
  const ms = (o.windowEnds || 0) - Date.now();
  if (ms <= 0) return 'The inspection window has closed.';
  const h = Math.floor(ms / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  return `Inspection window closes in ${h} h ${m} min.`;
}

function Timeline({ order }: { order: Order }) {
  const at: Record<string, number> = {};
  const notes: Record<string, string> = {};
  order.timeline.forEach((t) => {
    at[t.status] = t.at;
    if (t.note) notes[t.status] = t.note;
  });
  const idx = STEPS.findIndex((s) => s.key === order.status);
  const off = ['refunded', 'cancelled', 'disputed'].includes(order.status);

  return (
    <ol className="space-y-4">
      {STEPS.map((s, i) => {
        const done = at[s.key] != null || (order.fromStock && i < 3);
        const current = !off && i === idx && order.status !== 'completed';
        if (off && !done) return null;
        return (
          <li key={s.key} className="flex gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                done ? 'bg-emerald-600 text-white' : current ? 'border-2 border-neutral-900' : 'border border-neutral-300'
              }`}
            >
              {done ? '✓' : ''}
            </span>
            <div className="text-sm">
              <strong>{order.handover === 'onsite' && s.onsite ? s.onsite : s.title}</strong>
              {at[s.key] ? (
                <div className="text-xs text-neutral-500">{new Date(at[s.key]).toLocaleString('en-IN')}</div>
              ) : order.fromStock && i > 0 && i < 3 ? (
                <div className="text-xs text-neutral-500">Done before listing</div>
              ) : null}
              {notes[s.key] && <p className="mt-1 text-neutral-600">{notes[s.key]}</p>}
            </div>
          </li>
        );
      })}
      {off && (
        <li className="flex gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-red-600 text-xs" />
          <div className="text-sm">
            <strong>Status update</strong>
            <div className="text-xs text-neutral-500">{new Date(order.timeline[order.timeline.length - 1].at).toLocaleString('en-IN')}</div>
            {order.timeline[order.timeline.length - 1].note && <p className="mt-1 text-neutral-600">{order.timeline[order.timeline.length - 1].note}</p>}
          </div>
        </li>
      )}
    </ol>
  );
}

function Box({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-5">
      <h2 className="mb-1 font-semibold">{title}</h2>
      <p className="text-sm text-neutral-600">{body}</p>
      {children && <div className="mt-3 flex flex-col gap-2">{children}</div>}
    </div>
  );
}

function InspectForm({ data, onDone }: { data: OrderData; onDone: () => void }) {
  const toast = useToast();
  const checks = checklistFor(data.listing.category, data.order.tier);
  const [results, setResults] = useState<Record<number, string>>({});
  const [serial, setSerial] = useState('');
  const [grade, setGrade] = useState(data.listing.condition);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(outcome: 'pass' | 'fail') {
    setError('');
    const body: Record<string, string> = { serial, grade, notes, outcome };
    checks.forEach((_, i) => {
      body['c' + i] = results[i] || '';
    });
    setBusy(true);
    try {
      await api.post(`/api/orders/${data.order.id}/verify`, body);
      toast(outcome === 'pass' ? 'Report issued. Ready to pack.' : 'Item failed. Buyer refunded.');
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">{data.listing.title}</h2>
          <p className="text-sm text-neutral-500">{(TIERS[data.order.tier] || TIERS.full).label}, chosen by the buyer</p>
        </div>
        <button
          type="button"
          onClick={() => setResults(Object.fromEntries(checks.map((_, i) => [i, 'pass'])))}
          className="text-sm underline"
        >
          Mark all as pass
        </button>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-neutral-50 p-3 text-sm sm:grid-cols-4">
        <div><span className="block text-xs text-neutral-500">Listed serial</span><strong className="font-mono">{data.listing.serial}</strong></div>
        <div><span className="block text-xs text-neutral-500">Listed condition</span><strong>{CONDITIONS[data.listing.condition].label}</strong></div>
        <div><span className="block text-xs text-neutral-500">Warranty claimed</span><strong>{data.listing.warranty}</strong></div>
        <div><span className="block text-xs text-neutral-500">Invoice / box</span><strong>{data.listing.invoice ? 'Yes' : 'No'} / {data.listing.box ? 'Yes' : 'No'}</strong></div>
      </div>
      <ul className="mb-4 divide-y divide-neutral-100">
        {checks.map((c, i) => (
          <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>{c}</span>
            <span className="flex gap-3 text-xs">
              {(['pass', 'fail', 'na'] as const).map((v) => (
                <label key={v} className="flex items-center gap-1">
                  <input type="radio" name={`c${i}`} checked={results[i] === v} onChange={() => setResults((r) => ({ ...r, [i]: v }))} /> {v === 'na' ? 'N/A' : v[0].toUpperCase() + v.slice(1)}
                </label>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Serial read from the unit
          <input className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono" placeholder="Type it, do not paste from the listing" value={serial} onChange={(e) => setSerial(e.target.value)} />
        </label>
        <label className="text-sm">
          Grade you would give it
          <select className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={grade} onChange={(e) => setGrade(e.target.value)}>
            {Object.keys(CONDITIONS).map((k) => (
              <option key={k} value={k}>{CONDITIONS[k].label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          Notes for the buyer
          <textarea rows={3} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" placeholder="Temperatures under load, battery health, any marks or wear you found" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
      {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="mt-4 flex gap-3">
        <button disabled={busy} onClick={() => submit('pass')} className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          Pass and issue report
        </button>
        <button disabled={busy} onClick={() => submit('fail')} className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          Fail and refund buyer
        </button>
      </div>
    </div>
  );
}

function DisputeForm({ id, onDone }: { id: string; onDone: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState(DISPUTE_REASONS[0]);
  const [detail, setDetail] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!detail.trim()) {
      setError('Please describe what happened.');
      return;
    }
    await api.post(`/api/orders/${id}/dispute`, { reason, detail });
    toast('Claim opened. The payout is frozen.');
    onDone();
  }

  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer underline">Something is wrong</summary>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
        <label>What happened?
          <select className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={reason} onChange={(e) => setReason(e.target.value)}>
            {DISPUTE_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        <label>Details
          <textarea rows={3} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" placeholder="What you found, and when." value={detail} onChange={(e) => setDetail(e.target.value)} />
        </label>
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
        <button className="rounded-full bg-neutral-900 py-2 text-sm font-medium text-white">Freeze payout and open a claim</button>
      </form>
    </details>
  );
}

function DispatchForm({ id, onDone }: { id: string; onDone: () => void }) {
  const [courier, setCourier] = useState(COURIERS[0]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api.post(`/api/orders/${id}/dispatch`, { courier });
    onDone();
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label className="text-sm">Courier
        <select className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={courier} onChange={(e) => setCourier(e.target.value)}>
          {COURIERS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <button className="rounded-full bg-neutral-900 py-2 text-sm font-medium text-white">Mark dispatched</button>
    </form>
  );
}

function ActionButton({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`rounded-full px-4 py-2 text-sm font-medium text-white ${danger ? 'bg-red-600' : 'bg-neutral-900'}`}>
      {label}
    </button>
  );
}

function ActionPanel({ data, reload }: { data: OrderData; reload: () => void }) {
  const { order: o, role, listing: l, seller } = data;
  const toast = useToast();
  const F = FEES;

  async function run(action: string, msg?: string) {
    await api.post(`/api/orders/${o.id}/${action}`);
    if (msg) toast(msg);
    reload();
  }

  if (role === 'buyer') {
    const by = new Date(o.createdAt + F.handoverDays * 24 * 36e5).toLocaleDateString('en-IN');
    const s = firstName(seller.name);
    switch (o.status) {
      case 'paid':
        return <Box title="Your payment is safe in escrow." body={`${s} has until ${by} to hand the item to us. If that does not happen, you are refunded automatically.`}><ActionButton label="Cancel and refund" onClick={() => run('cancel', 'Order cancelled. Refund issued.')} /></Box>;
      case 'in_transit':
        return <Box title={o.handover === 'onsite' ? 'Inspection visit booked.' : 'On its way to our bench.'} body={o.handover === 'onsite' ? `Our agent is visiting ${s} to inspect the item in person.` : `${s} has handed the item over. We will inspect it as soon as it reaches the hub.`} />;
      case 'at_hub':
        return <Box title={o.handover === 'onsite' ? 'Our agent is with the item now.' : 'On the bench now.'} body={o.handover === 'onsite' ? "They are working through the checklist at the seller's address. You will get the report as soon as they sign it off." : 'Our technician is working through the checklist. Most inspections finish within one working day.'} />;
      case 'verified':
        return <Box title="Passed inspection." body="The full report is below. We are packing and sealing it for dispatch." />;
      case 'shipped':
        return (
          <Box title="On its way to you." body={`${o.tracking?.courier}, AWB ${o.tracking?.awb}. Check that the seal on the parcel reads ${o.report?.seal} and film the unboxing.`}>
            <ActionButton label="I have received the parcel" onClick={() => run('delivered', 'Delivered. The 48-hour window has started.')} />
          </Box>
        );
      case 'delivered':
        return (
          <Box title="Check it over." body={`${hoursLeft(o)} Compare the item with its report. The seller is paid only when you confirm, or when the window closes.`}>
            <ActionButton label="All good, release payment" onClick={() => run('release', 'Payment released to the seller.')} />
            <DisputeForm id={o.id} onDone={reload} />
          </Box>
        );
      case 'completed':
        return <Box title="Deal complete." body="Payment has been released to the seller." />;
      case 'disputed':
        return <Box title="We are reviewing your claim." body="The seller's payout is frozen. A member of our team will contact you within one working day and may ask for your unboxing video." />;
      case 'refunded':
        return <Box title="Refunded." body={`${inr(o.total)} has been returned to your original payment method (${o.payMethod}).`} />;
      case 'cancelled':
        return <Box title="Order cancelled." body={`${inr(o.total)} has been returned to your original payment method.`} />;
    }
  }

  if (role === 'seller') {
    const by = new Date(o.createdAt + F.handoverDays * 24 * 36e5).toLocaleDateString('en-IN');
    const payoutTo = seller.kyc?.bank ? `${seller.kyc.bank} account ending ${seller.kyc.acct}` : 'your bank account';
    switch (o.status) {
      case 'paid':
        return (
          <Box title={'A buyer has paid. Hand it over by ' + by + '.'} body={o.handover === 'onsite' ? 'Book a time for our agent to visit. They inspect it in front of you, seal it and take it away. Ask them for the code below before you hand anything over.' : 'Pack it well and send it to the sell.io hub in Bengaluru. Write this code on the outside of the parcel.'}>
            <div className="rounded-lg bg-neutral-50 p-3 text-sm"><span className="block text-xs text-neutral-500">Handover code</span><strong className="font-mono">{o.handoverCode}</strong></div>
            {o.handover !== 'onsite' ? (
              <p className="text-xs text-neutral-500">sell.io Hub, 2nd Floor, 80 Feet Road, Indiranagar, Bengaluru 560038</p>
            ) : (
              <p className="text-xs text-neutral-500">On-site visit: {inr(o.visitFee)}, deducted from your payout.</p>
            )}
            <ActionButton label={o.handover === 'onsite' ? 'Book the visit' : 'I have dispatched it'} onClick={() => run('handover', o.handover === 'onsite' ? 'Visit booked. Our agent will bring the code.' : 'Thanks. We will confirm when it reaches the hub.')} />
          </Box>
        );
      case 'in_transit':
        return <Box title={o.handover === 'onsite' ? 'Visit booked.' : 'Handed over.'} body={o.handover === 'onsite' ? 'Our agent will arrive at the agreed time and give you the code. Keep the item, its box and the invoice ready.' : 'We will confirm as soon as it reaches the bench.'} />;
      case 'at_hub':
        return <Box title="Being inspected." body="If it matches your listing, it ships to the buyer straight away." />;
      case 'verified':
        return <Box title="It passed inspection." body="We are shipping it to the buyer." />;
      case 'shipped':
        return <Box title="On its way to the buyer." body={`Your payout of ${inr(o.payout)} is released ${F.inspectionHours} hours after delivery.`} />;
      case 'delivered':
        return <Box title="Delivered." body={`The buyer has ${F.inspectionHours} hours to check it. ${inr(o.payout)} is then paid to your ${payoutTo}.`} />;
      case 'completed':
        return <Box title="Paid out." body={`${inr(o.payout)} sent to your ${payoutTo}.`} />;
      case 'disputed':
        return <Box title="The buyer has raised a problem." body="Your payout is on hold while we review the claim against our inspection report and videos." />;
      case 'refunded':
        return <Box title="This sale did not complete." body={o.report?.failed ? (o.handover === 'onsite' ? `The item did not pass inspection, so it stays with you; see the report for why. The ${inr(o.visitFee)} visit fee is still due.` : 'The item did not pass inspection. We will return it to you; see the report for why.') : 'The buyer was refunded. The item will be returned to you.'} />;
      case 'cancelled':
        return <Box title="The buyer cancelled." body="Your listing is live again." />;
    }
  }

  if (role === 'ops') {
    switch (o.status) {
      case 'paid':
        return <Box title="Waiting for the seller." body={`Handover code ${o.handoverCode}. Nothing to do until the parcel arrives.`} />;
      case 'in_transit':
        return (
          <Box title={o.handover === 'onsite' ? 'Site visit booked.' : 'Parcel expected.'} body={o.handover === 'onsite' ? `Go to the seller in ${seller.city}. Give them the code ${o.handoverCode} on arrival and start the intake video before touching the item.` : `Match the handover code ${o.handoverCode} on the parcel, weigh it and record the intake video.`}>
            <ActionButton label={o.handover === 'onsite' ? 'Agent is on site' : 'Mark received at hub'} onClick={() => run('receive')} />
          </Box>
        );
      case 'at_hub':
        return <Box title="Ready for inspection." body="Work through the checklist above. Every line needs a result." />;
      case 'verified':
        return (
          <Box title="Passed. Pack and dispatch." body={`Apply seal ${o.report?.seal}, record the packing video, then hand to the courier.`}>
            <DispatchForm id={o.id} onDone={reload} />
          </Box>
        );
      case 'shipped':
        return (
          <Box title="In transit to the buyer." body={`${o.tracking?.courier}, AWB ${o.tracking?.awb}.`}>
            <ActionButton label="Courier confirms delivery" onClick={() => run('delivered')} />
          </Box>
        );
      case 'delivered':
        return (
          <Box title="Inspection window running." body={hoursLeft(o)}>
            <ActionButton label="Window elapsed, release payout" onClick={() => run('release', 'Payout released.')} />
          </Box>
        );
      case 'disputed':
        return (
          <Box title="Claim to resolve." body="Compare the buyer's evidence with the report, intake video and packing video.">
            <ActionButton label="Uphold claim, refund buyer" onClick={() => run('refund', 'Buyer refunded.')} />
            <ActionButton label="Reject claim, release payout" onClick={() => run('release', 'Payout released.')} />
          </Box>
        );
      case 'completed':
        return <Box title="Closed." body={`Payout of ${inr(o.payout)} released. Fee earned: ${inr(o.fee)}.`} />;
      default:
        return <Box title="No further action." body="" />;
    }
  }

  void l;
  return null;
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useSession();
  const [data, setData] = useState<OrderData | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const d = await api.get<OrderData>('/api/orders/' + id);
      setData(d);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'We could not find that order.');
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- fetch this order on mount/id change
    load();
  }, [id]);

  if (error) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-neutral-500">{error}</div>;
  if (!data || !user) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-neutral-400">Loading…</div>;

  const { order: o, role, listing: l, buyer, seller } = data;
  const back = role === 'ops' ? ['/ops', 'Bench console'] : role === 'seller' ? ['/selling', 'Selling'] : ['/orders', 'Your orders'];

  const money =
    role === 'seller' ? (
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between"><dt>Sale price</dt><dd>{inr(o.price)}</dd></div>
        <div className="flex justify-between"><dt>sell.io fee</dt><dd>− {inr(o.fee)}</dd></div>
        {!!o.visitFee && <div className="flex justify-between"><dt>On-site visit</dt><dd>− {inr(o.visitFee)}</dd></div>}
        <div className="flex justify-between border-t border-neutral-200 pt-1 font-medium"><dt>Your payout</dt><dd>{inr(o.payout)}</dd></div>
      </dl>
    ) : (
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between"><dt>Item</dt><dd>{inr(o.price)}</dd></div>
        <div className="flex justify-between"><dt>Insured shipping</dt><dd>{inr(o.shipping)}</dd></div>
        {!!o.inspectionFee && <div className="flex justify-between"><dt>Full bench test</dt><dd>{inr(o.inspectionFee)}</dd></div>}
        <div className="flex justify-between border-t border-neutral-200 pt-1 font-medium"><dt>{role === 'ops' ? 'Collected' : 'You paid'}</dt><dd>{inr(o.total)}</dd></div>
        {role === 'ops' && (
          <>
            <div className="flex justify-between"><dt>Seller payout</dt><dd>{inr(o.payout)}</dd></div>
            <div className="flex justify-between"><dt>Fee</dt><dd>{inr(o.fee)}</dd></div>
            {!!o.visitFee && <div className="flex justify-between"><dt>Visit fee</dt><dd>{inr(o.visitFee)}</dd></div>}
          </>
        )}
      </dl>
    );

  const escrow = ['refunded', 'cancelled'].includes(o.status)
    ? ['Returned to the buyer', 'text-neutral-400']
    : o.status === 'completed'
      ? ['Released to the seller', 'text-neutral-900']
      : o.status === 'disputed'
        ? ['Frozen in escrow', 'text-red-600']
        : ['Held in escrow', 'text-emerald-600'];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <nav className="mb-4 text-sm text-neutral-500">
        <Link href={back[0]} className="hover:underline">{back[1]}</Link>
      </nav>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Order <span className="font-mono">{o.id}</span></h1>
          <p className="mt-1 text-sm text-neutral-500">Placed {new Date(o.createdAt).toLocaleString('en-IN')}</p>
        </div>
        <StatusBadge status={o.status} />
      </div>
      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          {role === 'ops' && o.status === 'at_hub' && <InspectForm data={data} onDone={load} />}
          <div className="rounded-xl border border-neutral-200 p-5">
            <h2 className="mb-3 font-semibold">Progress</h2>
            <Timeline order={o} />
          </div>
          {o.dispute && (
            <div className="rounded-xl border border-neutral-200 p-5">
              <h2 className="mb-1 font-semibold">Buyer&apos;s claim</h2>
              <p className="font-medium">{o.dispute.reason}</p>
              <p className="mt-1 text-sm text-neutral-600">{o.dispute.detail}</p>
              <p className="mt-1 text-xs text-neutral-400">Raised {new Date(o.dispute.at).toLocaleString('en-IN')}</p>
            </div>
          )}
          {o.report && <ReportCard report={o.report} maskSerial={role !== 'ops'} />}
        </div>
        <aside className="flex flex-col gap-4">
          <ActionPanel data={data} reload={load} />
          <div className="rounded-xl border border-neutral-200 p-5">
            <Link href={`/item/${l.id}`} className="mb-3 flex gap-3">
              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                {l.img && <Image src={l.img} alt={l.title} fill className="object-cover" />}
              </div>
              <div className="text-sm">
                <strong>{l.title}</strong>
                <div className="text-neutral-500">{CONDITIONS[l.condition].label}</div>
              </div>
            </Link>
            {money}
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 rounded-full ${escrow[1].includes('emerald') ? 'bg-emerald-600' : escrow[1].includes('red') ? 'bg-red-600' : 'bg-neutral-300'}`} />
              <span className={escrow[1]}>{escrow[0]}</span>
            </div>
          </div>
          {role !== 'seller' && (
            <div className="rounded-xl border border-neutral-200 p-5">
              <h3 className="mb-2 text-sm font-semibold">Deliver to</h3>
              <p className="text-sm text-neutral-600">
                {o.address.name}<br />{o.address.line}<br />{o.address.city} {o.address.pin}
                {role === 'ops' && <><br />{o.address.phone}</>}
              </p>
            </div>
          )}
          {role === 'ops' && (
            <div className="rounded-xl border border-neutral-200 p-5">
              <h3 className="mb-2 text-sm font-semibold">Parties</h3>
              <p className="text-sm text-neutral-600">
                Buyer: {buyer.name}, {buyer.city}<br />Seller: {seller.name}, {seller.city}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
