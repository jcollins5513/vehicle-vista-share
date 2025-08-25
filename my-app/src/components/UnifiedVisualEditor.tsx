'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Layers, 
  Download,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Trash2,
  Wand2,
  Share2,
  Loader2,
  Upload,
  Instagram,
  Facebook,
  FileText,
  Palette,
  Scissors
} from 'lucide-react';
import Image from 'next/image';


interface ContentLayer {
  id: string;
  type: 'background' | 'vehicle' | 'asset' | 'text';
  name: string;
  url?: string;
  content?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  visible: boolean;
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

interface Asset {
  key: string;
  url: string;
  fileName: string;
  category: string;
  lastModified?: Date;
  size?: number;
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

interface ProcessedImage {
  originalUrl: string;
  processedUrl: string;
  processedAt: string;
  status: string;
  imageIndex: number;
}

interface UnifiedVisualEditorProps {
  selectedVehicle: Vehicle;
  vehicleImages: ProcessedImage[];
  assets: Asset[];
  onContentGenerated?: (content: any) => void;
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

interface ManualAsset {
  id: string;
  file: File;
  originalUrl: string;
  processedUrl?: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  name: string;
}

export function UnifiedVisualEditor({ 
  selectedVehicle, 
  vehicleImages, 
  assets,
  onContentGenerated 
}: UnifiedVisualEditorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [layers, setLayers] = useState<ContentLayer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [manualAssets, setManualAssets] = useState<ManualAsset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const canvasWidth = selectedTemplate?.dimensions.width || 1080;
  const canvasHeight = selectedTemplate?.dimensions.height || 1080;

  const addLayer = useCallback((layer: Omit<ContentLayer, 'id' | 'zIndex'>) => {
    const newLayer: ContentLayer = {
      ...layer,
      id: `layer-${Date.now()}`,
      zIndex: layers.length
    };
    setLayers(prev => [...prev, newLayer]);
  }, [layers.length]);

  const updateLayer = useCallback((id: string, updates: Partial<ContentLayer>) => {
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, ...updates } : layer
    ));
  }, []);

