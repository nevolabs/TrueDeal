'use client';
import {useState} from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import {useSession} from '@/lib/session-context';
import {api} from '@/lib/client';
function Form(){
 const {user,refresh}=useSession();
 const [legalName,setLegalName]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 if(!user)return null;
 if(user.kyc.status==='verified')return <div className="mx-auto max-w-lg px-4 py-12"><h1 className="text-xl font-semibold">Seller review complete</h1><p className="my-3 text-sm">Payment onboarding is a separate step. Our team will arrange it before buyers can pay.</p><Link className="underline" href="/sell/new">List an item</Link></div>;
 if(user.kyc.status==='pending')return <p role="status" className="mx-auto max-w-lg px-4 py-12">Your seller review request is pending. Our team will contact you about verification.</p>;
 return <form className="mx-auto my-12 flex max-w-lg flex-col gap-4 px-4" onSubmit={async e=>{e.preventDefault();setError('');setBusy(true);try{await api.post('/api/kyc',{legalName});await refresh();}catch(e){setError(e instanceof Error?e.message:'Please retry.');}finally{setBusy(false);}}}>
 <h1 className="text-2xl font-semibold">Start seller verification</h1><p className="text-sm text-neutral-600">Submit your legal name for review. Our team will arrange identity and payout onboarding through the payment provider. Do not send bank details, PAN or Aadhaar through this form.</p>
 <label className="text-sm">Legal name<input required minLength={2} maxLength={100} className="mt-1 w-full rounded-md border px-3 py-2" value={legalName} onChange={e=>setLegalName(e.target.value)}/></label>
 {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy} className="rounded-full bg-neutral-900 py-2 text-white disabled:opacity-50">{busy?'Submitting…':'Request seller review'}</button></form>;
}
export default function Page(){return <RequireAuth><Form/></RequireAuth>;}
