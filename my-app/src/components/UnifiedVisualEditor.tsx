'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { DragAndDropUpload } from './DragAndDropUpload';
import Image from 'next/image';
import type { Vehicle } from '@/types';


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
  isMarketingAsset?: boolean;
}



interface ProcessedImage {
  originalUrl: string;
  processedUrl: string;
  processedAt: Date;
  status: string;
  imageIndex: number;
  isMarketingAsset?: boolean;
  category?: string;
}

interface UnifiedVisualEditorProps {
  selectedVehicle: Vehicle;
  vehicleImages: ProcessedImage[];
  assets: Asset[];
  allVehicles?: Vehicle[];
  allProcessedImages?: { [stockNumber: string]: ProcessedImage[] };
  onContentGenerated?: (content: any) => void;
  onAssetsUploaded?: (assets: { originalUrl: string; processedUrl?: string; name: string; isMarketingAsset?: boolean; category?: string }[]) => void;
  onVehicleSelect?: (vehicle: Vehicle) => void;
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
  allVehicles = [],
  allProcessedImages = {},
  onContentGenerated,
  onAssetsUploaded,
  onVehicleSelect
}: UnifiedVisualEditorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [layers, setLayers] = useState<ContentLayer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null>(null);
  const [manualAssets, setManualAssets] = useState<ManualAsset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  
  // Asset upload states
  const [uploadedAssets, setUploadedAssets] = useState<Array<{
    id: string;
    file: File;
    originalUrl: string;
    processedUrl?: string;
    status: 'uploaded' | 'processing' | 'completed' | 'failed';
    isMarketingAsset?: boolean;
    category?: string;
  }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [assetCategory, setAssetCategory] = useState<string>('general');
  const [markAsMarketingAsset, setMarkAsMarketingAsset] = useState<boolean>(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Add asset with choice between original and processed versions
  const addAssetWithChoice = (asset: Asset | ManualAsset) => {
    const originalUrl = 'url' in asset ? asset.url : asset.originalUrl;
    const processedUrl = 'processedUrl' in asset ? asset.processedUrl : undefined;
    const name = 'fileName' in asset ? asset.fileName : asset.name;
    
    if (processedUrl) {
      // Show choice dialog
      const choice = confirm(`Asset "${name}" has both original and background-removed versions.\n\nClick OK to use the background-removed version, or Cancel to use the original.`);
      
      addLayer({
        type: 'asset',
        name: `Asset: ${name}`,
        url: choice ? processedUrl : originalUrl,
        x: canvasWidth * 0.05,
        y: canvasHeight * 0.05,
        width: canvasWidth * 0.2,
        height: canvasHeight * 0.15,
        rotation: 0,
        opacity: 1,
        visible: true
      });
    } else {
      // Only original version available
      addLayer({
        type: 'asset',
        name: `Asset: ${name}`,
        url: originalUrl,
        x: canvasWidth * 0.05,
        y: canvasHeight * 0.05,
        width: canvasWidth * 0.2,
        height: canvasHeight * 0.15,
        rotation: 0,
        opacity: 1,
        visible: true
      });
    }
  };

  // Handle manual asset upload
  const handleManualAssetUpload = async (files: FileList) => {
    const newAssets: ManualAsset[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const assetId = `asset-${Date.now()}-${i}`;
      
      // Determine if this is likely a background asset based on filename and content
      const isLikelyBackground = file.name.toLowerCase().includes('background') || 
                                file.name.toLowerCase().includes('bg') ||
                                file.name.toLowerCase().includes('scene') ||
                                file.name.toLowerCase().includes('texture');
      
      const asset: ManualAsset = {
        id: assetId,
        file,
        originalUrl: URL.createObjectURL(file),
        status: isLikelyBackground ? 'completed' : 'uploaded', // Background assets are ready immediately
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
      // Use the improved background removal utility with fallback
      const { removeBackground, simpleBackgroundRemoval } = await import('@/utils/removeBackground');
      let processedBlob: Blob;
      
      try {
        // Try the main background removal first
        processedBlob = await removeBackground(asset.file);
      } catch (mainError) {
        console.warn('Main background removal failed, trying simple fallback:', mainError);
        
        // If main method fails, try simple fallback
        try {
          processedBlob = await simpleBackgroundRemoval(asset.file);
        } catch (fallbackError) {
          console.error('Both background removal methods failed:', fallbackError);
          throw new Error('Background removal failed. Please try with a different image or use the image as-is.');
        }
      }
      
      const processedUrl = URL.createObjectURL(processedBlob);
      
      setManualAssets(prev => prev.map(a => 
        a.id === assetId ? { ...a, processedUrl, status: 'completed' } : a
      ));

    } catch (error) {
      console.error('Background removal failed:', error);
      setManualAssets(prev => prev.map(a => 
        a.id === assetId ? { ...a, status: 'failed' } : a
      ));
      
      // Show user-friendly error message
      alert(`Background removal failed for ${asset.name}. You can still save the original image.`);
    }
  };

  // Helper function to get blob from any URL type
  const getBlobFromUrl = async (url: string): Promise<Blob> => {
    if (url.startsWith('data:')) {
      // Handle data URLs
      const response = await fetch(url);
      return await response.blob();
    } else if (url.startsWith('blob:')) {
      // Handle blob URLs
      const response = await fetch(url);
      return await response.blob();
    } else {
      // Handle regular HTTP URLs - use proxy to avoid CORS issues
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image via proxy: ${response.status} ${response.statusText}`);
      }
      
      return await response.blob();
    }
  };

  // Background removal for uploaded assets
  const handleUploadedAssetBackgroundRemoval = async (assetId: string) => {
    const asset = uploadedAssets.find(a => a.id === assetId);
    if (!asset) return;

    setUploadedAssets(prev => prev.map(a => 
      a.id === assetId ? { ...a, status: 'processing' } : a
    ));

    try {
      // Use the improved background removal utility with fallback
      const { removeBackground, simpleBackgroundRemoval } = await import('@/utils/removeBackground');
      let processedBlob: Blob;
      
      try {
        // Try the main background removal first
        processedBlob = await removeBackground(asset.file);
      } catch (mainError) {
        console.warn('Main background removal failed, trying simple fallback:', mainError);
        
        // If main method fails, try simple fallback
        try {
          processedBlob = await simpleBackgroundRemoval(asset.file);
        } catch (fallbackError) {
          console.error('Both background removal methods failed:', fallbackError);
          throw new Error('Background removal failed. Please try with a different image or use the image as-is.');
        }
      }
      
      const processedUrl = URL.createObjectURL(processedBlob);
      
      setUploadedAssets(prev => prev.map(a => 
        a.id === assetId ? { ...a, processedUrl, status: 'completed' } : asset
      ));

    } catch (error) {
      console.error('Background removal failed:', error);
      setUploadedAssets(prev => prev.map(a => 
        a.id === assetId ? { ...a, status: 'failed' } : asset
      ));
      
      // Show user-friendly error message
      alert(`Background removal failed for ${asset.file.name}. You can still save the original image.`);
    }
  };

  // Handle file upload for asset library
  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} is not an image file`);
          continue;
        }

        const assetId = `asset-${Date.now()}-${Math.random()}`;
        const originalUrl = URL.createObjectURL(file);

        // Add to uploaded assets
        const newAsset = {
          id: assetId,
          file,
          originalUrl,
          status: 'uploaded' as const,
          isMarketingAsset: markAsMarketingAsset,
          category: assetCategory
        };

        setUploadedAssets(prev => [...prev, newAsset]);

        // Only process for background removal if it's NOT a background asset
        if (assetCategory !== 'backgrounds') {
          try {
            setUploadedAssets(prev => prev.map(asset => 
              asset.id === assetId ? { ...asset, status: 'processing' } : asset
            ));

            // Use the improved background removal utility with fallback
            const { removeBackground, simpleBackgroundRemoval } = await import('@/utils/removeBackground');
            let processedBlob: Blob;
            
            try {
              // Try the main background removal first
              processedBlob = await removeBackground(file);
            } catch (mainError) {
              console.warn('Main background removal failed, trying simple fallback:', mainError);
              
              // If main method fails, try simple fallback
              try {
                processedBlob = await simpleBackgroundRemoval(file);
              } catch (fallbackError) {
                console.error('Both background removal methods failed:', fallbackError);
                throw new Error('Background removal failed. Please try with a different image or use the image as-is.');
              }
            }
            
            const processedUrl = URL.createObjectURL(processedBlob);
            
            setUploadedAssets(prev => prev.map(asset => 
              asset.id === assetId ? { ...asset, processedUrl, status: 'completed' } : asset
            ));
          } catch (error) {
            console.error('Background removal failed:', error);
            setUploadedAssets(prev => prev.map(asset => 
              asset.id === assetId ? { ...asset, status: 'failed' } : asset
            ));
            
            // Show user-friendly error message
            alert(`Background removal failed for ${file.name}. The asset will be saved without background removal.`);
          }
        } else {
          // For background assets, mark as completed immediately (no background removal needed)
          setUploadedAssets(prev => prev.map(asset => 
            asset.id === assetId ? { ...asset, status: 'completed' } : asset
          ));
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  // Save asset to library
  const saveAssetToLibrary = async (asset: typeof uploadedAssets[0]) => {
    // For background assets or failed background removal, we can save the original
    if (!asset.processedUrl && asset.category !== 'backgrounds' && asset.status !== 'failed') {
      alert('Asset must be processed before saving to library');
      return;
    }

    try {
      // Upload original
      const originalFormData = new FormData();
      const originalBlob = await getBlobFromUrl(asset.originalUrl);
      originalFormData.append('file', originalBlob, asset.file.name);
      originalFormData.append('category', asset.category || 'general');
      originalFormData.append('isMarketingAsset', (asset.isMarketingAsset || false).toString());

      await fetch('/api/assets/upload', {
        method: 'POST',
        body: originalFormData
      });

      // Upload processed if available
      if (asset.processedUrl) {
        const processedFormData = new FormData();
        const processedBlob = await getBlobFromUrl(asset.processedUrl);
        const processedName = asset.file.name.replace(/\.[^/.]+$/, '_processed.png');
        processedFormData.append('file', processedBlob, processedName);
        processedFormData.append('category', asset.category || 'general');
        processedFormData.append('isMarketingAsset', (asset.isMarketingAsset || false).toString());

        await fetch('/api/assets/upload', {
          method: 'POST',
          body: processedFormData
        });
      }

      // Remove from uploaded assets
      setUploadedAssets(prev => prev.filter(a => a.id !== asset.id));
      
      // Notify parent component
      if (onAssetsUploaded) {
        onAssetsUploaded([{
          originalUrl: asset.originalUrl,
          processedUrl: asset.processedUrl || undefined,
          name: asset.file.name,
          isMarketingAsset: asset.isMarketingAsset,
          category: asset.category
        }]);
      }

      alert(`Asset "${asset.file.name}" saved to library!`);
    } catch (error) {
      console.error('Error saving asset to library:', error);
      alert('Failed to save asset to library');
    }
  };

  // Remove asset from upload queue
  const removeAsset = (assetId: string) => {
    setUploadedAssets(prev => prev.filter(asset => asset.id !== assetId));
  };

  // Save manual asset to library
  const saveManualAssetToLibrary = async (asset: ManualAsset) => {
    try {
      // Upload original version
      const originalFormData = new FormData();
      originalFormData.append('file', asset.file);
      
      // Determine category based on filename
      let category = 'general';
      if (asset.name.toLowerCase().includes('background') || asset.name.toLowerCase().includes('bg') || asset.name.toLowerCase().includes('scene')) {
        category = 'backgrounds';
      } else if (asset.name.toLowerCase().includes('logo')) {
        category = 'logos';
      } else if (asset.name.toLowerCase().includes('badge')) {
        category = 'badges';
      }
      
      originalFormData.append('category', category);
      originalFormData.append('isMarketingAsset', 'true');
      originalFormData.append('version', 'original');

      await fetch('/api/assets/upload', {
        method: 'POST',
        body: originalFormData
      });

      // Upload processed version if available
      if (asset.processedUrl) {
        const processedFormData = new FormData();
        const processedBlob = await getBlobFromUrl(asset.processedUrl);
        const processedName = asset.name.replace(/\.[^/.]+$/, '_processed.png');
        processedFormData.append('file', processedBlob, processedName);
        processedFormData.append('category', category);
        processedFormData.append('isMarketingAsset', 'true');
        processedFormData.append('version', 'processed');

        await fetch('/api/assets/upload', {
          method: 'POST',
          body: processedFormData
        });
      }

      // Remove from manual assets
      setManualAssets(prev => prev.filter(a => a.id !== asset.id));
      
      // Notify parent component
      if (onAssetsUploaded) {
        onAssetsUploaded([{
          originalUrl: asset.originalUrl,
          processedUrl: asset.processedUrl,
          name: asset.name,
          isMarketingAsset: true,
          category: category
        }]);
      }

      alert(`Asset "${asset.name}" saved to library with ${asset.processedUrl ? 'both original and processed versions' : 'original version'}!`);
    } catch (error) {
      console.error('Error saving manual asset to library:', error);
      alert('Failed to save asset to library');
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

  const handleResizeStart = useCallback((e: React.MouseEvent, handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging && !isResizing || !selectedLayer) return;

    const currentLayer = layers.find(l => l.id === selectedLayer);
    if (!currentLayer) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    // Calculate scale factor (canvas is displayed at 50% size)
    const scaleFactor = 2;

    if (isDragging) {
      // Unrestricted movement - allow going beyond canvas boundaries
      const newX = currentLayer.x + (deltaX * scaleFactor);
      const newY = currentLayer.y + (deltaY * scaleFactor);

      updateLayer(selectedLayer, {
        x: newX,
        y: newY
      });
    } else if (isResizing && resizeHandle) {
      // Handle resizing with no padding restrictions
      const updates: Partial<ContentLayer> = {};
      
      switch (resizeHandle) {
        case 'nw':
          updates.x = currentLayer.x + (deltaX * scaleFactor);
          updates.y = currentLayer.y + (deltaY * scaleFactor);
          updates.width = Math.max(10, currentLayer.width - (deltaX * scaleFactor));
          updates.height = Math.max(10, currentLayer.height - (deltaY * scaleFactor));
          break;
        case 'ne':
          updates.y = currentLayer.y + (deltaY * scaleFactor);
          updates.width = Math.max(10, currentLayer.width + (deltaX * scaleFactor));
          updates.height = Math.max(10, currentLayer.height - (deltaY * scaleFactor));
          break;
        case 'sw':
          updates.x = currentLayer.x + (deltaX * scaleFactor);
          updates.width = Math.max(10, currentLayer.width - (deltaX * scaleFactor));
          updates.height = Math.max(10, currentLayer.height + (deltaY * scaleFactor));
          break;
        case 'se':
          updates.width = Math.max(10, currentLayer.width + (deltaX * scaleFactor));
          updates.height = Math.max(10, currentLayer.height + (deltaY * scaleFactor));
          break;
        case 'n':
          updates.y = currentLayer.y + (deltaY * scaleFactor);
          updates.height = Math.max(10, currentLayer.height - (deltaY * scaleFactor));
          break;
        case 's':
          updates.height = Math.max(10, currentLayer.height + (deltaY * scaleFactor));
          break;
        case 'e':
          updates.width = Math.max(10, currentLayer.width + (deltaX * scaleFactor));
          break;
        case 'w':
          updates.x = currentLayer.x + (deltaX * scaleFactor);
          updates.width = Math.max(10, currentLayer.width - (deltaX * scaleFactor));
          break;
      }

      updateLayer(selectedLayer, updates);
    }

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, isResizing, selectedLayer, dragStart, resizeHandle, canvasWidth, canvasHeight, layers, updateLayer]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  const selectedLayerData = selectedLayer ? layers.find(l => l.id === selectedLayer) : null;

  // Get background assets from S3
  const backgroundAssets = assets.filter(asset => 
    asset.category === 'backgrounds' || asset.fileName.toLowerCase().includes('background')
  );

  // Get marketing assets (logos, badges, etc.) - prioritize marked marketing assets
  const marketingAssets = assets.filter(asset => 
    asset.isMarketingAsset || 
    asset.category === 'logos' || 
    asset.category === 'badges' || 
    asset.category === 'overlays' ||
    asset.category === 'textures' ||
    asset.fileName.toLowerCase().includes('logo') ||
    asset.fileName.toLowerCase().includes('badge') ||
    asset.fileName.toLowerCase().includes('sale')
  );

     // Get all assets by category for better organization
   const assetsByCategory = {
     backgrounds: assets.filter(asset => asset.category === 'backgrounds'),
     logos: assets.filter(asset => asset.category === 'logos'),
     badges: assets.filter(asset => asset.category === 'badges'),
     marketing: assets.filter(asset => asset.isMarketingAsset)
   };

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
                   className="relative bg-white rounded-lg cursor-crosshair"
                   style={{ 
                     width: Math.min(600, canvasWidth / 2), 
                     height: Math.min(600, canvasHeight / 2),
                     aspectRatio: `${canvasWidth}/${canvasHeight}`,
                     overflow: 'visible'
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
                         {/* Resize handles - only show when selected */}
                         {selectedLayer === layer.id && (
                           <>
                             {/* Corner handles */}
                             <div
                               className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-nw-resize -top-1.5 -left-1.5"
                               onMouseDown={(e) => handleResizeStart(e, 'nw')}
                             />
                             <div
                               className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-ne-resize -top-1.5 -right-1.5"
                               onMouseDown={(e) => handleResizeStart(e, 'ne')}
                             />
                             <div
                               className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-sw-resize -bottom-1.5 -left-1.5"
                               onMouseDown={(e) => handleResizeStart(e, 'sw')}
                             />
                             <div
                               className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-se-resize -bottom-1.5 -right-1.5"
                               onMouseDown={(e) => handleResizeStart(e, 'se')}
                             />
                             
                             {/* Edge handles */}
                             <div
                               className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-n-resize -top-1.5 left-1/2 transform -translate-x-1/2"
                               onMouseDown={(e) => handleResizeStart(e, 'n')}
                             />
                             <div
                               className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-s-resize -bottom-1.5 left-1/2 transform -translate-x-1/2"
                               onMouseDown={(e) => handleResizeStart(e, 's')}
                             />
                             <div
                               className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-e-resize top-1/2 transform -translate-y-1/2 -right-1.5"
                               onMouseDown={(e) => handleResizeStart(e, 'e')}
                             />
                             <div
                               className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-w-resize top-1/2 transform -translate-y-1/2 -left-1.5"
                               onMouseDown={(e) => handleResizeStart(e, 'w')}
                             />
                           </>
                         )}
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
                    <TabsList className="flex flex-wrap w-full bg-white/10 gap-1 p-1">
                      <TabsTrigger value="backgrounds" className="data-[state=active]:bg-gray-500/20 text-gray-300 text-xs flex-1 min-w-0 border-gray-500/30">
                        Backgrounds
                      </TabsTrigger>
                      <TabsTrigger value="marketing" className="data-[state=active]:bg-orange-500/20 text-orange-300 text-xs flex-1 min-w-0 border-orange-500/30">
                        Marketing
                      </TabsTrigger>
                      <TabsTrigger value="logos" className="data-[state=active]:bg-purple-500/20 text-purple-300 text-xs flex-1 min-w-0 border-purple-500/30">
                        Logos
                      </TabsTrigger>
                      <TabsTrigger value="badges" className="data-[state=active]:bg-yellow-500/20 text-yellow-300 text-xs flex-1 min-w-0 border-yellow-500/30">
                        Badges
                      </TabsTrigger>
                      <TabsTrigger value="manual" className="data-[state=active]:bg-blue-500/20 text-blue-300 text-xs border-blue-500/30 flex-1 min-w-0">
                        Manual
                      </TabsTrigger>
                      <TabsTrigger value="vehicles" className="data-[state=active]:bg-green-500/20 text-green-300 text-xs border-green-500/30 flex-1 min-w-0">
                        Vehicles
                      </TabsTrigger>
                    </TabsList>
                  
                                     <TabsContent value="backgrounds" className="space-y-2 max-h-60 overflow-y-auto">
                     {assetsByCategory.backgrounds.map((asset) => (
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
                  
                  <TabsContent value="marketing" className="space-y-2 max-h-60 overflow-y-auto">
                    {assetsByCategory.marketing.length > 0 ? (
                      assetsByCategory.marketing.map((asset) => (
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
                          <div className="flex-1">
                            <span className="text-white text-sm truncate">{asset.fileName}</span>
                            <div className="flex gap-1 mt-1">
                              <Badge variant="outline" className="text-xs bg-green-500/20 text-green-300 border-green-500/30">
                                Marketing
                              </Badge>
                              {asset.category && (
                                <Badge variant="outline" className="text-xs">
                                  {asset.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-white/70 text-sm text-center py-4">
                        No marketing assets available. Upload assets and mark them for future marketing use.
                      </p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="logos" className="space-y-2 max-h-60 overflow-y-auto">
                    {assetsByCategory.logos.map((asset) => (
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
                  </TabsContent>
                  
                  <TabsContent value="badges" className="space-y-2 max-h-60 overflow-y-auto">
                    {assetsByCategory.badges.map((asset) => (
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
                  </TabsContent>
                  
                  
                  
                                     <TabsContent value="vehicles" className="space-y-2 max-h-60 overflow-y-auto">
                     {allVehicles
                       .filter(vehicle => {
                         const vehicleImages = allProcessedImages[vehicle.stockNumber] || [];
                         return vehicleImages.length > 0; // Only show vehicles with processed images
                       })
                       .map((vehicle) => {
                         const vehicleImages = allProcessedImages[vehicle.stockNumber] || [];
                         return (
                           <div key={vehicle.stockNumber} className="space-y-2">
                             <div className="flex items-center gap-2 p-2 rounded bg-green-500/10 border border-green-500/20">
                               <span className="text-green-300 text-sm font-medium">
                                 {vehicle.year} {vehicle.make} {vehicle.model}
                               </span>
                               <span className="text-green-300/70 text-xs">
                                 ({vehicleImages.length} processed)
                               </span>
                               {selectedVehicle.stockNumber === vehicle.stockNumber && (
                                 <Badge variant="outline" className="text-xs bg-green-500/20 text-green-300 border-green-500/30">
                                   Current
                                 </Badge>
                               )}
                             </div>
                             <div className="grid grid-cols-3 gap-1 ml-4">
                               {vehicleImages.slice(0, 3).map((image, index) => (
                                 <div
                                   key={index}
                                   className="flex items-center gap-1 p-1 rounded bg-white/5 hover:bg-white/10 cursor-pointer"
                                   onClick={() => {
                                     if (onVehicleSelect) {
                                       onVehicleSelect(vehicle);
                                     }
                                     addVehicleImage(image);
                                   }}
                                 >
                                   <Image
                                     src={image.processedUrl}
                                     alt={`${vehicle.stockNumber} - Image ${index + 1}`}
                                     width={30}
                                     height={30}
                                     className="rounded object-cover"
                                   />
                                   <span className="text-white text-xs">#{index + 1}</span>
                                 </div>
                               ))}
                             </div>
                           </div>
                         );
                       })}
                     {allVehicles.filter(vehicle => {
                       const vehicleImages = allProcessedImages[vehicle.stockNumber] || [];
                       return vehicleImages.length === 0;
                     }).length > 0 && (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground text-xs">
                          Some vehicles have no processed images yet
                        </p>
                      </div>
                     )}
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
                         className="flex items-center justify-center w-full h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted"
                       >
                         <div className="text-center">
                           <Upload className="w-6 h-6 mx-auto mb-1 text-primary" />
                           <p className="text-foreground text-xs">Upload Marketing Assets</p>
                         </div>
                       </label>
                     </div>
                     
                     {/* Manual Assets List */}
                     <div className="space-y-2 max-h-40 overflow-y-auto">
                       {manualAssets.map((asset) => (
                         <div key={asset.id} className="flex items-center gap-2 p-2 bg-white/5 rounded">
                           <div className="flex gap-1">
                             {/* Show both versions if available */}
                             <Image
                               src={asset.originalUrl}
                               alt={`${asset.name} (Original)`}
                               width={30}
                               height={30}
                               className="rounded object-cover border border-white/20"
                               title="Original version"
                             />
                             {asset.processedUrl && (
                               <Image
                                 src={asset.processedUrl}
                                 alt={`${asset.name} (Processed)`}
                                 width={30}
                                 height={30}
                                 className="rounded object-cover border border-green-500/50"
                                 title="Background removed version"
                               />
                             )}
                           </div>
                           <div className="flex-1 min-w-0">
                             <p className="text-white text-xs truncate">{asset.name}</p>
                             <p className="text-white/70 text-xs capitalize">{asset.status}</p>
                             {asset.processedUrl && (
                               <p className="text-green-400 text-xs">✓ Both versions available</p>
                             )}
                           </div>
                           
                           {/* Show appropriate action based on asset type and status */}
                           {asset.status === 'completed' && (
                             <Button
                               onClick={() => saveManualAssetToLibrary(asset)}
                               size="sm"
                               className="h-6 text-xs bg-green-600 hover:bg-green-700"
                             >
                               Save Both
                             </Button>
                           )}
                           {asset.status === 'uploaded' && (
                             <Button
                               onClick={() => handleAssetBackgroundRemoval(asset.id)}
                               size="sm"
                               className="h-6 text-xs bg-purple-600 hover:bg-purple-700"
                             >
                               <Scissors className="w-3 h-3" />
                               Remove BG
                             </Button>
                           )}
                           {asset.status === 'processing' && (
                             <div className="flex items-center gap-1 text-xs text-blue-300">
                               <Loader2 className="w-3 h-3 animate-spin" />
                               Processing...
                             </div>
                           )}
                           {asset.status === 'failed' && (
                             <Button
                               onClick={() => saveManualAssetToLibrary(asset)}
                               size="sm"
                               className="h-6 text-xs bg-orange-600 hover:bg-orange-700"
                               title="Save without background removal"
                             >
                               Save Original
                             </Button>
                           )}
                           
                           {/* Add to canvas button */}
                           {asset.status === 'completed' && (
                             <Button
                               onClick={() => addAssetWithChoice(asset)}
                               size="sm"
                               className="h-6 text-xs bg-blue-600 hover:bg-blue-700"
                               title="Add to canvas"
                             >
                               Add
                             </Button>
                           )}
                           
                           <Button
                             onClick={() => setManualAssets(prev => prev.filter(a => a.id !== asset.id))}
                             size="sm"
                             variant="ghost"
                             className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                           >
                             <Trash2 className="w-3 h-3" />
                           </Button>
                         </div>
                       ))}
                     </div>
                   </TabsContent>
                  
                  <TabsContent value="library" className="space-y-4">
                    {/* Asset Upload Section */}
                    <div className="space-y-3">
                      <DragAndDropUpload
                        onFilesDrop={handleFileUpload}
                        multiple={true}
                        accept="image/*"
                        className="h-16"
                        uploadText="Upload Assets"
                        uploadSubtext="Drag & drop or click to upload"
                      />
                      
                      {/* Asset Options */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-white text-xs">Category</Label>
                          <Select value={assetCategory} onValueChange={setAssetCategory}>
                            <SelectTrigger className="w-full bg-white/10 border-white/20 text-white text-xs">
                              <SelectValue placeholder="Choose category..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="logos">Logos & Branding</SelectItem>
                              <SelectItem value="backgrounds">Backgrounds</SelectItem>
                              <SelectItem value="badges">Badges & Icons</SelectItem>
                              <SelectItem value="textures">Textures & Patterns</SelectItem>
                              <SelectItem value="overlays">Overlays & Effects</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 text-white text-xs">
                            <input
                              type="checkbox"
                              checked={markAsMarketingAsset}
                              onChange={(e) => setMarkAsMarketingAsset(e.target.checked)}
                              className="rounded"
                            />
                            Mark for Marketing
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    {/* Uploaded Assets List */}
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {uploadedAssets.length === 0 ? (
                        <p className="text-white/70 text-sm text-center py-4">
                          No assets uploaded yet
                        </p>
                      ) : (
                        uploadedAssets.map((asset) => (
                          <div key={asset.id} className="flex items-center gap-2 p-2 bg-white/5 rounded">
                            <Image
                              src={asset.processedUrl || asset.originalUrl}
                              alt={asset.file.name}
                              width={30}
                              height={30}
                              className="rounded object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs truncate">{asset.file.name}</p>
                              <div className="flex gap-1 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {asset.status}
                                </Badge>
                                {asset.isMarketingAsset && (
                                  <Badge variant="outline" className="text-xs bg-green-500/20 text-green-300 border-green-500/30">
                                    Marketing
                                  </Badge>
                                )}
                                {asset.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {asset.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                                                         <div className="flex gap-1">
                               {/* Show appropriate action based on asset type and status */}
                               {asset.status === 'completed' && (
                                 <Button
                                   onClick={() => saveAssetToLibrary(asset)}
                                   size="sm"
                                   className="h-6 text-xs bg-green-600 hover:bg-green-700"
                                 >
                                   Save to Library
                                 </Button>
                               )}
                               {asset.status === 'uploaded' && asset.category !== 'backgrounds' && (
                                 <Button
                                   onClick={() => handleUploadedAssetBackgroundRemoval(asset.id)}
                                   size="sm"
                                   className="h-6 text-xs bg-purple-600 hover:bg-purple-700"
                                 >
                                   <Scissors className="w-3 h-3 mr-1" />
                                   Remove BG
                                 </Button>
                               )}
                               {asset.status === 'processing' && (
                                 <div className="flex items-center gap-1 text-xs text-blue-300">
                                   <Loader2 className="w-3 h-3 animate-spin" />
                                   Processing...
                                 </div>
                               )}
                               {asset.status === 'failed' && (
                                 <Button
                                   onClick={() => saveAssetToLibrary(asset)}
                                   size="sm"
                                   className="h-6 text-xs bg-orange-600 hover:bg-orange-700"
                                   title="Save without background removal"
                                 >
                                   Save Original
                                 </Button>
                               )}
                               <Button
                                 onClick={() => removeAsset(asset.id)}
                                 size="sm"
                                 variant="ghost"
                                 className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                               >
                                 <Trash2 className="w-3 h-3" />
                               </Button>
                             </div>
                          </div>
                        ))
                      )}
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
                        min={10}
                        max={canvasWidth * 2}
                        step={1}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-white text-xs">Height</Label>
                      <Slider
                        value={[selectedLayerData.height]}
                        onValueChange={([value]) => updateLayer(selectedLayerData.id, { height: value })}
                        min={10}
                        max={canvasHeight * 2}
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