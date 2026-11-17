import { fail, guarded, ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/session';
import { act, db } from '@/lib/store';
import { checklistFor } from '@/lib/data';
import type { CheckItem } from '@/lib/types';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return guarded(async () => {
    const me = await getSessionUser();
    if (!me || me.role !== 'ops') return fail('Not authorized.', 403);
    const { id } = await params;
    const order = db.order(id);
    const listing = order ? db.listing(order.listingId) : null;
    if (!order || !listing) return fail('Order not found.', 404);

    const body = await req.json();
    const labels = checklistFor(listing.category, order.tier);
    const checks: CheckItem[] = labels.map((label, i) => ({ label, result: body['c' + i] || '' }));
    if (checks.some((c) => !c.result)) return fail('Every check needs a result before you can sign off.');

    const pass = body.outcome === 'pass';
    const anyFail = checks.some((c) => c.result === 'fail');
    if (pass && anyFail) return fail('A failed check cannot be signed off as a pass.');
    if (!pass && !anyFail) return fail('Mark the check that failed before failing the item.');
    const serial = String(body.serial || '').trim();
    if (pass && serial.toUpperCase() !== String(listing.serial).toUpperCase()) {
      return fail('The serial you typed does not match the listing. If the unit really differs, fail the serial check.');
    }

    act.verify(id, me.name, { checks, serial, grade: body.grade, notes: String(body.notes || '').trim() }, pass);
    return ok({ done: true });
  });
}
