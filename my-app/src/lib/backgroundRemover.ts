import { Redis } from '@upstash/redis';

interface VehicleData {
  stockNumber: string;
  vin: string;
  images: string[];
  [key: string]: any;
}

interface ProcessedImage {
  originalUrl: string;
  processedUrl: string;
  processedAt: Date;
  status: 'processing' | 'completed' | 'failed';
}

export class BackgroundRemoverService {
  private redis: Redis;
  private s3Config: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  };

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    this.s3Config = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      region: process.env.AWS_REGION!,
      bucket: process.env.VEHICLE_MEDIA_BUCKET!,
    };
  }

  /**
   * Process background removal for a single vehicle's images
   */
  async processVehicleImages(stockNumber: string): Promise<ProcessedImage[]> {
    try {
      // Get vehicle data from Redis
      const vehicleData = await this.getVehicleFromRedis(stockNumber);
      if (!vehicleData || !vehicleData.images?.length) {
        throw new Error(`No images found for vehicle ${stockNumber}`);
      }

      const processedImages: ProcessedImage[] = [];

      for (const imageUrl of vehicleData.images) {
        try {
          const processedImage = await this.processImage(imageUrl, stockNumber);
          processedImages.push(processedImage);
        } catch (error) {
          console.error(`Failed to process image ${imageUrl}:`, error);
          processedImages.push({
            originalUrl: imageUrl,
            processedUrl: '',
            processedAt: new Date(),
            status: 'failed'
          });
        }
      }

      // Update vehicle data with processed images
      await this.updateVehicleWithProcessedImages(stockNumber, processedImages);

      return processedImages;
    } catch (error) {
      console.error(`Error processing vehicle ${stockNumber}:`, error);
      throw error;
    }
  }

  /**
   * Process background removal for all vehicles in Redis
   */
  async processAllVehicleImages(): Promise<{ [stockNumber: string]: ProcessedImage[] }> {
    try {
      const vehicles = await this.getAllVehiclesFromRedis();
      const results: { [stockNumber: string]: ProcessedImage[] } = {};

      for (const vehicle of vehicles) {
        try {
          results[vehicle.stockNumber] = await this.processVehicleImages(vehicle.stockNumber);
        } catch (error) {
          console.error(`Failed to process vehicle ${vehicle.stockNumber}:`, error);
          results[vehicle.stockNumber] = [];
        }
      }

      return results;
    } catch (error) {
      console.error('Error processing all vehicles:', error);
      throw error;
    }
  }

  /**
   * Process a single image using Python backgroundremover
   */
  private async processImage(imageUrl: string, stockNumber: string): Promise<ProcessedImage> {
    const processedImage: ProcessedImage = {
      originalUrl: imageUrl,
      processedUrl: '',
      processedAt: new Date(),
      status: 'processing'
    };

    try {
      // Download the original image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const imageBuffer = await response.arrayBuffer();
      const inputPath = `/tmp/input_${Date.now()}.jpg`;
      const outputPath = `/tmp/output_${Date.now()}.png`;

      // Save input image temporarily
      await this.saveBufferToFile(Buffer.from(imageBuffer), inputPath);

      // Run background removal using Python subprocess
      await this.runBackgroundRemoval(inputPath, outputPath);

      // Upload processed image to S3
      const processedUrl = await this.uploadToS3(outputPath, stockNumber);

      // Clean up temporary files
      await this.cleanupTempFiles([inputPath, outputPath]);

      processedImage.processedUrl = processedUrl;
      processedImage.status = 'completed';

      return processedImage;
    } catch (error) {
      console.error('Error processing image:', error);
      processedImage.status = 'failed';
      return processedImage;
    }
  }

  /**
   * Run Python backgroundremover command
   */
  private async runBackgroundRemoval(inputPath: string, outputPath: string): Promise<void> {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const process = spawn('backgroundremover', ['-i', inputPath, '-o', outputPath]);
      
      let stderr = '';
      
      process.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
      
      process.on('close', (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Background removal failed with code ${code}: ${stderr}`));
        }
      });
      
      process.on('error', (error: Error) => {
        reject(new Error(`Failed to start background removal process: ${error.message}`));
      });
    });
  }

  /**
   * Get vehicle data from Redis
   */
  private async getVehicleFromRedis(stockNumber: string): Promise<VehicleData | null> {
    try {
      const data = await this.redis.get(`vehicle:${stockNumber}`);
      return data as VehicleData;
    } catch (error) {
      console.error(`Error getting vehicle ${stockNumber} from Redis:`, error);
      return null;
    }
  }

  /**
   * Get all vehicles from Redis
   */
  private async getAllVehiclesFromRedis(): Promise<VehicleData[]> {
    try {
      const keys = await this.redis.keys('vehicle:*');
      const vehicles: VehicleData[] = [];

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          vehicles.push(data as VehicleData);
        }
      }

      return vehicles;
    } catch (error) {
      console.error('Error getting all vehicles from Redis:', error);
      return [];
    }
  }

  /**
   * Update vehicle data with processed images
   */
  private async updateVehicleWithProcessedImages(
    stockNumber: string, 
    processedImages: ProcessedImage[]
  ): Promise<void> {
    try {
      const vehicleData = await this.getVehicleFromRedis(stockNumber);
      if (vehicleData) {
        vehicleData.processedImages = processedImages;
        await this.redis.set(`vehicle:${stockNumber}`, vehicleData);
      }
    } catch (error) {
      console.error(`Error updating vehicle ${stockNumber} with processed images:`, error);
    }
  }

  /**
   * Save buffer to file (Node.js implementation)
   */
  private async saveBufferToFile(buffer: Buffer, filePath: string): Promise<void> {
    const fs = require('fs').promises;
    await fs.writeFile(filePath, buffer);
  }

  /**
   * Upload processed image to S3
   */
  private async uploadToS3(filePath: string, stockNumber: string): Promise<string> {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const fs = require('fs').promises;

    const s3Client = new S3Client({
      region: this.s3Config.region,
      credentials: {
        accessKeyId: this.s3Config.accessKeyId,
        secretAccessKey: this.s3Config.secretAccessKey,
      },
    });

    const fileBuffer = await fs.readFile(filePath);
    const fileName = `processed/${stockNumber}/${Date.now()}.png`;

    const command = new PutObjectCommand({
      Bucket: this.s3Config.bucket,
      Key: fileName,
      Body: fileBuffer,
      ContentType: 'image/png',
    });

    await s3Client.send(command);

    return `https://${this.s3Config.bucket}.s3.${this.s3Config.region}.amazonaws.com/${fileName}`;
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    const fs = require('fs').promises;
    
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn(`Failed to delete temp file ${filePath}:`, error);
      }
    }
  }
}