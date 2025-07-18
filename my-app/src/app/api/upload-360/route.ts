import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@/generated/prisma';
import { withAccelerate } from '@prisma/extension-accelerate';

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
    ACL: 'public-read',
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
    const stockNumber = formData.get('stockNumber') as string | null;

    if (!file || !stockNumber) {
      return NextResponse.json({ error: 'Missing file or stock number.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageUrl = await uploadToS3(buffer, `${stockNumber}.jpg`, file.type);

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
