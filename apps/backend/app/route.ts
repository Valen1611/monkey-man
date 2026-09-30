import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'monkey-man-backend',
    timestamp: new Date().toISOString()
  });
}
