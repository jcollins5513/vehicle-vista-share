import { NextRequest, NextResponse } from "next/server";
import { MediaType } from "@/types/media";
import { redisService } from "@/lib/services/redisService";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Get all general media (not associated with a specific vehicle)
    const media = await redisService.getUnattachedMedia();
    
    return NextResponse.json(media);
  } catch (err) {
    console.error("GET /media/general", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url, type }: { url: string; type: MediaType } = await req.json();
    if (!url || !type) {
      return new NextResponse("Missing url or type", { status: 400 });
    }
    // Saving new media is not implemented in the Redis-only version
    return new NextResponse("Not Implemented", { status: 501 });
  } catch (err) {
    console.error("POST /media/general", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
