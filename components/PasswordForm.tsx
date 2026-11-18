'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
export default function PasswordForm({reset=false}:{reset?:boolean}) {
  const [value,setValue]=useState('');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  return <form className="mx-auto my-12 flex max-w-md flex-col gap-4 px-4" onSubmit={async e=>{
    e.preventDefault();setBusy(true);setError('');
    try {const result=await api.post<{message?:string}>('/api/auth/password',reset?{action:'update',password:value}:{action:'recover',email:value});setMessage(result.message||'Password updated. Please sign in again.');}
    catch(e){setError(e instanceof Error?e.message:'Please retry.');}finally{setBusy(false);}
  }}><h1 className="text-2xl font-semibold">{reset?'Choose a new password':'Reset your password'}</h1>
    <label className="text-sm">{reset?'New password':'Email'}<input required minLength={reset?8:undefined} maxLength={reset?128:254} autoComplete={reset?'new-password':'email'} type={reset?'password':'email'} value={value} onChange={e=>setValue(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2"/></label>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{message&&<p role="status" className="text-sm text-emerald-800">{message}</p>}
    <button disabled={busy} className="rounded-full bg-neutral-900 px-4 py-2 text-white disabled:opacity-50">{busy?'Please wait…':reset?'Update password':'Send reset email'}</button>
    <Link href="/login" className="text-sm underline">Back to sign in</Link></form>;
}
