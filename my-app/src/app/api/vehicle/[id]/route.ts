import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vehicleId = params.id;

    if (!vehicleId) {
      return NextResponse.json(
        { error: "Vehicle ID is required" },
        { status: 400 }
      );
    }

    // Fetch the vehicle with its media
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        media: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    // Fetch any manual media that might be relevant (not associated with a vehicle)
    const manualMedia = await prisma.media.findMany({
      where: { vehicleId: null },
      orderBy: { order: "asc" },
    });

    // Filter out stock photos from vehicle media
    const filteredVehicleMedia = vehicle.media.filter((media: { url: string }) => {
      const url = media.url.toLowerCase();
      return !url.includes('rtt') && !url.includes('chrome') && !url.includes('default');
    });

    // Combine vehicle data with filtered media
    const vehicleWithMedia = {
      ...vehicle,
      media: filteredVehicleMedia,
      manualMedia: manualMedia,
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
