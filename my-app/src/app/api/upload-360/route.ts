import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@/generated/prisma';
import { withAccelerate } from '@prisma/extension-accelerate';
import { isAllowedImageType, sanitizeKeySegment } from '@/lib/security';

export const runtime = 'nodejs';

// Raster images only, capped so an anonymous caller can't upload multi-GB blobs
// or store active content (svg/html) in the public bucket.
const MAX_360_BYTES = 15 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const prisma = new PrismaClient().$extends(withAccelerate());

const s3Client = new S3Client({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

async function uploadToS3(file: Buffer, fileName: string, contentType: string) {
  const bucketName = process.env.VEHICLE_MEDIA_BUCKET as string;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: `360-images/${fileName}`,
    Body: file,
    ContentType: contentType,
  });

  try {
    await s3Client.send(command);
    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/360-images/${fileName}`;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw new Error('Failed to upload file to S3.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rawStockNumber = formData.get('stockNumber') as string | null;

    if (!file || !rawStockNumber) {
      return NextResponse.json({ error: 'Missing file or stock number.' }, { status: 400 });
    }

    // stockNumber becomes both an S3 key and a DB unique key — constrain it so a
    // caller can't traverse paths or overwrite an unrelated stock's record.
    const stockNumber = sanitizeKeySegment(rawStockNumber, { maxLength: 32 });
    if (!stockNumber) {
      return NextResponse.json({ error: 'Invalid stock number.' }, { status: 400 });
    }

    if (!isAllowedImageType(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, or WebP images are allowed.' }, { status: 400 });
    }
    if (file.size > MAX_360_BYTES) {
      return NextResponse.json({ error: 'Image exceeds the 15MB limit.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = EXT_BY_TYPE[file.type] ?? 'jpg';
    const imageUrl = await uploadToS3(buffer, `${stockNumber}.${ext}`, file.type);

    const result = await prisma.threeSixtyImage.upsert({
        where: { stockNumber: stockNumber },
        update: { imageUrl: imageUrl },
        create: { stockNumber: stockNumber, imageUrl: imageUrl },
    });

    return NextResponse.json({ success: true, imageUrl: result.imageUrl });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Upload failed: ${errorMessage}` }, { status: 500 });
  }
}
