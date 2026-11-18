export function paymentsEnabled() {
  return process.env.PAYMENTS_ENABLED === 'true' && !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET && !!process.env.SUPABASE_SECRET_KEY;
}
