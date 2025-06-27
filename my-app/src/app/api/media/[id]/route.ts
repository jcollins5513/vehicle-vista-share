import { NextResponse } from "next/server";
import { deleteObjectFromS3 } from "@/lib/s3";
import { redisService } from "@/lib/services/redisService";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const mediaId = params.id;

  if (!mediaId) {
    return NextResponse.json(
      { error: "Media ID is required" },
      { status: 400 }
    );
  }

  try {
    const media = await redisService.getMedia(mediaId);

    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    // Delete from S3 first
    if (media.s3Key) {
      await deleteObjectFromS3(media.s3Key);
    }

    // Removing from Redis cache is not yet implemented

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete media:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
