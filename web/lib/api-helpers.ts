import { NextResponse } from 'next/server';
import { AppError } from './store';

export function ok(data: unknown, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function guarded(fn: () => Promise<Response> | Response): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AppError) return fail(e.message, 400);
    console.error(e);
    return fail('Something went wrong.', 500);
  }
}
