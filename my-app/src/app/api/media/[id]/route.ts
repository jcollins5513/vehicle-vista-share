import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteObjectFromS3 } from "@/lib/s3";

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
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    // Delete from S3 first
    if (media.s3Key) {
      await deleteObjectFromS3(media.s3Key);
    }

    // Then delete from database
    await prisma.media.delete({
      where: { id: mediaId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete media:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
