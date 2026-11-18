import { AppError } from './errors';
export function text(value: unknown, label: string, max = 100, min = 1): string {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new AppError(`Enter a valid ${label}.`);
  return value.trim();
}
export function oneOf<T extends string>(value: unknown, options: readonly T[], label: string): T {
  if (typeof value !== 'string' || !options.includes(value as T)) throw new AppError(`Invalid ${label}.`);
  return value as T;
}
export function safeNext(value: string | null, fallback = '/browse'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x20]/.test(value)) return fallback;
  return value;
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = new URL(process.env.NEXT_PUBLIC_SITE_URL || request.url).origin;
  if (!origin || origin !== expected || request.headers.get('sec-fetch-site') === 'cross-site') throw new AppError('This request must come from this website.', 403);
}
export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new AppError('Expected JSON.');
  const raw = await request.text();
  if (raw.length > 32000) throw new AppError('Request too large.', 413);
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new AppError('Invalid JSON.'); }
}
