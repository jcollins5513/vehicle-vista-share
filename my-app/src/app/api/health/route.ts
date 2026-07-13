import { NextResponse } from 'next/server';

export async function GET() {
  // Public, unauthenticated endpoint — must not disclose bucket names, region,
  // or which credentials are configured. Detailed diagnostics are dev-only.
  const isDev = process.env.NODE_ENV === 'development';

  const healthStatus: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };

  if (isDev) {
    healthStatus.environment = {
      nodeEnv: process.env.NODE_ENV,
      hasAwsCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      hasOpenAiKey: !!process.env.OPENAI_API_KEY,
      mediaBucket: process.env.VEHICLE_MEDIA_BUCKET,
      assetsBucket: process.env.VEHICLE_ASSETS_BUCKET,
      awsRegion: process.env.AWS_REGION,
    };
  }

  return NextResponse.json(healthStatus);
}