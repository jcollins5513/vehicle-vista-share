import { NextRequest, NextResponse } from "next/server";
import { uploadBufferToS3 } from "@/lib/s3";
import { MediaType } from "@/types/media";
import { redisService } from "@/lib/services/redisService";

// Explicitly opt into Node runtime so we can use Buffer & AWS SDK.
export const runtime = "nodejs";

// Max request body size ~ 26 MB (Next.js default is 4 MB for edge runtime, unlimited for node).
export const maxSize = 25 * 1024 * 1024; // 25 MB

/**
 * POST /api/upload
 * Accepts multipart/form-data with a single `file` field (image/* or video/mp4).
 * Streams the file buffer to S3 and returns the public URL.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new NextResponse("Bad Request: Expected multipart/form-data", { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const vehicleId = formData.get("vehicleId") as string | null;
    if (!file || !(file instanceof File)) {
      return new NextResponse("Bad Request: 'file' field missing", { status: 400 });
    }

    if (file.size > maxSize) {
      return new NextResponse("File exceeds 25MB limit", { status: 413 });
    }


    const isValidType =
      file.type.startsWith("image/") || file.type === "video/mp4";

    if (!isValidType) {
      return new NextResponse("Unsupported file type", { status: 415 });
    }

    // Convert File (Blob) to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { url, key } = await uploadBufferToS3({ buffer, mimeType: file.type });

    // Save metadata to database
    const mediaData = {
      url, // Use the direct S3 URL
      s3Key: key,
      type: file.type.startsWith("image/") ? MediaType.IMAGE : MediaType.VIDEO,
    };
    
    // In a Redis-only setup we simply return the uploaded file metadata
    if (vehicleId) {
      console.warn(`Vehicle with ID ${vehicleId} ignored in Redis-only upload`);
    }

    await redisService.cacheMedia({
      id: key,
      url,
      s3Key: key,
      type: file.type.startsWith("image/") ? MediaType.IMAGE : MediaType.VIDEO,
      vehicleId: vehicleId || undefined,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ url, key });
  } catch (err) {
    console.error("/api/upload error", err);
    // Return more detailed error message for debugging
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new NextResponse(`Internal Server Error: ${errorMessage}`, { status: 500 });
  }
}
