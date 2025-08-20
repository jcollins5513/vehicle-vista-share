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
  imageIndex: number;
}

interface BatchProcessRequest {
  vehicleIds: string[];
  processFirstImageOnly: boolean;
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

    // Fix OpenMP library conflict on Windows
    process.env.KMP_DUPLICATE_LIB_OK = 'TRUE';
  }

  /**
   * Process background removal for a single image
   */
  async processSingleImage(stockNumber: string, imageIndex: number): Promise<ProcessedImage> {
    try {
      const vehicleData = await this.getVehicleFromRedis(stockNumber);
      if (!vehicleData || !vehicleData.images?.length) {
        throw new Error(`No images found for vehicle ${stockNumber}`);
      }

      if (imageIndex >= vehicleData.images.length) {
        throw new Error(`Image index ${imageIndex} out of range for vehicle ${stockNumber}`);
      }

      const imageUrl = vehicleData.images[imageIndex];
      const processedImage = await this.processImage(imageUrl, stockNumber, imageIndex);

      // Update vehicle data with this processed image
      await this.updateVehicleWithSingleProcessedImage(stockNumber, processedImage);

      return processedImage;
    } catch (error) {
      console.error(`Error processing single image for vehicle ${stockNumber}:`, error);
      throw error;
    }
  }

  /**
   * Process background removal for batch of first images only
   */
  async processBatchFirstImages(vehicleIds: string[]): Promise<{ [stockNumber: string]: ProcessedImage }> {
    const results: { [stockNumber: string]: ProcessedImage } = {};

    for (const vehicleId of vehicleIds) {
      try {
        const result = await this.processSingleImage(vehicleId, 0); // Process first image only
        results[vehicleId] = result;
      } catch (error) {
        console.error(`Failed to process first image for vehicle ${vehicleId}:`, error);
        results[vehicleId] = {
          originalUrl: '',
          processedUrl: '',
          processedAt: new Date(),
          status: 'failed',
          imageIndex: 0
        };
      }
    }

    return results;
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

      for (let i = 0; i < vehicleData.images.length; i++) {
        const imageUrl = vehicleData.images[i];
        try {
          const processedImage = await this.processImage(imageUrl, stockNumber, i);
          processedImages.push(processedImage);
        } catch (error) {
          console.error(`Failed to process image ${imageUrl}:`, error);
          processedImages.push({
            originalUrl: imageUrl,
            processedUrl: '',
            processedAt: new Date(),
            status: 'failed',
            imageIndex: i
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
   * Get all processed images for content creation
   */
  async getAllProcessedImages(): Promise<{ [stockNumber: string]: ProcessedImage[] }> {
    try {
      const vehicles = await this.getAllVehiclesFromRedis();
      const processedImages: { [stockNumber: string]: ProcessedImage[] } = {};

      for (const vehicle of vehicles) {
        if (vehicle.processedImages && vehicle.processedImages.length > 0) {
          processedImages[vehicle.stockNumber] = vehicle.processedImages.filter(
            img => img.status === 'completed'
          );
        }
      }

      return processedImages;
    } catch (error) {
      console.error('Error getting all processed images:', error);
      return {};
    }
  }

  /**
   * Process a single image using Python backgroundremover
   */
  private async processImage(imageUrl: string, stockNumber: string, imageIndex: number): Promise<ProcessedImage> {
    const processedImage: ProcessedImage = {
      originalUrl: imageUrl,
      processedUrl: '',
      processedAt: new Date(),
      status: 'processing',
      imageIndex
    };

    try {
      console.log(`Starting to process image: ${imageUrl}`);
      
      // Download the original image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const imageBuffer = await response.arrayBuffer();
      console.log(`Downloaded image, size: ${imageBuffer.byteLength} bytes`);
      
      // Use OS-appropriate temp directory
      const os = require('os');
      const path = require('path');
      const tempDir = os.tmpdir();
      
      const inputPath = path.join(tempDir, `input_${Date.now()}.jpg`);
      const outputPath = path.join(tempDir, `output_${Date.now()}.png`);
      
      console.log(`Temp directory: ${tempDir}`);
      console.log(`Input path: ${inputPath}`);
      console.log(`Output path: ${outputPath}`);

      // Save input image temporarily
      await this.saveBufferToFile(Buffer.from(imageBuffer), inputPath);
      console.log(`Saved input image to: ${inputPath}`);

      // Verify the file was created
      const fs = require('fs');
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Failed to create input file: ${inputPath}`);
      }

      // Run background removal using Python subprocess
      console.log(`Running background removal...`);
      await this.runBackgroundRemoval(inputPath, outputPath);
      
      // Verify the output file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error(`Background removal failed - output file not created: ${outputPath}`);
      }
      console.log(`Background removal completed, output file: ${outputPath}`);

      // Upload processed image to S3
      console.log(`Uploading to S3...`);
      const processedUrl = await this.uploadToS3(outputPath, stockNumber, imageIndex);
      console.log(`Uploaded to S3: ${processedUrl}`);

      // Clean up temporary files
      await this.cleanupTempFiles([inputPath, outputPath]);
      console.log(`Cleaned up temporary files`);

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
      console.log(`Executing: backgroundremover -i "${inputPath}" -o "${outputPath}"`);
      
      // Use shell: true on Windows to handle paths with spaces
      const isWindows = process.platform === 'win32';
      const spawnOptions = isWindows ? { 
        shell: true,
        env: { 
          ...process.env, 
          KMP_DUPLICATE_LIB_OK: 'TRUE',
          OMP_NUM_THREADS: '1' // Also limit OpenMP threads to prevent conflicts
        }
      } : {
        env: { 
          ...process.env, 
          KMP_DUPLICATE_LIB_OK: 'TRUE',
          OMP_NUM_THREADS: '1'
        }
      };
      
      const childProcess = spawn('backgroundremover', ['-i', inputPath, '-o', outputPath], spawnOptions);
      
      let stdout = '';
      let stderr = '';
      
      childProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
        console.log(`backgroundremover stdout: ${data.toString()}`);
      });
      
      childProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
        console.log(`backgroundremover stderr: ${data.toString()}`);
      });
      
      childProcess.on('close', (code: number) => {
        console.log(`backgroundremover process exited with code: ${code}`);
        console.log(`Full stdout: ${stdout}`);
        console.log(`Full stderr: ${stderr}`);
        
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Background removal failed with code ${code}. This might indicate:\n1. backgroundremover is not properly installed\n2. The input image format is not supported\n3. Insufficient memory or processing power\n4. Missing dependencies (torch, torchvision)\n\nStdout: ${stdout}\nStderr: ${stderr}`));
        }
      });
      
      childProcess.on('error', (error: Error) => {
        console.error(`Failed to start backgroundremover process:`, error);
        reject(new Error(`Failed to start background removal process: ${error.message}.\n\nTroubleshooting:\n1. Install backgroundremover: pip install backgroundremover\n2. Install PyTorch: pip install torch torchvision\n3. Ensure Python is in your PATH\n4. Try running 'backgroundremover --help' in your terminal`));
      });
      
      // Add timeout handling (2 minutes)
      const timeout = setTimeout(() => {
        childProcess.kill();
        reject(new Error('Background removal process timed out after 2 minutes. The image might be too large or complex.'));
      }, 120000);
    });
  }

  /**
   * Get vehicle data from Redis
   */
  private async getVehicleFromRedis(stockNumber: string): Promise<VehicleData | null> {
    try {
      // Get the cached inventory data
      const cacheData = await this.redis.get('dealership:inventory');
      if (!cacheData) {
        console.log('No cached inventory data found');
        return null;
      }

      const inventoryData = typeof cacheData === 'string' ? JSON.parse(cacheData) : cacheData;
      const vehicles = inventoryData.vehicles || [];

      // Find the vehicle by stock number
      const vehicle = vehicles.find((v: any) => v.stockNumber === stockNumber);
      return vehicle || null;
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
      // Get the cached inventory data
      const cacheData = await this.redis.get('dealership:inventory');
      if (!cacheData) {
        console.log('No cached inventory data found');
        return [];
      }

      const inventoryData = typeof cacheData === 'string' ? JSON.parse(cacheData) : cacheData;
      return inventoryData.vehicles || [];
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
      // Get the entire cached inventory
      const cacheData = await this.redis.get('dealership:inventory');
      if (!cacheData) {
        console.error('No cached inventory data found to update');
        return;
      }

      const inventoryData = typeof cacheData === 'string' ? JSON.parse(cacheData) : cacheData;
      const vehicles = inventoryData.vehicles || [];

      // Find and update the specific vehicle
      const vehicleIndex = vehicles.findIndex((v: any) => v.stockNumber === stockNumber);
      if (vehicleIndex !== -1) {
        vehicles[vehicleIndex].processedImages = processedImages;
        
        // Update the cache with the modified data
        const updatedInventoryData = {
          ...inventoryData,
          vehicles: vehicles,
          lastUpdated: new Date().toISOString()
        };

        // Get the original TTL or set a default
        const CACHE_TTL = 24 * 60 * 60; // 24 hours
        await this.redis.set('dealership:inventory', JSON.stringify(updatedInventoryData), { ex: CACHE_TTL });
        
        console.log(`Updated vehicle ${stockNumber} with ${processedImages.length} processed images`);
      } else {
        console.error(`Vehicle ${stockNumber} not found in cached inventory`);
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
    const path = require('path');
    
    try {
      // Ensure the directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write the file
      await fs.writeFile(filePath, buffer);
      console.log(`Successfully saved file: ${filePath} (${buffer.length} bytes)`);
    } catch (error) {
      console.error(`Failed to save file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Update vehicle data with a single processed image
   */
  private async updateVehicleWithSingleProcessedImage(
    stockNumber: string, 
    processedImage: ProcessedImage
  ): Promise<void> {
    try {
      // Get the entire cached inventory
      const cacheData = await this.redis.get('dealership:inventory');
      if (!cacheData) {
        console.error('No cached inventory data found to update');
        return;
      }

      const inventoryData = typeof cacheData === 'string' ? JSON.parse(cacheData) : cacheData;
      const vehicles = inventoryData.vehicles || [];

      // Find and update the specific vehicle
      const vehicleIndex = vehicles.findIndex((v: any) => v.stockNumber === stockNumber);
      if (vehicleIndex !== -1) {
        const vehicle = vehicles[vehicleIndex];
        
        if (!vehicle.processedImages) {
          vehicle.processedImages = [];
        }
        
        // Remove existing processed image for this index if it exists
        vehicle.processedImages = vehicle.processedImages.filter(
          (img: ProcessedImage) => img.imageIndex !== processedImage.imageIndex
        );
        
        // Add the new processed image
        vehicle.processedImages.push(processedImage);
        
        // Update the cache with the modified data
        const updatedInventoryData = {
          ...inventoryData,
          vehicles: vehicles,
          lastUpdated: new Date().toISOString()
        };

        // Get the original TTL or set a default
        const CACHE_TTL = 24 * 60 * 60; // 24 hours
        await this.redis.set('dealership:inventory', JSON.stringify(updatedInventoryData), { ex: CACHE_TTL });
        
        console.log(`Updated vehicle ${stockNumber} with processed image at index ${processedImage.imageIndex}`);
      } else {
        console.error(`Vehicle ${stockNumber} not found in cached inventory`);
      }
    } catch (error) {
      console.error(`Error updating vehicle ${stockNumber} with single processed image:`, error);
    }
  }

  /**
   * Upload processed image to S3
   */
  private async uploadToS3(filePath: string, stockNumber: string, imageIndex?: number): Promise<string> {
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
    const fileName = `processed/${stockNumber}/${imageIndex !== undefined ? `img_${imageIndex}_` : ''}${Date.now()}.png`;

    try {
      // Try with public-read ACL first
      const command = new PutObjectCommand({
        Bucket: this.s3Config.bucket,
        Key: fileName,
        Body: fileBuffer,
        ContentType: 'image/png',
        ACL: 'public-read',
      });

      await s3Client.send(command);
      console.log(`Successfully uploaded with public-read ACL: ${fileName}`);
    } catch (aclError) {
      console.warn(`Failed to upload with public-read ACL, trying without ACL:`, aclError);
      
      // Fallback: upload without ACL (bucket policy should handle public access)
      const commandWithoutACL = new PutObjectCommand({
        Bucket: this.s3Config.bucket,
        Key: fileName,
        Body: fileBuffer,
        ContentType: 'image/png',
      });

      await s3Client.send(commandWithoutACL);
      console.log(`Successfully uploaded without ACL: ${fileName}`);
    }

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