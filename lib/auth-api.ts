import { createClient } from '@/utils/supabase/server';
import { AppError } from './errors';
import { assertSameOrigin, jsonBody, siteOrigin, text } from './validation';
import { getSessionUser } from './session';
import { guarded, ok } from './api-helpers';
import { signupError } from './auth-errors';
export function authRequest(request: Request, signup: boolean) {
  return guarded(async () => {
    assertSameOrigin(request);
    const body = await jsonBody(request);
    const email = text(body.email, 'email', 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('Enter a valid email.');
    const password = body.password;
    if (typeof password !== 'string' || password.length < (signup ? 8 : 1) || password.length > 128) throw new AppError('Password must be between 8 and 128 characters.');
    const supabase = await createClient();
    if (signup) {
      const origin = siteOrigin(request);
      const { data, error } = await supabase.auth.signUp({ email, password,
        options: { data: { name: text(body.name, 'name'), city: text(body.city, 'city') }, emailRedirectTo: `${origin}/auth/confirm` },
      });
      if (error) {
        console.error('Signup failed', { code: error.code, status: error.status });
        throw signupError(error);
      }
      return ok({ user: data.session ? await getSessionUser() : null, confirmationRequired: !data.session });
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new AppError('Sign-in failed. Check your email and password.', error.status === 429 ? 429 : 401);
    return ok({ user: await getSessionUser() });
  });
}
