import { NextResponse } from "next/server";
import { deleteObjectFromS3 } from "@/lib/s3";
import { redisService } from "@/lib/services/redisService";
import redis from "@/lib/redis";

// Define key patterns locally since they're not exported from redisService
const MEDIA_KEY = (id: string) => `media:${id}`;
const VEHICLE_MEDIA_KEY = (vehicleId: string) => `vehicle:${vehicleId}:media`;

/**
 * DELETE /api/media/[id]
 * Deletes a media item from both S3 and Redis
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id: mediaId } = params;

  if (!mediaId) {
    return NextResponse.json(
      { error: "Media ID is required" },
      { status: 400 }
    );
  }

  try {
    // Get media metadata from Redis first
    const media = await redisService.getMedia(mediaId);

    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    // Delete from S3 if s3Key exists
    if (media.s3Key) {
      try {
        await deleteObjectFromS3(media.s3Key);
      } catch (s3Error) {
        console.error("Failed to delete from S3:", s3Error);
        // Continue with Redis cleanup even if S3 delete fails
      }
    }

    // Remove from Redis
    try {
      // Delete the media entry
      await redis.del(MEDIA_KEY(mediaId));
      
      // If this media was associated with a vehicle, update the vehicle's media list
      if (media.vehicleId) {
        await redis.zrem(VEHICLE_MEDIA_KEY(media.vehicleId), mediaId);
      } else {
        // If not associated with a vehicle, remove from unattached media
        await redis.zrem('media:unattached', mediaId);
      }
    } catch (redisError) {
      console.error("Failed to delete from Redis:", redisError);
      throw new Error("Failed to remove media from database");
    }

    return NextResponse.json(
      { success: true, message: "Media deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete media:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
