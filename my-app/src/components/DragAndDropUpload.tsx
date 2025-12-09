'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DragAndDropUploadProps {
  onFilesDrop: (files: FileList) => void;
  multiple?: boolean;
  accept?: string;
  disabled?: boolean;
  isUploading?: boolean;
  className?: string;
  children?: React.ReactNode;
  uploadText?: string;
  uploadSubtext?: string;
  showPreview?: boolean;
}

export function DragAndDropUpload({
  onFilesDrop,
  multiple = true,
  accept = "image/*",
  disabled = false,
  isUploading = false,
  className,
  children,
  uploadText = "Drop files here or click to upload",
  uploadSubtext = "Supports multiple images (JPG, PNG, WebP)",
  showPreview = false
}: DragAndDropUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    if (dragCounter <= 1) {
      setIsDragOver(false);
    }
  }, [dragCounter]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFilesDrop(files);
    }
  }, [disabled, isUploading, onFilesDrop]);

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, isUploading]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesDrop(e.target.files);
    }
  }, [onFilesDrop]);

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
      
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "flex items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200",
          "border-border bg-card/80 hover:border-accent hover:bg-accent/5",
          {
            "cursor-not-allowed opacity-70": disabled || isUploading,
            "border-accent bg-accent/10 scale-[1.01]": isDragOver && !disabled && !isUploading,
          }
        )}
        style={{
          minHeight: children ? 'auto' : '128px'
        }}
      >
        {children || (
          <div className="text-center p-6">
            {isUploading ? (
              <Loader2 className="w-8 h-8 mx-auto mb-2 text-primary animate-spin" />
            ) : (
              <Upload className="w-8 h-8 mx-auto mb-2 text-primary" />
            )}
            <p className="text-foreground text-sm font-medium">
              {isUploading ? 'Uploading...' : uploadText}
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              {uploadSubtext}
            </p>
            {isDragOver && !disabled && !isUploading && (
              <div className="mt-2 p-2 bg-accent/10 rounded border border-accent/30">
                <p className="text-foreground text-xs">Drop files here to upload</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
