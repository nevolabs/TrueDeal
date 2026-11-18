import { createClient } from '@/utils/supabase/server';
import { databaseError } from './errors';
import type { Listing, Order, User } from './types';
export interface MarketplaceState { users: User[]; listings: Listing[]; orders: Order[] }
export async function readState(): Promise<MarketplaceState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('app_state');
  if (error) databaseError(error);
  return data as MarketplaceState;
}
export async function command(action: string, entity: string | null = null, body: unknown = {}): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('marketplace_command', { action, entity, body });
  if (error) databaseError(error);
  return data as string;
}
