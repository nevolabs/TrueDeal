import { marketplaceWrite } from '@/lib/marketplace-api';
export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) { return marketplaceWrite(request, "review_kyc", (await params).userId); }
