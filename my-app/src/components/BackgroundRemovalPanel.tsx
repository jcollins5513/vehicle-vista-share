'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Image, CheckCircle, XCircle, Play } from 'lucide-react';
import type { ProcessedImage } from '@/types';

interface ProcessingResult {
  [stockNumber: string]: ProcessedImage[];
}

export function BackgroundRemovalPanel() {
  const [stockNumber, setStockNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult>({});
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');

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
    imageIndex: number,
    vehicleId: string
  ): Promise<string> => {
    const formData = new FormData();
    formData.append('image', imageBlob);
    formData.append('originalUrl', originalUrl);
    formData.append('imageIndex', imageIndex.toString());

    const response = await fetch(`/api/vehicles/${vehicleId}/processed-images`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to upload processed image: ${response.statusText}`);
    }

    const result = await response.json();
    return result.processedImage.processedUrl;
  };

  // Process background removal using browser-based @imgly/background-removal
  const processImageWithBrowserRemoval = async (
    imageUrl: string,
    imageIndex: number,
    vehicleId: string
  ): Promise<string> => {
    const { removeBackground } = await import('@imgly/background-removal');

    // Convert image URL to base64
    const base64Image = await urlToBase64(imageUrl);

    // Remove background using browser-based processing
    const result = await removeBackground(base64Image, {
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

    // Upload to S3 and return the S3 URL
    return await uploadProcessedImageToS3(imageBlob, imageUrl, imageIndex, vehicleId);
  };

  // Process a single vehicle
  const processSingleVehicle = async (stockNum: string) => {
    try {
      setCurrentOperation(`Fetching vehicle data for ${stockNum}...`);

      // Get vehicle data from Redis cache
      const response = await fetch(`/api/vehicles/${stockNum}`);
      if (!response.ok) {
        throw new Error(`Vehicle ${stockNum} not found`);
      }

      const vehicleData = await response.json();
      if (!vehicleData.images || vehicleData.images.length === 0) {
        throw new Error(`No images found for vehicle ${stockNum}`);
      }

      const processedImages: ProcessedImage[] = [];
      const totalImages = vehicleData.images.length;

      for (let i = 0; i < totalImages; i++) {
        setCurrentOperation(`Processing image ${i + 1} of ${totalImages} for vehicle ${stockNum}...`);
        setProgress(Math.round((i / totalImages) * 100));

        try {
          const processedUrl = await processImageWithBrowserRemoval(
            vehicleData.images[i],
            i,
            vehicleData.stockNumber || vehicleData.id
          );

          processedImages.push({
            originalUrl: vehicleData.images[i],
            processedUrl,
            processedAt: new Date(),
            status: 'completed',
            imageIndex: i
          });
        } catch (error) {
          console.error(`Failed to process image ${i + 1}:`, error);
          processedImages.push({
            originalUrl: vehicleData.images[i],
            processedUrl: '',
            processedAt: new Date(),
            status: 'failed',
            imageIndex: i
          });
        }
      }

      setResults(prev => ({
        ...prev,
        [stockNum]: processedImages
      }));

      setProgress(100);
      setCurrentOperation(`Completed processing ${processedImages.filter(img => img.status === 'completed').length} of ${totalImages} images for vehicle ${stockNum}`);
    } catch (error) {
      console.error('Error processing vehicle:', error);
      setCurrentOperation(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Process all vehicles
  const processAllVehicles = async () => {
    try {
      setCurrentOperation('Fetching all vehicles...');

      // Get all vehicles from Redis cache
      const response = await fetch('/api/vehicles');
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }

      const vehicles = await response.json();

      if (vehicles.length === 0) {
        throw new Error('No vehicles found');
      }

      const allResults: ProcessingResult = {};

      for (let vehicleIndex = 0; vehicleIndex < vehicles.length; vehicleIndex++) {
        const vehicle = vehicles[vehicleIndex];
        const stockNum = vehicle.stockNumber;

        setCurrentOperation(`Processing vehicle ${vehicleIndex + 1} of ${vehicles.length}: ${stockNum}...`);
        setProgress(Math.round((vehicleIndex / vehicles.length) * 100));

        if (!vehicle.images || vehicle.images.length === 0) {
          console.warn(`No images found for vehicle ${stockNum}`);
          continue;
        }

        const processedImages: ProcessedImage[] = [];

        // Process only the first image of each vehicle to avoid overwhelming the browser
        try {
          const processedUrl = await processImageWithBrowserRemoval(
            vehicle.images[0],
            0,
            vehicle.stockNumber || vehicle.id
          );

          processedImages.push({
            originalUrl: vehicle.images[0],
            processedUrl,
            processedAt: new Date(),
            status: 'completed',
            imageIndex: 0
          });
        } catch (error) {
          console.error(`Failed to process first image for vehicle ${stockNum}:`, error);
          processedImages.push({
            originalUrl: vehicle.images[0],
            processedUrl: '',
            processedAt: new Date(),
            status: 'failed',
            imageIndex: 0
          });
        }

        allResults[stockNum] = processedImages;
      }

      setResults(allResults);
      setProgress(100);
      setCurrentOperation(`Completed processing ${vehicles.length} vehicles`);
    } catch (error) {
      console.error('Error processing all vehicles:', error);
      setCurrentOperation(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleProcessSingle = async () => {
    if (!stockNumber.trim()) return;

    setIsProcessing(true);
    setProgress(0);
    await processSingleVehicle(stockNumber.trim());
    setIsProcessing(false);
  };

  const handleProcessAll = async () => {
    setIsProcessing(true);
    setProgress(0);
    await processAllVehicles();
    setIsProcessing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Image className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      processing: 'secondary',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Background Removal Service
          </CardTitle>
          <CardDescription>
            Remove backgrounds from vehicle photos using AI-powered background removal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single Vehicle Processing */}
          <div className="space-y-2">
            <Label htmlFor="stockNumber">Process Single Vehicle</Label>
            <div className="flex gap-2">
              <Input
                id="stockNumber"
                placeholder="Enter stock number (e.g., S161)"
                value={stockNumber}
                onChange={(e) => setStockNumber(e.target.value)}
                disabled={isProcessing}
              />
              <Button
                onClick={handleProcessSingle}
                disabled={isProcessing || !stockNumber.trim()}
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Process
              </Button>
            </div>
          </div>

          {/* Test Browser-based Background Removal */}
          <div className="space-y-2">
            <Label>Test Browser Background Removal</Label>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  try {
                    setCurrentOperation('Testing browser-based background removal...');
                    const testImageUrl = 'https://www.bentleysupercenter.com/inventoryphotos/21600/3czrm3h53cg700943/ip/1.jpg';

                    // For test, we'll just process locally without uploading to S3
                    const { removeBackground } = await import('@imgly/background-removal');
                    const base64Image = await urlToBase64(testImageUrl);
                    const result = await removeBackground(base64Image, {
                      output: {
                        format: 'image/png',
                        quality: 0.8
                      }
                    });

                    let processedUrl: string;
                    if (typeof result === 'string') {
                      processedUrl = result;
                    } else if (result instanceof Blob) {
                      processedUrl = URL.createObjectURL(result);
                    } else {
                      throw new Error('Unexpected result format from background removal');
                    }

                    setCurrentOperation('');

                    // Create a temporary result to show
                    const testResult = {
                      originalUrl: testImageUrl,
                      processedUrl,
                      processedAt: new Date(),
                      status: 'completed' as const,
                      imageIndex: 0
                    };

                    setResults({ 'TEST': [testResult] });
                    alert('Browser-based background removal test completed successfully! Check the results below.');
                  } catch (error) {
                    setCurrentOperation('');
                    alert(`Browser test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                }}
                variant="outline"
                className="w-full flex items-center gap-2"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Image className="h-4 w-4" />
                )}
                Test Browser Background Removal
              </Button>
            </div>
          </div>

          {/* Process All Vehicles */}
          <div className="space-y-2">
            <Label>Process All Vehicles</Label>
            <Button
              onClick={handleProcessAll}
              disabled={isProcessing}
              variant="outline"
              className="w-full flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Process All Vehicle Images
            </Button>
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentOperation}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {Object.keys(results).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
            <CardDescription>
              Background removal results for processed vehicles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(results).map(([vehicleStockNumber, images]) => (
                <div key={vehicleStockNumber} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Vehicle {vehicleStockNumber}</h3>
                  <div className="grid gap-3">
                    {images.map((image, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(image.status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              Image {index + 1}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {image.originalUrl}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(image.status)}
                          {image.status === 'completed' && image.processedUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(image.processedUrl, '_blank')}
                            >
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    Processed: {images.filter(img => img.status === 'completed').length} / {images.length} images
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}