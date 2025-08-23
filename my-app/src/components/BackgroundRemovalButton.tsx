'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Loader2, Scissors, Image, CheckCircle, XCircle } from 'lucide-react';
import type { VehicleWithMedia } from '@/types';

interface BackgroundRemovalButtonProps {
  vehicle: VehicleWithMedia;
  onProcessingUpdate?: (vehicleId: string, status: string) => void;
}

export function BackgroundRemovalButton({ 
  vehicle, 
  onProcessingUpdate 
}: BackgroundRemovalButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [processedImages, setProcessedImages] = useState<Array<{
    originalUrl: string;
    processedUrl: string;
    imageIndex: number;
  }>>([]);

  // Helper function to convert image URL to base64 using proxy to avoid CORS issues
  const urlToBase64 = async (url: string): Promise<string> => {
    try {
      // Use our proxy endpoint to avoid CORS issues
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image via proxy: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to convert image to base64: ${errorMessage}`);
    }
  };

  // Helper function to upload processed image to S3
  const uploadProcessedImageToS3 = async (
    imageBlob: Blob, 
    originalUrl: string, 
    imageIndex: number
  ): Promise<string> => {
    const formData = new FormData();
    formData.append('image', imageBlob);
    formData.append('originalUrl', originalUrl);
    formData.append('imageIndex', imageIndex.toString());

    const response = await fetch(`/api/vehicles/${vehicle.id}/processed-images`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to upload processed image: ${response.statusText}`);
    }

    const result = await response.json();
    return result.processedImage.processedUrl;
  };

  const processImage = async (imageIndex: number) => {
    setIsProcessing(true);
    setProcessingStatus(`Processing image ${imageIndex + 1}...`);
    onProcessingUpdate?.(vehicle.id, 'processing');

    try {
      // Get the image URL from the vehicle
      const imageUrl = vehicle.images[imageIndex];
      if (!imageUrl) {
        throw new Error('Image not found');
      }

      // Convert image URL to base64
      const base64 = await urlToBase64(imageUrl);
      
      // Use @imgly/background-removal for browser-based processing
      setProcessingStatus(`Removing background from image ${imageIndex + 1}...`);
      const { removeBackground } = await import('@imgly/background-removal');
      
      const result = await removeBackground(base64, {
        output: {
          format: 'image/png',
          quality: 0.8
        }
      });

      // Convert result to blob for upload
      let imageBlob: Blob;
      if (result instanceof Blob) {
        imageBlob = result;
      } else if (typeof result === 'string') {
        // Convert data URL to blob
        const response = await fetch(result);
        imageBlob = await response.blob();
      } else {
        throw new Error('Unexpected result format from background removal');
      }

      // Upload to S3 and update vehicle data
      setProcessingStatus(`Uploading processed image ${imageIndex + 1} to S3...`);
      const s3Url = await uploadProcessedImageToS3(imageBlob, imageUrl, imageIndex);

      // Update local state
      setProcessedImages(prev => [...prev, {
        originalUrl: imageUrl,
        processedUrl: s3Url,
        imageIndex
      }]);

      setProcessingStatus('Processing completed!');
      onProcessingUpdate?.(vehicle.id, 'completed');
    } catch (error) {
      console.error('Error processing image:', error);
      setProcessingStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      onProcessingUpdate?.(vehicle.id, 'failed');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessingStatus(''), 3000);
    }
  };

  const processAllImages = async () => {
    setIsProcessing(true);
    setProcessingStatus('Processing all images...');
    onProcessingUpdate?.(vehicle.id, 'processing');

    try {
      const results = [];
      const { removeBackground } = await import('@imgly/background-removal');
      
      // Process each image sequentially to avoid overwhelming the browser
      for (let i = 0; i < vehicle.images.length; i++) {
        setProcessingStatus(`Processing image ${i + 1} of ${vehicle.images.length}...`);
        
        try {
          const imageUrl = vehicle.images[i];
          const base64 = await urlToBase64(imageUrl);
          
          // Remove background
          setProcessingStatus(`Removing background from image ${i + 1} of ${vehicle.images.length}...`);
          const result = await removeBackground(base64, {
            output: {
              format: 'image/png',
              quality: 0.8
            }
          });

          // Convert result to blob for upload
          let imageBlob: Blob;
          if (result instanceof Blob) {
            imageBlob = result;
          } else if (typeof result === 'string') {
            // Convert data URL to blob
            const response = await fetch(result);
            imageBlob = await response.blob();
          } else {
            throw new Error('Unexpected result format from background removal');
          }

          // Upload to S3 and update vehicle data
          setProcessingStatus(`Uploading processed image ${i + 1} to S3...`);
          const s3Url = await uploadProcessedImageToS3(imageBlob, imageUrl, i);

          results.push({
            originalUrl: imageUrl,
            processedUrl: s3Url,
            imageIndex: i
          });
        } catch (imageError) {
          console.error(`Error processing image ${i + 1}:`, imageError);
          // Continue with other images even if one fails
        }
      }

      // Update local state with all results
      setProcessedImages(results);
      setProcessingStatus(`Processed and uploaded ${results.length} of ${vehicle.images.length} images!`);
      onProcessingUpdate?.(vehicle.id, 'completed');
    } catch (error) {
      console.error('Error processing images:', error);
      setProcessingStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      onProcessingUpdate?.(vehicle.id, 'failed');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessingStatus(''), 3000);
    }
  };

  const getStatusIcon = () => {
    if (isProcessing) return <Loader2 className="w-3 h-3 animate-spin" />;
    if (processingStatus.includes('completed')) return <CheckCircle className="w-3 h-3 text-green-500" />;
    if (processingStatus.includes('Error')) return <XCircle className="w-3 h-3 text-red-500" />;
    return <Scissors className="w-3 h-3" />;
  };

  const vehicleImages = vehicle.images || [];

  if (vehicleImages.length === 0) {
    return (
      <Button
        disabled
        variant="outline"
        size="sm"
        className="border-white/30 text-white/50"
      >
        <Image className="w-3 h-3 mr-1" />
        No Images
      </Button>
    );
  }

  return (
    <div className="space-y-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isProcessing}
            className="border-white/30 text-white hover:bg-white/10 w-full"
          >
            {getStatusIcon()}
            <span className="ml-1">Remove BG</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700">
          <DropdownMenuItem
            onClick={processAllImages}
            disabled={isProcessing}
            className="text-white hover:bg-slate-700"
          >
            <Scissors className="w-4 h-4 mr-2" />
            Process All Images ({vehicleImages.length})
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-700" />
          {vehicleImages.slice(0, 5).map((_, index) => (
            <DropdownMenuItem
              key={index}
              onClick={() => processImage(index)}
              disabled={isProcessing}
              className="text-white hover:bg-slate-700"
            >
              <Image className="w-4 h-4 mr-2" />
              Process Image {index + 1}
            </DropdownMenuItem>
          ))}
          {vehicleImages.length > 5 && (
            <DropdownMenuItem disabled className="text-white/50">
              ... and {vehicleImages.length - 5} more
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {processingStatus && (
        <Badge 
          variant={processingStatus.includes('Error') ? 'destructive' : 'secondary'}
          className="text-xs w-full justify-center"
        >
          {processingStatus}
        </Badge>
      )}
    </div>
  );
}