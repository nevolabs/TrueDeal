import type { Kyc } from './types';
import { AppError } from './errors';

export function sellerReady(kyc: Kyc) {
  return kyc.status === 'verified' || kyc.basicStatus === 'checked';
}

export function validateSellerDetails(body: Record<string, unknown>) {
  const name = (value: unknown) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  const legalName = name(body.legalName);
  const accountHolder = name(body.accountHolder);
  const pan = typeof body.pan === 'string' ? body.pan.trim().toUpperCase() : '';
  const ifsc = typeof body.ifsc === 'string' ? body.ifsc.trim().toUpperCase() : '';
  const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber.trim() : '';
  const confirmAccountNumber = typeof body.confirmAccountNumber === 'string' ? body.confirmAccountNumber.trim() : '';
  if (legalName.length < 2 || legalName.length > 100 || !/^[\p{L} .'-]+$/u.test(legalName)) throw new AppError('Enter your full legal name.');
  if (!/^[A-Z]{3}P[A-Z][0-9]{4}[A-Z]$/.test(pan) || pan.slice(5, 9) === '0000') throw new AppError('Enter a valid individual PAN format (for example ABCPD1234E).');
  if (!/^\d{9,18}$/.test(accountNumber) || /^(\d)\1+$/.test(accountNumber)) throw new AppError('Enter a bank account number with 9–18 digits.');
  if (accountNumber !== confirmAccountNumber) throw new AppError('The account numbers do not match.');
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) throw new AppError('Enter an 11-character IFSC with zero as the fifth character.');
  if (accountHolder.toLowerCase() !== legalName.toLowerCase()) throw new AppError('The account holder name must match your legal name.');
  return { legalName, accountHolder, pan, accountNumber, confirmAccountNumber, ifsc };
}
