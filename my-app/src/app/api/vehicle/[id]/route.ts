import { NextRequest, NextResponse } from "next/server";
import { redisService } from "@/lib/services/redisService";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const vehicleId = params.id;

    if (!vehicleId) {
      return NextResponse.json(
        { error: "Vehicle ID is required" },
        { status: 400 }
      );
    }

    // Fetch the vehicle with its media from Redis
    const vehicle = await redisService.getVehicle(vehicleId);

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    // Fetch any manual media that might be relevant (not associated with a vehicle)
    const manualMedia = await redisService.getUnattachedMedia();

    // Filter out stock photos from vehicle images
    const filteredVehicleImages = (vehicle.images || []).filter((url: string) => {
      const lowerUrl = url.toLowerCase();
      return !lowerUrl.includes('rtt') && !lowerUrl.includes('chrome') && !lowerUrl.includes('default');
    });

    // Get manual media URLs for this vehicle
    const vehicleManualMedia = (vehicle.media || [])
      .filter((media: { url: string }) => {
        const url = media.url.toLowerCase();
        return !url.includes('rtt') && !url.includes('chrome') && !url.includes('default');
      })
      .map((media: { url: string }) => media.url);

    // Combine vehicle images with manual media
    const allImages = [...filteredVehicleImages, ...vehicleManualMedia];

    // Create the response object with the correct structure
    const vehicleWithMedia = {
      ...vehicle,
      id: vehicle.id || vehicleId,
      images: allImages,
      manualMedia: manualMedia.map(media => ({ url: media.url })),
    };

    return NextResponse.json(vehicleWithMedia);
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicle" },
      { status: 500 }
    );
  }
}
