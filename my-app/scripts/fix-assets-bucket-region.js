import { S3Client, CreateBucketCommand, PutBucketCorsCommand, PutPublicAccessBlockCommand, DeleteBucketCommand, ListObjectsV2Command, DeleteObjectCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';
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

// Create a client for us-east-1 (where the bucket might currently be)
const s3ClientEast1 = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

async function fixAssetsBucketRegion() {
  try {
    console.log(`Checking assets bucket: ${ASSETS_BUCKET}`);
    
    // First, try to determine the current region of the bucket
    let currentRegion = null;
    let currentClient = s3Client;
    
    try {
      const locationResponse = await s3Client.send(new GetBucketLocationCommand({ Bucket: ASSETS_BUCKET }));
      currentRegion = locationResponse.LocationConstraint || 'us-east-1';
      console.log(`Current bucket region: ${currentRegion}`);
      
      if (currentRegion !== REGION) {
        console.log(`Bucket is in ${currentRegion} but should be in ${REGION}`);
        currentClient = new S3Client({
          region: currentRegion,
          credentials: {
            accessKeyId: ACCESS_KEY_ID,
            secretAccessKey: SECRET_ACCESS_KEY,
          },
        });
      } else {
        console.log(`✅ Bucket is already in the correct region: ${REGION}`);
        return;
      }
    } catch (error) {
      console.log('Could not determine bucket region, trying us-east-1...');
      currentClient = s3ClientEast1;
      currentRegion = 'us-east-1';
    }
    
    // Check if bucket has any objects
    try {
      const listResponse = await currentClient.send(new ListObjectsV2Command({ 
        Bucket: ASSETS_BUCKET,
        MaxKeys: 1 
      }));
      
      if (listResponse.Contents && listResponse.Contents.length > 0) {
        console.log('⚠️  Bucket contains objects. Please backup your assets before proceeding.');
        console.log('This script will delete the bucket and recreate it in the correct region.');
        console.log('Run with --force flag if you want to proceed anyway.');
        
        if (!process.argv.includes('--force')) {
          process.exit(1);
        }
        
        // Delete all objects first
        console.log('Deleting all objects in the bucket...');
        const allObjects = await currentClient.send(new ListObjectsV2Command({ Bucket: ASSETS_BUCKET }));
        
        if (allObjects.Contents && allObjects.Contents.length > 0) {
          for (const obj of allObjects.Contents) {
            await currentClient.send(new DeleteObjectCommand({
              Bucket: ASSETS_BUCKET,
              Key: obj.Key
            }));
            console.log(`Deleted: ${obj.Key}`);
          }
        }
      }
    } catch (error) {
      console.log('Could not list bucket contents:', error.message);
    }
    
    // Delete the bucket
    console.log(`Deleting bucket from ${currentRegion}...`);
    try {
      await currentClient.send(new DeleteBucketCommand({ Bucket: ASSETS_BUCKET }));
      console.log(`✅ Bucket deleted from ${currentRegion}`);
    } catch (error) {
      console.log('Could not delete bucket:', error.message);
    }
    
    // Wait a moment for AWS to propagate the deletion
    console.log('Waiting for deletion to propagate...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Create the bucket in the correct region
    console.log(`Creating bucket in ${REGION}...`);
    await s3Client.send(new CreateBucketCommand({
      Bucket: ASSETS_BUCKET,
      CreateBucketConfiguration: REGION !== 'us-east-1' ? {
        LocationConstraint: REGION,
      } : undefined,
    }));
    
    console.log(`✅ Bucket ${ASSETS_BUCKET} created in ${REGION}`);
    
    // Configure CORS
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
    
    console.log(`✅ CORS configuration applied`);
    
    // Configure public access
    await s3Client.send(new PutPublicAccessBlockCommand({
      Bucket: ASSETS_BUCKET,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        IgnorePublicAcls: false,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    }));
    
    console.log(`✅ Public access configuration applied`);
    console.log(`🎉 Assets bucket is now properly configured in ${REGION}!`);
    
  } catch (error) {
    console.error('❌ Error fixing bucket region:', error);
  }
}

fixAssetsBucketRegion();