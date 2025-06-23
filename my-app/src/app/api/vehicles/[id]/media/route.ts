import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const runtime = "nodejs";

const prisma = new PrismaClient();

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
