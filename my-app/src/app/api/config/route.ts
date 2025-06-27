import { NextResponse } from 'next/server';

export async function GET() {
  // Only expose non-sensitive configuration in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    aws: {
      region: process.env.AWS_REGION ? '***' : 'MISSING',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ? '***' : 'MISSING',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? '***' : 'MISSING',
      bucket: process.env.VEHICLE_MEDIA_BUCKET || 'MISSING',
    },
    redis: {
      url: process.env.UPSTASH_REDIS_REST_URL ? '***' : 'MISSING',
      token: process.env.UPSTASH_REDIS_REST_TOKEN ? '***' : 'MISSING',
    },
  });
}

// Prevent caching of this endpoint
export const dynamic = 'force-dynamic';
