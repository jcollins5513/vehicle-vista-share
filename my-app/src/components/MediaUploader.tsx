"use client";

import React, { useCallback, useRef, useState } from "react";
import { Media } from "@prisma/client";
import { AlertCircle, CheckCircle, Upload } from "lucide-react";

interface MediaUploaderProps {
  vehicleId?: string | null; // if provided, saves media to that vehicle; otherwise to general playlist
  onUploaded?: (media: Omit<Media, 'id' | 'createdAt' | 'updatedAt' | 'vehicleId' | 'order' | 'mediaType'> & { url: string; key: string }) => void; // callback after persistence
  accept?: string; // default: images and mp4
  multiple?: boolean;
}

export default function MediaUploader({
  vehicleId = null,
  onUploaded,
  accept = "image/*,video/mp4",
  multiple = false,
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadFile = useCallback(
    (file: File) => {
      return new Promise<void>((resolve, reject) => {
        setUploadStatus('uploading');
        setUploadProgress(0);
        setErrorMessage(null);

        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const newMedia = JSON.parse(xhr.responseText);
            setUploadStatus('success');
            onUploaded?.({ url: newMedia.url, key: newMedia.key, ...newMedia });
            // Reset after a short delay to allow user to see success message
            setTimeout(() => {
              setUploadStatus('idle');
            }, 3000);
            resolve();
          } else {
            let errorText = 'Upload failed';
            try {
              const errorJson = JSON.parse(xhr.responseText);
              errorText = errorJson.error || errorText;
              } catch {
              // response is not json
              errorText = xhr.responseText || errorText;
            }
            setErrorMessage(errorText);
            setUploadStatus('error');
            reject(new Error(errorText));
          }
        };

        xhr.onerror = () => {
          setErrorMessage('Upload failed due to a network error.');
          setUploadStatus('error');
          reject(new Error('Network error'));
        };

        const formData = new FormData();
        formData.append("file", file);
        if (vehicleId) {
          formData.append("vehicleId", vehicleId);
        }

        xhr.open("POST", "/api/upload", true);
        xhr.send(formData);
      });
    },
    [onUploaded, vehicleId]
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (uploadStatus === 'uploading') return; // Prevent multiple uploads at once
      
      setUploadStatus('idle'); // Reset status for new batch of files
      setErrorMessage(null);

      // Show total count if multiple files
      const totalFiles = files.length;
      const fileArray = Array.from(files);
      
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        try {
          // If multiple files, show which file is being processed
          if (multiple && totalFiles > 1) {
            console.log(`Uploading file ${i + 1} of ${totalFiles}: ${file.name}`);
          }
          
          await uploadFile(file);
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err);
          // Stop processing further files on the first error
          break; 
        }
      }
    },
    [uploadFile, uploadStatus, multiple]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer?.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDragEnter = () => setDragActive(true);
  const onDragLeave = () => setDragActive(false);

  return (
    <div className="space-y-3">
      <div
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-md p-6 transition-colors ${
          uploadStatus === 'uploading' 
            ? 'opacity-60 cursor-not-allowed border-gray-300' 
            : dragActive 
              ? 'border-blue-500 bg-blue-50 cursor-pointer' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
        }`}
        onClick={() => uploadStatus !== 'uploading' && inputRef.current?.click()}
        onDrop={uploadStatus !== 'uploading' ? onDrop : undefined}
        onDragOver={uploadStatus !== 'uploading' ? onDragOver : undefined}
        onDragEnter={uploadStatus !== 'uploading' ? onDragEnter : undefined}
        onDragLeave={uploadStatus !== 'uploading' ? onDragLeave : undefined}
        aria-disabled={uploadStatus === 'uploading'}
      >
        <Upload className={`w-8 h-8 mb-2 ${uploadStatus === 'uploading' ? 'text-gray-400' : 'text-blue-500'}`} />
        <p className={`text-sm font-medium select-none ${uploadStatus === 'uploading' ? 'text-gray-400' : 'text-gray-700'}`}>
          {uploadStatus === 'uploading' 
            ? 'Upload in progress...' 
            : dragActive 
              ? 'Drop files here' 
              : 'Drag & drop or click to upload'}
        </p>
        <p className={`text-xs mt-1 select-none ${uploadStatus === 'uploading' ? 'text-gray-400' : 'text-gray-500'}`}>
          {accept === 'image/*,video/mp4' ? 'Images and videos accepted' : accept}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={onInputChange}
          disabled={uploadStatus === 'uploading'}
          aria-label="Upload media file"
          className="hidden"
        />
      </div>

      {/* Status Feedback Area */}
      {uploadStatus === 'uploading' && (
        <div className="mt-3 space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300 flex items-center justify-center text-xs text-white font-medium"
              style={{ width: `${Math.max(uploadProgress, 5)}%` }}
            >
              {uploadProgress > 15 && `${uploadProgress}%`}
            </div>
          </div>
          <p className="text-sm text-gray-700 flex items-center justify-center">
            <span className="animate-pulse mr-2 bg-blue-100 rounded-full p-1">
              <Upload className="w-3 h-3 text-blue-600" />
            </span>
            Uploading... {uploadProgress}% Complete
          </p>
        </div>
      )}

      {uploadStatus === 'success' && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-md p-3 flex items-start">
          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="text-green-800 font-medium">Upload successful!</p>
            <p className="text-green-700 text-sm">Your media has been uploaded and saved.</p>
          </div>
        </div>
      )}

      {uploadStatus === 'error' && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-3 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium">Upload failed</p>
            <p className="text-red-700 text-sm">{errorMessage || 'An unexpected error occurred. Please try again.'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
