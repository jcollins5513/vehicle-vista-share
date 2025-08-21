"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Image as ImageIcon,
  Download,
  Search,
  Eye,
  Loader2,
  Wand2,
  Instagram,
  Facebook,
  FileText,
  Copy,
  Save,
  Sparkles,
  Car,
  Layout
} from 'lucide-react';
import Image from 'next/image';
import type { Vehicle } from '@/types';

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

interface ContentTemplate {
  id: string;
  name: string;
  type: 'instagram' | 'facebook' | 'flyer' | 'story';
  description: string;
  dimensions: { width: number; height: number };
  icon: React.ReactNode;
  bgColor: string;
}

interface GeneratedContent {
  headline: string;
  description: string;
  callToAction: string;
  hashtags: string[];
  features: string[];
}

const contentTemplates: ContentTemplate[] = [
  {
    id: 'instagram-post',
    name: 'Instagram Post',
    type: 'instagram',
    description: 'Square 1:1 ratio perfect for Instagram feed',
    dimensions: { width: 1080, height: 1080 },
    icon: <Instagram className="w-5 h-5" />,
    bgColor: 'from-pink-500 to-purple-600'
  },
  {
    id: 'instagram-story',
    name: 'Instagram Story',
    type: 'story',
    description: 'Vertical format for Instagram and Facebook stories',
    dimensions: { width: 1080, height: 1920 },
    icon: <Instagram className="w-5 h-5" />,
    bgColor: 'from-purple-500 to-blue-600'
  },
  {
    id: 'facebook-post',
    name: 'Facebook Post',
    type: 'facebook',
    description: 'Optimized for Facebook timeline posts',
    dimensions: { width: 1200, height: 630 },
    icon: <Facebook className="w-5 h-5" />,
    bgColor: 'from-blue-500 to-blue-700'
  },
  {
    id: 'promotional-flyer',
    name: 'Promotional Flyer',
    type: 'flyer',
    description: 'Print-ready promotional material',
    dimensions: { width: 2480, height: 3508 },
    icon: <FileText className="w-5 h-5" />,
    bgColor: 'from-green-500 to-emerald-600'
  }
];

