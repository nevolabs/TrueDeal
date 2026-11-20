import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { safeNext, siteOrigin } from '@/lib/validation';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await createClient();
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  let success = false;
  if (code) success = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && (type === 'email' || type === 'signup' || type === 'recovery')) success = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  const destination = success ? safeNext(url.searchParams.get('next'), type === 'recovery' ? '/auth/reset-password' : '/browse') : '/login?error=confirmation';
  const response = NextResponse.redirect(new URL(destination, siteOrigin(request)));
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
