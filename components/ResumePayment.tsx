'use client';
import { useState } from 'react';
import { api } from '@/lib/client';
import { openCheckout } from '@/lib/payments/checkout-client';
export default function ResumePayment({orderId,onDone}:{orderId:string;onDone:()=>void}) {
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  return <><button disabled={busy} className="rounded-full bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50" onClick={async()=>{
    setBusy(true);setError('');
    try {
      const details=await api.post<Parameters<typeof openCheckout>[0]>(`/api/orders/${orderId}/checkout`);
      const result=await openCheckout(details);await api.post('/api/payments/verify',{orderId,...result});onDone();
    } catch(e){setError(e instanceof Error?e.message:'Payment not confirmed.');}finally{setBusy(false);}
  }}>{busy?'Opening checkout…':'Resume payment'}</button>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}</>;
}
