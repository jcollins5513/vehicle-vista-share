import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ReorderRequest {
  id: string;
  order: number;
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as ReorderRequest[];

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const updatePromises = body.map((item) =>
      prisma.media.update({
        where: { id: item.id },
        data: { order: item.order },
      })
    );

    await prisma.$transaction(updatePromises);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to reorder media:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
