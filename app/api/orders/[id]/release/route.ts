import { marketplaceWrite } from '@/lib/marketplace-api';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { return marketplaceWrite(request, "release", (await params).id); }
