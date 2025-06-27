import { NextResponse } from "next/server";
import { redisService } from "@/lib/services/redisService";

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

    // Reordering media is not yet implemented with Redis
    return new NextResponse("Not Implemented", { status: 501 });
  } catch (error) {
    console.error("Failed to reorder media:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
