import { authRequest } from '@/lib/auth-api';
export async function POST(request: Request) { return authRequest(request, true); }
