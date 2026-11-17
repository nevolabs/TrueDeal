import { CATEGORIES } from '@/lib/data';
import { fail, guarded, ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/session';
import { act, db } from '@/lib/store';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cat = searchParams.get('cat') || '';
  const q = (searchParams.get('q') || '').toLowerCase();
  const vault = searchParams.get('vault') === '1';
  const cond = searchParams.getAll('cond');
  const sort = searchParams.get('sort') || 'new';

  const live = db.live();
  const counts: Record<string, number> = {};
  live.forEach((l) => {
    counts[l.category] = (counts[l.category] || 0) + 1;
  });

  let list = live.filter(
    (l) =>
      (!cat || l.category === cat) &&
      (!vault || l.mode === 'hub') &&
      (!cond.length || cond.includes(l.condition)) &&
      (!q || (l.title + ' ' + l.brand).toLowerCase().includes(q))
  );
  const sorts: Record<string, (a: typeof list[number], b: typeof list[number]) => number> = {
    new: (a, b) => b.createdAt - a.createdAt,
    low: (a, b) => a.price - b.price,
    high: (a, b) => b.price - a.price,
  };
  list = list.sort(sorts[sort] || sorts.new);

  const categories = Object.keys(CATEGORIES).filter((k) => counts[k]);
  return ok({ listings: list, counts, categories, total: live.length });
}

export async function POST(req: Request) {
  return guarded(async () => {
    const me = await getSessionUser();
    if (!me) return fail('Sign in first.', 401);
    const body = await req.json();
    const listing = act.createListing(me.id, body);
    return ok({ listing });
  });
}
