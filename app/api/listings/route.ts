import { marketplaceRead, marketplaceWrite } from '@/lib/marketplace-api';
export async function GET(request: Request) { return marketplaceRead(request, "browse"); }
export async function POST(request: Request) { return marketplaceWrite(request, "create_listing"); }
