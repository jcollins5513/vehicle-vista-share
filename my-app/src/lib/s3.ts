import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/*
 * Centralised, typed AWS S3 client + helper.
 * Reads credentials & bucket information from environment variables.
 *
 * Environment variables required (see .env.example):
 *  - AWS_ACCESS_KEY_ID
 *  - AWS_SECRET_ACCESS_KEY
 *  - AWS_REGION
 *  - VEHICLE_MEDIA_BUCKET
 */

const REGION = process.env.AWS_REGION;
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const BUCKET = process.env.VEHICLE_MEDIA_BUCKET;

if (!REGION || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET) {
  // Throw at import-time to fail fast in dev/test.
  throw new Error("Missing required AWS S3 environment variables.");
}

export const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

export async function uploadBufferToS3(opts: {
  buffer: Buffer;
  mimeType: string;
  keyPrefix?: string;
}): Promise<{ url: string; key: string }> {
  const { buffer, mimeType, keyPrefix = "uploads" } = opts;
  const { v4: uuidv4 } = await import("uuid");

  const key = `${keyPrefix}/${uuidv4()}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: "public-read", // public bucket; adjust if using presigned URLs instead
    })
  );

  const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  return { url, key };
}
