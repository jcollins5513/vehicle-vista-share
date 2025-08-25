'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Image, CheckCircle, XCircle, Play, Upload, Trash2 } from 'lucide-react';
import type { ProcessedImage } from '@/types';

interface Asset {
  key: string;
  url: string;
  name: string;
  type: 'original' | 'processed';
  createdAt: Date;
}

interface ProcessingResult {
  [stockNumber: string]: ProcessedImage[];
}

interface ManualUploadResult {
  original: Asset;
  processed?: Asset;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export function BackgroundRemovalPanel() {
  const [stockNumber, setStockNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult>({});
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');

  // Manual upload states
  const [manualUploads, setManualUploads] = useState<ManualUploadResult[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Helper function to upload asset to S3 (general assets, not vehicle-specific)
  const uploadAssetToS3 = async (
    file: File | Blob,
    fileName: string,
    type: 'original' | 'processed'
  ): Promise<Asset> => {
    const formData = new FormData();
    formData.append('file', file, fileName);
    formData.append('category', type === 'processed' ? 'background-removed' : 'manual-uploads');

    const response = await fetch('/api/assets/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to upload asset: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      key: result.asset.key,
      url: result.asset.url,
      name: fileName,
      type,
      createdAt: new Date()
    };
  };

  // Helper function to upload processed image to S3 (for vehicle-specific processing)
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

  // Manual upload handlers
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        processManualUpload(file);
      }
    });
  };

  const processManualUpload = async (file: File) => {
    const uploadId = Date.now().toString();
    const fileName = file.name;

    // Add initial upload result
    const initialResult: ManualUploadResult = {
      original: {
        key: uploadId,
        url: URL.createObjectURL(file),
        name: fileName,
        type: 'original',
        createdAt: new Date()
      },
      status: 'uploaded'
    };

    setManualUploads(prev => [...prev, initialResult]);

    try {
      // Upload original file to S3
      setCurrentOperation(`Uploading ${fileName}...`);
      const originalAsset = await uploadAssetToS3(file, fileName, 'original');

      // Update with S3 URL
      setManualUploads(prev => prev.map(upload =>
        upload.original.key === uploadId
          ? { ...upload, original: originalAsset, status: 'processing' as const }
          : upload
      ));

      // Process background removal
      setCurrentOperation(`Removing background from ${fileName}...`);
      const { removeBackground } = await import('@imgly/background-removal');

      const result = await removeBackground(file, {
        output: {
          format: 'image/png',
          quality: 0.8
        }
      });

      let processedBlob: Blob;
      if (result instanceof Blob) {
        processedBlob = result;
      } else if (typeof result === 'string') {
        const response = await fetch(result);
        processedBlob = await response.blob();
      } else {
        throw new Error('Unexpected result format from background removal');
      }

      // Upload processed image to S3
      const processedFileName = fileName.replace(/\.[^/.]+$/, '_processed.png');
      const processedAsset = await uploadAssetToS3(processedBlob, processedFileName, 'processed');

      // Update with processed result
      setManualUploads(prev => prev.map(upload =>
        upload.original.key === uploadId
          ? { ...upload, processed: processedAsset, status: 'completed' as const }
          : upload
      ));

      setCurrentOperation('');
    } catch (error) {
      console.error('Error processing manual upload:', error);
      setManualUploads(prev => prev.map(upload =>
        upload.original.key === uploadId
          ? {
            ...upload,
            status: 'failed' as const,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
          : upload
      ));
      setCurrentOperation('');
    }
  };

  const removeManualUpload = (uploadKey: string) => {
    setManualUploads(prev => prev.filter(upload => upload.original.key !== uploadKey));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      {/* Manual Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Manual Image Upload & Background Removal
          </CardTitle>
          <CardDescription>
            Upload images to create reusable marketing assets (logos, badges, backgrounds, etc.). These assets are NOT tied to specific vehicles and can be used across any content creation. For vehicle-specific photos, use the Manual Upload in the Content Creation page instead.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Workflow Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-1">
                <Image className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-1">General Assets Workflow:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Upload marketing assets (logos, badges, backgrounds)</li>
                  <li>2. Background removal happens automatically</li>
                  <li>3. Assets become available in Content Creation editor</li>
                  <li>4. For vehicle photos, use Content Creation → Manual Upload</li>
                </ol>
              </div>
            </div>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop images here or click to upload
            </p>
            <p className="text-sm text-gray-500">
              Supports JPG, PNG, and other image formats
            </p>
            <p className="text-xs text-blue-600 mt-2">
              💡 For vehicle photos: Go to Content Creation → Manual Upload instead
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>

          {/* Manual Upload Results */}
          {manualUploads.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Uploaded Images</Label>
              {manualUploads.map((upload) => (
                <div key={upload.original.key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(upload.status)}
                      <div>
                        <p className="font-medium">{upload.original.name}</p>
                        <p className="text-sm text-gray-500">
                          {upload.status === 'processing' && 'Processing background removal...'}
                          {upload.status === 'completed' && 'Background removal completed'}
                          {upload.status === 'failed' && `Failed: ${upload.error}`}
                          {upload.status === 'uploaded' && 'Uploaded, ready for processing'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(upload.status)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeManualUpload(upload.original.key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Original Image */}
                    <div>
                      <Label className="text-xs text-gray-500">Original</Label>
                      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={upload.original.url}
                          alt="Original"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => window.open(upload.original.url, '_blank')}
                      >
                        View Original
                      </Button>
                    </div>

                    {/* Processed Image */}
                    {upload.processed && (
                      <div>
                        <Label className="text-xs text-gray-500">Background Removed</Label>
                        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={upload.processed.url}
                            alt="Processed"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => window.open(upload.processed!.url, '_blank')}
                        >
                          View Processed
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Processing Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Vehicle Background Removal Service
          </CardTitle>
          <CardDescription>
            Remove backgrounds from existing vehicle photos in inventory
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