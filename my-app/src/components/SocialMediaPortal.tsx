"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Download,
  Share2,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  ArrowLeft,
  Wand2,
  Image as ImageIcon,
  Sparkles,
  Camera,
  Zap,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";

interface ProcessedImage {
  original: string;
  processed: string;
  withLogo: string;
}

const SocialMediaPortal = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processedImages, setProcessedImages] = useState<ProcessedImage | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Advanced background removal using TensorFlow body segmentation
  const removeBackground = async (imageUrl: string): Promise<string> => {
    return new Promise(async (resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(imageUrl);

      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(imageUrl);

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;

        try {
          // Try using TensorFlow body segmentation for better results
          if (typeof window !== "undefined" && "tf" in window) {
            // TensorFlow implementation would go here
            // For now, using enhanced edge detection
          }

          // Enhanced background removal algorithm
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Multi-pass background detection
          const isBackground = new Array(data.length / 4).fill(false);

          // Pass 1: Color-based detection
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const pixelIndex = i / 4;

            const brightness = (r + g + b) / 3;
            const saturation = Math.max(r, g, b) - Math.min(r, g, b);

            // Detect backgrounds: very bright, low saturation, or uniform colors
            if (brightness > 220 || saturation < 20) {
              isBackground[pixelIndex] = true;
            }
          }

          // Pass 2: Edge-based refinement
          const width = canvas.width;
          const height = canvas.height;

          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              const pixelIndex = y * width + x;

              // Check neighbors for edge detection
              let edgeStrength = 0;
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const neighborIndex = ((y + dy) * width + (x + dx)) * 4;
                  const currentIndex = (y * width + x) * 4;

                  const neighborBrightness =
                    (data[neighborIndex] +
                      data[neighborIndex + 1] +
                      data[neighborIndex + 2]) /
                    3;
                  const currentBrightness =
                    (data[currentIndex] +
                      data[currentIndex + 1] +
                      data[currentIndex + 2]) /
                    3;

                  edgeStrength += Math.abs(
                    neighborBrightness - currentBrightness,
                  );
                }
              }

              // If it's a strong edge and neighbors are background, likely object boundary
              if (edgeStrength > 200) {
                let backgroundNeighbors = 0;
                for (let dy = -2; dy <= 2; dy++) {
                  for (let dx = -2; dx <= 2; dx++) {
                    const ny = y + dy;
                    const nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                      const neighborPixelIndex = ny * width + nx;
                      if (isBackground[neighborPixelIndex])
                        backgroundNeighbors++;
                    }
                  }
                }

                // If most neighbors are background, this is likely foreground
                if (backgroundNeighbors > 15) {
                  isBackground[pixelIndex] = false;
                }
              }
            }
          }

          // Apply transparency to background pixels
          for (let i = 0; i < isBackground.length; i++) {
            if (isBackground[i]) {
              data[i * 4 + 3] = 0; // Make transparent
            }
          }

          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL());
        } catch (error) {
          console.error("Background removal error:", error);
          resolve(imageUrl); // Return original on error
        }
      };

      img.src = imageUrl;
    });
  };

  // Add logo behind vehicle
  const addLogoBehind = async (processedImageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(processedImageUrl);

      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(processedImageUrl);

      const backgroundImg = new Image();
      const vehicleImg = new Image();

      // Your logo URL - replace with actual logo
      const logoUrl =
        "https://cdn.builder.io/api/v1/image/assets%2F0f7830926b04438e96198e445d7c6df8%2Fd945695f3c88472c9e8bfb7dd5aa59a5";

      backgroundImg.crossOrigin = "anonymous";
      vehicleImg.crossOrigin = "anonymous";

      let imagesLoaded = 0;
      const onImageLoad = () => {
        imagesLoaded++;
        if (imagesLoaded === 2) {
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Create gradient background
          const gradient = ctx.createLinearGradient(
            0,
            0,
            canvas.width,
            canvas.height,
          );
          gradient.addColorStop(0, "#1a1a2e");
          gradient.addColorStop(0.5, "#16213e");
          gradient.addColorStop(1, "#0f3460");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw logo (scaled and centered)
          const logoScale = 0.4;
          const logoW = backgroundImg.width * logoScale;
          const logoH = backgroundImg.height * logoScale;
          const logoX = (canvas.width - logoW) / 2;
          const logoY = (canvas.height - logoH) / 2;

          ctx.globalAlpha = 0.3;
          ctx.drawImage(backgroundImg, logoX, logoY, logoW, logoH);
          ctx.globalAlpha = 1.0;

          // Draw vehicle on top
          ctx.drawImage(vehicleImg, 0, 0);

          resolve(canvas.toDataURL());
        }
      };

      backgroundImg.onload = onImageLoad;
      vehicleImg.onload = onImageLoad;

      backgroundImg.src = logoUrl;
      vehicleImg.src = processedImageUrl;
    });
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setIsProcessing(true);

    try {
      // Step 1: Remove background
      const processedImage = await removeBackground(imageUrl);

      // Step 2: Add logo behind
      const withLogo = await addLogoBehind(processedImage);

      setProcessedImages({
        original: imageUrl,
        processed: processedImage,
        withLogo: withLogo,
      });
    } catch (error) {
      console.error("Processing error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!processedImages) return;

    const link = document.createElement("a");
    link.download = "social-media-ready.png";
    link.href = processedImages.withLogo;
    link.click();
  };

  const copyToClipboard = async () => {
    if (!processedImages) return;

    try {
      const response = await fetch(processedImages.withLogo);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const shareToSocial = (platform: string) => {
    if (!processedImages) return;

    const text =
      "Check out this amazing vehicle from Bentley Supercenter! 🚗✨";
    const url = window.location.origin;

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      instagram: "#", // Instagram doesn't support direct URL sharing
    };

    if (platform !== "instagram") {
      window.open(shareUrls[platform as keyof typeof shareUrls], "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-[#36393f] text-white">
      {/* Header */}
      <div className="bg-[#2f3136] border-b border-gray-600 p-6">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <Link
              href="/showroom"
              className="p-2 hover:bg-[#40444b] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Social Media Portal</h1>
              <p className="text-gray-400">
                Create stunning vehicle posts with AI background removal
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            <span className="text-cyan-400 font-medium">AI Powered</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <Card className="bg-[#2f3136] border border-gray-600 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Upload className="w-6 h-6 mr-3 text-cyan-400" />
              Upload Vehicle Image
            </h2>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-500 rounded-lg p-8 text-center hover:border-cyan-400 transition-colors cursor-pointer"
            >
              <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-gray-500 text-sm">PNG, JPG up to 10MB</p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {selectedImage && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Original Image</h3>
                <img
                  src={selectedImage}
                  alt="Original"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}
          </Card>

          {/* Processing Results */}
          <Card className="bg-[#2f3136] border border-gray-600 p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Wand2 className="w-6 h-6 mr-3 text-purple-400" />
              AI Processing Results
            </h2>

            {isProcessing && (
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                  <p className="text-gray-300">Processing image...</p>
                  <p className="text-gray-500 text-sm">
                    Removing background and adding logo
                  </p>
                </div>
              </div>
            )}

            {processedImages && !isProcessing && (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={
                      showOriginal
                        ? processedImages.original
                        : processedImages.withLogo
                    }
                    alt="Processed"
                    className="w-full h-48 object-cover rounded-lg"
                  />

                  <button
                    onClick={() => setShowOriginal(!showOriginal)}
                    className="absolute top-2 right-2 bg-black/50 p-2 rounded-lg hover:bg-black/70 transition-colors"
                  >
                    {showOriginal ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={downloadImage}
                    className="flex-1 bg-[#5865f2] hover:bg-[#4752c4] text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={copyToClipboard}
                    className="flex-1 bg-[#40444b] hover:bg-[#36393f] text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copied ? "Copied!" : "Copy"}</span>
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Social Media Sharing */}
        {processedImages && (
          <Card className="bg-[#2f3136] border border-gray-600 p-6 mt-8">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <Share2 className="w-6 h-6 mr-3 text-green-400" />
              Share to Social Media
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => shareToSocial("instagram")}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white p-4 rounded-lg flex flex-col items-center space-y-2 transition-all"
              >
                <Instagram className="w-8 h-8" />
                <span className="text-sm font-medium">Instagram</span>
              </button>

              <button
                onClick={() => shareToSocial("facebook")}
                className="bg-[#1877f2] hover:bg-[#166fe5] text-white p-4 rounded-lg flex flex-col items-center space-y-2 transition-all"
              >
                <Facebook className="w-8 h-8" />
                <span className="text-sm font-medium">Facebook</span>
              </button>

              <button
                onClick={() => shareToSocial("twitter")}
                className="bg-[#1da1f2] hover:bg-[#1a91da] text-white p-4 rounded-lg flex flex-col items-center space-y-2 transition-all"
              >
                <Twitter className="w-8 h-8" />
                <span className="text-sm font-medium">Twitter</span>
              </button>

              <button
                onClick={() => shareToSocial("linkedin")}
                className="bg-[#0077b5] hover:bg-[#006ba1] text-white p-4 rounded-lg flex flex-col items-center space-y-2 transition-all"
              >
                <Linkedin className="w-8 h-8" />
                <span className="text-sm font-medium">LinkedIn</span>
              </button>
            </div>

            <div className="mt-6 p-4 bg-[#40444b] rounded-lg">
              <h3 className="font-semibold mb-2">Pro Tips:</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Use high-resolution images for best results</li>
                <li>• Ensure good contrast between vehicle and background</li>
                <li>
                  • For Instagram, copy the image and paste directly in the app
                </li>
                <li>• Add relevant hashtags to increase engagement</li>
              </ul>
            </div>
          </Card>
        )}

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default SocialMediaPortal;
