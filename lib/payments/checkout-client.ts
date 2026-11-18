'use client';

interface CheckoutDetails {key:string;orderId:string;amount:number;currency:string;appOrderId:string;testMode:boolean}
interface CheckoutResult {razorpay_payment_id:string;razorpay_order_id:string;razorpay_signature:string}
interface CheckoutWindow extends Window {
  Razorpay?:new(options:Record<string,unknown>)=>{open:()=>void;on:(name:string,handler:()=>void)=>void};
}
let loading:Promise<void>|undefined;
async function loadCheckout() {
  if((window as CheckoutWindow).Razorpay) return;
  loading??=new Promise<void>((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';
    script.onload=()=>resolve();script.onerror=()=>{loading=undefined;reject(new Error('Could not load secure checkout.'));};
    document.head.appendChild(script);
  });
  await loading;
}
export async function openCheckout(details:CheckoutDetails):Promise<CheckoutResult> {
  await loadCheckout();
  const Checkout=(window as CheckoutWindow).Razorpay;
  if(!Checkout) throw new Error('Checkout is unavailable.');
  return new Promise((resolve,reject)=>{
    const checkout=new Checkout({key:details.key,order_id:details.orderId,amount:details.amount,currency:details.currency,
      name:'TrueDeal',description:details.testMode?'Test payment':'Protected marketplace purchase',
      handler:resolve,modal:{ondismiss:()=>reject(new Error('Checkout closed. You can resume from your order.'))}});
    checkout.on('payment.failed',()=>reject(new Error('Payment was not confirmed. Check your order before retrying.')));
    checkout.open();
  });
}
