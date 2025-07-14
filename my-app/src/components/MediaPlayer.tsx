"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipForward,
  SkipBack,
  Image as ImageIcon,
  Video,
  FileText,
  Trash2,
  RotateCcw,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type { VehicleWithMedia, Media, SlideshowItem } from "@/types";

interface MediaPlayerProps {
  vehicles: VehicleWithMedia[];
  customMedia: Media[];
  onMediaUpdate?: () => void;
}

const MediaPlayer = ({
  vehicles,
  customMedia,
  onMediaUpdate,
}: MediaPlayerProps) => {
  // State management
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [slideshowSpeed, setSlideshowSpeed] = useState(5000); // 5 seconds default
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slideshowRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create slideshow items from vehicles and custom media
  const slideshowItems: SlideshowItem[] = [
    // Custom media first (higher priority)
    ...customMedia.map(
      (media): SlideshowItem => ({
        id: `c-${media.id}`,
        url: media.url,
        type: media.type,
        vehicle: null,
      }),
    ),
    // Vehicle images
    ...vehicles.flatMap((vehicle) =>
      (vehicle.images || []).map(
        (imageUrl, index): SlideshowItem => ({
          id: `v-${vehicle.id}-${index}`,
          url: imageUrl,
          type: "IMAGE" as const,
          vehicle,
        }),
      ),
    ),
  ];

  const currentItem = slideshowItems[currentIndex];

  // Slideshow auto-advance
  useEffect(() => {
    if (isPlaying && slideshowItems.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % slideshowItems.length);
      }, slideshowSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, slideshowItems.length, slideshowSpeed]);

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (file.size > maxSize) {
      toast.error("File size must be less than 50MB");
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        "Only images (JPEG, PNG, WebP) and videos (MP4, WebM) are allowed",
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "type",
        file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
      );

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      setUploadProgress(100);
      toast.success("Media uploaded successfully!");

      // Close dialog and refresh data
      setShowUploadDialog(false);
      onMediaUpdate?.();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Navigation
  const goToPrevious = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + slideshowItems.length) % slideshowItems.length,
    );
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slideshowItems.length);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      slideshowRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Delete custom media
  const deleteCustomMedia = async (mediaId: string) => {
    try {
      const response = await fetch(`/api/media/${mediaId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      toast.success("Media deleted successfully!");
      onMediaUpdate?.();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete media");
    }
  };

  if (slideshowItems.length === 0) {
    return (
      <Card className="w-full h-80 bg-gradient-to-br from-[#2f3136] to-[#36393f] border-gray-700">
        <div className="h-full flex flex-col items-center justify-center text-gray-400">
          <ImageIcon className="w-16 h-16 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Media Available</h3>
          <p className="text-sm text-center mb-6 max-w-md">
            Upload your first media file or add vehicles to your inventory to
            see them here.
          </p>
          <Button
            onClick={() => setShowUploadDialog(true)}
            className="bg-[#5865f2] hover:bg-[#4752c4]"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Media
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full h-80 bg-[#2f3136] border-gray-700 overflow-hidden">
        <div ref={slideshowRef} className="relative h-full group">
          {/* Main Media Display */}
          <div className="relative h-full">
            {currentItem?.type === "VIDEO" ? (
              <video
                key={currentItem.url}
                src={currentItem.url}
                className="w-full h-full object-cover"
                autoPlay
                muted={isMuted}
                loop
              />
            ) : (
              <img
                src={currentItem?.url}
                alt="Slideshow content"
                className="w-full h-full object-cover"
              />
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

            {/* Vehicle Info Overlay (if it's a vehicle image) */}
            {currentItem?.vehicle && (
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="text-lg font-bold">
                  {currentItem.vehicle.year} {currentItem.vehicle.make}{" "}
                  {currentItem.vehicle.model}
                </h3>
                <p className="text-sm text-gray-200">
                  ${currentItem.vehicle.price?.toLocaleString()} •{" "}
                  {currentItem.vehicle.mileage?.toLocaleString()} miles
                </p>
              </div>
            )}

            {/* Control Buttons */}
            <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowSettings(true)}
                className="bg-black/50 border-0 hover:bg-black/70"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowUploadDialog(true)}
                className="bg-black/50 border-0 hover:bg-black/70"
              >
                <Upload className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={toggleFullscreen}
                className="bg-black/50 border-0 hover:bg-black/70"
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Playback Controls */}
            <div className="absolute bottom-4 right-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="secondary"
                onClick={goToPrevious}
                className="bg-black/50 border-0 hover:bg-black/70"
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsPlaying(!isPlaying)}
                className="bg-black/50 border-0 hover:bg-black/70"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={goToNext}
                className="bg-black/50 border-0 hover:bg-black/70"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
              {currentItem?.type === "VIDEO" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsMuted(!isMuted)}
                  className="bg-black/50 border-0 hover:bg-black/70"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Progress Indicator */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
              <div
                className="h-full bg-[#5865f2] transition-all duration-300 ease-linear"
                style={{
                  width: `${((currentIndex + 1) / slideshowItems.length) * 100}%`,
                }}
              />
            </div>

            {/* Delete button for custom media */}
            {currentItem?.id.startsWith("c-") && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() =>
                  deleteCustomMedia(currentItem.id.replace("c-", ""))
                }
                className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600/80 hover:bg-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="bg-[#36393f] border-gray-600 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              Upload Media
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-[#5865f2] bg-[#5865f2]/10"
                  : "border-gray-600 hover:border-gray-500"
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 rounded-full bg-[#5865f2]/20">
                  <Upload className="w-8 h-8 text-[#5865f2]" />
                </div>
                <div>
                  <p className="text-lg font-medium">Drop files here</p>
                  <p className="text-sm text-gray-400 mt-1">
                    or click to browse
                  </p>
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-[#5865f2] hover:bg-[#4752c4]"
                >
                  Choose Files
                </Button>
              </div>
            </div>

            {/* File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* File Info */}
            <div className="text-xs text-gray-400 space-y-1">
              <p>• Supported formats: JPEG, PNG, WebP, MP4, WebM</p>
              <p>• Maximum file size: 50MB</p>
              <p>• Uploaded media will appear in the slideshow</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-[#36393f] border-gray-600 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Slideshow Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Slideshow Speed
              </label>
              <select
                value={slideshowSpeed}
                onChange={(e) => setSlideshowSpeed(Number(e.target.value))}
                className="w-full bg-[#2f3136] border border-gray-600 rounded px-3 py-2"
              >
                <option value={2000}>Fast (2s)</option>
                <option value={5000}>Normal (5s)</option>
                <option value={10000}>Slow (10s)</option>
                <option value={30000}>Very Slow (30s)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Total Items</span>
              <span className="text-sm text-gray-400">
                {slideshowItems.length}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Custom Media</span>
              <span className="text-sm text-gray-400">
                {customMedia.length}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Vehicle Images</span>
              <span className="text-sm text-gray-400">
                {slideshowItems.length - customMedia.length}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MediaPlayer;
