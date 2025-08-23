import { S3Client, PutBucketPolicyCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const REGION = process.env.AWS_REGION;
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const ASSETS_BUCKET = process.env.VEHICLE_ASSETS_BUCKET;

if (!REGION || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !ASSETS_BUCKET) {
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

async function applyBucketPolicy() {
  try {
    console.log(`Applying public read policy to bucket: ${ASSETS_BUCKET}`);
    
    // Create bucket policy for public read access
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${ASSETS_BUCKET}/*`,
        },
      ],
    };
    
    await s3Client.send(new PutBucketPolicyCommand({
      Bucket: ASSETS_BUCKET,
      Policy: JSON.stringify(bucketPolicy),
    }));
    
    console.log(`✅ Public read policy applied to ${ASSETS_BUCKET}`);
    console.log(`🎉 Bucket policy setup complete!`);
    
  } catch (error) {
    console.error('❌ Error applying bucket policy:', error);
  }
}

applyBucketPolicy();