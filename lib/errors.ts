export class AppError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function databaseError(error: { code?: string; message: string }): never {
  if (error.code === '42501') throw new AppError(error.message, 403);
  if (error.code === 'P0001') throw new AppError(error.message, 409);
  if (['23505', '23514', '23502', '22P02', '22003'].includes(error.code || '')) throw new AppError('Invalid data or a conflicting transaction.', 409);
  if (['PGRST202', 'PGRST205', '42P01'].includes(error.code || '')) throw new AppError('Database setup is incomplete. Apply the Supabase migrations.', 503);
  console.error('Database operation failed', error.code);
  throw new AppError('The database is temporarily unavailable.', 503);
}
