import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '../errors';
import { paymentsEnabled } from './config';

export function verifyHmac(raw:string,signature:string,secret:string) {
  if(!/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac('sha256',secret).update(raw).digest(),Buffer.from(signature,'hex'));
}
export function paymentEnvironment() { return process.env.RAZORPAY_KEY_ID?.startsWith('rzp_live_')?'live':'test'; }

export interface ProviderPayment { id:string; order_id:string; amount:number; currency:string; status:string }
export interface ProviderTransfer { id:string; source:string; recipient:string; amount:number; currency:string; status:string; on_hold:boolean; settlement_status:string; recipient_settlement_id:string|null; amount_reversed:number }
export interface ProviderRefund { id:string; payment_id:string; amount:number; status:string; notes?:{operation_id?:string} }
export interface ProviderOrder { id:string; amount:number; currency:string; receipt:string; transfers?:ProviderTransfer[] }

export async function razorpay<T>(path:string,method='GET',body?:unknown):Promise<T> {
  if(!paymentsEnabled()) throw new AppError('Payments are disabled until Route is configured.',503);
  if(!/^\/(orders|payments|transfers|accounts)\b/.test(path)) throw new Error('Unsupported provider resource');
  let response:Response;
  try {
    response=await fetch('https://api.razorpay.com/v1'+path,{
      method,headers:{Authorization:'Basic '+Buffer.from(process.env.RAZORPAY_KEY_ID+':'+process.env.RAZORPAY_KEY_SECRET).toString('base64'),'Content-Type':'application/json'},
      body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(20000),
    });
  } catch {throw new AppError('Payment provider outcome is unknown. Reconciliation is required.',503);}
  if(!response.ok) throw new AppError('The payment provider rejected the operation. Please contact support.',502);
  return response.json() as Promise<T>;
}
