import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { MediaType } from "@/types/media";

export const runtime = "nodejs";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get all general media (not associated with a specific vehicle)
    const media = await prisma.media.findMany({
      where: { vehicleId: null },
      orderBy: { order: 'asc' },
    });
    
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
    const media = await prisma.media.create({
      data: {
        url,
        type,
        vehicleId: null,
      },
    });
    return NextResponse.json(media);
  } catch (err) {
    console.error("POST /media/general", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
