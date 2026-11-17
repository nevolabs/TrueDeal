'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session-context';

const ACCOUNTS = [
  { id: 'u_arjun', initials: 'AM', name: 'Arjun Menon', note: 'Buyer with two orders in progress', next: '/orders' },
  { id: 'u_rhea', initials: 'RK', name: 'Rhea Kapoor', note: 'Verified seller with a sale to hand over', next: '/selling' },
  { id: 'u_ops', initials: 'ND', name: "Nikhil D'Souza", note: 'Bench agent: inspections, approvals, disputes', next: '/ops' },
];

export default function DemoAccounts({ next }: { next?: string }) {
  const { switchTo } = useSession();
  const router = useRouter();

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
      <h2 className="mb-1 text-sm font-semibold">Demo accounts</h2>
      <p className="mb-3 text-xs text-neutral-500">This is a prototype. Sign in as any side of a deal:</p>
      <div className="flex flex-col gap-2">
        {ACCOUNTS.map((a) => (
          <button
            key={a.id}
            onClick={async () => {
              await switchTo(a.id);
              router.push(next || a.next);
            }}
            className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-left hover:border-neutral-400"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-white">
              {a.initials}
            </span>
            <span>
              <strong className="block text-sm">{a.name}</strong>
              <em className="text-xs not-italic text-neutral-500">{a.note}</em>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