export default function ContentCreationPage() {
  const [processedImages, setProcessedImages] = useState<ProcessedImagesData>({});
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [selectedImage, setSelectedImage] = useState<ProcessedImage | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('images');

  useEffect(() => {
    Promise.all([fetchProcessedImages(), fetchVehicles()]);
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

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setVehicles(data);
      } else if (data.success && Array.isArray(data.vehicles)) {
        setVehicles(data.vehicles);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const generateContent = async () => {
    if (!selectedVehicle || !selectedTemplate) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/content-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleData: selectedVehicle,
          templateType: selectedTemplate.type,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setGeneratedContent(data.content);
      } else {
        throw new Error(data.error || 'Failed to generate content');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      // Fallback content
      setGeneratedContent(generateFallbackContent(selectedVehicle));
    } finally {
      setIsGenerating(false);
    }
  };


  const generateFallbackContent = (vehicle: Vehicle): GeneratedContent => {
    return {
      headline: `${vehicle.year} ${vehicle.make} ${vehicle.model} - Premium Quality Awaits`,
      description: `Experience luxury and performance with this stunning ${vehicle.year} ${vehicle.make} ${vehicle.model}. With only ${vehicle.mileage.toLocaleString()} miles, this vehicle offers the perfect combination of style, comfort, and reliability.`,
      callToAction: 'Schedule Your Test Drive Today!',
      hashtags: ['#LuxuryCars', '#BentleySupercenter', `#${vehicle.make}`, `#${vehicle.model}`, '#QualityVehicles'],
      features: vehicle.features.slice(0, 3)
    };
  };

  const downloadTemplate = async () => {
    if (!selectedTemplate || !selectedImage || !generatedContent) return;

    // Create a canvas element for the template
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = selectedTemplate.dimensions.width;
    canvas.height = selectedTemplate.dimensions.height;

    // Load and draw the background image
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Draw background gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1e293b');
      gradient.addColorStop(1, '#0f172a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the vehicle image
      const imgAspect = img.width / img.height;
      const canvasAspect = canvas.width / canvas.height;
      
      let drawWidth, drawHeight, offsetX, offsetY;
      
      if (imgAspect > canvasAspect) {
        drawHeight = canvas.height * 0.6;
        drawWidth = drawHeight * imgAspect;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = canvas.height * 0.1;
      } else {
        drawWidth = canvas.width * 0.8;
        drawHeight = drawWidth / imgAspect;
        offsetX = canvas.width * 0.1;
        offsetY = (canvas.height - drawHeight) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // Add text content
      ctx.fillStyle = 'white';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      
      // Headline
      const textY = canvas.height * 0.8;
      ctx.fillText(generatedContent.headline, canvas.width / 2, textY);

      // Call to action
      ctx.font = '32px Arial';
      ctx.fillText(generatedContent.callToAction, canvas.width / 2, textY + 60);

      // Download the canvas as image
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${selectedTemplate.name}-${selectedVehicle?.stockNumber}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      });
    };

    img.src = selectedImage.processedUrl;
  };

  const filteredImages = Object.entries(processedImages).filter(([stockNumber]) =>
    stockNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getVehicleByStockNumber = (stockNumber: string) => {
    return vehicles.find(v => v.stockNumber === stockNumber);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full flex items-center justify-center animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">
            Loading Content Studio
          </h2>
          <p className="text-white/70">Preparing your creative workspace...</p>
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
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-white text-3xl font-bold bg-gradient-to-r from-white via-yellow-100 to-blue-100 bg-clip-text text-transparent">
                  Content Creation Studio
                </h1>
                <p className="text-white/70">
                  Create engaging marketing content with AI-powered templates
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <span className="text-white/70 text-sm">
                  {Object.values(processedImages).reduce((sum, imgs) => sum + imgs.length, 0)} images
                </span>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <span className="text-white/70 text-sm">
                  {contentTemplates.length} templates
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-200 text-sm">
              <strong>Error:</strong> {error}
            </p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-red-300 hover:text-red-100 text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur-xl border border-white/20">
            <TabsTrigger value="images" className="data-[state=active]:bg-white/20 text-white">
              <ImageIcon className="w-4 h-4 mr-2" />
              Vehicle Images
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-white/20 text-white">
              <Layout className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="create" className="data-[state=active]:bg-white/20 text-white">
              <Wand2 className="w-4 h-4 mr-2" />
              Create Content
            </TabsTrigger>
          </TabsList>

          {/* Vehicle Images Tab */}
          <TabsContent value="images" className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
                <Input
                  placeholder="Search by stock number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>
            </div>

            {filteredImages.length === 0 ? (
              <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
                <CardContent className="text-center py-16">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 text-white/50" />
                  <h3 className="text-white text-xl font-bold mb-2">No Images Found</h3>
                  <p className="text-white/70">Start by processing vehicle images to build your content library</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredImages.map(([stockNumber, images]) => {
                  const vehicle = getVehicleByStockNumber(stockNumber);
                  return (
                    <Card
                      key={stockNumber}
                      className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20 hover:border-white/40 transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedVehicle(vehicle || null);
                        setActiveTab('templates');
                      }}
                    >
                      <CardHeader>
                        <CardTitle className="text-white flex items-center">
                          <Car className="w-5 h-5 mr-2" />
                          {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : `Vehicle ${stockNumber}`}
                        </CardTitle>
                        <CardDescription className="text-white/70">
                          {images.length} processed image{images.length !== 1 ? 's' : ''} • Stock: {stockNumber}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {images.slice(0, 4).map((image, index) => (
                            <div key={index} className="aspect-video rounded-lg overflow-hidden border border-white/20">
                              <Image
                                src={image.processedUrl}
                                alt={`Vehicle ${index + 1}`}
                                width={200}
                                height={150}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                        {vehicle && (
                          <div className="text-white/80 text-sm space-y-1">
                            <p>Price: ${vehicle.price?.toLocaleString()}</p>
                            <p>Mileage: {vehicle.mileage?.toLocaleString()} miles</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {contentTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20 hover:border-white/40 transition-all cursor-pointer ${
                    selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => {
                    setSelectedTemplate(template);
                    if (selectedVehicle) {
                      setActiveTab('create');
                    }
                  }}
                >
                  <CardHeader>
                    <div className={`w-12 h-12 bg-gradient-to-br ${template.bgColor} rounded-xl flex items-center justify-center mb-3`}>
                      {template.icon}
                    </div>
                    <CardTitle className="text-white">{template.name}</CardTitle>
                    <CardDescription className="text-white/70">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-white/60 text-sm">
                      {template.dimensions.width} × {template.dimensions.height}px
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedVehicle && (
              <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Selected Vehicle</CardTitle>
                  <CardDescription className="text-white/70">
                    {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model} - Stock: {selectedVehicle.stockNumber}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          {/* Create Content Tab */}
          <TabsContent value="create" className="space-y-6">
            {!selectedVehicle || !selectedTemplate ? (
              <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
                <CardContent className="text-center py-16">
                  <Wand2 className="w-16 h-16 mx-auto mb-4 text-white/50" />
                  <h3 className="text-white text-xl font-bold mb-2">Ready to Create</h3>
                  <p className="text-white/70 mb-4">
                    {!selectedVehicle ? 'Select a vehicle from the Images tab' : 'Choose a template to get started'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Panel - Content Generation */}
                <div className="space-y-6">
                  <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <Wand2 className="w-5 h-5 mr-2" />
                        AI Content Generation
                      </CardTitle>
                      <CardDescription className="text-white/70">
                        Generate engaging content for your selected vehicle
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <h4 className="text-white font-medium mb-2">Vehicle Details</h4>
                        <p className="text-white/70 text-sm">
                          {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}<br />
                          ${selectedVehicle.price?.toLocaleString()} • {selectedVehicle.mileage?.toLocaleString()} miles<br />
                          Color: {selectedVehicle.color}
                        </p>
                      </div>

                      <Button
                        onClick={generateContent}
                        disabled={isGenerating}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        {isGenerating ? 'Generating...' : 'Generate AI Content'}
                      </Button>

                      {generatedContent && (
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="headline-input" className="text-white text-sm font-medium">Headline</label>
                            <Input
                              id="headline-input"
                              value={generatedContent.headline}
                              onChange={(e) => setGeneratedContent({
                                ...generatedContent,
                                headline: e.target.value
                              })}
                              className="mt-1 bg-white/10 border-white/20 text-white"
                            />
                          </div>

                          <div>
                            <label htmlFor="description-input" className="text-white text-sm font-medium">Description</label>
                            <Textarea
                              id="description-input"
                              value={generatedContent.description}
                              onChange={(e) => setGeneratedContent({
                                ...generatedContent,
                                description: e.target.value
                              })}
                              className="mt-1 bg-white/10 border-white/20 text-white"
                              rows={4}
                            />
                          </div>

                          <div>
                            <label htmlFor="cta-input" className="text-white text-sm font-medium">Call to Action</label>
                            <Input
                              id="cta-input"
                              value={generatedContent.callToAction}
                              onChange={(e) => setGeneratedContent({
                                ...generatedContent,
                                callToAction: e.target.value
                              })}
                              className="mt-1 bg-white/10 border-white/20 text-white"
                            />
                          </div>

                          <div>
                            <label htmlFor="hashtags-input" className="text-white text-sm font-medium">Hashtags</label>
                            <Input
                              id="hashtags-input"
                              value={generatedContent.hashtags.join(' ')}
                              onChange={(e) => setGeneratedContent({
                                ...generatedContent,
                                hashtags: e.target.value.split(' ').filter(tag => tag.trim())
                              })}
                              className="mt-1 bg-white/10 border-white/20 text-white"
                              placeholder="#hashtag1 #hashtag2"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Image Selection */}
                  <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <ImageIcon className="w-5 h-5 mr-2" />
                        Select Image
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {processedImages[selectedVehicle.stockNumber] ? (
                        <div className="grid grid-cols-2 gap-3">
                          {processedImages[selectedVehicle.stockNumber].map((image, index) => (
                            <div
                              key={index}
                              className={`aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                                selectedImage === image ? 'border-blue-500' : 'border-white/20 hover:border-white/40'
                              }`}
                              onClick={() => setSelectedImage(image)}
                            >
                              <Image
                                src={image.processedUrl}
                                alt={`Vehicle ${index + 1}`}
                                width={200}
                                height={150}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-white/70 text-center py-8">
                          No processed images available for this vehicle
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Panel - Preview */}
                <div className="space-y-6">
                  <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <Eye className="w-5 h-5 mr-2" />
                        Preview - {selectedTemplate.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div 
                        className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden border border-white/20"
                        style={{
                          aspectRatio: selectedTemplate.dimensions.width / selectedTemplate.dimensions.height,
                          maxHeight: '500px'
                        }}
                      >
                        {selectedImage && (
                          <Image
                            src={selectedImage.processedUrl}
                            alt="Selected vehicle"
                            fill
                            className="object-cover"
                          />
                        )}
                        
                        {generatedContent && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                            <h3 className="text-white text-2xl font-bold mb-2">
                              {generatedContent.headline}
                            </h3>
                            <p className="text-white/90 text-lg mb-4">
                              {generatedContent.callToAction}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {generatedContent.hashtags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="text-blue-300 text-sm">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {!selectedImage && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <ImageIcon className="w-16 h-16 text-white/30 mx-auto mb-4" />
                              <p className="text-white/50">Select an image to preview</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {selectedImage && generatedContent && (
                        <div className="mt-6 space-y-3">
                          <Button
                            onClick={downloadTemplate}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Content
                          </Button>

                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant="outline"
                              onClick={() => {
                                if (generatedContent) {
                                  const text = `${generatedContent.headline}\n\n${generatedContent.description}\n\n${generatedContent.callToAction}\n\n${generatedContent.hashtags.join(' ')}`;
                                  navigator.clipboard.writeText(text);
                                }
                              }}
                              className="border-white/30 text-white hover:bg-white/10"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy Text
                            </Button>
                            <Button
                              variant="outline"
                              className="border-white/30 text-white hover:bg-white/10"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Save Draft
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
