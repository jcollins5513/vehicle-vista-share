import { NextRequest, NextResponse } from "next/server";
import { MediaType } from "@/types/media";
import { redisService } from "@/lib/services/redisService";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const vehicleId = params.id;
    
    // Verify the vehicle exists
    const vehicle = await redisService.getVehicle(vehicleId);

    if (!vehicle) {
      return new NextResponse("Vehicle not found", { status: 404 });
    }

    // Get all media for this vehicle
    const media = await redisService.getVehicleMedia(vehicleId);
    
    return NextResponse.json(media);
  } catch (err) {
    console.error("GET /vehicles/:id/media", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const _vehicleId = params.id;
    const { url, type }: { url: string; type: MediaType } = await req.json();

    if (!url || !type) {
      return new NextResponse("Missing url or type", { status: 400 });
    }

    // In a Redis-only setup we would store media metadata here.
    // For now, return Not Implemented to indicate the feature is disabled.
    return new NextResponse("Not Implemented", { status: 501 });
  } catch (err) {
    console.error("POST /vehicles/:id/media", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
