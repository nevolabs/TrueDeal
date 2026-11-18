import { guarded,ok } from '@/lib/api-helpers';
import { requireUser } from '@/lib/session';
import { assertSameOrigin,jsonBody,text } from '@/lib/validation';
import { readState } from '@/lib/repository';
import { createClient } from '@/utils/supabase/server';
import { AppError } from '@/lib/errors';
import { databaseError } from '@/lib/errors';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  return guarded(async()=>{
    await requireUser();const {id}=await params;
    if(!(await readState()).orders.some(o=>o.id===id)) throw new AppError('Order not found.',404);
    const client=await createClient();
    const {data,error}=await client.from('order_evidence').select('id,storage_path,created_at').eq('order_id',id).order('created_at').limit(100);
    if(error) databaseError(error);
    const signed=await client.storage.from('order-evidence').createSignedUrls((data||[]).map(row=>row.storage_path),60);
    if(signed.error) throw new AppError('Evidence is temporarily unavailable.',503);
    return ok({evidence:(data||[]).map((row,i)=>({id:row.id,at:row.created_at,url:signed.data?.[i]?.signedUrl}))});
  });
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  return guarded(async()=>{
    assertSameOrigin(request);await requireUser();const {id}=await params;
    if(!(await readState()).orders.some(o=>o.id===id)) throw new AppError('Order not found.',404);
    const body=await jsonBody(request);const path=text(body.path,'evidence path',300);
    if(!path.startsWith(id+'/') || path.includes('..')) throw new AppError('Invalid evidence path.');
    const {data,error}=await (await createClient()).storage.from('order-evidence').createSignedUrl(path,60);
    if(error) throw new AppError('Evidence unavailable.',404);
    return ok({url:data.signedUrl});
  });
}
