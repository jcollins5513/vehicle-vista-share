import { S3Client, PutBucketPolicyCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const REGION = process.env.AWS_REGION;
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const MEDIA_BUCKET = process.env.VEHICLE_MEDIA_BUCKET;

if (!REGION || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !MEDIA_BUCKET) {
  console.error('Missing required AWS environment variables');
  process.exit(1);
}

const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

async function applyMediaBucketPolicy() {
  try {
    console.log(`Applying public read policy to media bucket: ${MEDIA_BUCKET}`);
    
    // Create bucket policy for public read access
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${MEDIA_BUCKET}/*`,
        },
      ],
    };
    
    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: MEDIA_BUCKET,
      Policy: JSON.stringify(bucketPolicy),
    }));
    
    console.log(`✅ Public read policy applied to ${MEDIA_BUCKET}`);
    console.log(`🎉 Media bucket policy setup complete!`);
    
  } catch (error) {
    console.error('❌ Error applying media bucket policy:', error);
  }
}

applyMediaBucketPolicy();