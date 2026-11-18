'use client';
import {useEffect,useState} from 'react';
import {api} from '@/lib/client';
export default function EvidencePanel({orderId}:{orderId:string}) {
 const [evidence,setEvidence]=useState<{id:string;at:string;url?:string}[]>([]);
 const [file,setFile]=useState<File|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;api.get<{evidence:typeof evidence}>(`/api/orders/${orderId}/evidence`).then(r=>{if(active)setEvidence(r.evidence);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[orderId]);
 return <section className="rounded-xl border border-neutral-200 p-5"><h2 className="font-semibold">Private order evidence</h2>
 <p className="my-2 text-sm text-neutral-600">Upload photos of the item, parcel or inspection. The buyer, seller and authorized operations team can view them.</p>
 <ul className="my-3 space-y-2 text-sm">{evidence.map((item,i)=><li key={item.id}>{item.url?<a className="underline" href={item.url} target="_blank" rel="noopener noreferrer">Evidence {i+1} — {new Date(item.at).toLocaleString('en-IN')}</a>:'File unavailable'}</li>)}</ul>
 <form className="flex flex-col gap-3" onSubmit={async e=>{e.preventDefault();if(!file)return;setBusy(true);setError('');try{
  const body=new FormData();body.set('file',file);body.set('orderId',orderId);const response=await fetch('/api/uploads',{method:'POST',body});const result=await response.json();
  if(!response.ok)throw new Error(result.error||'Upload failed.');setFile(null);
  const updated=await api.get<{evidence:typeof evidence}>(`/api/orders/${orderId}/evidence`);setEvidence(updated.evidence);
 }catch(e){setError(e instanceof Error?e.message:'Upload failed.');}finally{setBusy(false);}}}>
 <label className="text-sm">Image, up to 5 MB<input required type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
 {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy||!file} className="w-fit rounded-full bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">{busy?'Uploading…':'Upload evidence'}</button></form></section>;
}
