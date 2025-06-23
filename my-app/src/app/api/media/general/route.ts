import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, MediaType } from "@prisma/client";

export const runtime = "nodejs";

const prisma = new PrismaClient();

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
