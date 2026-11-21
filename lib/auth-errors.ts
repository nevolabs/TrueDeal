import { AppError } from './errors';

// Translate provider codes rather than exposing raw messages or account data.
export function signupError(error: { code?: string; status?: number }): AppError {
  if (error.status === 429 || error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') {
    return new AppError('Too many signup requests. Please wait before trying again.', 429);
  }
  if (error.code === 'email_address_not_authorized') {
    return new AppError('Confirmation email delivery is not configured for this address yet. TrueDeal needs its email service configured before you can sign up.', 503);
  }
  if (error.code === 'weak_password') {
    return new AppError('Choose a stronger password with uppercase and lowercase letters, numbers and a symbol.');
  }
  if (error.code === 'email_address_invalid') return new AppError('Enter a valid email address.');
  if (error.code === 'signup_disabled' || error.code === 'email_provider_disabled') {
    return new AppError('Account registration is temporarily unavailable. Please try again later.', 503);
  }
  if (error.status && error.status >= 500) {
    return new AppError('Account registration is temporarily unavailable. Please try again later.', 503);
  }
  return new AppError('Could not create an account. If you already registered, sign in or reset your password.');
}
