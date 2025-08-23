import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadBucketCommand, GetBucketLocationCommand } from "@aws-sdk/client-s3";

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
const MEDIA_BUCKET = process.env.VEHICLE_MEDIA_BUCKET;
const ASSETS_BUCKET = process.env.VEHICLE_ASSETS_BUCKET;

if (!REGION || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !MEDIA_BUCKET || !ASSETS_BUCKET) {
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

// Cache for bucket regions to avoid repeated API calls
const bucketRegionCache = new Map<string, string>();

async function getBucketRegion(bucketName: string): Promise<string> {
  if (bucketRegionCache.has(bucketName)) {
    return bucketRegionCache.get(bucketName)!;
  }

  try {
    const response = await s3Client.send(new GetBucketLocationCommand({ Bucket: bucketName }));
    // AWS returns null for us-east-1, so we need to handle that
    const region = response.LocationConstraint || 'us-east-1';
    bucketRegionCache.set(bucketName, region);
    return region;
  } catch (error) {
    console.warn(`Could not determine region for bucket ${bucketName}, using default region ${REGION}`);
    return REGION!;
  }
}

function createS3ClientForBucket(bucketRegion: string): S3Client {
  if (bucketRegion === REGION) {
    return s3Client; // Use the default client if regions match
  }
  
  return new S3Client({
    region: bucketRegion,
    credentials: {
      accessKeyId: ACCESS_KEY_ID!,
      secretAccessKey: SECRET_ACCESS_KEY!,
    },
  });
}

export async function uploadBufferToS3(opts: {
  buffer: Buffer;
  mimeType: string;
  keyPrefix?: string;
  bucket?: 'media' | 'assets';
}): Promise<{ url: string; key: string }> {
  const { buffer, mimeType, keyPrefix = "uploads", bucket = 'media' } = opts;
  const { v4: uuidv4 } = await import("uuid");

  const targetBucket = bucket === 'assets' ? ASSETS_BUCKET! : MEDIA_BUCKET!;
  const key = `${keyPrefix}/${uuidv4()}`;

  // Get the correct region for this bucket
  const bucketRegion = await getBucketRegion(targetBucket);
  const client = createS3ClientForBucket(bucketRegion);

  // Upload the object to S3 (public access configured at bucket level)
  await client.send(
    new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'max-age=31536000',
    })
  );
  
  // Return the direct S3 URL using the correct region
  const url = `https://${targetBucket}.s3.${bucketRegion}.amazonaws.com/${key}`;
  
  return { url, key };
}

export async function deleteObjectFromS3(key: string, bucket: 'media' | 'assets' = 'media'): Promise<void> {
  if (!key) {
    throw new Error("S3 object key cannot be empty.");
  }
  
  const targetBucket = bucket === 'assets' ? ASSETS_BUCKET! : MEDIA_BUCKET!;
  
  // Get the correct region for this bucket
  const bucketRegion = await getBucketRegion(targetBucket);
  const client = createS3ClientForBucket(bucketRegion);
  
  await client.send(
    new DeleteObjectCommand({
      Bucket: targetBucket,
      Key: key,
    })
  );
}

export async function listS3Objects(opts: {
  bucket: 'media' | 'assets';
  prefix?: string;
  maxKeys?: number;
}): Promise<Array<{ key: string; url: string; lastModified?: Date; size?: number }>> {
  const { bucket, prefix = "", maxKeys = 1000 } = opts;
  const targetBucket = bucket === 'assets' ? ASSETS_BUCKET! : MEDIA_BUCKET!;

  // Get the correct region for this bucket
  const bucketRegion = await getBucketRegion(targetBucket);
  const client = createS3ClientForBucket(bucketRegion);

  const command = new ListObjectsV2Command({
    Bucket: targetBucket,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await client.send(command);
  
  return (response.Contents || []).map(obj => ({
    key: obj.Key!,
    url: `https://${targetBucket}.s3.${bucketRegion}.amazonaws.com/${obj.Key}`,
    lastModified: obj.LastModified,
    size: obj.Size,
  }));
}

export async function uploadFileToAssets(opts: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  category?: string;
}): Promise<{ url: string; key: string }> {
  const { buffer, fileName, mimeType, category = "manual-uploads" } = opts;
  const timestamp = new Date().toISOString().split('T')[0];
  const key = `${category}/${timestamp}/${fileName}`;

  // Get the correct region for the assets bucket
  const bucketRegion = await getBucketRegion(ASSETS_BUCKET!);
  const client = createS3ClientForBucket(bucketRegion);

  await client.send(
    new PutObjectCommand({
      Bucket: ASSETS_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'max-age=31536000',
    })
  );
  
  const url = `https://${ASSETS_BUCKET}.s3.${bucketRegion}.amazonaws.com/${key}`;
  
  return { url, key };
}

export async function checkBucketExists(bucket: 'media' | 'assets'): Promise<boolean> {
  try {
    const targetBucket = bucket === 'assets' ? ASSETS_BUCKET! : MEDIA_BUCKET!;
    
    // Try to get the bucket region first, which will also verify it exists
    const bucketRegion = await getBucketRegion(targetBucket);
    const client = createS3ClientForBucket(bucketRegion);
    
    await client.send(new HeadBucketCommand({ Bucket: targetBucket }));
    return true;
  } catch (error) {
    console.log(`Bucket ${bucket} check failed:`, error instanceof Error ? error.message : error);
    return false;
  }
}