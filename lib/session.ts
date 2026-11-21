import { createClient } from '@/utils/supabase/server';
import { AppError, databaseError } from './errors';
import type { User } from './types';
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    if (error.name === 'AuthSessionMissingError' || error.status === 401 || error.status === 403) return null;
    throw new AppError('Authentication is temporarily unavailable.', 503);
  }
  if (!user) return null;
  const [profile, roles, kyc, address] = await Promise.all([
    supabase.from('profiles').select('id,name,city,account_status,created_at').eq('id', user.id).single(),
    supabase.from('user_roles').select('role').eq('user_id', user.id),
    supabase.from('seller_verifications').select('status,legal_name,details_checked_at,created_at,reviewed_at').eq('user_id', user.id).maybeSingle(),
    supabase.from('addresses').select('address').eq('user_id', user.id).maybeSingle(),
  ]);
  for (const result of [profile, roles, kyc, address]) if (result.error) databaseError(result.error);
  const p = profile.data!;
  if (p.account_status !== 'active') throw new AppError('This account is suspended.', 403);
  return { id: user.id, email: user.email || '', name: p.name, city: p.city,
    joined: Date.parse(p.created_at), deals: 0,
    role: roles.data?.some(r => ['ops', 'admin'].includes(r.role)) ? 'ops' : 'member',
    kyc: kyc.data ? { status: kyc.data.status, legalName: kyc.data.legal_name, basicStatus: kyc.data.details_checked_at ? 'checked' : 'not_started' } : { status: 'none' },
    address: address.data?.address };
}
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new AppError('Sign in first.', 401);
  return user;
}
