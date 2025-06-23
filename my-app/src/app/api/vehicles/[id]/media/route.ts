import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { MediaType } from "@/types/media";

export const runtime = "nodejs";

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vehicleId = params.id;
    
    // Verify the vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    
    if (!vehicle) {
      return new NextResponse("Vehicle not found", { status: 404 });
    }
    
    // Get all media for this vehicle
    const media = await prisma.media.findMany({
      where: { vehicleId },
      orderBy: { createdAt: 'asc' },
    });
    
    return NextResponse.json(media);
  } catch (err) {
    console.error("GET /vehicles/:id/media", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vehicleId = params.id;
    const { url, type }: { url: string; type: MediaType } = await req.json();

    if (!url || !type) {
      return new NextResponse("Missing url or type", { status: 400 });
    }

    const media = await prisma.media.create({
      data: {
        url,
        type,
        vehicleId,
      },
    });

    return NextResponse.json(media);
  } catch (err) {
    console.error("POST /vehicles/:id/media", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
