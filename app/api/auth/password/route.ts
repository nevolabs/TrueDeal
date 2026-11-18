import { createClient } from '@/utils/supabase/server';
import { guarded, ok } from '@/lib/api-helpers';
import { assertSameOrigin, jsonBody, text } from '@/lib/validation';
import { AppError } from '@/lib/errors';
export async function POST(request: Request) {
  return guarded(async () => {
    assertSameOrigin(request);
    const body=await jsonBody(request);
    const supabase=await createClient();
    if (body.action==='recover') {
      const origin=new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url).origin;
      const {error}=await supabase.auth.resetPasswordForEmail(text(body.email,'email',254),{redirectTo:origin+'/auth/confirm?next=/auth/reset-password'});
      if(error?.status===429) throw new AppError('Please wait before requesting another email.',429);
      if(error && error.status && error.status>=500) throw new AppError('Email delivery is temporarily unavailable.',503);
      return ok({message:'If an account exists, a password reset email has been sent.'});
    }
    if(body.action!=='update' || typeof body.password!=='string' || body.password.length<8 || body.password.length>128) throw new AppError('Use a password with 8–128 characters.');
    const {data:{user},error:identityError}=await supabase.auth.getUser();
    if(identityError || !user) throw new AppError('Open the reset link from your email first.',401);
    const {error}=await supabase.auth.updateUser({password:body.password});
    if(error) throw new AppError('Could not update your password. Request a new reset link.');
    await supabase.auth.signOut({scope:'global'});
    return ok({done:true});
  });
}
