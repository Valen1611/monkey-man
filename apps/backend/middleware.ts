import { NextRequest, NextResponse } from 'next/server';

function addCorsHeaders(response: NextResponse): NextResponse {
  const origin = process.env.CORS_ORIGIN || '*';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-api-secret, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version'
  );
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export function middleware(request: NextRequest) {
  // 1. Handle preflight CORS requests immediately
  if (request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    return addCorsHeaders(preflight);
  }

  // 2. Validate API secret if configured
  const secret = process.env.API_SECRET;
  if (secret) {
    const provided = request.headers.get('x-api-secret');
    if (provided !== secret) {
      const unauthorized = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      return addCorsHeaders(unauthorized);
    }
  }

  // 3. Forward request with CORS headers attached
  const response = NextResponse.next();
  return addCorsHeaders(response);
}

export const config = {
  matcher: '/api/:path*',
};
