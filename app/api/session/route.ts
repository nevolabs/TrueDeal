import { guarded, ok } from '@/lib/api-helpers';
import { getSessionUser } from '@/lib/session';
import { createClient } from '@/utils/supabase/server';
import { assertSameOrigin } from '@/lib/validation';
import { AppError } from '@/lib/errors';
export async function GET() { return guarded(async () => ok({ user: await getSessionUser() })); }
export async function DELETE(request: Request) {
  return guarded(async () => {
    assertSameOrigin(request);
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new AppError('Could not sign out. Please retry.', 503);
    return ok({ user: null });
  });
}
