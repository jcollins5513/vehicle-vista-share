import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasAwsCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
        hasOpenAiKey: !!process.env.OPENAI_API_KEY,
        mediaBucket: process.env.VEHICLE_MEDIA_BUCKET,
        assetsBucket: process.env.VEHICLE_ASSETS_BUCKET,
        awsRegion: process.env.AWS_REGION,
      },
    };

    return NextResponse.json(healthStatus);
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}