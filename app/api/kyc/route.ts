import { marketplaceWrite } from '@/lib/marketplace-api';
export async function POST(request: Request) { return marketplaceWrite(request, "submit_kyc"); }
