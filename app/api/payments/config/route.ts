import { ok } from '@/lib/api-helpers';
import { paymentsEnabled } from '@/lib/payments/config';
import { paymentEnvironment } from '@/lib/payments/razorpay';
export async function GET() {return ok({enabled:paymentsEnabled(),testMode:paymentEnvironment()==='test'});}
