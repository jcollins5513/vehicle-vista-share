'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  Layers, 
  Move, 
  RotateCw, 
  ZoomIn, 
  ZoomOut,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Download,
  Trash2
} from 'lucide-react';
import Image from 'next/image';

interface ContentLayer {
  id: string;
  type: 'background' | 'vehicle' | 'logo' | 'text';
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

interface VisualContentEditorProps {
  canvasWidth?: number;
  canvasHeight?: number;
  onExport?: (dataUrl: string) => void;
}

interface VisualContentEditorRef {
  addLayer: (layer: Omit<ContentLayer, 'id' | 'zIndex'>) => void;
}

export const VisualContentEditor = React.forwardRef<
  VisualContentEditorRef,
  VisualContentEditorProps
>(({ 
  canvasWidth = 1080, 
  canvasHeight = 1080,
  onExport 
}, ref) => {
  const [layers, setLayers] = useState<ContentLayer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

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
      const newLayers = [...prev];
      const index = newLayers.findIndex(layer => layer.id === id);
      if (index === -1) return prev;

      if (direction === 'up' && index < newLayers.length - 1) {
        [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
        newLayers[index].zIndex = index;
        newLayers[index + 1].zIndex = index + 1;
      } else if (direction === 'down' && index > 0) {
        [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]];
        newLayers[index].zIndex = index;
        newLayers[index - 1].zIndex = index - 1;
      }

      return newLayers;
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    setSelectedLayer(layerId);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedLayer) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    updateLayer(selectedLayer, {
      x: Math.max(0, Math.min(canvasWidth - 100, layers.find(l => l.id === selectedLayer)?.x || 0 + deltaX)),
      y: Math.max(0, Math.min(canvasHeight - 100, layers.find(l => l.id === selectedLayer)?.y || 0 + deltaY))
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, selectedLayer, dragStart, canvasWidth, canvasHeight, layers, updateLayer]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const exportCanvas = useCallback(async () => {
    if (!canvasRef.current) return;

    // Create a canvas element for export
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Sort layers by zIndex
    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    // Draw each layer
    for (const layer of sortedLayers) {
      if (!layer.visible) continue;

      ctx.save();
      ctx.globalAlpha = layer.opacity;
      
      // Apply transformations
      ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-layer.width / 2, -layer.height / 2);

      if (layer.type === 'text' && layer.content) {
        // Draw text
        ctx.fillStyle = 'white';
        ctx.font = `${layer.height}px Arial`;
        ctx.fillText(layer.content, 0, layer.height);
      } else if (layer.url) {
        // Draw image
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

    // Export as data URL
    const dataUrl = canvas.toDataURL('image/png');
    onExport?.(dataUrl);

    // Download the image
    const link = document.createElement('a');
    link.download = 'content-creation.png';
    link.href = dataUrl;
    link.click();
  }, [layers, canvasWidth, canvasHeight, onExport]);

  const selectedLayerData = selectedLayer ? layers.find(l => l.id === selectedLayer) : null;

  // Expose addLayer function via ref
  React.useImperativeHandle(ref, () => ({
    addLayer
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Canvas */}
      <div className="lg:col-span-2">
        <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span className="flex items-center">
                <Layers className="w-5 h-5 mr-2" />
                Visual Editor
              </span>
              <Button
                onClick={exportCanvas}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={canvasRef}
              className="relative bg-white rounded-lg overflow-hidden cursor-crosshair"
              style={{ width: canvasWidth / 2, height: canvasHeight / 2 }}
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
                      left: layer.x / 2,
                      top: layer.y / 2,
                      width: layer.width / 2,
                      height: layer.height / 2,
                      transform: `rotate(${layer.rotation}deg)`,
                      opacity: layer.opacity,
                      zIndex: layer.zIndex,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, layer.id)}
                  >
                    {layer.type === 'text' && layer.content ? (
                      <div
                        className="text-white font-bold text-center flex items-center justify-center h-full"
                        style={{ fontSize: layer.height / 4 }}
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

      {/* Controls */}
      <div className="space-y-6">
        {/* Layer List */}
        <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-lg">Layers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
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

              {/* Rotation */}
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

              {/* Opacity */}
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
});

VisualContentEditor.displayName = 'VisualContentEditor';

// Export the addLayer function for external use
export type { ContentLayer, VisualContentEditorRef };