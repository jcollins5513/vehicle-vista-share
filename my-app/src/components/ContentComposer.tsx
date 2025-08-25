'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Car, 
  Image as ImageIcon, 
  Type,
  Wand2,
  Share2,
  Loader2
} from 'lucide-react';
import Image from 'next/image';
import { VisualContentEditor, type ContentLayer, type VisualContentEditorRef } from './VisualContentEditor';
import { ManualVehicleUpload } from './ManualVehicleUpload';

interface Asset {
  key: string;
  url: string;
  fileName: string;
  category: string;
  lastModified?: Date;
  size?: number;
}

interface ProcessedImage {
  originalUrl: string;
  processedUrl: string;
  processedAt: string;
  status: string;
  imageIndex: number;
}

interface Vehicle {
  id: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  color?: string;
  price?: number;
  mileage?: number;
  features: string[];
}

interface ManualVehicle {
  id: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  color?: string;
  price?: number;
  mileage?: number;
  features: string[];
  originalImageUrl: string;
  processedImageUrl?: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
}

interface ContentComposerProps {
  assets: Asset[];
  processedImages: { [stockNumber: string]: ProcessedImage[] };
  vehicles: Vehicle[];
  selectedTemplate: {
    id: string;
    name: string;
    dimensions: { width: number; height: number };
  } | null;
}

