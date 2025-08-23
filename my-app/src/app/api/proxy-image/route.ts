import { NextRequest, NextResponse } from 'next/server';

// GET /api/proxy-image?url=<image-url>
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    
    if (!imageUrl) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    console.log(`[API] Proxying image: ${imageUrl}`);

    // Fetch the image from the external URL
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error(`[API] Failed to fetch image: ${response.status} ${response.statusText}`);
      return new NextResponse(`Failed to fetch image: ${response.status} ${response.statusText}`, { 
        status: response.status 
      });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    console.log(`[API] Successfully proxied image: ${imageUrl} (${imageBuffer.byteLength} bytes)`);

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('[API] Error proxying image:', error);
    return new NextResponse(
      `Error proxying image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}