import { removeBackground } from '@/utils/removeBackground';

export interface BatchProcessingResult {
  success: boolean;
  processedCount: number;
  totalCount: number;
  errors: string[];
  processedImages: {
    original: File;
    processed: Blob;
    filename: string;
  }[];
}

export interface ProcessingProgress {
  current: number;
  total: number;
  currentFile: string;
  status: 'processing' | 'completed' | 'error';
}

export class BackgroundRemovalService {
  private static instance: BackgroundRemovalService;
  
  private constructor() {}
  
  static getInstance(): BackgroundRemovalService {
    if (!BackgroundRemovalService.instance) {
      BackgroundRemovalService.instance = new BackgroundRemovalService();
    }
    return BackgroundRemovalService.instance;
  }

  /**
   * Process a batch of images with progress tracking
   */
  async processBatch(
    files: File[],
    onProgress?: (progress: ProcessingProgress) => void,
    onError?: (error: string, filename: string) => void
  ): Promise<BatchProcessingResult> {
    const result: BatchProcessingResult = {
      success: false,
      processedCount: 0,
      totalCount: files.length,
      errors: [],
      processedImages: []
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Update progress
        onProgress?.({
          current: i + 1,
          total: files.length,
          currentFile: file.name,
          status: 'processing'
        });

        // Process the image
        const processedBlob = await removeBackground(file);
        
        result.processedImages.push({
          original: file,
          processed: processedBlob,
          filename: file.name
        });
        
        result.processedCount++;
        
        // Update progress
        onProgress?.({
          current: i + 1,
          total: files.length,
          currentFile: file.name,
          status: 'completed'
        });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`${file.name}: ${errorMessage}`);
        
        onError?.(errorMessage, file.name);
        
        // Update progress
        onProgress?.({
          current: i + 1,
          total: files.length,
          currentFile: file.name,
          status: 'error'
        });
      }
    }

    result.success = result.processedCount > 0;
    return result;
  }

  /**
   * Process images from a vehicle folder structure
   * Expects folder names to match vehicle identifiers
   */
  async processVehicleFolder(
    vehicleId: string,
    files: File[],
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<BatchProcessingResult> {
    // Filter files to only include images
    const imageFiles = files.filter(file => 
      file.type.startsWith('image/') && 
      this.isValidImageFormat(file.type)
    );

    if (imageFiles.length === 0) {
      throw new Error('No valid image files found in the selected folder');
    }

    console.log(`🚗 Processing ${imageFiles.length} images for vehicle ${vehicleId}`);
    
    return this.processBatch(imageFiles, onProgress);
  }

  /**
   * Check if the image format is supported
   */
  private isValidImageFormat(mimeType: string): boolean {
    const supportedFormats = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/bmp'
    ];
    
    return supportedFormats.includes(mimeType.toLowerCase());
  }

  /**
   * Generate optimized filename for processed image
   */
  generateProcessedFilename(originalFilename: string, vehicleId?: string): string {
    const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '');
    const timestamp = Date.now();
    const suffix = vehicleId ? `_${vehicleId}_processed` : '_processed';
    
    return `${nameWithoutExt}${suffix}_${timestamp}.png`;
  }

  /**
   * Download processed images as a ZIP file
   */
  async downloadAsZip(
    processedImages: { processed: Blob; filename: string }[],
    zipFilename: string = 'processed-images.zip'
  ): Promise<void> {
    // This would require a ZIP library like JSZip
    // For now, we'll download individual files
    
    for (let i = 0; i < processedImages.length; i++) {
      const { processed, filename } = processedImages[i];
      const url = URL.createObjectURL(processed);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = this.generateProcessedFilename(filename);
      
      // Add delay between downloads to avoid browser blocking
      setTimeout(() => {
        link.click();
        URL.revokeObjectURL(url);
      }, i * 100);
    }
  }

  /**
   * Estimate processing time based on file count and sizes
   */
  estimateProcessingTime(files: File[]): number {
    // Average processing time per image (in seconds)
    const avgTimePerImage = 3;
    const totalSizeMB = files.reduce((sum, file) => sum + (file.size / 1024 / 1024), 0);
    
    // Add extra time for larger files
    const sizeMultiplier = Math.max(1, totalSizeMB / 10);
    
    return Math.ceil(files.length * avgTimePerImage * sizeMultiplier);
  }

  /**
   * Validate batch processing requirements
   */
  validateBatch(files: File[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (files.length === 0) {
      errors.push('No files selected');
    }
    
    if (files.length > 50) {
      errors.push('Maximum 50 files can be processed at once');
    }
    
    const totalSizeMB = files.reduce((sum, file) => sum + (file.size / 1024 / 1024), 0);
    if (totalSizeMB > 500) {
      errors.push('Total file size exceeds 500MB limit');
    }
    
    const invalidFiles = files.filter(file => !this.isValidImageFormat(file.type));
    if (invalidFiles.length > 0) {
      errors.push(`Unsupported file formats: ${invalidFiles.map(f => f.name).join(', ')}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const backgroundRemovalService = BackgroundRemovalService.getInstance();