export function ContentComposer({ 
  assets, 
  processedImages, 
  vehicles, 
  selectedTemplate 
}: ContentComposerProps) {
  const [manualVehicles, setManualVehicles] = useState<ManualVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | ManualVehicle | null>(null);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const editorRef = useRef<VisualContentEditorRef>(null);

  const canvasWidth = selectedTemplate?.dimensions.width || 1080;
  const canvasHeight = selectedTemplate?.dimensions.height || 1080;

  const handleManualVehicleProcessed = (vehicle: ManualVehicle) => {
    setManualVehicles(prev => {
      const existing = prev.find(v => v.id === vehicle.id);
      if (existing) {
        return prev.map(v => v.id === vehicle.id ? vehicle : v);
      }
      return [...prev, vehicle];
    });
  };

  const addBackgroundLayer = (asset: Asset) => {
    if (!editorRef.current) return;
    
    editorRef.current.addLayer({
      type: 'background',
      name: `Background: ${asset.fileName}`,
      url: asset.url,
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      rotation: 0,
      opacity: 1,
      visible: true
    });
  };

  const addVehicleLayer = (imageUrl: string, vehicleName: string) => {
    if (!editorRef.current) return;
    
    editorRef.current.addLayer({
      type: 'vehicle',
      name: `Vehicle: ${vehicleName}`,
      url: imageUrl,
      x: canvasWidth * 0.1,
      y: canvasHeight * 0.1,
      width: canvasWidth * 0.8,
      height: canvasHeight * 0.6,
      rotation: 0,
      opacity: 1,
      visible: true
    });
  };

  const addLogoLayer = (asset: Asset) => {
    if (!editorRef.current) return;
    
    editorRef.current.addLayer({
      type: 'logo',
      name: `Logo: ${asset.fileName}`,
      url: asset.url,
      x: canvasWidth * 0.05,
      y: canvasHeight * 0.05,
      width: canvasWidth * 0.2,
      height: canvasHeight * 0.1,
      rotation: 0,
      opacity: 1,
      visible: true
    });
  };

  const addTextLayer = (text: string, name: string) => {
    if (!editorRef.current) return;
    
    editorRef.current.addLayer({
      type: 'text',
      name: `Text: ${name}`,
      content: text,
      x: canvasWidth * 0.1,
      y: canvasHeight * 0.8,
      width: canvasWidth * 0.8,
      height: canvasHeight * 0.1,
      rotation: 0,
      opacity: 1,
      visible: true
    });
  };

  const generateContent = async () => {
    if (!selectedVehicle) {
      alert('Please select a vehicle first');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/content-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleData: selectedVehicle,
          templateType: selectedTemplate?.id.includes('instagram') ? 'instagram' : 'facebook',
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setGeneratedContent(data.content);
        
        // Add text layers for generated content
        addTextLayer(data.content.headline, 'Headline');
        addTextLayer(data.content.callToAction, 'Call to Action');
      } else {
        throw new Error(data.error || 'Failed to generate content');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      alert(`Content generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const publishToFacebook = async (imageDataUrl: string) => {
    // This would integrate with Facebook API
    console.log('Publishing to Facebook:', { imageDataUrl, generatedContent });
    alert('Facebook publishing would be implemented here with the Facebook Graph API');
  };

  // Get background assets
  const backgroundAssets = assets.filter(asset => 
    asset.category === 'backgrounds' || asset.category === 'manual-uploads'
  );

  // Get logo assets
  const logoAssets = assets.filter(asset => 
    asset.category === 'logos' || asset.fileName.toLowerCase().includes('logo')
  );

  // Get all available vehicles (existing + manual)
  const allVehicles = [
    ...vehicles.map(v => ({ ...v, type: 'existing' as const })),
    ...manualVehicles.map(v => ({ ...v, type: 'manual' as const }))
  ];

  return (
    <div className="space-y-6">
      {!selectedTemplate && (
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 backdrop-blur-xl border-yellow-500/20">
          <CardContent className="text-center py-8">
            <Palette className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h3 className="text-yellow-200 text-xl font-bold mb-2">Select a Template First</h3>
            <p className="text-yellow-100/70">Choose a template from the Templates tab to start creating content</p>
          </CardContent>
        </Card>
      )}

      {selectedTemplate && (
        <>
          {/* Content Editor */}
          <VisualContentEditor
            ref={editorRef}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            onExport={(dataUrl) => {
              // Auto-publish to Facebook if content is generated
              if (generatedContent) {
                publishToFacebook(dataUrl);
              }
            }}
          />

          {/* Asset Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Backgrounds */}
            <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center">
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Backgrounds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {backgroundAssets.length === 0 ? (
                  <p className="text-white/70 text-sm">No background assets available</p>
                ) : (
                  backgroundAssets.map((asset) => (
                    <div
                      key={asset.key}
                      className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer"
                      onClick={() => addBackgroundLayer(asset)}
                    >
                      <Image
                        src={asset.url}
                        alt={asset.fileName}
                        width={40}
                        height={40}
                        className="rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {asset.fileName}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {asset.category}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Vehicles */}
            <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center">
                  <Car className="w-5 h-5 mr-2" />
                  Vehicles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Tabs defaultValue="existing" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-white/10">
                    <TabsTrigger value="existing" className="data-[state=active]:bg-white/20 text-white">
                      Existing
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="data-[state=active]:bg-white/20 text-white">
                      Manual
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="existing" className="space-y-2">
                    {Object.entries(processedImages).map(([stockNumber, images]) => {
                      const vehicle = vehicles.find(v => v.stockNumber === stockNumber);
                      if (!vehicle || images.length === 0) return null;
                      
                      return (
                        <div
                          key={stockNumber}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                            selectedVehicle?.stockNumber === stockNumber
                              ? 'bg-blue-500/20 border border-blue-500/50'
                              : 'bg-white/5 hover:bg-white/10'
                          }`}
                          onClick={() => {
                            setSelectedVehicle(vehicle);
                            addVehicleLayer(
                              images[0].processedUrl,
                              `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                            );
                          }}
                        >
                          <Image
                            src={images[0].processedUrl}
                            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                            width={40}
                            height={40}
                            className="rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </p>
                            <p className="text-white/70 text-xs">
                              Stock: {stockNumber}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    
                    {manualVehicles.filter(v => v.status === 'completed').map((vehicle) => (
                      <div
                        key={vehicle.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                          selectedVehicle?.id === vehicle.id
                            ? 'bg-blue-500/20 border border-blue-500/50'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                        onClick={() => {
                          setSelectedVehicle(vehicle);
                          if (vehicle.processedImageUrl) {
                            addVehicleLayer(
                              vehicle.processedImageUrl,
                              `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                            );
                          }
                        }}
                      >
                        <Image
                          src={vehicle.processedImageUrl || vehicle.originalImageUrl}
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                          width={40}
                          height={40}
                          className="rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-white/70 text-xs">
                              {vehicle.stockNumber}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              Manual
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="manual">
                    <ManualVehicleUpload onVehicleProcessed={handleManualVehicleProcessed} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Logos & Actions */}
            <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">Logos & Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Logos */}
                <div className="space-y-2">
                  <h4 className="text-white text-sm font-medium">Logos</h4>
                  {logoAssets.length === 0 ? (
                    <p className="text-white/70 text-xs">No logo assets available</p>
                  ) : (
                    logoAssets.map((asset) => (
                      <div
                        key={asset.key}
                        className="flex items-center gap-2 p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
                        onClick={() => addLogoLayer(asset)}
                      >
                        <Image
                          src={asset.url}
                          alt={asset.fileName}
                          width={30}
                          height={30}
                          className="rounded object-cover"
                        />
                        <span className="text-white text-xs truncate">
                          {asset.fileName}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Content Generation */}
                <div className="space-y-2">
                  <Button
                    onClick={generateContent}
                    disabled={isGenerating || !selectedVehicle}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4 mr-2" />
                    )}
                    Generate AI Content
                  </Button>

                  {generatedContent && (
                    <div className="space-y-2">
                      <div className="p-2 bg-white/5 rounded text-xs">
                        <p className="text-white font-medium">Generated:</p>
                        <p className="text-white/70">{generatedContent.headline}</p>
                      </div>
                      <Button
                        onClick={() => publishToFacebook('')}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Publish to Facebook
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}