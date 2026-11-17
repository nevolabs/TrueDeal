import { STATUS } from '@/lib/data';

const TONE: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-800',
  green: 'bg-emerald-100 text-emerald-800',
  ink: 'bg-neutral-900 text-white',
  red: 'bg-red-100 text-red-800',
  muted: 'bg-neutral-100 text-neutral-500',
};

export default function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] || { label: status, tone: 'muted' as const };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE[s.tone]}`}>
      {s.label}
    </span>
  );
}
