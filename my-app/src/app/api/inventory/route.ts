import { NextResponse } from 'next/server';
import { redisService } from '@/lib/services/redisService';

export async function GET(request: Request) {
  try {
    // Parse URL to get query parameters
    const url = new URL(request.url);
    const forceFresh = url.searchParams.get('fresh') === 'true';
    
    console.log(`[API] Inventory GET request with forceFresh=${forceFresh}`);
    
    // Get inventory data with forceFresh parameter
    const data = await redisService.getInventoryData(forceFresh);
    
    // Set cache control headers
    const headers = new Headers();
    if (forceFresh) {
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
    } else {
      // Allow caching for 5 minutes if not forcing fresh
      headers.set('Cache-Control', 'public, max-age=300');
    }
    
    return NextResponse.json(data, { headers });
  } catch (error) {
    console.error('[API] inventory GET error', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
