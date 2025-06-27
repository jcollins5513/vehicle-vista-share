import { NextRequest, NextResponse } from "next/server";
import { uploadBufferToS3 } from "@/lib/s3";
import { redisService } from "@/lib/services/redisService";
import { MediaType } from "@/types/media";

// 25MB limit for file uploads
const MAX_UPLOAD_SIZE = 25 * 1024 * 1024; // 25MB in bytes

// Helper function to convert a ReadableStream to a Buffer
async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  return Buffer.concat(chunks);
}

// Explicitly opt into Node runtime so we can use Buffer & AWS SDK.
export const runtime = "nodejs";


/**
 * POST /api/upload
 * Accepts multipart/form-data with a single `file` field (image/* or video/mp4).
 * Streams the file buffer to S3 and returns the public URL.
 */
export async function POST(req: NextRequest) {
  console.log('🔵 POST /api/upload - Starting request processing');
  
  try {
    // Log request headers for debugging
    const headers = Object.fromEntries(req.headers.entries());
    console.log('🔵 Request headers:', JSON.stringify(headers, null, 2));
    
    const contentType = req.headers.get("content-type") || "";
    console.log('🔵 Content-Type:', contentType);
    
    if (!contentType.includes("multipart/form-data")) {
      const errorMsg = `Bad Request: Expected multipart/form-data, got ${contentType}`;
      console.error('❌', errorMsg);
      return new NextResponse(errorMsg, { status: 400 });
    }

    console.log('🔵 Parsing form data...');
    const formData = await req.formData();
    console.log('🔵 Form data keys:', [...formData.keys()]);
    
    const file = formData.get("file");
    const vehicleId = formData.get("vehicleId") as string | null;
    
    console.log('🔵 File field type:', typeof file);
    console.log('🔵 File instance of File:', file instanceof File);
    console.log('🔵 File instance of Blob:', file instanceof Blob);
    
    if (!file) {
      const errorMsg = 'Bad Request: No file found in form data';
      console.error('❌', errorMsg);
      return new NextResponse(errorMsg, { status: 400 });
    }
    
    if (!(file instanceof File)) {
      const errorMsg = `Bad Request: Expected File object, got ${file?.constructor?.name || typeof file}`;
      console.error('❌', errorMsg);
      return new NextResponse(errorMsg, { status: 400 });
    }

    console.log('🔵 File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });
    
    if (file.size > MAX_UPLOAD_SIZE) {
      const errorMsg = `File size (${file.size} bytes) exceeds ${MAX_UPLOAD_SIZE} bytes limit`;
      console.error('❌', errorMsg);
      return new NextResponse(errorMsg, { status: 413 });
    }

    const isValidType = file.type.startsWith("image/") || file.type === "video/mp4";
    console.log('🔵 File type validation:', { type: file.type, isValidType });

    if (!isValidType) {
      const errorMsg = `Unsupported file type: ${file.type}. Expected image/* or video/mp4`;
      console.error('❌', errorMsg);
      return new NextResponse(errorMsg, { status: 415 });
    }

    // Convert File (Blob) to Buffer
    let buffer: Buffer;
    try {
      // Type assertion for file as File or Blob
      const fileObj: any = file;
      
      if ('arrayBuffer' in fileObj) {
        // For browser-like environments (Next.js edge runtime)
        const bytes = await fileObj.arrayBuffer();
        buffer = Buffer.from(bytes);
      } else if ('stream' in fileObj && typeof fileObj.stream === 'function') {
        // For Node.js streams
        const stream = fileObj.stream();
        if (stream && typeof stream === 'object' && 'getReader' in stream) {
          buffer = await streamToBuffer(stream as ReadableStream<Uint8Array>);
        } else {
          throw new Error('File stream is not available or invalid');
        }
      } else {
        throw new Error('Unsupported file type or stream');
      }

      console.log('🔵 File buffer created, size:', buffer.length, 'bytes');

      // Upload to S3
      const { url, key } = await uploadBufferToS3({
        buffer,
        mimeType: file.type,
        keyPrefix: vehicleId ? `vehicles/${vehicleId}` : "uploads",
      });

      console.log('✅ File uploaded to S3:', { url, key });

      // Cache metadata in Redis
      const mediaId = key.split("/").pop() || "";
      const mediaType = file.type.startsWith("image/") ? MediaType.IMAGE : MediaType.VIDEO;
      
      const mediaData = {
        id: mediaId,
        url,
        s3Key: key,
        type: mediaType,
        vehicleId: vehicleId || undefined,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('🔵 Caching media data in Redis:', JSON.stringify(mediaData, null, 2));
      await redisService.cacheMedia(mediaData);

      return NextResponse.json(mediaData);
    } catch (error: unknown) {
      const uploadError = error as Error;
      console.error('❌ Error during file processing or upload:', {
        error: uploadError,
        errorName: uploadError?.name,
        errorMessage: uploadError?.message,
        errorStack: uploadError?.stack,
      });
      
      // Rethrow with more context
      throw new Error(`Failed to process file upload: ${uploadError.message}`);
    }
  } catch (error: unknown) {
    const errorObj = error as Error;
    const errorInfo = {
      name: errorObj?.name || 'UnknownError',
      message: errorObj?.message || 'An unknown error occurred',
      stack: errorObj?.stack,
      constructor: errorObj?.constructor?.name,
      isError: errorObj instanceof Error,
      isTypeError: errorObj instanceof TypeError,
    };

    console.error("❌ Upload error:", {
      error: errorInfo,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });

    // Return a more detailed error response
    const errorResponse = {
      error: "File upload failed",
      message: errorInfo.message,
      ...(process.env.NODE_ENV === "development" && {
        details: {
          name: errorInfo.name,
          message: errorInfo.message,
          stack: errorInfo.stack,
        },
      }),
    };

    return new NextResponse(
      JSON.stringify(errorResponse, null, 2),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(JSON.stringify(errorResponse)).toString(),
        } 
      }
    );
  }
}
