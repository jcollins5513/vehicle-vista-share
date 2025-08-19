import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Image as ImageIcon, 
  Download, 
  Search, 
  Grid, 
  List, 
  Calendar,
  Eye,
  ExternalLink,
  Loader2
} from 'lucide-react';
import Image from 'next/image';

interface ProcessedImage {
  originalUrl: string;
  processedUrl: string;
  processedAt: string;
  status: string;
  imageIndex: number;
}

interface ProcessedImagesData {
  [stockNumber: string]: ProcessedImage[];
}

export default function ContentCreationPage() {
  const [processedImages, setProcessedImages] = useState<ProcessedImagesData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProcessedImages();
  }, []);

  const fetchProcessedImages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/processed-images');
      const data = await response.json();

      if (data.success) {
        setProcessedImages(data.processedImages);
      } else {
        throw new Error('Failed to fetch processed images');
      }
    } catch (error) {
      console.error('Error fetching processed images:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const toggleImageSelection = (imageKey: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageKey)) {
        newSet.delete(imageKey);
      } else {
        newSet.add(imageKey);
      }
      return newSet;
    });
  };

  const downloadSelectedImages = async () => {
    for (const imageKey of selectedImages) {
      const [stockNumber, imageIndex] = imageKey.split('-');
      const image = processedImages[stockNumber]?.[parseInt(imageIndex)];
      if (image) {
        await downloadImage(
          image.processedUrl,
          `${stockNumber}_processed_${image.imageIndex}.png`
        );
      }
    }
  };

  const filteredImages = Object.entries(processedImages).filter(([stockNumber]) =>
    stockNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalImages = Object.values(processedImages).reduce(
    (sum, images) => sum + images.length, 
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
            <ImageIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">
            Loading Processed Images
          </h2>
          <p className="text-white/70">Fetching your content library...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950 to-slate-900 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">
            Error Loading Content
          </h2>
          <p className="text-white/70 mb-4">Error: {error}</p>
          <Button
            onClick={fetchProcessedImages}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-gradient-to-r from-black/40 to-black/20 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-white text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                Content Creation Library
              </h1>
              <p className="text-white/70">
                Manage and download your processed vehicle images
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Badge variant="secondary" className="bg-white/10 text-white">
                {totalImages} processed images
              </Badge>
              <Badge variant="secondary" className="bg-white/10 text-white">
                {Object.keys(processedImages).length} vehicles
              </Badge>
              <Button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
              <Input
                placeholder="Search by stock number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/50"
              />
            </div>

            {selectedImages.size > 0 && (
              <Button
                onClick={downloadSelectedImages}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Selected ({selectedImages.size})
              </Button>
            )}

            <Button
              onClick={fetchProcessedImages}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              <Loader2 className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {filteredImages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2">
              No Processed Images Found
            </h2>
            <p className="text-white/70 mb-4">
              Start processing vehicle images to build your content library
            </p>
            <Button
              onClick={() => window.location.href = '/background-removal'}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Process Images
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredImages.map(([stockNumber, images]) => (
              <Card
                key={stockNumber}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">
                        Vehicle {stockNumber}
                      </CardTitle>
                      <CardDescription className="text-white/70">
                        {images.length} processed image{images.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-white/10 text-white">
                      Last processed: {new Date(images[0]?.processedAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {images.map((image, index) => {
                        const imageKey = `${stockNumber}-${index}`;
                        const isSelected = selectedImages.has(imageKey);
                        
                        return (
                          <div
                            key={index}
                            className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                              isSelected 
                                ? 'border-blue-500 bg-blue-500/10' 
                                : 'border-white/20 hover:border-white/40'
                            }`}
                            onClick={() => toggleImageSelection(imageKey)}
                          >
                            {/* Before/After Comparison */}
                            <div className="aspect-video relative">
                              {/* Split view: Original (left) vs Processed (right) */}
                              <div className="flex h-full">
                                {/* Original Image */}
                                <div className="w-1/2 relative border-r border-white/20">
                                  <Image
                                    src={image.originalUrl}
                                    alt={`Original image ${image.imageIndex + 1}`}
                                    fill
                                    className="object-cover"
                                  />
                                  <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                    Original
                                  </div>
                                </div>
                                
                                {/* Processed Image */}
                                <div className="w-1/2 relative">
                                  <Image
                                    src={image.processedUrl}
                                    alt={`Processed image ${image.imageIndex + 1}`}
                                    fill
                                    className="object-cover"
                                  />
                                  <div className="absolute bottom-1 right-1 bg-green-600/80 text-white text-xs px-2 py-1 rounded">
                                    Processed
                                  </div>
                                </div>
                              </div>
                              
                              {/* Overlay */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(image.originalUrl, '_blank');
                                    }}
                                    className="bg-white/20 hover:bg-white/30"
                                    title="View Original"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span className="ml-1 text-xs">Orig</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(image.processedUrl, '_blank');
                                    }}
                                    className="bg-green-600/80 hover:bg-green-700"
                                    title="View Processed"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span className="ml-1 text-xs">Proc</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      downloadImage(
                                        image.processedUrl,
                                        `${stockNumber}_processed_${image.imageIndex}.png`
                                      );
                                    }}
                                    className="bg-blue-600/80 hover:bg-blue-700"
                                    title="Download Processed"
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* Selection indicator */}
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                  <div className="w-3 h-3 bg-white rounded-full"></div>
                                </div>
                              )}
                            </div>

                            <div className="p-3 bg-slate-800/50">
                              <div className="flex items-center justify-between">
                                <span className="text-white text-sm font-medium">
                                  Image {image.imageIndex + 1} - Before/After
                                </span>
                                <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                                  {image.status}
                                </Badge>
                              </div>
                              <p className="text-white/60 text-xs mt-1">
                                Processed: {new Date(image.processedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {images.map((image, index) => {
                        const imageKey = `${stockNumber}-${index}`;
                        const isSelected = selectedImages.has(imageKey);
                        
                        return (
                          <div
                            key={index}
                            className={`flex items-center space-x-4 p-4 rounded-lg border transition-all cursor-pointer ${
                              isSelected 
                                ? 'border-blue-500 bg-blue-500/10' 
                                : 'border-white/20 hover:border-white/40 bg-slate-800/30'
                            }`}
                            onClick={() => toggleImageSelection(imageKey)}
                          >
                            {/* Before/After thumbnails */}
                            <div className="flex space-x-2">
                              <div className="w-16 h-12 rounded overflow-hidden border border-white/20">
                                <Image
                                  src={image.originalUrl}
                                  alt={`Original image ${image.imageIndex + 1}`}
                                  width={64}
                                  height={48}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="w-16 h-12 rounded overflow-hidden border border-green-500/50">
                                <Image
                                  src={image.processedUrl}
                                  alt={`Processed image ${image.imageIndex + 1}`}
                                  width={64}
                                  height={48}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>

                            <div className="flex-1">
                              <h4 className="text-white font-medium">
                                Image {image.imageIndex + 1} - Before/After
                              </h4>
                              <p className="text-white/60 text-sm">
                                Processed: {new Date(image.processedAt).toLocaleString()}
                              </p>
                              <div className="flex space-x-2 mt-1">
                                <Badge variant="outline" className="border-white/30 text-white text-xs">
                                  Original Available
                                </Badge>
                                <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                                  {image.status}
                                </Badge>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(image.originalUrl, '_blank');
                                }}
                                className="border-white/30 text-white hover:bg-white/10"
                                title="View Original"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span className="ml-1 text-xs">Orig</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(image.processedUrl, '_blank');
                                }}
                                className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                                title="View Processed"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span className="ml-1 text-xs">Proc</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadImage(
                                    image.processedUrl,
                                    `${stockNumber}_processed_${image.imageIndex}.png`
                                  );
                                }}
                                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                                title="Download Processed"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}