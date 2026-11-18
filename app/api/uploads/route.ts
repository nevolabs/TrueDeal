import { randomUUID } from 'node:crypto';
import { createClient } from '@/utils/supabase/server';
import { requireUser } from '@/lib/session';
import { assertSameOrigin } from '@/lib/validation';
import { guarded,ok } from '@/lib/api-helpers';
import { AppError } from '@/lib/errors';
import { readState } from '@/lib/repository';
import { databaseError } from '@/lib/errors';

export async function POST(request:Request) {
  return guarded(async()=>{
    assertSameOrigin(request);const me=await requireUser();
    const form=await request.formData();const file=form.get('file');
    if(!(file instanceof File) || file.size>5*1024*1024) throw new AppError('Upload an image smaller than 5 MB.');
    const bytes=new Uint8Array(await file.arrayBuffer());
    let extension:string|undefined;
    if(bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) extension='jpg';
    else if(Buffer.from(bytes.subarray(0,8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))) extension='png';
    else if(Buffer.from(bytes.subarray(0,4)).toString()==='RIFF' && Buffer.from(bytes.subarray(8,12)).toString()==='WEBP') extension='webp';
    if(!extension) throw new AppError('Use a JPEG, PNG or WebP image.');
    const orderId=form.get('orderId');
    let bucket='listing-photos';let path=me.id+'/'+randomUUID()+'.'+extension;
    if(orderId) {
      if(typeof orderId!=='string' || !(await readState()).orders.some(o=>o.id===orderId)) throw new AppError('Order not found.',404);
      bucket='order-evidence';path=orderId+'/'+path;
    }
    const supabase=await createClient();
    const {error}=await supabase.storage.from(bucket).upload(path,bytes,{contentType:extension==='jpg'?'image/jpeg':'image/'+extension,upsert:false});
    if(error) throw new AppError('Upload failed. Check that Storage policies are configured.',503);
    if(orderId) {
      const {error:recordError}=await supabase.from('order_evidence').insert({order_id:orderId,submitted_by:me.id,storage_path:path});
      if(recordError) databaseError(recordError);
    }
    const url=bucket==='listing-photos'?supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl:undefined;
    return ok({bucket,path,url},201);
  });
}
