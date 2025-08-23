import { S3Client, CreateBucketCommand, PutBucketCorsCommand, PutPublicAccessBlockCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3';
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

async function createAssetsBucket() {
  try {
    console.log(`Creating S3 bucket: ${ASSETS_BUCKET} in region: ${REGION}`);
    
    // Create the bucket
    await s3Client.send(new CreateBucketCommand({
      Bucket: ASSETS_BUCKET,
      CreateBucketConfiguration: REGION !== 'us-east-1' ? {
        LocationConstraint: REGION,
      } : undefined,
    }));
    
    console.log(`✅ Bucket ${ASSETS_BUCKET} created successfully`);
    
    // Configure CORS for web access
    await s3Client.send(new PutBucketCorsCommand({
      Bucket: ASSETS_BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    }));
    
    console.log(`✅ CORS configuration applied to ${ASSETS_BUCKET}`);
    
    // Disable public access block for public read access
    await s3Client.send(new PutPublicAccessBlockCommand({
      Bucket: ASSETS_BUCKET,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        IgnorePublicAcls: false,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    }));
    
    console.log(`✅ Public access configuration applied to ${ASSETS_BUCKET}`);
    
    // Add bucket policy for public read access
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
    console.log(`🎉 Assets bucket setup complete!`);
    
  } catch (error) {
    if (error.name === 'BucketAlreadyOwnedByYou') {
      console.log(`✅ Bucket ${ASSETS_BUCKET} already exists and is owned by you`);
    } else if (error.name === 'BucketAlreadyExists') {
      console.error(`❌ Bucket ${ASSETS_BUCKET} already exists but is owned by someone else`);
    } else {
      console.error('❌ Error creating bucket:', error);
    }
  }
}

createAssetsBucket();