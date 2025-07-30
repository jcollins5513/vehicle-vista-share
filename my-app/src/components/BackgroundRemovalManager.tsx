"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  Download, 
  Wand2, 
  Facebook, 
  Share2, 
  Trash2, 
  Eye, 
  FileImage,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Palette,
  MessageSquare
} from 'lucide-react';
import Image from 'next/image';
import { removeBackground, checkBackgroundRemovalHealth } from '@/utils/removeBackground';
import type { VehicleWithMedia } from '@/types';

interface ProcessedImage {
  id: string;
  original: File;
  processed: Blob;
  originalUrl: string;
  processedUrl: string;
  vehicleId: string;
  status: 'processing' | 'completed' | 'error';
}

interface SocialTemplate {
  id: string;
  name: string;
  description: string;
  dimensions: { width: number; height: number };
  backgroundColor: string;
  overlay?: string;
}

const socialTemplates: SocialTemplate[] = [
  {
    id: 'facebook-post',
    name: 'Facebook Post',
    description: 'Standard Facebook post format',
    dimensions: { width: 1200, height: 630 },
    backgroundColor: '#1877f2',
    overlay: 'gradient'
  },
  {
    id: 'facebook-story',
    name: 'Facebook Story',
    description: 'Facebook/Instagram story format',
    dimensions: { width: 1080, height: 1920 },
    backgroundColor: '#833ab4',
    overlay: 'minimal'
  },
  {
    id: 'marketplace',
    name: 'Marketplace Listing',
    description: 'Facebook Marketplace optimized',
    dimensions: { width: 1200, height: 900 },
    backgroundColor: '#ffffff',
    overlay: 'clean'
  },
  {
    id: 'premium',
    name: 'Premium Showcase',
    description: 'Luxury vehicle showcase',
    dimensions: { width: 1920, height: 1080 },
    backgroundColor: '#000000',
    overlay: 'luxury'
  }
];

interface BackgroundRemovalManagerProps {
  vehicles: VehicleWithMedia[];
  onUpdate?: () => void;
}

