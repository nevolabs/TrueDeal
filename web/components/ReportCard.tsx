import { CONDITIONS } from '@/lib/data';
import type { InspectionReport } from '@/lib/types';

function maskedSerial(serial: string) {
  if (serial.length <= 4) return serial;
  return '•'.repeat(serial.length - 4) + serial.slice(-4);
}

export default function ReportCard({
  report,
  maskSerial = true,
}: {
  report: InspectionReport;
  maskSerial?: boolean;
}) {
  const grade = CONDITIONS[report.grade];
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-mono text-xs text-neutral-500">{report.id}</div>
          <div className="text-sm text-neutral-500">
            Inspected by {report.agent} · {new Date(report.at).toLocaleDateString('en-IN')}
          </div>
        </div>
        {report.seal ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-mono text-xs text-emerald-800">
            Seal {report.seal}
          </span>
        ) : (
          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs text-red-800">Failed</span>
        )}
      </div>
      <dl className="mb-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-neutral-500">Serial checked</dt>
          <dd className="font-mono">{maskSerial ? maskedSerial(report.serial) : report.serial}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">Grade confirmed</dt>
          <dd>{grade?.label || report.grade}</dd>
        </div>
      </dl>
      <ul className="mb-3 space-y-1">
        {report.checks.map((c, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span
              className={
                c.result === 'pass'
                  ? 'mt-0.5 text-emerald-600'
                  : c.result === 'fail'
                    ? 'mt-0.5 text-red-600'
                    : 'mt-0.5 text-neutral-400'
              }
            >
              {c.result === 'pass' ? '✓' : c.result === 'fail' ? '✕' : '–'}
            </span>
            <span>{c.label}</span>
          </li>
        ))}
      </ul>
      {report.notes && <p className="text-sm text-neutral-700">{report.notes}</p>}
    </div>
  );
}
