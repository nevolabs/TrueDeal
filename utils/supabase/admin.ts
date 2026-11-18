import { createClient } from '@supabase/supabase-js';
import { AppError } from '@/lib/errors';

// Only import in server routes/services. This client bypasses RLS.
export function createAdminClient() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY;
  if(!url || !key) throw new AppError('Server database credentials are not configured.',503);
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
