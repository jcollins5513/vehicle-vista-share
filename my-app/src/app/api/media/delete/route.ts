import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteObjectFromS3 } from "@/lib/s3";

export async function DELETE(request: NextRequest) {
  try {
    // Get the media ID from the URL
    const searchParams = request.nextUrl.searchParams;
    const mediaId = searchParams.get("id");

    if (!mediaId) {
      return NextResponse.json(
        { error: "Media ID is required" },
        { status: 400 }
      );
    }

    // Get the media item to retrieve the S3 key
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      return NextResponse.json(
        { error: "Media not found" },
        { status: 404 }
      );
    }

    // Delete from S3 if it has an S3 key
    if (media.s3Key) {
      await deleteObjectFromS3(media.s3Key);
    }

    // Delete from database
    await prisma.media.delete({
      where: { id: mediaId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting media:", error);
    return NextResponse.json(
      { error: "Failed to delete media" },
      { status: 500 }
    );
  }
}