export default function BackgroundRemovalManager({ vehicles, onUpdate }: BackgroundRemovalManagerProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('facebook-post');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<{
    current: number;
    total: number;
    currentFile: string;
  } | null>(null);
  const [uploadMode, setUploadMode] = useState<'files' | 'folder'>('files');
  const [serviceHealth, setServiceHealth] = useState<{
    available: boolean;
    service?: string;
    error?: string;
    installInstructions?: string;
  } | null>(null);

  const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);
  const selectedTemplateData = socialTemplates.find(t => t.id === selectedTemplate);

  // Force modal to be closed on every render
  useEffect(() => {
    if (isModalOpen) {
      console.log('🔧 Modal was open, forcing it closed');
      setIsModalOpen(false);
    }
  });

  // Check service health and ensure modal starts closed on component mount
  useEffect(() => {
    setIsModalOpen(false);
    console.log('🔧 BackgroundRemovalManager mounted, modal set to closed');

    // Check if background removal service is available
    checkBackgroundRemovalHealth().then(health => {
      setServiceHealth(health);
      if (health.available) {
        console.log(`✅ Background removal service available: ${health.service}`);
      } else {
        console.warn('⚠️ Background removal service unavailable:', health.error);
      }
    });
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    // Filter to only include image files
    const imageFiles = files.filter(file =>
      file.type.startsWith('image/') &&
      ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())
    );

    if (imageFiles.length !== files.length) {
      const skipped = files.length - imageFiles.length;
      alert(`⚠️ Skipped ${skipped} non-image file(s). Only image files (JPEG, PNG, WebP) are supported.`);
    }

    setSelectedFiles(imageFiles);
  };

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    // Group files by folder structure if needed
    const imageFiles = files.filter(file =>
      file.type.startsWith('image/') &&
      ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())
    );

    console.log(`📁 Selected folder with ${imageFiles.length} image files`);
    setSelectedFiles(imageFiles);
  };

  const processImages = async () => {
    if (!selectedVehicle || selectedFiles.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: selectedFiles.length, currentFile: '' });

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const imageId = `${selectedVehicle}-${Date.now()}-${Math.random()}`;
      const originalUrl = URL.createObjectURL(file);

      // Update progress
      setProcessingProgress({
        current: i + 1,
        total: selectedFiles.length,
        currentFile: file.name
      });

      const processedImage: ProcessedImage = {
        id: imageId,
        original: file,
        processed: new Blob(),
        originalUrl,
        processedUrl: '',
        vehicleId: selectedVehicle,
        status: 'processing'
      };

      setProcessedImages(prev => [...prev, processedImage]);

      try {
        const processedBlob = await removeBackground(file);
        const processedUrl = URL.createObjectURL(processedBlob);

        setProcessedImages(prev =>
          prev.map(img =>
            img.id === imageId
              ? { ...img, processed: processedBlob, processedUrl, status: 'completed' }
              : img
          )
        );
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        setProcessedImages(prev =>
          prev.map(img =>
            img.id === imageId ? { ...img, status: 'error' } : img
          )
        );
      }
    }

    setIsProcessing(false);
    setProcessingProgress(null);
    setSelectedFiles([]);
  };

  const generateContentWithAI = async () => {
    if (!selectedVehicleData || !selectedTemplateData) return;

    setIsGeneratingContent(true);

    try {
      const prompt = `Create engaging social media content for a ${selectedVehicleData.year} ${selectedVehicleData.make} ${selectedVehicleData.model} for ${selectedTemplateData.name}. 
      
Vehicle details:
- Price: $${selectedVehicleData.price?.toLocaleString() || 'Contact for price'}
- Mileage: ${selectedVehicleData.mileage?.toLocaleString() || 'N/A'} miles
- Engine: ${selectedVehicleData.engine || 'N/A'}
- Stock #: ${selectedVehicleData.stockNumber}

Create compelling copy that highlights the luxury and appeal of this vehicle. Include relevant hashtags and a call to action. Keep it engaging and professional.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          context: 'social_media_generation'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedContent(data.content || data.message || 'Content generated successfully!');
      } else {
        throw new Error('Failed to generate content');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setGeneratedContent(`🚗 Discover the luxury of this stunning ${selectedVehicleData.year} ${selectedVehicleData.make} ${selectedVehicleData.model}! 

✨ Premium features and exceptional performance
�� Priced at $${selectedVehicleData.price?.toLocaleString() || 'Contact for price'}
🏁 Only ${selectedVehicleData.mileage?.toLocaleString() || 'Low'} miles

Contact us today to schedule your test drive!

#LuxuryCars #${selectedVehicleData.make} #PremiumVehicles #CarShowroom #TestDrive`);
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const downloadProcessedImage = (image: ProcessedImage) => {
    const link = document.createElement('a');
    link.href = image.processedUrl;
    link.download = `${selectedVehicleData?.year}-${selectedVehicleData?.make}-${selectedVehicleData?.model}-processed.png`;
    link.click();
  };

  const createSocialPost = async (image: ProcessedImage) => {
    if (!selectedTemplateData || !selectedVehicleData) return;

    // Create a canvas to compose the social media post
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = selectedTemplateData.dimensions.width;
    canvas.height = selectedTemplateData.dimensions.height;

    // Set background
    ctx.fillStyle = selectedTemplateData.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add gradient overlay if specified
    if (selectedTemplateData.overlay === 'gradient') {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(24, 119, 242, 0.8)');
      gradient.addColorStop(1, 'rgba(131, 58, 180, 0.8)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Load and draw the processed image
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const maxWidth = canvas.width * 0.7;
      const maxHeight = canvas.height * 0.7;

      let drawWidth = maxWidth;
      let drawHeight = drawWidth / aspectRatio;

      if (drawHeight > maxHeight) {
        drawHeight = maxHeight;
        drawWidth = drawHeight * aspectRatio;
      }

      const x = (canvas.width - drawWidth) / 2;
      const y = (canvas.height - drawHeight) / 2;

      ctx.drawImage(img, x, y, drawWidth, drawHeight);

      // Add text overlay
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${selectedVehicleData.year} ${selectedVehicleData.make}`,
        canvas.width / 2,
        canvas.height - 100
      );

      // Download the composed image
      canvas.toBlob((blob) => {
        if (blob) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${selectedVehicleData.year}-${selectedVehicleData.make}-social-post.png`;
          link.click();
        }
      }, 'image/png');
    };

    img.src = image.processedUrl;
  };

  const postToFacebookMarketplace = async () => {
    if (!selectedVehicleData || !generatedContent || processedImages.length === 0) {
      alert('Please select a vehicle, generate content, and process at least one image before posting to Facebook.');
      return;
    }

    try {
      setIsProcessing(true);

      // Prepare images for upload (in a real implementation, these would be uploaded to a CDN first)
      const imageUrls = processedImages
        .filter(img => img.status === 'completed')
        .map(img => img.processedUrl);

      const postData = {
        vehicleId: selectedVehicleData.id,
        images: imageUrls,
        content: generatedContent,
        price: selectedVehicleData.price || 0,
        vehicleInfo: {
          make: selectedVehicleData.make,
          model: selectedVehicleData.model,
          year: selectedVehicleData.year,
          mileage: selectedVehicleData.mileage,
          stockNumber: selectedVehicleData.stockNumber
        }
      };

      const response = await fetch('/api/facebook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Successfully posted to Facebook Marketplace!\n\nPost ID: ${result.postId}\nVehicle: ${selectedVehicleData.year} ${selectedVehicleData.make} ${selectedVehicleData.model}\n\nNote: This is a simulated response. Real Facebook integration requires additional setup.`);
      } else {
        throw new Error(result.error || 'Failed to post to Facebook');
      }
    } catch (error) {
      console.error('Error posting to Facebook:', error);
      alert(`❌ Error posting to Facebook Marketplace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeProcessedImage = (imageId: string) => {
    setProcessedImages(prev => {
      const image = prev.find(img => img.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.originalUrl);
        URL.revokeObjectURL(image.processedUrl);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  const downloadAllProcessed = () => {
    const completedImages = processedImages.filter(img => img.status === 'completed');

    if (completedImages.length === 0) {
      alert('No processed images to download');
      return;
    }

    // Download each image with a small delay to avoid browser blocking
    completedImages.forEach((image, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = image.processedUrl;
        const filename = selectedVehicleData
          ? `${selectedVehicleData.year}-${selectedVehicleData.make}-${selectedVehicleData.model}-${index + 1}-processed.png`
          : `processed-image-${index + 1}.png`;
        link.download = filename;
        link.click();
      }, index * 200);
    });
  };

  const clearAll = () => {
    processedImages.forEach(image => {
      URL.revokeObjectURL(image.originalUrl);
      URL.revokeObjectURL(image.processedUrl);
    });
    setProcessedImages([]);
    setSelectedFiles([]);
    setGeneratedContent('');
    setProcessingProgress(null);
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isModalOpen]);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      processedImages.forEach(image => {
        URL.revokeObjectURL(image.originalUrl);
        URL.revokeObjectURL(image.processedUrl);
      });
    };
  }, []);

  if (!isModalOpen) {
    console.log('🔘 Rendering button (modal closed)');
    return (
      <Button
        onClick={() => {
          console.log('🔵 Button clicked, opening modal');
          setIsModalOpen(true);
        }}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
      >
        <Wand2 className="w-4 h-4 mr-2" />
        Background Removal & Social Media
      </Button>
    );
  }

  console.log('🔴 Rendering modal (modal open)');

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsModalOpen(false);
        }
      }}
    >
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-white/20 max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Background Removal & Social Media Manager</h2>
            <Button
              onClick={() => {
                console.log('🔵 Close button clicked');
                setIsModalOpen(false);
              }}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              Close
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel - Upload & Processing */}
            <div className="space-y-6">
              <Card className="bg-white/10 border-white/20 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">1. Select Vehicle & Upload Images</h3>
                  {serviceHealth && (
                    <div className="flex items-center space-x-2 text-xs">
                      {serviceHealth.available ? (
                        <>
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-green-400">
                            {serviceHealth.service || 'nadermx/backgroundremover'} Ready
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          <span className="text-red-400">Service Unavailable</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Vehicle</label>
                    <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Choose a vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.year} {vehicle.make} {vehicle.model} (#{vehicle.stockNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-white/70 text-sm mb-2">Upload Images</label>

                    {/* Upload Mode Toggle */}
                    <div className="flex space-x-2 mb-3">
                      <Button
                        type="button"
                        onClick={() => setUploadMode('files')}
                        size="sm"
                        variant={uploadMode === 'files' ? 'default' : 'outline'}
                        className={uploadMode === 'files' ? 'bg-blue-600' : 'border-white/30 text-white hover:bg-white/10'}
                      >
                        <FileImage className="w-3 h-3 mr-1" />
                        Files
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setUploadMode('folder')}
                        size="sm"
                        variant={uploadMode === 'folder' ? 'default' : 'outline'}
                        className={uploadMode === 'folder' ? 'bg-blue-600' : 'border-white/30 text-white hover:bg-white/10'}
                      >
                        📁 Folder
                      </Button>
                    </div>

                    <div className="border-2 border-dashed border-white/30 rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 text-white/50 mx-auto mb-2" />
                      <p className="text-white/70 mb-2">
                        {uploadMode === 'files'
                          ? 'Drag and drop images or click to select files'
                          : 'Select a folder containing vehicle images'
                        }
                      </p>

                      {uploadMode === 'files' ? (
                        <>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="file-upload"
                          />
                          <label
                            htmlFor="file-upload"
                            className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-block"
                          >
                            Select Files
                          </label>
                        </>
                      ) : (
                        <>
                          <input
                            type="file"
                            webkitdirectory=""
                            directory=""
                            multiple
                            accept="image/*"
                            onChange={handleFolderSelect}
                            className="hidden"
                            id="folder-upload"
                          />
                          <label
                            htmlFor="folder-upload"
                            className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg inline-block"
                          >
                            Select Folder
                          </label>
                        </>
                      )}
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-white/70 text-sm">{selectedFiles.length} images selected</p>
                          <Button
                            onClick={() => setSelectedFiles([])}
                            size="sm"
                            variant="outline"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          >
                            Clear
                          </Button>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {selectedFiles.slice(0, 10).map((file, index) => (
                            <div key={index} className="text-white/60 text-xs flex items-center">
                              <FileImage className="w-3 h-3 mr-1" />
                              {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
                            </div>
                          ))}
                          {selectedFiles.length > 10 && (
                            <div className="text-white/50 text-xs">
                              ... and {selectedFiles.length - 10} more files
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Processing Progress */}
                    {processingProgress && (
                      <div className="mt-3 p-3 bg-blue-500/10 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-blue-400 text-sm font-medium">
                            Processing... ({processingProgress.current}/{processingProgress.total})
                          </span>
                          <span className="text-white/70 text-xs">
                            {Math.round((processingProgress.current / processingProgress.total) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2 mb-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${(processingProgress.current / processingProgress.total) * 100}%`
                            }}
                          />
                        </div>
                        <div className="text-white/60 text-xs truncate">
                          Current: {processingProgress.currentFile}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={processImages}
                    disabled={!selectedVehicle || selectedFiles.length === 0 || isProcessing}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4 mr-2" />
                    )}
                    {isProcessing ? 'Processing...' : 'Remove Backgrounds'}
                  </Button>
                </div>
              </Card>

              {/* Processed Images */}
              {processedImages.length > 0 && (
                <Card className="bg-white/10 border-white/20 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">
                      Processed Images
                      <span className="text-white/60 text-sm ml-2">
                        ({processedImages.filter(img => img.status === 'completed').length} completed)
                      </span>
                    </h3>
                    <div className="flex space-x-2">
                      <Button
                        onClick={downloadAllProcessed}
                        variant="outline"
                        size="sm"
                        className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                        disabled={processedImages.filter(img => img.status === 'completed').length === 0}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download All
                      </Button>
                      <Button
                        onClick={clearAll}
                        variant="outline"
                        size="sm"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Clear All
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {processedImages.map((image) => (
                      <div key={image.id} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center mb-2">
                          {image.status === 'processing' && (
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin mr-2" />
                          )}
                          {image.status === 'completed' && (
                            <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                          )}
                          {image.status === 'error' && (
                            <XCircle className="w-4 h-4 text-red-400 mr-2" />
                          )}
                          <span className="text-white/70 text-sm capitalize">{image.status}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div>
                            <p className="text-white/60 text-xs mb-1">Original</p>
                            <div className="aspect-video bg-black/30 rounded overflow-hidden">
                              <Image
                                src={image.originalUrl}
                                alt="Original"
                                width={100}
                                height={60}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                          
                          {image.status === 'completed' && (
                            <div>
                              <p className="text-white/60 text-xs mb-1">Processed</p>
                              <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded overflow-hidden">
                                <Image
                                  src={image.processedUrl}
                                  alt="Processed"
                                  width={100}
                                  height={60}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {image.status === 'completed' && (
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => downloadProcessedImage(image)}
                              size="sm"
                              variant="outline"
                              className="flex-1 border-white/30 text-white hover:bg-white/10"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                            <Button
                              onClick={() => createSocialPost(image)}
                              size="sm"
                              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
                            >
                              <Share2 className="w-3 h-3 mr-1" />
                              Create Post
                            </Button>
                            <Button
                              onClick={() => removeProcessedImage(image.id)}
                              size="sm"
                              variant="outline"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Right Panel - Social Media Templates & Content */}
            <div className="space-y-6">
              <Card className="bg-white/10 border-white/20 p-4">
                <h3 className="text-lg font-semibold text-white mb-4">2. Social Media Templates</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Template</label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {socialTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div>
                              <div className="font-medium">{template.name}</div>
                              <div className="text-xs opacity-70">{template.dimensions.width}x{template.dimensions.height}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTemplateData && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <h4 className="text-white font-medium mb-2">{selectedTemplateData.name}</h4>
                      <p className="text-white/70 text-sm mb-2">{selectedTemplateData.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-white/60">
                        <span>📐 {selectedTemplateData.dimensions.width}x{selectedTemplateData.dimensions.height}</span>
                        <span style={{ backgroundColor: selectedTemplateData.backgroundColor }} className="w-4 h-4 rounded"></span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="bg-white/10 border-white/20 p-4">
                <h3 className="text-lg font-semibold text-white mb-4">3. AI Content Generation</h3>
                
                <Button
                  onClick={generateContentWithAI}
                  disabled={!selectedVehicleData || isGeneratingContent}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 mb-4"
                >
                  {isGeneratingContent ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4 mr-2" />
                  )}
                  {isGeneratingContent ? 'Generating...' : 'Generate Content with AI'}
                </Button>

                {generatedContent && (
                  <div className="bg-white/5 rounded-lg p-4">
                    <label className="block text-white/70 text-sm mb-2">Generated Content</label>
                    <textarea
                      value={generatedContent}
                      onChange={(e) => setGeneratedContent(e.target.value)}
                      className="w-full h-32 bg-white/10 border border-white/20 rounded-lg p-3 text-white resize-none"
                      placeholder="AI-generated content will appear here..."
                    />
                    <div className="flex space-x-2 mt-3">
                      <Button
                        onClick={() => navigator.clipboard.writeText(generatedContent)}
                        size="sm"
                        variant="outline"
                        className="border-white/30 text-white hover:bg-white/10"
                      >
                        Copy Text
                      </Button>
                      <Button
                        onClick={() => setGeneratedContent('')}
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="bg-white/10 border-white/20 p-4">
                <h3 className="text-lg font-semibold text-white mb-4">4. Facebook Integration</h3>
                
                <div className="space-y-3">
                  <Button
                    className="w-full bg-[#1877f2] hover:bg-[#166fe5]"
                    onClick={postToFacebookMarketplace}
                    disabled={!selectedVehicleData || !generatedContent || processedImages.length === 0 || isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Facebook className="w-4 h-4 mr-2" />
                    )}
                    {isProcessing ? 'Posting...' : 'Post to Facebook Marketplace'}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border-[#1877f2] text-[#1877f2] hover:bg-[#1877f2]/10"
                    onClick={() => {
                      if (generatedContent && selectedVehicleData) {
                        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '/customer/' + selectedVehicleData.id)}&quote=${encodeURIComponent(generatedContent)}`;
                        window.open(facebookUrl, '_blank', 'width=600,height=400');
                      } else {
                        alert('Please select a vehicle and generate content first.');
                      }
                    }}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share to Facebook Page
                  </Button>

                  <div className="text-xs text-white/60 p-3 bg-white/5 rounded-lg">
                    ���� <strong>Pro Tip:</strong> Use the processed images with transparent backgrounds to create stunning social media posts that stand out in the feed!
                  </div>

                  {processedImages.length > 0 && generatedContent && selectedVehicleData && (
                    <div className="text-xs text-green-400 p-3 bg-green-500/10 rounded-lg">
                      ✅ Ready to post! You have {processedImages.filter(img => img.status === 'completed').length} processed images and generated content for the {selectedVehicleData.year} {selectedVehicleData.make} {selectedVehicleData.model}.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
