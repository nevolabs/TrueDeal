import { CheckIcon, ChevronDownIcon } from '@/components/icons';
import { CATEGORIES, CHECKS, FEES, benchFor, checklistFor, inr, shipFor } from '@/lib/data';

const STEPS = [
  ['You pay into escrow', 'Your money is held by our payment partner. The seller can see that you have paid, but cannot withdraw it yet.'],
  ['The seller hands it over', 'They courier it to our hub in Bengaluru within three days. If they prefer, our agent visits them to inspect and collect it.'],
  ['We inspect it', 'Every item gets a look-and-feel check by hand. You can add a full bench test at checkout. You see the report before the item ships.'],
  ['You check it, then the seller is paid', 'It ships sealed and insured. You have 48 hours to check it. If you raise nothing in that time, the payment is released.'],
];

export default function ProtectionPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">How sell.io works</h1>
      <p className="mt-2 text-neutral-600">
        Buying used hardware from a stranger usually means trusting their photos and paying first. On sell.io the
        money waits in escrow, and the item is inspected before it ships.
      </p>

      <ol className="mt-8 space-y-6">
        {STEPS.map((s, i) => (
          <li key={i} className="flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white">
              {i + 1}
            </span>
            <div>
              <h2 className="font-medium">{s[0]}</h2>
              <p className="text-sm text-neutral-600">{s[1]}</p>
            </div>
          </li>
        ))}
      </ol>

      <section id="window" className="mt-10">
        <h2 className="text-lg font-semibold">The 48-hour inspection window</h2>
        <p className="mt-2 text-sm text-neutral-600">
          You have {FEES.inspectionHours} hours from delivery to check the item against its report. If something is
          wrong, raise a claim from your order page and the seller&apos;s payout is frozen while we look into it.
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          Record yourself opening the parcel, and check that the seal number on it matches the one on the report.
        </p>
      </section>

      <section id="checks" className="mt-10">
        <h2 className="text-lg font-semibold">What we check</h2>
        <p className="mt-2 text-sm text-neutral-600">
          The look-and-feel check in the first column is part of every order. If you choose the full bench test, we
          add the checks for that kind of item.
        </p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-2 font-medium">Look-and-feel, every item</h3>
            <ul className="space-y-1 text-sm text-neutral-700">
              {checklistFor('', 'basic').map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <CheckIcon size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
          {(['gpu', 'laptop', 'monitor'] as const).map((k) => (
            <div key={k}>
              <h3 className="mb-2 font-medium">Bench test: {CATEGORIES[k].label.toLowerCase()}</h3>
              <ul className="space-y-1 text-sm text-neutral-700">
                {CHECKS[k].map((c) => (
                  <li key={c} className="flex items-start gap-2">
                    <CheckIcon size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="fees" className="mt-10">
        <h2 className="text-lg font-semibold">Fees</h2>
        <table className="mt-4 w-full text-sm">
          <tbody>
            <tr className="border-b border-neutral-100">
              <th className="py-2 pr-4 text-left font-medium text-neutral-500">Buyer</th>
              <td className="py-2">
                Listed price plus insured shipping ({inr(shipFor('mouse'))} to {inr(shipFor('desktop'))} depending on
                size). The look-and-feel check is included.
              </td>
            </tr>
            <tr className="border-b border-neutral-100">
              <th className="py-2 pr-4 text-left font-medium text-neutral-500">Full bench test</th>
              <td className="py-2">
                Optional, chosen by the buyer at checkout: {inr(benchFor('mouse'))} for a mouse up to{' '}
                {inr(benchFor('desktop'))} for a desktop build. Refunded if the item fails.
              </td>
            </tr>
            <tr className="border-b border-neutral-100">
              <th className="py-2 pr-4 text-left font-medium text-neutral-500">Seller</th>
              <td className="py-2">
                {FEES.commissionRate * 100}% of the sale price, minimum {inr(FEES.commissionMin)}, deducted from the
                payout when the deal completes.
              </td>
            </tr>
            <tr className="border-b border-neutral-100">
              <th className="py-2 pr-4 text-left font-medium text-neutral-500">On-site visit</th>
              <td className="py-2">
                Optional, chosen by the seller when listing. Our agent inspects and collects the item at the
                seller&apos;s address for {inr(FEES.visitFee)}, deducted from the payout. Still due if the item
                fails inspection.
              </td>
            </tr>
            <tr className="border-b border-neutral-100">
              <th className="py-2 pr-4 text-left font-medium text-neutral-500">Item fails inspection</th>
              <td className="py-2">Buyer refunded in full. Item returned to the seller, who pays return shipping.</td>
            </tr>
            <tr>
              <th className="py-2 pr-4 text-left font-medium text-neutral-500">Buyer cancels before handover</th>
              <td className="py-2">Full refund, no charge.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="faq" className="mt-10">
        <h2 className="text-lg font-semibold">Questions people ask</h2>
        <div className="mt-4 space-y-3">
          {[
            [
              'Where is my money while I wait?',
              "With a licensed payment partner, in an account that only pays out on our instruction: to the seller once the deal completes, or back to you if it does not. It never sits in sell.io's own bank account.",
            ],
            [
              'Can I talk to the seller directly?',
              'No. Contact details stay private on both sides, and the inspection report is the record of what was sold. If you have a question about an item, ask us and we will check it for you.',
            ],
            [
              'What if the item dies a month later?',
              'Our report describes the item on the day we tested it. After the inspection window closes, any remaining manufacturer warranty is your cover, and we note its status in the report.',
            ],
            [
              'Why is there a minimum price?',
              `Every item takes a technician's time to inspect. Below ${inr(FEES.minPrice)}, the inspection would cost more than it protects.`,
            ],
          ].map(([q, a]) => (
            <details key={q} className="group rounded-lg border border-neutral-200 p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDownIcon size={18} className="shrink-0 text-neutral-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm text-neutral-600">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
