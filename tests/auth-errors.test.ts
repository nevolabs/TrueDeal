import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signupError } from '../lib/auth-errors';

test('signup distinguishes email delivery restrictions from retryable rate limits', () => {
  const restricted = signupError({ code: 'email_address_not_authorized', status: 403 });
  assert.equal(restricted.status, 503);
  assert.match(restricted.message, /email service configured/);
  for (const error of [{ status: 429 }, { code: 'over_email_send_rate_limit' }, { code: 'over_request_rate_limit' }]) {
    const result = signupError(error);
    assert.equal(result.status, 429);
    assert.match(result.message, /wait before trying again/);
    assert.doesNotMatch(result.message, /confirmation email/);
  }
});

test('signup provides actionable validation and availability errors without exposing provider details', () => {
  assert.match(signupError({ code: 'weak_password' }).message, /stronger password/);
  assert.match(signupError({ code: 'email_address_invalid' }).message, /valid email/);
  for (const code of ['signup_disabled', 'email_provider_disabled']) {
    assert.equal(signupError({ code }).status, 503);
  }
  assert.equal(signupError({ status: 500 }).status, 503);
  const unexpected = signupError({ code: 'internal-secret-information', status: 422 });
  assert.equal(unexpected.status, 400);
  assert.doesNotMatch(unexpected.message, /internal-secret-information/);
  // Do not reveal whether a particular address has an account.
  assert.equal(signupError({ code: 'user_already_exists' }).message, signupError({}).message);
  assert.doesNotMatch(signupError({}).message, /confirm your email/);
});
