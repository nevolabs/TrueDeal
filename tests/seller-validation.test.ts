import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sellerReady, validateSellerDetails } from '../lib/seller-validation';

const input = { legalName: 'Seller Name', accountHolder: ' seller  name ', pan: 'abcpn1234e', accountNumber: '012345678901', confirmAccountNumber: '012345678901', ifsc: 'sbin0001234' };
test('basic seller checks normalize formats, preserve leading zeroes and do not imply verification', () => {
  const result = validateSellerDetails(input);
  assert.equal(result.pan, 'ABCPN1234E');
  assert.equal(result.ifsc, 'SBIN0001234');
  assert.equal(result.accountNumber, '012345678901');
  assert.equal(sellerReady({ status: 'pending', basicStatus: 'checked' }), true);
  assert.equal(sellerReady({ status: 'pending' }), false);
});
test('basic seller checks reject malformed, inconsistent and numeric account input', () => {
  for (const invalid of [{ pan: 'ABCCN1234E' }, { pan: 'ABCPN0000E' }, { ifsc: 'SBINO001234' }, { accountNumber: 123456789 }, { accountNumber: '0000000000' }, { confirmAccountNumber: '123456789' }, { accountHolder: 'Another person' }]) {
    assert.throws(() => validateSellerDetails({ ...input, ...invalid }));
  }
});
