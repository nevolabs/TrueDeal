import { marketplaceRead, marketplaceWrite } from '@/lib/marketplace-api';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { return marketplaceRead(request, "listing", (await params).id); }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { return marketplaceWrite(request, 'update_listing', (await params).id); }
