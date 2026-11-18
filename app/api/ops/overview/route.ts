import { marketplaceRead } from '@/lib/marketplace-api';
export async function GET(request: Request) { return marketplaceRead(request, "ops"); }
