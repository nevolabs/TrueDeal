import { marketplaceRead } from '@/lib/marketplace-api';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { return marketplaceRead(request, "listing", (await params).id); }
