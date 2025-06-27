import { NextResponse } from 'next/server';
import { redisService } from '@/lib/services/redisService';

export async function GET() {
  try {
    const data = await redisService.getInventoryData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] inventory GET error', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