  const deleteLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== id));
    if (selectedLayer === id) {
      setSelectedLayer(null);
    }
  }, [selectedLayer]);

  const moveLayer = useCallback((id: string, direction: 'up' | 'down') => {
    setLayers(prev => {
      const currentLayer = prev.find(layer => layer.id === id);
      if (!currentLayer) return prev;

      const newLayers = [...prev];
      
      if (direction === 'up') {
        // Move layer up (increase zIndex)
        const maxZIndex = Math.max(...newLayers.map(l => l.zIndex));
        if (currentLayer.zIndex < maxZIndex) {
          // Find the layer with the next higher zIndex
          const nextLayer = newLayers.find(l => l.zIndex === currentLayer.zIndex + 1);
          if (nextLayer) {
            // Swap zIndex values
            const tempZIndex = currentLayer.zIndex;
            currentLayer.zIndex = nextLayer.zIndex;
            nextLayer.zIndex = tempZIndex;
          }
        }
      } else if (direction === 'down') {
        // Move layer down (decrease zIndex)
        const minZIndex = Math.min(...newLayers.map(l => l.zIndex));
        if (currentLayer.zIndex > minZIndex) {
          // Find the layer with the next lower zIndex
          const prevLayer = newLayers.find(l => l.zIndex === currentLayer.zIndex - 1);
          if (prevLayer) {
            // Swap zIndex values
            const tempZIndex = currentLayer.zIndex;
            currentLayer.zIndex = prevLayer.zIndex;
            prevLayer.zIndex = tempZIndex;
          }
        }
      }

      return newLayers;
    });
  }, []);

  // Template selection handler
  const handleTemplateSelect = (template: ContentTemplate) => {
    setSelectedTemplate(template);
    // Clear existing layers when changing template
    setLayers([]);
    setSelectedLayer(null);
  };

  // Add background from S3 assets
  const addBackground = (asset: Asset) => {
    addLayer({
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

  // Add vehicle image
  const addVehicleImage = (image: ProcessedImage) => {
    addLayer({
      type: 'vehicle',
      name: `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`,
      url: image.processedUrl,
      x: canvasWidth * 0.1,
      y: canvasHeight * 0.1,
      width: canvasWidth * 0.8,
      height: canvasHeight * 0.6,
      rotation: 0,
      opacity: 1,
      visible: true
    });
  };

  // Add marketing asset (logo, badge, etc.)
  const addMarketingAsset = (asset: Asset | ManualAsset) => {
    const url = 'url' in asset ? asset.url : asset.processedUrl || asset.originalUrl;
    const name = 'fileName' in asset ? asset.fileName : asset.name;
    
    addLayer({
      type: 'asset',
      name: `Asset: ${name}`,
      url,
      x: canvasWidth * 0.05,
      y: canvasHeight * 0.05,
      width: canvasWidth * 0.2,
      height: canvasHeight * 0.15,
      rotation: 0,
      opacity: 1,
      visible: true
    });
  };

  // Handle manual asset upload
  const handleManualAssetUpload = async (files: FileList) => {
    const newAssets: ManualAsset[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const assetId = `asset-${Date.now()}-${i}`;
      
      const asset: ManualAsset = {
        id: assetId,
        file,
        originalUrl: URL.createObjectURL(file),
        status: 'uploaded',
        name: file.name
      };

      newAssets.push(asset);
    }

    setManualAssets(prev => [...prev, ...newAssets]);
  };

  // Background removal for manual assets
  const handleAssetBackgroundRemoval = async (assetId: string) => {
    const asset = manualAssets.find(a => a.id === assetId);
    if (!asset) return;

    setManualAssets(prev => prev.map(a => 
      a.id === assetId ? { ...a, status: 'processing' } : a
    ));

    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const response = await fetch(asset.originalUrl);
      const blob = await response.blob();
      const processedBlob = await removeBackground(blob);
      const processedUrl = URL.createObjectURL(processedBlob);
      
      setManualAssets(prev => prev.map(a => 
        a.id === assetId ? { ...a, processedUrl, status: 'completed' } : a
      ));

    } catch (error) {
      console.error('Background removal failed:', error);
      setManualAssets(prev => prev.map(a => 
        a.id === assetId ? { ...a, status: 'failed' } : a
      ));
    }
  };

  // Generate AI content
  const generateContent = async () => {
    if (!selectedTemplate) {
      alert('Please select a template first');
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
          templateType: selectedTemplate.type,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setGeneratedContent(data.content);
        onContentGenerated?.(data.content);
        
        // Add text layers for generated content
        addLayer({
          type: 'text',
          name: 'Headline',
          content: data.content.headline,
          x: canvasWidth * 0.1,
          y: canvasHeight * 0.8,
          width: canvasWidth * 0.8,
          height: canvasHeight * 0.1,
          rotation: 0,
          opacity: 1,
          visible: true
        });

        addLayer({
          type: 'text',
          name: 'Call to Action',
          content: data.content.callToAction,
          x: canvasWidth * 0.1,
          y: canvasHeight * 0.9,
          width: canvasWidth * 0.8,
          height: canvasHeight * 0.05,
          rotation: 0,
          opacity: 1,
          visible: true
        });
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

  // Export canvas
  const exportCanvas = useCallback(async () => {
    if (!canvasRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of sortedLayers) {
      if (!layer.visible) continue;

      ctx.save();
      ctx.globalAlpha = layer.opacity;
      
      ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-layer.width / 2, -layer.height / 2);

      if (layer.type === 'text' && layer.content) {
        ctx.fillStyle = 'white';
        ctx.font = `${layer.height}px Arial`;
        ctx.fillText(layer.content, 0, layer.height);
      } else if (layer.url) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, 0, 0, layer.width, layer.height);
            resolve(null);
          };
          img.src = layer.url!;
        });
      }

      ctx.restore();
    }

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${selectedVehicle.stockNumber}-${selectedTemplate?.name || 'content'}.png`;
    link.href = dataUrl;
    link.click();
  }, [layers, canvasWidth, canvasHeight, selectedVehicle, selectedTemplate]);

  // Mouse handlers for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    setSelectedLayer(layerId);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedLayer) return;

    const currentLayer = layers.find(l => l.id === selectedLayer);
    if (!currentLayer) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    // Calculate scale factor (canvas is displayed at 50% size)
    const scaleFactor = 2;

    const newX = Math.max(0, Math.min(canvasWidth - currentLayer.width, currentLayer.x + (deltaX * scaleFactor)));
    const newY = Math.max(0, Math.min(canvasHeight - currentLayer.height, currentLayer.y + (deltaY * scaleFactor)));

    updateLayer(selectedLayer, {
      x: newX,
      y: newY
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, selectedLayer, dragStart, canvasWidth, canvasHeight, layers, updateLayer]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const selectedLayerData = selectedLayer ? layers.find(l => l.id === selectedLayer) : null;

  // Get background assets from S3
  const backgroundAssets = assets.filter(asset => 
    asset.category === 'backgrounds' || asset.fileName.toLowerCase().includes('background')
  );

  // Get marketing assets (logos, badges, etc.)
  const marketingAssets = assets.filter(asset => 
    asset.category === 'logos' || 
    asset.category === 'badges' || 
    asset.category === 'text' ||
    asset.fileName.toLowerCase().includes('logo') ||
    asset.fileName.toLowerCase().includes('badge') ||
    asset.fileName.toLowerCase().includes('sale')
  );

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      {!selectedTemplate && (
        <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Palette className="w-5 h-5 mr-2" />
              Choose Template
            </CardTitle>
            <CardDescription className="text-white/70">
              Select a template for {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {contentTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer transition-all hover:scale-105 bg-gradient-to-br from-white/10 to-white/5 border-white/20 hover:border-white/40"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-lg bg-gradient-to-r ${template.bgColor} flex items-center justify-center`}>
                      {template.icon}
                    </div>
                    <h3 className="text-white font-medium mb-1">{template.name}</h3>
                    <p className="text-white/70 text-xs mb-2">{template.description}</p>
                    <Badge variant="outline" className="text-xs">
                      {template.dimensions.width} × {template.dimensions.height}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visual Editor */}
      {selectedTemplate && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Canvas */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center">
                    <Layers className="w-5 h-5 mr-2" />
                    {selectedTemplate.name}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setSelectedTemplate(null)}
                      size="sm"
                      variant="outline"
                    >
                      Change Template
                    </Button>
                    <Button
                      onClick={exportCanvas}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  ref={canvasRef}
                  className="relative bg-white rounded-lg overflow-hidden cursor-crosshair"
                  style={{ 
                    width: Math.min(600, canvasWidth / 2), 
                    height: Math.min(600, canvasHeight / 2),
                    aspectRatio: `${canvasWidth}/${canvasHeight}`
                  }}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {layers
                    .sort((a, b) => a.zIndex - b.zIndex)
                    .map((layer) => (
                      <div
                        key={layer.id}
                        className={`absolute cursor-move ${
                          selectedLayer === layer.id ? 'ring-2 ring-blue-500' : ''
                        } ${!layer.visible ? 'opacity-50' : ''}`}
                        style={{
                          left: (layer.x / canvasWidth) * 100 + '%',
                          top: (layer.y / canvasHeight) * 100 + '%',
                          width: (layer.width / canvasWidth) * 100 + '%',
                          height: (layer.height / canvasHeight) * 100 + '%',
                          transform: `rotate(${layer.rotation}deg)`,
                          opacity: layer.opacity,
                          zIndex: layer.zIndex,
                        }}
                        onMouseDown={(e) => handleMouseDown(e, layer.id)}
                      >
                        {layer.type === 'text' && layer.content ? (
                          <div
                            className="text-white font-bold text-center flex items-center justify-center h-full bg-black/50 rounded"
                            style={{ fontSize: '0.8rem' }}
                          >
                            {layer.content}
                          </div>
                        ) : layer.url ? (
                          <Image
                            src={layer.url}
                            alt={layer.name}
                            fill
                            className="object-contain"
                            draggable={false}
                          />
                        ) : null}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Asset Panels */}
          <div className="lg:col-span-2 space-y-6">
            {/* Layer Management */}
            <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">Layers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                {layers.length === 0 ? (
                  <p className="text-white/70 text-sm">No layers added yet</p>
                ) : (
                  layers
                    .sort((a, b) => b.zIndex - a.zIndex)
                    .map((layer) => (
                      <div
                        key={layer.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                          selectedLayer === layer.id
                            ? 'bg-blue-500/20 border border-blue-500/50'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                        onClick={() => setSelectedLayer(layer.id)}
                      >
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateLayer(layer.id, { visible: !layer.visible });
                          }}
                          className="p-1 h-6 w-6"
                        >
                          {layer.visible ? (
                            <Eye className="w-3 h-3 text-white" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-white/50" />
                          )}
                        </Button>
                        
                        <span className="text-white text-sm flex-1 truncate">
                          {layer.name}
                        </span>
                        
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayer(layer.id, 'up');
                            }}
                            className="p-1 h-6 w-6"
                          >
                            <ArrowUp className="w-3 h-3 text-white" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayer(layer.id, 'down');
                            }}
                            className="p-1 h-6 w-6"
                          >
                            <ArrowDown className="w-3 h-3 text-white" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteLayer(layer.id);
                            }}
                            className="p-1 h-6 w-6 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>

            {/* Asset Selection Tabs */}
            <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">Add Assets</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="backgrounds" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 bg-white/10">
                    <TabsTrigger value="backgrounds" className="data-[state=active]:bg-white/20 text-white text-xs">
                      Backgrounds
                    </TabsTrigger>
                    <TabsTrigger value="vehicles" className="data-[state=active]:bg-white/20 text-white text-xs">
                      Vehicles
                    </TabsTrigger>
                    <TabsTrigger value="assets" className="data-[state=active]:bg-white/20 text-white text-xs">
                      Marketing
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="data-[state=active]:bg-white/20 text-white text-xs">
                      Manual
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="backgrounds" className="space-y-2 max-h-60 overflow-y-auto">
                    {backgroundAssets.map((asset) => (
                      <div
                        key={asset.key}
                        className="flex items-center gap-2 p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
                        onClick={() => addBackground(asset)}
                      >
                        <Image
                          src={asset.url}
                          alt={asset.fileName}
                          width={40}
                          height={40}
                          className="rounded object-cover"
                        />
                        <span className="text-white text-sm truncate">{asset.fileName}</span>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="vehicles" className="space-y-2 max-h-60 overflow-y-auto">
                    {vehicleImages.map((image, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
                        onClick={() => addVehicleImage(image)}
                      >
                        <Image
                          src={image.processedUrl}
                          alt="Vehicle"
                          width={40}
                          height={40}
                          className="rounded object-cover"
                        />
                        <span className="text-white text-sm">Image {index + 1}</span>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="assets" className="space-y-2 max-h-60 overflow-y-auto">
                    {marketingAssets.map((asset) => (
                      <div
                        key={asset.key}
                        className="flex items-center gap-2 p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
                        onClick={() => addMarketingAsset(asset)}
                      >
                        <Image
                          src={asset.url}
                          alt={asset.fileName}
                          width={40}
                          height={40}
                          className="rounded object-cover"
                        />
                        <span className="text-white text-sm truncate">{asset.fileName}</span>
                      </div>
                    ))}
                    
                    {manualAssets.filter(a => a.status === 'completed').map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center gap-2 p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
                        onClick={() => addMarketingAsset(asset)}
                      >
                        <Image
                          src={asset.processedUrl!}
                          alt={asset.name}
                          width={40}
                          height={40}
                          className="rounded object-cover"
                        />
                        <div className="flex-1">
                          <span className="text-white text-sm truncate">{asset.name}</span>
                          <Badge variant="outline" className="ml-2 text-xs">Manual</Badge>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="manual" className="space-y-4">
                    {/* Manual Asset Upload */}
                    <div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handleManualAssetUpload(e.target.files)}
                        className="hidden"
                        id="manual-asset-upload"
                      />
                      <label
                        htmlFor="manual-asset-upload"
                        className="flex items-center justify-center w-full h-20 border-2 border-dashed border-white/30 rounded-lg cursor-pointer hover:bg-white/10"
                      >
                        <div className="text-center">
                          <Upload className="w-6 h-6 mx-auto mb-1 text-white" />
                          <p className="text-white text-xs">Upload Marketing Assets</p>
                        </div>
                      </label>
                    </div>
                    
                    {/* Manual Assets List */}
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {manualAssets.map((asset) => (
                        <div key={asset.id} className="flex items-center gap-2 p-2 bg-white/5 rounded">
                          <Image
                            src={asset.processedUrl || asset.originalUrl}
                            alt={asset.name}
                            width={30}
                            height={30}
                            className="rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs truncate">{asset.name}</p>
                            <p className="text-white/70 text-xs capitalize">{asset.status}</p>
                          </div>
                          {asset.status === 'uploaded' && (
                            <Button
                              onClick={() => handleAssetBackgroundRemoval(asset.id)}
                              size="sm"
                              className="h-6 text-xs bg-purple-600 hover:bg-purple-700"
                            >
                              <Scissors className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Layer Properties */}
            {selectedLayerData && (
              <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Properties</CardTitle>
                  <CardDescription className="text-white/70">
                    {selectedLayerData.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Position */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-white text-xs">X Position</Label>
                      <Slider
                        value={[selectedLayerData.x]}
                        onValueChange={([value]) => updateLayer(selectedLayerData.id, { x: value })}
                        max={canvasWidth - selectedLayerData.width}
                        step={1}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-white text-xs">Y Position</Label>
                      <Slider
                        value={[selectedLayerData.y]}
                        onValueChange={([value]) => updateLayer(selectedLayerData.id, { y: value })}
                        max={canvasHeight - selectedLayerData.height}
                        step={1}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Size */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-white text-xs">Width</Label>
                      <Slider
                        value={[selectedLayerData.width]}
                        onValueChange={([value]) => updateLayer(selectedLayerData.id, { width: value })}
                        min={50}
                        max={canvasWidth}
                        step={1}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-white text-xs">Height</Label>
                      <Slider
                        value={[selectedLayerData.height]}
                        onValueChange={([value]) => updateLayer(selectedLayerData.id, { height: value })}
                        min={50}
                        max={canvasHeight}
                        step={1}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Rotation & Opacity */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-white text-xs">Rotation</Label>
                      <Slider
                        value={[selectedLayerData.rotation]}
                        onValueChange={([value]) => updateLayer(selectedLayerData.id, { rotation: value })}
                        min={-180}
                        max={180}
                        step={1}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-white text-xs">Opacity</Label>
                      <Slider
                        value={[selectedLayerData.opacity]}
                        onValueChange={([value]) => updateLayer(selectedLayerData.id, { opacity: value })}
                        min={0}
                        max={1}
                        step={0.01}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generate Content */}
            <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">Generate Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={generateContent}
                  disabled={isGenerating}
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
                    <div className="p-3 bg-white/5 rounded text-sm">
                      <p className="text-white font-medium mb-1">Generated Content:</p>
                      <p className="text-white/80 text-xs mb-2">{generatedContent.headline}</p>
                      <p className="text-white/70 text-xs">{generatedContent.callToAction}</p>
                    </div>
                    <Button
                      onClick={() => alert('Social media publishing integration would go here')}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Publish to Social Media
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}